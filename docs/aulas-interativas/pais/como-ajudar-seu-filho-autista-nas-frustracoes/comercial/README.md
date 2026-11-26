# Imagens da oferta e do pagamento

As três artes seguem os personagens e a paleta da imagem base do curso. Foram geradas com o `imagegen` integrado, sem texto, preço ou quantidade de aulas. Os prompts estão em [prompts.json](prompts.json); as dimensões e os hashes estão em [imagens.json](imagens.json).

| Arquivo | Uso |
| --- | --- |
| `checkout-capa` | Composição quadrada com Vivianne, mãe e filho para a identificação do curso na página de pagamento e na confirmação. |
| `oferta-antecipar` | Mãe e filho usando uma rotina visual antes da transição entre atividades. |
| `oferta-acolher` | Mãe ouvindo o filho, que mostra um cartão para pedir ajuda. |

Cada arte tem o PNG original e uma cópia WebP para a web. A conversão preserva a composição; não há recorte. As cópias usadas pelo site ficam em `packages/funnel/public/img/como-ajudar-seu-filho-autista/`.

A definição do funil aponta `checkoutImage` para `checkout-capa.webp`. As duas ilustrações de apoio entram em “O que muda” na página da oferta. O guia para pais continua usando suas próprias imagens.

Para publicar novamente, manter os três WebP no diretório público, a referência do checkout em `funnels/autismo-frustracoes/index.ts` e as duas referências em `content/curso-pais-autismo.ts`. A página e o checkout devem ser conferidos no computador e no celular após a publicação.

O [recibo de publicação em produção](publicacao-producao-2026-11-26.json) registra as fontes, ofertas, acesso, link pessoal da Vivianne e verificações. O [levantamento funcional](../../../../reviews/2026-11-25-campanhas-embaixadores-origens/funcionamento-apos-publicacao.md) explica a operação comercial. O link pessoal não exige campanha nem data de encerramento.


## Atualização de seis meses e prévia

A oferta de R$ 67 passou a seis meses em produção em 26/11/2026, mantendo o identificador antigo. O cartão JPEG 1200 × 630 usado na prévia do WhatsApp está em [compartilhar.jpg](compartilhar.jpg). O [recibo da atualização](publicacao-workshop-2026-11-26.json) distingue a publicação manual do estado do CI e da publicação oficial.

O [recibo consolidado](publicacao-consolidada-2026-11-26.json) reúne esta publicação, os ajustes seguintes e o estado do processo normal pelo GitHub.
