import { cda } from "../contentful.js";
import { mapEntry } from "../mapper/index.js";
import { MappingError } from "../mapper/types.js";
import { upsertEntry, deleteEntry, recordFailure } from "../store.js";
import { pool } from "../db.js";

const STATE_ID = "contentful-sync";

async function loadToken(): Promise<string | null> {
    const { rows } = await pool.query(
        `select next_sync_token from sync_state where id = $1`, [STATE_ID],
    );
    return rows[0]?.next_sync_token ?? null;
}

async function saveToken(token: string) {
    await pool.query(
        `insert into sync_state (id, next_sync_token, last_run_at)
     values ($1, $2, now())
     on conflict (id) do update set next_sync_token = $2, last_run_at = now()`,
        [STATE_ID, token],
    );
}

const force = process.argv.includes("--initial");
const token = force ? null : await loadToken();

const result = token
    ? await cda.sync({ nextSyncToken: token })
    : await cda.sync({ initial: true });

console.log(
    `${token ? "delta" : "initial"} sync: ${result.entries.length} entries, ` +
    `${result.deletedEntries.length} deleted, ${result.assets?.length ?? 0} assets`,
);

let healed = 0, upToDate = 0, failed = 0;

for (const entry of result.entries) {
    try {
        const applied = await upsertEntry(mapEntry(entry));
        applied ? healed++ : upToDate++;
    } catch (err: any) {
        failed++;
        const msg = err instanceof MappingError ? err.message : String(err?.message ?? err);
        console.error(`  ! ${entry.sys.id}: ${msg}`);
        await recordFailure(entry.sys.id, null, "reconcile", msg, { entryId: entry.sys.id }, 1);
    }
}

for (const d of result.deletedEntries) {
    await deleteEntry(d.sys.id);
    console.log(`  - deleted ${d.sys.id}`);
}

await saveToken(result.nextSyncToken);
console.log(`applied ${healed}, already current ${upToDate}, failed ${failed}`);
await pool.end();
