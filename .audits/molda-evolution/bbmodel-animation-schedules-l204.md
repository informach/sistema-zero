# Revisão de agendas de animação — lote 204

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Contrato e compartilhamento

Helpers temporais puros unem os limites da janela, tempos autorais e grade
opcional de FPS. Inputs privados já são finitos/ordenados e a janela está na
faixa nativa, com FPS inteiro validado. Comparação de pertencimento usa i/fps
real; ceil/floor do produto servem apenas como aproximação inicial dos índices.
Sem epsilon, snap, Set/sort ou cópia dos tempos de origem. Valores próximos
distintos continuam distintos. Limites são emitidos mesmo sem ponto interior;
janela pontual tem um único instante.

Iteração é incremental, encerra a fonte ao passar o limite e também quando o
consumidor interrompe por orçamento. Fonte em memória, sem IO nem parser.
`gltfCubicSampleTimes` agora consome o helper compartilhado: mesma janela autoral,
array de saída próprio e erro budget específico do glTF. Não alterado o avaliador,
planejador de seleção, opções/UI ou semântica de CUBICSPLINE. Nenhuma correção de
bug glTF alegada sem reprodução; compartilhamento evita manter dois merges.

## Orçamento bbmodel

Draft privado identifica clipe/path original, duração/FPS nativos explícitos e
trilhas numéricas preparadas. Nenhuma inferência de length/snapping, target ou
curva. FPS 1..120 inteiro, duração positiva até 600 s; 64 clipes/4.096 trilhas
e 65.536 chaves no conjunto, não por clipe. Aliases de listas não economizam o
custo das trilhas nativas que serão realmente emitidas.

Review acrescentou escolha por trilha `authored` versus `grid`: uma trilha
que pode preservar seus tempos não deve receber milhares de chaves pela simples
presença de FPS alto. Escolha é do conversor após provar semântica do canal/curva,
não uma inferência oculta feita pela agenda. Grid mantém união dos tempos originais;
authored mantém tempos no intervalo mais limites. Não é autorização para usar
authored em curvas que precisam de bake ou para ocultar descontinuidades.

Primeiro confere metadados, cardinalidades e custo mínimo de cada modo. Depois
conta a união exata de TODAS as trilhas. Só após todos os limites caberem
materializa os arrays próprios de tempo. Sem leitura de XYZ/handles ou alocação
antecipada de agendas do prefixo. Trilha numérica vazia é inválida; clipe sem
trilhas continua explícito para o planejador de clipes decidir seu destino.
Chaves fora da janela não são apagadas da fonte: continuam disponíveis ao
avaliador como vizinhas da curva/clamp de extremo.

Saída retém índice de clipe original e índice de cada trilha no draft, sem raw
ou arrays compartilhados. Orçamento da fonte continua responsabilidade dos
leitores anteriores, por ocorrência; este é o orçamento das chaves resultantes,
não estimativa de RAM/CPU nem validação completa de documento.

## Review e evidências

- Enumeração/Set independente como oracle dos tempos, incluindo 1.620 janelas
  ao redor de limites F64 de grade, nove taxas, pontos adjacentes e subnormais.
- Proveniência e duração/FPS explícitos em três versões via leitores reais,
  ownership, modo misto e exemplo de 600 s/120 FPS com três tempos autorais.
- Tetos exatos de 64 clipes, 4.096 trilhas e 65.536 chaves. +1 com tempo off-grid
  na última trilha reprova; getter no primeiro tempo prova que nenhuma agenda do
  prefixo foi materializada. Custo mínimo excedido para antes dos tempos.
- Opções/modes/duração inválidos antes dos valores, nenhuma leitura XYZ/handles,
  fonte/pontos fora da janela intactos e fechamento dos iteradores.
- Primeira rodada 14/0 (`caed5b`); depois da escolha de modos, núcleo + regressões
  glTF: **60 passes, zero falhas, 5.330 asserts, 8 arquivos, 6,10 s** (`d8f2df`).
- Tipos finais exit 0 (`18ffd5`/`1f7f16`), Biome **1.052 arquivos**, exit 0 (`b40a9a`).
- Focal ampliado **311 passes, zero falhas, 20.839 asserts, 21 arquivos,
  14,50 s** (`cecbe2`). Integral **2.548 passes, zero falhas, 8.339.295 asserts,
  335 arquivos, 164,57 s** (`b8f1ff`). Sem os avisos act da rodada 203 nesta
  execução; ausência não prova correção. Tempos não são benchmark comparativo.
- Vite **1,09 s**, exit 0 (`8fab0f`). Worker glTF 182,68→182,98 kB pelo helper
  compartilhado; CSS 53,86 kB, worker BB 171,29 kB, painel BB 46,47 kB, index
  360,81 kB, Three 579,29 kB (>500 kB) mantidos. Hashes de importação mudaram,
  sem alegação de ganho de carga por esse refactor.
- Kids: compilação **5,8 s**, tipos **9,9 s**, 59 páginas em 731 ms, exit 0
  (`312f19`). Diff exit 0 (`127ccb`), só três avisos CRLF anteriores.

## Limitações

Não escolhe duração/reprodução, transforma poses, amostra valores nem adota
clipes. FPS/agenda não prometem equivalência contínua ou preservação de saltos.
Conversão, políticas/remainder/relatório/worker/consentimento ainda precisam usar
esses planos completos. Sem medição em hardware/GPU, homologação infantil ou
ativação do formato público. Avisos act da integral 203 permanecem registrados,
sem supressão nem alegação de correção pela ausência em uma rodada posterior.
