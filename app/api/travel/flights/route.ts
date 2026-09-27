import { NextRequest, NextResponse } from "next/server";

function isoDuration(value = "") {
  return value.replace("PT", "").replace("H", "h ").replace("M", "min").trim();
}

function demoFlights(origin: string, destination: string, departureDate: string) {
  const base = new Date(`${departureDate}T09:10:00-03:00`);
  const plus = (hours: number) => new Date(base.getTime() + hours * 3600000).toISOString();
  return [
    { id: "demo-1", airline: "AR", price: 1680, currency: "BRL", departure: base.toISOString(), arrival: plus(2.9), duration: "2h 55min", stops: 0 },
    { id: "demo-2", airline: "LA", price: 1745, currency: "BRL", departure: plus(2.4), arrival: plus(5.3), duration: "2h 55min", stops: 0 },
    { id: "demo-3", airline: "G3", price: 1890, currency: "BRL", departure: plus(5.7), arrival: plus(8.8), duration: "3h 05min", stops: 0 },
  ].map((flight) => ({ ...flight, route: `${origin}-${destination}` }));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = (params.get("origin") ?? "GRU").toUpperCase();
  const destination = (params.get("destination") ?? "BUE").toUpperCase();
  const departureDate = params.get("departureDate") ?? "2027-07-05";
  const returnDate = params.get("returnDate") ?? "2027-07-15";
  const adults = Math.min(9, Math.max(1, Number(params.get("adults") ?? 1)));
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const baseUrl = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";

  if (!clientId || !clientSecret) {
    return NextResponse.json({ source: "demo", flights: demoFlights(origin, destination, departureDate) });
  }

  const tokenResponse = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return NextResponse.json({ source: "demo", flights: demoFlights(origin, destination, departureDate), error: "amadeus_auth" });
  const tokenPayload = await tokenResponse.json();

  const query = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    returnDate,
    adults: String(adults),
    currencyCode: "BRL",
    max: "12",
  });
  const response = await fetch(`${baseUrl}/v2/shopping/flight-offers?${query}`, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ source: "demo", flights: demoFlights(origin, destination, departureDate), upstreamStatus: response.status });

  const payload = await response.json();
  const flights = (payload.data ?? []).map((offer: any) => {
    const outbound = offer.itineraries?.[0];
    const segments = outbound?.segments ?? [];
    return {
      id: offer.id,
      airline: offer.validatingAirlineCodes?.[0] ?? segments[0]?.carrierCode ?? "—",
      price: Number(offer.price?.grandTotal ?? offer.price?.total ?? 0),
      currency: offer.price?.currency ?? "BRL",
      departure: segments[0]?.departure?.at,
      arrival: segments.at(-1)?.arrival?.at,
      duration: isoDuration(outbound?.duration),
      stops: Math.max(0, segments.length - 1),
    };
  });

  return NextResponse.json({ source: "amadeus", flights });
}
