"use client";

import { useEffect, useRef, useState } from "react";
import type { AtlasLayer, Destination, PlacePoint } from "@/lib/destinations";

declare global {
  interface Window {
    google?: any;
    __atlasMapsPromise?: Promise<void>;
  }
}

type Props = {
  destination: Destination;
  layer: AtlasLayer;
  points: PlacePoint[];
  activePoint?: PlacePoint | null;
};

const MAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__atlasMapsPromise) return window.__atlasMapsPromise;

  window.__atlasMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_KEY}&loading=async&v=weekly&libraries=maps3d`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return window.__atlasMapsPromise;
}

export default function LiveMap({ destination, layer, points, activePoint }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback" | "error">(
    MAP_KEY ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!MAP_KEY || !hostRef.current) {
      setStatus("fallback");
      return;
    }

    let disposed = false;
    let panorama: any;
    let map: any;
    let markers: any[] = [];

    loadGoogleMaps()
      .then(async () => {
        if (disposed || !hostRef.current || !window.google?.maps) return;
        const host = hostRef.current;
        host.innerHTML = "";

        const focus = activePoint ?? { lat: destination.lat, lng: destination.lng };

        if (layer === "street") {
          panorama = new window.google.maps.StreetViewPanorama(host, {
            position: { lat: focus.lat, lng: focus.lng },
            pov: { heading: destination.heading, pitch: 2 },
            zoom: 1,
            addressControl: false,
            fullscreenControl: true,
            motionTracking: false,
          });
          setStatus("ready");
          return;
        }

        if (layer === "atlas" && window.google.maps.importLibrary) {
          try {
            await window.google.maps.importLibrary("maps3d");
            const globe = document.createElement("gmp-map-3d");
            globe.setAttribute("center", `${destination.lat},${destination.lng},900`);
            globe.setAttribute("tilt", "67");
            globe.setAttribute("heading", String(destination.heading));
            globe.setAttribute("range", "3100");
            globe.setAttribute("mode", "hybrid");
            globe.setAttribute("gesture-handling", "greedy");
            globe.className = "google-3d-map";
            host.appendChild(globe);
            setStatus("ready");
            return;
          } catch {
            // Fall through to the standard map if 3D is unavailable for this browser/key.
          }
        }

        map = new window.google.maps.Map(host, {
          center: { lat: focus.lat, lng: focus.lng },
          zoom: layer === "live" ? 11 : destination.zoom,
          mapTypeId: layer === "live" ? "terrain" : "roadmap",
          streetViewControl: true,
          fullscreenControl: true,
          mapTypeControl: false,
          clickableIcons: true,
          gestureHandling: "greedy",
        });

        markers = points.map((point) =>
          new window.google.maps.Marker({
            map,
            position: { lat: point.lat, lng: point.lng },
            title: point.name,
          }),
        );
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      disposed = true;
      markers.forEach((marker) => marker.setMap?.(null));
      if (panorama) panorama = null;
      if (map) map = null;
    };
  }, [destination, layer, points, activePoint]);

  if (status === "fallback" || status === "error") {
    return (
      <div className="fallback-map" aria-label={`Prévia cartográfica de ${destination.name}`}>
        <div className="fallback-grid" />
        <div className="fallback-river" />
        <div className="fallback-city" style={{ left: "51%", top: "49%" }}>
          <span className="pulse" />
          <strong>{destination.name}</strong>
          <small>{destination.region}</small>
        </div>
        {destination.neighborhoods.map((item, index) => (
          <button
            className="fallback-pin"
            key={item.name}
            style={{ left: `${24 + ((index * 19) % 58)}%`, top: `${28 + ((index * 17) % 45)}%` }}
            type="button"
            title={item.note}
          >
            {item.name}
          </button>
        ))}
        <div className="map-key-note">
          <b>{status === "error" ? "Mapa indisponível" : "Modo demonstração"}</b>
          <span>Adicione a chave do Google Maps para liberar mapa 3D e Street View 360°.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-host-wrap">
      <div ref={hostRef} className="map-host" />
      {status === "loading" && <div className="map-loading">Carregando mapa vivo…</div>}
    </div>
  );
}
