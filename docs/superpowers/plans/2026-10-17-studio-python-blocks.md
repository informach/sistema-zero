# L4 — conversão visual e edições Python

Fatia implementada sob a autorização L0–L8; ainda não está ativada nos editores do produto. O Mural e `/jogar` continuam gates posteriores obrigatórios para JavaScript/Python × Clássico/Pro.

## Contrato preparado

- Catálogo Python com 75 codecs distribuídos nas 11 famílias de Programação. IDs próprios, título e ajuda em português, API oficial, nível, papel de conexão, contagens e opções. Inclui funções/defaults, classes simples, coleções distintas, comparações encadeadas, erros e interpolação simples. Turtle é um catálogo separado de178codecs (funções, Screen/Turtle, métodos/aliases). Assinaturas derivadas do CPython; não equivale à homologação runtime de todas as APIs. A seleção requer extensão instalada e aprovada.
- AST/tokenização/renderização usam CPython 3.14.2 no worker de análise. Literais inteiros não passam por Number; floats usam representação binary64 equivalente e preservam subnormais/limites. Fonte sem representação visual mantém nó explicitamente opaco.
- Quatro direções atravessam a AST específica de Python: fonte→AST, AST→Blockly, Blockly→AST, AST→fonte. A fonte é autoritativa; a representação Blockly é derivada. Salvar/recarregar o workspace não descarta conexões nem sintaxe opaca. Campos e AST opaca têm validação e limites antes de recursão/clonagem.
- Chamadas só recebem rótulo de API oficial quando a resolução é inequívoca. Métodos especializados exigem receptor literal do tipo conhecido; objetos/variáveis ambíguos continuam como chamada genérica. Capturas de match, walrus, classes aninhadas, global/nonlocal, alterações de atributos e acesso dinâmico a bindings impedem classificações incorretas. É deliberadamente conservador; não reescreve a chamada.
- Contagens de itens/argumentos e opções aparecem no menu contextual. Alterações conservam conexões pelo nome, recusam remover uma entrada ocupada e emitem eventos de mutação compatíveis com undo/redo. Entradas novas vazias são diagnosticadas; não viram valores padrão silenciosamente.

## Transações do modo Ponte

`preparePythonVisualTransaction` captura fonte/identidade/árvore antes de suspender, encontra intervalos mínimos, pede renderização ao CPython e refaz a análise do candidato. Só entrega o candidato se a árvore inteira corresponder ao resultado pretendido. A identidade e a fonte são conferidas depois de cada await; o editor deve repetir a comparação no commit síncrono.

Comentários e trechos não afetados permanecem exatamente no buffer original. F-strings são tratadas no contexto da expressão completa; destinos Store/Del só são normalizados para a renderização do fragmento, conservando contexto na árvore final. Reindentação usa os tokens Python para não acrescentar espaços dentro de strings/docstrings multilinha. Alterações que engoliriam comentários são recusadas, mantendo a fonte intacta e orientando edição textual.

Isso ainda não implementa a experiência final de inserir/reordenar qualquer estrutura com comentários associados. A integração deve preservar essa recusa segura e completar a edição de listas de comandos sem regenerar o arquivo inteiro. Não anunciar paridade visual completa por causa das provas desta fatia.

Inserções no nível do módulo agora preservam os comandos originais em ordem, comentários e CRLF, inclusive antes de decorators parentetizados. As linhas de `type: ignore` acompanham seus comentários; não são ignoradas na verificação semântica. Inserção e mudança de expressão no mesmo offset são coalescidas. Deleções/reordenações ambíguas continuam protegidas pelo planner conservador.

A coordenação assíncrona e a gravação transacional estão preparadas: rascunho síncrono antes da análise, coalescimento de tarefas, CAS protegido e histórico Blockly com proveniência atualizada fora do journal. A confirmação conserva cache visual não executável, com posições e comentários. Recuperação faz preflight em workspace descartável, recusa tipos de outro ambiente/propriedades inválidas e compara cache confirmado com a AST da fonte. Essa base ainda precisa ser conectada à interface real e às ações explícitas de restaurar/descartar.

## Evidência local

