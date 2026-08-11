const BASE = process.env.DELIVERY_API_URL ?? "http://localhost:8080";

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`delivery api ${res.status} for ${path}`);
    return res.json();
}

export async function getArticles(tag?: string) {
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
    const { items } = await get<{ items: any[] }>(`/content/articles${qs}`);
    return items;
}

export async function getArticleBySlug(slug: string) {
    try {
        return await get<any>(`/content/articles/${encodeURIComponent(slug)}`);
    } catch {
        return null;
    }
}
