# A montaria do Vale (fase4-04)

Data: 29/10/2026. Regras e textos em `docs/arquipelago-regras.md`, seção da fase4-04.

## O que entrou

- **Regras puras** (`src/sistemas/montaria.ts`): `MONTARIA` (escala, sela, velocidades, pulo,
  colisor de montada, alcance), `MONTARIA_NO_VALE` (o lugar dele no referencial do GLB),
  `podeMontar` (os três ninhos), `MontariaViva` e as falas.
- **Modo `montar`** (`src/sistemas/modos/montar.ts`, em `MODOS` e `ModoDoCorpo`): entra pelo pedido
  `montar` do interativo (`montar`), leva o corpo pelo controlador do chão com o passo e o pulo do
  dino, para na beira da água e no limite do Vale e sai pelo E / Usar (`desmontar`). `mudarModo` solta a sela por
  qualquer saída (descer, teleporte, a ilha que sai), deixando o dino parado onde estava.
- **Personagem**: montada, o controlador mede o caminho com uma cápsula maior presa ao mesmo corpo
  (`GRUPO_DE_NINGUEM`: não encosta em nada, só o controlador a usa); o desenho da criança sobe até
  a sela no clipe "Sentar"; os colisores do próprio corpo nunca o seguram.
- **No mundo** (`src/mundo/montaria-do-vale.tsx`, montado pelo `ValeVivo`): registra a montaria em
  `movimento.montaria`, o "Montar no dino", o desenho (embaixo da criança montada, ou parado) com
  os clipes por velocidade e o pulo, e o colisor do dino parado (só depois que a criança se afasta).
- **HUD**: "Andar", "Pular" e "Descer do dino" enquanto monta.

## Decisões

- Liberada pelos três ninhos (o dino confia em quem cuidou dos ovos), sem salvamento novo.
- Cápsula de pé em vez de uma caixa que gira com o dino: girar o colisor no controlador do Rapier
  pode prender o corpo numa parede. A cabeça e a cauda passam um pouco das bordas; o Vale é aberto
  em volta do lugar dele.
- O dino não nada: a água para o passo, sem tirar da sela. Também não sai do Vale
  (`RAIO_DA_MONTARIA`, 10,8 m do meio da ilha): na primeira conferência no navegador, andando para
  a frente, ele atravessou a ponte até a ilha central.
- Escala 0,85 (era 0,7 no primeiro desenho): menor, a criança parecia maior que o dino.
- Descer com um pulinho para o lado (o embalo do modo chão): descendo no lugar, a criança ficava
  dentro do corpo do dino parado.

## Conferência

- `bun test`, `tsc` e `biome`. Navegador: `playground/verificar-montaria-browser.ts` (montar, andar
  pelo controle, pular e descer, no computador e no celular emulado).
