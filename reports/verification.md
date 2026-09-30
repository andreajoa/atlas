# Verificação do Atlas Viagem

Revisão em 29/09/2026. Este relatório documenta testes locais; publicação deve ser confirmada na hospedagem.

## Resultado

- 36 verificações do planejador aprovadas em desktop (1440 × 1000) e celular (390 × 844): abas, teclado, mapa, zoom, hotéis, filtros, buscas, Street View, quartos, datas, viajantes, orçamento, favoritos, roteiro, checklist e SEO.
- O teste de zoom passou a aguardar o fim da animação do mapa, evitando depender de um atraso fixo. Não houve alteração no comportamento de zoom.
- Nova abertura com objetivo claro, aviso de que não há venda de passagens ou reservas, cena ilustrativa e cores de viagem. Fontes e limites distinguem consultas externas atuais de cadastros e estimativas.
- Animação MP4 de cerca de 312 KB, poster WebP e GIF separado. Botão de pausa verificado. Com movimento reduzido, o vídeo permanece sem src e parado; imagem estática continua visível.
- Sem rolagem horizontal nos tamanhos verificados; sem erros de JavaScript registrados.
- O PDF de 410.299 bytes foi verificado na revisão anterior. Nesta revisão, as regras de impressão continuam incluindo o planejamento e excluem vídeo e aviso de estatísticas; novo PDF não foi extraído.

## Audiência e proteção de dados

O teste real atravessou navegador → consentimento → API → SQLite → painel protegido → exclusão. Confirmou ausência de identificador e coleta antes da escolha, funcionamento do planejador com recusa, envio somente após permitir, persistência de eventos, login com senha, métricas reais e painel sem rolagem horizontal no celular. O visitante de teste foi excluído; não há contadores de demonstração.

Oito testes automatizados passaram: consentimento/validação; reenvios idempotentes; isolamento de sessões; bots/CORS/tamanho de corpo; senha, assinatura e expiração de token; limite diário; exclusão com cascata; retenção e ausência de dados. Testes verificaram que campos pessoais não entram na base de audiência e que senhas/IP não aparecem no relatório.

No runtime Cloudflare local, a migração D1 foi aplicada e o fluxo de inserts, reenvio, login, consultas agregadas e exclusão passou. `/dashboard` respondeu 200 sem redirecionamento circular, com `noindex` e `no-store`. Segredos locais foram utilizados apenas pelo servidor, fora do Git e dos argumentos de comandos.

Cidade e país podem ser aproximados pela Cloudflare. No servidor local ficam indisponíveis. Gênero e bairro não são inferidos. A medição representa apenas visitas que permitem estatísticas e não bloqueiam a coleta, sem histórico anterior à instalação.

## Build, SEO e publicação

`npm test`, `npm run check`, `npm run build`, `wrangler deploy --dry-run` e `git diff --check` passaram. O build foi inspecionado: sem senha, segredo de assinatura, servidor, banco ou arquivos privados.

Seis páginas públicas em português: planejador, três guias, sobre e privacidade. Metadados, JSON-LD, recursos, links e sitemap foram validados, inclusive troca de domínio. Painel marcado noindex e excluído do sitemap; API não indexável. Nenhum teste garante indexação, posição ou citação por IA.

O domínio configurado é https://atlas-nine-vert.vercel.app/. `vercel.json` define build estático, dist e rota /dashboard. A coleta de produção permanece desativada: a sessão Cloudflare expirou e OAuth não foi concluído. Nenhum banco remoto ou plano pago foi criado. Código e painel local estão prontos; para medir visitantes online, falta reconectar a conta e publicar o backend, conforme README.

## Escopo e fontes

Buenos Aires é o foco. Os R$ 23.000 iniciais são um exemplo, não uma cotação atual. Hotéis OpenStreetMap não comprovam funcionamento ou disponibilidade. Fotos, quartos e preços vêm de sites externos. Street View não é ao vivo. AdSense não foi instalado.

- [Turismo oficial de Buenos Aires](https://turismo.buenosaires.gob.ar/en/article/neighbourhoods)
- [Migrações da Argentina](https://www.argentina.gob.ar/migraciones/documentacion-para-ingresar-al-pais-como-turista)
- [Viagens de menores — Polícia Federal](https://www.gov.br/pf/pt-br/assuntos/imigracao/controle-migratorio/quais-as-regras-de-viagem-de-criancas-e-adolescentes-ao-exterior)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Política de tiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
- [SEO para IA — Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Guia ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf)
- [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/)
- [Vercel Hobby e uso não comercial](https://vercel.com/docs/plans/hobby)

Capturas locais: /private/tmp/atlas-travel-desktop.png, /private/tmp/atlas-travel-mobile-final.png, /private/tmp/atlas-dashboard-desktop.png e /private/tmp/atlas-dashboard-mobile.png. As capturas do painel mostram a visita real de teste, posteriormente excluída.
