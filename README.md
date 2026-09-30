# Atlas Viagem

Guia gratuito de viagem à Argentina para brasileiros, com foco em Buenos Aires. Explore bairros e hospedagens, abra Street View, organize lugares e estime gastos em reais. O Atlas não vende passagens nem faz reservas. A abertura usa céu azul, tons claros, detalhes de sol e uma cena ilustrativa de Puerto Madero.

## Executar e acessar o painel

Requer Node.js 22.13 ou superior. O planejador público continua sendo HTML, CSS e JavaScript; o servidor local usa SQLite e o backend preparado para produção usa Cloudflare Workers + D1.

```sh
npm ci
npm run dev
```

- Site: http://127.0.0.1:4188/
- Painel: http://127.0.0.1:4188/dashboard
- Senha local: `.local/admin-access.txt`, criado automaticamente com permissão 600.

Credenciais, banco e dados locais ficam fora do Git e do build. Nunca envie `.local`, `.dev.vars` ou senhas ao repositório. O site também pode ser servido por um servidor estático; a medição e o painel requerem o backend configurado.

## O que o guia oferece

- Cinco abas, teclado, URLs compartilháveis e histórico.
- Mapa Leaflet com zoom, busca, marcadores e filtros, usando OpenStreetMap com atribuição.
- Seis bairros, seis passeios e 30 cadastros OpenStreetMap consultados em 29/09/2026. O cadastro não confirma funcionamento, qualidade ou disponibilidade atual.
- Street View e Google Maps externos, sem chave. Street View contém imagens gravadas, não câmeras ao vivo.
- Pesquisa de quartos no Booking com datas, bairro/hotel, adultos, quartos e idades. Fotos, preços e disponibilidade aparecem no serviço externo. Google Hotéis e Google Voos usam consultas textuais: confirme os filtros ao abrir.
- Orçamento em reais, favoritos, ordem do roteiro, rotas, checklist e impressão em PDF. O exemplo inicial é ilustrativo, não uma cotação atual.

