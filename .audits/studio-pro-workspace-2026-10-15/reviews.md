# Revisões da implementação Studio Pro

## Lote 1 — navegação e preferências

Base: staging local `1e5b0debc`. Revisão do diff: preferências fora do documento, escopo capturado por perfil, isolamento por instância, restauração assíncrona sem sobrescrever interação, abas fixadas antes de editar, limites de busca e descrições verificadas pelas receitas existentes. Corrigidos foco/revelação na árvore e opção inválida de tipagem no teste de acessibilidade.

Evidência: `bun test src/modes/pro/workspace src/components/code/ProFileTree.test.tsx src/components/tutor/ProLearningRecipes.test.tsx` (12 passaram, 41 asserções); Biome nos arquivos alterados passou; `bun run typecheck --incremental --tsBuildInfoFile .cache/pro-workspace.tsbuildinfo` passou; `git diff --check` passou. Layout e refatorações seguem nos lotes próprios; nenhuma alteração em runtime ou contratos de construção neste lote.

## Lote 2 — operações semânticas e recuperação

Serviço TypeScript ampliado de ponta a ponta: símbolos, referências, renomeação de símbolo e de arquivo/pasta. A árvore envia uma intenção para revisão, sem modificar caminhos diretamente. O preview usa a base capturada após a barreira dos escritores e exige o mesmo documento, perfil e adapter na aplicação. O histórico documental ganhou origem explícita `editor`/`zappy`, com a mesma persistência atômica de documento e inversa; operações locais não inventam jobs de IA. Falhas de gravação permanecem pendentes e podem ser tentadas novamente.

Achados corrigidos na revisão: pastas vazias eram rejeitadas pelo contrato de revisão; renomear apenas a caixa era considerado patch duplicado; reusar o nome anterior de um arquivo podia reusar a URI do buffer renomeado; preview após perfil A→B→A precisava de identidade adicional; histórico do Zappy precisava filtrar a origem. Cada caso recebeu verificação direcionada. Mapa do arquivo, referências, voltar, foco independente da seleção na árvore e controles explícitos de mover/renomear/excluir integrados.

Decisão de undo: renomear mantém a identidade e o estado visual dos buffers. Conteúdo modificado por uma operação documental inicia uma nova pilha de digitação naquele buffer, para impedir Ctrl+Z de desfazer só um import de uma mudança em vários arquivos. A recuperação da operação inteira fica no histórico condicionado à base. Isso é informado antes de aplicar. Arquivos sem alteração de conteúdo preservam a pilha de digitação. O histórico continua limitado aos tetos existentes (20 operações, 8 MB/projeto, 32 MB/perfil); operações com mais de 24 patches pedem divisão em etapas antes da aplicação.

Limites apresentados na revisão: TS atualiza imports JS/TS; referências em HTML/CSS e caminhos dinâmicos exigem conferência. Entradas/configurações afetadas recebem aviso. Recuperação recusa sobrescrever trabalho posterior. Edição observadora continua bloqueada no store.

Evidência: 74 testes passaram, 289 asserções, 10 arquivos (workspace, árvore, serviço TypeScript, modelos/Monaco, revisões e transações IndexedDB). Biome em 32 arquivos passou. Typecheck incremental do Studio passou. Verificação visual e regressão completa fazem parte dos lotes 3 e 6.

## Lote 3 — interface, problemas, exemplos e materiais

Árvore Pro estável no Shell, três painéis redimensionáveis com preferência coalescida, abas estreitas sem desmontar código/jogo/Zappy, painel complementar no desktop e diálogo estreito. Fonte inicial Pro de 15 px preserva a escolha explícita; classic mantém seu padrão. Problemas reúne diagnósticos atuais de arquivos fechados sem criar buffers e distingue erros do runtime. Ferramentas reúne ações e busca; exemplos de placar, teclado, imagem, áudio e carregadores Three.js entram no fim de um arquivo JS/TS após revisão, com guarda textual, material e símbolo existente. A biblioteca e seus adapters continuam únicos. Primeiros passos reutiliza receitas compatíveis; criação apresenta categorias pelo resultado e detalhes técnicos secundários.

