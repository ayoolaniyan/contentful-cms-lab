import { createClient } from "contentful";

const base = {
    space: process.env.CONTENTFUL_SPACE_ID!,
    environment: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
};

const delivery = createClient({
    ...base,
    accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
});

const preview = createClient({
    ...base,
    accessToken: process.env.CONTENTFUL_PREVIEW_TOKEN!,
    host: "preview.contentful.com",
});

export function client(isPreview = false) {
    return isPreview ? preview : delivery;
}

export async function getArticles(isPreview = false) {
    const res = await client(isPreview).getEntries({
        content_type: "article",
        include: 2,
        order: ["-fields.publishedDate"],
    });
    return res.items;
}

export async function getArticleBySlug(slug: string, isPreview = false) {
    const res = await client(isPreview).getEntries({
        content_type: "article",
        "fields.slug": slug,
        include: 2,
        limit: 1,
    });
    return res.items[0] ?? null;
}
