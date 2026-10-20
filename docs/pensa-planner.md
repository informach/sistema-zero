# Pensa: definição do jogo e missões funcionais

Contrato vigente: [especificação](plans/2026-10-16-pensa-reestruturacao-spec.md) e [plano de implementação](superpowers/plans/2026-10-16-pensa-reestruturacao.md). Existe uma única implementação. Ciclos ZERO, artefatos documentais, cartões de implementação e rotas `tasks`/`v2` foram substituídos.

## Propósito e contrato

A criança define o jogo inteiro que escolheu construir. O Pensa transforma essa definição em entregas funcionais claras, com regras e formas simples de conferir o resultado, na ordem das dependências. Cursos e materiais explicam a implementação; missões não enumeram blocos, cliques ou linhas de código.

A preparação pode recomendar a extensão oficial do Estúdio. Os demais tipos de missão são funcionalidade, arte, integração e teste. Blocos e ferramentas disponíveis são fatos do servidor; uma limitação gera uma escolha explícita, sem reduzir a ideia em silêncio. Sugestões aceitas e adaptações têm recibos do servidor. Ideias para depois ficam fora do escopo aprovado.

Schemas, limites e algoritmos puros ficam em `packages/core/src/pensa`. Members aplica autorização, cotas e transações. O BFF resolve catálogos, acessos e o arquivo realmente salvo, assina chamadas internas e executa IA/cópias. Pensa e oficinas consomem o mesmo contrato de missão. Capacidades e confirmação de instalação nunca vêm diretamente do navegador.

## Interface do planner

Desde 20/10/2026 o `@sistemazero/pensa` segue o Canvas aprovado pela dona: Meus jogos, nova ideia (com sementes estáticas só no Kids), montando o plano, pergunta do Zappy, plano para conferir, projeto com a conversa ao lado (abas Plano, Conversa e Carta do jogo abaixo de 900px), missão aberta em folha, mudar uma parte, equipe, cuidar do jogo (menu de três pontos e versões), jogo pronto e os estados (ideias acabaram, esperando a equipe, tropeço, esqueleto, falha ao abrir, pausado/Guardados, suporte só leitura). Toda tela lê a view canônica: passos de `operation.step`, mapa de `plan.stages` + `mission.stageId`, estados de `progress`/`availability`, impacto de `draft.impact`, ideias de `definition.futureIdeas`, equipe de `team`, créditos de `/credits`. Nenhuma tela recalcula disponibilidade ou próxima ação. A sessão de suporte só leitura vem do host (`readOnly`) ou da recusa `IMPERSONATION_READONLY` do BFF. Detalhes em `packages/pensa/CLAUDE.md` ("Telas").

## Persistência e concorrência

`pensa_projects` mantém identidade, dona, versões de metadados/equipe/execução e vínculo do jogo. `pensa_project_revisions` contém snapshots imutáveis da definição, plano e contexto técnico; apenas um snapshot é ativo. `pensa_plan_drafts` guarda a proposta ainda não aceita. `pensa_mission_progress` guarda o estado atual de cada identidade estável, incluindo entregas, conferência e nota de retomada. Eventos guardam deltas e intenções duráveis de recompensa.

Os serviços de aplicação dependem de portas; os adaptadores Drizzle concentram os comandos atômicos. Revisões não recriam todas as missões. Mudanças editoriais preservam a conferência; mudanças funcionais invalidam a parte afetada e suas dependentes. Uma missão concluída pode precisar de nova conferência sem perder seu histórico. Reabrir uma parte usa o fechamento transitivo das dependências. Versões de conteúdo e progresso não retrocedem, inclusive ao restaurar ou recuperar uma identidade histórica.

Comandos têm `requestId`; reutilizar o ID com outro conteúdo falha. Tokens de revisão protegem equipe, proposta, conteúdo da missão e progresso afetado. Reservas travam as contas pagadoras antes do projeto; inspeções de arquivos comparam a revisão salva com o índice. Referências de arte existente exigem pessoa da equipe, ferramenta, tipo e revisão autorizados. Sair da equipe ou apagar uma conta invalida entregas que deixam de estar disponíveis.

