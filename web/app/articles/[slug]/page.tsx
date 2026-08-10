import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/contentful";
import { renderRichText } from "@/lib/richText";
import { draftMode } from "next/headers";

const { isEnabled } = await draftMode();

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article: any = await getArticleBySlug(slug, isEnabled);
  if (!article) notFound();

  const hero = article.fields.heroImage?.fields?.file;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>{article.fields.title}</h1>
      <p style={{ color: "#666" }}>
        by {article.fields.author?.fields?.name ?? "unknown"} · rev{" "}
        {article.sys.revision} · published {article.sys.publishedAt}
      </p>
      {hero?.url && (
        <img src={`https:${hero.url}?w=700&fm=webp`} alt="" style={{ maxWidth: "100%" }} />
      )}
      <article>{renderRichText(article.fields.body)}</article>
    </main>
  );
}
