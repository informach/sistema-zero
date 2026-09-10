# Avaliação de curvas glTF, lote 151

## Contrato e escolha

Preparar somente o canal explicitamente escolhido de uma animação já lida pelo
contrato do lote 150. Não inferir nó para alvos não resolvidos: erro `unsupported`
antes de abrir os valores. Fontes são privadas e imutáveis por contrato durante
o uso do preparado. Capturar dois arrays uma vez, sem copiar toda a animação.
Cada amostra e os metadados de alvo devolvidos têm propriedade independente.

Não reusar `sampleSceneAnimationTrack`: ele normaliza inclusive chaves exatas e
representa smooth sem tangentes, sem equivalência ao formato glTF. Não mover
Three para o domínio: usá-lo como oráculo de integração. Implementação própria,
pequena, baseada nas fórmulas da especificação; nenhuma dependência nova.

## Semântica numérica

- Busca binária, sem estado de cursor/varredura linear, aceita seek fora de ordem.
  Antes/depois do intervalo devolver a primeira/última chave, como exige glTF;
  início positivo não é deslocado para zero. Nenhum loop/autoplay/FPS implícito.
- Nas chaves exatas e em STEP, copiar valores originais. Quaternion quantizado
  não é normalizado nesse caminho; sinais e zero negativo Float32 são mantidos.
- Linear vetorial usa soma ponderada, não subtração de extremos. Nenhum clamp de
  morphs/escala. SLERP usa menor arco, incluindo antípodas e ângulos próximos de
  zero. Entre chaves, interpretar quaternions quantizados como orientações
  unitárias; normalizar o resultado, sem reescrever os endpoints.
- Cúbica Hermite usa in/out tangentes multiplicadas pela duração real do segmento,
  não por FPS. Não inverter sinais/tangentes para forçar um arco de quaternion.
  Rotação interpolada é normalizada; quaternion zero é erro explícito e não
  identidade substituta. Chaves exatas continuam utilizáveis na mesma curva.
- Tempos de consulta precisam ser finitos. Dados de origem já são Float32 ou
  inteiros normalizados finitos; produtos grandes de tangente e duração cabem
  em Double e não são recortados para Float32/nativo silenciosamente.

## Review e regressões

- Todas as curvas preservam chaves/clamp, ownership e dados originais; caso
  quantizado realista com componentes permitidos e caso Float32 de zero negativo.
- STEP/linear com uma chave, múltiplos segmentos, seek reverso e tempos fracionários.
- Polinômio cúbico independente com derivadas conhecidas em intervalo de três
  segundos, 101 consultas para TRS e sete morphs; tangentes externas ignoradas.
- SLERP contra Quaternion Three em 495 consultas: dot negativo, antípodas,
  quarto de volta, ângulo pequeno e quantização. Normas unitárias conferidas.
- Cúbica de rotações antípodas produz zero no meio: erro comprovado, sem alterar
  extremos; instantes dos dois lados continuam válidos. Sem fallback encobrindo.
- Intervalo 2^-149 consultado em subpasso Double, coordenadas/tangentes próximas
  de 3e38 e resultado cúbico próximo de 1e76 mantidos finitos.
- 65.536 chaves, mil seeks determinísticos fora de ordem, dois getters abertos
  na preparação e nenhum reaberto por consulta. Isso não é medição de pico de
  RAM/p95/GPU; complexidade O(log chaves + componentes) verificada no código.
- GLB real das quatro propriedades × três curvas, lido pelo pipeline e pelo
  Three: dez tempos fora de ordem em cada um, incluindo extremos e início positivo,
  comparados ao AnimationMixer real. Recursos e mixers descartados ao encerrar.

Não gera clipes nativos, bindings, pose de cena, prévia 3D ou UI de importação.
Formato público, persistência e viewport permanecem iguais. Conversão e revisão
de perdas precisam distinguir chaves originais de valores interpolados normalizados.

## Evidência

Focais: 226 testes, zero falhas, 20 arquivos, 24.807 asserts, 7,22 s. Biome: 790
arquivos sem problemas. Tipos passaram. Integral: **1.851 testes, zero falhas,
259 arquivos, 8.220.808 asserts, 111,08 s**. Vite: 1,10 s; aviso de chunk Three
>500 kB permanece. Kids: compilação 5,9 s, tipos 22,1 s, 59 páginas em 701 ms.
Diff check passou. Sem homologação visual, GPU, toque ou usabilidade infantil.

Fontes: [glTF, comportamento do sampler](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations),
[fórmulas de interpolação](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#appendix-c-animation-sampler-interpolation-modes),
[Three GLTFLoader r184](https://github.com/mrdoob/three.js/blob/r184/examples/jsm/loaders/GLTFLoader.js).
