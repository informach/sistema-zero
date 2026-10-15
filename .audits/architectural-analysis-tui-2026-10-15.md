# Auditoria do TUI e das referências de integração

Data: 15/10/2026. Objetivo: fundamentar a conclusão do TUI como ferramenta local de desenvolvimento e operação para a equipe do Sistema Zero.

## Escopo e qualidade da evidência

Foram lidos todos os **16 arquivos de `packages/tui/src`, com 1.476 linhas**, além de `package.json`, `tsconfig.json` e `CLAUDE.md`. Foram inspecionados os caminhos centrais de execução, ferramentas, persistência e autenticação dos quatro repositórios externos, e fronteiras relevantes do monorepo. Isso não constitui auditoria exaustiva dos demais pacotes nem de todos os componentes visuais externos.

Os repositórios foram clonados com histórico raso em diretório temporário; seus scripts não foram executados e suas dependências não foram instaladas. As conclusões sobre eles são de inspeção estática, não de operação homologada na nuvem. README e código foram confrontados quando descreviam o mesmo comportamento.

O workspace contém trabalho anterior em vários pacotes, incluindo `marketing-desktop`. Esse trabalho foi tratado como estado observado em desenvolvimento, não como API estável. Nenhum código de aplicação foi modificado nesta análise.

Inventário: [CSV dos arquivos](tui-file-inventory-2026-10-15.csv). Revisões, contagens e verificações: [evidências JSON](tui-research-evidence-2026-10-15.json). Decisões propostas: [proposta integrada](../docs/plans/2026-10-15-tui-proposta-integrada.md).

| Referência | Revisão examinada | Arquivos rastreados | Arquivos de código¹ |
|---|---|---:|---:|
| Nightcode | `255883f130d350541e806f2431e7df32369f24bf` | 78 | 60 |
| Browser Automation App | `7b7ae9755f239c60f33d1edcefbde0a251a3fb02` | 315 | 128 |
| AI Teammates | `de32f461cc9e0ddf4c5087af07c65cf06df7d683` | 738 | 164 |
| Sendkit | `e4f47cb77bcd4dddcb1af483ec014e654740ee74` | 27 | 9 |

¹ TS/TSX/JS/JSX/MJS/CJS, excluindo diretórios de skills e código gerado. Contagem não significa leitura integral de cada arquivo externo. Não foram encontrados arquivos de testes com convenções `*.test.*`, `*.spec.*`, `tests/` ou `__tests__/` nesses conjuntos; isso não prova ausência de qualquer verificação externa ao repositório.

## 1. Diagnóstico local

O TUI é um scaffold de interface. O maior trabalho pendente é construir o sistema de execução por trás dele. Não há fundamento para estimar que o produto esteja quase pronto com base na aparência da tela.

| Achado | Evidência | Impacto | Confiança |
|---|---|---|---|
| Envio não faz trabalho | `src/index.tsx:24`, `onSubmit={() => {}}` | Texto é aceito e limpo sem modelo, tarefa ou resposta | Alta |
| Nove dos dez comandos não têm ação | `components/command-menu/commands.tsx`; só `/exit` define `action` | Paleta sugere sessões, modelos e login inexistentes | Alta |
| Estado de execução fictício | `components/status-bar.tsx:10`, modelo fixo; modo Build fixo | Usuário não vê configuração real | Alta |
| Binário declarado ausente | `package.json`, `bin.sistemazero`; ausência de `bin/sistemazero` | `link:tui` não entrega o executável esperado | Alta |
| Preferências usam namespace de outro produto | `providers/theme/index.tsx:9`, `~/.nightcode/preferences.json` | Compartilha arquivo com Nightcode; persistência substitui o JSON inteiro | Alta |
| Tema aplicado apenas parcialmente | Cores literais em `index.tsx` e `input-bar.tsx` | Alterar tema não atualizaria toda a tela; comando de tema ainda não ligado | Alta |
| Diálogo sem consumidores | `dialog-search-list.tsx`, busca de imports e usos no pacote | 124 linhas preparadas, ainda sem fluxo real | Alta |
| Runtime e persistência de tarefas ausentes | Manifesto e leitura integral de `src` | Sem sessões, tools, modelos, cancelamento de trabalho ou retomada | Alta |
| Sem scripts próprios de testes e typecheck | `package.json` | CI que usa `--filter '*' test/typecheck` não recebe checks desses tipos do TUI | Alta |

