# Python Monsters

Um RPG de monstros: ande pelo mundo, converse com as pessoas, entre no mato alto para
encontrar monstros selvagens e enfrente os treinadores que ficam de olho no caminho. As
batalhas são em tempo real: cada monstro tem uma barra de iniciativa, e quem enche a barra
primeiro age primeiro. Vença, ganhe experiência, suba de nível e veja os seus monstros
evoluírem.

## Como jogar

- **Setas**: andam pelo mundo.
- **Espaço**: fala com quem está na sua frente e passa as falas do diálogo.
- **Enter**: abre e fecha o índice dos seus monstros. No índice, as setas escolhem um monstro
  e o **Espaço** marca dois monstros para trocar de lugar (os três primeiros vão para a batalha).

Na batalha, quando um dos seus monstros enche a barra de iniciativa, ele fica branco e o menu
aparece ao lado dele:

- **Setas para cima e para baixo** escolhem, **Espaço** confirma e **Esc** volta ao menu.
- **Espada**: lutar. Escolha o ataque (só aparecem os que a energia do monstro paga) e o alvo.
- **Escudo**: defender até a próxima vez dele (recebe menos dano).
- **Setas em círculo**: trocar pelo próximo monstro do time.
- **Mão**: capturar um monstro do outro lado. Só funciona se ele já perdeu mais de 10% da vida;
  senão aparece um X vermelho.

