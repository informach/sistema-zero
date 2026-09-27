import type { GltfConversionIssue } from '../import/gltfConversionReport'

export const GLTF_IMPORT_ISSUE_COPY: Record<GltfConversionIssue['detail']['code'], string> = {
  'name-generated': 'Elementos sem nome receberam nomes para facilitar a edição.',
  'name-shortened': 'Alguns nomes foram encurtados.',
  'joint-mesh-split': 'Ossos e suas formas foram separados para você editar cada um.',
  'camera-omitted': 'As câmeras do arquivo não foram trazidas.',
  'missing-position': 'Uma parte não tem posições de pontos e ficou vazia.',
  'construction-points': 'Pontos soltos viraram pontos de construção, sem uma superfície visível.',
  'construction-lines': 'Linhas viraram arestas de construção, sem uma superfície visível.',
  'repeated-indices-omitted': 'Conexões que repetiam o mesmo ponto não foram trazidas.',
  'morph-controls-baked':
    'A forma atual foi mantida, mas seus controles de deformação não foram trazidos.',
  'flat-normals': 'A iluminação das faces foi recalculada e pode parecer mais facetada.',
  'tangents-omitted': 'As direções especiais da textura não foram guardadas; o desenho pode mudar.',
  'colors-omitted': 'As cores ligadas diretamente aos pontos não foram trazidas.',
  'extra-uv-sets-omitted':
    'Foi mantido um conjunto de coordenadas de textura; os demais não foram trazidos.',
  'custom-attributes-omitted': 'Dados personalizados dos pontos não foram trazidos.',
  'undrawn-degenerate-faces': 'Faces sem área continuam editáveis, mas não aparecem no desenho.',
  'undrawn-self-intersection-faces':
    'Faces que cruzam a si mesmas continuam editáveis, mas não aparecem.',
  'undrawn-precision-faces': 'Algumas faces exigem mais precisão para aparecer no desenho.',
  'base-color-factor-baked': 'A cor do material foi misturada à imagem para manter sua aparência.',
  'rgba16-to-rgba8': 'Uma imagem de detalhes passou a usar a precisão de cores da oficina.',
  'image-alias-shared': 'Imagens iguais passaram a compartilhar uma única pintura editável.',
  'sampler-filter-nearest': 'As texturas passam a mostrar pixels nítidos, sem suavização.',
  'sampler-wrap-clamp': 'Fora da imagem, a textura estende a cor da borda em vez de repetir.',
  'occlusion-omitted': 'O mapa de sombras de contato não foi trazido.',
  'emissive-omitted': 'A luz emitida pelo material não foi trazida.',
  'weights-normalized': 'A soma das forças dos ossos foi ajustada nos pontos indicados.',
  'outside-scene-channel': 'Movimentos de partes fora da cena escolhida não foram trazidos.',
  'unresolved-channel-omitted': 'Movimentos com alvos definidos por extensões não foram trazidos.',
  'morph-channel-omitted': 'Movimentos que deformam os pontos da forma não foram trazidos.',
  'empty-clip-omitted': 'Um movimento ficou sem trilhas editáveis e não foi trazido.',
  'zero-duration-expanded': 'Uma pose em tempo zero ganhou a duração de um quadro para editar.',
  'cubic-resampled': 'Curvas especiais viraram quadros. Entre eles, o movimento é uma aproximação.',
  'rotation-keys-normalized':
    'Alguns quadros de rotação foram ajustados para o formato da oficina.',
}
