# Álbum de coleções e modo foto do Arquipélago (fase2-09): conferência no navegador

29/10/2026. Playground do jogo (`packages/arquipelago`, plataforma de mentira, sem banco), Chrome
sem tela com SwiftShader, pelo `playground/verificar-album-browser.ts` compilado para Node:

```sh
bun build playground/verificar-album-browser.ts --target=node --external playwright-core \
  --outfile .cache/verificar-album-browser.mjs && node .cache/verificar-album-browser.mjs
```

Rodado num worktree com o `HEAD` de staging mais só esta tarefa (na pasta principal, um arquivo
novo de outra sessão, a festa da Vila, ainda não compilava). Resultado:

```
PASS computador: álbum com as cinco seções, modo foto sem HUD, PNG de 581092 bytes, volta do HUD
PASS celular: álbum com as cinco seções, modo foto sem HUD, PNG de 295210 bytes, volta do HUD
```

## O que o roteiro confere

- O álbum abre pelo menu ("🏛️ Álbum de coleções") com as cinco seções e a conta de cada uma, as 14
  espécies de Lumi (as não encontradas em silhueta, com "Ainda não encontrado") e nenhuma rolagem
  para o lado.
- O modo foto entra pela tecla F (computador) e pelo menu (celular). Somem as necessidades, o
  relógio e o menu, a dica e a fala do Zappy, a ação perto, a mochila, o toque e o direcional.
- Com movimento reduzido, a barra entra sem animação (`animation-name: none`); sem ele, com a
  entrada de sempre.
- "Tirar foto" e "Voltar" ficam fora da metade esquerda de baixo, onde fica o direcional.
- No modo foto, W por 0,6 s não anda o personagem (menos de 5 cm), e arrastar gira a câmera.
- "Tirar foto" baixa um PNG com a assinatura de PNG, maior que zero, com o nome
  `arquipelago-AAAA-MM-DD-HHhMM.png`, e o cartão diz "Foto pronta. Ela ficou só neste aparelho.".
- Esc (computador) e "Voltar" (celular) saem, e o HUD volta (com o direcional no toque).
- Nenhum erro na página.

## Computador (1280 × 800), com um pouco de cada coleção

O roteiro grava no `localStorage` do playground um jogo com:
- 2 bichos achados;
- 2 corações com o Bento;
- 2 estrelas nas copas;
- a geladeira pintada;
- 3 espécies de Lumi.

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-album/computador-1-album.png` | O começo do álbum: "Bichos do Bosque: 2 de 4" e "Receitas: 4 de 6", com "Faltam 2." |
| `assets/2026-10-29-arquipelago-album/computador-2-album-aparencias.png` | As estrelas dos percursos (2 de 6, com o melhor tempo) e as aparências (a geladeira pintada, o forno sem aparência e os que ainda não chegaram em silhueta). |
| `assets/2026-10-29-arquipelago-album/computador-3-album-lumis.png` | Os Lumis em duas colunas: Estrelinha, Pitanga e Brigadeiro presos, com quantos; as outras 11 espécies em silhueta. |
| `assets/2026-10-29-arquipelago-album/computador-4-modo-foto.png` | O modo foto: só o cartão com a dica, "Voltar" e "Tirar foto". |
| `assets/2026-10-29-arquipelago-album/computador-5-foto-baixada.png` | O PNG baixado, sem nada do HUD. |
| `assets/2026-10-29-arquipelago-album/computador-6-foto-pronta.png` | Depois da foto: "Foto pronta. Ela ficou só neste aparelho." e "Baixar de novo". |

## Celular (390 × 844, toque, movimento reduzido), jogo novo

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-album/celular-1-album.png` | O álbum de um jogo novo: tudo por achar, com a dica de onde procurar. |
| `assets/2026-10-29-arquipelago-album/celular-2-album-aparencias.png` | As aparências, uma coluna. |
| `assets/2026-10-29-arquipelago-album/celular-3-album-lumis.png` | As 14 silhuetas dos Lumis. |
| `assets/2026-10-29-arquipelago-album/celular-4-modo-foto.png` | O modo foto no celular: o cartão e "Voltar" no alto, "Tirar foto" embaixo à direita. |
| `assets/2026-10-29-arquipelago-album/celular-5-foto-baixada.png` | O PNG baixado. |
| `assets/2026-10-29-arquipelago-album/celular-6-foto-pronta.png` | "Foto pronta" no celular. |

## O que fica para a arte

Os Lumis ainda não têm miniatura desenhada, então o álbum mostra um círculo da cor do corpo de
cada espécie, com o coração de luz. A cor é a do material `corpo` do GLB, conferida no teste. A
silhueta é o mesmo círculo apagado. Quando houver miniaturas, como as dos objetos em
`arte/casa/miniaturas.py`, elas entram no lugar do círculo.
