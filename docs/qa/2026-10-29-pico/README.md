# Pico Gelado e o Floco, fase3-06

Conferência em 29/10/2026 no playground local, com a plataforma de mentira. Nenhum banco remoto
foi usado.

## Resultado

O Pico entra como ilha completa pelo ciclo de sempre, com os colisores do `pico.glb` (a trilha
cavada até o platô do cume, commit `d5fa00281`). O Floco fica no tablado do palco e apresenta-se
em duas falas, sem amizade e sem gravar no salvamento.

`playground/verificar-pico-browser.ts` (computador 1280 × 720 e celular emulado 390 × 844,
Chromium com SwiftShader, `?posicao=5`):

```
computador: chegada pela ponte
computador: de pé na frente do palco
computador: conversa abriu, avançou e fechou
computador: de pé no começo da trilha
computador: de pé no platô do cume
computador: de pé de volta, na frente do palco
computador: saiu, soltou a ilha e voltou ao palco
```

O celular passou pelos mesmos sete passos. A marca da frente do palco fica nos degraus (0,15 e
0,30), então a criança fica de pé num degrau ali.

Também: `bun test` (822 passaram, 1 ignorado que exige Postgres local), `bun run typecheck` e
`bunx biome check` nos arquivos da tarefa.

## Ajuste feito durante a conferência

A âncora `trilha-inicio` estava na altura do chão da ilha, e o chão da trilha ali já está 0,34
mais alto. Ela passou para a altura do chão da trilha (`arte/ilhas-b/pico.py`), com teste em
`tests/colisores-do-pico.test.ts`.

## Prints

[Computador, chegada](pico-computador-chegada.png), [Floco](pico-computador-floco.png),
[começo da trilha](pico-computador-trilha.png), [cume](pico-computador-cume.png).

[Celular, chegada](pico-celular-chegada.png), [Floco](pico-celular-floco.png),
[começo da trilha](pico-celular-trilha.png), [cume](pico-celular-cume.png).

## Limite da conferência

A subida inteira da trilha andando não foi feita no navegador: com a SwiftShader a cena anda a
poucos quadros por segundo. A subida é provada pela busca em grade de `colisores-do-pico.test.ts`.
Falta medir em aparelhos físicos.
