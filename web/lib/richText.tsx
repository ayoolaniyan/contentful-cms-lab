import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types";
import type { Document } from "@contentful/rich-text-types";

export function renderRichText(doc: Document) {
  return documentToReactComponents(doc, {
    renderMark: {
      [MARKS.BOLD]: (text) => <strong>{text}</strong>,
      [MARKS.CODE]: (text) => (
        <code style={{ background: "#f4f4f4", padding: "2px 4px" }}>{text}</code>
      ),
    },
    renderNode: {
      [BLOCKS.HEADING_2]: (_n, children) => <h2>{children}</h2>,
      [BLOCKS.PARAGRAPH]: (_n, children) => <p>{children}</p>,
      [BLOCKS.UL_LIST]: (_n, children) => <ul>{children}</ul>,

      // Embedded ASSET — an image dropped inside the rich text body.
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const file = (node.data.target as any)?.fields?.file;
        if (!file?.url) return <em>[unresolved asset]</em>;
        return (
          <img
            src={`https:${file.url}?w=700&fm=webp`}
            alt={(node.data.target as any)?.fields?.title ?? ""}
            style={{ maxWidth: "100%" }}
          />
        );
      },

      // Embedded ENTRY — a reference to another entry inside the body.
      [BLOCKS.EMBEDDED_ENTRY]: (node) => {
        const t = (node.data.target as any);
        return (
          <aside style={{ borderLeft: "3px solid #ccc", padding: "0 1rem" }}>
            {t?.fields?.headline ?? t?.fields?.title ?? "[unresolved entry]"}
          </aside>
        );
      },

      [INLINES.HYPERLINK]: (node, children) => (
        <a href={(node.data as any).uri}>{children}</a>
      ),
    },
  });
}
