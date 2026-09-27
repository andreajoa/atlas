import { NextRequest, NextResponse } from "next/server";

async function getToken(baseUrl: string, clientId: string, clientSecret: string) {
  const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("auth");
  return (await response.json()).access_token as string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const checkInDate = params.get("checkInDate");
  const checkOutDate = params.get("checkOutDate");
  const adults = Math.min(9, Math.max(1, Number(params.get("adults") ?? 2)));
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const baseUrl = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";

  if (!clientId || !clientSecret || !Number.isFinite(lat) || !Number.isFinite(lng) || !checkInDate || !checkOutDate) {
    return NextResponse.json({ source: "unavailable", hotels: [] });
  }

  try {
    const token = await getToken(baseUrl, clientId, clientSecret);
    const list = await fetch(`${baseUrl}/v1/reference-data/locations/hotels/by-geocode?latitude=${lat}&longitude=${lng}&radius=5&radiusUnit=KM&hotelSource=ALL`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!list.ok) throw new Error("list");
    const listPayload = await list.json();
    const hotelIds = (listPayload.data ?? []).slice(0, 18).map((hotel: any) => hotel.hotelId).filter(Boolean);
    if (!hotelIds.length) return NextResponse.json({ source: "amadeus", hotels: [] });

    const query = new URLSearchParams({
      hotelIds: hotelIds.join(","),
      adults: String(adults),
      checkInDate,
      checkOutDate,
      roomQuantity: "1",
      currency: "BRL",
      bestRateOnly: "true",
    });
    const offers = await fetch(`${baseUrl}/v3/shopping/hotel-offers?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!offers.ok) throw new Error("offers");
    const payload = await offers.json();
    const hotels = (payload.data ?? []).map((item: any) => ({
      id: item.hotel?.hotelId,
      name: item.hotel?.name,
      price: Number(item.offers?.[0]?.price?.total ?? 0),
      currency: item.offers?.[0]?.price?.currency ?? "BRL",
      room: item.offers?.[0]?.room?.description?.text,
    }));
    return NextResponse.json({ source: "amadeus", hotels });
  } catch {
    return NextResponse.json({ source: "unavailable", hotels: [] });
  }
}
