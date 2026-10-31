# Desafios da Vila Doce

A Vila Doce é a ilha do Inventor. Desde a revisão de 31/10/2026 (A15), os nove desafios são a
**corrida do entregador** feita com o repertório do curso Corre, Dino!: o entregador do Bento é o
dinossauro do Jogo 2D, as pedras são os obstáculos do mesmo kit e o fundo é a rua da Vila. Cada
quadro deixa uma parte do jogo para completar, na ordem das aulas do curso.

Importe `vila-doce.manifesto.json` em Jogo → Desafios → Manifesto de desafios. Formato
`arquipelago-desafios`, versão 1, escopo `ilha`. `vila-doce-adulto.manifesto.json` traz o mesmo
conteúdo para o adulto. Os dois são gerados por `bun gerar-manifesto.ts` a partir de
`projetos.ts` (os projetos) e `objetivos.ts` (as regras).

| Desafio | Tipo | Quadro | O que a criança completa | Curso |
| --- | --- | --- | --- | --- |
| O entregador pula | Quadro das Cores | 1 | Gravidade e pulo só no chão | aula 3 |
| Pedras na rua | Quadro das Cores | 2 | Pedras que nascem num relógio e andam para a esquerda | aulas 5 e 6 |
| Começar e recomeçar | Quadro das Cores | 3 | Uma tecla começa na abertura e recomeça no fim | aulas 7 a 9 |
| A batida | Quadro das Cores | 4 | A batida leva ao fim, com a área justa (50% a 95%) | aulas 9 e 10 |
| Cada pedra num lugar | Quadro das Cores | 5 | Lugar e tamanho sorteados, com limites | aula 12 |
| A corrida do entregador | Quadro das Cores | 6 | Cada pedra mais rápida e o fim mostra os metros (a ficha da proposta; o teto, que é da missão, não é critério) | aula 13 |
| Pedras maiores | Desafio do dia | Nenhum | Um pulo mais forte, de 12 a 16 | aula 3 |
| Pombos na praça | Desafio do dia | Nenhum | O obstáculo sorteado, com pombos que pedem abaixar | aula 5 |
| Quem não vê a tela | Desafio do dia | Nenhum | A descrição do palco com o objetivo e os três controles | aula 13 |

Os enunciados são pedidos do Bento: dizem o que ele precisa, não o bloco a usar (A44). Os seis
quadros pintam a Vila; o quadro 6 é o minijogo da ficha (atração `corrida-do-entregador`) e o
extra dele dá a receita de brigadeiro (A25). Cada desafio tem um extra opcional: som no pulo,
efeitos da batida ou os metros na tela de fim. O extra do quadro 6 segue a proposta ("★ Desafio
extra: um bolo dourado que vale o dobro", lacunas de 01/11/2026): um bolo dourado passa pela rua
(pronto no cenário) e a criança completa o encontro do entregador com ele, que soma 2 metros de
uma vez (o dobro de um segundo de corrida) e leva o bolo de volta ao começo. Os telhados e as
chaminés da ficha são arte 2D, pedida no lote de arte.

Todos pedem publicação (`publicar: true`, §6.28 item 1): todo bloco tem fonte nos cursos até o
Inventor e resolve no nível `iniciante-2d` (por isso a corrida não usa o bloco de conta nem o de
juntar textos). A barreira C01a continua no serviço, na importação.

## Provas

- `vila-doce.test.ts`: o JSON corresponde à fonte, a IR é válida, todo bloco é do nível do
  Inventor, os objetivos cabem no executor, e cada regra de estrutura passa no gabarito e reprova
  no inicial.
- `../publicacao.test.ts` e `../projetos-validos.test.ts`: fontes na trilha e documentos aceitos
  pelo leitor do Members.
- `packages/studio/src/blockly/__tests__/vilaDoceManifest.test.ts`: os dezoito projetos abrem
  como blocos e geram o mesmo jogo.
- `packages/studio-runtime/tests/vila-doce-browser.test.ts` (com `SZ_CHECK_CHROMIUM`): o executor
  real aprova os gabaritos e reprova os iniciais e as mutações (sem o controle do pulo, sem o
  recomeço, pedra parada). Os desafios só com regras de estrutura (pombos e descrição) não rodam
  ali.
- `conferir-corrida-browser.ts` (com `SZ_CHECK_CHROMIUM`): a corrida no computador e no celular
  emulado, com teclado e toque reais, e os prints em
  `docs/qa/2026-10-31-revisao-dos-lotes/vila-corrida/`.

Os quadros de antes (o forno, a caixa de pães, o suco, o doce que esfria, as bandejas e a corrida
em quatro direções) saíram nesta revisão; o histórico deles está em
`docs/qa/2026-10-29-quadros-vila/` e `docs/qa/2026-10-30-vila-repertorio/`.
