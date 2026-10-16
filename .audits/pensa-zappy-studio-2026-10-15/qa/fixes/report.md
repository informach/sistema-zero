# Correções — Pensa, Zappy e Estúdio Pro

**Resultado:** oito defeitos confirmados corrigidos; verificações finais do escopo aprovadas. A antiga intermitência do subprocesso de armazenamento continua documentada como não reproduzida, sem causa comprovada.

Correções locais da auditoria de 15/10/2026, no checkout baseado em `b94714927`. As alterações preexistentes de outros trabalhos foram preservadas. Nenhum deploy ou uso de modelos pagos foi realizado.

## Resultado funcional

| Achado | Correção | Evidência principal |
|---|---|---|
| BUG-001: publicação ausente no Pro | `useStudioShare` comum aos dois hosts; `StudioProEditor` propaga publicação, desafio e capa verificada | Composição real Kids + member-shell em `studio-pro-editor.test.tsx`; navegador de publicação |
| BUG-002: instruções de blocos no Pro | Modalidade lida da criação confirmada no servidor; planejador, ajuda e handoff distinguem blocos/código; guia de transição conserva critérios e progresso | Contexto, worker, handoff, TaskGuidePanel, tarefa Kids, JourneyApp e PostgreSQL |
| BUG-003: notas ausentes da conversa | Resumo único de decisões confirmadas para Conversar, Investigar e Construir; tamanho limitado e dados tratados separadamente da missão oficial | Contrato de tutor e solicitação/prompt reais da rota com serviços controlados |
| BUG-004: voz e saldo divergentes | Mesma composição autorizada nos hosts; saldo inicial, atualização ao abrir/finalizar construção e descarte de leituras antigas | Host Pro, useTutorCredits, ProBuilderPanel e ZappyPanel |
| BUG-005: atividade ausente no Pro | Hook comum de atividade e telemetria; apenas autosave registra atividade; nenhum refresh do router com editor aberto | Testes dos hosts clássico e Pro |
| BUG-006: dependência indevida dos blocos | Pro dispensa consulta de desbloqueios em Zappy, contexto e handoff Pensa; mantém posse, nível e autorização | Casos com serviço de blocos indisponível e catálogo vazio; clássico continua exigindo desbloqueios |
| BUG-007: saída perde o plano | Missão vinculada retorna ao plano após flush com teto; atalhos do Pensa abrem diretamente a rota Pro | Composição do host, próxima missão e JourneyApp |
| BUG-008: fixture incompleto | Fixture Pensa inclui migrações reais 0116–0124 da base compartilhada | 28 testes em PostgreSQL descartável, sem ajustes manuais no esquema |

## Organização preservada

- Pensa planeja e acompanha missões. Zappy no clássico orienta blocos. Zappy Pro conversa, investiga e prepara alterações de código com aplicação explícita.
- Os dois hosts Kids compartilham publicação, tutor/voz, créditos, atividade e reporte de erros. Runtime e navegação Pro continuam separados.
- `studioAuthoring` reflete a criação confirmada de quem programa; uma versão pendente ou excluída não determina a modalidade. Campos novos são opcionais para compatibilidade com planos existentes.
- A transição de um guia antigo muda apenas a apresentação: não reescreve IDs, marca etapas automaticamente ou enfraquece a evidência de nuvem. Os checklists obrigatórios legados permanecem acessíveis para conferência explícita.
- A seleção de projeto usa “Clássico (blocos)” e “Pro (código)”. O saldo explica a franquia da família e que a fonte OpenRouter do responsável vale para o Estúdio.
- A cadeia interna sem montagem `AIPanel` / `aiMessages` / `aiAdapter` foi removida. Os contratos públicos de provider e o Pensa legado foram preservados.
- A documentação do Zappy descreve os três modos de assistência, notas, fonte de créditos e continuidade Pensa/Pro.

## Verificação

Ambiente: Windows, PowerShell, Bun 1.3.11. Cwd dos comandos: o pacote indicado. Os logs anteriores de falha permanecem preservados; os resultados abaixo são das verificações da correção.