Materiais excluídos usam a mesma transação documental/histórico local, com inversa binária limitada pelos mesmos orçamentos. Recuperação preserva identidade, posição e capa, recusa base/capa posterior, permanece fora da exportação e não inventa patches textuais. Falha de gravação tem recibo pendente e retry sem reaplicação.

Achados corrigidos: painel inicial ainda não registrado ao restaurar tamanhos; ausência de fechamento explícito do histórico; controle duplicado de abrir Zappy; atualização excessiva de preferências durante resize; teste que supunha caminho de material pelo nome (o caminho canônico é derivado da identidade); descarte do diff antes do cancelamento do cálculo Monaco. Este último foi resolvido assumindo ownership explícito do IDiffEditorViewModel e cancelando-o antes de liberar os modelos, sem temporizador nem supressão de erro.

Evidência: 145 testes passaram, 551 asserções, 17 arquivos (materiais/Pinta/Molda/equipe, criação, operações, transações, exemplos e workspace), além dos 56 testes anteriores de settings/Zappy/layout. Typecheck Studio passou. Biome passou em 60 arquivos. Cenário Chromium sobre build de produção/StrictMode passou: erro em arquivo fechado, identidade dos buffers e sessão do iframe após resize/ampliação, import atualizado por renomeação, recuperação, inserção de placar e material canônico. Screenshot desktop inspecionado. Existem avisos act em testes antigos dos adapters de materiais e aviso de tamanho dos chunks Monaco no build; nenhum erro no navegador no cenário aprovado. Regressão completa segue no lote 6.

Decisão do lote 4: escopo de seleção será uma restrição de linhas validada no servidor e na aplicação local. Mudança fora das linhas exige novo pedido explícito Parte/Jogo. Não será criado um aceite apenas visual nem um booleano que contorne o contrato atual.

## Lote 4 — pedido contextual e revisão

Explicar, investigar e pedir mudança estão no menu do Monaco e nas Ferramentas. Ctrl/Cmd+K permanece com os acordes nativos do Monaco; Ctrl/Cmd+Alt+K abre o pedido somente quando o editor ativo tem foco. Captura precede a transferência de foco; o construtor conserva caminho/linhas/hash e o texto do pedido ao fechar/reabrir e redimensionar. O envio continua explícito e verifica novamente a seleção. A interface descreve o snapshot consultável e diferencia esse contexto do alcance de escrita.

Restrição compartilhada no Core preserva exatamente prefixo e sufixo fora das linhas (inclusive CRLF) e recusa outros arquivos, exclusão do arquivo e alterações de pastas. O executor recusa a proposta antes da validação, Members recusa checkpoint fora do escopo, o BFF confere o job persistido e a aplicação local repete a verificação. A verificação de aplicação passou a receber versão e hash da candidata; o store também confere o hash esperado antes de publicar. Não há aplicação parcial nem aceite visual que autorize ampliar o escopo.

Diff tem colorização por caminho, fonte escolhida, altura ajustável, lado a lado opcional e janela ampliada. A revisão separa intenção, critérios manuais e evidências automáticas já vinculadas ao snapshot. Busca no histórico identifica explicitamente que pesquisa as mensagens carregadas.

Evidência: 3 testes de escopo no Core (12 asserções); 65 testes de tutor/construtor/persistência e mais 21 testes focados após adicionar os cenários de escopo/rascunho/candidata (74 asserções nessa execução); 36 testes BFF/executor/ferramentas (170 asserções). Typechecks Core, Studio e Members passaram; member-shell completo em execução, será incluído na revisão final. Chromium/StrictMode passou com comparação ampliada, pedido por seleção, construtor indisponível, rascunho ao reabrir e resize; screenshots desktop/estreito inspecionados. A suite foi ajustada para distinguir os controles de fechar Zappy da Topbar e do painel, sem mudar o produto para satisfazer o teste.
