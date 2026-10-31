# E04: criação avançada e Lenda (plano, 30/10/2026)

> **Histórico (31/10/2026).** Tudo o que este plano esperava foi entregue: iglu, andar de cima,
> terreno e subida do Farol no B7 da proposta v3 (`6ee28cb35`, `9e114f324`, merge `9511bac57`,
> sobras `f2f441cf6`), obra estendida em documento próprio (migração 0023). A revisão de 31/10
> corrigiu a resposta perdida e o Desfazer (C1, `2c2c9b515`), ligou a subida ao final (N4,
> `c94c34139`) e pôs móveis no andar de cima (C3, `e2f151602`). Objetos com função ficam no
> térreo, por decisão da dona. O texto abaixo é o plano de 30/10, mantido como registro.

Lote do levantamento de 30/10. Feito: o quintal grande do Vale (`74819e31b`). Adiado na
integração da V20: o iglu do Pico. Este plano cobre o que falta e por que espera.

## O que espera e por quê

| Parte | Proposta | Espera | Pedido |
| --- | --- | --- | --- |
| Iglu | Pico: construir o iglu | Lote no `pico.glb` e documento próprio no serviço | Pedidos de arte, seção do iglu |
| Segundo andar | Pico: segundo andar da casa | Escada, piso de cima e guarda-corpo no kit da casa | Pedidos de arte, E04 item 1 |
| Moldar o terreno | Nuvens: moldar o terreno | O chão do lote separado no `terreno.glb` | Pedidos de arte, E04 item 2 |
| Subida final | Lenda: subida pelo Farol | Caminho por fora da torre no `farol.glb` | Pedidos de arte, E04 item 3 |
| Farol como galeria | Lenda: criações favoritas | Feito pela outra sessão (fase4-12, `20b312aa1`) | Nenhum |
| Modo livre | Lenda: construção sem limite de posto | Feito pela outra sessão (fase4-12, `20b312aa1`) | Nenhum |

Nenhuma dessas partes desenha peça que falte na arte (regra do lote: falta de arte vira pedido).

## O documento próprio da obra (quando a arte chegar)

O salvamento V20 está a cerca de 600 bytes do teto no pior caso. Iglu, andar de cima e terreno
vão para um documento à parte no serviço, no molde dos fantasmas (`armazem-fantasmas.ts`, rotas
da família na API):

- Contrato `ObraEstendidaSchema` em `arquipelago-contracts`: `iglu` (obra da cabana, tetos
  próprios), `andar` (paredes, aberturas, pisos e objetos do andar de cima, com os tetos do lote
  da casa) e `terreno` (grade de alturas do lote grande, inteiros de 0 a 3 em meios metros).
  Teto próprio de 32 KB, versão própria.
- Serviço: `GET/PUT /obra-estendida` por perfil e público, com revisão (CAS) como o salvamento.
  Suporte e visita só leem. Migração própria na API.
- Jogo: fila e diário como a do salvamento (IndexedDB por perfil), conflito que pede resolução,
  desfazer na loja do Construir. A obra principal continua na V20; a estendida só acrescenta.
- Conciliação: a obra estendida não mistura campos com a V20; duas sessões resolvem por revisão.

## Regras de jogo previstas

- Andar de cima só com o Pico aberto (posição 5) e com a escada posta num cômodo térreo; o piso
  de cima só sobre células cobertas por cômodos do térreo; o telhado sobe para o andar de cima.
- Terreno só com as Nuvens abertas (posição 7), no lote grande, fora das células com obra, horta
  e trilhas; a casa e o quarto ficam no plano. Prévia e desfazer em cada passo.
- Subida final: percurso `farol-subida` com três estrelas, como os outros, num salvamento novo
  (ou no documento próprio, se a V20 não comportar a entrada de 96 bytes).

## Verificação prevista

Cada parte com o teste do aceite do pedido de arte, colisão com a cápsula real, prova no
navegador em computador e celular e o teste de documento cheio do contrato novo.
