# Verificação do Atlas Viagem

Revisão local em 29/09/2026. Alterações ainda não publicadas no domínio público.

## Resultado

- 36 verificações funcionais aprovadas em 1440 × 1000 e 390 × 844.
- Mapa com oito tiles carregados durante a inspeção; zoom, marcadores, filtros, busca, seis bairros e 30 cadastros de hospedagem funcionando.
- Todas as cinco abas, navegação por teclado, favoritos, ordem do roteiro e links de rotas verificados.
- Consulta de hospedagem envia datas, quartos, adultos e idades; datas invertidas bloqueiam a busca. Links externos foram inspecionados sem fazer reservas.
- Orçamento sincronizado com resumo e passagens; zero não gera divisão inválida. Checklist e orçamento também foram mantidos após recarregar a página em teste separado.
- Sem rolagem horizontal da página nos tamanhos verificados e sem erros de JavaScript registrados pelo navegador.
- PDF gerado com 410.299 bytes. Regra de impressão inclui as cinco abas; o conteúdo textual do arquivo PDF não foi extraído nesta revisão.

## SEO e descoberta por IA

Quatro páginas estáticas em português brasileiro, com títulos e descrições próprios, canonical, Open Graph, imagem social e JSON-LD. Três guias interligados tratam de hospedagem em Buenos Aires, orçamento e documentos. Conteúdo explicativo e fontes estão no HTML, acessíveis sem executar o planejador.

`python3 tests/check-site.py` aprovou recursos locais, links, âncoras, IDs, metadados, JSON-LD, sitemap e troca de domínio em uma cópia temporária. `node --check assets/app.js` e `git diff --check` também passaram.

O endereço configurado é https://atlas-nine-vert.vercel.app/, obtido do campo homepage do repositório. A publicação e a verificação no Search Console ainda são necessárias para solicitar indexação. Nenhum teste local comprova indexação, posição nos resultados ou menção por um assistente de IA.

## Correções e escopo

A página original tinha seções repetidas, IDs duplicados, ausência da seção de hospedagem e trechos de JavaScript fora da tag script. A reprodução inicial falhou nas abas de hospedagem, passagens e etapas. A versão revisada mantém o projeto estático e acrescenta um planejador funcional com persistência por navegador.

O mapa atual cobre Buenos Aires. O orçamento inicial de R$ 23.000 é um exemplo do projeto original, não uma cotação atual. Cadastros OpenStreetMap não comprovam funcionamento ou disponibilidade de hotéis. Fotos, quartos e preços são consultados externamente; Street View abre no Google Maps conforme a cobertura. Google Hotéis e Google Voos usam pesquisas textuais, e os filtros devem ser conferidos no destino.

Não há API paga, chave, assinatura, geração de cobranças ou chamadas automáticas ao Overpass. O mapa usa tiles públicos OpenStreetMap com atribuição; o cadastro de hotéis e a biblioteca Leaflet são locais. O funcionamento do mapa e dos serviços externos requer internet.

## Fontes consultadas

- [Bairros de Buenos Aires — turismo oficial](https://turismo.buenosaires.gob.ar/en/article/neighbourhoods)
- [Documentação de ingresso como turista — Migrações da Argentina](https://www.argentina.gob.ar/migraciones/documentacion-para-ingresar-al-pais-como-turista)
- [Viagem de menores — Polícia Federal](https://www.gov.br/pf/pt-br/assuntos/imigracao/controle-migratorio/quais-as-regras-de-viagem-de-criancas-e-adolescentes-ao-exterior)
- [Maps URLs — Google](https://developers.google.com/maps/documentation/urls/get-started)
- [Política de tiles — OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
- [SEO para recursos de IA — Google Search Central](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

Capturas de revisão e PDF disponíveis localmente em `/private/tmp/atlas-viagem-final-desktop.png`, `/private/tmp/atlas-viagem-final-mobile.png`, `/private/tmp/atlas-guide-mobile.png` e `/private/tmp/atlas-planejamento.pdf`.
