import type { ObjConversionIssue } from '../import/objConversionReport'

export const OBJ_IMPORT_ISSUE_COPY: Record<ObjConversionIssue['detail']['code'], string> = {
  'library-scope-selected': 'As listas de materiais foram usadas na ordem que você escolheu.',
  'duplicate-material-selected':
    'Havia materiais com o mesmo nome. Foi usada a declaração escolhida.',
  'missing-material-default':
    'Um material não foi encontrado pelo nome. Essas faces receberam branco.',
  'rgb-interpreted': 'As cores escritas no material foram lidas com a interpretação escolhida.',
  'property-redeclared': 'Uma propriedade repetida foi resolvida usando a declaração escolhida.',
  'opacity-priority': 'O material trazia duas definições de transparência. Foi usada a escolhida.',
  'phong-roughness-approximated':
    'O brilho foi aproximado para a iluminação da oficina e pode parecer diferente.',
  'illumination-adapted': 'A iluminação do material foi adaptada e pode parecer diferente.',
  'parameter-omitted':
    'Uma informação do material não foi trazida. Os detalhes estão no relatório.',
  'default-assumed': 'Uma informação ausente recebeu um valor inicial, indicado no relatório.',
  'map-omitted':
    'Uma imagem não foi usada por falta de coordenadas, conflito ou incompatibilidade.',
  'map-interpreted': 'Uma imagem recebeu o papel escolhido, como relevo, brilho ou transparência.',
  'option-redeclared': 'Uma opção repetida da imagem foi resolvida usando a declaração escolhida.',
  'option-omitted': 'Uma opção de imagem sem equivalente na oficina não foi trazida.',
  'third-texture-axis-omitted':
    'A terceira direção da textura não foi trazida; a pintura usa duas direções.',
  'sampler-filter-nearest': 'As imagens mostram pixels nítidos, sem suavização.',
  'sampler-wrap-clamp': 'Fora da imagem, a textura estende a cor da borda.',
  'texture-rgb-interpreted':
    'As cores da imagem foram lidas com a interpretação indicada no relatório.',
  'luminance-rec709': 'As cores de uma imagem foram combinadas para formar seus valores de brilho.',
  'matte-linear': 'A transparência da imagem foi lida diretamente, sem transformação de cor.',
  'name-generated': 'Itens sem nome receberam nomes para facilitar a edição.',
  'name-shortened': 'Alguns nomes foram encurtados.',
  'empty-object-preserved': 'Um objeto vazio foi guardado como grupo para você organizar.',
  'empty-objects-omitted': 'Objetos vazios não foram trazidos, conforme sua escolha.',
  'group-memberships-omitted':
    'As etiquetas de grupo do arquivo não foram guardadas. Os objetos continuam separados.',
  'closing-corners-removed': 'O último canto repetia o primeiro e foi retirado da lista de cantos.',
  'construction-points': 'Pontos soltos viraram pontos de construção, sem uma superfície visível.',
  'construction-lines': 'Linhas viraram arestas de construção, sem uma superfície visível.',
  'repeated-line-indices-omitted':
    'Trechos de linha que repetiam o mesmo ponto não foram trazidos.',
  'line-uv-omitted': 'As coordenadas de pintura das linhas de construção não foram trazidas.',
  'construction-material-omitted':
    'Os materiais de pontos e linhas de construção não foram trazidos.',
  'flat-normals': 'A iluminação das faces foi recalculada e pode parecer mais facetada.',
  'smoothing-groups-omitted': 'As indicações de suavização entre faces não foram guardadas.',
  'third-uv-coordinate-omitted': 'A terceira coordenada de pintura não foi trazida.',
  'rational-weight-omitted':
    'Um valor extra de posição não foi guardado. As três coordenadas foram mantidas.',
  'unreferenced-vertices':
    'Pontos sem uso nas partes foram guardados em uma peça de construção separada.',
  'undrawn-degenerate-faces': 'Faces sem área continuam editáveis, mas não aparecem no desenho.',
  'undrawn-self-intersection-faces':
    'Faces que cruzam a si mesmas continuam editáveis, mas não aparecem.',
  'undrawn-precision-faces': 'Algumas faces exigem mais precisão para aparecer no desenho.',
  'rgba16-to-rgba8': 'Uma imagem passou a usar a precisão de cores da oficina.',
  'color-factor-baked': 'A cor e a transparência do material foram combinadas com a imagem.',
  'color-alpha-interpreted': 'A transparência da imagem de cor foi tratada conforme sua escolha.',
  'normal-y-interpreted':
    'O relevo foi orientado conforme sua escolha e as coordenadas da oficina.',
  'surface-sidedness-assumed': 'A visibilidade dos dois lados das faces segue sua escolha.',
  'opacity-resampled-nearest':
    'Uma máscara de transparência foi ajustada ao tamanho da imagem de cor.',
}
