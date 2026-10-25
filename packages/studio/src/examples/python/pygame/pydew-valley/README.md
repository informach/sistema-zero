# PyDew Valley

Uma fazendinha para cuidar: prepare a terra com a enxada, plante milho e tomate,
regue todo dia e durma para as plantas crescerem. Corte árvores para ganhar madeira
e maçãs e venda a colheita para o comerciante, que também vende sementes.

## Como jogar

- **Setas**: andam pela fazenda.
- **Espaço**: usa a ferramenta escolhida (enxada, machado ou regador).
- **Q**: troca de ferramenta.
- **Ctrl esquerdo**: planta a semente escolhida na terra preparada.
- **E**: troca de semente (milho ou tomate).
- **Enter**: perto da cama, dorme até o dia seguinte; perto do comerciante, abre a loja.
- Na loja: **setas** escolhem, **Espaço** vende (madeira, maçã, milho, tomate) ou
  compra sementes, e **Esc** fecha.

A enxada só prepara a terra boa para plantar: o campo grande em volta da casa. Uma
planta só cresce na noite em que a terra dela estava molhada: regue de manhã ou torça
por chuva, que às vezes cai e rega tudo. Regar duas vezes no mesmo dia guarda água
para a noite seguinte. Quando a planta fica madura, basta encostar nela para colher.
Uma árvore cai depois de cinco machadadas e vira um toco; a cada golpe uma maçã pode
cair. O céu escurece aos poucos durante o dia, e dormir traz um dia novo: a terra
seca, as maçãs voltam e a chuva é sorteada outra vez.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | Abre a janela e roda o laço do jogo |
| `settings.py` | Os números e nomes que dá para mudar: camadas de desenho, inventário inicial, preços, crescimento, desenhos do Pinta |
| `farm.py` | `Farm`: monta o mundo a partir dos mapas, roda cada quadro, usa as ferramentas e começa cada dia; `Camera`: desenha o que está em volta do fazendeiro |
| `farmer.py` | `Farmer`: teclas, andar, colisões, ferramentas, sementes e o que ele carrega |
| `field.py` | `Field`: as casas cavadas, molhadas e plantadas; `Plant`: o milho e o tomate |
| `tree.py` | `Tree`: a árvore, as maçãs e o toco |
| `things.py` | Os sprites simples: `Thing` (qualquer coisa no mapa), `Decoration`, `Water` e `Flash` |
| `weather.py` | `Sky` (o dia que escurece), `Rain` e `Drop` |
| `shop.py` | `Shop`: a loja do comerciante |
| `hud.py` | `Hud` (ícones da ferramenta e da semente) e `SleepFade` (a tela escurece e clareia ao dormir) |
| `timer.py` | `Timer`: espera um tempo e chama uma função |
| `art.py` | Traz os desenhos do Pinta (`frames` e `image`) |

O caminho de um quadro: `main.py` chama `farm.run(dt)`, que desenha o mapa pela
câmera, atualiza todos os sprites (o fazendeiro lê as teclas no `update` dele), colhe
o que ele encostou, desenha os ícones, a chuva e o céu, e por fim o escurecer do sono.

## Os desenhos do Pinta

Os desenhos foram feitos no Pinta, e os sprites, peças e mapas estão em `assets/`. Abra o
painel Materiais para editar qualquer um deles:

| Desenho | O que tem | Onde aparece |
| --- | --- | --- |
| `fazendeiro` | `andar-cima`, `andar-baixo`, `andar-esquerda`, `andar-direita` (4 quadros cada) e `parado-*` (2 quadros, respirando) | o fazendeiro andando e parado |
| `fazendeiro-ferramentas` | `enxada-*`, `machado-*` e `regador-*` nas quatro direções (2 quadros cada) | o fazendeiro usando as ferramentas |
| `mercador` | `parado` | o comerciante, ao lado da barraca |
| `arvores` | `grande`, `pequena`, `toco-grande`, `toco-pequeno` e `maca` | as árvores, os tocos e as maçãs |
| `enfeites` | `girassol`, `arbusto`, `flor`, `cogumelo` e `cogumelos` | as plantas do mapa |
| `plantas` | `milho` e `tomate` (4 fases cada, da semente à planta madura) | o que cresce na terra |
| `agua` | `ondas` (4 quadros) | o lago e a lagoa |
| `chuva` | `gotas` e `respingos` (3 de cada) | a chuva |
| `icones` | `enxada`, `machado`, `regador`, `milho` e `tomate` | a ferramenta e a semente escolhidas |
| `solo` | 16 peças | a terra preparada, uma peça para cada jeito de encostar nas vizinhas (`SOIL_PIECES` em `settings.py`) |
| `solo-molhado` | 3 peças | a terra molhada |
| `fazenda` | mapa 50 × 40 com as camadas `Água`, `Chão`, `Grama`, `Enfeites`, `Morros`, `Cerca`, `Colisão` e `Cultivável` (peças `terreno`, `caminhos-e-cerca` e `marcas`) | o chão, os morros, a cerca e as marcas invisíveis |
| `casa-e-objetos` | mapa 50 × 40 com `Piso da casa`, `Móveis de baixo`, `Paredes`, `Móveis de cima` (peças `casa`) e as camadas de objetos `Árvores`, `Enfeites`, `Jogador` e `Objetos` | a casa, as árvores, as plantas, onde o jogo começa, a cama e o comerciante |