Não há motivo para excluir `DialogSearchList` como limpeza: o componente tem destino claro nos seletores previstos. “Não integrado” descreve melhor seu estado que “lixo”. A lista vazia permite que a seta para baixo calcule índice `-1`; precisa ser corrigida ao integrar o componente e verificada com lista vazia e mudança de filtro.

Outras dívidas pequenas: ação assíncrona de comando não é aguardada/tratada em `InputBar`; não existe restauração do texto em falha de envio; timers de toast não têm cleanup de desmontagem; parte da interface está em inglês. São preparações necessárias para uso real, não a principal dificuldade arquitetural.

### Arquivos examinados e destino

| Arquivo relativo a `packages/tui` | Linhas | Destino recomendado |
|---|---:|---|
| `src/index.tsx` | 37 | Bootstrap e composição de telas; conectar cliente do runtime |
| `src/theme.ts` | 568 | Preservar catálogo; aplicar tokens consistentemente |
| `src/components/header.tsx` | 10 | Preservar identidade; ampliar contexto do workspace |
| `src/components/input-bar.tsx` | 159 | Preservar base; fila, cancelamento, referências e erros |
| `src/components/status-bar.tsx` | 13 | Substituir valores fixos por projeção do runtime |
| `src/components/border.tsx` | 18 | Preservar primitivas |
| `src/components/dialog-search-list.tsx` | 124 | Integrar e corrigir navegação em listas vazias |
| `src/components/command-menu/commands.tsx` | 57 | Registro real de comandos por capacidade |
| `src/components/command-menu/types.ts` | 13 | Contrato de comandos com resultados e erros |
| `src/components/command-menu/filter-commands.ts` | 7 | Preservar; ampliar busca se necessário |
| `src/components/command-menu/use-command-menu.ts` | 113 | Preservar comportamento; testar foco e ciclo de vida |
| `src/components/command-menu/index.tsx` | 72 | Preservar; indicar indisponibilidade e ação em curso |
| `src/providers/keyboard-layer/index.tsx` | 88 | Manter roteamento; distinguir interromper, fechar e sair |
| `src/providers/theme/index.tsx` | 74 | Separar armazenamento da UI e namespace próprio |
| `src/providers/toast/index.tsx` | 114 | Manter feedback; cleanup e eventos reais |
| `src/providers/toast/types.ts` | 9 | Preservar |

Foram rastreados os imports e consumidores dos componentes. Não foi identificada dependência circular relevante no pequeno grafo local. Não há evidência para sugerir reescrita do renderer. `theme.ts` é o maior arquivo, mas é um catálogo declarativo, não um objeto com responsabilidades excessivas. A duplicação relevante para a próxima etapa é **conceitual e futura**: evitar um executor diferente para chat, workflow, MCP e cada cliente oficial.

### Verificações executadas

| Verificação | Resultado observado | O que prova |
|---|---|---|
| `bun run check`, dentro de `packages/tui` | Exit 0; 18 arquivos | Biome aceita o estado atual |
| TypeScript local, `--noEmit -p tsconfig.json` | Exit 0; sem diagnósticos | Tipos do scaffold aceitos |
| Build do entrypoint com `--target bun`, saída temporária | Exit 0; 44 módulos | Empacotamento do entrypoint funciona |
| Presença de `bin/sistemazero` | Ausente | Instalação por bin ainda incompleta |

Ambiente: Windows, Bun `1.3.11`, OpenTUI core/react instalados `0.3.0`. Build não prova inicialização do binário nativo do renderer, comportamento em terminal real ou funcionamento de ferramentas que ainda não existem. Não houve chamada paga a modelos, execução de serviços externos nem smoke de interface interativa.

## 2. Nightcode: boa referência de interação, motor insuficiente para o objetivo

O fluxo conecta OpenTUI/React, `useChat`, transporte HTTP, Hono, `streamText`, contratos Zod e execução local. Sessões são registros Postgres com histórico JSON. O modo Plan limita ferramentas a leitura; Build acrescenta escrita, edição e shell. Há seleção de modelo, diálogos, autenticação Clerk e créditos Polar. Fontes: [chat do cliente](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/cli/src/hooks/use-chat.ts), [contratos](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/shared/src/schemas.ts), [chat do servidor](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/server/src/routes/chat.ts).

