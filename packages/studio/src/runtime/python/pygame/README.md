# Pygame-ce no Estúdio

`python-pygame@1.0.0` roda o **pygame-ce 2.5.7 de verdade** no navegador: o wheel do Pyodide
314.0.7 (`pygame_ce-2.5.7-cp314-cp314-pyemscripten_2026_0_wasm32.whl`, fixado em
`vendor-manifest.json` e em `contract.ts`). Surface, blit, transform, mask, font, sprite, draw,
Rect, FRect, Vector2 e o resto são os do pygame-ce. A exportação para o computador usa a mesma
versão (`requisitos-pygame-ce.txt` com `pygame-ce==2.5.7`).

A extensão ocupa a tela do jogo e não se combina com Turtle ou Pygame Zero no mesmo projeto.

## Como roda

O Python roda no worker protegido. O pygame-ce desenha em software, na memória, como no
computador; a cada `display.flip()`/`update()` o vídeo do SDL (driver emscripten) copia a tela
para um canvas falso do worker (`sdlScreen.ts`), e os pixels RGBA vão para o frame pelo mesmo
transporte do Pygame Zero (`_sz.present`, registro `PIXELS` + anexo `PGZERO_PIXELS_ATTACHMENT`),
onde o renderizador os pinta. Uma tela que não tem o tamanho da janela (ou um quadro sem tela) para o
jogo com um erro que diz os dois tamanhos (`takeScreenPixels`), em vez de a página repetir a
imagem anterior esticada. O ritmo é o do Pygame Zero: um quadro por pintura da tela (60 por
segundo). Medido no Chrome com um mapa de peças cobrindo 1280×720, 160 peças e 60 sprites com
transparência, `rotozoom` e texto por quadro: 60 fps (`e2e-runtime/python-pygame-performance.spec.ts`).

A ponte `py/_szpygame/` troca só o que encosta no navegador:

| Parte | O que a ponte faz |
| --- | --- |
| `display.flip/update` | mostra a tela e espera a próxima pintura (é o relógio do jogo) |
| `display.set_mode` | a janela é a superfície do jogo; `SCALED`, `FULLSCREEN` e `RESIZABLE` são ignorados (a página já ajusta a tela ao espaço, com os pixels nítidos); `OPENGL` é recusado |
| teclado e mouse | o estado (`key.get_pressed`, `mouse.get_pos`…) e os eventos (`KEYDOWN`, `TEXTINPUT`, `MOUSEWHEEL`…) chegam do navegador a cada quadro; como no pygame-ce, `key.get_just_pressed()`/`get_just_released()` e os do mouse contam o que chegou até o último `event.get`/`poll`/`wait`/`pump` (um quadro que só espera, como o de `Clock.tick`, não apaga um toque) |
| `time.Clock`, `set_timer`, `delay`, `wait`, `event.wait` | seguem os quadros do navegador (sem threads e sem laço de espera, que travaria a página); `event.wait()` sem janela explica o erro em vez de esperar para sempre |
| `pygame.mixer` | `Sound`, `Channel` e `music` tocam pelo serviço de mídia do Estúdio (WAV, OGG, MP3 do projeto); canal pausado continua ocupado, como no SDL_mixer |
| `mouse.set_cursor` com imagem | o cursor é desenhado na tela e o do sistema some |
| objetivos | os sprites em jogo (`pygame.sprite.Sprite` com `rect`) são observáveis: os que estão num grupo e os que nunca entraram em um (um jogador desenhado com `blit`); quem saiu de todos os grupos (`kill`, `remove`) não conta |

Não existem no navegador: joystick, OpenGL, tela cheia, `display.message_box` (o erro pede para
mostrar a mensagem na tela do jogo) e arquivos fora do projeto. Um projeto com o próprio
`pygame.py` fica com ele (a ponte não é instalada).

### O som pela fila de áudio

A fila de áudio do Estúdio toca cada arquivo do começo, inteiro, e para na hora. Por isso:

- `fadeout` e `fade_ms` (em `Sound.play`, `Channel.play` e `music.play`) param ou começam sem
  transição;
- `maxtime` de `Sound.play`/`Channel.play` e `start` de `music.play` são aceitos e não aplicados
  (o som toca do começo e até o fim); `music.set_pos` avisa que não está disponível;
- `music.rewind()` recomeça a música com os mesmos `loops` do `play` (o SDL guardaria só as
  repetições que faltavam), mantém a fila (`music.queue`) e a pausa;
- `Sound.get_length()` lê a duração do cabeçalho: WAV, OGG (Vorbis e Opus) e MP3 (MPEG-1, 2 e
  2.5, camadas I a III; com o quadro Xing/Info de um arquivo VBR, pela contagem de quadros; sem
  ele, pela taxa do primeiro quadro);
- `mixer.stop/pause/unpause` mandam um comando só para todos os canais.

O carregador de bibliotecas do emscripten avalia como JavaScript os trechos EM_ASM do SDL que
vêm no `.so` do pygame-ce, e a CSP do worker não permite `eval`: o build compila exatamente esses
trechos (`approved-js-snippets.json`, gravados por `scripts/python/record-pygame-js-snippets.mjs`)
dentro do `pyodide.asm.mjs` (`scripts/python/approved-eval.ts`). Qualquer outro trecho é recusado.

## O módulo `pinta`

Todo desenho de um jogo é feito no Pinta. Sprites, peças e mapas chegam ao projeto como PNG em
`assets/`, com os dados do Pinta dentro do arquivo (bloco `iTXt` `pinta`). `py/pinta.py` lê esses
dados e corta as imagens com o pygame-ce:

```python
import pinta
heroi = pinta.carregar_sprite('heroi')          # animações: heroi.animacao('correr')
mapa = pinta.carregar_mapa('fase-1')            # camadas de peças e de objetos
for x, y, imagem in mapa.camada('Terreno').tiles():
    ...
fonte = pinta.fonte('bungee', 40)               # fontes da plataforma (OFL), em py/fontes/
```

A exportação copia `pinta.py` e `fontes/` para junto do jogo, então o mesmo código roda no
computador.

## Verificação

- `scripts/python/test-pygame-bridge.py` e `scripts/python/test-pinta-module.py` (pygame-ce
  nativo, SDL dummy): a ponte e o módulo `pinta`.
- `scripts/python/approved-eval.test.ts`: só os trechos gravados viram código; qualquer outro texto
  é `EvalError`. `pygame/contract.test.ts` trava a mesma wheel (arquivo, bytes, sha) no contrato,
  no `vendor-manifest.json` e na tabela de trechos; a promoção do runtime
  (`studio-runtime/scripts/python-promotion-plan.ts`) recusa outra wheel.
- `scripts/python/pygame-playtest.py`: joga um jogo da galeria quadro a quadro com roteiro de
  teclas, pelo mesmo caminho da ponte, e guarda quadros e sons.
- `e2e-runtime/python-pygame.spec.ts` e `python-pygame-performance.spec.ts` (Chrome, worker
  protegido de verdade; ver `playwright.python-pygame.config.ts`).
