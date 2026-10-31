# Arquipélago: as lacunas do levantamento de 31/10

Origem: [levantamento de 31/10](../../arquipelago-levantamento-proposta-v3-2026-10-31.md). A dona
pediu em 01/11/2026: "Resolva e implemente as lacunas". Quando a proposta e uma decisão registrada
divergem, vale a proposta.

Decisões da dona (01/11/2026):

- **Desfazer:**
  - quadros que dão cor (§7.11.1 e A43);
  - ilhas e Íris (N15, §6.27 e §6.28.13);
  - casa (§6.16.2a e objetos com função só no térreo);
  - cartões dos Lumis por bloco (27/10) e publicação dentro da imagem do serviço (A11).
- **Entram os desafios 3D;** os cursos-base da Jornada ficam para a produção de cursos.
- **O que pede arte nova** vira pedido para a sessão com Blender.
- **O teto do salvamento sobe para 80 KB.**

Cada lote segue o mesmo caminho:

- ramo `arquipelago/lacunas-<lote>`;
- testes dirigidos, Biome e revisão do diff;
- commit e merge `--no-ff` no `staging` local.

## Registro

| Lote | Situação | Commit | Notas |
| --- | --- | --- | --- |
| L1 | Feito | `9147f387d` (merge `6d2d8a3b6`) | O cenário cheio deixava de fora a horta com os 24 canteiros, os bichos, a posição, as necessidades com dízima e as pontes vistas. Com eles, o pior caso dava 67.588 bytes, acima dos 64 KB. `SALVAMENTO_MAX_BYTES` foi para 80 KB; o corpo da chamada já vai até 96 KB no gateway, no BFF e no serviço. Folga medida: 14,3 KB com o catálogo a 999. Testes: contratos 264 e salvamento do jogo |
| L2a | Feito | merge `bd37187d9` | Subida do Farol. A largada pede o planador (`exige` na `ConfigDoPercurso`, conferido na largada e antes do "Correr de novo", sem o corte à toa). Sem ele, o Zappy diz que o último trecho é o vento, que o Floco dá o planador no festival do Pico e que a escada de dentro leva à sala. A varanda tem a própria entrada "Entrar na sala do alto" (o mesmo `entrar` da porta de baixo). No resultado, o botão só aparece com a chegada e recebe o foco. Testes: `subida-do-farol-no-jogo` (planador e demais percursos sem exigência), `subida-do-farol` e `final-do-farol` (27). Tipagem do jogo ok. Navegador (`verificar-subida-ate-o-final-browser.ts`, computador e celular emulado): sem planador não começa; com ele, foco em Entrar, Continuar fecha e a varanda leva à sala do alto (y 41,1) |
| L2b | Feito | merge `de0e2acab` | **Lumis da praia:** Estrelinha e Búzio não ficam mais fixos na areia (`HabitantesDaPraia` saiu da cena); aparecem só depois de presos, pelos `BorroesDaIlha` da sua ilha. **Mapa:** nas ilhas do anel, o quadrado vai até o alcance real (`alcanceNoRumo`, o `raioDaEsperaDaIlha`): Bosque 27, Vila 20, Recife 24, Pico 28, Vale 20, Nuvens 26. Uma parte é de terra se algum ponto dela está no chão. A grade continua 8 × 8, sem bytes novos. **Cochilo:** com a energia no zero, espera o painel e a ação em andamento (`podeCochilar`), cochila no lugar (véu "Cochilando" com Zzz, comandos pausados) e acorda em casa com 60 depois de 4 s. Testes: suíte do jogo 2026 passando (1 pulado de antes); tipagem ok. Navegador: `verificar-cochilo-browser.ts` (novo), computador e celular, cochilou na praia e acordou em casa |
| L2c | Feito | merge `8ba0ed6f1` | Os borrões desbotam em volta: o shader `mundo/cinza-dos-borroes.ts` (até quatro borrões, 15% da cor no meio, volta até 4,56 m, crescendo com a mancha) encadeado na tinta das ilhas do anel e ligado ao chão, enfeites, árvores, píer e casa da sua ilha; preso, some. O medidor mede a cor que sobra no lugar de cada borrão. O `verificar-borroes-browser.ts` estava quebrado desde os borrões em todas as ilhas (contava os da sua ilha como da Vila; rodava pelo bun, que no Windows não abre o Chrome): conta só os da Vila e roda compilado para node. Prova: `tests/cinza-dos-borroes.test.ts` (4) e o navegador (Vila de noite, 49% de cor em volta dos dois, um preso vira Quindim); tipagem ok |
| L2d | Feito | (este lote) | A Íris só pelas páginas (desfaz §6.27): a cena `iris` da abertura virou o Farol de pé ao lado da casa com a ilha colorida (`capturar-abertura.ts`, imagem nova regravada do jogo, 36 KB), e a placa da ponte perdeu a assinatura (`recadoDaPlaca`, rótulo "Ler a placa da ponte", no Kids e no adulto). O `verificar-luneta-browser.ts` (de 28/10) não pulava as cenas de chegada das pontes e travava: agora pula e passou nos postos 1, 2 e 8. Testes: abertura 14, luneta e pele do jogo 19 |
