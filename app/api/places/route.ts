import { NextRequest, NextResponse } from 'next/server';
import { placesDemo } from '@/lib/demo';

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ available: false, source: 'demo', data: placesDemo, message: 'Google Places ainda não configurado.' });

  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat') ?? -34.6037);
  const lng = Number(sp.get('lng') ?? -58.3816);
  const type = sp.get('type') ?? 'restaurant';

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.rating,places.location,places.primaryType,places.formattedAddress'
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 10,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 1800 } }
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    return NextResponse.json({ available: false, source: 'google-places', data: placesDemo, message: `Google Places respondeu ${response.status}.` });
  }

  const json = await response.json();
  const data = (json.places ?? []).map((p: any) => ({
    name: p.displayName?.text,
    rating: p.rating,
    kind: p.primaryType?.replaceAll('_', ' '),
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    address: p.formattedAddress
  }));

  return NextResponse.json({ available: true, source: 'google-places', data });
}