| Pacote / comando | Resultado | Log |
|---|---|---|
| Studio: `bun test src` | 9.033 pass, 0 fail; 589 arquivos | [studio-final-clean.log](./studio-final-clean.log) |
| Studio: testes de NewProjectModal e ProjectList.creationScope após padronizar rótulos | 20 pass, 0 fail | [studio-labels-final.log](./studio-labels-final.log) |
| Pensa: `bun test src` | 134 pass, 0 fail | [pensa-final.log](./pensa-final.log) |
| member-shell: 38 arquivos do manifesto da auditoria | 387 pass, 0 fail | [member-shell-final.log](./member-shell-final.log) |
| Kids: manifesto da auditoria + `tests/studio-pro-editor.test.tsx` | 179 pass, 0 fail; 25 arquivos | [community-kids-final.log](./community-kids-final.log) |
| members: 24 arquivos do manifesto da auditoria | 221 pass, 0 fail | [members.log](./members.log) |
| Core: `bun test tests/pensa.test.ts src/studio/pro-assistance.test.ts` | 14 pass, 0 fail | [core-final.log](./core-final.log) |
| PostgreSQL: jornada Pensa, equipe e migração | 28 pass, 0 fail | [db-pensa-final.log](./db-pensa-final.log) |
| PostgreSQL: conta IA, uso e builder | 20 pass, 0 fail | [db-studio-final.log](./db-studio-final.log) |
| Playwright: `--config e2e/zappy-assistance.config.ts` | 5 pass | [browser-assistance-final.log](./browser-assistance-final.log) |
| Playwright: orientação, `--repeat-each 2` | 2 pass | [browser-orientation-final.log](./browser-orientation-final.log) |
| Playwright: `--config e2e/pro-publication.config.ts` | 1 pass | [browser-publication.log](./browser-publication.log) |
| Playwright: `e2e/smoke.spec.ts --project=chromium --grep "Pro standalone"` | 1 pass | [browser-smoke-final.log](./browser-smoke-final.log) |
| Typecheck: Core, Pensa, member-shell, Studio, members e Kids | Os seis passaram, exit 0 em cada execução final | Logs `typecheck-*-final.log` |
| Biome nos 67 arquivos de código alterados | Exit 0, sem erros/avisos; nenhuma correção pendente | [lint-final.log](./lint-final.log) |
| `git diff --check` no escopo | Exit 0 | Executado na raiz |

Avisos não bloqueantes dos testes de navegador: chunks grandes do build de fixture e `FORCE_COLOR` sobrepondo `NO_COLOR`.

Os manifestos originais ficam um nível acima desta pasta. `changed-source-files.txt` lista o escopo usado no lint; exclui alterações preexistentes de outros trabalhos.

O banco foi executado no container próprio `pensa-zappy-fixes-20261015`, PostgreSQL 16, porta local 15449. Os testes Pensa criam bancos dedicados; os testes Studio usam `studio_pro_review`. O container foi parado e removido após as verificações; os demais containers foram preservados. Nenhum banco de produção foi acessado.

## Falhas de execução investigadas

- **Reconcile:** o segredo de teste agora é definido no preload, antes do cache de ambiente. A suíte conjunta passa.
- **Monaco:** o menu registra a interação por mouse com atraso interno de 100 ms. O teste clicava logo após abrir o menu pelo teclado. Agora percorre o menu com as setas, verifica o foco no ShadowRoot e aciona Enter, sem sleeps ou mudança no código do editor. O caso repetido e os cinco cenários de assistência passam.
- **Armazenamento:** o harness informa as etapas de encerramento e só imprime sucesso após `browser.close()`. Chromium e WebKit passaram nas execuções completas; a final levou cerca de 12,7 s. O timeout original de 55 s não foi reproduzido novamente, e sua causa exata não foi comprovada. Nenhum timeout foi aumentado ou teste desabilitado.
- **Bundle server-safe:** uma execução concorrente atingiu o limite de 5 s. Na execução completa sem outros builds/typechecks desta tarefa, passou em 32 ms. Não houve alteração no teste ou supressão da fronteira entre servidor e editor.
- **Tipos dos testes Core:** dois fixtures do contrato Pro inferiam literais como `number`/`string`. Passaram a usar `satisfies StudioProAssistanceRequest`, preservando a validação estrita e o comportamento.

## Limites

Os testes de integração montam os hosts reais Kids/member-shell, controlando o carregador do editor e serviços externos; os testes de navegador exercitam editor, assistência e publicação em fixtures reais. Isso não equivale a uma sessão autenticada completa no site implantado.

Não foram executados cobrança real de IA, transcrição/narração reais, OAuth, publicação externa, build Next completo ou deploy. A disponibilidade dos provedores e o esquema da produção não foram verificados. A intermitência antiga de encerramento do subprocesso de armazenamento permanece registrada como não reproduzida, sem atribuir uma causa não demonstrada.