- `block-conformance.ts` + `block-language-proof.py`: 27 programas, 253 defaults de codecs, 280 resultados gerados/compilados, 19 pares executados com saída igual, AST idêntica e nove nós opacos preservados. `.cache/studio-python-l0/l4-block-conformance.json`. Os seis novos programas Turtle são parse/compile, não execução de jogos.
- Unitários de catálogo/Blockly: 10 testes, 488 verificações, incluindo todos os controles declarados, reconexão, persistência e undo/redo. Linguagem/validação: sete testes adicionais, 35 verificações no conjunto anterior; repetir o conjunto total após estabilizar mutadores.
- CPython web + Blockly real/save/load: 21 programas em Chrome e Edge. Edições localizadas, comentários/CRLF, fonte inválida, precedência e digitação concorrente passaram. Rodada `2026-10-17T00-26-14.229Z`, quatro testes.
- Regressão análise + Turtle: 40 testes Chrome/Edge, rodada `2026-10-17T00-28-59.079Z`, log `l4-language-turtle-browser.log`. Anterior às últimas adições de mutadores, mantendo a evidência temporal explícita.
- Fixes de f-string, Starred e docstring: dois testes Chrome/Edge, rodada `2026-10-17T00-31-57.905Z`, log `l4-visual-fragments-browser.log`.
- Renderização SVG e interação de menu contextual em português com undo/redo: dois testes Chrome/Edge, rodada `2026-10-17T00-34-29.765Z`, log `l4-blockly-svg.log`; captura inspecionada. É uma superfície de prova, não a UI final.
- Reviews L4-005 a011 encerrados, todos os achados corrigidos e revalidados. Incluem mutadores/curadoria, especialização Turtle, documentos e inserções. Browser análise22/22 `00-50-41.355Z` antes fixes009; inserções após0112/2 `l4-statement-review011-browser.log`. UnidadePython28/1434 anterior inserções. TSC da base passou; a rodada mais nova com integração de documentos está registrada no checkpoint de execução.

## Próximos gates

### Conexão dos modos e autoria

Conectar o dispatcher por linguagem usando imports lazy separados para Clássico e Pro Python; não carregar codecs, Blockly, Monaco ou interpretador Python na rota JavaScript. O host fixa uma aprovação de blocos pela identidade exata da release. A aprovação é independente do projeto e da escolha pedagógica: nenhuma extensão ou permissão é concedida pela paleta. Sem aprovação correspondente, mostrar indisponibilidade explícita e preservar o documento.

Python terá `pythonLevel` próprio (1, 2, 3), inicialmente 1, sem reinterpretar os seis níveis JavaScript. Manter `allowBlocks`, categorias e revelação de avançados; configurações inválidas restringem a oferta. Registro completo conserva sintaxe existente, enquanto a paleta só oferece recursos aprovados. Módulos locais que sombreiem a biblioteca oficial impedem rótulos especializados. Carregar o catálogo Turtle apenas quando a versão da extensão instalada corresponder à release.

A primeira composição Pro conecta arquivos Python e preview à mesma store e histórico; navegação, operações, LSP, terminal/REPL, dependências e assistência continuam gates obrigatórios de L5 antes da ativação final. Provas devem atravessar `ModeArea`, com troca de projeto/linguagem, curadoria e layout estreito. Esta conexão não ativa o catálogo do host de produção nem conclui L4/L5.

### Edição estrutural com comentários — sequência de implementação

Ampliar a transação com um mapa de cópias literais: cada trecho reaproveitado identifica intervalo original e posição no texto substituto. Validar igualdade byte a byte (UTF-16 do contrato), limites, ausência de duplicações e sobreposição. Após reparse, conferir que cada comentário continua sendo um token COMMENT na posição mapeada; copiar texto para dentro de uma string não satisfaz a preservação. As posições de `type: ignore` seguem o mesmo mapa, mantendo comparação da AST inteira.

O planner de listas deve reaproveitar trechos de comandos existentes, renderizar somente novos comandos/fragmentos e manter cabeçalhos, decorators, comentários e separadores. Implementar primeiro listas de comandos em linhas próprias, depois suites aninhadas e mudanças combinadas. Ao remover um comando, conservar suas anotações como comentários independentes; nunca apagar comentário implicitamente. Linhas com vários comandos e suites inline precisam tratamento explícito de tokens antes de ampliar a aceitação. Toda fatia exige prova com CPython real, undo/redo e recuperação, sem enfraquecer a comparação semântica.

