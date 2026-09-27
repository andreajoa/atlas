import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const key = process.env.WINDY_WEBCAMS_API_KEY;

  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ source: "unavailable", webcams: [] });
  }

  const url = new URL("https://api.windy.com/webcams/api/v3/webcams");
  url.searchParams.set("nearby", `${lat},${lng},35`);
  url.searchParams.set("limit", "8");
  url.searchParams.set("include", "images,location,player,urls");
  url.searchParams.set("lang", "en");
  url.searchParams.set("sortKey", "popularity");
  url.searchParams.set("sortDirection", "desc");

  const response = await fetch(url, { headers: { "x-windy-api-key": key }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ source: "unavailable", webcams: [] });
  const payload = await response.json();
  const webcams = (payload.webcams ?? []).map((item: any) => ({
    id: String(item.webcamId),
    title: item.title,
    image: item.images?.current?.preview ?? item.images?.current?.thumbnail ?? item.images?.current?.icon,
    player: item.player?.live ?? item.player?.day ?? item.urls?.detail,
    lat: item.location?.latitude,
    lng: item.location?.longitude,
  }));
  return NextResponse.json({ source: "windy", webcams });
}
