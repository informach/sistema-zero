# Full review do TUI — 15/10/2026

Base local: `staging` em `8ea02d96e48f447762ee070e8334d8a6c515c437`. Correções na branch
`fix/tui-full-review`, worktree `sistema-zero-tui`. A worktree original, com alterações de
outras iniciativas, foi preservada. Escopo: implementação TUI B00–B12, quatro pacotes de agente,
scripts de distribuição e alterações de integração em auth/core/messaging/gateway/Studio.

## Método e cobertura

O [inventário reproduzível](tui-full-review-2026-10-15/inventory.ts) lê todos os arquivos desse
escopo, registra SHA-256, tamanho, exports, imports e candidatos a código sem uso. O
[resultado](tui-full-review-2026-10-15/inventory.json) distingue triagem estática de prova de
ausência de defeitos. Imports dinâmicos, entradas CLI, workers e contratos públicos foram
conferidos separadamente. Não houve `any`, `@ts-ignore`, `@ts-nocheck` ou double cast nos
arquivos TypeScript inventariados; o grafo de imports estáticos coletado não encontrou ciclos.

A leitura manual acompanhou os fluxos entre camadas, os diffs, as falhas anteriores e as
regressões. Testes usam SQLite, HTTP local, árvores de processos Windows, ConPTY, Chromium,
worktrees Git e renderer reais quando pertinentes. Provedores determinísticos exercitam o
protocolo de inferência; isso não é homologação de contas externas. Não houve envio de mensagens,
criação de PR externo, deploy nem push.

| Área | Invariantes conferidas |
|---|---|
| Contratos, supervisor e IPC | transições terminais, capacidade, cancelamento concorrente, autenticação, frames e fechamento |
| Journal, orçamento e artefatos | commit antes do ack, idempotência, reservas da família, custo desconhecido, retenção e recuperação |
| Dispatcher e autorizações | Plan, escopo de ferramentas, aprovação do payload, efeitos incertos e ausência de replay automático |
| Arquivos, contexto e Git | travessia, credenciais, aliases Windows, hashes, checkpoint parcial, WIP, integração e revisão de equipe |
| Processos, ambientes e serviços | Job Object, entrada bloqueada, quotas existentes, lease/generation, porta própria e preservação de processos alheios |
| Browser e preview | proxy/DNS, origem local concedida, revisão de página, transferências explícitas, evidência vinculada ao código |
| OpenRouter, Claude e Codex | stream completo antes do dispatch, limites, uso/custo, sessão nativa e bridge MCP |
| MCP e integrações de equipe | schema validado, segredo por conexão, OAuth/PKCE, sessão vigente, RBAC, recibo por ator e resposta incerta |
| Teams, workflows e schedules | DAG, limites, handoff imutável, CAS por generation, retomada explícita, horário IANA e falha de coordenador |
| TUI e distribuição | projeção do estado, paginação, teclado/Unicode/resize, pacote autônomo, upgrade e rollback |

## Achados corrigidos

Todos os itens abaixo têm confiança alta e estão corrigidos no código desta revisão.

| ID | Gravidade | Causa e correção | Evidência |
|---|---|---|---|
| R01 | Alta | Falha em `beforeQueue` deixava run durável `queued`, executável em retry. Admissão cancela definitivamente a run recusada e mantém a mesma identidade no retry. | Novo teste falhou com `queued`, passou com `canceled`. |
| R02 | Alta | Verificação de capacidade antes de `await` permitia ultrapassar a fila sob concorrência. Admissão serializada cobre validação, persistência e entrada na fila. | 110 submits simultâneos: dois executores + 100 na fila; oito recusas. |
| R03 | Alta | Cancelamento fazia leitura/transição separadas e concorria com início/fim da execução. Nova operação transacional `run.cancel`, idempotente, com revogação garantida do controller. | Cancelamentos repetidos e concorrentes de dez tarefas, incluindo fila e executores. |
| R04 | Alta | Exceção em hook de shutdown interrompia a limpeza e podia deixar journal/IPC abertos. Fechamento único agrega erros, cancela fila/execuções, tenta todos os cleanups e fecha journal e host. | Duas chamadas de shutdown, falhas em dois hooks, segundo recurso fechado uma vez, runs canceladas e banco reaberto. |
| R05 | Alta | Falha do worker de armazenamento não revogava automaticamente tarefas já executando. Supervisor agora entra em `failed`, publica a causa e aborta execuções antes de qualquer nova admissão. | Injeção do evento de falha do Store comprova abort e recusa de novos submits. |
| R06 | Alta | Coordenadores podiam apenas registrar erro em stderr e deixar runtime aparentemente pronto, sem avanço. Falha não tratada de workflow/schedule/team agora interrompe despacho e aparece na projeção; recuperação exige reinício explícito. | Novo teste de falha do coordenador; regressões de teams/workflows/schedules. |
| R07 | Alta | Comparações case-sensitive permitiam acessar `.ENV`/`.GiT` no Windows. Política única considera caixa e aliases; bloqueia ADS, devices, controles e componentes com ponto/espaço final. Lista, índice, snapshot e export reutilizam a exclusão. | Teste reproduziu leitura permitida antes; dez variantes proibidas e caminho comum após correção. |
| R08 | Alta | Watchdog de ownership também escrevia no stdin do filho. Uma pipe cheia bloqueava a leitura do EOF que revoga o job. Escrita agora tem thread e fila limitadas próprias; revogação mata o job sem aguardar a escrita. | Filho que nunca lê 128 KB termina por timeout; PID deixa de existir; regressões de argv, descendentes, RPC e ConPTY. |
| R09 | Média | Consulta PowerShell/WMI enumerava processos/conexões e já havia estourado prazo. Helper consulta TCP nativo e confirma cada listener no Job Object de identidade aleatória do processo. | IPv4/IPv6, descendente, porta alheia, job encerrado e benchmark abaixo. |
| R10 | Média | Tail inicial podia conter conclusão posterior ao snapshot, mas a TUI mantinha run como ativa. Aplica os eventos iniciais antes de seguir o stream. | Teste falhou com `running`, passou com `succeeded`, preservando input original. |
| R11 | Média | Descarte do buffer de 300 eventos perdia o cursor do histórico anterior. Cursor acompanha o primeiro evento retido. | 500 eventos recebidos, 300 retidos e cursor 201 para paginação sem lacuna. |
| R12 | Baixa | Listener de pergunta podia sobreviver temporariamente a erro de leitura. Cleanup em `finally`, inclusive no cancelamento/resposta. | Regressão de perguntas/cancelamento e revisão do ciclo de listeners. |
| R13 | Baixa | Instruções do pacote descreviam scaffold, submit vazio e bin inexistente. Atualizadas para os fluxos, comandos e limites reais; removidos Header e DialogSearchList sem consumidores. | Busca em packages/scripts e typecheck/renderer. |

