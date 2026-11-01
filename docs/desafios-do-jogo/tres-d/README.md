# Desafios 3D das ilhas

A proposta pede um desafio 3D por posto, como desafio do dia (lacunas, 01/11/2026). Os blocos 3D
da trilha são os da Ilha do Farol, o 3D do Faísca. Por isso cada desafio aplica a aventura de chave
e porta no tema da ilha:

1. o personagem do curso anda pela ilha;
2. ao encostar no item, o item some e `temItem` guarda que ele está com o personagem;
3. ao levar o item ao morador, um Se entrega uma vez só (`entregue`) e o morador comemora;
4. sem o item, o morador pede (`pediu`).

O extra é a tecla R recomeçar.

| Ilha | Desafio | Morador | Item |
|---|---|---|---|
| Sua ilha | A concha do Nico | Nico | concha |
| Bosque | O coelhinho da Capi | Capi | coelhinho |
| Vila Doce | O bolo do Bento | Bento | bolo |
| Recife | A estrela da Maré | Maré | estrela-do-mar |
| Pico | O cristal do Floco | Floco | cristal |
| Vale | O ovo da Jade | Jade | ovo |
| Nuvens | A semente da Iriê | Iriê | semente |

## Projeto e objetivos

- O projeto inicial traz a ilha, o personagem, o morador, o item e os dois encontros vazios. O
  gabarito preenche os encontros.
- Os objetivos rodam no executor com `approachObject3d`: o robô anda pelo chão até encostar.
  - `pegar`: encostar no item guarda `temItem`.
  - `entregar`: com o item, encostar no morador entrega.
  - `sem-item`: sem o item, o morador pede e nada é entregue.
  - `recomecar` (extra): a tecla R recomeça.
- Só blocos da trilha 3D (`a-ilha-do-farol/blocos.json`); o teste confere.
- Desafio do dia, ordem 75, 10 e 5 moedas, sem cor. Um manifesto por ilha e público
  (`<ilha>-3d.manifesto.json`).

## Modelos

| Peça | Origem |
|---|---|
| Personagem | aventureiro da Ilha do Farol |
| Morador e item | modelos do jogo (`packages/arquipelago/src/assets/`) |
| Chão | um disco na cor da ilha com borda de terra, feito no Blender (`arte/chaos.py`); cores conferidas com a luz do Estúdio (`docs/qa/2026-11-01-chaos-3d/`) |

Todos vão para a biblioteca de modelos dos cursos (`publicar-modelos.ts`, que grava
`modelos.json`), e o projeto leva só a referência. Embutidos, os modelos passavam do teto do
manifesto.

## Comandos

- Chãos: `C:/Users/tocha/blender-venv/Scripts/python.exe docs/desafios-do-jogo/tres-d/arte/chaos.py`
- Modelos na biblioteca: `bun docs/desafios-do-jogo/tres-d/publicar-modelos.ts`
- Manifestos: `bun docs/desafios-do-jogo/tres-d/gerar-manifesto.ts`
- Testes: `bun test docs/desafios-do-jogo/tres-d`
- Executor real (imagem `sistemazero-studio-runtime:verify`, sem rede):
  `bun packages/studio-runtime/tests/desafios-3d-smoke.ts [--ilha=pico]`. Em cada ilha, o inicial
  falha nos quatro objetivos e o gabarito cumpre os quatro.
