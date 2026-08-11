import { cda } from "../contentful.js";
import { mapEntry } from "../mapper/index.js";
import { MappingError } from "../mapper/types.js";
import { upsertEntry, recordFailure } from "../store.js";
import { pool } from "../db.js";

const PAGE_SIZE = 100;
const CONTENT_TYPES = ["author", "article", "banner"];

async function backfillType(contentType: string) {
    let skip = 0;
    let total = Infinity;
    let synced = 0, stale = 0, failed = 0;

    while (skip < total) {
        const res = await cda.getEntries({
            content_type: contentType,
            include: 2,
            limit: PAGE_SIZE,
            skip,
            order: ["sys.createdAt"],   // stable order — pagination without it can skip/repeat
        });

        total = res.total;

        for (const entry of res.items) {
            try {
                const applied = await upsertEntry(mapEntry(entry));
                applied ? synced++ : stale++;
            } catch (err: any) {
                failed++;
                const id = entry.sys.id;
                const msg = err instanceof MappingError ? err.message : String(err?.message ?? err);
                console.error(`  ! ${id}: ${msg}`);
                await recordFailure(id, contentType, "backfill", msg, { entryId: id }, 1);
            }
        }

        skip += res.items.length;
        if (res.items.length === 0) break;   // guard against an infinite loop
        console.log(`  ${contentType}: ${skip}/${total}`);
    }

    return { contentType, synced, stale, failed, total };
}

console.log("backfill starting");
for (const t of CONTENT_TYPES) {
    const r = await backfillType(t);
    console.log(`${r.contentType}: ${r.synced} synced, ${r.stale} stale-skipped, ${r.failed} failed (of ${r.total})`);
}
await pool.end();
