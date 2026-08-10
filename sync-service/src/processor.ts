import { cda } from "./contentful.js";
import { mapEntry } from "./mapper/index.js";
import { MappingError } from "./mapper/types.js";
import { upsertEntry, unpublishEntry, deleteEntry, recordFailure } from "./store.js";

export type SyncEvent = {
    entryId: string;
    contentType: string | null;
    topic: string;   // e.g. ContentManagement.Entry.publish
};

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function processEvent(ev: SyncEvent, log: any): Promise<void> {
    const action = ev.topic.split(".").pop(); // publish | unpublish | delete | ...

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            if (action === "unpublish" || action === "archive") {
                await unpublishEntry(ev.entryId);
                log.info({ entryId: ev.entryId, action }, "entry unpublished");
                return;
            }
            if (action === "delete") {
                await deleteEntry(ev.entryId);
                log.info({ entryId: ev.entryId, action }, "entry deleted");
                return;
            }

            // publish / auto_save-on-published etc: fetch authoritative state ourselves
            const entry = await cda.getEntry(ev.entryId, { include: 2 });
            const mapped = mapEntry(entry);
            const applied = await upsertEntry(mapped);

            const lagMs = mapped.publishedAt
                ? Date.now() - new Date(mapped.publishedAt).getTime()
                : null;

            log.info(
                {
                    entryId: mapped.entryId, contentType: mapped.contentType,
                    revision: mapped.revision, applied, lagMs
                },
                applied ? "entry synced" : "stale event ignored",
            );
            return;
        } catch (err: any) {
            // A mapping error will never succeed on retry — dead-letter immediately.
            if (err instanceof MappingError) {
                log.error({ entryId: ev.entryId, err: err.message }, "mapping failed");
                await recordFailure(ev.entryId, ev.contentType, ev.topic, err.message, ev, attempt);
                return;
            }
            // 404 = not published yet / already gone. Not retryable.
            if (err?.sys?.id === "NotFound" || err?.name === "NotFound") {
                log.warn({ entryId: ev.entryId }, "entry not found in CDA; treating as unpublished");
                await unpublishEntry(ev.entryId);
                return;
            }
            if (attempt === MAX_ATTEMPTS) {
                log.error({ entryId: ev.entryId, attempt, err: err.message }, "sync failed, dead-lettering");
                await recordFailure(ev.entryId, ev.contentType, ev.topic, err.message, ev, attempt);
                return;
            }
            const backoff = 250 * 2 ** (attempt - 1);
            log.warn({ entryId: ev.entryId, attempt, backoff }, "transient failure, retrying");
            await sleep(backoff);
        }
    }
}
