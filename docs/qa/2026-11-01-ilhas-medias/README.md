# As ilhas em três versões: a média vista da ponte (01/11/2026)

Lacunas L10 (código) e L11b (arte). Prints de `packages/arquipelago/playground/verificar-ilhas-medias-browser.ts`,
playground com a plataforma falsa (`?novo=1&posicao=8&qualidade=leve`), Chrome sem tela, 1280 × 800.

Em cada uma das seis pontes do anel:

1. no meio da ponte (42 m do centro da ilha) só a versão média está na memória (`ilhasMedias` 1,
   `ilhasCompletas` 0), e é ela que aparece no print;
2. no fim da ponte (33,5 m, antes da troca a 30 m) a completa baixa e a média continua;
3. de volta à ilha central, as duas saem da memória.

Resultado: `PASS: seis pontes, a média antes da completa, e as duas soltas na volta`, sem erro na
página. As ilhas aparecem cinza porque o jogo novo ainda não tem quadros feitos (a tinta da ilha vale
para a média também).

| Ilha | Completa (triângulos) | Média (triângulos) | Média (KB) |
| --- | --- | --- | --- |
| Bosque | 34.300 | 15.667 | 489 |
| Vila Doce | 35.430 | 12.331 | 519 |
| Recife | 29.041 | 12.805 | 447 |
| Pico | 33.440 | 12.559 | 545 |
| Vale dos Dinos | 25.498 | 8.012 | 297 |
| Nuvens | 34.348 | 13.922 | 400 |
