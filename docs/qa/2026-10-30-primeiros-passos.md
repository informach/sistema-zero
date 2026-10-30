# Arquipélago: primeiros passos com o Zappy e dicas de primeira vez (30/10/2026)

Implementação da proposta "Primeiros passos com o Zappy"
(https://claude.ai/artifact/X1GNotDTxZpdJsNG5QvhW8) e do conserto da HUD no Construir. Prints em
`2026-10-30-primeiros-passos/`.

## O que entrou

- **Os primeiros passos:** 6 capítulos e 23 falas (oi; andar, olhar e pular; a porta nova; plantar,
  regar e a planta crescendo; barrinhas, mochila, menu e mapa; colher, a geladeira, a obra e o fim).
  Cada tarefa só passa com o jogo mudando de verdade; feito, aparece "Isso. Feito." e a próxima
  chega. O que o jogo já tem vira lembrete ("Você já fez isso."). O texto e a tecla desenhada mudam
  com o teclado, o toque ou o controle.
- **O cartão do Zappy:** o rosto do próprio modelo (recorte da última cena da abertura), os seis
  pontinhos dos capítulos, a tarefa com a tecla, o X (44 px) e "Pular o tutorial" com confirmação
  no cartão. Enter também fecha. Não toma o foco. A fala solta do jogo entra no cartão por cima.
- **O X numa fala com tarefa** recolhe a fala e a tarefa vira a primeira linha do Agora, com o
  rosto do Zappy; tocar nela abre a fala de novo. A linha toma o lugar da do primeiro pedido.
- **O Zappy mostra o lugar:** voa até a porta, o canteiro, a casa e a geladeira, com o facho
  dourado e o anel no chão; no "andar", um círculo de luz. Na HUD, um anel acende na parte que a
  fala mostra (barrinhas, mochila, menu, aviso de usar, Pular no toque, Construir, Parede, Porta,
  Objetos, Pronto e o mapa do menu).
- **O fim:** o cartão "O que você já sabe" por cima do jogo parado; fecha com o X da fala.
- **Pular, continuar e rever:** no menu, em Início, o cartão "Primeiros passos" (capítulo,
  Continuar, Começar de novo ou Rever) e as dicas já vistas; no Diário, "Rever os primeiros passos".
- **As dicas de primeira vez:** Quadro das Cores (e o desafio de hoje no painel), barco (e a
  chegada), lanterna, primeiro borrão, primeiro Lumi e primeira noite. Uma vez por perfil no
  aparelho, verde-água, com "1 de 2" e "Desligar as dicas"; religam em Conforto e controles.
- **O conserto da HUD:** no Construir, o "Agora" sai e o cartão do Zappy vai para o lugar dele (ele
  cobria o Agora e encostava no cartão de quem joga).

## Ajustes técnicos em relação ao canvas (avisar a dona)

- **A obra ganhou uma fala (23 em vez de 22).** A frente da porta nova é a varanda, que o lote
  marca como ocupada, então "Feche um cômodo na frente da porta nova" não dava. A fala 18 virou
  "Escolha Parede e arraste no chão, encostado na casa, até fechar um cômodo." e entrou a 19,
  "Agora escolha Porta e toque numa parede do cômodo, para dar para entrar." (sem porta, o cômodo
  fica fechado).
- **Saindo do Construir no meio da obra**, a fala volta a pedir o Construir.
- **A barra de Objetos cresce** com as escolhas e cobre a frente da casa no computador: quem fizer
  o cômodo na frente precisa girar ou afastar a câmera para pôr a geladeira. O verificador faz o
  cômodo do lado direito do quarto, como a obra de exemplo.

## Como conferir

```
bun build playground/verificar-passos-browser.ts --target=node --external playwright-core --outfile .cache/verificar-passos-browser.mjs
node .cache/verificar-passos-browser.mjs
```

`ARQUIPELAGO_PARTE=passos|obra|celular|dicas` roda uma parte. No playground, `?passos=1` começa os
primeiros passos do zero, `?passos=manter` continua e `?dicas=1` liga as dicas; sem eles, os passos
ficam feitos e as dicas desligadas (os verificadores de antes abrem o jogo como sempre).

Resultado (computador 1280×720 com teclado e mouse; celular 390×844 com toque e menos movimento):
os 23 passos no computador, da boas-vindas ao menu depois do fim, com o teclado e o mouse (andar
segurando W, arrastar a tela, Espaço, E na porta e na horta, Esc no menu, a alface crescendo de
verdade, a obra com parede, porta e geladeira, Pronto e o X do fim); o X recolhendo a tarefa no
Agora e reabrindo; o cartão sem cobrir nenhuma parte da HUD, inclusive no Construir (sem o
Agora); no celular, o cartão ao lado do joystick, pular e continuar do mesmo passo pelo menu; as
dicas do barco (uma vez só e de novo pelo menu), da primeira noite (desligar no cartão e a caixa
em Conforto e controles) e do Quadro das Cores, com o anel certo em cada uma.

Testes: `tests/primeiros-passos.test.ts` (roteiro, textos nos três jeitos de jogar e nos dois
públicos, o que conta como feito, lembretes, "Depois", quem vê sozinho, as dicas) e
`tests/primeiros-passos-loja.test.ts` (a loja: Isso, X, lembrete, pular e continuar, o fim, a obra
retomada e as dicas). `tests/fixtures/abertura-lifecycle.tsx` passou a conferir que a abertura da
primeira vez começa os primeiros passos (e que, com eles feitos, volta a boas-vindas). `bun test`:
1256 passam, 0 falham (1 pulado, como antes). Typecheck com a sessão que cuida dele.

## Decisões (as sugestões do canvas)

- A marca fica no aparelho, por público e perfil (`arquipelago:passos:` e `arquipelago:dicas:`);
  o salvamento não muda.
- O X numa fala com tarefa recolhe a fala; a tarefa fica no Agora.
- Quem já tem a geladeira não vê sozinho; vê pelo menu e pelo Diário.
- O nome é "Primeiros passos".

## O que ficou de fora

- Voz gravada (a legenda é a fala) e som (o jogo ainda não tem sistema de som).
- Seta na borda da tela quando o alvo está fora da vista.
- Dicas de primeira vez de outras coisas (mergulho, planador, montaria, balão, profissões).