O review das próprias correções também preservou a associação de recibos terminais aos
coordenadores: um retry idempotente após recovery deve informar a identidade existente ao
schedule/workflow, sem executar novamente. Esse caso tem teste dedicado junto à admissão.

Os candidatos a exports sem referência do inventário não foram removidos indiscriminadamente:
tipos de `agent-core` são contratos públicos; exports de auth/Studio têm consumidores fora do
recorte ou compatibilidade deliberada. A única consolidação funcional foi a política de nomes
protegidos, antes repetida com diferenças. Não houve refatoração cosmética de módulos grandes
que aumentasse o risco desta entrega.

## Desempenho da correção de portas

[Ensaio reproduzível](tui-full-review-2026-10-15/ports.ts),
[amostras brutas](tui-full-review-2026-10-15/ports.json): mesmo serviço próprio, uma rodada de
aquecimento e dez alternâncias. A baseline mede a consulta WMI anterior, leitura do log e parse;
exclui a checagem JS de ancestralidade, portanto não superestima o tempo anterior com ela.

| Caminho | p50 | p95 |
|---|---:|---:|
| Consulta anterior | 1.262,43 ms | 1.364,99 ms |
| Verificação nativa completa | 84,44 ms | 92,48 ms |

Isso mede somente a verificação de ownership, não o desempenho global nem a inferência. As
regras de pertencimento continuam obrigatórias. Os MCPs Context7/Octocode não estavam expostos
nesta sessão; a implementação nativa foi conferida nas fontes primárias Microsoft:
[GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable),
[IsProcessInJob](https://learn.microsoft.com/en-us/windows/win32/api/jobapi/nf-jobapi-isprocessinjob),
[layout IPv4](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid) e
[layout IPv6](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcp6row_owner_pid).

## Limites do aceite

A suíte de desenvolvimento teve uma falha de spawn `EUNKNOWN` (78 testes aprovados e um
reprovado). A causa foi confirmada nos eventos locais **Code Integrity 3033 e 3077**: o Windows
bloqueou um helper recém-compilado em perfil temporário por exigência de assinatura.
[Eventos](tui-full-review-2026-10-15/code-integrity.json) e
[execução reprovada](tui-full-review-2026-10-15/tui-tests-code-integrity-failure.log) foram
preservados. Não se atribui a falha a timeout, RAM ou antivírus sem evidência.

O erro de lançamento agora identifica o helper e orienta a inspeção da política. Não há retry,
troca automática de executável ou redução de proteção. A validação final seleciona explicitamente
o helper do pacote construído por `ZERO_JOB_BINARY`, exatamente a opção usada na distribuição,
em vez de compilar um PE diferente em cada perfil de teste. O manifesto verifica fonte e binário.
Isso **não resolve a exigência de assinatura** de outra máquina: distribuição em ambiente com
essa política exige assinatura por publicador confiável. O cofre de certificados do usuário não
contém certificado de code signing. Nenhuma política/certificado foi instalado ou alterado.
Esse requisito externo permanece aberto e não está entre R01–R13 fechados.

Esta revisão não transforma os limites já documentados em funcionalidades concluídas. O
aceite integral B12 continua aberto: RSS combinado acima da meta, ausência de quota física no
bind mount Docker e de limite duro individual dos workers Bun, ensaio real de ENOSPC/todas as
fronteiras de patch, homologação externa com contas configuradas e avaliação comparativa de
30 tarefas. Não foi reduzido isolamento, inventado benchmark ou aplicado fallback para esconder
essas pendências. As correções desta revisão são verificáveis independentemente delas.

Evidências finais e identidades Git das árvores testadas estão em
`tui-full-review-2026-10-15/verification.json`. O histórico Git registra o commit e o merge local;
o fechamento está em `docs/tui/implementation-review.md`.