Os conjuntos de peças dos mapas (`terreno`, `caminhos-e-cerca`, `marcas` e `casa`) não
têm arquivo próprio em `assets/`: eles moram em `desenhos.pinta.json`, junto com os
outros desenhos, e as peças de cada mapa vão dentro da imagem do próprio mapa
(`fazenda.png` e `casa-e-objetos.png`). Para mudar uma peça, edite o mapa no Pinta: as
peças dele vêm junto.

O jogo lê os desenhos com o módulo `pinta`: `pinta.carregar_mapa('fazenda')` traz o
mapa com as camadas, `camada('Cerca').tiles()` dá cada peça com a sua casa, e os
objetos da camada `Árvores` trazem a propriedade `imagem` dizendo qual desenho usar.
As camadas `Água`, `Colisão` e `Cultivável` ficam escondidas: são marcas que o código
lê para saber onde há água, onde não se passa e onde a enxada funciona.

## Sons

`hoe.wav` (enxada), `axe.wav` (machado), `water.wav` (regador), `plant.wav` (plantar),
`success.wav` (pegar alguma coisa) e a música `music.ogg`, que toca o dia inteiro.

## O que foi completado e o que mudou

O jogo nasceu de um porte do tutorial PyDew Valley e depois teve o código reescrito
pelo Sistema Zero, com a nossa organização: na tela e nos controles ele é o mesmo
jogo. O que mudou no código:

- A terra guarda as casas cavadas, molhadas e plantadas em conjuntos e num dicionário
  (`dug`, `planted` e `water`), no lugar de uma grade de letras. A peça de cada casa
  cavada sai de uma tabela (`SOIL_PIECES`) em vez de dezesseis `if`.
- O fazendeiro guarda para onde olha (`facing`) e o que faz (`action`) separados, no
  lugar de um texto como `'down_idle'`. Ele pede as ações à fazenda (`farm.use_tool`),
  e a fazenda decide o que a enxada, o machado e o regador fazem no mundo.
- A cama e o comerciante são só retângulos lidos do mapa. Os sons de cada coisa
  ficam carregados uma vez só, e cada mapa é lido uma vez só.
- Ao cavar, as peças antigas da terra saem do jogo antes de as novas entrarem (antes
  elas se acumulavam por baixo; a imagem na tela é a mesma).
- O chão é desenhado pelas camadas de peças do mapa, e a câmera só desenha o que
  aparece na tela.
- Na loja, apertar uma seta e o Espaço no mesmo instante agora vende ou compra a linha
  que fica marcada. Antes a compra ia para uma linha que ainda não existia: vendia um
  tomate ao subir da primeira linha e fechava o jogo com erro ao descer da última.
- A loja mostra os nomes em português (`ITEM_NAMES` em `settings.py`) e usa a fonte
  Fredoka da plataforma.

## Ideias para mudar

- Mude `GROW_SPEED` em `settings.py` para as plantas crescerem mais rápido.
- Mude `SALE_PRICES` e `PURCHASE_PRICES` para a loja pagar e cobrar outros valores.
- Mude `START_ITEMS`, `START_SEEDS` e `START_MONEY` para começar com mais coisas.
- Em `farm.py`, troque o `> 7` de `will_it_rain` para chover mais ou menos.
- Abra o mapa `casa-e-objetos` no Pinta e mude as árvores de lugar.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
