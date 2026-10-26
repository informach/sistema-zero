# Pirate Maker

Um editor de fases no estilo do Mario Maker, numa ilha de piratas. Você monta a fase
com o mouse (chão, água, moedas, inimigos e palmeiras), aperta Enter e joga o que
construiu. Esc volta para o editor, com tudo do jeito que estava.

## Como jogar

**No editor**

- **Botão esquerdo**: põe o item escolhido (ou arrasta o pirata, a alça do horizonte e as palmeiras).
- **Botão direito**: apaga o item escolhido da casa (ou a palmeira embaixo do mouse).
- **Arrastar com o botão do meio** ou **rodinha**: move a câmera; **Ctrl + rodinha** move na vertical.
- **Menu do canto** (4 botões: terreno, moedas, inimigos, palmeiras): clique para escolher;
  clique direito troca o item do botão; o botão do meio, nas palmeiras, alterna entre as da
  frente (você pode subir nelas) e as do fundo.
- **Setas esquerda e direita**: passam pelos itens um a um.
- **Enter**: joga a fase.

**Na fase**

- **Setas**: correm para os lados. **Espaço**: pula.
- Pegue moedas de ouro (5 pontos), de prata (1) e diamantes (20). Pegou todas as moedas
  da fase? **Fase completa!**
- Você tem 3 corações. Cada vez que os espinhos, o Dente ou uma pérola acertam o pirata,
  ele pula para trás, pisca e perde um coração. Sem corações, ou caindo para fora da
  ilha, é **fim de jogo**.
- Nos dois casos a mensagem fica na tela um pouquinho e o jogo volta para o editor, com a
  fase do jeito que estava: dá para mudar o que quiser e tentar de novo.
- **Esc**: volta ao editor a qualquer hora.

## Como o código está organizado

| Arquivo | O que tem |
| --- | --- |
| `main.py` | A classe `Main`: janela, desenhos e sons, troca entre editor e fase, e a `Transition` (o círculo que fecha e abre) |
| `editor.py` | `Editor` (grade infinita, câmera, pôr e apagar, auto-tile, céu, nuvens, prévia), `CanvasTile` e `CanvasObject` |
| `menu.py` | `Menu` e `Button`: os 4 botões do canto |
| `level.py` | `Level` (monta a fase a partir da grade do editor; corações, moedas, fim de jogo e fase completa) e `CameraGroup` (câmera, horizonte e mar) |
| `sprites.py` | `Player`, `Tooth`, `Shell`, `Pearl`, `Spikes`, `Coin`, `Particle`, `Cloud`, `Animated`, `Block`, `Generic` |
| `settings.py` | Tamanhos, cores, os itens do editor (`EDITOR_DATA`), as palmeiras, as peças do terreno, os corações e o valor das moedas |
| `support.py` | Carrega os desenhos do Pinta e escolhe a peça do terreno pelos vizinhos |
| `timer.py` | `Timer`, um cronômetro simples |

## A regra do auto-tile

Cada casa de terreno olha as 8 vizinhas e anota as que também têm terreno, com uma letra
por direção: **A** em cima, **B** em cima à direita, **C** à direita, **D** embaixo à
direita, **E** embaixo, **F** embaixo à esquerda, **G** à esquerda e **H** em cima à
esquerda (`NEIGHBOR_DIRECTIONS`). Uma casa com terreno em cima, à direita e embaixo vira
`'ACE'`.

As diagonais só mudam o desenho quando os dois lados vizinhos a elas também têm terreno:
**B** só conta com **A** e **C**, **D** com **C** e **E**, **F** com **E** e **G**, **H** com
**G** e **A** (`CORNER_SIDES`). Sem isso, a diagonal nem encosta na casa. A função
`terrain_style` de `support.py` aplica essa regra e, se não sobra nenhuma vizinha, a casa
é `'X'` (um bloquinho sozinho).

Assim sobram 47 combinações, e cada uma é uma peça do desenho `terreno`. A lista
`TERRAIN_TILES` de `settings.py` diz a ordem: a peça número 0 é `'X'`, a 1 é `'A'`, e assim
por diante. O índice da peça é a posição do nome nessa lista.

## Os desenhos do Pinta

Os desenhos estão em `assets/` e foram feitos no Pinta. Abra o painel Materiais para
editar qualquer um deles:

