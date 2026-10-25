# Estudo da pasta Pygame-ce e implementação no Estúdio

> Revisão de 25/10/2026. A primeira versão (24/10) usava um adaptador escrito à mão e jogos
> resumidos num `main.py` cada. Esta descreve a reconstrução: o pygame-ce real no worker,
> todo o material feito no Pinta e os nove jogos completos.

## Acervo examinado

Origem: `C:\Users\julio\Downloads\Pygame-ce-20261024T234949Z-1-001\Pygame-ce`.
O acervo tem 353 arquivos Python, 1.982 PNG, 149 arquivos de áudio, 31 mapas
TMX e cinco PDFs. A pasta `5 games` traz cinco jogos feitos em etapas, e as
outras quatro pastas são projetos independentes. Cada exemplo parte da **última
etapa** do jogo, somando nove jogos finais.

| Jogo | Código de referência |
| --- | --- |
| Pong | `5 games/Pong/Pong 3 saving/code` |
| Space Shooter | `5 games/Space shooter/space 10 finishing up/code` |
| Platformer | `5 games/Platformer/Platform 4 finish/code` |
| Monster Battle | `5 games/Monster Battle/Monster 5 finish/code` |
| Vampire Survivor | `5 games/Vampire survivor/Vampire 7 finish/code` |
| Pirate Maker | `PirateMaker-main/28_finish` |
| PyDew Valley | `PyDew-Valley-main/s23 - Audio & fixes/s23 - Audio & fixes/code` |
| Python Monsters | `Python-Monsters-main/code (finish)` |
| Super Pirate World | `Super-Pirate-World-main/code_complete` |

Os PDFs (*Making Games With Python & Pygame*, *Learning Python by Building
Games*, *Creating Video Games Using PyGame*, *Python Game Development* e
`cs-pro-P`) dão contexto didático. Quem define o contrato é o código final dos
nove jogos.

## Decisões

1. **Motor:** o pygame-ce 2.5.7 de verdade, a wheel que o Pyodide 314 já
   distribui. Não há adaptador escrito à mão.
2. **Material:** todo desenho, peça e mapa é um documento do Pinta. Ninguém
   cria arte fora da plataforma, então não existe TMX: os mapas são tilemaps do
   Pinta, ampliados com camada de objetos e um tileset por camada.
3. **Arte e som:** refeitos do zero, sem nenhum pixel nem amostra dos
   originais. A arte é desenhada em 32 px e importada com escala x2, o que
   mantém as medidas e a tela 1280×720 dos originais.
4. **Fidelidade:** o comportamento é o dos originais. O código pode ficar mais
   simples (`match` virou `if/elif`, `@property` virou `property(...)`), e o
   que os originais deixaram inacabado foi completado e registrado no README de
   cada jogo.
5. **Paleta:** as categorias descrevem o conteúdo. Nenhuma se chama "Pinta":
   sprites, animações e mapas ficam em "Sprites, animações e mapas".

## Motor (`src/runtime/python/pygame/`)

- A wheel `pygame_ce-2.5.7-cp314` entra na distribuição Python
  (`vendor-manifest.json`, `build-python-runtime.ts`, `python-promotion-plan.ts`)
  e é desempacotada no worker protegido com `unpackArchive`, sem CDN nem micropip.
- O SDL desenha com o driver emscripten num canvas falso
  (`sdlScreen.ts`: `createImageData`/`putImageData`). Cada quadro sai como o
  opcode `PIXELS` mais o anexo `20_000`, e o renderizador do frame pinta um
  `ImageBitmap`.
- O SDL avalia trechos de JavaScript com `eval`, que a CSP do worker proíbe. O
  build substitui esse `eval` por uma tabela de 17 trechos aprovados
  (`scripts/python/approved-eval.ts`, `approved-js-snippets.json`).
- A ponte `_szpygame` só troca o que fala com o host:
  - `display.flip/update` entregam o quadro;
  - a fila de eventos, o teclado e o mouse leem o estado vindo do host;
  - `Clock.tick`, `set_timer`, `delay` e `wait` seguem os quadros do host;
  - o mixer vai para a fila de áudio que já existia;
  - o cursor fica no cabeçalho do quadro;
  - nas missões, os `Sprite` são rastreados para `missionPose`.
