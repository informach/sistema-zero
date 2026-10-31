# Entrega de arte de 31/10/2026: o que foi feito e como conferir

Tudo sai dos scripts de `packages/arquipelago/arte/` (e de `community-kids/scripts/room-blender/`
para os bichinhos do quarto); nenhum GLB foi editado à mão, nenhum nó, colisor, animação ou
material existente foi renomeado ou removido. Os testes leem os GLBs reais. Rodar em
`packages/arquipelago` com `bun test tests/<arquivo>`. A suíte inteira do jogo passou com toda a
arte (1675 testes, 0 falhas) e o typecheck está limpo.

O código do jogo que usa as peças novas (trocar o clipe dos bichinhos, ligar o cipó e o mergulho
na sua ilha, a cinza que empurra, a tela dos minijogos, o segundo andar e a cabana no Pico no
Construir, o catálogo das versões da galeria, do café, das festas e dos fósseis) ainda NÃO faz
parte desta entrega.

## Pedidos já feitos antes (E04)

| Peça | Commit | Aceite |
| --- | --- | --- |
| Clareira do iglu no Pico: 6 × 6 m plana (x 7 a 12, z 3 a 8), `lote-cabana-a/-b`, sem colisor até 3 m, caminho de 1,5 m | e21e85e44 | `cabana.test.ts`, bloco "o lote do iglu no Pico" |
| Segundo andar: pisos de cima (topo 4,10, forro embaixo), escada interna de 14 degraus com âncoras `escada-1-*`, vão com guarda-corpo, guarda-corpo da beira (`casa-andar.glb`) | 33fd43662 | `casa-andar.test.ts` (a cápsula real sobe a escada andando e no modo escada) e `faces-coplanares` |
| Chão do lote para moldar o terreno: nó `chao-do-lote` (lote grande, x -17 a 16, z -15 a 12), emendado vértice por vértice | 9d565bdc2 | `chao-do-lote.test.ts` (nó, emenda, altura igual a `alturaDaIlha`, nada dentro) |
| Subida por fora do Farol: escada, duas quinas, viga de equilíbrio, corrente de ar até o mirante, `subida-farol-*`, `vagalume-farol-*` | 9d565bdc2 | `subida-do-farol.test.ts` (no molde da subida ao cume) |

Decisão: a escada interna colide como rampa de 45,7°; com uma caixa por degrau a cápsula parava
no primeiro degrau (o piso de 0,286 é estreito para o degrau automático).

## Pedido de 31/10

