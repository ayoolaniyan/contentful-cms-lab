import Link from "next/link";
import { getArticles } from "@/lib/contentful";
import { draftMode } from "next/headers";   

const { isEnabled } = await draftMode();
export const dynamic = "force-dynamic"; // no caching yet — see Step 6

export default async function ArticlesPage() {
  const articles = await getArticles(isEnabled);

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Articles</h1>
      <p style={{ color: "#666" }}>Source: Contentful CDA (published only)</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {articles.map((a: any) => (
          <li key={a.sys.id} style={{ margin: "1.5rem 0" }}>
            <Link href={`/articles/${a.fields.slug}`}>
              <strong>{a.fields.title}</strong>
            </Link>
            <div style={{ fontSize: 14, color: "#666" }}>
              by {a.fields.author?.fields?.name ?? "unknown"}
              {" · "}
              {(a.fields.tags ?? []).join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
