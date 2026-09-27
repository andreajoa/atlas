import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const key = process.env.WINDY_WEBCAMS_API_KEY;
  if (!key) {
    return NextResponse.json({
      available: false,
      source: 'windy-webcams',
      data: [],
      message: 'Adicione WINDY_WEBCAMS_API_KEY para ativar câmeras públicas próximas.'
    });
  }

  const s = req.nextUrl.searchParams;
  const lat = s.get('lat') ?? '-34.6037';
  const lng = s.get('lng') ?? '-58.3816';
  const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lng},40&include=images,location,player,urls&lang=pt&limit=8&sortKey=popularity&sortDirection=desc`;

  const r = await fetch(url, {
    headers: { 'x-windy-api-key': key },
    cache: 'no-store'
  });

  if (!r.ok) {
    return NextResponse.json({ available: false, source: 'windy-webcams', data: [], message: `Windy respondeu ${r.status}.` });
  }

  const json = await r.json();
  return NextResponse.json({
    available: true,
    source: 'windy-webcams',
    data: json.webcams ?? [],
    message: 'Webcams próximas consultadas em tempo real.'
  });
}
