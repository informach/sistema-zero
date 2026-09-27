import type { BbmodelClipProblem } from '../import/bbmodelClipPlanTypes'

export const BBMODEL_ANIMATION_IMPORT_COPY = {
  hint: 'Primeiro traga os movimentos, depois experimente cada um na prévia. Nada muda na sua criação antes de confirmar.',
  adaptationHint:
    'Curvas, giros e pulos podem mudar. Cada movimento toca sozinho; regras que misturam movimentos não são reproduzidas. Confira antes de usar.',
  settings: 'Ajustes dos movimentos',
  adaptation: 'Como adaptar as poses',
  sampled: 'Criar poses por amostras; o resultado pode mudar',
  fps: 'Quadros por segundo da adaptação',
  fpsHint:
    'Mais quadros criam mais poses para editar. Mesmo no máximo, giros rápidos e mudanças bruscas podem ficar diferentes.',
  duration: 'Duração de cada movimento',
  declared: 'Usar a duração anotada no arquivo',
  fitKeys: 'Ir até a última pose, incluindo as que ficaram fora da duração',
  names: 'Quando o movimento usa o nome do grupo',
  uniqueName: 'Ligar pelo nome somente se existir um único grupo com esse nome',
  unresolved: 'Movimentos que não podem entrar por inteiro',
  omitClip: 'Deixar o movimento inteiro de fora e explicar o motivo',
  metadata: 'Anotações e marcas do editor de origem',
  discardMetadata: 'Não guardar essas anotações e marcas; registrar a quantidade',
  unmapped: 'Campos de movimento sem equivalente',
  discardUnmapped: 'Não guardar esses campos; registrar a quantidade',
  discontinuities: 'Duas poses no mesmo instante',
  samplePre: 'Usar a pose anterior nesse instante; o pulo pode mudar ou desaparecer',
  zeroScale: 'Partes que chegam a tamanho zero',
  preserveZero: 'Manter o tamanho zero nas poses amostradas',
  minimumScale: 'Usar o mínimo da origem (0,00001) nas poses amostradas',
  review: 'Revisão dos movimentos',
  previous: 'Movimentos anteriores',
  next: 'Próximos movimentos',
  summary: (converted: number, omitted: number) =>
    `Movimentos trazidos: ${converted}. Movimentos que ficaram de fora: ${omitted}.`,
  empty: 'O arquivo não declara movimentos para trazer.',
  emptyClip: 'Este movimento não tem poses que alterem os grupos.',
  prepared: 'Pronto para experimentar na prévia.',
  fallbackName: (index: number) => `Movimento ${index + 1}`,
  discarded: (fields: number, markers: number) =>
    `Informações de editor e campos não guardados: ${fields}. Marcas de tempo não guardadas: ${markers}.`,
  sampledTracks: (count: number) => `Canais adaptados por amostras: ${count}.`,
  discontinuous:
    'Alguns instantes tinham duas poses. A adaptação pode suavizar ou perder essa mudança brusca.',
  zeroes: 'Houve poses com tamanho zero. Foi aplicada a escolha de tamanho feita acima.',
  tiny: 'Alguns valores foram mantidos, mas são pequenos demais para aparecer no desenho.',
  reportHint:
    'O relatório para baixar guarda os motivos, as quantidades e o primeiro caminho de cada tipo de campo descartado — não uma lista de todos os caminhos. Guarde também o original.',
  page: (start: number, end: number, total: number) => `Movimentos ${start} a ${end} de ${total}.`,
  noOtherChanges: 'Nenhuma outra adaptação foi relatada para as peças e a pintura.',
} as const

export const BBMODEL_CLIP_PROBLEM_COPY: Record<BbmodelClipProblem['code'], string> = {
  binding: 'Não foi possível ligar todas as poses aos grupos escolhidos.',
  'animator-mode': 'Este movimento usa um modo de rotação ou de articulação ainda não aceito.',
  channel: 'Este movimento controla algo que a oficina ainda não importa.',
  track:
    'Há valores ou curvas que não podemos transformar em poses. Consulte o motivo detalhado no relatório.',
  timing: 'Este movimento tem uma regra própria de tempo ou atraso.',
  weight:
    'A intensidade do movimento depende de uma expressão ou de um número que não podemos usar.',
  loop: 'A forma de repetir este movimento ainda não é aceita.',
  duration: 'A duração anotada não é positiva. Você pode escolher ir até a última pose.',
  'pre-post': 'Há duas poses no mesmo instante. Adaptar essa mudança precisa de uma escolha.',
  metadata: 'Há anotações ou marcas do editor. Não guardá-las precisa de uma escolha.',
  unmapped: 'Há campos de movimento sem equivalente. Não guardá-los precisa de uma escolha.',
}
