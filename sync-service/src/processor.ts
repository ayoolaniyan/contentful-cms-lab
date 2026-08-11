import { cda } from "./contentful.js";
import { mapEntry } from "./mapper/index.js";
import { MappingError } from "./mapper/types.js";
import { upsertEntry, unpublishEntry, deleteEntry, recordFailure } from "./store.js";
import { count, publishLagMs } from "./observability.js";

export type SyncEvent = {
    entryId: string;
    contentType: string | null;
    topic: string;   // e.g. ContentManagement.Entry.publish
};

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every log line carries this shape, so entryId/contentType/revision/outcome/lagMs are always present. */
function fields(ev: SyncEvent, outcome: string, extra: Record<string, unknown> = {}) {
    return {
        entryId: ev.entryId,
        contentType: ev.contentType,
        revision: null as number | null,
        outcome,
        lagMs: null as number | null,
        ...extra,
    };
}

export async function processEvent(ev: SyncEvent, log: any): Promise<void> {
    const action = ev.topic.split(".").pop(); // publish | unpublish | delete | ...

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            if (action === "unpublish" || action === "archive") {
                await unpublishEntry(ev.entryId);
                count("unpublished", ev.contentType ?? "unknown");
                log.info(fields(ev, "unpublished"), "entry unpublished");
                return;
            }
            if (action === "delete") {
                await deleteEntry(ev.entryId);
                count("deleted", ev.contentType ?? "unknown");
                log.info(fields(ev, "deleted"), "entry deleted");
                return;
            }

            // publish / auto_save-on-published etc: fetch authoritative state ourselves
            const entry = await cda.getEntry(ev.entryId, { include: 2 });
            const mapped = mapEntry(entry);
            const applied = await upsertEntry(mapped);

            const lagMs = publishLagMs(mapped.publishedAt);
            const outcome = applied ? "synced" : "stale_ignored";
            count(outcome, mapped.contentType);

            log.info(
                {
                    entryId: mapped.entryId, contentType: mapped.contentType,
                    revision: mapped.revision, outcome, lagMs, attempt
                },
                applied ? "entry synced" : "stale event ignored",
            );
            return;
        } catch (err: any) {
            // A mapping error will never succeed on retry — dead-letter immediately.
            if (err instanceof MappingError) {
                count("mapping_failed", ev.contentType ?? "unknown");
                log.error(fields(ev, "mapping_failed", { err: err.message }), "mapping failed");
                await recordFailure(ev.entryId, ev.contentType, ev.topic, err.message, ev, attempt);
                return;
            }
            // 404 = not published yet / already gone. Not retryable.
            if (err?.sys?.id === "NotFound" || err?.name === "NotFound") {
                count("not_found", ev.contentType ?? "unknown");
                log.warn(fields(ev, "not_found"), "entry not found in CDA; treating as unpublished");
                await unpublishEntry(ev.entryId);
                return;
            }
            if (attempt === MAX_ATTEMPTS) {
                count("dead_lettered", ev.contentType ?? "unknown");
                log.error(fields(ev, "dead_lettered", { attempt, err: err.message }), "sync failed, dead-lettering");
                await recordFailure(ev.entryId, ev.contentType, ev.topic, err.message, ev, attempt);
                return;
            }
            const backoff = 250 * 2 ** (attempt - 1);
            count("retried", ev.contentType ?? "unknown");
            log.warn(fields(ev, "retried", { attempt, backoff }), "transient failure, retrying");
            await sleep(backoff);
        }
    }
}
