import { NextRequest, NextResponse } from 'next/server';

async function token() {
  const id = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  const base = process.env.AMADEUS_BASE_URL ?? 'https://api.amadeus.com';
  if (!id || !secret) return null;

  const r = await fetch(`${base}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    cache: 'no-store'
  });

  if (!r.ok) return null;
  return { base, access: (await r.json()).access_token as string };
}

export async function GET(req: NextRequest) {
  const auth = await token();
  if (!auth) {
    return NextResponse.json({
      available: false,
      source: 'amadeus',
      data: [],
      message: 'Conecte as credenciais Amadeus para consultar tarifas atuais.'
    });
  }

  const s = req.nextUrl.searchParams;
  const q = new URLSearchParams({
    originLocationCode: s.get('origin') ?? 'GRU',
    destinationLocationCode: s.get('destination') ?? 'BUE',
    departureDate: s.get('departureDate') ?? '2027-07-10',
    returnDate: s.get('returnDate') ?? '2027-07-20',
    adults: s.get('adults') ?? '3',
    children: s.get('children') ?? '1',
    currencyCode: 'BRL',
    max: '8'
  });

  const r = await fetch(`${auth.base}/v2/shopping/flight-offers?${q}`, {
    headers: { Authorization: `Bearer ${auth.access}` },
    cache: 'no-store'
  });

  if (!r.ok) {
    return NextResponse.json({ available: false, source: 'amadeus', data: [], message: `Amadeus respondeu ${r.status}.` });
  }

  const json = await r.json();
  return NextResponse.json({
    available: true,
    source: 'amadeus',
    data: json.data ?? [],
    dictionaries: json.dictionaries ?? null,
    message: 'Ofertas consultadas em tempo real no provedor.'
  });
}
