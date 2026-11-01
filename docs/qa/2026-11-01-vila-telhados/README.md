# A corrida do entregador pelos telhados (01/11/2026)

Lacunas L11d. O quadro 6 da Vila Doce (o minijogo da ficha, atração `corrida-do-entregador`) segue o
exemplo da proposta: telhados, chaminés e o bolo dourado que vale o dobro. Arte nova em imagens
(`docs/desafios-do-jogo/vila-doce/projetos.ts`: `TELHADOS`, `CHAMINE_SVG`, `BOLO`).

Prints de `docs/desafios-do-jogo/vila-doce/conferir-corrida-browser.ts` (Chrome, teclado no
computador e toque no celular emulado): a abertura, o pulo logo depois da largada, a primeira chaminé
chegando (`corrida-chamine-*`) e o fim, quando a chaminé alcança o entregador ("Uma chaminé parou o
entregador.", com os metros). `PASS` nos dois tamanhos.

Executor real (`packages/studio-runtime/tests/vila-doce-browser.test.ts`): o gabarito da corrida passa
("acelera": a velocidade vai a -6 ou menos) e o inicial reprova (fica em -5). Inventário de repertório:
nenhum tipo sem fonte na trilha (publicação pedida).