## Geração, créditos e recompensas

Operações duráveis têm lease, fase, unidade lógica, saída acumulada e orçamento persistidos. Entendimento permite 24 chamadas, até 6 por rodada; produção/revisão permitem 48; ajuda contextual permite 2. Cada unidade admite até 2 tentativas. O manifesto cobre produção e revisão de todas as partes. A conta tem também o teto de 60 chamadas por dia e 600 por mês. Claims contam chamadas reais; falhas preservam o rascunho e liberam a reserva. Aceitar uma entrega cobra uma única unidade de crédito da conta original, inclusive em equipe. A condição de acesso privilegiado da reserva não muda com quem retoma.

Os marcos são definição aceita, primeira funcionalidade conferida, construção completa e teste final. O evento guarda uma intenção mínima e o worker entrega no ledger com o mesmo ID. Reabrir, reaceitar ou repetir a entrega não duplica o prêmio. Apagar só o projeto mantém intenções pendentes; purgar a conta cerca o processamento e remove seus dados. Os valores históricos dos enums financeiros e os slugs de conquistas continuam estáveis.

## API e oficinas

As rotas públicas ficam em `/members/pensa/projects` e em suas coleções de mensagens, operações, propostas, revisões, equipe, convites, artes e checkpoints. Revisões retornam `{items,nextCursor}`; o cursor é o número exclusivo da última revisão recebida. Views e mutações que dependem dos recursos atuais ficam em `/members/internal/pensa`, com HMAC do consumer `member-shell`. Não existe uma rota pública que aceite capacidades do navegador.

Uma nova tentativa explícita usa `work` com `retry=true`. O BFF grava a retomada em `/members/internal/pensa/projects/:projectId/operations/:operationId/retry` antes de responder e agendar o worker. A operação fica `queued` de forma durável, conservando etapa, resultados, pagador e orçamento consumido. Polling comum não reinicia trabalhos que falharam.

Handoff e comandos usam `/missions/:missionId`, com o projeto/revisão, missão funcional, progresso, disponibilidade, próxima ação, elementos visuais e recursos de contexto. O jogo tem ID canônico `pensa-<UUID do projeto sem hífens>` e pertence a quem programa. Pinta/Molda guardam referências por elemento; vincular uma entrega parcial não conclui a missão. A conclusão exige os arquivos salvos e a conferência explícita da criança.

Salvar normalmente o jogo não invalida todo o plano. Quando o servidor observa que uma extensão exigida foi removida ou o runtime mudou, marca preparação e dependentes para conferir novamente. Reinstalar a extensão não confirma automaticamente o restante. O host só encerra um vínculo removido após ausência autorizada do projeto; uma negativa de acesso não autoriza abrir dados.

## Proteção e restauração

Proteção usa prepare → copiar arquivos privados → commit. O snapshot liga a revisão do plano, versões de progresso/equipe e arquivo salvo. Mudança durante a cópia impede confirmar um snapshot incoerente. Abort/falha registra limpeza durável dos destinos, preservando o arquivo atual.

Antes da restauração, o BFF protege o estado atual. Restore prepare captura plano/arquivo/equipe e versões de progresso pertinentes; restore commit revalida os recursos e promove criação, revisão e progresso juntos. Entregas de arte independentes ainda válidas são preservadas. O jogo recebe uma nova revisão de salvamento monotônica e conserva a pausa atual do projeto, com o teste final pendente de conferência. `restoredSaveRevision` permite aos hosts sincronizar a restauração concluída.

Cópias com falha conservam cota enquanto o job `cleanupId` do manifesto aguarda confirmação. Depois da limpeza, deixam de ocupar a cota e a lista de versões utilizáveis. Uma tentativa encerrada exige novo pedido; uma falha incerta de conexão conserva a identidade para permitir replay seguro.

