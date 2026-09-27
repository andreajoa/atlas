import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaces } from "@/lib/destinations";

const allowedTypes = new Set(["hotel", "restaurant", "tourist_attraction"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const type = searchParams.get("type") ?? "tourist_attraction";
  const city = searchParams.get("city") ?? "buenos-aires";
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !allowedTypes.has(type)) {
    return NextResponse.json({ error: "Invalid location or place type" }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({ source: "fallback", places: fallbackPlaces[city] ?? [] });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri,places.photos",
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 14,
      rankPreference: "POPULARITY",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: type === "hotel" ? 5000 : 3500 } },
      languageCode: "pt-BR",
      regionCode: "AR",
    }),
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return NextResponse.json({ source: "fallback", places: fallbackPlaces[city] ?? [], upstreamStatus: response.status });
  }

  const payload = await response.json();
  const normalized = (payload.places ?? []).map((place: any) => ({
    id: place.id,
    name: place.displayName?.text ?? "Local",
    type: type === "hotel" ? "hotel" : type === "restaurant" ? "restaurant" : "attraction",
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    address: place.formattedAddress,
    rating: place.rating,
    reviews: place.userRatingCount,
    mapUrl: place.googleMapsUri,
    image: place.photos?.[0]?.name ? `/api/place-photo?name=${encodeURIComponent(place.photos[0].name)}` : null,
  }));

  return NextResponse.json({ source: "google", places: normalized });
}