- O módulo `pinta` (Python puro sobre o pygame) lê os dados do Pinta gravados
  no PNG (chunk `iTXt` `pinta`):
  - `carregar_sprite` traz as animações, `quadro`, `fps` e `caixa`;
  - `carregar_mapa` traz camadas de peças (`tiles`, `solidos`, `plataformas` e
    `desenhar`, que recorta pela câmera) e camadas de objetos com propriedades;
  - também há `carregar_pecas`, `carregar_imagem`, `fonte` e `ler_dados`.
- Quatro fontes OFL acompanham a extensão: Bungee, Press Start 2P, Nunito e
  Fredoka.
- **Exportação:** leva o código, `assets/`, `pinta.py`, as fontes e
  `requisitos-pygame-ce.txt` com `pygame-ce==2.5.7`, a mesma versão do
  navegador. A ponte `_szpygame` não é exportada.
- **Desempenho:** o teste `python-pygame-performance.spec.ts` (Chromium, 1280×720)
  mede pelo menos 45 fps. Na medição de 24/10 deu 60 fps.

## Pinta e galeria

- O Pinta ganhou camadas de objetos (ponto e retângulo, com até 16
  propriedades), um tileset por camada e até 8 camadas por mapa.
- No Estúdio, as receitas `pintaImage` agora incluem `spritesheet`, `tileset`
  e `map`. Elas geram o PNG com os dados do Pinta, que o jogo lê pelo nome.
- "Editar no Pinta" funciona nos desenhos da galeria: na primeira edição, o
  desenho é copiado para a galeria pessoal da criança, com a marca `sourceRef`
  de onde veio. Cada desenho de exemplo tem **uma cópia só** por criança: outro
  mapa sobre o mesmo tileset, ou o próprio tileset depois do mapa, reaproveitam
  a cópia, e pintar uma peça atualiza o tileset e todo mapa ligado. A aba nasce
  no próprio clique, por causa do bloqueio de popup do Safari no iPad.
- **Arte:** os documentos do Pinta são desenhados por código em
  `packages/pinta/scripts/pygame-gallery/games/<jogo>.ts`, saneados por
  `sanitizePintaAsset` e gravados como PNG com paleta (no máximo 63 cores por
  desenho, um byte por pixel; ~37% menores que RGBA, pixels idênticos) mais
  `desenhos.pinta.json`. Para regerar: `bun scripts/pygame-gallery/generate.ts
  [--check]`.
- **Som:** é sintetizado por código em
  `scripts/python/pygame-gallery-audio/<jogo>.ts`. O nome do arquivo decide o
  formato: `.wav` sai como renderizado, `.ogg` passa pelo ffmpeg.
- **Empacotamento:** `scripts/generate-pygame-games.ts` cria, por jogo, um
  pacote com o código e a mídia (baixado ao abrir o jogo) e outro com os
  documentos do Pinta (baixado só no "Editar no Pinta"). O Python Monsters
  abre com 0,98 MB (eram 4,2 MB). `check:pygame-games` roda no CI.
- **Blocos:** `scripts/python/pygame-block-coverage.ts` projeta cada `.py` e
  exige zero nó opaco e volta idêntica. Ele grava os ids de bloco de cada jogo
  em `pygameGames.blocks.generated.ts`.

## Paleta de blocos

São cerca de 90 blocos de pygame em 13 categorias: Janela e laço, Eventos e
tempo, Teclado e mouse, Sprites, animações e mapas, Superfícies e imagens,
Transformar, Desenho, Retângulos, Vetores, Grupos e colisões, Máscaras, Texto e
Som e música.

Para os nove jogos abrirem inteiros em Blocos, a paleta de Programação ganhou:
- `*args`/`**kwargs`;
- decoradores;
- `match`/`case` com todos os padrões;
- compreensões com vários `for`/`if` (de conjunto, de dicionário e geradores);
- operações de bits;
- literais de até 512 itens;
- `from módulo import *` dos módulos do próprio projeto.

