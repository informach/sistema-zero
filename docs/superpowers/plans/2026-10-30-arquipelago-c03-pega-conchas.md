# C03a: Pega-conchas, os desafios da sua ilha (30/10/2026)

Lote do levantamento de 30/10 (`docs/arquipelago-levantamento-2026-10-30.md`, seção 7). A proposta
põe o minijogo Pega-conchas no posto Faísca, na sua ilha. A régua de conteúdo é a da Jornada
(`docs/desafios-do-jogo/conteudo-por-posto.md`): evento, ação, informação verdadeira ou falsa,
se/senão e posição; ao aplicar, coletar uma vez, lembrar, decidir com e sem o objeto e reiniciar.
Não pressupor contadores complexos, grupos, prazo, inimigos ou câmera.

## O que entra

1. **Conteúdo** em `docs/desafios-do-jogo/sua-ilha/`, Kids e adulto com a mesma lógica:
   - Quadro 1, "Passos na areia": o laço move o guia com as setas (evento e ação).
   - Quadro 2, "A primeira concha": no contato, guardar `temConcha` e tirar a concha da areia.
   - Quadro 3, "O balde do Nico": entregar só com a concha; sem ela, o Senão marca `pediu`.
   - Quadro 4, "A concha rosa": duas conchas, só a rosa vale para o Nico (decidir com e sem o objeto).
   - Quadro 5, "A maré volta": Enter reinicia a praia (o objetivo é o reinício).
   - Quadro 6, "Pega-conchas": três conchas, cada uma uma vez, o balde só enche com as três;
     entrega a atração `pega-conchas` (o minijogo no fliperama).
   - Só blocos das fontes da trilha do Faísca (`desafio-primeiro-jogo`, `o-jardim-secreto`).
   - `cor: false`: a sua ilha já tem cor. O cavalete acende as manchas dos quadros feitos.
   - `publicar: true` só se todas as fontes estiverem na trilha (regra do C01b); a importação é
     da dona.
2. **Jogo:** o cavalete do Quadro das Cores na praia da sua ilha, perto do Nico, montado pela
   `IlhaCentral`. `QuadroDasCores` passa a receber o lugar pronto (`lugar`), e as ilhas do anel
   continuam calculando pela chegada da ponte. O lugar é testado contra os colisores da ilha
   central (chão livre e caminho a pé).
3. **Inventário:** `repertorio-local.*` passa a incluir a sua ilha (posto 1).

## Fora deste recorte

- Projeto autoral depois do Farol (C03b): precisa de critérios explícitos verificáveis pelo
  executor sem cobrar uma resposta pronta; fica para o próximo recorte.
- Prova no executor real (`studio-runtime/tests/sua-ilha-browser.test.ts`) roda sozinha, depois
  do C02, pela regra de uma coisa pesada por vez.

## Verificação

- `bun test docs/desafios-do-jogo/sua-ilha` (estrutura, fontes, iniciais diferentes do gabarito).
- Executor real com gabarito passando e negativos falhando.
- `bun test` dirigido no jogo (lugar do cavalete) e Biome dos arquivos tocados.