Fogo vence planta, planta vence água e água vence fogo: o ataque forte contra o elemento do
alvo causa o dobro de dano, e o fraco, a metade. A enfermeira do hospital cura o time inteiro.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Game`: carrega tudo, monta cada mapa, diálogos, transições com escurecimento, encontros no mato, fim da batalha e evolução |
| `settings.py` | Tamanho da tela, cores, camadas de desenho, posições e menu da batalha, nomes dos atributos |
| `game_data.py` | Os treinadores (monstros, falas, para onde olham), os 16 monstros e os 10 ataques |
| `monster.py` | `Monster`: atributos que crescem com o nível, energia, iniciativa e experiência |
| `entities.py` | `Player` e `Character`: andar, colidir, olhar em volta, ver o jogador e ir até ele |
| `sprites.py` | Os sprites do mundo (água animada, mato, portas) e os da batalha (monstro, contorno, nome, nível, barras, efeitos) |
| `groups.py` | `AllSprites` (a câmera) e `BattleSprites` (os contornos de quem está agindo ou sendo escolhido) |
| `battle.py` | `Battle`: menus, ataques, dano por elemento e defesa, desmaios, troca, captura e o fim da batalha |
| `dialog.py` | `DialogTree` e `DialogSprite`: as falas em balões |
| `monster_index.py` | `MonsterIndex`: a lista do time com atributos, habilidades e a troca de ordem |
| `evolution.py` | `Evolution`: o monstro fica branco, vira a evolução e as estrelas brilham |
| `timer.py` | `Timer`: um cronômetro com função e repetição |
| `support.py` | Carrega os desenhos do Pinta, os mapas e os sons; funções de barra e de "estar de frente" |

## Os mapas

São oito mapas feitos no Pinta, com o mesmo traçado do jogo original: `mundo` (86 × 86
casas), `fogo`, `planta` e `agua` (os templos dos chefes), `hospital`, `hospital-2`, `casa` e
`arena` (a arena dos campeões, nas ruínas do deserto). As peças do chão estão em quatro
conjuntos (`terreno-grama`, `terreno-areia`, `terreno-gelo` e `interior`) e cada camada de
peças usa um conjunto; o jogo desenha essas camadas com `camada.desenhar`, só as peças que
aparecem na tela.

Os objetos ficam em camadas de objetos, e o **tipo** de cada objeto diz o que ele é, com os
nomes das camadas do mapa original: `Entities` (o jogador e as pessoas), `Objects` (árvores,
pedras, casas; o nome `top` desenha na frente de tudo), `Monsters` (o mato com monstros, com o
bioma, a lista de monstros e o nível), `Coast` (as bordas da água), `Water`, `Collisions` e
`Transition` (as portas, com o mapa de destino e o ponto de chegada). O jogo pede, por
exemplo, `mapa.objetos('Water')`. Os objetos com imagem dizem qual desenho usar nas
propriedades `desenho` e `animacao`.

## Os desenhos do Pinta

Os desenhos foram feitos no Pinta, e os sprites, cenários e mapas estão em `assets/`. Abra o
painel Materiais para editar qualquer um deles.

| Desenho | Animações | Onde aparece |
| --- | --- | --- |
| `jogador`, `loira`, `chefe-fogo`, `menina-chapeu`, `menina-roxa`, `chapeu-de-palha`, `chefe-agua`, `menina`, `rapaz`, `guarda`, `campeao` | `baixo`, `esquerda`, `direita`, `cima` (4 quadros cada) | as pessoas; o primeiro quadro é o parado (`guarda` e `campeao` são da arena) |
| `plumette`, `ivieron`, `pluma`, `sparchu`, `cindrill`, `charmadillo`, `finsta`, `gulfin`, `finiette`, `atrox`, `pouch`, `draem`, `larvea`, `cleaf`, `jacana`, `friolera` | `parado` (4), `atacar` (4), `icone` | os 16 monstros, virados para a esquerda (os seus aparecem espelhados) |
| `ataques` | `explosao`, `fogo`, `verde`, `gelo`, `arranhao`, `respingo` (4 cada) | o efeito de cada ataque |
| `batalha-floresta`, `batalha-areia`, `batalha-gelo` (`-esquerda` e `-direita`) | cenário | o fundo da batalha, em duas metades |
| `botoes` | `espada`, `escudo`, `setas`, `mao` (normal e destacado) | o menu da batalha |
| `atributos` | `vida`, `energia`, `ataque`, `defesa`, `velocidade`, `recuperacao` | os ícones do índice |
| `cruz` | `cruz` | a captura que não deu certo |
| `estrelas` | `brilhar` (24) | a evolução |
| `arvores` | `verde`, `verde-cheia`, `azulada`, `azulada-cheia`, `pinheiro-nevado`, `palmeira`, `palmeira-curva` | as árvores grandes |
| `plantas-pequenas` | `arvore-verde`, `arvore-azulada`, `palmeira` | as árvores pequenas |
| `ruinas`, `portao`, `pedras` | colunas, o arco e as pedras de cada bioma | os enfeites com colisão |
| `mato` | `grama`, `gelo`, `areia` | o mato alto onde aparecem monstros |
| `predio-hospital`, `casa-verde`, `casa-roxa`, `casa-grande`, `templo-fogo`, `templo-planta`, `templo-agua` | cenário | os prédios |
| `ondas` | `ondas` (4) | a água do mar |
| `costa-grama`, `costa-areia`, `costa-ilha-grama`, `costa-ilha-areia` | um lado da costa por animação (4 quadros) | as bordas animadas da água |
| `sombra`, `aviso` | | a sombra das pessoas e o "!" de quem viu você |
| `mundo` | mapa de 86 × 86 casas | o mundo aberto, com as camadas de peças e de objetos |
| `fogo`, `planta`, `agua`, `arena` | mapas de 24 × 34 casas | os templos e a arena |
| `hospital`, `hospital-2`, `casa` | mapas de 9 × 12 casas | os interiores |

Os conjuntos de peças (`terreno-grama`, `terreno-areia`, `terreno-gelo` e `interior`, o chão
dos mapas) não têm arquivo próprio em `assets/`: eles moram em `desenhos.pinta.json`, junto
com os outros desenhos, e as peças de cada mapa vão dentro da imagem do próprio mapa. Para
mudar uma peça, edite o mapa no Pinta: as peças dele vêm junto.

O jogo lê os desenhos com o módulo `pinta`, pelas funções de `support.py`:
`pinta.carregar_sprite('jogador').animacao('baixo')`, `pinta.carregar_mapa('mundo')` e
`pinta.carregar_imagem('casa-verde')`.

## Sons

A música do mundo (`overworld.ogg`) e a da batalha (`battle.ogg`) tocam em laço; a fanfarra
`evolution.ogg` toca na evolução. `notice.ogg` toca quando um treinador vê você, e cada efeito
de ataque tem o seu som: `fire.ogg`, `green.ogg`, `ice.ogg`, `scratch.ogg`, `splash.ogg` e
`explosion.ogg`.

## O que foi completado

- **Perder a batalha.** No original, quando todos os monstros desmaiavam, o jogo fechava. Agora
  aparece a mensagem "Todos os seus monstros desmaiaram!"; com Espaço, a tela escurece e você
  acorda na porta do último hospital em que entrou (onde se entra vindo do mundo, um bom
  pedaço abaixo do balcão). A enfermeira se vira para você de lá e cura o time inteiro
  (`Battle.draw_defeat`, `Game.lose_battle` e `Game.back_to_the_nurse`).
- **A enfermeira do segundo hospital** não tinha direção nem raio no mapa original, e o jogo
  parava ao entrar no prédio. Ela ganhou os mesmos valores da outra enfermeira.
- **Menus vazios.** Escolher "lutar" sem energia para nenhum ataque, ou "trocar" sem nenhum
  monstro de reserva, fazia o jogo parar ao apertar uma seta. Agora a lista vazia não faz nada
  e Esc volta ao menu.
- **Falar de novo durante o escurecimento** abria uma segunda batalha, vazia, que contava como
  vitória contra o treinador. Agora não dá para começar uma conversa enquanto a tela escurece.
- **A arena dos campeões.** No original o mapa `arena` era uma cópia inacabada do labirinto
  da planta: sem paredes, com pessoas copiadas de outro mapa (algumas dentro das pedras), os
  treinadores `t3`, `t4` e `t6`, que não existiam nos dados, e nenhuma porta até lá. Agora ela
  é o desafio final do jogo:
  - **Como chegar:** o portão de ruínas na praia, no canto de baixo à direita do mundo (ao sul
    da casa), é a entrada. Um guarda (`Porteiro`, desenho `guarda`) fica parado no portão e só
    deixa passar quem venceu os chefes dos três templos (`fx`, `px` e `wx`); depois disso ele
    espera ao lado do portão. Quem falar com ele antes ouve o que falta.
  - **O lugar:** o mesmo labirinto, agora no deserto, com palmeiras e pedras de areia, as
    paredes do mapa da planta e a volta para o mundo ao lado do portão.
  - **Os campeões** (batalhas no fundo da praia): `t3`, o primeiro desafio, logo depois da
    entrada (Atrox 30, Gulfin 31, Pouch 31); `t4`, a Lia, no corredor de cima (Friolera 32,
    Charmadillo 34, Draem 33, Jacana 33); e `t6`, o campeão (desenho `campeao`), no centro da
    arena, ao lado da escada (Pluma 36, Charmadillo 37, Finiette 38, Cleaf 35, Jacana 36).
    Os níveis ficam acima dos chefes dos templos e cada time mistura os três elementos. Vencer
    o campeão faz de você o novo campeão da arena, e ele agradece por você ter jogado.
  - O mapa da arena não precisa de uma camada `Terrain Top` (a da planta também não tem): o
    jogo desenha as camadas de peças que o mapa tiver.
  - A palmeira que ficava metade na frente do portão andou um pouco para a direita, para a
    passagem ter a largura do portão.
- **As pessoas guardavam o jogador antigo.** No original, quem aparecia no mapa antes do ponto
  de chegada do jogador ficava ligado ao jogador do mapa anterior e nunca mais via você (por
  exemplo, ao voltar do hospital). Agora o jogador é criado primeiro.
- **Duas vezes ao mesmo tempo na batalha.** Quando dois monstros enchiam a barra no mesmo
  quadro, ou um monstro que tinha acabado de desmaiar ganhava a vez, o jogo parava com erro.
  Agora um monstro pausado espera a vez dele e um monstro desmaiado não age.

## O que mudou no código

As classes, os nomes e as regras são os do original. Mudou o seguinte:

- O carregamento: em vez de pastas de imagens, arquivos do Tiled e `pytmx`, as funções de
  `support.py` leem os desenhos e os mapas do Pinta e devolvem os mesmos dicionários de antes.
- A câmera (`AllSprites.draw`) desenha o chão com `camada.desenhar` e só os sprites que
  aparecem na tela (o original desenhava os milhares de sprites do mundo a cada quadro); a
  tela fica igual e o jogo fica bem mais leve no navegador.
- Os textos da tela estão em português, inclusive os nomes dos ataques e dos elementos.
- `match`/`case` virou `if`/`elif`, e algumas listas e dicionários montados numa linha só viraram
  laços comuns, para o código abrir em Blocos.
- A fonte é a Press Start 2P da plataforma (`PixelFont` em `support.py` deixa um espacinho
  embaixo das letras, como a fonte original, para as barras não cobrirem os números).

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
