import type { FastifyInstance } from "fastify";
import { pool } from "./db.js";

type ArticleRow = {
    entry_id: string;
    revision: number;
    source: string;
    published_at: string | null;
    synced_at: string;
    data: Record<string, any>;
};

/** Shape the API returns. Deliberately NOT Contentful's shape. */
function toArticle(r: ArticleRow) {
    return {
        id: r.entry_id,
        title: r.data.title,
        slug: r.data.slug,
        body: r.data.body,
        tags: r.data.tags ?? [],
        author: r.data.author ?? null,
        heroImageUrl: r.data.heroImageUrl ?? null,
        publishedDate: r.data.publishedDate ?? null,
        seoDescription: r.data.seoDescription ?? null,
        meta: {
            source: r.source,
            revision: r.revision,
            publishedAt: r.published_at,
            syncedAt: r.synced_at,
        },
    };
}

export async function registerDeliveryRoutes(app: FastifyInstance) {
    app.get("/content/articles", async (req, reply) => {
        const q = req.query as { limit?: string; tag?: string; source?: string };
        const limit = Math.min(Number(q.limit ?? 20), 100);

        const conditions = ["content_type = 'article'", "status = 'published'"];
        const params: unknown[] = [];

        if (q.tag) {
            params.push(q.tag);
            conditions.push(`data->'tags' ? $${params.length}`);
        }
        if (q.source) {
            params.push(q.source);
            conditions.push(`source = $${params.length}`);
        }
        params.push(limit);

        const { rows } = await pool.query<ArticleRow>(
            `select entry_id, revision, source, published_at, synced_at, data
         from content_entries
        where ${conditions.join(" and ")}
        order by coalesce((data->>'publishedDate')::timestamptz, published_at) desc nulls last
        limit $${params.length}`,
            params,
        );

        reply.header("cache-control", "public, max-age=30");
        return { items: rows.map(toArticle), total: rows.length };
    });

    app.get("/content/articles/:slug", async (req, reply) => {
        const { slug } = req.params as { slug: string };
        const { rows } = await pool.query<ArticleRow>(
            `select entry_id, revision, source, published_at, synced_at, data
         from content_entries
        where content_type = 'article' and status = 'published'
          and data->>'slug' = $1
        limit 1`,
            [slug],
        );
        if (rows.length === 0) return reply.code(404).send({ error: "not found" });
        reply.header("cache-control", "public, max-age=30");
        return toArticle(rows[0]);
    });

    app.get("/content/banners", async () => {
        const { rows } = await pool.query<ArticleRow>(
            `select entry_id, revision, source, published_at, synced_at, data
         from content_entries
        where content_type = 'banner' and status = 'published'
        order by synced_at desc`,
        );
        return {
            items: rows.map((r) => ({
                id: r.entry_id,
                headline: r.data.headline,
                ctaLabel: r.data.ctaLabel,
                ctaUrl: r.data.ctaUrl,
                imageUrl: r.data.imageUrl,
                meta: { source: r.source },
            })),
        };
    });
}
