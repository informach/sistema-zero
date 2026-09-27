# Accessors GLB/glTF, lote 140

## Leitura e revisão

Metadados de todos os accessors são preparados antes de alocar saídas. Até
65.536 accessors e 4.194.304 componentes Float64 agregados, incluindo arrays
inicializados com zeros. O teto é de saída numérica, não pico total de RAM.
Valores Float32/inteiros são preservados; normalização de inteiros é a definida
pelo formato, sem ajuste para a grade do Molda. Não executar extensões.

Conferir cada intervalo e stride antes do DataView, componente little-endian,
padding por coluna de matriz e ausência permitida do último padding. Sparse
substitui elementos sobre base (inclusive intercalada) ou zeros, com índices
crescentes/únicos/no intervalo e views sem stride/target. Min/max são comparados
após substituição e antes de normalized; limites Float32 seguem Math.fround.
Sem base/sparse, o formato permite limites arbitrários para provedores de dados
por extensão: não inferir que os limites descrevem os zeros provisórios.

Float64 de saída possui armazenamento próprio; nenhum DataView/backing da fonte
é publicado. Layout mínimo preservado para a próxima validação de papéis:
atributos de vértice, índices, animação e skin. O leitor não valida esses usos
nem declara uma malha/cena inteira compatível.

## Achado do review

O primeiro código exigia alinhamento de matriz de quatro bytes também no offset
absoluto. Experimento com glTF-Validator mostrou que MAT2/UNSIGNED_BYTE em
bufferView offset 1 e accessor offset 0 é válido. O alinhamento de colunas é
local ao bufferView; o absoluto segue largura do componente. Teste RED confirmou
recusa indevida, corrigida sem aceitar accessor offset 3 com início absoluto 4.
Casos válidos e inválidos permanecem distintos. Padding omitido também passa
no validador independente.

Consultados Context7 e GLTFLoader/BufferAttribute instalados. Three compara os
tipos, normalização, vetores intercalados e sparse compatíveis; não é oráculo
para sparse de matriz/padding que a versão instalada não cobre integralmente.
Esses casos usam fixtures explícitas e validador, além do texto normativo.

## Evidência

23 testes de domínio e um de pureza adicionados. Focais junto dos leitores
anteriores: 62 passaram, zero falhas, 964 expectativas. Tipos e Biome/732 passaram.
Integral: 1.695 testes, zero falhas, 245 arquivos, 91,02 s e 8.197.082 expectativas.
Vite/1,04 s e Kids: compilação/5,4 s, tipos/8,4 s, 59 páginas/11,6 s passaram.
Diff check passou. Sem UI de importação, GPU/hardware ou formato público ativado.

Base: [glTF 2.0, §§3.6.2 e 5.1–5.4](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
