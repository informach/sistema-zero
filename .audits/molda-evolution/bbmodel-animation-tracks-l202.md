# Revisão da preparação de trilhas bbmodel — lote 202

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Contrato

Preparador puro por canal conhecido, sobre descritores já validados/orçados e
fonte imutável. Não vincula alvos, decide pose/IK, avalia texto nem gera clipes.
Outros canais não são aprovados pela preparação de um canal. NullObject admite
apenas posição; canal incompatível é diagnóstico, não sucesso vazio.

Preflight de todas as formas do canal antes das constantes: interpolation
linear/step/catmullrom/bezier, um ou dois pontos, pré-condições da migração antiga.
Mais pontos não são truncados ao limite da UI de origem. Lista própria de
referências é ordenada por comparação de tempos, sem subtração que possa
transbordar, epsilon, arredondamento ou alteração da lista original. Tempos
iguais, inclusive +0/-0, rejeitam o canal inteiro antes dos valores. Chaves
negativas, muito próximas e fora da duração são preservadas para o sampler.

Índices/paths originais permanecem nas chaves preparadas; reordered indica mudança
de ordem. Pontos numéricos e todos os vetores Bezier são próprios. Ângulos Euler
não são normalizados e não viram quaternions. Saída não resolvida tem o primeiro
bloqueio encontrado pela ordem dos gates, sem trilha parcial ou lista que finja
inventariar todas as perdas do clipe. Diagnósticos de constantes por chave ficam
limitados a seis eixos pela cardinalidade já conferida.

## Migração e review

Pesquisa detalhada em `bbmodel-animation-research.md`. Não basta multiplicar todo
X/XY por -1: codec pré-5 roda antes do construtor/alias. Ausência de data_points
é não resolvida; lista vazia usa direto sem inversão. Pontos explícitos invertem
X em posição/rotação e Y em rotação, exceto eixos substituídos por values.
Valor-pai truthy de tipo incompatível não fica escondido pelo overlay. Escala
não troca sinal. Nenhuma expressão é avaliada, inclusive em campos sobrescritos.

Bezier ativo só inverte par de valores se left foi declarado. Par antigo
incompleto fica explícito; right-only, defaults e handles inativos não recebem
inversão indevida. Todos os tempos são preservados. Contagens de migração são
mudanças de sinal de escalares não zero, não perda/consentimento. Zero assinado
fica preservado, sem afirmar equivalência binária com parser/fallback de origem.

String decimal antiga que a reescrita numérica serializaria como exponencial
fica legacy-literal-rewrite; não interpretar uma gramática não aprovada. Fonte
JSON numérica finita não sofre esse caminho intermediário e mantém F64.

Review conferiu precedência codec/construtor/overlay, caminhos diagnósticos,
ownership, nenhuma truncagem/deduplicação, canais separados e pureza. O código
permanece privado e fora do importador estático. Sem dependência nova, execução
de Blockbench/Molang, caches globais ou adoção de fonte.

## Evidências

- Testes próprios: **21 passes, zero falhas, 202 asserts, 441 ms** (`f1b742`).
  Três versões via JSON/envelope/leitores reais, pre/post, valores/tempos extremos,
  duplicatas antes dos escalares, curvas/pontos não suportados, todas as alças,
  exceções da migração, alias, ausência de resultados parciais e fonte intacta.
- Tipos exit 0 (`7d45cf`/`e45fad`). Biome **1.046 arquivos**, exit 0 (`93dcdd`).
- Focal **219 passes, zero falhas, 11.575 asserts, 12 arquivos, 8,15 s** (`6c8178`),
  incluindo importador estático/worker/UI e pureza.
- Integral **2.500 passes, zero falhas, 8.332.030 asserts, 332 arquivos,
  163,63 s** (`ff93f4`). Duração não é benchmark comparativo.
- Vite **1,13 s**, exit 0 (`6deef1`); chunks preservados: CSS 53,86 kB,
  worker BB 171,29 kB, painel 46,47 kB, index 360,81 kB, Three 579,29 kB com
  aviso >500 kB. Preparador ainda fora do grafo público/de importação.
- Kids: compilação **5,6 s**, tipos **9,7 s**, 59 páginas em 639 ms, exit 0
  (`590e51`). Diff exit 0 (`b03def`), só três avisos CRLF anteriores.

## Limitações

Não é sampler, conversor de transformações/clipes nem extensão da UI. Duração,
loop, global rotation/quaternions, orçamentos nativos conjuntos, políticas de
perda, remainder, relatório, worker e consentimento permanecem separados.
Sem benchmark de hardware, homologação visual/toque ou ativação do formato público.
