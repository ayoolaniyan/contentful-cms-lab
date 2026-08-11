import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { pool } from "./db.js";
import { upsertEntry, unpublishEntry, deleteEntry } from "./store.js";
import type { InternalEntry } from "./mapper/types.js";

const entry = (revision: number, title = "v1"): InternalEntry => ({
    entryId: "test-1",
    contentType: "article",
    revision,
    publishedAt: "2026-08-01T10:00:00Z",
    data: { title, slug: "test-1", tags: [] },
});

async function stored() {
    const { rows } = await pool.query(
        `select revision, status, data->>'title' as title from content_entries where entry_id = 'test-1'`,
    );
    return rows[0];
}

describe("store", () => {
    beforeEach(async () => {
        await pool.query(`delete from content_entries where entry_id = 'test-1'`);
    });
    afterAll(async () => {
        await pool.query(`delete from content_entries where entry_id = 'test-1'`);
        await pool.end();
    });

    it("inserts a new entry", async () => {
        expect(await upsertEntry(entry(1))).toBe(true);
        expect((await stored()).revision).toBe(1);
    });

    it("is idempotent — same event twice yields one row, same state", async () => {
        await upsertEntry(entry(2, "same"));
        await upsertEntry(entry(2, "same"));
        const { rows } = await pool.query(
            `select count(*)::int as n from content_entries where entry_id = 'test-1'`,
        );
        expect(rows[0].n).toBe(1);
        expect((await stored()).title).toBe("same");
    });

    it("applies a newer revision", async () => {
        await upsertEntry(entry(1, "old"));
        expect(await upsertEntry(entry(5, "new"))).toBe(true);
        expect((await stored()).title).toBe("new");
    });

    it("rejects a stale revision without clobbering", async () => {
        await upsertEntry(entry(5, "new"));
        expect(await upsertEntry(entry(2, "late-old-event"))).toBe(false);
        expect((await stored()).title).toBe("new");
        expect((await stored()).revision).toBe(5);
    });

    it("unpublish flips status but keeps the row", async () => {
        await upsertEntry(entry(1));
        await unpublishEntry("test-1");
        expect((await stored()).status).toBe("unpublished");
    });

    it("republish after unpublish restores published status", async () => {
        await upsertEntry(entry(1));
        await unpublishEntry("test-1");
        await upsertEntry(entry(2));
        expect((await stored()).status).toBe("published");
    });

    it("delete removes the row", async () => {
        await upsertEntry(entry(1));
        await deleteEntry("test-1");
        expect(await stored()).toBeUndefined();
    });
});