Planejamentos ficam no navegador; os valores dos formulários não são enviados ao painel. Mapas e serviços externos requerem internet. Não há API paga de mapas, tarifas ou IA conectada ao site, nem consultas automáticas ao Overpass. [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) não exige chave; tiles públicos seguem a [política OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Cena e referências de design

A imagem WebP foi criada com IA e está identificada como ilustrativa. A animação é um movimento suave de câmera sobre essa imagem, não um vídeo documental de pessoas caminhando. O site usa MP4 de aproximadamente 312 KB, com pausa, interrupção fora da tela e poster estático para movimento reduzido ou economia de dados. O GIF solicitado está em `assets/hero-buenos-aires.gif` e não é baixado automaticamente.

Scroll Craft e Studio foram consultados como referências de jornada visual, hierarquia e apresentação editorial. Não foram incorporadas imagens sem licença ou ferramentas pagas de geração de vídeo. A interface mantém controles nativos e leitura no celular.

## Medição de audiência

Estatísticas opcionais começam somente após a escolha do visitante. Os botões permitem estatísticas ou usam só o essencial. A preferência pode ser alterada no rodapé; a página de privacidade permite excluir registros associados ao identificador atual do navegador.

O painel protegido por senha mostra sessões, navegadores únicos aproximados, retornos, tempo ativo, páginas e seções, cliques, lugares explorados, pesquisas, origens, campanhas, dispositivos, cidades e países aproximados, com exportação CSV. Não grava sessões e não acompanha reservas nos serviços externos.

- Localização vem de metadados aproximados da Cloudflare, quando disponíveis; no servidor local pode ficar indisponível.
- Não inferimos gênero ou bairro e não solicitamos GPS. Não armazenamos IP, nomes, e-mails, teclas ou conteúdo dos campos na base de audiência.
- Identificador aleatório dura 30 dias; sessões renovam após 30 minutos sem interação. Navegadores únicos não equivalem necessariamente a pessoas.
- Tempo ativo conta aba visível e interação recente, com corte após 60 segundos sem atividade.
- Eventos e envios de tempo são idempotentes. Retenção de até 90 dias, com remoção diária dos registros antigos.
- Limite inicial de 5.000 registros por dia UTC pausa a coleta. Limites do provedor também se aplicam; o guia funciona mesmo sem estatísticas.
- Tokens administrativos assinados expiram em quatro horas. Cinco senhas incorretas por origem de rede/hora bloqueiam tentativas nessa janela; o IP não fica no banco.

Escolhas implementadas com referência ao [guia da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf). O painel cobre visitantes que permitem a medição e não a bloqueiam, sem recuperar visitas anteriores à instalação. Não há dados de demonstração na interface.

## Estado de produção e publicação

Backend implementado e verificado localmente, inclusive no runtime Cloudflare. A sessão Cloudflare do Mac expirou e a reconexão OAuth não foi concluída. Nenhum banco ou serviço remoto foi criado nesta revisão. `assets/analytics-config.js` permanece com endpoint vazio: medição de produção desativada e `/dashboard` informa que falta a conexão. Não há contadores fictícios.

O push permite que a integração existente de hospedagem publique o visual. `vercel.json` configura build `npm run build`, saída `dist` e rota `/dashboard`; build exclui servidor, testes, banco e segredos.

Para ativar o backend após reconectar a conta gratuita:

1. Execute `npx wrangler login` e confirme conta e plano **Free**, sem ativar Workers Paid ou serviços pagos.
2. Crie D1 dedicado com `npx wrangler d1 create atlas-viagem-audience`. Inclua o `database_id` devolvido em `wrangler.jsonc`.
3. Aplique `npx wrangler d1 migrations apply atlas-viagem-audience --remote`.
4. Cadastre senha forte com `npx wrangler secret put ADMIN_PASSWORD` e segredo aleatório de ao menos 32 bytes com `npx wrangler secret put AUTH_SECRET`. Use valores próprios de produção, fora do Git.
5. Execute `npm run cf:deploy`. Configure a URL HTTPS do Worker em `assets/analytics-config.js`; endpoint é público, não uma chave. `SITE_ORIGINS` deve incluir o domínio do site. Não habilite `DEVELOPMENT` em produção.
6. Confira `/api/status`, permita estatísticas em uma visita real e entre em `/dashboard` para confirmar os dados. Faça novo push do endpoint público.

Workers e D1 têm [planos gratuitos com limites](https://developers.cloudflare.com/workers/platform/pricing/) e [quotas D1](https://developers.cloudflare.com/d1/platform/pricing/). O código não ativa plano pago nem promete capacidade ilimitada. [Vercel Hobby](https://vercel.com/docs/plans/hobby) é destinado a uso pessoal não comercial: antes de monetizar com anúncios, use hospedagem compatível. O mesmo Worker está preparado para servir o site completo, permitindo optar por Cloudflare Free.

AdSense não instalado: não inventamos publisher ID ou `ads.txt`. Monetização futura exige sua conta, aprovação do Google e atualização da política de privacidade.

## SEO e descoberta por IA

Seis páginas públicas, títulos e descrições próprios, canonical, Open Graph, imagem social, JSON-LD, HTML legível, fontes e datas, guias interligados, robots e sitemap. Painel marcado `noindex`, fora do sitemap; API não indexável.

Domínio: https://atlas-nine-vert.vercel.app/. Para mudar:

```sh
python3 scripts/configure-site.py https://seu-dominio.com
```

Após publicação, verifique a propriedade no Search Console e envie o sitemap. Não há garantia de posição, cobertura de todo o Brasil ou citação por IA. O guia cobre Buenos Aires e declara esse escopo.

## Verificação

```sh
npm test
npm run check
npm run build
npx wrangler deploy --dry-run
```

Com servidor local ativo e `agent-browser` instalado:

```sh
node scripts/verify-audience.mjs
agent-browser --session atlas-test open 'http://127.0.0.1:4188/'
agent-browser --session atlas-test eval --stdin < tests/browser-checks.js
agent-browser --session atlas-test close
```

Teste de audiência atravessa navegador, consentimento, API, persistência, login, painel em desktop/celular e exclusão; remove o visitante de teste. Teste do planejador intercepta links sem fazer reservas e restaura o armazenamento anterior; recarregue depois para restaurar a interface. Evidências em [reports/verification.md](reports/verification.md).
