import { describe, it, expect } from "vitest";
import { mapEntry } from "./index.js";
import { MappingError } from "./types.js";

const article = (fields: any = {}, sys: any = {}) => ({
    sys: {
        id: "a1",
        revision: 3,
        publishedAt: "2026-08-01T10:00:00Z",
        contentType: { sys: { id: "article" } },
        ...sys,
    },
    fields: { title: "T", slug: "t", ...fields },
});

describe("mapEntry", () => {
    const cases: [string, any, (r: any) => void][] = [
        ["maps a full article", article({ tags: ["a"] }), (r) => {
            expect(r.entryId).toBe("a1");
            expect(r.revision).toBe(3);
            expect(r.data.tags).toEqual(["a"]);
        }],
        ["defaults missing optional list to []", article({ tags: undefined }), (r) =>
            expect(r.data.tags).toEqual([])],
        ["ignores unknown fields (additive safety)", article({ brandNewField: "x" }), (r) =>
            expect(r.data).not.toHaveProperty("brandNewField")],
        ["tolerates an unresolved reference", article({
            author: { sys: { id: "au1", type: "Link", linkType: "Entry" } },
        }), (r) => expect(r.data.author).toEqual({ id: "au1", name: "" })],
        ["absolutises protocol-relative asset urls", article({
            heroImage: { fields: { file: { url: "//images.ctfassets.net/x.png" } } },
        }), (r) => expect(r.data.heroImageUrl).toBe("https://images.ctfassets.net/x.png")],
        ["handles a missing asset", article({ heroImage: undefined }), (r) =>
            expect(r.data.heroImageUrl).toBeNull()],
    ];

    cases.forEach(([name, input, assert]) => it(name, () => assert(mapEntry(input))));

    it("throws on a missing required field", () => {
        expect(() => mapEntry(article({ slug: undefined }))).toThrow(MappingError);
    });

    it("throws on an unknown content type", () => {
        expect(() => mapEntry(article({}, { contentType: { sys: { id: "mystery" } } })))
            .toThrow(/no mapper/);
    });
});
