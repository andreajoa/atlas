# Atlas Argentina

Um atlas de viagem interativo para explorar a Argentina antes de reservar: mapa 3D, Street View 360°, hotéis, restaurantes, atrações, preços de voos/hotéis e webcams próximas do destino.

## Arquitetura

- **Next.js + React / App Router** para UI, rotas de API e deploy no Vercel.
- **Google Maps JavaScript API** para mapa e Street View; tenta usar 3D Maps quando a chave/browser suportam e cai para o mapa padrão quando necessário.
- **Google Places API (New)** para hotéis, restaurantes, atrações, avaliações e fotos.
- **Amadeus Self-Service** para Flight Offers Search e Hotel Search.
- **Windy Webcams API v3** para imagens/webcams recentes próximas do destino.
- **Skyscanner adapter slot** preparado por variável de ambiente para uma fase posterior. O acesso aos Travel APIs da Skyscanner exige aprovação comercial.

Sem credenciais, a interface continua navegável em modo demonstração. Dados live são sempre identificados na UI.

## Configuração

```bash
cp .env.example .env.local
npm install
npm run dev
```

Preencha as credenciais em `.env.local`. Para produção, use chaves separadas e restritas para Google Maps (browser/referrer) e Google Places (server).

## Experiência de rolagem

A página foi reconstruída com princípios de Scroll Craft:

- hero em planos com profundidade, sem transformar toda a página em uma única animação;
- mapa como superfície de trabalho central;
- bússola persistente que responde ao progresso da página;
- cartões de bairros em pilha sticky;
- mudança de ritmo entre descoberta, exploração, preço e fechamento;
- composição mobile separada e `prefers-reduced-motion` respeitado.

## Dados de preço

A busca de voos compara o menor preço retornado com a última busca equivalente salva no navegador. Isso já mostra aumento/queda entre visitas.

Para **alertas automáticos em segundo plano** (ex.: “me avise quando GRU → BUE cair abaixo de R$ 1.500”), a próxima camada é persistir watchlists em Postgres/Neon, executar consultas por Vercel Cron e enviar alertas por e-mail/push. A UI já separa o conceito de “monitor” da busca pontual.

## Próximas integrações recomendadas

1. Persistência de conta/watchlist em Neon/Postgres.
2. Vercel Cron para snapshots de preço.
3. Resend para alertas por e-mail.
4. Skyscanner Travel API quando o projeto cumprir os requisitos comerciais de acesso.
5. Roteamento por cidade em `/argentina/[cidade]` e páginas indexáveis para SEO/GEO.
