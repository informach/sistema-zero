# Revisão completa: áreas Programa e desempenho Python

Revisão do diff local de `fix/python-classic-performance-20261108`, sobre `8ee4b3fc9`, incluindo arquivos novos. Foram examinados área Programa, projeção/serialização, rascunhos, histórico, navegação da Ponte e tutor, montagem de SVGs, serviço de áudio, autorização dos exemplos, testes e evidências de desempenho.

Durante a revisão, o usuário esclareceu que Python ainda não tem projetos de alunos em uso. Compatibilidade com caches antigos de testes em staging não é critério de entrega. A exigência é que os exemplos prontos da galeria abram dentro de Programa; peças externas continuam como rascunhos.

**Resultado: os dois achados foram corrigidos e suas reproduções passaram no Chrome local.** A rodada completa de regressão passou nos 16 cenários selecionados. A checagem completa de tipos e a nova qualificação dos 104 exemplos / 164 arquivos também passaram. Nenhum dos achados desta revisão permanece aberto.

## P1 corrigido — Editar o código apagava rascunhos salvos

Local: `packages/studio/src/components/blocks/PythonBlocklyEditor.tsx`, persistência pelo `createPythonWorkspaceDraft` no caminho de apresentação; contrato em `packages/studio/src/python/blocks/workspaceDraft.ts`.

1. Abrir um arquivo com `x = 3` e `print(x)`.
2. Duplicar a atribuição e deixá-la fora de Programa. A interface mostra `Rascunhos · 1`; o estado salvo contém duas raízes.
3. Na Ponte, editar o código para `x = 4`.
4. Ao concluir a análise, a interface mostra `Rascunhos · 0` e o bloco solto desaparece.

Os rascunhos estavam armazenados apenas no cache da projeção, cujo `baseSource` precisava coincidir exatamente com o texto atual. `preservePythonWorkspaceDraft` descartava esse cache quando o arquivo mudava; em seguida, `load` limpava o workspace e o recriava exclusivamente da fonte. Os testes anteriores de persistência reabriam o mesmo código, sem cruzar uma edição textual.

Correção aplicada: a coleção de blocos passa à versão 2, com rascunhos por arquivo independentes do cache derivado da fonte e do buffer de recuperação. Os pontos de gravação do editor capturam Programa e rascunhos juntos; atualizar ou descartar apenas o cache mantém as peças externas. Reprojetar Programa restaura os rascunhos depois de vincular as origens ao código atual, evitando atribuir a essas peças referências antigas da fonte. A validação recusa áreas Programa e IDs duplicados no estado externo antes de anexá-lo.

Evidência: edição e desfazer no Monaco preservam o ID e o valor do bloco solto. O Pac-Man preserva os mesmos rascunhos ao alterar `velocidade`, salvar e reabrir pela persistência real. Os testes de IndexedDB cobrem código temporariamente inválido, descarte de edição pendente, renomeação de pasta, exclusão de arquivo e hidratação tardia. Comentários, posições e campos das peças são preservados. Não foi acrescentada migração de projetos antigos.

## P2 corrigido — Funções recolhidas em rascunhos ficavam sem acesso ao corpo

Locais: `packages/studio/src/python/blocks/programNavigation.ts` e `packages/studio/src/components/blocks/PythonBlocklyEditor.tsx`.

1. Criar uma atribuição e uma função, por exemplo `mover`, com um corpo editável.
2. Usar o menu para mover primeiro a atribuição e depois a função para Rascunhos.
3. Voltar a Programa e clicar em `Rascunhos · 2`.
4. A função permanece recolhida, o índice não a lista e o menu não oferece Expandir.

`reveal` recolhia todas as definições, inclusive as externas; o índice percorria apenas o corpo de Programa; o botão Rascunhos focalizava somente a primeira raiz. Com `collapse: false`, desaparecia também a alternativa nativa de expansão. Para editar o corpo, a pessoa precisava inserir a função de volta no código executável, contrariando o uso de rascunhos para experimentar sem executar.

Correção aplicada: o índice percorre também todas as raízes de rascunho e suas definições aninhadas, identificadas pelo prefixo “Rascunho ·”. A navegação usa o mesmo controlador para abrir ancestrais e remontar os SVGs. A peça continua fora do Programa.