Apagar o projeto remove seus dados operacionais e agenda somente prefixes privados Pensa e destinos de cópia abandonados. Jogos, desenhos, modelos, cursos, submissões, XP e contadores compartilhados continuam preservados. Narrações e reservas financeiras deixam de apontar para o projeto sem perder contabilização.

## Verificação local

A suíte nativa exige PostgreSQL descartável explicitamente escolhido. Não usa `DATABASE_URL` como fallback e recusa servidor remoto ou nome fora de `pensa_*`.

```powershell
$env:PENSA_TEST_DATABASE_URL='postgres://postgres@127.0.0.1:55432/pensa_test'
cd packages/members
bun run typecheck
bun run test:pensa-db
bun test tests/unit tests/integration
```

O runner exige a variável e inclui todas as provas nativas. Há replay completo, upgrade desde a base antiga populada, planejamento/aceite/contabilidade, leases, concorrência de progresso, configuração salva, API, artes autorizadas, equipe, proteção/restore, recompensas/purga e manutenção. O teste operacional usa `pg_dump`/`psql`; os caminhos podem ser definidos por `PENSA_PG_DUMP` e `PENSA_PSQL`.

## Janela operacional

`scripts/pensa-maintenance.ts` executa preflight, cutover, verify e rollback. `PENSA_MAINTENANCE_DATABASE_URL` seleciona explicitamente o alvo; `--manifest` escolhe um arquivo privado fora do repositório. Preflight cria SQL do subconjunto operacional e manifesto com hashes, enums/FKs, referências financeiras, prefixes privados, leases e sentinelas. Usa snapshot PostgreSQL exportado para que o dump e o manifesto sejam coerentes. Arquivos existentes não são sobrescritos.

1. Bloquear escritas e processamento apenas Pensa no gateway/BFF e cercar os workers de IA, voz, recompensas e limpeza Pensa. Esperar as leases em curso e confirmar a ausência de uso infantil a preservar. Cursos e oficinas continuam disponíveis.
2. Executar preflight e guardar o SQL/manifesto em local privado. As cópias privadas R2 permanecem no lugar enquanto a limpeza estiver cercada.
3. Executar cutover em dry-run; ele exige a base 0125, a mesma identidade de banco e os mesmos dados/FKs do manifesto. Views ou dependências externas inesperadas bloqueiam manutenção.
4. Aplicar 0126 (outbox/liberação/detach/reset), 0127 (DDL nativo e remoção de FKs antigas) e 0128 (remoção das tabelas substituídas), nessa ordem. `db:push` não faz parte do procedimento.
5. Publicar Members/gateway/BFF/hosts coordenadamente, executar smoke e verify. Reabrir Pensa somente após conferir os sentinelas. Encerrar a janela de rollback antes de liberar a limpeza privada.
6. Em falha, manter Pensa cercado, executar rollback dry-run e depois o rollback autorizado; restaurar a implantação anterior antes de reabrir. A ferramenta restaura só tabelas/enums Pensa, suas FKs e vínculos destacados. Não reescreve contadores nem recria reservas pendentes; cancela a limpeza introduzida pelo reset para os projetos restaurados.

```text
bun run pensa:maintenance preflight --manifest <arquivo-privado> --dry-run
bun run pensa:maintenance cutover --manifest <arquivo-privado> --dry-run
bun run pensa:maintenance cutover --manifest <arquivo-privado> --apply --workers-fenced --no-child-data
bun run pensa:maintenance verify --manifest <arquivo-privado>
bun run pensa:maintenance rollback --manifest <arquivo-privado> --dry-run
bun run pensa:maintenance rollback --manifest <arquivo-privado> --apply --workers-fenced --no-child-data
```

As duas declarações de apply são verificações operacionais do responsável pela janela; a ferramenta não altera o gateway nem cerca serviços remotos por conta própria. Rollback usa DROP restrito do conjunto de tabelas, sem CASCADE, e recusa a revisão errada de migrations. O ensaio automatizado executa backup, dry-run, cutover e rollback reais somente em banco local descartável. Nenhuma implantação ou migration remota foi executada durante a implementação.
