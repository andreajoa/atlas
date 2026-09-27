# ATLAS · Buenos Aires Travel Intelligence

Reconstrução do antigo dashboard HTML em Next.js/React, com foco em uma experiência de viagem geográfica, visual e conectável a dados vivos.

## O que existe nesta versão

- Next.js App Router + React + TypeScript.
- Scroll-driven storytelling com dispositivos diferentes por capítulo: parallax do hero, mapa, Street View, cards empilhados e painéis de inteligência.
- Mapa interativo de Buenos Aires com OpenStreetMap sem chave.
- Street View embutido via Google Maps Embed API quando a chave estiver configurada.
- Nearby places via Google Places API.
- Busca de voos via Amadeus Flight Offers Search.
- Estrutura de hotéis via Booking.com Demand API.
- Webcams públicas próximas via Windy Webcams API v3.
- Estados de fallback: o site continua utilizável e deixa claro quando uma integração ainda não tem credenciais.
- Layout mobile próprio e suporte a `prefers-reduced-motion`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha somente os provedores que quiser ativar.

## Rodar

```bash
npm install
npm run dev
```

## Arquitetura recomendada de produção

A interface não chama APIs pagas diretamente do browser, exceto a chave pública restrita do Maps Embed. Credenciais Amadeus, Booking, Places Web Service e Windy ficam somente no servidor, através dos Route Handlers em `app/api/*`.

Para alertas automáticos de queda de preço, a próxima camada é persistir snapshots de tarifas em Postgres/Neon e executar consultas programadas por cron, comparando preço atual, média recente e menor preço observado.
