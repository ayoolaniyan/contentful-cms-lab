import { InternalEntry, MappingError } from "./types.js";

/** Contentful asset -> absolute URL. Asset URLs are protocol-relative. */
function assetUrl(asset: any): string | null {
    const url = asset?.fields?.file?.url;
    if (!url) return null;
    return url.startsWith("//") ? `https:${url}` : url;
}

/** Reference -> flattened summary. Unresolved links must not throw. */
function authorRef(author: any): { id: string; name: string } | null {
    if (!author?.sys?.id) return null;
    if (author.sys.type === "Link") {
        // include depth too shallow, or target unpublished (dangling reference)
        return { id: author.sys.id, name: "" };
    }
    return { id: author.sys.id, name: author.fields?.name ?? "" };
}

function mapArticle(e: any): Record<string, unknown> {
    const f = e.fields ?? {};
    if (!f.title || !f.slug) {
        throw new MappingError("article missing title or slug", e.sys?.id);
    }
    return {
        title: f.title,
        slug: f.slug,
        body: f.body ?? null,              // rich-text node tree, stored as-is
        tags: Array.isArray(f.tags) ? f.tags : [],
        author: authorRef(f.author),
        heroImageUrl: assetUrl(f.heroImage),
        publishedDate: f.publishedDate ?? null,
        seoDescription: f.seoDescription ?? null,
        // NOTE: unknown fields are deliberately ignored -> additive changes are safe
    };
}

function mapBanner(e: any): Record<string, unknown> {
    const f = e.fields ?? {};
    if (!f.headline) throw new MappingError("banner missing headline", e.sys?.id);
    return {
        headline: f.headline,
        ctaLabel: f.ctaLabel ?? null,
        ctaUrl: f.ctaUrl ?? null,
        imageUrl: assetUrl(f.image),
    };
}

function mapAuthor(e: any): Record<string, unknown> {
    const f = e.fields ?? {};
    if (!f.name) throw new MappingError("author missing name", e.sys?.id);
    return { name: f.name, slug: f.slug ?? null, bio: f.bio ?? null, avatarUrl: assetUrl(f.avatar) };
}

const mappers: Record<string, (e: any) => Record<string, unknown>> = {
    article: mapArticle,
    banner: mapBanner,
    author: mapAuthor,
};

export function mapEntry(entry: any): InternalEntry {
    const entryId = entry?.sys?.id;
    const contentType = entry?.sys?.contentType?.sys?.id;
    if (!entryId || !contentType) {
        throw new MappingError("entry missing sys.id or sys.contentType", entryId ?? "unknown");
    }

    const fn = mappers[contentType];
    if (!fn) throw new MappingError(`no mapper for content type: ${contentType}`, entryId);

    return {
        entryId,
        contentType,
        revision: entry.sys.revision ?? 0,
        publishedAt: entry.sys.publishedAt ?? null,
        data: fn(entry),
    };
}
