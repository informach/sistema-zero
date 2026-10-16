# Studio Pro: editor avançado, desempenho e continuidade do Zappy

16/10/2026 · Revisão 3 desta proposta complementar · Proposta para avaliação, sem implementação.
Esta versão substitui a proposta anterior. O [review](2026-10-16-polaris-studio-pro-proxima-evolucao-review.md) registra os achados e as correções de desenho.

Esta rodada corrige uma premissa factual da revisão 2: já existe exportação de fonte para continuar no VS Code, separada do deploy. A evolução aperfeiçoa esse caminho. Também fecha contratos de sincronização, capacidades por host, ciclo de vida e medição de desempenho. A staging avançou durante o review de `4db993ba8` para `b030c443e`; a lista completa desse avanço foi conferida e contém alterações de Marketing, sem mudanças nos caminhos Pro examinados.

## 1. Direção e premissas corrigidas

O Studio Pro atende alunos que já conquistaram todos os postos da jornada. A faixa de 9 a 14 anos orienta acessibilidade, linguagem e segurança; não caracteriza o usuário como iniciante. O objetivo é oferecer um editor de código avançado, reconhecível para quem depois usar VS Code, com recursos educacionais e Zappy integrados.

O código confirma Pro no posto Lenda (`god`), com acesso privilegiado da equipe. `resolveStudioProAccess` também exige perfil e acesso ao Studio. A proposta consome essa decisão existente; não cria contagem alternativa de posts ou nova avaliação para liberar ferramentas.

Base revista: staging local `b030c443e`, que contém a implementação `77c7e43b7` e a correção `a6ab0b668`. Os avanços examinados desde a análise anterior são de outros domínios; o diff dos caminhos Pro conferidos continua vazio em relação à entrega revisada. Polaris foi analisado no diretório local informado. A [análise comparativa](../../.audits/architectural-analysis-polaris-studio-pro-2026-10-16.md) permanece como referência, com premissas de produto atualizadas por esta revisão.

Três resultados guiam a proposta:

1. Fluência em práticas transferíveis: arquivos, símbolos, imports, terminal, dependências, diagnóstico, revisão e execução.
2. Resposta rápida com jogo e assistência ativos, dentro de limites verificáveis de processamento e memória.
3. Preservação das capacidades atuais do Zappy e das integrações do Sistema Zero.

| Alternativa | Consequência | Decisão |
| --- | --- | --- |
| Evoluir o editor atual com convenções familiares, medição e assistência integrada | Preserva investimento; exige revisar comandos, agendamento e integração | Recomendada |
| Centralizar a experiência em tarefas, cartões e controles visuais | Ajuda na descoberta, mas distancia o caminho principal dos editores convencionais | Guias e controles apenas opcionais |
| Incorporar o workbench VS Code ou adotar Polaris como base | Amplia infraestrutura e custo sem transferir automaticamente as integrações existentes | Fora desta evolução |

