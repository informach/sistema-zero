import { NATIVE_IMPORT_COPY } from './nativeImportCopy'

/** Internal workshop import language. Technical paths remain optional details, never executable markup. */
export const GLTF_IMPORT_COPY = {
  ...NATIVE_IMPORT_COPY,
  intro:
    'Escolha um arquivo GLB ou glTF. Você vai ver uma prévia e revisar as adaptações antes de mudar sua criação.',
  filesHint:
    'Para glTF, escolha também os arquivos .bin e as imagens. Se houver subpastas, escolha a pasta completa para manter os caminhos.',
  principalPlaceholder: 'Escolha o GLB ou glTF',
  scene: 'Cena do arquivo',
  scenePlaceholder: 'Escolha uma cena',
  sceneName: (index: number) => `Cena ${index + 1}`,
  noScenes: 'Este arquivo tem uma única biblioteca de partes, sem cenas separadas.',
  noEntry: 'Não encontrei um arquivo .glb ou .gltf no conjunto. Adicione o modelo principal.',
  reading: 'Conhecendo as partes e os movimentos…',
  inspect: 'Conferir arquivo',
  cubic: 'Converter curvas em quadros',
  cubicHint:
    'Alguns movimentos usam curvas especiais. A conversão mantém os quadros originais e cria amostras entre eles; o movimento pode mudar um pouco.',
  fps: 'Quadros por segundo para converter curvas',
  rotations: 'Ajustar rotações para o formato da oficina',
  weights: 'Ajustar a soma das forças dos ossos',
  morphs: 'Trazer sem movimentos que mudam a forma dos pontos',
  unresolved: 'Trazer sem movimentos controlados por extensões',
  loop: 'Repetir os movimentos ao tocar',
  scope: (scenes: number, nodes: number) =>
    `${scenes} outras cenas e ${nodes} partes fora da cena escolhida não serão trazidas.`,
  extensions: (count: number) =>
    `${count} extensões opcionais não são interpretadas. Elas podem mudar a aparência ou os movimentos.`,
  chunks: (count: number) => `${count} blocos adicionais do arquivo não são trazidos.`,
  summary: (parts: number, clips: number, triangles: number) =>
    `${parts} partes · ${clips} movimentos · ${triangles.toLocaleString('pt-BR')} triângulos de desenho`,
} as const
