export type AtlasLayer = "atlas" | "street" | "stay" | "eat" | "see" | "live";

export type PlacePoint = {
  id: string;
  name: string;
  type: "hotel" | "restaurant" | "attraction";
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  reviews?: number;
  image?: string | null;
  mapUrl?: string;
};

export type Destination = {
  slug: string;
  name: string;
  region: string;
  iata: string;
  lat: number;
  lng: number;
  zoom: number;
  heading: number;
  strap: string;
  weather: string;
  hero: string;
  neighborhoods: { name: string; note: string; lat: number; lng: number }[];
};

export const destinations: Destination[] = [
  {
    slug: "buenos-aires",
    name: "Buenos Aires",
    region: "Ciudad Autónoma de Buenos Aires",
    iata: "BUE",
    lat: -34.6037,
    lng: -58.3816,
    zoom: 13,
    heading: 18,
    strap: "A cidade que se entende melhor caminhando, quadra por quadra.",
    weather: "Urbana, gastronômica e cultural",
    hero: "Avenida 9 de Julio, cafés, parques e bairros que mudam completamente de personalidade em poucos quilômetros.",
    neighborhoods: [
      { name: "Recoleta", note: "Arquitetura, museus e caminhada tranquila", lat: -34.5875, lng: -58.3974 },
      { name: "Palermo", note: "Parques, restaurantes e vida de bairro", lat: -34.5796, lng: -58.4232 },
      { name: "San Telmo", note: "Casario histórico, feira e antiquários", lat: -34.6212, lng: -58.3731 },
      { name: "Puerto Madero", note: "Orla, arquitetura contemporânea e pôr do sol", lat: -34.6118, lng: -58.3629 }
    ]
  },
  {
    slug: "bariloche",
    name: "Bariloche",
    region: "Río Negro",
    iata: "BRC",
    lat: -41.1335,
    lng: -71.3103,
    zoom: 11,
    heading: 42,
    strap: "Lagos, montanhas e uma cidade desenhada para olhar para fora.",
    weather: "Patagônia, neve e lagos",
    hero: "Uma base urbana cercada por água, floresta e relevo dramático, com deslocamentos que valem tanto quanto os destinos.",
    neighborhoods: [
      { name: "Centro Cívico", note: "Base central e acesso fácil a serviços", lat: -41.1337, lng: -71.3106 },
      { name: "Melipal", note: "Vista do lago e ritmo residencial", lat: -41.1357, lng: -71.3514 },
      { name: "Playa Bonita", note: "Lago Nahuel Huapi quase na porta", lat: -41.1276, lng: -71.4042 },
      { name: "Llao Llao", note: "Natureza e acesso ao Circuito Chico", lat: -41.0552, lng: -71.5327 }
    ]
  },
  {
    slug: "mendoza",
    name: "Mendoza",
    region: "Mendoza",
    iata: "MDZ",
    lat: -32.8895,
    lng: -68.8458,
    zoom: 12,
    heading: 65,
    strap: "Cidade arborizada, Andes no horizonte e vinho a poucos minutos.",
    weather: "Vinhos, cordilheira e gastronomia",
    hero: "Praças, acequias, bodegas e a possibilidade de alternar cidade e montanha na mesma viagem.",
    neighborhoods: [
      { name: "Centro", note: "Praças, restaurantes e deslocamento simples", lat: -32.8898, lng: -68.8446 },
      { name: "Quinta Sección", note: "Bares e proximidade do Parque San Martín", lat: -32.8954, lng: -68.8637 },
      { name: "Chacras de Coria", note: "Bodegas e clima residencial", lat: -32.9875, lng: -68.8830 },
      { name: "Maipú", note: "Rota de vinhos e experiências rurais", lat: -32.9781, lng: -68.7843 }
    ]
  },
  {
    slug: "ushuaia",
    name: "Ushuaia",
    region: "Tierra del Fuego",
    iata: "USH",
    lat: -54.8019,
    lng: -68.3030,
    zoom: 11,
    heading: 25,
    strap: "A cidade termina e a paisagem continua.",
    weather: "Canal Beagle, trilhas e frio",
    hero: "Uma cidade compacta entre montanhas e mar, onde clima e logística mudam o roteiro de um dia para o outro.",
    neighborhoods: [
      { name: "Centro", note: "Restaurantes, porto e serviços", lat: -54.8070, lng: -68.3040 },
      { name: "Bahía Encerrada", note: "Caminhada à beira d'água", lat: -54.8146, lng: -68.3116 },
      { name: "Glaciar Martial", note: "Acesso rápido à montanha", lat: -54.7838, lng: -68.3880 },
      { name: "Puerto", note: "Saídas para navegação no Canal Beagle", lat: -54.8093, lng: -68.3006 }
    ]
  },
  {
    slug: "cordoba",
    name: "Córdoba",
    region: "Córdoba",
    iata: "COR",
    lat: -31.4201,
    lng: -64.1888,
    zoom: 12,
    heading: 8,
    strap: "Universitária, histórica e com serras logo depois da cidade.",
    weather: "História, vida urbana e serras",
    hero: "Centro histórico, gastronomia e uma posição estratégica para explorar as sierras cordobesas.",
    neighborhoods: [
      { name: "Nueva Córdoba", note: "Vida urbana, cafés e restaurantes", lat: -31.4286, lng: -64.1856 },
      { name: "Güemes", note: "Design, bares e feiras", lat: -31.4268, lng: -64.1943 },
      { name: "Centro", note: "Patrimônio e acesso a pé", lat: -31.4167, lng: -64.1833 },
      { name: "General Paz", note: "Residencial e gastronômico", lat: -31.4124, lng: -64.1686 }
    ]
  },
  {
    slug: "salta",
    name: "Salta",
    region: "Salta",
    iata: "SLA",
    lat: -24.7821,
    lng: -65.4232,
    zoom: 12,
    heading: 35,
    strap: "Arquitetura colonial como ponto de partida para paisagens enormes.",
    weather: "Noroeste, cultura e altitude",
    hero: "Centro histórico preservado, gastronomia regional e acesso a algumas das paisagens mais marcantes do noroeste argentino.",
    neighborhoods: [
      { name: "Centro Histórico", note: "Praças, museus e arquitetura", lat: -24.7890, lng: -65.4107 },
      { name: "Tres Cerritos", note: "Residencial e mais silencioso", lat: -24.7638, lng: -65.4014 },
      { name: "Monumento Güemes", note: "Verde e acesso ao Cerro San Bernardo", lat: -24.7855, lng: -65.3988 },
      { name: "Balcarce", note: "Peñas, restaurantes e vida noturna", lat: -24.7795, lng: -65.4139 }
    ]
  }
];

export const fallbackPlaces: Record<string, PlacePoint[]> = {
  "buenos-aires": [
    { id: "obelisco", name: "Obelisco", type: "attraction", lat: -34.6037, lng: -58.3816, address: "Av. 9 de Julio e Av. Corrientes" },
    { id: "teatro-colon", name: "Teatro Colón", type: "attraction", lat: -34.6011, lng: -58.3832, address: "Cerrito 628" },
    { id: "recoleta", name: "Recoleta", type: "attraction", lat: -34.5875, lng: -58.3974, address: "Recoleta" },
    { id: "palermo", name: "Palermo", type: "attraction", lat: -34.5796, lng: -58.4232, address: "Palermo" },
    { id: "san-telmo", name: "San Telmo", type: "attraction", lat: -34.6212, lng: -58.3731, address: "San Telmo" }
  ]
};

export function getDestination(slug?: string | null) {
  return destinations.find((destination) => destination.slug === slug) ?? destinations[0];
}