| Desenho | Animações ou peças | Onde aparece |
| --- | --- | --- |
| `terreno` | 47 peças de 64 px | o chão da ilha (grama, borda de tijolos de arenito e rocha) |
| `agua` | `superficie` (3 quadros), `fundo` | a água: a de cima tem ondas, a de baixo é funda |
| `pirata` | `parado` (5), `correr` (6), `pular`, `cair` | o jogador; virado para a esquerda, o jogo espelha |
| `dente` | `parado` (6), `correr` (6) | o Dente, que patrulha as plataformas |
| `concha` | `parada`, `atacar` (5) | a concha; no quadro 2 do ataque sai a pérola |
| `perola` | `parada` | a pérola que a concha cospe |
| `espinhos` | `parado` | os espinhos |
| `moedas` | `ouro` (4), `prata` (4) | as moedas girando |
| `diamante` | `brilhar` (4) | o diamante |
| `brilho` | `estourar` (3) | o brilho de quando uma moeda é pega |
| `palmeira` | `pequena`, `grande`, `esquerda`, `direita` (4 quadros cada) | as palmeiras da frente (a copa é uma plataforma) |
| `palmeira-fundo` | `pequena`, `grande`, `esquerda`, `direita` (4 quadros cada) | as palmeiras do fundo |
| `nuvem` | `formas` (3 nuvens) | as nuvens do céu |
| `cursor` | `seta`, `alca` | o ponteiro do mouse e a alça do horizonte |
| `hud` | `coracao` (cheio e vazio), `tesouro` | os corações e o contador de moedas da fase |
| `menu` | um ícone por item | os botões do menu |
| `previa` | um quadro por item | a imagem clara que aparece embaixo do mouse antes de pôr |

O jogo lê os desenhos com o módulo `pinta`: `support.import_folder('pirata', 'correr')`
devolve os quadros de uma animação e `pinta.carregar_pecas('terreno')` traz as peças. As
palmeiras, as nuvens e o cursor dividem um quadro do tamanho do maior desenho; o
`import_folder` corta cada animação de volta ao tamanho dela.

## Sons

`coin.wav`, `hit.wav`, `jump.wav`, `win.wav` (fase completa), `lose.wav` (fim de jogo), a
música do editor `Explorer.ogg` e a música da fase `SuperHero.ogg`. A da fase toca em laço.
A do editor toca em laço quando o jogo abre; ao voltar de uma fase para o editor, ela
recomeça uma vez só (`editor_music.play()` sem `loops`, como no original) e para quando
termina.

## O que foi completado

O editor é o mesmo do original. A fase do original não tinha fim: dava para correr,
pegar moedas e levar dano para sempre, sem placar. Esta versão completa o modo de jogo:

- **Corações**: o pirata começa com 3 (`HEARTS`). O dano do original (o pulo para trás e o
  pirata piscando) agora também tira um coração; enquanto ele pisca, não perde outro.
- **Moedas**: o contador no canto soma o valor de cada uma (`COIN_VALUES`: prata 1, ouro 5,
  diamante 20).
- **Fase completa**: pegar todas as moedas da fase mostra "Fase completa!" e toca uma
  fanfarra. Uma fase sem moedas é só para passear (Esc volta).
- **Fim de jogo**: perder todos os corações ou cair 800 pixels abaixo do chão mais baixo
  mostra "Fim de jogo".
- Depois da mensagem (`END_MESSAGE_DURATION`, 2,5 segundos) o jogo volta ao editor com a
  mesma fase, para a pessoa ajustar e jogar de novo. Apertar Esc mais de uma vez não
  troca de tela duas vezes.

E mais três ajustes:

- O original carregava 232 imagens de terreno, uma por combinação de vizinhos, e as que
  faltavam viravam um bloco solto. Aqui o terreno é um desenho de 47 peças e a regra das
  diagonais (acima) escolhe a peça: toda combinação tem o desenho certo.
- No original, apertar Enter sem nenhum terreno fechava o jogo com um erro. Agora a fase
  abre do mesmo jeito (o pirata cai no mar).
- Para rodar rápido no navegador, a fase só desenha o que a câmera vê e o editor copia para
  a tela só as linhas da grade. O resultado na tela é o mesmo.

## Jogar no computador

Instale o pygame-ce (`pip install -r requisitos-pygame-ce.txt`) e rode `python main.py`
dentro da pasta do jogo.
