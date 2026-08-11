import { notFound } from "next/navigation";
import { findArticle } from "@/lib/content";
import { renderRichText } from "@/lib/richText";
import { draftMode } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { isEnabled } = await draftMode();
  const article = await findArticle(slug, isEnabled);
  if (!article) notFound();

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>{article.title}</h1>
      <p style={{ color: "#666" }}>
        by {article.authorName ?? "unknown"} · rev{" "}
        {article.revision} · published {article.publishedAt} · source: {article.source}
      </p>
      {article.heroImageUrl && (
        <img src={article.heroImageUrl} alt="" style={{ maxWidth: "100%" }} />
      )}
      <article>
        {article.body ? renderRichText(article.body) : <p style={{ color: "#666" }}>No body content.</p>}
      </article>
    </main>
  );
}
