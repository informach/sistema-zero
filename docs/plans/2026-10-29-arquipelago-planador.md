# Planador e o vento da parede de gelo (fase3-09)

Data: 29/10/2026. Regras e números: `docs/arquipelago-regras.md`, seção da fase3-09.

## Decisões

- **O planador é um item, não um campo novo.** O inventário já aceita itens novos, então não há
  versão nova do salvamento. Ele vem do Floco na primeira conversa do festival de inverno
  (`comecarConversaComOFloco`), uma vez só (`pegarPlanador` devolve o mesmo salvamento quando ele já
  está na mochila, e o morador genérico só grava quando a referência muda).
- **Um modo novo, `planar`** (`sistemas/modos/planar.ts`), no contrato dos outros: o controlador do
  chão leva o corpo (no ar ele não sobe degrau), então pisar é saber que pousou. Entra pelo modo
  chão (`podeAbrirOPlanador` e `abrirOPlanador`: no ar há 0,15 s, subindo a menos de 1 m/s, com o
  planador na mochila, pular); sai pulando, pisando ou caindo na água. A pausa congela o modo.
- **O ar segura na coluna do vento** (`naColunaDaCorrente`: dentro do raio, da base para cima,
  acima do topo também): sem tocar no controle, o planador não sai andando de dentro do vento
  (com o raio de 1 m, sairia antes de subir) e quem o abre acima dele desce no lugar até o alto.
  Guiar tira dali.
- **A corrente é genérica** (`CorrenteDeAr` em `movimento.correntes`): um cilindro em pé com base e
  topo no mundo. Ilhas novas podem registrar as delas; a do Pico vem da âncora `corrente-de-ar` do
  `pico.glb` (`mundo/corrente-de-ar.tsx`, montada pelo `PicoVivo`, só com a ilha ativa).
- **A altura do vento (4,75 m)** saiu da simulação no teste: do alto dela, planando para a parede,
  a descida termina em cima dela. O vento sobe mais alto que a parede (pelo menos 0,25 m).
- **Arte.** O `planador.glb` do kit de movimento (asas com o clipe `planar` e o vazio `pegada`, a
  barra) vai dentro do desenho do avatar, com a barra nas mãos do clipe "Pendurado"
  (`BARRA_NO_AVATAR`). No `pico.glb`: a âncora `corrente-de-ar` (−0,9; 7,7, no chão, na frente do
  painel mais alto da parede) e o bloco de gelo decorativo que ficava nesse lugar foi para (−2,7;
  6,3). `topo-da-parede` marca o alto da parede.

## Limites conhecidos

- Segurando para a frente, o planador sai do vento e pode passar do alto da parede (que tem 1,6 m
  de fundo) e pousar atrás dela; para parar em cima, a criança fecha o planador sobre ela. A regra
  do teste dos colisores (do alto do vento, guiando para a parede, pousa no alto dela, chegando por
  cima) vale para o corpo do modo; o navegador a poucos quadros por segundo só confere que sai do
  vento planando e pousa.

- Com o planador na mochila, um pulo apertado no ar logo antes de pousar (o pulo "guardado" para
  sair pulando de novo) abre o planador em vez de esperar o chão; pousando, ele fecha na hora.
  O modo não sabe a distância até o chão. Se incomodar, a regra pode pedir uma altura mínima,
  medida com um raio para baixo no `personagem.tsx`.

## Conferência

- `tests/planador.test.ts`: abrir só no ar (e não no pulo de tolerância), a descida, o controle, o
  vento, fechar pulando e na água, a pausa no ar, e o presente uma vez só.
- `tests/colisores-do-pico.test.ts` (fase3-09): a corrente no chão e alcançável andando, nada em
  que o corpo bata dentro dela, e o voo do alto dela até o alto da parede.
- Navegador: `playground/verificar-pico-browser.ts`, no computador e no celular emulado.