Evidência: no Chrome, uma atribuição e uma classe são retiradas do Programa. Mesmo sendo a segunda raiz externa, a classe e suas funções aninhadas aparecem na busca. O teste abre `passo`, altera o literal de 73 para 74, volta a Programa e reabre a função. O código executável continua vazio e ambas as raízes permanecem salvas como rascunhos.

Também foi reproduzida a impossibilidade de expandir controles recolhidos em caches antigos. Esse caso não foi elevado a achado independente, considerando o esclarecimento do usuário sobre compatibilidade.

## Atualização da galeria feita durante a revisão

Os exemplos Python são armazenados como arquivos de código e materiais; não carregam um workspace Blockly pronto. O carregamento comum agora salva a área Programa assim que a projeção inicial termina, sem exigir uma edição ou um arraste. A fonte e os materiais permanecem intactos. A gravação respeita o modo observador e não transforma uma recuperação pendente em edição concluída.

Foi acrescentado `packages/studio/scripts/python/program-area-examples.ts`, que percorre todos os exemplos clássicos e todos os seus arquivos `.py`, usando o analisador CPython/WASM da distribuição local e os catálogos reais de cada extensão. A qualificação verifica uma única área Programa, ausência de peças do exemplo em Rascunhos, equivalência da AST e restauração do estado salvo.

**104 exemplos e 164 arquivos Python aprovados:** 20 Turtle, 58 Pygame Zero, 9 Raylib 2D, 8 Raylib 3D e 9 Pygame. As 106 apresentações Pro usam o editor de código e não precisam de uma área Blockly.

O cenário de galeria no Chrome passou a exigir a persistência inicial de Programa antes de qualquer gesto. Seletores antigos de categorias e do texto padrão da paleta foram atualizados para os rótulos atuais, sem alterar o comportamento do produto.

## Verificação e limites

- 162 testes distintos de blocos, áudio, estado, transações e persistência: aprovados (161 na suíte e um cenário adicional de hidratação tardia), com 2.338 asserções.
- 18 testes de autorização de cópia: aprovados, com 79 asserções.
- Qualificação integral dos 104 exemplos / 164 arquivos: aprovada.
- Build da interface de qualificação: aprovado; aviso já existente sobre tamanho dos chunks.
- Lint dos 29 arquivos de código alterados/novos: aprovado; `git diff --check` limpo.
- 16 cenários de regressão Chrome aprovados em uma única rodada: reproduções de P1/P2, galeria, gravação inicial, edição/salvamento/reabertura, navegação, tutor, curadoria, Ponte, histórico e Pac-Man por teclado/pixels. As sessões de análise pertencentes aos testes foram encerradas e verificadas.
- Typecheck completo da rodada de correção: aprovado, sem erros, em 257 segundos.

Na revisão anterior houve um timeout na inicialização do interpretador; o mesmo cenário passou isoladamente sem alterar o orçamento. Na rodada de correção, todos os 16 cenários passaram sem reexecuções. As fixtures de gravação consultam a partição pesada do adapter e devolvem apenas um resumo ao Playwright, em vez de transportar todo o workspace. A rodada não demonstra ausência de variação no tempo de inicialização.

A suspeita de que alterar a forma de uma classe fechada remontaria indevidamente seu corpo não se confirmou. Não foram encontrados novos defeitos reproduzíveis no pool de áudio ou na regra de autorização das variantes ocultas.

Os ganhos de desempenho continuam sendo os das medições documentadas em `2026-11-08-python-classic-performance.md`; esta revisão não os substitui por uma nova promessa de desempenho. A primeira reprodução de som e a tarefa inicial de aproximadamente 105 ms continuam como limites conhecidos.

Evidências da correção: `.cache/python-findings-unit.log`, `.cache/python-findings-hydration.log`, `.cache/python-findings-authorization.log`, `.cache/python-findings-chrome.log`, `.cache/python-findings-regression.log`, `.cache/python-findings-build.log`, `.cache/python-findings-all-examples.log`, `.cache/python-findings-typecheck.log` e artefatos Playwright em `packages/studio/.cache/`. As reproduções anteriores à correção continuam em `.cache/python-review-findings-final.log`.

Toda a revisão e a atualização da galeria são locais. Não houve commit, merge, push ou deploy nesta rodada, nem alteração de projetos ou permissões no staging. As sessões de análise foram encerradas e os servidores temporários de qualificação foram removidos ao final.