Movimentos/deleções em suites existentes e inserções ordenadas já têm prova com fonte literal. A próxima ampliação deve compor os intervalos filhos dentro da cópia do comando que os contém. Cada cópia conserva dono explícito: uma inserção no fim de uma função movida pertence à função, mesmo quando compartilha offset original com o comando seguinte. O compositor percorre cópias em ordem de destino, intercala fragmentos novos e subdivide os intervalos literais ao aplicar edições internas. Revalida todas as cópias, comentários e AST inteira. Não usar um mapper global sem afinidade para decidir inserções de largura zero em fronteiras. Inicialmente cobrir movimento/deleção junto com edição/inserção em comandos retidos; depois inserção e reordenação na mesma lista e transferência entre suites, com política explícita para corpo obrigatório vazio.

Nomes de função/classe/parâmetro/argumento nomeado/variável/atributo recebem edição de token exato quando o contexto gramatical é inequívoco. Não renderizar novamente o corpo só para trocar o nome. A comparação final continua sendo feita por CPython, inclusive normalização de identificadores e preservação dos comentários.

### Organização visual por arquivo

Conservar um cache visual independente por arquivo Python. Ler o envelope único já preparado e escrever uma coleção somente quando houver mais de um arquivo com cache; cada entrada continua vinculada à fonte exata, com limites globais de JSON. Renomear move apenas a entrada correspondente; alterar/apagar fonte invalida apenas os caches afetados. Restaurar/descartar atua no arquivo indicado e mantém os demais. A restrição de um rascunho pendente por projeto permanece: um gesto em outro arquivo aponta o arquivo pendente, sem sobrescrevê-lo. Execução/exportação/promoção verificam todas as entradas, não apenas o arquivo selecionado. Provar ida/volta entre arquivos, persistência/reabertura, renomeação, alteração textual e rascunhos concorrentes antes de fechar esse recorte.

### Estado de execução visível no código

Python não terá desativação de comandos armazenada apenas no cache Blockly: a fonte oficial precisa explicar integralmente o que será executado no Estúdio, no Mural e no desktop. Desligar o menu genérico de desativação nessa superfície; usar condicionais Python para controlar a execução. Recusar projeção de blocos desativados introduzidos por importação/API, com rascunho preservado e diagnóstico; nunca ignorar o sinal visual e executar o comando. A recuperação não aceita cache confirmado que prometa uma semântica diferente. Isso não muda as opções existentes do JavaScript.

### Corpo obrigatório vazio

Ao remover o último comando de um corpo obrigatório (função, classe, condição, repetição ou tratamento de erro), gerar o `pass` oficial de Python. O espaço visual vazio representa explicitamente essa operação sem efeito; a ajuda informa isso e a Ponte mostra `pass`. Não preencher entradas de valores nem ativar ramos opcionais vazios. A vinculação de origens aceita somente esse filho implícito, após comparar a AST completa; recuperação de cache repete a comparação. Comentários do comando retirado continuam no código.

Ramos opcionais (`else`/`elif` e `finally`) têm cabeçalho próprio: esvaziá-los remove também o cabeçalho, conservando as anotações como comentários independentes. Inserir novamente cria o cabeçalho após o corpo/handlers anteriores e antes de eventual `finally`. Localizar esses limites pelos tokens e intervalos da AST; não pesquisar palavras em texto de strings. A validação integral continua recusando combinações sem significado válido, como `try` sem handler nem `finally`. Provar a operação inversa e o histórico da interface. O CPython fixado inclui um LF sintético em `TypeIgnore.tag` quando o comentário fica isolado; a comparação ajusta somente esse detalhe contextual e a linha, sem aceitar alteração do conteúdo da anotação. Transferência entre suites continua sendo um recorte separado.

Concluir curadoria/paleta/ajuda e refinamento pedagógico, catálogo Turtle com assinaturas/APIs qualificadas, integração Clássico/Ponte/documentos e promoção Pro. Completar áudio portátil e partidas reais dos dois jogos; a execução inicial do Pac-Man não equivale a compatibilidade completa. Continuar L5–L8 com Pro/LSP/Pinta/admin/aulas/live/Mural/exportação/Zappy e desempenho combinado. O outro computador permanece reservado para depois de toda a implementação e validação local. Nenhum commit, merge, push ou deploy nesta fatia.
