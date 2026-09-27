import { NextRequest, NextResponse } from 'next/server';
import { hotelDemo } from '@/lib/demo';

export async function GET(req: NextRequest) {
  const token = process.env.BOOKING_API_TOKEN;
  const affiliate = process.env.BOOKING_AFFILIATE_ID;
  const city = process.env.BOOKING_CITY_ID_BUENOS_AIRES;

  if (!token || !affiliate || !city) {
    return NextResponse.json({
      available: false,
      source: 'demo',
      data: hotelDemo,
      message: 'Booking.com Demand API preparada; faltam credenciais de parceiro e o city ID de Buenos Aires.'
    });
  }

  const s = req.nextUrl.searchParams;
  const body = {
    booker: { country: 'br', platform: 'desktop' },
    checkin: s.get('checkin') ?? '2027-07-10',
    checkout: s.get('checkout') ?? '2027-07-20',
    city: Number(city),
    guests: {
      number_of_rooms: 2,
      number_of_adults: Number(s.get('adults') ?? 3),
      children: [10]
    },
    currency: 'BRL'
  };

  const r = await fetch('https://demandapi.booking.com/3.2/accommodations/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Affiliate-Id': affiliate
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  if (!r.ok) {
    return NextResponse.json({ available: false, source: 'booking', data: hotelDemo, message: `Booking.com respondeu ${r.status}.` });
  }

  const json = await r.json();
  return NextResponse.json({
    available: true,
    source: 'booking',
    data: json.data ?? json.accommodations ?? [],
    message: 'Disponibilidade consultada no provedor.'
  });
}
