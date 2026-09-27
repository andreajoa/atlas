'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Camera, ChevronDown, Compass, ExternalLink, Hotel, MapPin,
  Plane, Radar, Route, Search, Sparkles, Utensils
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BUENOS_AIRES, hotelDemo, placesDemo } from '@/lib/demo';

type ApiState = {
  source?: string;
  available?: boolean;
  data?: any;
  message?: string;
};

const sections = [
  { id: 'mapa', label: 'Mapa vivo' },
  { id: 'rua', label: 'Ver a rua' },
  { id: 'perto', label: 'Perto de você' },
  { id: 'precos', label: 'Preços' },
  { id: 'agora', label: 'Agora' }
];

export default function TravelAtlas() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const mapY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const labelY = useTransform(scrollYProgress, [0, 1], [0, -46]);

  const [places, setPlaces] = useState<ApiState>({ data: placesDemo, source: 'demo' });
  const [flights, setFlights] = useState<ApiState>({});
  const [hotels, setHotels] = useState<ApiState>({ data: hotelDemo, source: 'demo' });
  const [webcams, setWebcams] = useState<ApiState>({});
  const [activePlace, setActivePlace] = useState(placesDemo[1]);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/places?lat=-34.6037&lng=-58.3816&type=restaurant')
        .then(r => r.json()).then(setPlaces),
      fetch('/api/flights?origin=GRU&destination=BUE&departureDate=2027-07-10&returnDate=2027-07-20&adults=3&children=1')
        .then(r => r.json()).then(setFlights),
      fetch('/api/hotels?checkin=2027-07-10&checkout=2027-07-20&adults=3&children=1')
        .then(r => r.json()).then(setHotels),
      fetch('/api/webcams?lat=-34.6037&lng=-58.3816')
        .then(r => r.json()).then(setWebcams)
    ]);
  }, []);

  const placeList = useMemo(
    () => Array.isArray(places.data) && places.data.length ? places.data : placesDemo,
    [places]
  );
  const hotelList = useMemo(
    () => Array.isArray(hotels.data) && hotels.data.length ? hotels.data : hotelDemo,
    [hotels]
  );

  const streetKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const streetUrl = streetKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${streetKey}&location=${activePlace.lat},${activePlace.lng}&heading=35&pitch=4&fov=80`
    : null;

  return (
    <main>
      <header className="nav glass">
        <a className="brand" href="#top">
          <span className="brandMark">A</span><span>ATLAS</span>
        </a>
        <nav>
          {sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
        </nav>
        <a className="navCta" href="#precos"><Search size={16}/> Explorar viagem</a>
      </header>

      <section ref={heroRef} id="top" className="hero">
        <motion.div style={{ y: mapY }} className="heroMap" aria-hidden="true">
          <div className="globeLines" />
          <span className="mapRoad r1"/><span className="mapRoad r2"/>
          <span className="mapRoad r3"/><span className="mapRoad r4"/>
          <span className="heroPin p1"><i/></span>
          <span className="heroPin p2"><i/></span>
          <span className="heroPin p3"><i/></span>
        </motion.div>
        <div className="heroShade" />
        <motion.div style={{ y: labelY }} className="heroContent">
          <p className="kicker"><Radar size={15}/> BUENOS AIRES · ARGENTINA · JULHO 2027</p>
          <h1>Veja a viagem<br/><em>antes de chegar.</em></h1>
          <p className="lead">
            Um atlas vivo da sua viagem: mapa, ruas, hotéis, restaurantes,
            atrações, voos e sinais de preço reunidos numa experiência só.
          </p>
          <div className="heroActions">
            <a className="btn primary" href="#mapa"><Compass size={18}/> Abrir o atlas</a>
            <a className="btn ghost" href="#rua"><Camera size={18}/> Ver as ruas</a>
          </div>
        </motion.div>
        <div className="scrollCue"><span>ROLE PARA EXPLORAR</span><ChevronDown size={16}/></div>
      </section>

      <section id="mapa" className="chapter mapChapter">
        <div className="chapterHead">
          <p className="eyebrow">01 · MAPA VIVO</p>
          <h2>A cidade deixa de ser uma lista.<br/>Ela vira um território que você entende.</h2>
        </div>

        <div className="atlasGrid">
          <div className="mapShell">
            <iframe
              title="Mapa de Buenos Aires"
              className="osm"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-58.462%2C-34.648%2C-58.333%2C-34.548&layer=mapnik&marker=-34.6037%2C-58.3816"
            />
            <div className="mapLegend glass">
              <MapPin size={16}/>
              <div>
                <b>Centro de Buenos Aires</b>
                <span>Clique nos lugares ao lado para mudar o foco da viagem.</span>
              </div>
            </div>
          </div>

          <div className="placeRail">
            {placeList.slice(0, 6).map((p: any, i: number) => (
              <button
                className={`placeCard ${activePlace?.name === p.name ? 'active' : ''}`}
                key={`${p.name}-${i}`}
                onClick={() => setActivePlace({
                  ...p,
                  lat: p.lat ?? BUENOS_AIRES.lat,
                  lng: p.lng ?? BUENOS_AIRES.lng
                })}
              >
                <span className="placeIndex">0{i + 1}</span>
                <span className="placeCopy">
                  <b>{p.name}</b>
                  <small>{p.kind ?? p.primaryType ?? 'Lugar'} · ★ {p.rating ?? '—'}</small>
                </span>
                <Route size={17}/>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="rua" className="chapter darkChapter">
        <div className="chapterHead splitHead">
          <div>
            <p className="eyebrow">02 · RUA & ENTORNO</p>
            <h2>Escolheu um hotel?<br/>Veja a avenida, a calçada e o quarteirão.</h2>
          </div>
          <p className="chapterNote">
            O Street View pode abrir exatamente no ponto selecionado. Assim você
            vê se o hotel fica em avenida movimentada, rua residencial, perto de
            metrô, cafés ou atrações.
          </p>
        </div>

        <div className="streetFrame">
          {streetUrl ? (
            <iframe
              title={`Street View de ${activePlace.name}`}
              src={streetUrl}
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="streetFallback">
              <Camera size={40}/>
              <h3>Street View preparado</h3>
              <p>
                Adicione <code>NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY</code> na Vercel
                para ativar a visão 360° dentro do ATLAS.
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activePlace.lat},${activePlace.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir este ponto no Google Maps <ExternalLink size={15}/>
              </a>
            </div>
          )}
          <div className="streetLabel glass">
            <span>VOCÊ ESTÁ VENDO</span><b>{activePlace.name}</b>
          </div>
        </div>
      </section>

      <section id="perto" className="chapter stackChapter">
        <div className="chapterHead">
          <p className="eyebrow">03 · O QUE EXISTE AO REDOR</p>
          <h2>Hotel bom não é só o quarto.<br/>É tudo que existe a poucos minutos dele.</h2>
        </div>

        <div className="stackCards">
          <article className="stackCard s1">
            <div className="iconOrb"><Utensils/></div>
            <div>
              <span>GASTRONOMIA</span>
              <h3>Restaurantes, cafés e mercados próximos</h3>
              <p>
                {places.source === 'google-places'
                  ? 'Dados ao vivo do Google Places.'
                  : 'A integração com Google Places já está preparada; enquanto a chave não está configurada, o ATLAS usa pontos demonstrativos.'}
              </p>
            </div>
          </article>

          <article className="stackCard s2">
            <div className="iconOrb"><Sparkles/></div>
            <div>
              <span>EXPERIÊNCIAS</span>
              <h3>Atrações que fazem sentido no mesmo dia</h3>
              <p>
                O roteiro pode ser organizado por proximidade, reduzindo
                deslocamentos e mostrando bairros como capítulos da viagem.
              </p>
            </div>
          </article>

          <article className="stackCard s3">
            <div className="iconOrb"><Route/></div>
            <div>
              <span>LOGÍSTICA</span>
              <h3>Distância, caminhada e contexto urbano</h3>
              <p>
                O mapa vira o eixo central. Hotéis, restaurantes e atrações deixam
                de ser cartões soltos e passam a conversar com a localização.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="precos" className="chapter priceChapter">
        <div className="chapterHead">
          <p className="eyebrow">04 · PREÇO & OPORTUNIDADE</p>
          <h2>Não basta mostrar preço.<br/>O ATLAS precisa dizer quando algo mudou.</h2>
        </div>

        <div className="intelGrid">
          <article className="intelCard flight">
            <div className="intelTop">
              <Plane/><span>VOOS · GRU → BUENOS AIRES</span>
              <i className={flights.available ? 'liveDot' : 'waitDot'}/>
            </div>
            <h3>
              {flights.available && flights.data?.length
                ? `${flights.data.length} ofertas encontradas`
                : 'Monitor de passagem pronto'}
            </h3>
            <p>
              {flights.message ??
                'Conecte Amadeus para consultar ofertas atuais e comparar o preço encontrado com referências históricas.'}
            </p>
            <small>Origem preparada: GRU · destino BUE · julho/2027</small>
          </article>

          <article className="intelCard hotel">
            <div className="intelTop">
              <Hotel/><span>HOTÉIS · BUENOS AIRES</span>
              <i className={hotels.available ? 'liveDot' : 'waitDot'}/>
            </div>
            <div className="hotelRows">
              {hotelList.slice(0, 3).map((h: any, i: number) => (
                <div className="hotelRow" key={i}>
                  <div>
                    <b>{h.name ?? h.accommodation?.label ?? 'Hotel'}</b>
                    <span>{h.badge ?? h.deal ?? 'tarifa disponível'}</span>
                  </div>
                  <strong>{h.price ?? h.priceDisplay ?? 'consultar'}</strong>
                </div>
              ))}
            </div>
            <small>{hotels.message ?? 'Integração preparada para inventário e tarifas de hospedagem.'}</small>
          </article>
        </div>
      </section>

      <section id="agora" className="chapter nowChapter">
        <div className="nowCopy">
          <p className="eyebrow">05 · A CIDADE AGORA</p>
          <h2>Quando houver uma câmera pública perto, você vê Buenos Aires quase em tempo real.</h2>
          <p>
            Isso não substitui Street View. É outra camada: webcams públicas com
            imagem recente ou player ao vivo, quando disponível.
          </p>
        </div>

        <div className="liveViewport">
          {webcams.available && webcams.data?.length ? (
            <iframe
              title="Webcam Buenos Aires"
              src={webcams.data[0].player?.live ?? webcams.data[0].player?.day}
              allowFullScreen
            />
          ) : (
            <div className="liveFallback">
              <Radar size={48}/><span className="pulseRing"/>
              <b>Windy Webcams conectado no código</b>
              <p>
                {webcams.message ??
                  'Configure a chave da API para localizar câmeras públicas próximas ao centro de Buenos Aires.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <footer>
        <div className="footerBrand">
          <span className="brandMark">A</span>
          <div><b>ATLAS</b><small>TRAVEL INTELLIGENCE</small></div>
        </div>
        <p>
          Argentina deixa de ser uma pesquisa espalhada em dez abas.
          Vira uma viagem que você consegue enxergar.
        </p>
      </footer>
    </main>
  );
}
