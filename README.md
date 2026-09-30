# Atlas Viagem

Planejador gratuito de viagem à Argentina para brasileiros, com foco atual em Buenos Aires. HTML, CSS e JavaScript estáticos; sem build, conta, banco, assinatura, API paga ou chave.

## Executar localmente

```sh
python3 -m http.server 4187 --bind 127.0.0.1
```

Abra http://127.0.0.1:4187. Servir por HTTP é necessário para carregar o cadastro JSON dos hotéis.

## Funcionalidades

- Cinco abas com navegação por teclado, URL compartilhável e histórico.
- Mapa Leaflet com zoom, marcadores, busca e filtros; mapas gratuitos do OpenStreetMap.
- Seis bairros, seis passeios e 30 cadastros de hospedagem extraídos do OpenStreetMap em 29/09/2026. O cadastro não comprova funcionamento ou disponibilidade atual.
- Google Maps, Street View e sites oficiais abrem externamente, sem chave de API.
- Consulta de hospedagem envia datas, bairro/hotel, adultos, quartos e idades das crianças ao Booking. Fotos, quartos, preços e disponibilidade são exibidos pelo serviço externo. Google Hotéis e Google Voos usam consultas textuais: confira os filtros no destino.
- Aeroportos de saída em várias regiões do Brasil.
- Orçamento em reais, favoritos, ordem do roteiro, rotas e checklist com persistência local.
- Impressão em PDF pelo navegador.

Os valores iniciais são estimativas recuperadas do projeto original, não tarifas atuais. O Atlas não processa reservas, pagamentos ou cobranças. Os serviços externos podem usar seus próprios cookies e cobrar pelas reservas. Planejamentos ficam somente no localStorage do visitante. Limpar os dados do navegador apaga o planejamento.

O mapa requer internet. Se os mapas estiverem indisponíveis, a lista, os links externos e o planejador continuam utilizáveis. Leaflet está incluído localmente com sua licença BSD; tiles OpenStreetMap mantêm atribuição e seguem a política pública de uso. Não há consultas automáticas ao Overpass em produção: os hotéis são um cadastro estático local.

## SEO e descoberta em busca com IA

Metadados em português brasileiro, canonical, Open Graph e imagem social, WebSite/WebPage/TouristDestination/FAQPage em JSON-LD, conteúdo útil entregue no HTML, perguntas visíveis, fontes oficiais, três guias próprios com Article/BreadcrumbList, links internos, robots.txt e sitemap.xml com as quatro páginas.

O endereço foi obtido do campo homepage do repositório: https://atlas-nine-vert.vercel.app/. Para alterar:

```sh
python3 scripts/configure-site.py https://seu-dominio.com
```

Depois da publicação, verifique a propriedade no Google Search Console e envie o sitemap. Não existe garantia de posição no Google, cobertura de todo o Brasil ou citação por assistentes. O site cobre Buenos Aires; não afirma oferecer guias completos de toda a Argentina. GEO usa conteúdo legível, fontes e estrutura técnica; não depende de arquivos especiais ou menções artificiais.

## Publicação

Importe o repositório em um provedor de hospedagem estática. No Vercel, use preset `Other`, sem comando de build e saída na raiz. Nenhuma variável de ambiente é necessária. Os limites e termos do plano de hospedagem escolhido continuam aplicáveis.

## Verificação

Com o servidor ativo e agent-browser instalado:

```sh
python3 tests/check-site.py
node --check assets/app.js
agent-browser --session atlas-test open 'http://127.0.0.1:4187/#onde'
agent-browser --session atlas-test eval --stdin < tests/browser-checks.js
agent-browser --session atlas-test reload
agent-browser --session atlas-test close
```

O teste verifica abas, teclado, mapa, hotéis, busca, Street View, datas, quartos, viajantes, favoritos, orçamento, checklist e estrutura SEO. Ele intercepta a abertura de links externos para conferir os parâmetros sem iniciar reservas. Restaura o localStorage anterior; recarregue a página depois para restaurar a interface.

Evidências da revisão: [reports/verification.md](reports/verification.md).
