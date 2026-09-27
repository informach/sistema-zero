# Materiais e referências de imagem GLB/glTF, lote 144

## Contrato

Leitura pura de PBR core, emissividade/oclusão, normal scale, transparência,
texturas, samplers e descritores de imagem. Não é conversão em materiais/pixels
nativos. Não buscar URI, decodificar imagem, executar extensão ou mudar a fonte.
JSON original continua necessário para revisão de extensões e diferenças.

Fatores RGB/emissivos são lineares e próprios, não convertidos para sRGB pelo
leitor. Defaults glTF: branco, metalness/roughness 1, emissividade zero,
OPAQUE/cutoff 0,5 e face única. Alpha do fator é preservado mesmo em OPAQUE;
quem converte deve respeitar que ele não afeta a opacidade nesse modo.
Normal scale aceita números finitos negativos; cutoff pode exceder 1, mas exige
alphaMode explicitamente declarado. Nenhum clamp para caber no domínio nativo.

Cinco tipos de referência de textura têm índice e conjunto UV próprios. Todos
os conjuntos exigidos devem existir na primitive, mesmo em mapas com força zero
ou que a conversão nativa venha a omitir. Sets são preparados uma vez por material
na chamada. Referência inválida não ganha UV0 por conveniência.

Samplers conservam seis minFilters, dois magFilters e três wraps por eixo.
Filtro ausente é null (auto/decisão do cliente), não NEAREST inventado. Textura
sem source é mantida explícita para mecanismo/extensão ainda não resolvido.
Imagem exige URI xor view; MIME é obrigatório para view. URI e MIME de formatos
adicionais ficam apenas como metadados: isso não promete decodificação/suporte.

Views de imagem não aceitam target/stride nem armazenamento numérico. Accessors
agora retêm dois índices sparse próprios, além da referência de base, permitindo
conferir exclusividade sem guardar DataViews/buffers. Views distintas podem
compartilhar o buffer; não se proíbe indiscriminadamente sobreposição de bytes.

## Review

- Experimento com GLB real e validador Khronos confirmou severity 0 para
  BUFFER_VIEW_TARGET_OVERRIDE ao marcar view de imagem como vertex target, e
  IMAGE_BUFFER_VIEW_WITH_BYTESTRIDE ao declarar stride de imagem. A primeira
  fixture da consulta tinha zero chaves em uma trilha (inválida); consulta foi
  refeita com fixture de três chaves, sem alteração de produção.
- RED/GREEN: o leitor de imagens percorria roles de accessors antes de verificar
  teto de metadados, inclusive sem imagens. Agora só prepara esse índice ao
  encontrar uma imagem em bufferView, depois do teto; ausência ou URIs não
  varrem accessors. Teste instrumenta apenas objetos próprios da fixture.
- Fontes/vetores/referências não se tornam aliases mutáveis entre materiais;
  nada usa map de textura do Three em produção. Checagem de todos os UVs evita
  que perdas posteriores escondam referências inválidas do glTF.
- Tetos de 65.536 descritores por família, URI embutida limitada a 32 MiB e nome/
  MIME a 4.096 caracteres; pixels/recursos decodificados têm orçamento posterior.
  Não tratar esses tetos como medição de pico de RAM ou latência em dispositivo.

## Evidência

13 testes de domínio e um de pureza adicionados. Importadores + pureza: 133 testes,
zero falhas, 11 arquivos, 2.689 expectativas, 2,75 s. Incluem todas as combinações
filter/wrap, storage base/sparse, canais/fatores/referências/UV, GLB texturado real
e oracle GLTFLoader para materiais sem textura (cores lineares, roughness,
metalness, emissividade, sides e modos de alpha).

Integral: 1.756 testes, zero falhas, 249 arquivos, 8.198.694 expectativas,
132,13 s. Tipos passaram após corrigir somente expectativas de fixtures
(tuplas/arrays e unions dos enums). Biome/750, Vite/1,34 s e Kids:
compilação/22,8 s, tipos/13,8 s, 59 páginas/713 ms passaram. Diff check passou,
com avisos de CRLF de arquivos alheios. Chunk Three continua acima de 500 kB;
não houve medição de GPU/browser nem ativação pública do importador.

Base: [glTF 2.0, §§3.9, 5.18–5.22 e 5.26](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
