import Link from "next/link";
import { listArticles } from "@/lib/content";
import { draftMode } from "next/headers";

export const dynamic = "force-dynamic"; // no caching yet — see Step 6

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { tag } = await searchParams;
  const articles = await listArticles(isEnabled, tag);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Articles</h1>
      <p style={{ color: "#666" }}>
        Source: {isEnabled ? "Contentful Preview API (drafts included)" : (process.env.CONTENT_SOURCE ?? "delivery")}
        {tag && ` · filtered by tag "${tag}"`}
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {articles.map((a) => (
          <li key={a.id} style={{ margin: "1.5rem 0" }}>
            <Link href={`/articles/${a.slug}`}>
              <strong>{a.title}</strong>
            </Link>
            <div style={{ fontSize: 14, color: "#666" }}>
              by {a.authorName ?? "unknown"}
              {" · "}
              {a.tags.join(", ")}
              {" · "}
              {a.source}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
