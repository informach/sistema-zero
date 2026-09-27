import type { BbmodelConversionIssue } from '../import/bbmodelConversionReport'

export const BBMODEL_IMPORT_ISSUE_COPY: Record<BbmodelConversionIssue['detail']['code'], string> = {
  'paint-layers-adapted':
    'Camadas preservadas separadamente. A mistura passa a usar o Molda e transparências combinadas podem mudar. A imagem pronta só forneceu o tamanho; nomes, tamanhos anotados e ajustes de cor estão no relatório.',
  'unlisted-nodes-appended': 'Peças fora da lista de montagem foram trazidas ao final.',
  'unlisted-nodes-omitted':
    'Peças fora da lista de montagem não foram trazidas, conforme sua escolha.',
  'unsupported-subtree-omitted': 'Uma peça de tipo não aceito e tudo dentro dela ficaram de fora.',
  'unmapped-field-discarded':
    'Uma informação sem equivalente não foi guardada. O caminho está no relatório.',
  'animations-omitted': 'Movimentos das peças ficaram de fora. Esta é uma cópia estática.',
  'animation-controllers-omitted':
    'Controladores de movimento ficaram de fora e não foram executados.',
  'disabled-faces': 'Superfícies desativadas na origem não foram trazidas.',
  'construction-faces':
    'Pontos e linhas foram mantidos para construção, sem uma superfície visível.',
  'duplicate-construction-edges': 'Linhas de construção repetidas foram guardadas uma única vez.',
  'unsupported-faces-omitted':
    'Algumas superfícies ficaram de fora, conforme sua escolha. Seus pontos foram mantidos.',
  'quads-to-source-triangles':
    'Faces de quatro cantos foram divididas nos dois triângulos da origem.',
  'editable-quad-adaptation':
    'Faces de quatro cantos continuam juntas para editar. A divisão no desenho pode mudar.',
  'zero-cube-extents': 'Cubos planos mantiveram suas medidas, sem ganhar espessura.',
  'inverted-cube-extents':
    'Cubos invertidos mantiveram suas medidas. Confira seus lados na prévia.',
  'sub-float32-local-points':
    'Alguns pontos são pequenos demais para o desenho, mas suas coordenadas foram mantidas.',
  'sub-float32-world-points':
    'Alguns pontos transformados exigem mais precisão do que o desenho permite.',
  'box-uv-materialized': 'A pintura da caixa foi aberta em coordenadas próprias para cada face.',
  'missing-mesh-uv-filled':
    'Cantos sem posição de pintura receberam o início da imagem, conforme sua escolha.',
  'surplus-mesh-uv-omitted': 'Posições de pintura sem canto correspondente não foram trazidas.',
  'outside-frame-uv': 'Há coordenadas de pintura fora do quadro da imagem.',
  'uv-arithmetic-collapse':
    'Algumas posições de pintura ficaram indistinguíveis após a mudança de coordenadas.',
  'sub-float32-uv': 'Algumas posições de pintura exigem mais precisão do que o desenho permite.',
  'native-flat-normals':
    'A luz das faces foi recalculada para a oficina e pode parecer mais facetada.',
  'render-order-discarded': 'A ordem especial de desenho não foi guardada.',
  'seam-labels-discarded':
    'Etiquetas de corte e união não foram guardadas. Os cantos de pintura continuam separados.',
  'cube-shade-discarded': 'A marca especial de sombra do cubo não foi guardada.',
  'outside-frame-uv-clamped':
    'Fora do quadro, a pintura estende a cor da borda sem mudar suas coordenadas.',
  'name-generated': 'Itens sem nome receberam nomes para facilitar a edição.',
  'name-shortened': 'Alguns nomes foram encurtados.',
  'untextured-appearance-adapted':
    'Faces sem imagem receberam a cor escolhida. A cor de identificação da peça não virou tinta.',
  'texture-lighting-adapted':
    'A pintura usa a iluminação da oficina. Brilho, transparência e sobreposição podem parecer diferentes.',
  'texture-sidedness-assumed':
    'Os lados da pintura seguem sua escolha para texturas no modo automático.',
  'texture-repeat-clamped': 'A imagem não se repete nas bordas: a cor da borda se estende.',
  'texture-render-mode-adapted':
    'Um efeito especial de textura virou pintura comum e pode parecer diferente.',
  'pbr-group-texture-only':
    'Foi trazida apenas a imagem ligada à face, sem o conjunto de materiais PBR.',
  'pbr-channel-used-as-color':
    'Uma imagem de dados foi usada como pintura, não como relevo ou brilho.',
  'group-visibility-inherited':
    'A visibilidade do grupo passa a valer também para as peças dentro dele.',
  'group-lock-inherited': 'A trava do grupo passa a valer também para as peças dentro dele.',
  'export-flag-discarded': 'A marca de não exportar não foi guardada. A peça continua na criação.',
  'undrawn-degenerate-faces': 'Faces sem área continuam editáveis, mas não aparecem no desenho.',
  'undrawn-self-intersection-faces':
    'Faces que cruzam a si mesmas continuam editáveis, mas não aparecem.',
  'undrawn-precision-faces':
    'Algumas faces continuam guardadas, mas precisam de mais precisão para aparecer.',
  'texture-resource-selected':
    'A imagem escolhida, a alternativa e o caminho ignorado estão identificados no relatório.',
  'declared-pixel-size-differs':
    'O tamanho real da imagem era diferente do tamanho anotado no modelo.',
  'texture-flipbook-materialized':
    'A imagem foi organizada em quadros para tocar sua pintura animada.',
  'texture-fps-floor': 'Uma pintura animada passou a tocar no mínimo de um quadro por segundo.',
  'frame-indices-wrapped':
    'Números de quadro fora da imagem foram ajustados para repetir dentro dela.',
  'rgba16-to-rgba8':
    'Uma imagem passou a usar a precisão de cores da oficina, conforme sua escolha.',
  'inactive-texture-layers-omitted':
    'Camadas de pintura inativas não foram trazidas. Foi usada a imagem pronta.',
}
