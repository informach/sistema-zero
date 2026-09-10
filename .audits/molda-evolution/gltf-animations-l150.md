# Leitura de canais e curvas glTF, lote 150

## Contrato

Leitor puro recebe fontes já conferidas: grafo, malhas, skins e accessors próprios.
Saída possui nomes, canais, alvos e índices de input/output por sampler. Preserva
STEP/LINEAR/CUBICSPLINE (default LINEAR), tempos, quaternions e tangentes; não cria
clipes nativos, não reamostra, não normaliza e não inicia reprodução.

Alvos core com nó são discriminados de alvos não resolvidos. `node` ausente não
vira zero. Paths desconhecidos permanecem explícitos como não resolvidos; o JSON
original segue necessário para revisar extensões e perdas. Interpolação textual
desconhecida é `unsupported`, não fallback para LINEAR. Isso não é suporte a
KHR_animation_pointer ou importação completa de animações.

## Semântica

- Samplers/canais obrigatórios, não vazios/densos e com referências válidas.
  Cada clipe possui no máximo um canal por nó/path; clipes diferentes podem
  compartilhar alvos. Alvos sem nó não são declarados equivalentes por suposição.
- Tempos SCALAR/Float32, não normalizados, com min/max já verificados pelo leitor
  numérico; não negativos/estritamente crescentes. Um tempo é válido para STEP/
  LINEAR; CUBICSPLINE exige dois. Não cortar início/duração para o limite nativo.
- Formatos de saída por path: VEC3 float para posição/escala; VEC4 float ou inteiro
  normalizado de 8/16 bits para rotação; SCALAR dos mesmos tipos para morphs.
  Contagem considera tempos × morphs × tripla cúbica. Sem nó, morph não inventa
  cardinalidade e continua não resolvido. Nós core animados não declaram matrix.
- Quaternion das chaves, não das tangentes, conferido com tolerância 0,00769 do
  validador Khronos, que inclui quantização signed 8-bit. Dados não são ajustados:
  a conversão nativa terá que resolver explicitamente seu contrato mais estrito.
  Antípodas não são invertidas. Isso não prova que toda interpolação cúbica entre
  chaves produzirá quaternion não nulo; sampling precisa tratar essa condição.
- Accessor de tempos não pode também ser output/atributo/índice/IBM. Views de
  animação não podem usar target/stride nem compartilhar vértices/índices/IBM.
  Input/output distintos podem compartilhar uma view compacta de animação.
  Storage sparse e valores finitos já vêm do leitor numérico; imagens têm seu
  contrato separado de roles. Não anunciar isso como validador glTF completo.

## Orçamentos e arquitetura

1.024 clipes, 65.536 samplers e 65.536 canais agregados. Conferir comprimentos
antes de copiar/abrir os elementos. Após metadados, orçamento de 4.194.304 valores
de trabalho para tempos únicos e chaves de quaternion por interpretação. Conferir
tudo antes de abrir os arrays numéricos. Accessors já têm seu próprio teto de
valores/alocação do lote 140; este é um limite adicional de trabalho.

Caches pertencem à leitura: input é conferido uma vez; quaternion é indexado por
accessor + presença de tangentes. Dados compartilhados como LINEAR e CUBICSPLINE
não podem reutilizar a mesma decisão, pois algumas tangentes viram chaves.
Não duplicar Float64 por canal, copiar apenas metadados. Sem nova dependência.
Leitor, validação de canais, tipos e plano/conferência numérica têm módulos próprios.

## Review e testes

- Propriedade dos metadados, dados originais intactos e releitura após mutação.
- Referências/campos ausentes/null/holes/tipos, duplicatas, matriz e morph ausente.
- STEP/LINEAR/cúbica, tempos subnormais e duração de uma hora preservados;
  tempos negativos/iguais/decrescentes recusados sem snap.
- Todos os tipos de rotação/morph, quantização signed e pesos negativos aceitos
  quando permitidos; tangentes não unitárias não são normalizadas como chaves.
- 1.024 clipes compartilhados abrem dois arrays uma vez. Outro tipo de curva
  obriga outra interpretação do mesmo output. Caches não atravessam leituras.
- Tetos exatos de canais/samplers e teto exato de trabalho (inclusive duas
  interpretações), ainda dentro do orçamento anterior de accessors. Um valor
  além falha antes dos getters, sem mocks de produção.
- GLBs reais das quatro propriedades × três curvas × packed/sparse confrontados
  com validador e arrays de tracks Three; rotações quantizadas também comparadas.
  Fixtures corruptas exigem os códigos reais de tempos/quaternion/count/matrix/
  stride/duplicação no validador. Exportações de IK/poses espelhadas do Molda
  mantêm todos os canais, tempos, valores e bytes (três avisos conhecidos de skin).
- Ajustes de fixtures: parâmetros literais para tipos, arrays de pesos isolados
  para assertions de ownership e quantidade de materiais na composição de leitores.
  Nenhuma regra de produção foi enfraquecida para fazer o teste passar.

## Evidência

Focais: 216 testes, zero falhas, 19 arquivos, 15.587 asserts, 7,17 s. Biome: 788
arquivos sem problemas. Tipos passaram. Integral: **1.841 testes, zero falhas,
258 arquivos, 8.211.592 asserts, 108,98 s**. Vite: 1,09 s. Kids: compilação 6,3 s,
tipos 8,8 s, 59 páginas em 412 ms. Diff check passou. Aviso de chunk Three >500 kB
permanece. Sem homologação visual/GPU/toque; formato público não foi alterado.

## Fontes

- [Especificação glTF: animações](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations)
- [Schema de animação](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/animation.schema.json)
- [Validador: canais, tempos e quaternions](https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/base/animation.dart)
- [Tolerância de quantização](https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/errors.dart)
- [Three GLTFLoader r184](https://github.com/mrdoob/three.js/blob/r184/examples/jsm/loaders/GLTFLoader.js)