O que aproveitar: hierarquia visual, sessões, partes de mensagem, indicação de ferramentas, separação de contratos e modos, metadados de uso. O que adaptar: execução para processo local, armazenamento de eventos, modelos configuráveis, permissões, shell Windows e tratamento completo de falhas.

Limites concretos de [local-tools.ts](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/cli/src/lib/local-tools.ts):

- Contenção de caminho é lexical (`resolve`/`relative`), sem resolver symlinks/junctions. Não estabelece isolamento de filesystem.
- `bash -c` e `grep` são dependências implícitas; não são uma implementação nativa de PowerShell/Windows.
- O shell herda todo `process.env`; limitar o `cwd` não limita o que um comando pode acessar.
- `readFile` e captura de stdout/stderr acumulam conteúdo antes de truncar. O teto apresentado ao modelo não limita a alocação anterior.
- Escritas são diretas, sem patch transacional, conferência de hash-base ou checkpoint. Duas tarefas podem sobrescrever trabalho concorrente.
- Timeout chama `proc.kill()`, sem política explícita de árvore de processos; `executeLocalTool` não recebe `AbortSignal` do chat.

Em `use-chat`, interromper chama `chat.stop`; o executor local não está conectado a esse cancelamento. A rota do servidor salva o histórico ao concluir e pula mensagens com tools pendentes ou resposta abortada. Isso não é um journal durável de operações. Duas requisições podem partir do mesmo JSON anterior sem CAS de versão. São riscos deduzidos do fluxo, não incidentes reproduzidos em produção.

O catálogo chamado “agents” representa os modos Plan/Build. Não entrega coordenador, mailbox, scheduler, worktrees ou integração de patches. O launcher ainda importa o código-fonte e `.env` do monorepo de referência; não é modelo pronto de distribuição independente. [Launcher](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/cli/bin/nightcode).

## 3. Browser Automation App: transformar ações em automações verificáveis

Entrega canvas React Flow, colaboração Liveblocks, nós Start/Open URL/Act/Observe/Extract/Agent/Send Email, interpolação de dados, execução Trigger.dev, sessão Stagehand/Browserbase compartilhada e replay. Cada nó tem status, duração, saída e erro. Fontes: [runner](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/tasks/run-workflow.ts), [executores](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/nodes/node-executors.ts).

O aproveitamento pertinente é o **modelo de automação e suas evidências**, com autoria textual/TUI e visualizador local. Canvas multiusuário, Clerk Billing e dependência obrigatória de Browserbase/Liveblocks/Trigger.dev não correspondem ao uso local confirmado.

Limites a corrigir ao adaptar:

1. O runner percorre um `for` sequencial em ordem topológica. Não é scheduler paralelo geral.
2. Seleciona todos os nós que tocam alguma aresta, não apenas os alcançáveis a partir do Start. A validação verifica número de triggers, presença de arestas e ciclo; não prova coerência completa dos IDs, alcançabilidade, contratos de dados ou campos. [Validação](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/lib/validate-graph.ts).
3. `runWorkflowAction` salva o grafo e envia somente `workflowId`/`orgId`; o worker lê o grafo atual depois. Uma edição entre agendamento e início pode mudar o que será executado. A proposta precisa de versão imutável por run. [Actions](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/actions.ts).
4. Referência de saída ausente vira string vazia, escondendo erros de ligação. O novo motor deve diferenciar ausência permitida de contrato inválido. [Interpolação](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/lib/interpolate.ts).
5. Há retries de tarefa e envio de email sem chave de idempotência no executor. Não se deve inferir efeito externo exatamente uma vez a partir de “execução durável”. [Configuração](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/trigger.config.ts), [envio](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/nodes/send-email.ts).
6. Cancelamento verifica organização ativa, mas não mostra vínculo do `runId` a ela; replay verifica plano/organização, mas não mostra ownership da sessão solicitada. Mesmo localmente, artefatos e runs devem estar vinculados ao workspace, não apenas a um ID recebido. [Replay](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/app/api/replays/%5BsessionId%5D/route.ts).

