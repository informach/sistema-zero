# Lista A da revisão da proposta v3 (30/10/2026)

Implementa os achados que não dependem de arte do levantamento
`docs/arquipelago-levantamento-proposta-v3-2026-10-30.md` (seção 9, lista A), seguindo as decisões
de `docs/arquipelago-regras.md` §6.28. A dona pediu em 30/10/2026: "implemente os achados da lista
dos que não precisam de ajustes de arte ou arte nova".

Regras de sempre: um lote por vez, ramo `arquipelago/v3-loteN` a partir do staging local, testes
dirigidos, Biome, tipagem conforme a regra de uma sessão só, commit em português, merge no staging
local, sem push. Textos da criança sem travessão, sem exclamação e sem começar por pergunta. O
salvamento V20 está a cerca de 600 bytes do teto: campo novo só se couber no documento cheio, senão
documento próprio ou V21 com a conta registrada.

## Lotes

| Lote | Itens | Área |
| --- | --- | --- |
| 1 | A13, A4, A17, A18, A37, A39 | Mundo e história: Farol, página do Recife, sua ilha cinza, luneta, névoa, carta e páginas extras |
| 2 | A38, A8 | A noite: borrões que desbotam e as ondas de cinza nos ninhos |
| 3 | A12, A14, A20 | Relógios, Lumis com o jogo fechado, humor visível |
| 4 | A6, A22, A25, A31 | Cozinha: peixe com coco, pedidos de pratos, venda na feira, receita do extra, geladeira |
| 4b | A22 (venda) | Vender pratos na banca da feira, pelo serviço (crédito com chave e teto semanal, como a entrega de pedidos) |
| 5 | A19, A7, A21 | Moradores e companhia: Nico, dino em casa, roupas por amizade e de festa |
| 6 | A9, A40, A41 | Percursos e álbum: estrela do segredo, peixes no álbum, atalhos |
| 7 | A5, A10, A16, A30, A32 | Casa e economia: Pinta no Construtor, quarto nos dois sentidos, salvamento sem Members, criação pelo molde, teto |
| 8 | A3, A24, A23, A26, A2, A1 | Desafios na plataforma: curso para Python e Pro, "Aprenda isso em", desafio de morador, medição, sexto quadro na linguagem, publicação |
| 9 | A15, A42, A43, A44, A45, A46, A29 | Conteúdo dos desafios |
| 10 | A27, A28, A33, A34, A35, A36 | Família e arquitetura |
| 11 | A47 | Documentos defasados |

Cada lote atualiza a linha dele na tabela abaixo ao fechar.

## Registro

| Lote | Situação | Commits | Notas |
| --- | --- | --- | --- |
| 1 | Feito | `993f5a47e` | Farol acende só nos fachos e depois do final; página do Recife da ficha; carta de boas-vindas como página da sua ilha; casa, horta e píer desbotados até porta nova, primeira colheita e primeiro peixe (`sistemas/cor-da-sua-ilha.ts`, `mundo/desbotado.ts`); morador acenando na luneta; névoa na ilha fechada (shader `arq-pintura-2`); páginas extras nos quatro baús. Suíte 1.460, tipos ok, navegador: `verificar-cor-da-sua-ilha-browser.ts` (saturação da casa 0,25 → 0,40, píer 0,42 → 0,73) e `verificar-luneta-browser.ts` |
| 2 | Feito | `9570e33b2` | Mancha cinza no chão em volta de cada borrão solto, que cresce e some quando ele vira Lumi (`MANCHA_DO_BORRAO`); ninhos do Vale protegidos das três ondas de cinza do vulcão com a lanterna acesa a até 3 m (`sistemas/ondas-de-cinza.ts`), sem luz a cinza passa e dá para tentar de novo, nada se perde. Achados no caminho, já no staging: o dino da montaria estava parado em cima da trilha de pegadas (foi para 7,25; -1,5, com teste de folga) e a largada da trilha das pedras tomava a conversa da Jade (agora gira em volta da primeira pedra até ficar a 3,2 m dela). O verificador do Vale voltou a passar inteiro, no computador e no celular. Suíte 1.476, tipos ok |
| 3 | Feito | `6cd8b1d2b` | Enquanto você estava fora (`sistemas/jogo-fechado.ts`, `mundo/enquanto-fechado.tsx`): ao abrir, desde o `atualizadoEm` do salvamento, a chuva dos dias do jogo que passaram rega a horta (teto de 270 dias do jogo, 3 dias de verdade) e cada Lumi faz a rotina do QUANDO que passou, uma vez, no momento da virada e com os cartões conferidos; o painel Rotina diz "Enquanto você estava fora" (A12). Um relógio legível (A14): o relógio da HUD explica os dois tempos, a fala de regar e o "Ver quando colhe" (de fundo, não toma o Plantar/Regar/Colher) dizem quanto falta no tempo de verdade, a boa-noite não promete crescer dormindo e o pedido diz "amanhã". Selo "Humor ótimo" na HUD com a explicação e uma fala quando ele chega, no máximo a cada 10 min (A20). Verificadores: `verificar-jogo-fechado-browser.ts` novo; `verificar-clima-browser.ts` consertado (o cata-vento, a latinha e a bancada tomavam os pontos antigos). Suíte 1.490, tipos ok |
| 4 | Feito | (este lote) | Peixe com coco da Maré no lugar da moqueca (peixe, coco e limão no fogão; fome +70, energia +10), com a cesta dela trazendo os três e a feira vendendo; a moqueca de quem já tinha vira peixe com coco ao carregar (A6). Pedidos de prato do Bento (bolo de fubá com um coração, pão de queijo com dois), sorteados só com a receita sabida e entregues pela mesma conta do serviço (A22, parte dos pedidos; a venda na feira ficou no lote 4b). Prêmio-objeto do extra: `receitaDoExtra` no contrato, `extraFeito` na lista, seletor no Admin, a corrida do entregador dá a receita de brigadeiro, o Quadro mostra o prêmio e o Zappy avisa quando a receita chega; quem já sabia pelo Bento continua sabendo (A25). Geladeira completa conserva: comer direto dela vem fresquinho e sacia um quarto a mais, sem castigo para o holograma (A31). Verificador `verificar-receitas-anel-browser.ts` consertado (o total do caderno). Testes: jogo 1.499, contrato, serviço com Postgres descartável (386 + 2 com o Members), conteúdo 162; tipos do jogo, contrato, serviço e Admin |
