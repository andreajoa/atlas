"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import LiveMap from "./live-map";
import { destinations, fallbackPlaces, type AtlasLayer, type PlacePoint } from "@/lib/destinations";

type Flight = {
  id: string;
  airline: string;
  price: number;
  currency: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
};

type Webcam = {
  id: string;
  title: string;
  image?: string;
  player?: string;
  lat?: number;
  lng?: number;
};

type HotelOffer = {
  id: string;
  name: string;
  price: number;
  currency: string;
  room?: string;
};

const layerCopy: Record<AtlasLayer, { label: string; kicker: string }> = {
  atlas: { label: "Atlas 3D", kicker: "Veja o território" },
  street: { label: "Rua 360°", kicker: "Entre na avenida" },
  stay: { label: "Hotéis", kicker: "Compare onde ficar" },
  eat: { label: "Restaurantes", kicker: "Coma como o bairro" },
  see: { label: "O que fazer", kicker: "Descubra por proximidade" },
  live: { label: "Agora", kicker: "Webcams e condições reais" },
};

function formatMoney(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(value));
}

export default function AtlasExperience() {
  const [citySlug, setCitySlug] = useState("buenos-aires");
  const [layer, setLayer] = useState<AtlasLayer>("atlas");
  const [places, setPlaces] = useState<PlacePoint[]>(fallbackPlaces["buenos-aires"] ?? []);
  const [activePoint, setActivePoint] = useState<PlacePoint | null>(null);
  const [placesState, setPlacesState] = useState<"idle" | "loading" | "live" | "fallback">("idle");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightSource, setFlightSource] = useState<"idle" | "live" | "demo">("idle");
  const [flightLoading, setFlightLoading] = useState(false);
  const [priceDelta, setPriceDelta] = useState<number | null>(null);
  const [webcams, setWebcams] = useState<Webcam[]>([]);
  const [hotelOffers, setHotelOffers] = useState<HotelOffer[]>([]);
  const [hotelSource, setHotelSource] = useState<"idle" | "live" | "unavailable">("idle");
  const [origin, setOrigin] = useState("GRU");
  const [departureDate, setDepartureDate] = useState("2027-07-05");
  const [returnDate, setReturnDate] = useState("2027-07-15");
  const [travelers, setTravelers] = useState(2);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [watching, setWatching] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const city = useMemo(() => destinations.find((item) => item.slug === citySlug) ?? destinations[0], [citySlug]);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, window.scrollY / max));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setActivePoint(null);
    if (layer === "atlas" || layer === "street") {
      setPlaces(fallbackPlaces[city.slug] ?? []);
      setPlacesState("idle");
      return;
    }

    if (layer === "live") {
      setPlaces([]);
      setPlacesState("idle");
      fetch(`/api/webcams?lat=${city.lat}&lng=${city.lng}`)
        .then((response) => response.json())
        .then((data) => setWebcams(data.webcams ?? []))
        .catch(() => setWebcams([]));
      return;
    }

    const type = layer === "stay" ? "hotel" : layer === "eat" ? "restaurant" : "tourist_attraction";
    setPlacesState("loading");

    if (layer === "stay") {
      setHotelSource("idle");
      const hotelParams = new URLSearchParams({
        lat: String(city.lat),
        lng: String(city.lng),
        checkInDate: departureDate,
        checkOutDate: returnDate,
        adults: String(travelers),
      });
      fetch(`/api/travel/hotels?${hotelParams}`)
        .then((response) => response.json())
        .then((data) => {
          setHotelOffers(data.hotels ?? []);
          setHotelSource(data.source === "amadeus" ? "live" : "unavailable");
        })
        .catch(() => {
          setHotelOffers([]);
          setHotelSource("unavailable");
        });
    } else {
      setHotelOffers([]);
      setHotelSource("idle");
    }

    fetch(`/api/places?lat=${city.lat}&lng=${city.lng}&type=${type}&city=${city.slug}`)
      .then((response) => response.json())
      .then((data) => {
        setPlaces(data.places ?? []);
        setPlacesState(data.source === "google" ? "live" : "fallback");
      })
      .catch(() => {
        setPlaces(fallbackPlaces[city.slug] ?? []);
        setPlacesState("fallback");
      });
  }, [city, layer, departureDate, returnDate, travelers]);

  const searchFlights = async (event?: FormEvent) => {
    event?.preventDefault();
    setFlightLoading(true);
    setPriceDelta(null);
    try {
      const params = new URLSearchParams({
        origin: origin.toUpperCase(),
        destination: city.iata,
        departureDate,
        returnDate,
        adults: String(travelers),
      });
      const response = await fetch(`/api/travel/flights?${params}`);
      const data = await response.json();
      const normalized = (data.flights ?? []) as Flight[];
      setFlights(normalized);
      setFlightSource(data.source === "amadeus" ? "live" : "demo");

      if (normalized.length) {
        const best = Math.min(...normalized.map((flight) => flight.price));
        const key = `atlas:${origin}:${city.iata}:${departureDate}:${returnDate}:${travelers}`;
        const previous = Number(window.localStorage.getItem(key));
        if (previous > 0) setPriceDelta(((best - previous) / previous) * 100);
        window.localStorage.setItem(key, String(best));
      }
    } finally {
      setFlightLoading(false);
    }
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Atlas Argentina">
          <span className="brand-mark">A</span>
          <span><b>ATLAS</b><small>ARGENTINA</small></span>
        </a>
        <nav className="topnav" aria-label="Navegação principal">
          <a href="#explorar">Explorar</a>
          <a href="#precos">Preços</a>
          <a href="#bairros">Bairros</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>
        <label className="city-switcher">
          <span>Cidade</span>
          <select value={citySlug} onChange={(event) => setCitySlug(event.target.value)}>
            {destinations.map((destination) => (
              <option key={destination.slug} value={destination.slug}>{destination.name}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="compass-rail" aria-hidden="true">
        <span>AR</span>
        <div className="compass"><i style={{ transform: `rotate(${scrollProgress * 290 - 35}deg)` }} /></div>
        <span>{city.iata}</span>
      </div>

      <section className="hero" id="top" ref={heroRef}>
        <div className="hero-copy">
          <p className="eyebrow">UM ATLAS PARA VIAJAR MELHOR</p>
          <h1>Veja o lugar<br />antes de <em>reservar.</em></h1>
          <p className="hero-lead">
            Rua, hotel, restaurante, atração, voo e o que está acontecendo agora. Tudo ligado ao mesmo ponto no mapa.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="#explorar">Abrir o atlas</a>
            <button className="ghost-btn" onClick={() => setLayer("street")}>Entrar na rua 360°</button>
          </div>
          <div className="hero-meta">
            <span><b>{city.name}</b>{city.region}</span>
            <span><b>{city.weather}</b>{city.strap}</span>
          </div>
        </div>
        <div className="hero-stage" style={{ "--parallax": scrollProgress } as React.CSSProperties}>
          <div className="map-card map-card-back" />
          <div className="map-card map-card-mid" />
          <div className="hero-map-window">
            <LiveMap destination={city} layer="atlas" points={places} />
          </div>
          <div className="coordinate-chip">{Math.abs(city.lat).toFixed(4)}° S · {Math.abs(city.lng).toFixed(4)}° W</div>
        </div>
      </section>

      <section className="statement scene" id="como-funciona">
        <p className="statement-kicker">NÃO É UMA LISTA DE LINKS</p>
        <h2>O mapa vira a interface.</h2>
        <p>
          Você escolhe um ponto e troca de camada sem perder o contexto: vista aérea, rua, hotéis, comida, atrações e uma janela do lugar em tempo real.
        </p>
      </section>

      <section className="explore-section" id="explorar">
        <div className="section-head">
          <div>
            <p className="eyebrow">{layerCopy[layer].kicker}</p>
            <h2>{city.name} em camadas</h2>
          </div>
          <p>{city.hero}</p>
        </div>
        <div className="layer-tabs" role="tablist" aria-label="Camadas do atlas">
          {(Object.keys(layerCopy) as AtlasLayer[]).map((item) => (
            <button
              key={item}
              type="button"
              className={layer === item ? "active" : ""}
              onClick={() => setLayer(item)}
            >
              <span>{layerCopy[item].label}</span>
            </button>
          ))}
        </div>
        <div className="explorer-grid">
          <div className="explorer-map">
            <LiveMap destination={city} layer={layer} points={places} activePoint={activePoint} />
          </div>
          <aside className="results-panel">
            <div className="results-title">
              <div><span>CAMADA ATIVA</span><b>{layerCopy[layer].label}</b></div>
              {placesState === "live" && <small className="live-dot">Dados ao vivo</small>}
              {placesState === "fallback" && <small>Demonstração</small>}
            </div>

            {layer === "live" ? (
              <div className="place-list">
                {webcams.length ? webcams.map((webcam) => (
                  <article className="place-card" key={webcam.id}>
                    {webcam.image && <img src={webcam.image} alt="" />}
                    <div><span>WEBCAM</span><h3>{webcam.title}</h3>{webcam.player && <a href={webcam.player} target="_blank" rel="noreferrer">Abrir transmissão</a>}</div>
                  </article>
                )) : <EmptyState title="Sem webcam carregada" text="Configure WINDY_WEBCAMS_API_KEY para ver imagens recentes próximas desta cidade." />}
              </div>
            ) : layer === "atlas" || layer === "street" ? (
              <div className="place-list">
                {city.neighborhoods.map((item) => (
                  <button
                    className="neighborhood-row"
                    key={item.name}
                    onClick={() => {
                      const point: PlacePoint = { id: item.name, name: item.name, type: "attraction", lat: item.lat, lng: item.lng };
                      setActivePoint(point);
                      if (layer === "atlas") setLayer("street");
                    }}
                  >
                    <span className="mini-pin" />
                    <span><b>{item.name}</b><small>{item.note}</small></span>
                    <i>↗</i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="place-list">
                {layer === "stay" && (
                  <div className="hotel-live-strip">
                    <div className="hotel-live-head">
                      <span>TARIFAS PARA {departureDate.split("-").reverse().join("/")} → {returnDate.split("-").reverse().join("/")}</span>
                      <b>{hotelSource === "live" ? "Amadeus live" : "Disponibilidade depende da API"}</b>
                    </div>
                    {hotelOffers.slice(0, 4).map((hotel) => (
                      <article className="hotel-offer" key={hotel.id}>
                        <div><b>{hotel.name}</b><small>{hotel.room || "Quarto disponível"}</small></div>
                        <strong>{formatMoney(hotel.price, hotel.currency)}</strong>
                      </article>
                    ))}
                  </div>
                )}
                {placesState === "loading" && <div className="skeleton-list"><i /><i /><i /></div>}
                {places.map((place) => (
                  <button className="place-card" key={place.id} onClick={() => setActivePoint(place)}>
                    {place.image ? <img src={place.image} alt="" /> : <div className="place-image-fallback">{place.name.slice(0, 1)}</div>}
                    <div>
                      <span>{place.type === "hotel" ? "HOTEL" : place.type === "restaurant" ? "RESTAURANTE" : "ATRAÇÃO"}</span>
                      <h3>{place.name}</h3>
                      <p>{place.address}</p>
                      {place.rating ? <small>★ {place.rating.toFixed(1)} {place.reviews ? `· ${place.reviews.toLocaleString("pt-BR")} avaliações` : ""}</small> : null}
                    </div>
                  </button>
                ))}
                {!places.length && placesState !== "loading" && <EmptyState title="Nada encontrado" text="Tente outra camada ou configure a API Places para ampliar os resultados." />}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="neighborhood-section" id="bairros">
        <div className="sticky-copy">
          <p className="eyebrow">ESCOLHER O BAIRRO MUDA A VIAGEM</p>
          <h2>Não procure só um hotel.<br />Escolha o entorno.</h2>
          <p>O Atlas trata hospedagem como geografia: o que existe a pé, como é a rua e quanto tempo você perde em deslocamento.</p>
        </div>
        <div className="stack-cards">
          {city.neighborhoods.map((item, index) => (
            <article className="stack-card" key={item.name} style={{ top: `${94 + index * 14}px`, zIndex: index + 1 }}>
              <div><span>{city.name}</span><h3>{item.name}</h3></div>
              <p>{item.note}</p>
              <button onClick={() => { setActivePoint({ id: item.name, name: item.name, type: "attraction", lat: item.lat, lng: item.lng }); setLayer("street"); document.getElementById("explorar")?.scrollIntoView({ behavior: "smooth" }); }}>Ver rua</button>
            </article>
          ))}
        </div>
      </section>

      <section className="price-section" id="precos">
        <div className="price-intro">
          <p className="eyebrow">PREÇO É UM DADO QUE MUDA</p>
          <h2>Pesquise agora.<br />Compare depois.</h2>
          <p>Quando a fonte live estiver configurada, o Atlas consulta a tarifa atual e compara com a última busca salva neste navegador.</p>
          <div className="provider-pills"><span>Amadeus ready</span><span>Skyscanner adapter</span><span>Hotel layer</span></div>
        </div>
        <div className="flight-console">
          <form className="search-grid" onSubmit={searchFlights}>
            <label><span>Origem</span><input value={origin} onChange={(event) => setOrigin(event.target.value.toUpperCase().slice(0, 3))} /></label>
            <label><span>Destino</span><input value={`${city.name} (${city.iata})`} readOnly /></label>
            <label><span>Ida</span><input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></label>
            <label><span>Volta</span><input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} /></label>
            <label><span>Viajantes</span><input type="number" min="1" max="9" value={travelers} onChange={(event) => setTravelers(Number(event.target.value))} /></label>
            <button className="search-btn" disabled={flightLoading}>{flightLoading ? "Buscando…" : "Ver tarifas"}</button>
          </form>

          <div className="price-watch-row">
            <div>
              <span>MONITOR DE PREÇO</span>
              <b>{priceDelta == null ? "Faça duas buscas para comparar" : priceDelta < 0 ? `↓ ${Math.abs(priceDelta).toFixed(1)}% desde a última busca` : priceDelta > 0 ? `↑ ${priceDelta.toFixed(1)}% desde a última busca` : "Sem mudança desde a última busca"}</b>
            </div>
            <button type="button" className={watching ? "watching" : ""} onClick={() => setWatching((value) => !value)}>{watching ? "Acompanhando" : "Acompanhar"}</button>
          </div>

          <div className="flight-results">
            {flightSource === "demo" && <div className="data-banner">Dados demonstrativos. Adicione AMADEUS_CLIENT_ID e AMADEUS_CLIENT_SECRET para tarifas live.</div>}
            {flights.slice(0, 5).map((flight) => (
              <article key={flight.id} className="flight-row">
                <div className="airline-badge">{flight.airline}</div>
                <div><span>SAÍDA</span><b>{formatTime(flight.departure)}</b></div>
                <div className="flight-line"><i /><span>{flight.stops ? `${flight.stops} escala${flight.stops > 1 ? "s" : ""}` : "direto"}</span><i /></div>
                <div><span>CHEGADA</span><b>{formatTime(flight.arrival)}</b></div>
                <div className="flight-price"><span>{flight.duration}</span><b>{formatMoney(flight.price, flight.currency)}</b></div>
              </article>
            ))}
            {!flights.length && <EmptyState title="Pronto para pesquisar" text="Use a busca acima para comparar a rota até a cidade escolhida." />}
          </div>
        </div>
      </section>

      <section className="closing-scene">
        <div className="closing-orbit" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow">DO MAPA PARA A RUA</p>
        <h2>Viajar começa antes<br />de sair de casa.</h2>
        <p>O objetivo do Atlas é reduzir surpresa ruim e aumentar contexto: saber onde você vai dormir, o que existe em volta e se o preço ainda faz sentido.</p>
        <a className="primary-btn" href="#top">Explorar outra cidade</a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark">A</span><span><b>ATLAS</b><small>ARGENTINA</small></span></a>
        <p>Mapa, rua, estadia, comida, atrações e preços conectados pelo lugar.</p>
        <span>Preview técnico · APIs externas dependem de credenciais.</span>
      </footer>
    </main>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><b>{title}</b><p>{text}</p></div>;
}
