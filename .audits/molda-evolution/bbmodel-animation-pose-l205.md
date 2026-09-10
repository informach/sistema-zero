# Revisão de valores locais de poses bbmodel — lote 205

Implementação, review e verificações concluídos em 09/09/2026.

## Contrato

Preparador puro de valores locais absolutos para `space: local`, sobre pose-base
padrão de grupo e ponto numérico já validado/migrado. Não é multiplicação
`local-delta`, binding de bone ou aprovação de flags do animador. Rotação global,
interpolação quaternion, IK, múltiplos clipes empilhados e bounds mundiais
precisam de tratamento separado pelo conversor, não são inferidos deste mapper.

Opções são validadas antes da base. Base exige ZYX, sem rescale e escala unitária;
isso não dispensa o vínculo explícito ao grupo correto. Captura posição local e
radianos-base próprios uma vez. Cada conversão confere canal/peso finito não
negativo antes dos pontos e produz valores/diagnósticos próprios. Não lê origin,
world, geometria, raw expressions ou a rotação quaternion-base para tentar
reconstruir ângulos autorais. A conversão de graus foi extraída para
bbmodelRadians, compartilhada com o leitor de repouso sem mudar sua fórmula.

Posição é base local + deslocamento ponderado. Rotação é soma de radianos
ponderados aos ângulos-base, depois quaternion ZYX. Peso é aplicado antes da
representação periódica: não normalizar voltas antes dele. Não converter a
animação em produto baseQuat × deltaQuat, que daria outra orientação e deslocaria
pivôs/posição. Cada chamada recebe peso numérico explícito; não resolve o caso
blend_weight number 0 versus string '0' ou seus defaults de origem.

Escala segue 1+(valor-1)*peso na ordem de cálculo da origem. Zero derivado inclui
cancelamento de ponto flutuante, não só literal zero. `zeroScale` é reject por
padrão, ou escolha explícita preserve-zero/source-minimum. O segundo usa 0,00001,
o primeiro mantém zero; ambos identificam componentes afetados. Valores negativos
não são convertidos em positivos nem recebem piso.

Resultados não finitos e fora da faixa F32 local são diagnósticos, sem saturação,
fallback zero ou array parcial. Valores não zero que virariam zero em F32 são
mantidos F64 e listados em underflowComponents. São componentes locais (inclusive
quaternion), não uma afirmação de perda visual ou validação da matriz mundial
animada. Não usar esse teste isolado para aprovar parent/world/geometry bounds.

## Review e evidências

Pesquisa primária fixada em `bbmodel-animation-research.md`, incluindo reset de
pose/escala da origem, soma de rotação, ponderação e escala zero. Nenhum código
GPL/Molang executado ou incorporado. Three.js 0.184.0 já instalado só como oracle
de testes; API Object3D/Euler/Matrix4 conferida via Context7 e testes existentes.

Três versões atravessam envelope/grafo/seleção/rest/keys/tracks/sampler reais.
Comparação independente de pose com pai em múltiplos pesos; matrizes locais e
mundiais e leitor nativo de clipe. Contraprova mostra que base × delta gera
outro deslocamento. Outras provas: pivôs/fonte intactos, snapshots próprios de
base/opções, diagnósticos isolados, rejeição de base não padrão, canal/peso antes
de pontos, peso zero sem fallback um, escala negativa/cancelamento/piso escolhido,
F64/underflow e estouros numéricos antes da criação de valor nativo.

Review acrescentou prova de várias voltas com peso fracionário, para impedir
normalização precoce. Tipos encontraram dois problemas na fábrica dos testes:
narrowing de animador não sobrevivia à função declarada, e snapshot por spread
inferia number[] em vez de tupla no overload de expect. Capturado o valor
discriminado após o guard e anotada a tupla real; sem casts, supressões ou mudança
no contrato de produção para passar a verificação.

- Primeira rodada mapper/rest/matriz: **23 passes, zero falhas, 19.500 asserts,
  476 ms** (`2a7dbe`), anterior à prova extra de voltas.
- Tipos finais exit 0 (`7fc0f6`/`2e4c36`), Biome **1.054 arquivos**, exit 0 (`02450c`).
- Focal final **336 passes, zero falhas, 40.358 asserts, 24 arquivos,
  14,31 s** (`63169d`), incluindo pipelines estáticos e glTF.
- Integral: **2.560 passes, zero falhas, 8.339.811 asserts, 336 arquivos,
  161,28 s** (`6ecee7`).
- Vite: exit 0, **1,15 s** (`2a05c9`); workers bbmodel 171,29 kB,
  glTF 182,98 kB, CSS 53,86 kB e Three 579,29 kB. Aviso de chunk mantido.
- Kids: exit 0 (`15d485`), compilação **5,9 s**, tipos **10,2 s**, 59 páginas
  em 593 ms. Diff exit 0 (`f2a465`), apenas três avisos CRLF anteriores.
- Ausência dos avisos act do lote 203 nesta integral não prova correção deles.

## Limitações

Sem clipe completo, escolha de duração, amostragem de tempo, leitura de peso
Molang, rotação global/quaternion/IK, validação mundial de todos os quadros,
relatório final, worker/adaptação/consentimento. Formato público e nuvem intactos.
Não é benchmark, homologação em browser/GPU/toque ou validação com crianças.
