# Rotina dos Lumis (fase2-07): conferência no navegador

29/10/2026. Playground do jogo (`packages/arquipelago`, plataforma de mentira, sem banco), Chrome
sem tela com SwiftShader, pelo `playground/verificar-rotina-browser.ts` compilado para Node:

```sh
bun build playground/verificar-rotina-browser.ts --target=node --external playwright-core \
  --outfile .cache/verificar-rotina-browser.mjs && node .cache/verificar-rotina-browser.mjs
```

O playground abre com `?lumis=quindim:1&cartas=todas` (o Quindim preso e todos os cartões, a
visão da equipe). O roteiro grava antes, no `localStorage` do playground, um jogo fora de casa,
perto da horta, com uma semente de alface sem água no primeiro canteiro.

```
PASS computador: rotina montada, motivo sem castigo, Lumi regou o canteiro 1
PASS celular: rotina montada, motivo sem castigo, Lumi regou o canteiro 1
```

## O que o roteiro confere

1. O painel abre pelo caderno ("Montar a rotina de um Lumi"), com o Quindim já escolhido.
2. Monta "Quando amanhecer, Voar até a horta, Para cada [Regar]". Com o Para cada vazio, o painel
   diz "Ponha pelo menos um cartão dentro do Para cada.". Depois diz "Pronta para testar.", e o
   painel não rola para o lado.
3. Com um "Guardar tudo" dentro do Para cada, o "Testar" mostra o motivo: "No teste, a rotina
   pararia: Para guardar tudo, o Lumi precisa estar na geladeira. Ponha um Voar até a geladeira
   antes.". O Lumi não sai e nada muda no jogo. O cartão sai pelo "Tirar Guardar tudo".
4. "Guardar" diz "Rotina guardada. O Lumi faz sozinho quando o dia nascer.".
5. "Testar" fecha o painel. O aviso "Rotina do Quindim: ..." aparece com "Parar", e o Quindim
   aparece na horta (o medidor mostra `lumiDaRotina`).
6. O aviso não cobre o direcional, nem o relógio, as necessidades ou Viver e Construir.
7. O aviso passa por "regando o canteiro" e some no fim.
8. No salvamento guardado:
   - o primeiro canteiro tem `regadoEm`;
   - `rotinas.quindim` é `quando-amanhecer`, `voar-ate` e `para-cada`.
9. Reaberto, o painel mostra "Da última vez, a rotina foi até o fim", com "Regou o canteiro 1.".
10. Nenhum erro na página.

## Prints

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-rotina/computador-1-rotina-montada.png` | O painel no computador: o Quindim, a rotina com o Para cada aberto ("Os cartões novos entram aqui") e os 14 cartões da mão. |
| `assets/2026-10-29-arquipelago-rotina/computador-2-motivo.png` | O motivo de uma rotina que pararia no meio, no lugar do "Pronta para testar.". |
| `assets/2026-10-29-arquipelago-rotina/computador-3-lumi-regando.png` | O Quindim no primeiro canteiro, com o aviso "Rotina do Quindim: regando o canteiro 1" e "Parar" no alto à direita. |
| `assets/2026-10-29-arquipelago-rotina/computador-4-ultima-vez.png` | A última vez no painel, passo a passo, e "A rotina do Quindim terminou." do Zappy. |
| `assets/2026-10-29-arquipelago-rotina/celular-1-rotina-montada.png` | O painel no celular (390 × 844). |
| `assets/2026-10-29-arquipelago-rotina/celular-2-motivo.png` | O motivo no celular. |
| `assets/2026-10-29-arquipelago-rotina/celular-3-lumi-regando.png` | O aviso abaixo de Viver e Construir, longe do direcional e de Pular e Usar. |
| `assets/2026-10-29-arquipelago-rotina/celular-4-ultima-vez.png` | A última vez no celular. |

## O que o navegador não conferiu

- **A rotina pelo QUANDO** (a noite chegando ou indo embora). A virada é testada como regra pura
  (`quandoDaVirada` e `rotinasDoQuando`, `tests/rotina.test.ts`). No navegador, seria preciso
  esperar a noite do jogo, que dura minutos com o SwiftShader.
- **"Ensinar a rotina" perto de um Lumi da Vila.** Ele abre o mesmo painel, e é um interativo de
  fundo (nunca toma o E do borrão).
- **Colher e Guardar tudo.** Estão nos testes puros: o exemplo da proposta com o Quindim colhe a
  alface madura e guarda 2 na geladeira, e o que não cabe fica na mochila.