Monaco permanece a base. Ele compartilha origem com o editor do VS Code, mas não equivale ao produto completo nem oferece seu ecossistema de extensões automaticamente. A aproximação proposta é de conceitos e interação. [Referência oficial do Monaco](https://github.com/microsoft/monaco-editor#faq).

## 2. Principais correções do review

| Lacuna anterior | Correção |
| --- | --- |
| Público tratado como possível iniciante | Assume domínio da jornada; explicações pontuais, sem reensinar o básico por padrão |
| “Explorar” competia com a árvore real | Explorer/Arquivos como entrada principal; Guias como visão opcional |
| Controles visuais tinham prioridade excessiva | Piloto posterior, condicionado a benefício e desempenho |
| Semelhança com VS Code apenas visual | Comandos, atalhos contextualizados, termos, navegação e exportação de desenvolvimento verificável |
| “Preservar Zappy” era genérico | Matriz de capacidades e cenários de não regressão, inclusive voz, créditos e retomada |
| Desempenho sem critérios operacionais | Lote de baseline, fixtures, contadores, budgets e metas de latência |
| Painel oculto confundido com recurso inativo | Preservar sessão; evitar cálculos e renderizações sem consumidor |
| Limite de resultados confundido com custo da busca | Processamento incremental/cancelável; medir caso sem resultados e projeto perto do limite |
| Exportação tratada como suficiente para a transição | Ensaio real de abrir, executar e continuar um projeto no VS Code |
| Histórico de operações podia parecer versionamento completo | Vocabulário e limites explícitos; nenhuma falsa equivalência com Git |

## 3. Experiência do editor

### Como é hoje e o que realmente muda

Os recursos já entregues são a base desta evolução; não devem aparecer novamente como funcionalidades ausentes.

| Área | Hoje, no código examinado | Proposta revisada |
| --- | --- | --- |
| Arquivos e guias | A visão Arquivos já é a inicial; “Primeiros passos neste jogo” fica em um bloco recolhível acima da árvore, com até três guias compatíveis | Preservar Arquivos como padrão; dar aos guias uma entrada própria e conteúdo adequado ao aluno avançado |
| Layout | Divisões redimensionáveis, modos código/jogo, organização para largura reduzida e sessões estáveis | Consolidar controles e estados, explicitar regiões familiares e melhorar orientação por caminho sem remontar sessões |
| Navegação | Busca por nome/conteúdo, mapa de símbolos, referências e ações já disponíveis | Quick Open, nomenclatura convencional e acesso consistente por comando/menu/teclado |
| Edição estrutural | Renomear/mover/alterar símbolo já passa por revisão, conflito e recuperação | Preservar esse protocolo também nos atalhos e na paleta; melhorar descoberta |
| Busca e análise | Há limites de resultados e um worker de linguagem; algumas invalidações abrangem toda a árvore | Medir e reduzir trabalho por edição, controlar filas e calcular visões apenas quando necessárias |
| Zappy | Conversa, investigação, construção e fluxos de revisão/retomada já existem | Melhor organização e contexto de entrada, mantendo toda a matriz de capacidades da seção 4 |
| Materiais | Biblioteca, caminhos, exemplos, Pinta/Molda e materialização já integrados | Facilitar inspeção e localizar usos com cobertura explícita, miniaturas sob demanda e mesma fonte de dados |
| Diagnóstico | Serviço de linguagem e evidências de validação já existem | Tornar navegação, estados e investigação mais consistentes; explicação adicional preserva a mensagem técnica |
| Continuidade externa | “Baixar projeto” já usa ZIP de fonte, separado do deploy, com `LEIA-ME.txt` para VS Code e instalação por npm | Adequar instruções ao manifesto, melhorar avisos, medir empacotamento e ampliar a validação externa existente |

### 3.1 Estrutura familiar

A referência é a organização documentada do VS Code: navegação lateral, arquivos em abas, painel inferior, barra de estado e paleta de comandos. O Studio mantém sua identidade e acrescenta preview de jogo e Zappy. [Interface oficial](https://code.visualstudio.com/docs/editing/getting-started/userinterface).

```text
Projeto              Executar / Reiniciar   Exportar   Compartilhar
┌─────────────┬───────────────────────────────┬─────────────────────┐
│ Arquivos    │ abas + caminho do arquivo     │ Preview | Zappy     │
│ Busca       │                               │                     │
│ Materiais   │ editor Monaco                 │ jogo ou assistência │
│ Guias       │                               │                     │
├─────────────┴───────────────────────────────┴─────────────────────┤
│ Problemas | Console | Terminal                                  │
├────────────────────────────────────────────────────────────────┤
│ Salvamento · linguagem · linha/coluna · estado do ambiente       │
└────────────────────────────────────────────────────────────────┘
```

O esquema define regiões e funções, não novas barras obrigatórias. Reutilizar Topbar, workspace e painéis, consolidando controles duplicados. Código recebe a maior área útil. A lateral secundária pode ser recolhida; Preview/Zappy permanecem alcançáveis por botão e comando. Largura reduzida usa as áreas alternáveis existentes e restaura foco/seleção.

Trocar a apresentação não desmonta sessões de código, Zappy ou runtime. Não abrir duas instâncias do Zappy para atender layouts diferentes. Quando recolhido, indicar discretamente o estado do construtor sem abrir o painel ou roubar foco.

“Executar” respeita o ambiente atual: pode iniciar ou reiniciar a partida. “Reiniciar ambiente” é separado, pois envolve servidor/dependências. A comparação atual/proposta mantém o aviso de reinício; preservar painéis não significa garantir o estado de qualquer jogo durante a troca de versão.

### 3.2 Terminologia, comandos e atalhos

Usar termos reais: Arquivos/Explorer, Buscar, Símbolos, Ir para definição, Localizar referências, Renomear símbolo, Formatar documento, Problemas, Console, Terminal e Comparar alterações (diff). Uma descrição curta pode explicar a ação: “Formatar documento — organizar indentação e espaçamento”. Não substituir conceitos técnicos por apelidos exclusivos.

Manter árvore, caminhos, extensões e arquivos de configuração acessíveis. Guias por finalidade não substituem `src/`, `public/`, `package.json` ou `tsconfig.json`. Preservar projetos livres, kits, React e conversão.

Compartilhar descritores de ações: ID, rótulo, contexto, disponibilidade e execução. Botão, menu e atalho chegam ao mesmo comando. Dentro do Monaco, registrar contribuições via APIs públicas para a paleta nativa; fora dele, a superfície do workspace usa o mesmo registro. Não duplicar a edição nem capturar teclado globalmente sem verificar foco.

| Ação | Convenção proposta | Integração exigida |
| --- | --- | --- |
| Abrir arquivo rapidamente | Ctrl/Cmd+P | Reutilizar a busca atual em Quick Open |
| Buscar no projeto | Ctrl/Cmd+Shift+F | Diferenciar busca por caminho e conteúdo |
| Paleta de comandos | F1 / Ctrl/Cmd+Shift+P quando disponível | Não criar duas paletas concorrentes no mesmo foco |
| Símbolos do arquivo | Ctrl/Cmd+Shift+O quando disponível | Consultar serviço de linguagem e informar indexação |
| Definição/referências | Comandos convencionais; F12/Shift+F12 quando disponíveis | Menu e paleta permanecem acessíveis em conflitos de navegador |
| Renomear símbolo | F2 no editor | Passar pela operação semântica revisada, sem aplicação parcial alternativa |
| Formatar documento | Comando e atalho por plataforma | Reutilizar o formatador existente |
| Zappy contextual | Ctrl/Cmd+Alt+K já adotado | Preservar acordes Ctrl/Cmd+K, seleção e envio explícito |

São objetivos de integração a testar em Windows/macOS, ABNT2 e navegadores suportados. Não afirmar equivalência universal de atalhos. [Referência oficial de bindings](https://code.visualstudio.com/docs/configure/keybindings).

Multicursor, seleção por palavra, comentar linha, indentação, busca/substituição no arquivo e dobramento usam os recursos nativos disponíveis, com verificação de conflitos. Busca/substituição multiarquivo, múltiplos grupos de edição, debugger com breakpoints e Git exigem incrementos próprios; não apresentar botões que simulem recursos ausentes.

Ctrl/Cmd+Z continua sendo desfazer de texto. Operações estruturais e propostas usam recuperação revisada. Hoje, aplicar uma operação pode reiniciar o histórico de digitação dos arquivos alterados; essa diferença precisa continuar explícita. Undo unificado é outro projeto, não uma troca de rótulo.

### 3.3 Arquivos e organização do código

Breadcrumbs devem navegar e revelar o arquivo na árvore. O mapa do arquivo passa a usar “Símbolos”, com explicação opcional. Renomear/mover preserva imports cobertos, modelos, abas, conflitos e recuperação existentes.

Para novos kits, separar entrada, configuração, ciclo de vida, regras e desenho conforme a complexidade. Não impor uma estrutura universal a React, convertidos ou kits táticos. Arquivos gerados indicam origem e comando de geração.

No Studio, manter comandos/navegação no workspace, análise no serviço de linguagem, operações em estado/persistência e conhecimento no Core. Extrair responsabilidades conforme necessário; não mover toda a base para outra organização de pastas sem ganho demonstrado.

## 4. Zappy: contrato obrigatório de preservação

A apresentação pode melhorar; as capacidades abaixo são critérios de não regressão. “Quando oferecido pelo host” continua valendo. Remover ou mudar uma capacidade não faz parte desta proposta.

| Capacidade atual | O que preservar | Cenário de aceite |
| --- | --- | --- |
| Conversar, Investigar, Construir | Acesso claro aos três modos | Alternar sem perder rascunho ou enviar implicitamente |
| Contexto do projeto/arquivo/seleção/diagnósticos/dependências/kit | Limites, revisão e tratamento de dados sensíveis | Referência corresponde ao código enviado; contexto antigo não aponta linha inventada |
| Ideia e decisões | Proveniência, confirmação e edição de notas | Layout não apaga notas; atualização concorrente não sobrescreve rascunho |
| Pensa e sessão de tarefa | Missão, handoff e guardas de atualização | Missão/decisão alterada impede aplicar proposta obsoleta |
| Histórico/paginação/busca/exclusão | Histórico acessível; alcance da pesquisa explícito | Carregar anteriores e apagar conversa seguem regras atuais |
| Referências a arquivos/aulas/tutoriais | Navegação por adapters e validação | Destinos válidos; conteúdo antigo recebe aviso quando necessário |
| Sugestões de continuidade e feedback | Escolhas explícitas e avaliação apropriada | Sugestão não envia sozinha; aviso de cota não recebe avaliação de conteúdo |
| Voz e leitura de respostas | `renderVoiceInput` e `renderListen` opcionais | Não duplicar gravação/reprodução ao reorganizar; preservar estados e erros |
| Recuperação de pedidos | Repetição segura do mesmo pedido versus pedido novo com contexto novo | Reabrir painel ou perder resposta não causa inferência paga duplicada |
| Escopo do construtor | Seleção, parte e jogo inteiro | Consultar contexto não amplia permissão de edição; alcance maior exige novo pedido |
| Plano, critérios e evidências | Tipos, build, playtest, captura e identidade da proposta | Não trocar prova por resumo ou declarar critério manual como verificado |
| Diff e experimentar proposta | Comparação ampliada, atual/proposta, expiração e renovação suportada | Experimentar não altera documento; preview inválido não parece válido |
| Aplicar/descartar/desfazer/recuperar gravação | Hash, autoria, transação, inversa e recibos | Conflito/storage nunca vira sucesso; retomada não duplica operação |
| Execução durável/cancelamento/consulta | Coordenador, executor, leases e prazos atuais | Fechar painel/aba não cancela job; cancelar vence retorno tardio; consultar não gera |
| Créditos e fonte de consumo | Franquia familiar, OpenRouter, saldo desconhecido e autoridade do servidor | Falha não vira saldo zero; respeitar a fonte distinta do Studio/Pensa |
| Isolamento e política de modos | Perfil, projeto, instância, observador e Pro/clássico | Trocas e duas instâncias não misturam contexto, cobrança ou aplicação |

Não reduzir Zappy a “pedir dica”. O aluno avançado pode conversar sobre arquitetura, investigar e construir partes ou um jogo inteiro, revisando os resultados dentro dos contratos existentes. Guias e materiais são pontos de entrada para o mesmo Zappy.

Manter um único dono da sessão por instância. Primeiro reduzir assinaturas amplas e cálculos de apresentação. Se for necessária extração entre controlador e visualização, preservar a máquina de estados, pedidos/rascunhos e passar pela matriz antes de alterar layout.

Histórico carrega páginas, sem baixar tudo de uma vez. Eventual janela de renderização preserva âncora de rolagem, acesso ao conteúdo, seleção de texto, leitor de tela e reprodução de voz. Renderizar menos não elimina histórico persistido. Polling continua limitado e reconciliável; reduzir consultas invisíveis só com retomada imediata ao voltar, sem alterar execução do servidor.

## 5. Desempenho como condição de entrega

### 5.1 Evidência existente e lacunas

O [teste de bundle](../../packages/studio/src/projects/__tests__/initialBundleBudget.test.ts) define limites: entrada inicial 350.000 bytes brutos / 120.000 gzip / 10 arquivos; rota do editor 5.000.000 / 1.600.000 / 20; modo Código 4.000.000 / 1.300.000 / 18. São tetos atuais, não medições desta revisão. `CodeMode` encaminha ao Pro.

Complementar esses guardas com chunks lazy efetivamente carregados, workers, inicialização TypeScript e WebContainer no navegador e no host Kids. O teste de performance dos kits mede um iframe isolado, sem a concorrência do editor/Zappy.

Caminhos de custo identificados por leitura, ainda sem quantificação:

- Busca no navegador recalcula por consulta/árvore; limitar resultados não limita a varredura sem correspondência.
- Símbolos invalidam pela identidade de toda a árvore, podendo refazer trabalho após edição não relacionada.
- A sessão de linguagem envia patches, mas prepara snapshots amplos e percorre arquivos nos diagnósticos.
- O painel de problemas valida o hash do conteúdo por diagnóstico; vários diagnósticos do mesmo arquivo podem repetir a varredura desse texto. Cache por arquivo/versão deve preservar a rejeição de resultados antigos.
- Materiais derivam bundle/metadados; novas miniaturas não podem repetir decodificação/hash de todos os binários por render.
- Painéis persistentes, histórico e diff precisam controlar cálculos, assinaturas e recursos mesmo quando ocultos.

### 5.2 Estratégia

1. Buffer e resposta visual têm prioridade. Indexação, diagnóstico e persistência não são passos síncronos obrigatórios para desenhar cada tecla.
2. Usar versões por arquivo, patches e invalidação correta de dependentes. Não recalcular todos os hashes a cada tecla. Snapshots completos permanecem nos limites de salvar/exportar/construir/aplicar, após flush.
3. Analisar guias, usos, símbolos e diff quando consumidos. Busca oculta com consulta antiga não recalcula em toda edição.
4. Limitar filas e coalescer consultas obsoletas por tipo/arquivo. Completar/navegar tem prioridade entre tarefas. Operações mutáveis não são descartadas como consultas. Cancelar resposta não interrompe magicamente uma chamada síncrona do TypeScript já em execução.
5. Índice de caminhos muda com estrutura; conteúdo é incremental e sai da renderização. Reutilizar o worker de linguagem para semântica. Worker de busca separado só se houver disputa medida, sem outro compilador ou cópia ilimitada do projeto.
6. Models somente para arquivos abertos/necessários, diff sob demanda e caches limitados. Não criar model por resultado nem descartar buffer aberto, undo ou rascunho para atingir uma meta. Liberar recursos temporários.
7. Miniaturas lazy e cache por ID/hash; revogar URLs no descarte. Sem renderer Three por card; preview 3D somente selecionado.
8. Recolher preserva sessão/runtime. Encerrar projeto libera workers/listeners pertencentes à instância. Pausar jogo é explícito; foco no Zappy não pode pausar silenciosamente uma partida.
9. Preferências continuam na base separada, com escrita coalescida. Layout não compete com salvar documento; não ampliar debounce de save para esconder custo.
10. Digitação/navegação não acionam IA. Preservar assistência explícita sem cortar contexto ou evidências silenciosamente.

Não “otimizar” desligando diagnóstico, ocultando falha, removendo revisão, trocando semântica por regex ou aumentando timeouts. Corrigir a origem demonstrada pelo perfil.

### 5.3 Ambiente, fixtures e metas

Lote 0 fixa baseline em build de produção, sem extensões do navegador, viewport 1366×768 e máquina física de entrada com 8 GB de RAM/GPU integrada. Registrar CPU/GPU, SO, navegador, DPR e energia. Throttling é complemento, não prova de hardware real. Rede/cache e serviços são controlados.

Fixtures: kit 2D, 3D, React/TS, convertido e livre, além de cenários próximos aos limites remoto e local. Hoje o remoto admite 80 fontes, 1.500.000 caracteres totais e envelope de 2.000.000 bytes; o sanitizador local admite 5.000 nós, 8.000.000 caracteres totais e 2.000.000 por arquivo. Não impor ao editor inteiro o limite menor do construtor. Materiais/histórico respeitam suas cotas existentes.

Medir também jogo ativo + Zappy aberto, histórico paginado, resposta controlada e proposta em revisão. Busca comum, sem resultados, muitas correspondências e arquivo longo são cenários distintos.

**Metas propostas, ainda não medidas:** versionar antes da implementação funcional. Baseline acima da meta exige correção/recorte explícito, não relaxamento silencioso.

| Medida | Envelope usual, até porte remoto | Estresse perto do limite local |
| --- | --- | --- |
| Entrada de texto até atualização visual, p95 | ≤ 50 ms | ≤ 50 ms; análise posterior pode ser progressiva |
| Troca de aba/painel já carregado, p95 | ≤ 100 ms | ≤ 150 ms |
| Busca de conteúdo, p95 até lista ou conclusão sem resultado | ≤ 200 ms | Primeiro resultado/progresso ≤ 200 ms; conclusão ≤ 1 s |
| Editor utilizável com cache aquecido, p95 | ≤ 2 s | ≤ 4 s |
| Trabalho novo na thread principal durante digitação | Nenhuma tarefa > 50 ms atribuível a novos índices/listas/assistência | Mesmo critério |
| Recursos após ciclos de uso | Sem crescimento acumulativo de workers/listeners/renderers/models temporários | Mesmo critério |

Medir separadamente abertura fria, editor utilizável, linguagem pronta, dependências instaladas e primeiro jogo pronto. Relatar instalação/rede sem escondê-las na métrica de edição. Abertura fria, memória total e concorrência editor+jogo terão budgets próprios fixados no lote 0 a partir das fixtures/aparelhos; a entrega funcional não começa com essas métricas em aberto.

Por fixture: 30 aberturas, 200 eventos de digitação, 50 trocas/buscas e 30 ciclos de uso. Registrar p50/p95/máximo, traces, heap e contadores por dono. Regressão relativa sustentada > 10% bloqueia mesmo dentro do teto; usar execuções pareadas e tolerância absoluta de ruído previamente registrada. Não escolher só a melhor execução.

Manter budgets atuais dos kits e adicionar execução com editor/Zappy. Os p95 < 8 ms de CPU/frame e < 50 ms entre frames do teste isolado não são promessa de 60 FPS em todo aparelho. Descarte e memória precisam de contadores determinísticos além do heap, que varia com coleta de lixo.

### 5.4 Protocolo de medição e bloqueio de regressões

**Métrica com começo e fim definidos.** Digitação mede interação de teclado até o quadro que apresenta a mudança, incluindo espera para processar o evento; não apenas duração do handler ou de `setValue`. Abertura aquecida termina quando o documento correto aceita entrada, sem depender da instalação de pacotes. Busca termina com resultados da consulta/revisão atuais ou conclusão explícita sem correspondências; um spinner não conta como resultado completo. Troca de aba inclui conteúdo, seleção e foco corretos. Registrar separadamente latência de autocomplete, definição e diagnóstico após estabilizar a edição, com budgets fechados no lote 0: edição fluida com inteligência permanentemente atrasada não passa.

Usar entrada pelo navegador, traces e marcações do ciclo real. Chamar store/model diretamente serve a teste de lógica, não a prova de responsividade. Event Timing, quando disponível, complementa a medição; não chamar o p95 de digitação de INP. INP agrega interações de uma visita com outra definição. [Referência oficial sobre latência de interação](https://web.dev/articles/optimize-inp).

**Fixtures reproduzíveis.** Cada fixture tem ID/versão, tamanho em bytes/caracteres, quantidade de arquivos, maior arquivo, volume de materiais, quantidade de mensagens e carga do jogo. Separar uso típico, fronteira remota e fronteira local. Não calcular um p95 misturando portes. Incluir colagem extensa, arquivo de linha longa, salvar/exportar com materiais, enxurrada limitada de logs e resposta longa controlada do Zappy. O extremo local é teste de capacidade, não retrato do uso típico.

**Cache e rede declarados.** Separar primeira visita sem cache; reabertura em nova página com cache; e troca no editor já carregado. Registrar browser/worker/dependências pré-aquecidos. O bootstrap comum não pode passar a importar Monaco, runtime ou visualização 3D só para montar menus/guias. Medir build do host Kids com seus headers, além do playground. Não desativar isolamento para o teste passar. O teste remoto usa o adapter real com serviço controlado; inferência paga não participa da comparação de renderização.

**Custo completo e descarte correto.** Relatar heap da página, workers, iframe/runtime e bytes de materiais nas ferramentas que suportarem essas medidas. Uma API indisponível resulta em “não medido”, nunca zero. Medir também duração do save/flush e empacotamento: tirar trabalho da tecla não pode criar travamento na primeira gravação. Capturar recursos antes do cenário, após aquecimento e após ciclos. Cache de biblioteca e WebContainer compartilhado podem permanecer por política; crescimento repetido de recursos pertencentes ao projeto encerrado reprova. Manter orçamento para caches retidos e bytes em voo, não só número de workers.

**Execução e evidência.** Lote 0 produz `fixtures`, resultados brutos, relatório comparativo e comandos reproduzíveis sob `.audits/studio-pro-evolution/`. A instrumentação deve ser opt-in ou barata e ter seu custo medido. Testes funcionais/bundle ficam no CI normal; latência/memória rodam também em executor dedicado sem jobs concorrentes e no aparelho de referência. CI genérico ruidoso não substitui essa prova. Não usar retries para escolher uma execução que passe.

**Portão:** comparar base e candidato nas mesmas condições e na mesma fixture. Bloquear perda de capacidade/dados, teto excedido, regressão sustentada conforme seção 5.3, fila sem limite ou crescimento de recurso após ciclos. Se a base já falhar, registrar e corrigir no lote 1; não elevar o teto para acomodar a mudança. Quando uma meta se mostrar inviável, revisar explicitamente o escopo com evidência antes do lote funcional. Preferir corrigir o ponto medido a introduzir scheduler, event bus ou segunda store genéricos.

## 6. Diagnóstico, materiais e ajuda opcional

**Diagnóstico:** manter mensagem técnica, código, gravidade, arquivo/linha; acrescentar explicação contextual e ações de navegação/investigação com Zappy. Agrupar repetições sem esconder detalhes. Não declarar causa raiz automática. Erros de runtime só ganham links quando vinculados a sessão/build/revisão e localização confiável. O build remoto usa `sourcemap: false`; mapear para fontes requer lote próprio, mapas privados, retenção e limites. Não carregar mapas no bootstrap nem inventar linhas enquanto isso.

**Materiais:** reutilizar biblioteca e `Project.assets`, com miniatura/nome/tipo e detalhes de ID/caminho/licença. “Localizar usos” informa cobertura; ausência de literal não prova ausência de uso dinâmico. Inserção num kit exige ponto de conexão verificado e revisão; em projetos livres continuam carregadores reais e exemplos. Preservar Pinta/Molda, equipe, edição externa e permissões.

**Guias:** documentação contextual para usuários avançados: arquitetura, ciclo de vida, recursos e exemplos. Opcionais, pesquisáveis e ligados a símbolos reais. Mesmo catálogo Core do Zappy; nenhum currículo ou memória de decisões paralelos. Não marcar fase concluída nem exigir roteiro para editar.

**Inspector de kit:** retirado da primeira entrega. Um piloto posterior pode mostrar propriedades, unidade, validação e código. Edita literais por AST e protocolo revisado; estruturas calculadas/ambíguas não recebem edição automática. Descritor/validador têm fonte canônica; exportação funciona sem inspector.

## 7. Transição real ao VS Code

“Baixar projeto” já chama `exportProjectSource`: `buildSourceFiles` reutiliza `buildProFileMap`, inclui materiais e acrescenta `LEIA-ME.txt` quando esse nome está livre. O texto já orienta abrir a pasta no VS Code, instalar Node e executar npm; escolhe `npm ci` pela presença de `package-lock.json`. `exportProject` produz o pacote de deploy separado. Não criar um terceiro exportador nem reapresentar a continuidade externa como ausente.

As melhorias se concentram em seis pontos:

1. **Instruções fiéis:** ler scripts, `engines`, `packageManager` e lockfiles reais. Os kits npm continuam com npm. Projeto livre sem `dev`/`build`, com manifesto inválido ou gerenciador não validado recebe orientação limitada e explícita, sem comandos inventados. Presença de lockfile não comprova consistência; não instalar para verificá-lo durante o download.
2. **Documentação preservada:** manter README, créditos e `LEIA-ME.txt` do autor. Quando houver instrução adicional, usar nome disponível de forma determinística e informar o destino; não editar a árvore para produzir o ZIP.
3. **Avisos no fluxo:** hoje o handler encaminha avisos e erros ao console. Exibir resultado, falha e arquivos omitidos junto da ação, com detalhe acessível. Download parcial não pode parecer completo; erro não vira confirmação de sucesso. Manter um único pedido ativo por instância.
4. **Snapshot consistente:** reconciliar os escritores existentes antes da captura, conforme seção 8.2. O pacote corresponde a essa revisão, mesmo que o aluno continue editando durante a compressão. Não esperar o projeto ficar eternamente ocioso.
5. **Desempenho:** medir materialização, conversão para bytes, compressão e criação do Blob. `zipFiles` carrega a biblioteca de modo assíncrono, mas chama `zipSync` na thread atual. Se ultrapassar os budgets, usar o mecanismo assíncrono/worker da mesma biblioteca, com memória limitada, encerramento e progresso baseados em etapas reais. Não duplicar bytes sem necessidade nem transferir/destacar buffers canônicos de materiais.
6. **Fronteira de dados:** o ZIP usa arquivos e materiais do projeto, nunca stores de autenticação, configuração de provedor, conversa, recibos ou preferência. Arquivos do aluno podem conter dados sensíveis; a proposta não promete detectar todo segredo embutido em código. Exclusões reconhecidas precisam ser informadas e não podem reescrever silenciosamente fontes para mascarar conteúdo. A política de contexto enviado à IA continua separada da exportação local.

Já há provas automatizadas de exportação e instalação/build de kits em `verify:canvas-export` e `verify:grid-export`. Preservar e ampliar essas provas para React, convertido e materiais Pinta/Molda, além do ensaio de abrir no VS Code, mudar uma regra e executar novamente. Usar diretório limpo, sem dependências emprestadas do monorepo; registrar Node/gerenciador e comparar arquivos, materiais e comportamento. Estes scripts não foram executados nesta revisão.

O jogo exportado deve funcionar pelos arquivos e dependências declarados; requisitos externos precisam constar da orientação. Zappy e Pensa permanecem serviços da plataforma. Não inclui sincronização bidirecional com pasta externa ou GitHub. ZIP de fonte, pacote de deploy e snapshot editável de importação/handoff mantêm finalidades distintas.

## 8. Arquitetura e integração

| Dono | Evolução | Invariantes |
| --- | --- | --- |
| Core/jornada | Reutilizar capabilities, receitas e contratos puros | Sem dependência UI e sem regra duplicada de acesso |
| Workspace/Monaco | Comandos, navegação, preferências, análise incremental | Instância/foco corretos; atalho não contorna revisão |
| Estado/persistência | Mesmas operações, snapshots, flush, recuperação | Autoria/revisão/escopo/storage/publicação coerentes |
| Tutor/host/member-shell | Sessão Zappy, voz, histórico, referências, créditos | UI sem segredos de provedor; capacidades opcionais |
| Members/runtime | Jobs, artefatos, leases, ledger e autorização | Mesmo coordenador; sem inferência duplicada ou capacidade ampliada silenciosamente |
| Materiais/exportação | Materialização única, destinos explícitos | IDs, bytes, licenças e caminhos consistentes |
| Pensa/aulas/equipes | Adapters existentes | Guia não conclui objetivo; observador não ganha autoria |

Separar documento canônico, preferência, índice/diagnóstico derivado e sessão/artefato de assistência. Índices são limitados e vinculados a instância/projeto/versão; troca de perfil invalida resultados. Aplicação/persistência capturam contexto. Preferência carregada tarde não substitui interação já feita.

Sem usuários Pro legados, contratos novos podem ser diretos. Continuam obrigatórias integrações com clássico/Ponte, conversão, aulas, hosts sem tutor, runtime local/remoto, adapters customizados, observação e publicação. Compatibilidade planejada só se torna comprovada após implementação e testes.

### 8.1 Capacidades reais de cada ambiente

| Ambiente | Contrato preservado | Comportamento da nova interface |
| --- | --- | --- |
| Pro completo Kids | `StudioProEditor`, perfil/projeto, gate e runtime local; rota isolada | Só montar a experiência autorizada e suportada; terminal/preview usam o ambiente existente |
| Aula com Pro remoto | `StudioLesson`/`proRuntime`, configuração e limites do host | Não inicializar WebContainer nem oferecer terminal local onde não contratado; manter atividade/avaliação próprias da aula |
| Host sem tutor/builder/voz | Props e adapters opcionais | Oferecer somente capacidades presentes; ausência não é erro de conexão nem razão para bloquear código |
| Observação/handoff | `editingAccess`, revisão recebida e congelamento da autoria | Navegação permitida conforme host; nenhuma mutação ou comando indireto pode devolver autoria |
| Duas instâncias na mesma aba | Stores de documento separadas; WebContainer com posse exclusiva do FS | A segunda execução local respeita “ambiente em uso”; não reseta o FS da primeira. Testar isolamento sem prometer runtimes locais independentes |
| Ambiente sem suporte ou conexão | Gate atual e erros dos serviços usados | Não inventar fallback remoto nem ampliar suporte a celular; trabalho local já disponível permanece utilizável quando possível, sem prometer boot offline |

Disponibilidade deriva de config, adapters e estado existentes; não criar outro catálogo de permissões concorrente. Menu/atalho deve revalidar contexto na execução, pois autoria ou projeto podem mudar depois de abrir a paleta. Serviço/backend continua sendo autoridade de acesso e cobrança.

Preservar CSP, origem do preview, mensagens verificadas e COOP/COEP nos limites atuais da rota Kids. Novos workers/assets precisam funcionar sob esses headers; não ampliar permissões de aulas para acomodá-los. O suporte efetivo é o contrato do host, não todo navegador que o fornecedor descreve. [Suporte documentado do WebContainer](https://webcontainers.io/guides/browser-support).

### 8.2 Fluxo de dados e sincronização

O documento canônico continua sendo `Project`; buffers de edição e FS do terminal são escritores já coordenados. Índices, diagnósticos e preferências são derivados. A proposta não cria um documento paralelo “mais rápido”.

Nos limites de salvar, exportar, compartilhar, construir, revisar mutação e entregar ao host:

1. Capturar instância/store, projeto, escopo de armazenamento, adapter e permissão relevantes.
2. Materializar buffers síncronos existentes por `pendingEditorEdits`; drenar as operações assíncronas registradas em `flushProjectOperations` quando a ação exigir snapshot reconciliado. Reutilizar o fluxo do serviço de persistência quando ele já fizer essa coordenação, sem duplo flush ou gravação duplicada.
3. Revalidar identidade/permissão após esperas; capturar a versão atual reconciliada. Terminal que continua escrevendo recebe o limite/conflito explícito do sincronizador existente, não espera infinita nem cópia parcial declarada completa.
4. Executar a ação sobre esse snapshot. Uma exportação pode concluir daquela revisão enquanto novas edições seguem; aplicação mutável exige novamente base compatível e a transação atual. Edição posterior não pode ser apagada por um resultado atrasado.
5. Distinguir materialização em memória, gravação local confirmada, sincronização com host/nuvem, publicação e aplicação do builder. “Salvo” não comprova todos esses estados. Falha de preferência não altera o estado de gravação do documento.

`StudioHandle.getProject` é síncrono e não vira uma promessa silenciosamente. Seu contrato não substitui save/handoff assíncronos. Não introduzir espera assíncrona nova no caminho crítico de `pagehide`; preservar a estratégia atual de solicitar gravação e os testes de saída.

Para análise incremental, o resultado se vincula à instância, geração do projeto, versão do arquivo e versão das dependências relevantes. Reutilizar as revisões/identidades existentes; versões locais de consulta não substituem hashes/recibos de operações duráveis. Aplicar patches no worker em ordem e só consultar a revisão confirmada. Import, configuração ou dependência alterados invalidam o conjunto afetado; caminho removido/renomeado não pode deixar diagnóstico navegável antigo. Consulta obsoleta pode ser descartada; escrita não. Reiniciar worker reconstrói a análise a partir do documento, sem resetar texto/undo.

### 8.3 Ciclo de vida e falhas

| Recurso/estado | Ao recolher ou trocar painel | Ao sair/trocar projeto ou falhar |
| --- | --- | --- |
| Monaco e buffers | Preservar models abertos, seleção, scroll e undo; layouts pelo ciclo correto de dimensão | Descartar somente recursos da instância encerrada depois da coordenação exigida; não chamar descarte global de models |
| Análise e listas | Suspender trabalho de apresentação sem consumidor; manter serviços necessários à edição | Invalidar respostas antigas e liberar recursos exclusivos; falha do worker deixa edição disponível e análise marcada indisponível, com retomada explícita |
| Preview/terminal | Manter estado conforme capacidade atual; recolher não inicia/cancela job nem reinicia jogo | Liberar posse/listeners/processos pertencentes ao editor; respeitar o singleton compartilhado e as políticas atuais do runtime |
| Zappy/builder | Um controlador por instância, rascunho preservado, renderização e polling limitados | Sessão visual encerra; trabalho durável segue contrato do servidor e pode ser retomado. Não cancelar por desmontagem |
| Salvamento | Estado visível independentemente do painel | Quota/storage/conflito permanecem recuperáveis e visíveis; não substituir documento por vazio ou marcar salvo |
| Preferências/miniaturas | Atualizações coalescidas e carregamento sob demanda | Falha usa layout seguro sem sobrescrever o documento; URL temporária só é revogada quando não há consumidor |

Estados de busca/análise: aguardando, executando, concluído, parcial/limitado e falhou. Zero itens só significa “nenhum resultado/problema” após concluir a revisão pertinente. Excesso de logs mantém limites e comunica truncamento; não renderizar cada evento de runtime como atualização de todo o workspace. Esgotamento de crédito, falha de rede e build inválido preservam edição e explicam qual ação está indisponível.

### 8.4 Estrutura de implementação e identidade visual

Evoluir os módulos atuais: `modes/pro/workspace` para navegação/comandos/layout; `monaco/pro` para linguagem e protocolo; `state` para coordenação e operações; `components/tutor` para apresentação Zappy; `studio` para contratos de integração; `export` para saídas; Core para conhecimento puro. Novas extrações ficam ao lado do dono correspondente, com dependência unidirecional, sem outro framework interno ou duplicação de stores. O pacote Studio não importa rotas/auth de Kids ou Members; o host injeta adapters e callbacks.

Comandos compartilham descritor e implementação existentes, com contexto, motivo de indisponibilidade e tradução. Labels usam `useT`/locale da instância; tema e tamanho de fonte respeitam os providers/preferências atuais. Usar componentes e tokens do Sistema Zero, incluindo a estrutura compartilhada dos guias de Pensa/Pinta/Molda. Não copiar o tema visual do VS Code nem criar uma segunda biblioteca de UI para se aproximar de sua organização.

Nenhum conhecimento de receita é inferido pelo nome arbitrário de uma pasta. Kits e guias usam metadados e símbolos verificáveis. A reorganização de pastas do aluno, quando solicitada, continua operação explícita e revisada; esta evolução não migra automaticamente todos os projetos para um novo esqueleto.

## 9. Lotes, review e critérios de saída

| Lote | Entrega | Saída obrigatória |
| --- | --- | --- |
| 0 — Evidência | Inventário de capacidades Zappy/hosts, baseline, fixtures, budgets, testes já existentes e perfil | Referência reproduzível; métricas críticas fechadas; lacunas de cobertura e custos classificados por evidência |
| 1 — Desempenho | Corrigir custos comprovados de busca/símbolos/listas/agendamento e dos fluxos atuais de save/export | Comportamento e Zappy preservados; metas dos cenários afetados atendidas |
| 2 — Editor convencional | Explorer, comandos/atalhos, breadcrumbs, símbolos e estados | Mouse/teclado equivalentes; modelos/rascunhos/jobs/preview preservados; desempenho aprovado |
| 3 — Diagnóstico e materiais | Ações sobre problemas, usos de materiais e guias opcionais | Fontes/revisões corretas; processamento limitado; assistência acessível |
| 4 — Portabilidade e full review | Aperfeiçoar exportação de fonte existente e ensaio no VS Code | Projeto editável fora; regressões Zappy/hosts/persistência/performance/publicação verificadas |
| Posteriores | Inspector, sourcemaps remotos, grupos, substituição multiarquivo, Git/threads | Especificação e benefício próprios |

Não fixar prazo antes do lote 0. Revisar e corrigir cada lote antes do seguinte; revisão final sobre o conjunto e a staging atualizada. Esta tarefa entrega a proposta revisada, sem implementação/commit/merge novos.

### 9.1 Entregáveis e verificação por responsabilidade

| Responsabilidade | Entregável para review | Evidência mínima |
| --- | --- | --- |
| Performance, lote 0 | Manifesto das fixtures, budgets absolutos e relativos, ambiente e script de medição | Dados brutos da base, custo da instrumentação e reprodução documentada |
| Editor/linguagem, lote 1 | Mudança localizada ligada a um custo medido | Resultado equivalente antes/depois; versão antiga ignorada; dependente atualizado; latência/fila/memória medidas |
| Workspace, lote 2 | Comandos com contexto, estados, foco e organização | Mesma operação por botão/menu/atalho; observador não modifica; troca de painel preserva editor e Zappy |
| Integração, lotes 2–3 | Matriz de hosts/capacidades da seção 8.1 | Pro local, aula remota e host mínimo; troca de perfil; conflito de posse do runtime; CSS/locale/headers reais |
| Diagnóstico/materiais, lote 3 | Fontes e cobertura explícitas; processamento limitado | Caso obsoleto, uso dinâmico, material alterado no terminal, logs em volume e falha de recurso |
| Exportação, lote 4 | Evolução do `sourceExport`, avisos e documentação por manifesto | ZIP correto sem alterar fonte; lock/README preservados; arquivos omitidos informados; execução externa e custo de empacotamento |
| Integração final | Relatório por capacidade e risco, inclusive achados de todos os lotes | Checks aplicáveis verdes no conjunto integrado e nenhum achado relevante sem tratamento |

Reaproveitar `proWorkspaceOperations`, `proFsSync`, `proAssetSync`, revisão/persistência e seus testes para os contratos correspondentes. A suíte de browser `e2e/pro-workspace.config.ts` já reúne workspace, revisão do builder e assistência Zappy. Os scripts `check:pro-kits`, `check:pro-typescript-libs`, `verify:canvas-export` e `verify:grid-export` já existem; não duplicar provas com nomes novos. Antes de contar uma suíte como portão, verificar que o comando realmente a seleciona e que seus skips/retries não ocultam o cenário necessário. Acrescentar somente testes de comportamentos/riscos novos.

### 9.2 Integração com staging e recuperação

Antes de cada lote, registrar o commit-base e comparar o avanço da staging nos módulos afetados e dependências compartilhadas, incluindo UI, host, autorização, schemas e runtime. Atualização fora de `packages/studio` pode alterar a integração. Reconciliar conflitos por contrato e repetir os checks afetados no resultado integrado; resultado da branch isolada não comprova o merge.

Esta evolução não prevê migração de documento, substituição do coordenador ou novo protocolo de publicação. Preferências novas são opcionais e validadas; valor inválido restaura layout seguro, sem perder projeto. Se surgir necessidade de mudança nesses contratos, ela precisa de especificação/review próprios antes de entrar no lote. Reversão de UI/índice deve ser possível sem transformar arquivos ou desfazer trabalhos duráveis do Zappy; não manter duas implementações completas por precaução.

O review de cada lote examina correção, custo, integração e remoção de caminhos substituídos. Timeout maior, debounce que atrasa gravação, regex no lugar da semântica, teste desativado e fallback que apresenta sucesso falso não resolvem um achado. O relatório final identifica base, comandos, resultados, limitações e qualquer medição ainda não realizada; lacuna de aceite não é marcada como concluída.

## 10. Matriz de validação

- **Editor:** menus/paleta/atalhos, foco, ABNT2, seleção, undo, refatoração, Unicode e arquivos grandes; estados indexando, limitado, vazio e falha.
- **Zappy:** todos os itens da seção 4, com respostas controladas; browser real para foco/layout/voz/diff. Falhas e retornos tardios obrigatórios.
- **Concorrência:** digitar com jogo/Zappy; renomear durante análise; proposta depois de edição; salvar com terminal; troca A→B→A/perfil e duas instâncias.
- **Durabilidade:** falha de storage/adapter, recibo pendente, reabertura, recuperação, exportação e publicação. Nenhuma otimização reduz flush ou mascara conflito.
- **Hosts/acesso:** Lenda/equipe autorizados e demais postos bloqueados; hosts restritos, observação, aula, clássico/Ponte e convertido.
- **Performance:** fixtures, contadores e concorrência da seção 5; medir host real e lazy, registrar ambiente e dados.
- **Portabilidade:** scripts, dependências, assets, Node, exclusões informadas e ausência de dados internos da plataforma no pacote; abertura/edição no VS Code.
- **Transferência:** alunos elegíveis realizam tarefas equivalentes nos dois editores: localizar símbolo, mudar regra, investigar erro, executar comando e revisar diff. Observar o que precisaram reaprender.
- **Acessibilidade:** teclado, foco, zoom, contraste, temas e leitor de tela. Aparência profissional não exige fonte pequena ou ícones sem nome.

Telemetria de performance coleta duração/contadores/faixas de tamanho/códigos de erro, sem código, prompts, áudio ou nomes privados por padrão. Velocidade e quantidade de perguntas ao Zappy não viram nota do aluno.

## Evidências e limites

- [Acesso](../../packages/member-shell/src/lib/studio-tier.ts), [gate Kids](../../packages/community-kids/src/server/studio-pro-access.ts) e [jornada](../../packages/core/src/journey/catalog.ts).
- [Busca](../../packages/studio/src/modes/pro/workspace/search.ts), [navegador](../../packages/studio/src/modes/pro/workspace/ProNavigator.tsx), [símbolos/comandos](../../packages/studio/src/modes/pro/workspace/ProCodeTools.tsx) e [linguagem](../../packages/studio/src/monaco/pro/session.ts).
- [Zappy](../../packages/studio/src/components/tutor/ZappyPanel.tsx), [contrato](../../packages/studio/src/studio/tutor.ts), [construtor](../../packages/studio/src/components/tutor/ProBuilderPanel.tsx), [decisões](../../packages/studio/src/components/tutor/ProAssistancePanel.tsx) e [créditos](../../packages/studio/src/components/tutor/ZappyCredits.tsx).
- [Layout](../../packages/studio/src/modes/pro/workspace/ProWorkspaceLayout.tsx), [operações](../../packages/studio/src/state/proWorkspaceOperations.ts), [coordenação](../architecture/studio-pro-builder-coordinator.md).
- [Limites locais](../../packages/studio/src/state/proTree.ts), [remotos](../../packages/core/src/studio/pro-limits.ts), [performance de kits](../../packages/studio/e2e/pro-kit-performance.spec.ts) e [E2E workspace](../../packages/studio/e2e/pro-workspace.spec.ts).
- [Materialização](../../packages/studio/src/export/fileMap.ts), [fonte para VS Code](../../packages/studio/src/export/sourceExport.ts), [compressão](../../packages/studio/src/export/zip.ts) e [deploy](../../packages/studio/src/export/deployTemplates.ts).
- [Topbar/exportação](../../packages/studio/src/components/layout/Topbar.tsx), [stores por instância](../../packages/studio/src/state/studioStores.ts), [operações pendentes](../../packages/studio/src/state/projectOperations.ts), [sync terminal](../../packages/studio/src/modes/pro/proFsSync.ts) e [posse do runtime](../../packages/studio/src/components/terminal/webContainerClient.ts).
- [Core do editor](../../packages/studio/src/studio/StudioCore.tsx), [host Pro](../../packages/member-shell/src/components/studio/studio-pro-editor.tsx), [runtime remoto](../../packages/studio/src/studio/pro-runtime.tsx), [embedding](../../packages/studio/docs/embedding.md), [headers Kids](../../packages/community-kids/next.config.ts) e [CI existente](../../.github/workflows/ci.yml).

Revisão estática de código/contratos/testes, comparação Git e documentação oficial VS Code/Monaco. Sem novos benchmarks, builds, serviços pagos ou testes com alunos. Metas e benefícios de transferência ainda exigem validação. Nenhum código de produto foi alterado.
