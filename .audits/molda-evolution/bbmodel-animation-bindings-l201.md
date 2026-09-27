# Revisão de vínculos de animação bbmodel — lote 201

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Contrato e decisões

Planejador puro sobre grafo, metadados de nós, declarações de keys e seleção
correspondentes/imutáveis. Não lê valores/curvas, não modifica seleção nem produz
clipes. Preserva índices de clipe/animador/nó e referência/path literais.

Bone/tipo ausente pode apontar para grupo. Efeitos literais, tipos desconhecidos,
armature_bone e null_object ficam unresolved por tipo: conhecer seus descritores
no leitor 199 não aprova pose/IK na conversão. UUID conhecido apontando para
elemento/cubo/malha fica target-type; não transforma animador de grupo em animação
direta de peça nem tenta esconder o conflito por um nome alternativo.

Referências UUID seguem a regra específica da origem: 36 caracteres lowercase
hexadecimais 8/4/4/4/12, sem restrições de bits RFC. Não normalizar IDs para
lowercase nem inferir uma referência UUID de todo identificador literal aceito
pelo grafo. UUID existente prevalece sobre nome decorativo; UUID ausente só pode
usar fallback pelo nome declarado com política explícita.

`nameReferences` é reject por padrão, ou unique-name mediante escolha. Nomes
usam lowercase como a origem, sem trim. Chave antiga por nome precede nome
declarado; se chave tem candidatos ambíguos, não fugir para outro nome. Nome
declarado ausente/vazio não gera fallback. Referências não resolvidas distinguem
política, ausência, ambiguidade e incompatibilidade de tipo.

Índice de nomes é construído uma vez por chamada e apenas se habilitado; inclui
todos os grupos, mesmo omitidos/fora do outliner. Reduzir a seleção não pode
ocultar homônimos de origem. Guardar contagem+primeiro índice de candidato, mas
só usar índice quando a contagem é um; sem arrays de candidatos duplicados para
cada animador ou busca repetida em todos os nós.

Um segundo passo marca TODOS os animadores que disputam o mesmo grupo em um
clipe. Não escolher vencedor ou mesclar trilhas; animadores vazios e alvos fora
da seleção também participam. Outro clipe pode usar o mesmo grupo normalmente.
Alvo não selecionado mantém índice e selected false, não vira missing. Contagens
são por entrada de animador, incluindo omittedTargets em vínculos/conflitos.

Saída com opções/arrays/diagnósticos próprios, sem reter objetos raw ou copiar
listas de keys. Validação de opções vem antes de qualquer leitura dos inputs.
Orçamentos globais já conferidos pelos leitores e seleção anteriores, sem nova
estimativa de memória, transformação/derivação de valores ou cache global.

## Pesquisa e review

Referências primárias e trechos documentados em `bbmodel-animation-research.md`:
animation.js, math_util.js, timeline_animators.js e tipos base da origem no commit
fixado. Implementação própria; nenhuma execução do Blockbench ou de Molang.

Review conferiu prioridade UUID/nome, equivalência literal versus regra de
referência de animação, ambiguidade com omitidos, conflitos locais ao clipe,
metadados vazios, coleções próprias e ausência de leitura de pontos. Tipo
InitialBinding exclui conflito antes da contagem, refletindo os dois passos
explicitamente. Sem casts/supressões no domínio, fallback de sucesso ou adoção.

### Correção de causa encontrada no review completo

O leitor 199 tinha adotado o default rotation do construtor Keyframe para canal
ausente. A conferência de `animation.js` → `GeneralAnimator.addKeyframe` mostrou
que o carregamento só chama o construtor quando há canal aceito. Portanto uma
chave sem canal não podia virar rotação. Regressão mínima reprovou antes da
correção (`21c48f`: ausência não lançava diagnóstico); leitor agora exige canal
string não vazio e não inventa movimento a partir desse caso.

Fixtures canônicas declaram rotation explicitamente. A fábrica dos testes do
leitor fornece o campo-base somente quando não foi especificado; nunca repara
channel explicitamente undefined/null/inválido. A regressão fornece undefined
que JSON omite, provando o caso ausente real. Sondas de getters preservadas sem
spread das fixtures raw. Tetos de texto ajustados à presença real de channel,
mantendo prova de limite exato e +1, não aumentando tetos de produção.

Primeira integral de vínculos passou (2.477/0, 331 arquivos, 147,21 s), mas não
aprova o código após essa correção. Verificações devem ser reexecutadas. Focal
keys/constantes/vínculos após correção: **33 passes, zero falhas, 8.374 asserts,
540 ms** (`cda31c`), incluindo regressão antes vermelha.

## Evidências

- Três versões via envelope/grafo/metadata/seleção/keys reais. UUIDs mantêm nós
  originais, nome decorativo não redireciona destino, clipes independentes.
- Opções/defaults, fallback explícito e precedence, espaços/case/Unicode,
  IDs __proto__/constructor, uppercase UUID não normalizado, formatos incorretos,
  nome ambíguo incluindo grupos omitidos, alvo errado/ausente/excluído, tipos
  não suportados e colisões de três referências incluindo animador vazio.
- Ownership da saída, opções inválidas antes de ler inputs, ausência de valores
  raw e teste com 200 animadores verificando uma leitura de nome por grupo na
  construção do índice (nenhuma quando política reject).
- Vínculos: **10 passes, zero falhas, 63 asserts, 461 ms** (`227a7c`).
- Focal final após a correção: **197 passes, zero falhas, 11.371 asserts,
  11 arquivos, 8,20 s** (`963131`), incluindo pipeline estático/worker/UI anteriores
  e pureza. Focal anterior 196/0 (`1e9536`) foi substituído por esta verificação.
- Tipos finais exit 0 (`010734`), Biome **1.043 arquivos**, exit 0 (`82fe0d`).
- Integral final **2.478 passes, zero falhas, 8.331.847 asserts, 331 arquivos,
  164,54 s** (`ebce01`). Duração não é benchmark comparativo.
- Vite **1,31 s**, exit 0 (`2590d0`). JS mantém tamanhos: worker BB 171,29 kB,
  painel 46,47 kB, index 360,81 kB e Three 579,29 kB com aviso >500 kB. Binding
  privado ainda fora do grafo do importador. CSS 53,82→53,86 kB: `.lowercase`
  apareceu; o token está no comentário do novo leitor e no teste. `@source
  "../src"` varre também comentários de módulos puros/testes. Não renomear texto
  para mascarar geração incidental; escopo de varredura fica na pendência de
  arquitetura/CSS já observada no lote 192. Uppercase já existia em componentes;
  hipótese inicial descartada por busca no código.
- Kids: compilação **5,5 s**, tipos **10,3 s**, 59 páginas em 838 ms, exit 0
  (`da8704`). Diff exit 0, três avisos CRLF anteriores apenas.

## Limitações

Vincular não escolhe clipes/perdas, amostra curvas ou aprova a aplicação de
transformações. Ainda não há importação nativa de movimentos bbmodel na UI;
composição estática continua reject/omit. Formato público, ponte Studio e nuvem
inalterados. Sem medição de desempenho ou homologação browser/GPU/toque/crianças.