| Item | Commit | Aceite |
| --- | --- | --- |
| 1. Cachorro e gato andam (0,6 s) e correm (0,4 s), iguais nas duas comunidades, o parado continua | 533f5cd12 | `pets-andam-sem-escorregar.test.ts` (durações, laço, pé no chão escorrega menos de 3,1% a 1,5 e 3,5 m/s) |
| 2. Silhuetas: uma malha por ilha, até 3 mil triângulos, cor por vértice, mesma altura e largura da completa | d9765afb1 | `silhuetas-das-ilhas.test.ts` |
| 2b. Marcos de altura (Vila 12,15; Recife 9,10; Pico 18,20; Vale 19,75; Nuvens 24,06 m com os 7 m) | e21e85e44, 51a77b14b | `marcos-das-ilhas.test.ts`, `vale-alto-e-segredo.test.ts` |
| 3. Barraca do minijogo na Vila e quiosque do festival no Pico (`tela` 0,8 × 0,6 com UV, âncora `jogar`) | e21e85e44 | `brinquedos-de-minijogo.test.ts` |
| 4. Café e banca de feira (`casa-cafe.glb`, 7 peças com miniatura) | 33fd43662 | `casa-cafe-e-festas.test.ts` |
| 5. Seis fósseis (no Vale e itens do museu) e ícones de fósseis e de quatro pegadas | 51a77b14b | `fosseis-e-plantas-do-ceu.test.ts` |
| 6a. Jardim do céu nas Nuvens (terraço 6,4 × 6,4, `canteiro-ceu-1..6`, caminho de 1,5 m) | e21e85e44 | `jardim-do-ceu.test.ts` |
| 6b. Plantas do céu (três espécies, broto, meio e flor com brilho leve, sementes e ícones) | 51a77b14b | `fosseis-e-plantas-do-ceu.test.ts` |
| 6c. Florada da sua ilha (três níveis, 24 `ponto-florada-*`) | 9d565bdc2 | `florada.test.ts` |
| 7. Versões retro (paleta "Doces" do Pinta, para a Faísca) e moderna dos nove objetos da galeria, com miniaturas | fd2e26129, 03de0b719 | `galeria-variantes.test.ts`, `faces-dos-objetos.test.ts`, `miniaturas.test.ts` |
| 8. Decoração de festa (`casa-festas.glb`, 11 peças com miniatura, o que acende tem emissão) | 33fd43662 | `casa-cafe-e-festas.test.ts` |
| 9. Segredos: cipó (sua ilha), patins (Bosque), mergulho (gruta sob o píer), montaria (cinza quente no Vale), balão (nuvem a 13 m) | 9d565bdc2, e21e85e44, 51a77b14b | `segredos-da-ilha.test.ts`, `segredo-dos-patins.test.ts`, `vale-alto-e-segredo.test.ts`, `jardim-do-ceu.test.ts` |
| Atalhos da Vila: prancha da casinha 1 para a 3 e escada de caixotes até a casinha 2 | e21e85e44 | `atalhos-dos-telhados.test.ts` |

## Limites conhecidos (para a dona decidir)

- Bichinhos: no jogo o pet anda a 2,2 m/s e corre a 5,4 m/s; o código vai precisar acelerar o
  clipe na proporção (ou baixar as velocidades) para os pés não escorregarem.
- Segredo dos patins (ajustado em f19a37450): o toco ficou 0,45 m acima da pista, e o vão de 3,80 m
  só se vence de patins (a pé não chega mais). O planador ainda chega saindo da pista, do deque da
  T3 e da ponte ao lado; nenhuma altura impede, porque ele abre no alto do mesmo pulo. Aceito pela
  dona em 31/10: o planador vem do Pico, depois dos patins da Vila, e o jogo não trava o planador
  perto do toco. `segredo-dos-patins.test.ts` reprova se aparecer outro lugar de onde ele chegue.
- Retro da geladeira, do forno e do aquário: as faces do Pinta têm tamanho fixo, então o
  arredondado vem dos acessórios; nos outros seis a forma mudou de fato.
- Segundo andar (resolvido depois): `piso-andar-vao-parede` (em `casa-andar.glb`) é o vão sem o
  guarda-corpo do lado comprido +x, para encostar na parede, e `casa-paredes-andar.glb` traz as
  paredes do andar (lambri e lisa, `<nome>-andar`) sem alicerce, com uma cinta branca na emenda.
  Aceite em `casa-andar.test.ts` (a cápsula sobe com a parede ao lado; sala montada sem faces
  coplanares nem emendas em T; sem fresta na linha do piso). Folga: entre a parede e o guarda-corpo
  do outro lado a cápsula passa com cerca de 1 cm de cada lado; subindo torto, ela encosta e
  desliza na parede.
- Silhuetas: com 3 mil triângulos somem as peças miúdas (tábuas, cercas, escorregador); a água e
  o gelo ficam opacos; o navio e a caverna (arquivos separados) não entram.
- Recife: o mastro do navio não foi feito (o navio é outro arquivo); os pináculos sozinhos já
  levam o Recife a 9,1 m.
- A subida do Farol e a gruta já desenham e colidem; o código vai escondê-las até a Lenda e até o
  mergulho ser ligado.
- O iglu do Pico depende do contrato (`ILHAS_COM_CABANA` só tem o Bosque) e do código.
