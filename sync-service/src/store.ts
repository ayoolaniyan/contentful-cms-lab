import { pool } from "./db.js";
import type { InternalEntry } from "./mapper/types.js";

/** Returns false when the incoming write is stale (older revision). */
export async function upsertEntry(e: InternalEntry, source = "contentful"): Promise<boolean> {
    const { rowCount } = await pool.query(
        `insert into content_entries
       (entry_id, content_type, revision, status, source, data, published_at, synced_at)
     values ($1, $2, $3, 'published', $4, $5, $6, now())
     on conflict (entry_id) do update set
       content_type = excluded.content_type,
       revision     = excluded.revision,
       status       = 'published',
       data         = excluded.data,
       published_at = excluded.published_at,
       synced_at    = now()
     where content_entries.revision <= excluded.revision`,
        [e.entryId, e.contentType, e.revision, source, e.data, e.publishedAt],
    );
    return rowCount === 1;
}

export async function unpublishEntry(entryId: string): Promise<void> {
    await pool.query(
        `update content_entries set status = 'unpublished', synced_at = now()
     where entry_id = $1`,
        [entryId],
    );
}

export async function deleteEntry(entryId: string): Promise<void> {
    await pool.query(`delete from content_entries where entry_id = $1`, [entryId]);
}

export async function recordFailure(
    entryId: string, contentType: string | null, topic: string | null,
    error: string, payload: unknown, attempts: number,
): Promise<void> {
    await pool.query(
        `insert into sync_failures (entry_id, content_type, topic, attempts, error, payload)
     values ($1,$2,$3,$4,$5,$6)`,
        [entryId, contentType, topic, attempts, error, payload],
    );
}

export async function listFailures(limit = 50) {
    const { rows } = await pool.query(
        `select id, entry_id, content_type, topic, attempts, error, failed_at
       from sync_failures order by failed_at desc limit $1`, [limit],
    );
    return rows;
}

export async function clearFailure(id: number) {
    await pool.query(`delete from sync_failures where id = $1`, [id]);
}
