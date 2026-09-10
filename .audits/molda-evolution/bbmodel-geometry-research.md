# Notas de pesquisa: geometria bbmodel (não é implementação concluída)

Fontes primárias fixadas no commit 47e633e4a1338f957ee7baa0acbcf54da11e77df,
consultadas por Firecrawl; arquivos de consulta em `.firecrawl/`. Somente fatos
de intercâmbio, sem copiar a implementação GPL ou executar código baixado.

- [Cube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/cube.js):
  salva from/to/origin, faces, type/uuid e overrides de inflação, stretch,
  rotação, visibilidade/export, mirror e offset UV. Faces têm retângulo UV e
  rotação. Render deriva extremos pelo centro e meia-extensão com inflação e
  stretch; vértices resultantes ficam relativos ao origin. Box UV usa dimensões
  não infladas, truncadas com epsilon 1e-7 no formato genérico, e possui margem
  de amostragem 1/64 no renderer. Essa margem não é UV autoral.
- [Mesh](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/types/mesh.js):
  vértices e faces por chave. Salva faces com ordem já classificada, UV por
  vértice e seams. Coordenadas são locais; não subtrair origin novamente.
  Faces de dois vértices representam arestas. Fonte desenha triângulos/quads;
  aceitar listas maiores no JSON não prova semântica n-gon. Dados smooth/flat
  e pontos sem faces não podem desaparecer silenciosamente.
- [Face](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/abstract/face.ts):
  texture null significa face removida; false significa sem textura; ausente
  depende do formato/default. Durante bbmodel, textura resolvida é índice na
  lista, enquanto caminhos/UUIDs pertencem a outros contextos. Leitor de Face
  também aceita string UUID. Não confundir número zero com ausência.
- [OutlinerElement](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/abstract/outliner_element.ts):
  fallback de tipo desconhecido para Cube existe na referência, mas não deve
  ser copiado pelo Molda: preservar como unresolved/unsupported, com decisão.
- [Formato genérico](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/generic.ts)
  tem id free, bone rig, rotação de cubos, UV por textura e box UV opcional.
  [ModelFormat](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/io/format.ts)
  define Euler padrão ZYX. Cube e Group configuram essa ordem explicitamente;
  Mesh não a configura no setup consultado (Three usa XYZ). Conferir com
  fixtures/oracle independente antes de prometer equivalência de transform.
- [Outliner/preview](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/outliner/outliner.js):
  posição começa no origin e subtrai origin do pai somente quando o comportamento
  do pai usa posição absoluta. Não aplicar a mesma regra indiscriminadamente
  a armature/group/plugin. Não copiar fallback de escala zero para 1e-7.

Próximo incremento proposto: reader tipado de cubos/malhas, com orçamento agregado
antes de coordenadas/UV e sem conversão nativa antecipada. Manter extremos,
rotações, cores/flags e UV sem snap/reescala/V-flip; tipos/semânticas não lidos
ficam explícitos. Domínio e gate Float32 ficam na futura conversão; leitor
numérico deve rejeitar NaN/Infinity, sem normalizar valores finitos da fonte.
Fixtures reais exportadas pelo Blockbench ainda não foram executadas nesta sessão.
