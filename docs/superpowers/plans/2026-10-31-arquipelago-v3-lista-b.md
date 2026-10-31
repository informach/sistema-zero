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
| B3 | B4, B5, B6 | Os fósseis do Vale, os ícones do álbum, o jardim do céu e a ilha que floresce (juntos: uma V22 só) |
| B5 | B11 | Os segredos dos outros movimentos e o que vem nos baús |
| B6 | B13 (A41) | Os atalhos pelos telhados da Vila |
| B7 | B14 | O iglu no Pico, o segundo andar, moldar o terreno e a subida do Farol |
| B8 | B12, B16 | Os Lumis de luz e as roupas de festa, quando a arte chegar |

## Registro

| Lote | Situação | Commit | Notas |
| --- | --- | --- | --- |
| B1 | Feito | `5bc1073c3` | Pet andando (B3): o gato e o cachorro que acompanham tocam `andar` e `correr` no ritmo da velocidade (`ritmoDoPasso`; o clipe foi feito para 1,5 e 3,5 m/s), parados tocam o parado do quarto (o menos movimento desliga) e a pausa congela; o `RoomGlbModel` ganhou o `passo` opcional (o quarto da plataforma não muda). Silhuetas e marcos (B1 e B2): a arte já carrega pelo código de sempre (um nó por ilha, colisores `col-*` dos marcos lidos do GLB), sem mudança de código. Barraca e quiosque (B10): o serviço diz a ilha do minijogo (`ilha` opcional na lista, pela ilha publicada do desafio), a tela mostra a capa do mais recente da ilha e a âncora `jogar` abre a lista dos minijogos da ilha. Café e banca (B7) e decoração de festa (B9): 18 móveis novos no fim de `MOVEIS` (o salvamento não muda de tamanho), abas "Café e feira" (com a Vila Doce aberta) e "Festa" (só durante a festa, com as peças dela); fora da festa a decoração fica guardada sem aparecer nem colidir, e o que acende brilha à noite. Implantar o member-shell antes do serviço (a lista dos minijogos da família é estrita lá). Testes: jogo 1793 (1 pulado de antes), contrato 240, serviço com Postgres 406 (sem pulados), avatar-quarto; tipagem do jogo, contrato, serviço, avatar-quarto e member-shell; verificadores `verificar-brinquedos-browser.ts` (novo, computador e celular), `verificar-moveis-browser.ts` (com o café e a festa) e `verificar-companhia-browser.ts` |
| B2 | Feito | `2c53a1bf8` | Galeria com três aparências por objeto (B8): a clássica, a retrô (paleta "Doces" do Pinta, a da Faísca) e a moderna, 18 entradas novas no fim de `IDS_DA_GALERIA` com o preço da clássica e `modelo` `retro` ou `moderna`; a posse é `arquipelago:<id>` (só do jogo, o quarto da plataforma não ganha). O painel do objeto mostra um cartão por aparência, a feira mostra as 27 (três de destaque por semana) com a miniatura de cada uma, e o objeto completo abre o GLB da versão (`modeloComAparencia`). Os textos do cartão deixaram de usar artigo ("Pronto, comprado: Forno moderno."). Implantar o Members antes do serviço (ele confere o id da aparência no pedido). Testes: jogo 1796 (1 pulado de antes), contrato 240, serviço com Postgres 406, Members com banco (inventário 10); tipagem do jogo, contrato, serviço e Members; verificador `verificar-feira-browser.ts` (compra a geladeira retrô) no computador e no celular |
| B3 | Feito | `2974f931b` | Salvamento V22: `vale.fosseis` (um bit por fóssil), `florada` (flores do céu mandadas para a sua ilha) e `ceu` (os seis canteiros do jardim do céu em tuplas [canteiro, planta, minuto]; não entra na `horta`, cujos 24 lugares podem estar todos no quintal). Fósseis (B4): depois do primeiro osso, a escavação do Vale mostra um fóssil novo por dia a contar do dia do museu (quem demora não perde: eles esperam um de cada vez); achado, vai para a vitrine do museu de casa (seis lugares em cima da vitrine, nas três versões) e para o painel do museu. Ícones (B5): seções "Fósseis do museu" e "Pegadas" no álbum (rex pelo rastro do Vale, tricerátopo pelo filhote crescido, capivara pela conversa com a Capi, pássaro pela visita às Nuvens). Jardim do céu (B6): plantar abre a escolha das três plantas (a chuva das nuvens rega), a flor aberta colhida soma na florada, e a sua ilha floresce nos níveis 1, 2 e 3 com 1, 6 e 15 flores (24 pontos do `florada.glb`). Folga do pior caso: 64.364 bytes no contrato (piso 1.100) e uns 186 bytes no jogo com o catálogo a 999 (pisos de 250 baixados para 150): os Lumis de luz (B12) vão pedir compactar antes. Testes: jogo (suíte inteira, mais `fosseis-jardim-e-florada.test.ts`), contrato 242 (com `salvamento-v22` e `jardim-do-ceu`), serviço com Postgres 406; tipagem do jogo, contrato e serviço; verificador `verificar-fosseis-e-jardim-browser.ts` no computador e no celular |
| Menu | Feito | `344013def` | Pedido da dona: diário, álbum, caderno, mapa, moradores em casa e visitas abrem dentro do menu de pausa, no estilo dele, com a lista à vista e a barra de rolagem sólida (`JanelaDoPainel`, `PAINEIS_DO_MENU`, `secaoDoMenu`). Verificador `verificar-menu-browser.ts` |
| B5 | Feito | `0cc0ef0f8` | Segredos dos outros movimentos (B11): cinco baús da Íris com página extra, bits 16 a 256 de `segredos` (sem mudar o salvamento). Cipó na sua ilha (`segredos-da-ilha.glb`, o cipó balança depois do Bosque visitado), mergulho na gruta do píer (área de mergulho própria, depois do Recife visitado; o baú abre nadando), patins no Bosque, montaria no Vale (a cinza quente empurra a 7 m/s quem vai a pé, `empurroes` no movimento; montado nada empurra) e balão nas Nuvens. O álbum conta nove segredos e o diário nove páginas extras. A subida por fora do Farol (arte de 31/10) fica escondida e sem colisão até o B7. Testes: jogo 1813 (1 pulado de antes), `segredos-dos-movimentos.test.ts`; tipagem do jogo; verificador `verificar-segredos-dos-movimentos-browser.ts` no computador e no celular |
| B6 | Feito | `fd581f131` | Atalhos dos telhados (A41/B13): a prancha da casinha 1 para a 3 e a escada de caixotes até a casinha 2 já valem pela colisão da arte, e a entrega não é em ordem, então por eles se chega mais rápido e os confeitos do caminho pulado ficam para trás. Ao lado de cada atalho, "Olhar o atalho" explica. A arte não trouxe as âncoras `telhados-atalho-1`/`-2` do pedido: o lugar sai dos colisores `col-prancha-1` e `col-escada-caixote-1`. Testes: `corrida-pelos-atalhos.test.ts` (a corrida chega pelos dois atalhos) e os da entrega; tipagem do jogo. Sem verificador de navegador próprio (a geometria é a da arte, conferida pelo `atalhos-dos-telhados.test.ts`) |
| B8 | Feito | (este lote) | Lumis de luz (B12): sete espécies no fim de `LUMIS` (sem versão nova), sem contador no salvamento: ter o Lumi é ter aberto o baú dele (`lumis-de-luz.ts`, `temOLumi`, `BIT_DO_LUMI_DE_LUZ`; a régua das rotinas e `lumis` conferem). Baús: os quatro do vento, a montaria e o balão dão o da ilha; o Cristal de Luz fica na gruta do píer (o Pico não tem baú). Moram com a família (primeiro lugar), ganham rotina, seção própria no álbum; o mapa dos modelos dos Lumis virou um só (`mundo/modelos-dos-lumis.ts`). Pior caso do salvamento: 63.821 bytes. Roupas das festas (B16): oito peças nos catálogos do avatar (apresentação e Members, pagas como as da amizade) e `conquista` no vestuário de cada festa; as peças antigas seguem como sugestões. Testes: jogo 1999 (1 pulado de antes), contrato 257, serviço com Postgres 415, members 31, catálogo do avatar 13, member-shell 2; tipagem do jogo, contrato, serviço e member-shell |
