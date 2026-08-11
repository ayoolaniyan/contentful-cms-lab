import * as cf from "./contentful";
import * as own from "./delivery";

const SOURCE = process.env.CONTENT_SOURCE ?? "delivery"; // "contentful" | "delivery"

export type Article = {
    id: string;
    title: string;
    slug: string;
    body: any;
    tags: string[];
    authorName: string | null;
    heroImageUrl: string | null;
    revision: number;
    publishedAt: string | null;
    source: string;
};

function fromContentful(e: any): Article {
    const url = e.fields.heroImage?.fields?.file?.url;
    return {
        id: e.sys.id,
        title: e.fields.title,
        slug: e.fields.slug,
        body: e.fields.body,
        tags: e.fields.tags ?? [],
        authorName: e.fields.author?.fields?.name ?? null,
        heroImageUrl: url ? `https:${url}` : null,
        revision: e.sys.revision,
        publishedAt: e.sys.publishedAt ?? null,
        source: "contentful (direct)",
    };
}

function fromDelivery(a: any): Article {
    return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        body: a.body,
        tags: a.tags ?? [],
        authorName: a.author?.name || null,
        heroImageUrl: a.heroImageUrl ?? null,
        revision: a.meta.revision,
        publishedAt: a.meta.publishedAt,
        source: a.meta.source,
    };
}

export async function listArticles(isPreview = false, tag?: string): Promise<Article[]> {
    if (SOURCE === "contentful" || isPreview) {
        return (await cf.getArticles(isPreview)).map(fromContentful);
    }
    return (await own.getArticles(tag)).map(fromDelivery);
}

export async function findArticle(slug: string, isPreview = false): Promise<Article | null> {
    if (SOURCE === "contentful" || isPreview) {
        const e = await cf.getArticleBySlug(slug, isPreview);
        return e ? fromContentful(e) : null;
    }
    const a = await own.getArticleBySlug(slug);
    return a ? fromDelivery(a) : null;
}
