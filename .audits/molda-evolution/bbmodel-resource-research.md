# Notas para recursos bbmodel (pesquisa, não implementação concluída)

Referências: [bbmodel docs](https://www.blockbench.net/wiki/docs/bbmodel/),
[codec fixado](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bbmodel.js)
e [Texture](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js).
Fontes consultadas por Firecrawl, armazenadas como dados ignorados pelo Git.

- Em 4.9, relative_path é relativo ao arquivo bbmodel tratado como diretório.
  A partir de 4.10, é relativo ao diretório do arquivo. Exemplo: entrada
  `folder/model.bbmodel`, referência antiga `../color.png` → `folder/color.png`;
  a mesma referência nova → `color.png` dentro do conjunto escolhido.
  Implementar a semântica documentada, não copiar a correção PathModule do app.
- Caminhos são literais, não URIs percent-decoded. Backslash em referência pode
  ser adaptado, mas arquivos escolhidos têm nomes canônicos próprios. Sem lookup
  por basename/caixa, acesso ao disco por path absoluto ou travessia fora da seleção.
- Source pode coexistir com path/relative_path e layers. Codec desktop pode
  priorizar arquivo existente; isso depende do ambiente e não deve ser inferido
  no Molda. Prioridade de fonte precisa ser política explícita, sem tentar outra
  silenciosamente após erro. Embedded escolhido precisa ser data URI raster,
  nunca URL/HTML/SVG/script executável. Layers permanecem para decisão posterior.
- Dimensões width/height são cache; pixels devem ser inspecionados pelo header
  real antes de alocar. UV width/height independentes, defaults de projeto por
  eixo. Source e metadados sozinhos não provam frameCount ou equivalência visual.

Reuso candidato já inspecionado: `gltfDataUri.ts`/`gltfImageDataUri.ts` contêm
preflight base64/percent e imagens PNG/JPEG; extrair núcleo neutro mantendo erros
glTF e testes, em vez de acoplar parser bbmodel a glTF. `localFilePath.ts` é neutro;
`objResourcePath.ts` adiciona referência literal relativa e pode compartilhar essa
lógica com adaptação de base por versão. Não alterar semântica URI glTF.

Resource plan deve validar TODOS os arquivos escolhidos (32 MiB individual,
64 MiB seleção, 1.024 companions) antes de cópias, incluindo não usados. Derivar
recursos só das referências efetivamente escolhidas; repetir path/data URI não
deve duplicar bytes. Conferir orçamento agregado antes de materializar quaisquer
bytes; faltantes não produzem resultado parcial. Sem IO/rede/cache entre imports.
Desenho, PBR, camadas, flipbook e adoção continuam estágios posteriores.

Leitura adicional relevante para conversão futura: TextureGroup material usa
MER (metalness/emissive/roughness), normal versus height e alpha test; não copiar
fallbacks/bugs do renderer (por exemplo acesso a alpha fora de vector4). Apenas
ler material_config não autoriza declarar PBR/normal/emissão já convertidos.
