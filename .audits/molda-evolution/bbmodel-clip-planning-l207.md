# Revisão de planejamento e conversão de clipes bbmodel — lote 207

Implementação, review e verificações concluídos em 09/09/2026.

## Contrato e integração

`planBbmodelClips` liga estrutura, descritores, bindings e preparação numérica.
Contexto privado contém envelope/grafo/metadados/seleção/repouso/mapa de IDs da
mesma leitura estática. Todas as opções são estritas antes da fonte. Leitores
validam todos os campos conhecidos antes das decisões por clipe; omitir um clipe
incompatível não autoriza ignorar campos conhecidos malformados em outro clipe.

`convertBbmodelClips` é a entrada única de composição com o assembler 206.
Encaminha apenas as três opções aceitas por ele, mantendo validação estrita em
cada fronteira. Converte clipes próprios e devolve relatório agregado completo
sob teto de texto. Ainda não adota documento nem modifica worker/UI.

Somente bone vinculado a grupo selecionado e modo Euler local passa. Referências
ausentes, ambíguas, conflitantes, alvos omitidos, efeitos/canais/tipos não
suportados, flags global/quaternion (inclusive animador vazio) e trilhas não
resolvidas impedem o clipe inteiro. `unresolved: omit-clip` registra o primeiro
motivo; não aproveita só as partes que conseguir converter. Erros de orçamento,
dados malformados, inconsistência interna e falhas numéricas durante sampling
não são engolidos por essa política. Pre/post também passa pelo gate de clipe.

Duração `declared` exige length positivo até 600 s. `fit-keys` usa o maior tempo
de todas as trilhas retidas, com mínimo de um quadro no FPS escolhido. Não é
getMaxLength do Blockbench: não descarta sua última chave Catmull nem interpreta
snapping como FPS. Clipes sem trilhas são explícitos. FPS inteiro 1..120, default
24; clipes/trilhas retidos têm orçamento nativo, omissões não consomem esses slots.

Reprodução é independente: once/hold viram nativeLoop false, loop vira true;
relatório guarda origem e adaptação. Não equivale ao término once, offset temporal
de loop ou empilhamento da origem. Vizinho Catmull circular permanece false no
free estudado; não confundir loop temporal com animation_loop_wrapping.

Peso usa literal aprovado pelo classificador 200, sem executar Molang. Fonte
falsy vazia/number ±0 significa default 1; texto '0' resulta em peso zero. Negativo
finito vira zero com clamped true; defaulted e valor ficam no relatório. Expressão
ou literal fora de faixa impede clipe. anim_time_update/start_delay/loop_delay
diferentes de string vazia continuam sem suporte, inclusive number 0; não são
normalizados nem tratados como um default sem validação dessa semântica.

## Campos e relatório

Metadados de editor e campos não mapeados têm escolhas independentes reject/discard.
Classificação não lê valores desconhecidos. Markers são subárvore de metadados
descartada explicitamente; campos desconhecidos dentro dela não são percorridos.
XYZ direto versus sombra sob data_points, parent axes substituídos pelo alias e
conteúdo de point.values são distinguidos. Handles podem participar de um segmento
misto mesmo quando a própria chave é linear; não classificá-los como inativos
apenas pelo método da chave. Posições e handles originais não são alterados.

Relatório conta ocorrências descartadas e dá o primeiro caminho de cada categoria,
não uma lista exaustiva de caminhos. UUID de origem, índice, duração, reprodução,
peso, uso de nomes, markers e animadores vazios preservam proveniência. Omissão
reporta somente o primeiro impedimento. A futura UI deve descrever esse alcance
e manter os originais disponíveis, sem apresentar exemplos como lista completa.

Collector limita relatórios do planejamento e a entrada de conversão limita a
estrutura agregada inteira. O relatório final do importador ainda precisa contar
essas informações junto às outras etapas. Arrays de valores não são incluídos
no relatório. Native sample budgets continuam anteriores à geração de valores.
Relatório agregado é conferido antes de devolver resultado, não antes do sampling.

## Review e evidências

Fonte primária fixada do estudo anterior; relidos animation.js (campos de tempo)
e animation_mode.js 314–348 para peso falsy/clamp/stack. Nenhum código da origem
incorporado/executado, sem dependência de parser. Contratos fonte 198–206 mantidos.

- Três versões por leitores reais até clipes nativos e reader estrito. Fonte
  intacta, migração de eixos, peso, duração/FPS próprios e relatórios verificáveis.
- Primeira rodada 6/6 falhas (`d62f16`): integração passava política ampla ao
  assembler estrito; centralizada a projeção das opções na entrada real de
  conversão. Corrigidas expectativas de paths para o helper com colchetes/quotes.
  Nenhum relaxamento de validação nem casts para esconder divergência.
- Após integração: 12/0 (`33a817`). Review ampliou para 14/0, 122 asserts,
  534 ms (`414105`): referência por nome/conflito e 512 alvos longos. Fonte cabe,
  1.536 trilhas repetem paths e excedem teto do relatório; erro explícito report.text.
- Políticas antes da fonte, vazio explícito, pre/post, unsupported modes mesmo
  vazios, nenhuma animação parcial, malformado conhecido antes da omissão,
  orçamento de 64/+1 clipes, sem consumir slot pelo clipe omitido.
- Tipos finais exit 0 (`aff097`/`0cd335`); Biome **1.063 arquivos**, exit 0
  (`f7c24f`). Focal **313 passes, zero falhas, 17.160 asserts, 18 arquivos,
  9,30 s** (`67d72b`). Integral: **2.590 passes, zero falhas, 8.340.181 asserts,
  338 arquivos, 164,44 s** (`8084bf`). Ausência de avisos act não prova correção
  da interação registrada no lote 203.
- Vite: exit 0, **1,20 s** (`2d84bb`), bundles/hashes mantidos; aviso Three
  579,29 kB permanece. Kids: exit 0 (`21ba7b`), compilação **5,3 s**, tipos
  **11,3 s**, 59 páginas em 726 ms. Diff exit 0 (`e12ac9`), três avisos CRLF
  anteriores. Tempos não constituem benchmark comparativo.

## Limitações

Clipes ainda privados. Controller/remainder do documento inteiro, bounds mundiais,
relatório do importador, protocolo, worker, UI, prévia/consentimento e adoção
precisam da integração seguinte. Nenhuma alegação de equivalência contínua,
benchmark, GPU, toque ou homologação infantil. Formato público permanece 1.