A análise de nomes passou a separar nomes de módulo (`pygame.image.load`) de
métodos de objeto. Assim, `self.image = …` num Sprite não desliga mais os
blocos de pygame do arquivo.

## Os nove jogos

Todos ficam na galeria em Blocos e em Código, com os mesmos módulos, classes e
regras do original.

| Jogo | Tipos de bloco | O que foi completado |
| --- | --- | --- |
| Pong | 64 | Meta de pontos, vitória e revanche; placar gravado a cada ponto |
| Space Shooter | 78 | Fim de rodada com recorde e reinício, no lugar de fechar a janela; música |
| Platformer | 87 | Dano (estava desligado), corações, bandeira de chegada, telas de início e fim, música |
| Monster Battle | 88 | Tela de início; fim de batalha com recorde e reinício, no lugar de fechar; menus e ataques em português |
| Pirate Maker | 113 | Corações, contagem de moedas, fase completa e fim de jogo; terreno com auto-tile de 47 peças |
| Vampire Survivor | 104 | Vida e dano (estavam comentados), fim com tempo e abates, reinício, música |
| PyDew Valley | 96 | Código reescrito pelo Sistema Zero, mais simples, com o mesmo jogo (ver abaixo) |
| Python Monsters | 111 | A derrota leva ao hospital (antes fechava); a arena ganhou portão, guarda e três campeões; erros do original corrigidos |
| Super Pirate World | 122 | Fases liberadas em sequência, telas de título, fim e vitória; a fase 4 voltou a ser vencível |

As diferenças vêm dos limites do Pinta e estão em cada README:
- quadro de até 128 px (256 no jogo);
- cenário de até 512 px, por isso os fundos grandes viraram mapas de peças ou
  metades;
- até 64 peças por tileset;
- até 8 camadas por mapa: os objetos guardam a camada original no tipo, e o
  mapa grande do PyDew virou dois.

**PyDew Valley reescrito.** A cópia examinada não trazia licença, então o código
foi reescrito do nosso jeito (12 módulos novos: `farm`, `farmer`, `field`,
`tree`, `weather`, `shop`, `hud`…), com o mesmo jogo. Prova: seis roteiros
nativos, 37.026 quadros idênticos pixel a pixel aos da versão anterior e os 121
sons na mesma ordem. A única diferença é de propósito: seta e Espaço no mesmo
quadro da loja agora agem na linha marcada (o original vendia o item errado ou
parava com `IndexError`). O NOTICE diz que o jogo é inspirado no tutorial da
Clear Code.

**Arena do Python Monsters.** No original ela não tinha porta, nem os
treinadores `t3`, `t4` e `t6`. O portão de ruínas da praia virou a entrada, com
um guarda que só libera depois dos três templos. Lá dentro há três campeões com
níveis acima dos chefes e times que misturam fogo, planta e água; vencer o
último encerra o jogo. Os roteiros também acharam e corrigiram dois erros do
original: os treinadores deixavam de ver o jogador depois de uma troca de mapa,
e dois monstros com a barra cheia no mesmo quadro travavam a batalha.

## Verificação

- **Roteiros nativos** (pygame-ce 2.5.7 com SDL simulado e relógio virtual,
  `scripts/python/pygame-playtest.py`): cada jogo foi jogado do início ao fim,
  passando por vitória, derrota e reinício, sem exceções. O roteiro do Super
  Pirate World tem 8.150 quadros e passa pelas seis fases.
- **Testes do repositório:**
  - galeria: 18 entradas, dados do Pinta em cada desenho, sons e blocos;
  - exportação;
  - módulo `pinta` e ponte `_szpygame` (testes nativos);
  - protocolo do renderizador;
  - blocos;
  - e2e no Chromium e desempenho.
- Ainda não houve uma sessão exploratória com jogador humano. A liberação para
  contas reais depende da qualificação da distribuição Python e da autorização
  da extensão pelo host.

## Pontos em aberto

- **PyDew Valley:** o código é nosso, mas o jogo e o nome seguem o tutorial.
  Para publicação comercial sem dúvida, vale uma consulta jurídica e talvez um
  nome próprio para o jogo.
- **Fonte Bungee:** só tem maiúsculas.