Stagehand suporta navegador local; portanto, Browserbase pode ser adaptador opcional. Traços e screenshots locais precisam de implementação explícita; não aparecem automaticamente ao trocar `env`. [Documentação Stagehand](https://docs.stagehand.dev/v3/configuration/browser), [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer).

## 4. AI Teammates: identidade e continuidade, ainda sem engenharia multiagente

Cada bot tem nome, função, instruções e sandbox Daytona. Há chats diretos/grupais, handoff, memória em `MEMORY.md`, terminal, arquivos, captura de tela, mouse/teclado, desktop noVNC, execução persistente via Trigger.dev e ledger idempotente de uso. Fontes: [agente](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/trigger/chat.ts), [ferramentas](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/lib/sandbox-tools.ts), [schema](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/db/schema.ts).

O handoff muda o bot atual e seu conjunto de ferramentas durante o turno. Um conjunto `held` impede retornar a quem já recebeu a solicitação. Isso oferece colaboração sequencial; não implementa tarefas paralelas com dependências, leases, propriedade de arquivos e consolidação Git.

O que incorporar: perfis de especialistas, contexto separado, handoff com escopo e resultado, memória durável, execução desacoplada da interface, custos de tentativas e desktop isolado opcional.

O que ampliar:

- `MEMORY.md` é simples, append-only e truncado na leitura; não traz proveniência, validade, revisão e invalidação por mudanças no código.
- O modelo é fixo em `gpt-5`; há adaptação específica de imagens entre AI SDK 7 e o provider Neon. Não é um catálogo portátil entre todos os provedores. [Modelo](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/lib/model.ts).
- A restrição de 50 passos e o orçamento do turno são úteis, mas nossa concorrência precisará reservar orçamento compartilhado antes das chamadas.
- Persistência do sandbox não substitui snapshots de workspace, merge seguro ou isolamento das credenciais do operador.
- Memória da equipe precisa ser controlada por projeto e usuário; não copiar automaticamente notas privadas de um agente para todos.

A proposta adota worktree por tarefa que escreve e deixa desktop em VM/sandbox como capacidade adicional. Um worktree organiza arquivos; não é uma barreira de segurança para processos.

## 5. Sendkit: principal contribuição é a arquitetura de capacidades

O núcleo define schema e operação Telegram; CLI, MCP stdio e MCP HTTP chamam a mesma implementação. Skills documentam o uso. É um bom padrão para expor operações do Sistema Zero a pessoas, agentes e scripts. Fontes: [operação](https://github.com/code-with-antonio/sendkit/blob/e4f47cb77bcd4dddcb1af483ec014e654740ee74/packages/core/src/operations.ts), [MCP local](https://github.com/code-with-antonio/sendkit/blob/e4f47cb77bcd4dddcb1af483ec014e654740ee74/packages/local-mcp/src/index.ts), [MCP remoto](https://github.com/code-with-antonio/sendkit/blob/e4f47cb77bcd4dddcb1af483ec014e654740ee74/apps/remote-mcp/src/index.ts).

Não é uma suíte de email, inbox, contatos ou campanhas. A única operação concreta examinada envia mensagem no Telegram.

Cuidados na adaptação:

- O MCP remoto usa `/:botToken/mcp`; não reproduzir segredos em URLs. Usar referências de credenciais resolvidas no host.
- A operação não define timeout, cancelamento, retry classificado ou reconciliação de envio incerto.
- `--json` aparece no README, mas o CLI examinado já imprime JSON e não registra essa opção. Implementação tem prioridade sobre exemplo documental. [CLI](https://github.com/code-with-antonio/sendkit/blob/e4f47cb77bcd4dddcb1af483ec014e654740ee74/packages/cli/src/index.ts).
- Adaptadores não devem duplicar autorização, regras e validação. MCP também deve passar pelo dispatcher da aplicação.

Não foram encontrados arquivos LICENSE/COPYING/NOTICE nos quatro snapshots. O README do Sendkit mostra badge MIT e link `./LICENSE`, mas o arquivo não está nesse snapshot. Antes de incorporação literal, esclarecer a licença/proveniência e registrar atribuição. O desenho pode avançar por reimplementação dos contratos e comportamentos necessários.

## 6. Integração com o que já existe no Sistema Zero

| Área existente | Evidência | Aproveitamento e limite |
|---|---|---|
| Dev/ops local | `scripts/dev.ts` | Adapter para status, logs, subir/parar serviços; evoluir registro fixo e respostas estruturadas sem segundo gerenciador concorrente |
| Auth e gateway | `packages/auth/README.md`; pipeline do gateway | Login de staff apenas para operações conectadas; não exigir login para editar repositório local |
| Mensageria | `messaging/.../routes/send.routes.ts` | Templates, agendamento, status e idempotência; usar contrato autorizado via gateway, não distribuir segredo S2S geral |
| Helpdesk | `packages/helpdesk/CLAUDE.md` | Consulta, resumo e rascunho; preservar aprovação humana de respostas |
| Clientes oficiais | `marketing-desktop/src/main/{providers,native-client,json-rpc}.ts` | Candidato a extração de transporte; código WIP, orientado a marketing e com capabilities limitadas |
| Skills | 88 `SKILL.md` em `.agents/skills` | Descoberta por metadados e carga sob demanda; adaptar recursos indisponíveis, sem fingir execução |
| Core | `packages/core/package.json` | Reusar subpaths de erros/logging/result/security quando adequados; não acoplar agentes ao catálogo de domínio inteiro |
| CI | `.github/workflows/ci.yml` | Acrescentar scripts efetivos e testes de terminal/plataforma; build/lint isolados não demonstram capacidades |

Auth atual não é automaticamente um servidor OAuth/device-flow para CLI. A integração de contas internas precisa escolher um fluxo suportado ou adicionar o contrato necessário. Acesso humano à API também não pode ser obtido forjando headers internos de identidade.

A ponte atual de marketing desativa ferramentas do Claude e usa thread efêmera/leitura no Codex. O cliente JSON-RPC recusa solicitações interativas do servidor. Isso é evidência útil de transporte e login, não um backend de coding completo. Os wrappers de subprocesso também precisam de revisão para supervisão de árvore, fluxo de logs e retomada.

## 7. Modelos e clientes oficiais: verificação adicional solicitada pelo usuário

Decisão de produto: OpenRouter no motor próprio; Claude Code e Codex como backends opcionais, autenticados por seus mecanismos oficiais. São duas abstrações diferentes: **provedor de modelo** e **executor de agente**.

OpenRouter publica catálogo, capacidades e preços, e documenta tool calling. O catálogo deve ser cacheado e validado; disponibilidade de modelo não prova suporte a toda ferramenta/mídia de que a tarefa necessita. [Modelos](https://openrouter.ai/docs/guides/overview/models), [tool calling](https://openrouter.ai/docs/guides/features/tool-calling).

No ambiente, `codex-cli 0.162.1` expõe app-server/stdio e geração de schemas; Claude Code `2.1.299` expõe modo programático e saída JSON. Foram consultados somente versão/ajuda, sem login, leitura de credenciais ou chamada de inferência.

O Codex App Server documenta login ChatGPT, threads, turns, eventos e pedidos de aprovação. O adapter deverá mapear esses estados e gerar tipos contra versão compatível. [App Server](https://learn.chatgpt.com/docs/app-server), [autenticação](https://learn.chatgpt.com/docs/auth).

Claude Code documenta execução programática, streaming, retomada e autenticação por assinatura. Não usar `--bare` por conveniência no backend de assinatura: a ajuda local informa que esse modo desativa leitura OAuth/keychain. Credenciais de API podem ter prioridade sobre a assinatura; o modo efetivo precisa ser verificado e exibido. [Execução programática](https://code.claude.com/docs/en/headless), [autenticação](https://code.claude.com/docs/en/authentication).

Existe também documentação recente de Sign in with ChatGPT para apps elegíveis. É uma possibilidade separada, sujeita a elegibilidade e escopos, não uma autorização presumida para converter qualquer assinatura em API genérica. Para este projeto interno, o primeiro caminho recomendado continua sendo o cliente oficial. [Integração oficial](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).

## 8. Conclusão técnica

As referências ajudam a definir UX, contratos e capacidades. Nenhuma entrega, isoladamente ou por simples junção, o runtime local robusto pretendido. O investimento central deve ser um supervisor persistente com ferramentas comuns, políticas verificáveis, controle de concorrência, contexto eficiente, execução no navegador e backends de IA intercambiáveis por tarefa.

Claude Code já documenta subagentes/equipes, skills, MCP, hooks e checkpoints. Esses recursos não devem ser anunciados como novidades exclusivas. A vantagem pretendida deve ser demonstrada em tarefas do Sistema Zero: mais resultados corretos, melhor recuperação, custo controlado e integração com seus serviços. [Recursos](https://code.claude.com/docs/en/features-overview), [equipes](https://code.claude.com/docs/en/agent-teams), [checkpoints](https://code.claude.com/docs/en/checkpointing).
