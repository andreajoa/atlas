import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATLAS · Buenos Aires Travel Intelligence',
  description: 'Mapa vivo para planejar Buenos Aires: lugares, Street View, voos, hotéis, restaurantes e webcams.'
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
