# Lote 229 — a miniatura da geração seguinte

Estado: implementado, revisado e verificado em navegador real, 10/09/2026.
Fase 3. Primeiro dos dois pré-requisitos para ligar a capacidade `sceneWorkshop` sem a
criança perder nada; o outro é o ramo v2 da nuvem.

## O problema

Com a oficina integrada no app, toda criação da geração seguinte aparecia na galeria com
o cubo de reserva e o texto "Abra a criação para ver de perto". O documento v2 sempre
soube guardar `thumb` (está em `MoldaAssetBase`, o leitor aceita, `migrateLegacy`
preserva e `sameSceneContent` já o exclui da identidade de conteúdo). O que faltava era
alguém tirar a foto: nada na oficina produzia uma.

## Decisões

- **Reusar `ViewportThumbnail`**, o mesmo alvo de 96 px do editor antigo, com o mesmo
  papel claro de fundo. As duas gerações aparecem lado a lado na galeria e precisam
  parecer a mesma galeria.
- **A foto é da criação GUARDADA, não da sessão**: grade, contorno, pivô, alças, apoios,
  guias de pose, pontos de peso e cursor do pincel ficam fora do quadro, e o
  enquadramento usa só as superfícies desenháveis, sem escondidas.
- **Nada de retrato pela metade**: enquanto o isolamento esconde peças, `renderThumb`
  devolve `null` e a foto anterior continua valendo. É melhor uma foto velha e inteira
  do que uma nova e mentirosa.
- **A foto é derivada, não uma edição**: sai 700 ms depois que o desenho assenta, pelo
  `setThumb` que não cria passo de desfazer nem avança a revisão de conteúdo.
- **Fotografa só o que o palco desenhou**: se a revisão corrente não é a que o viewport
  aplicou, a foto não sai. Isso também tornou real a dependência que o Biome apontou
  como desnecessária, em vez de silenciar a regra.

## Implementação

- `SceneViewport.renderThumb()` e o `ViewportThumbnail` próprio, criado só quando o
  renderer é um `WebGLRenderer` de verdade e liberado no `dispose`.
- `renderThumb` entrou no `SceneViewportPort`, então todo palco falso da suíte precisa
  respondê-lo: o contrato não deixa um fake divergir em silêncio.
- `useSceneViewport` ganhou `onThumb`, agendado por revisão desenhada; `SceneCanvas`
  repassa e `SceneWorkshop` grava com `editor.setThumb`.

## Provas

- `SceneWorkshop.test.tsx`: a foto entra no documento depois que o desenho assenta, não
  vira passo de desfazer, não avança a revisão de conteúdo, e uma edição de verdade
  continua sendo um passo sem apagar a foto.
- Navegador real: a criação aberta na oficina volta para a galeria com a foto do próprio
  WebGL, ao lado de outra que ainda não foi aberta e mantém a reserva. Console limpo.
- Integral **2.823/0**, 380 arquivos; tipos do Molda e do Kids, Biome, Vite (1,22 s) e
  build do Kids (8,8 s, 59 páginas) passaram.
- Cinco avisos `act` na integral, nos mesmos componentes do editor ANTIGO já registrados
  desde o lote 203 (LoadedEditor, EditorTopBar duas vezes, FacePaintDialog, ModelEditor).
  Não apareceram na execução anterior nem vêm do código novo; nenhuma correção alegada.

## Limites

- A foto só existe depois que a criança abre a criação na oficina: as que ficaram para
  trás continuam com a reserva até serem abertas. Não há refoto em massa, e não deveria
  haver: isso seria abrir e regravar o trabalho de alguém sem pedir.
- Sem homologação de aparência da foto em tablet, e sem medir o custo do render extra
  em hardware fraco.
