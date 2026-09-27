import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!key || !name.startsWith("places/") || !name.includes("/photos/")) {
    return new Response(null, { status: 404 });
  }

  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=960&maxHeightPx=720&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { redirect: "follow", next: { revalidate: 86400 } });
  if (!response.ok || !response.body) return new Response(null, { status: 404 });

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
