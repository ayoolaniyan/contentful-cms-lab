import { pool } from "./db.js";

export type SyncOutcome =
    | "synced" | "stale_ignored" | "unpublished" | "deleted"
    | "mapping_failed" | "not_found" | "retried" | "dead_lettered";

/** In-process counters. In production these are exported to Prometheus/Cloud Monitoring. */
const counters = new Map<string, number>();

export function count(outcome: SyncOutcome, contentType = "unknown") {
    const key = `${outcome}:${contentType}`;
    counters.set(key, (counters.get(key) ?? 0) + 1);
}

export function snapshot() {
    return Object.fromEntries(counters);
}

/** The metric editors actually feel: Contentful publish -> visible in our store. */
export function publishLagMs(publishedAt: string | null): number | null {
    if (!publishedAt) return null;
    return Date.now() - new Date(publishedAt).getTime();
}

export async function healthDetail() {
    const { rows: entries } = await pool.query(
        `select content_type, status, count(*)::int as n,
            max(synced_at) as last_sync
       from content_entries group by 1, 2`,
    );
    const { rows: failures } = await pool.query(
        `select count(*)::int as n, max(failed_at) as latest from sync_failures`,
    );
    const { rows: state } = await pool.query(
        `select last_run_at from sync_state where id = 'contentful-sync'`,
    );
    return {
        entries,
        failures: failures[0],
        lastReconcileAt: state[0]?.last_run_at ?? null,
        counters: snapshot(),
    };
}
