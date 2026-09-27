import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas Argentina | Veja antes de viajar",
  description:
    "Explore cidades argentinas em mapa, Street View, hotéis, restaurantes, atrações, voos e webcams em uma única experiência.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
