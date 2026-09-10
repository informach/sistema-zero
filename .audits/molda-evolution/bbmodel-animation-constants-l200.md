# Revisão de constantes de animação bbmodel — lote 200

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Contrato

Classificador próprio sobre escalares já validados e orçados pelos leitores
198/199. Number finito mantém seu F64/±0. String só se torna constante após uma
varredura completa do subconjunto literal confirmado na origem: menos opcional,
parte inteira obrigatória, fração opcional com dígitos obrigatórios e sufixo f/F
somente depois da fração. Aceita whitespace externo, não espaços internos,
expoentes, bases alternativas, operadores, parênteses, return ou instruções.
Não usar parseFloat permissivo nem gramática Number sem conferência prévia.

Resultado distingue constante, texto não resolvido e literal fora do alcance F64.
Overflow não vira Infinity/zero; underflow de decimal não zero não desaparece em
zero silencioso. Um texto todo zero continua constante, inclusive -0. Arredondamento
decimal→F64 segue a representação numérica da origem; isso não promete aprovação
F32, grau/quaternion ou igualdade bit a bit com o fallback ||0 do parser original.

Preparador opera por chave transformável validada, até mil pontos. Ou fornece
todos os XYZ próprios, ou fornece todos os diagnósticos de eixos não resolvidos,
sem coordenadas parciais. Caminhos derivam de point.path + aliasSource no momento
do diagnóstico, sem ler valores raw novamente. Prefixo constante seguido de erro
também não retorna pontos. Não omitir/reordenar pontos, alterar handles, migrar
eixos 4.x, resolver alvos ou avaliar curvas. Agregação futura de diagnósticos na
conversão continua sujeita ao orçamento global de relatório existente.

## Pesquisa e review

Fonte primária Blockbench no commit fixado e MolangJS 1.7.0 no commit
f1cf8548b756c8a2f2f2277cc23099e503f53e49, descritos com links no documento
`bbmodel-animation-research.md`. Somente leitura; nenhuma dependência instalada,
parser executado ou implementação copiada. O classificador não é um parser Molang
e deliberadamente não resolve nem expressões que pareçam constantes.

Tipos discriminados impedem confundir texto com zero. Tuplas XYZ conferidas sem
indexação opcional artificial; nenhum cast/supressão/fallback. Funções privadas
consomem a fonte normalizada e imutável, não substituem validação externa de
números/bytes/limites nos leitores anteriores.

## Evidências

- Literais decimais/sufixo, zeros assinados, F64 extremo e subnormal mínimo;
  overflow/underflow distintos de zero; lista de sintaxes rejeitadas pelo
  subconjunto permanece texto inerte, sem avaliação ou parsing parcial.
- Oracle independente: milhares de numeradores inteiros/100 comparados com sua
  escrita decimal e sufixo, sem executar Molang. Não é teste da gramática completa
  do parser nem homologação de aparência/reprodução.
- Três versões do envelope até keys/constantes, pontos/ângulos preservados sem
  migração pré-5, ownership, alias/direct paths, 1.000 pontos ou 3.000 diagnósticos
  completos e sondas de acesso provando ausência de releitura de valores raw,
  scripts, flags e handles.
- Leitores: **32 passes, zero falhas, 8.894 asserts, 3 arquivos, 1,235 s**
  (`59ce7d`). Focal ampliado: **185 passes, zero falhas, 11.301 asserts, 10 arquivos,
  8,43 s** (`7fbd4e`), incluindo composição, worker/receptor, UI/hook e pureza.
- Tipos exit 0 (`ad07f1`); Biome **1.040 arquivos**, exit 0 (`e8429c`).
- Integral **2.466 passes, zero falhas, 8.331.757 asserts, 330 arquivos, 156,54 s**
  (`37d565`). Duração não é benchmark comparativo de desempenho.
- Vite **1,50 s**, exit 0 (`7be3e1`), mesmos chunks/tamanhos do lote 199:
  worker BB 171,29 kB, painel 46,47 kB, CSS 53,82 kB, index 360,81 kB e Three
  579,29 kB com aviso >500 kB. Preparador privado ainda fora do grafo do importador.
- Kids: compilação **6,7 s**, tipos **10,8 s**, 59 páginas em 609 ms, exit 0
  (`a30a58`/`8924fb`). Diff exit 0, três avisos CRLF anteriores apenas.

## Limitações

Importador continua estático com reject/omit explícitos para movimentos. Preparar
constantes não habilita clipes: binding, seleção, curva/tempo, migração de eixos,
relatório/worker/UI permanecem necessários. Formato público, Studio, nuvem e
dependências inalterados. Sem benchmark novo ou validação browser/GPU/toque/crianças.
