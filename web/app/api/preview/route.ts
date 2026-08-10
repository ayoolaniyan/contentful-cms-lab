import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const slug = url.searchParams.get("slug");

    if (secret !== process.env.PREVIEW_SECRET) {
        return new Response("Invalid token", { status: 401 });
    }

    (await draftMode()).enable();
    redirect(slug ? `/articles/${slug}` : "/articles");
}
