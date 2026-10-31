# Lista B da revisão da proposta v3 (31/10/2026)

Liga no jogo a arte entregue em 31/10/2026 (`docs/plans/2026-10-31-arquipelago-entrega-de-arte.md`)
para os achados da lista B do levantamento `docs/arquipelago-levantamento-proposta-v3-2026-10-30.md`
(seções 9 e 10), com as decisões de `docs/arquipelago-regras.md` §6.28. A dona pediu em
31/10/2026: "agora implemente a lista que depende de arte. Confira se vieram todas as artes ou se
falta alguma coisa."

## O que chegou da arte

Todas as peças pedidas para B1 a B11, B13 e B14 chegaram, com os testes de aceite passando aqui
(286 testes nos 19 arquivos da entrega). Diferenças da entrega, todas de forma, sem mudar o que se
pediu:

- a barraca do jogo e o quiosque do festival ficam nos GLBs das ilhas (`vila-doce.glb`, `pico.glb`),
  com a `tela` e a âncora `jogar` soltas ao lado do nó, e não nos `*-props.glb`;
- as versões da galeria se chamam `-retro` e `-moderna` (o pedido dizia `-moderno`);
- o mastro do navio do Recife não foi feito (os pináculos já levam o Recife aos 9 m).

Não pedidos em 30/10 e revistos em 31/10/2026: B12 (Lumis de luz) e B16 (roupas de festa) foram
pedidos à arte; a bolsa do Nico (B15) já existia no `nico.glb`.

## Lotes

| Lote | Itens | Área |
| --- | --- | --- |
| B1 | B3, B1, B2, B10, B7, B9 | O pet andando, as silhuetas e os marcos, a barraca e o quiosque do minijogo, o café e a decoração de festa |
| B2 | B8 | As versões retro e moderna da galeria |
| B3 | B4, B5 | Os fósseis do Vale e os ícones do álbum |
| B4 | B6 | O jardim do céu e a ilha que floresce |
| B5 | B11 | Os segredos dos outros movimentos e o que vem nos baús |
| B6 | B13 (A41) | Os atalhos pelos telhados da Vila |
| B7 | B14 | O iglu no Pico, o segundo andar, moldar o terreno e a subida do Farol |
| B8 | B12, B16 | Os Lumis de luz e as roupas de festa, quando a arte chegar |

## Registro

| Lote | Situação | Commit | Notas |
| --- | --- | --- | --- |
| B1 | Feito | (este lote) | Pet andando (B3): o gato e o cachorro que acompanham tocam `andar` e `correr` no ritmo da velocidade (`ritmoDoPasso`; o clipe foi feito para 1,5 e 3,5 m/s), parados tocam o parado do quarto (o menos movimento desliga) e a pausa congela; o `RoomGlbModel` ganhou o `passo` opcional (o quarto da plataforma não muda). Silhuetas e marcos (B1 e B2): a arte já carrega pelo código de sempre (um nó por ilha, colisores `col-*` dos marcos lidos do GLB), sem mudança de código. Barraca e quiosque (B10): o serviço diz a ilha do minijogo (`ilha` opcional na lista, pela ilha publicada do desafio), a tela mostra a capa do mais recente da ilha e a âncora `jogar` abre a lista dos minijogos da ilha. Café e banca (B7) e decoração de festa (B9): 18 móveis novos no fim de `MOVEIS` (o salvamento não muda de tamanho), abas "Café e feira" (com a Vila Doce aberta) e "Festa" (só durante a festa, com as peças dela); fora da festa a decoração fica guardada sem aparecer nem colidir, e o que acende brilha à noite. Implantar o member-shell antes do serviço (a lista dos minijogos da família é estrita lá). Testes: jogo 1793 (1 pulado de antes), contrato 240, serviço com Postgres 406 (sem pulados), avatar-quarto; tipagem do jogo, contrato, serviço, avatar-quarto e member-shell; verificadores `verificar-brinquedos-browser.ts` (novo, computador e celular), `verificar-moveis-browser.ts` (com o café e a festa) e `verificar-companhia-browser.ts` |
