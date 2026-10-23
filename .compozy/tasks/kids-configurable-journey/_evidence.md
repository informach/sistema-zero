# Evidências e mapa de migração

## Delta conciliado e fronteiras de identidade (18/10/2026)

Base atual `2e76fb448`, checkpoint canônico `e8be66021`. Rebase sem conflitos, seis commits Kids equivalentes no range-diff; companion guard local retirado por já estar no remoto, fixture remoto preservado exatamente. Backup pré-rebase `backup/kids-journey-canonical-before-2e76-a4e4babb5`. Leituras locais e fixtures SQL descartáveis não afirmam quantidade/estado de alunos reais.

- Members `application/studio/free-studio-access.service.ts` e `authorize-free-runtime.service.ts` são autoridades conciliadas de contexto/linguagem/editor livre. Migrar somente o gate Kids de jornada; conservar matrícula, paleta, runtime JS/Python e validação no servidor.
- Auth `application/profiles/create-profile.service.ts` e `profile.repository.ts:createWithinLimit` são o criador normal/primeiro perfil. `register.service.ts` cria conta/tokens, sem filho automático. `scripts/backfill-default-profiles.ts` escreve SQL direto e precisa usar admissão após rollout. `ProfileAggregate.restore` hidrata um registro, sem restauração produtiva de arquivado; não foi encontrado outro import/restore de perfil.
- Auth não oferece admissão pending/ready nem worker de initialize. select/refresh/impersonation/study-access/get-own/public e listas/batches precisam exigir ready: negar apenas isArchived aceitaria pending.
- `user.repository.ts:prepareDeletion` disputa lock LOCAL profile:<account> com criação, bloqueia conta e captura IDs antes de purge Members. CAS ready deve usar esse lock local e revalidar conta/perfil. Não é prova de database compartilhado entre serviços; o desenho não depende disso nem usa lock crossDB.
- Auth composition-root possui start/stop e setInterval de maintenance. Retry terá ciclo próprio bounded/lease e teste de agendamento, não infraestrutura já pronta a alegar.
- `/profiles/ownership` geral deve continuar recusando pending. Initializer específico Auth→Members recebe owner capturado/autorizado por Auth, sem ampliar o endpoint geral nem realizar RPC dentro da TX Members.

Gamification nasce por atividade e não é coorte universal. Bootstrap precisa Auth all + históricos comprovados; depois todo perfil admitido possui earned até noob/[] e a coorte recorrente usa todos. Acesso editável exige 21 direitos limitados além de rank/app caps; só preservar rank não impede re-lock após mudar base/threshold.

Consumidores compartilhados legítimos: `GetGamificationService` chama `listQualifyingJourneySlots` + `computeStudentLevel` nas duas audiências e anexa `AdultJourney` separadamente. `GetPublicProfileService`, `GetProfilesOverviewService` e `GetAvatarsByProfilesService` também calculam o nível usando a audiência recebida. Cleanup deve substituir seus ramos Kids; preservar o nível/contrato Adult e as consultas ainda necessárias a ele. `FreeStudioAccessService`, por sua vez, chama explicitamente audiência Kids e deve deixar de obter recompensa do helper antigo. Root confirmou esse limite: não apagar helper/tabela necessária a Adult só por ter servido Kids. Renomear/mover para explicitar uso Adult é opção após testes, sem fallback Kids.

Todos os caminhos desta página são relativos à raiz do repositório. Esta é uma inspeção do código em `3d83a3f46`, não uma auditoria do banco de produção.

## Regras aplicáveis

Não foi encontrado `AGENTS.md` de aplicação na árvore rastreada. Foram consultados os `CLAUDE.md` de core, members, community-kids, admin, member-shell e studio, especialmente suas seções de jornada, acesso, currículo, autoria e testes.

| Fonte | Restrição aplicável |
|---|---|
| `packages/core/CLAUDE.md` | Core sem framework/banco e sem importar serviços/apps; contratos compartilhados por subpath. |
| `packages/members/CLAUDE.md` | DDD/hexagonal; composição em `composition-root.ts`; audiência isolada; matrícula é da conta, progresso da criança; acesso alterado exige atualização do manual. |
| `packages/members/CLAUDE.md`, seção `tests/db` | Fakes não provam SQL. Banco de testes é compartilhado; DDL aditivo e ordens de execução precisam ser exercitados. Suíte pode pular silenciosamente sem banco. |
| `packages/admin/CLAUDE.md` | Browser → BFF → gateway → serviço; autorização efetiva no backend. Shell usa os tokens compartilhados do console. |
| `packages/community-kids/CLAUDE.md` | Não confundir marcos permanentes com progresso de aulas; falha de catálogo não equivale a catálogo vazio; horizonte e contagem da trilha são apresentação. |
| `packages/member-shell/CLAUDE.md` | Paleta inteira vem dos cursos; ausência de paleta não pode abrir editor. `allowBlocks: []` significa sem restrição dentro do Estúdio, portanto o host precisa bloquear. |
| Regras dos packages | Context7 antes de tocar APIs/libs na implementação; esta fase não modifica essas APIs nem usa documentação externa. |

Instruções históricas que proíbem mudar a régua descrevem decisões anteriores. A nova solicitação autoriza desenhar configuração, mas exige que o default reproduza essas decisões; não autoriza apagar compatibilidade ou substituir Kids por Adult.

## Contratos atuais

| Área | Fonte primária | Comportamento observado |
|---|---|---|
| Oito postos | `packages/core/src/journey/catalog.ts`, `packages/community-kids/src/lib/level-info.ts` | `noob/coder/hacker/explorer/elite/architect/champion/god`; Faísca, Construtor(a), Inventor(a), Explorador(a) de Mundos, Mestre dos Jogos, Arquiteto(a) de Mundos, Gênio da Criação, Lenda. |
| Posições | `catalog.ts`, `members/src/domain/gamification/levels.ts` | Sete etapas; 1 em Primeiros Passos 2D + 8 em cada uma das seis demais = 49. Requisitos cumulativos; posição ausente continua faltando. |
| Conquista do posto | `members/src/infrastructure/persistence/drizzle/gamification.repository.ts`, `listQualifyingJourneySlots`/`listJourneyCourseState` | Interseção de `course_complete` e `course_showcased`, mesmo curso/perfil/audiência. Snapshot de nível/eixo/slot; curso vivo é fallback legado. LEFT JOIN preserva curso apagado quando há snapshot. |
| Entrada nos cursos | `core/src/journey/catalog.ts`, `members/src/application/access/check-access.service.ts`, `application/journey-course-locking/journey-course-locking.ts` | Matrícula ativa + trava pedagógica. `positioned`: etapa futura e curso-base; `reward`: concluir etapa; `extra`: somente matrícula. `lenda`/par fora da jornada sem trava pedagógica. Sem base publicada, foundation/reward falham abertos; future-tier continua específico. |
| Curso ao vivo | `members/src/application/access/check-access.service.ts`, `gamification.repository.ts` | Vaga por aula, não matrícula geral; excluído de jornada e grants curriculares. Complete usa `live_course_complete`. |
| Recompensas | `core/src/journey/state.ts`, `catalog.ts`, `community-kids/src/lib/journey-rewards.ts` | Livre/Pinta no coder; IA/Pensa no hacker; Molda básico no explorer; intermediário no architect; Ponte no champion; Pro/Molda profissional no god. |
| Blocos e extensões | `application/studio-unlocks/get-studio-unlocks.service.ts`, `drizzle/studio-unlock-eligibility.ts`, `drizzle/studio-unlock.repository.ts`, `member-shell/src/server/studio-unlocks.ts` | União atual + grants congelados por curso; Kids com slot precisa complete+showcase, sem slot precisa complete. Extensões derivadas do catálogo dos blocos. O posto não entrega blocos. |
| XP e moedas | `application/gamification/award-gamification.service.ts`, `drizzle/gamification.repository.ts` | Marcos de curso têm amount 0 e não substituem nem dependem de XP. Award idempotente; paleta congelada na mesma transação do marco; serviço de gamificação é fail-open para não derrubar a aula. |
| Molda | `community-kids/src/lib/molda-tool-access.ts`, `core/src/journey/state.ts` | Host traduz posto em famílias basic/intermediate/professional. `undefined` libera tudo: nunca usar para estado desconhecido. |
| Pensa | `member-shell/src/server/pensa/context.ts`, `members/src/infrastructure/persistence/drizzle/pensa-team.repository.ts` | Capacidade por participante, sem somar desbloqueios fictícios da equipe. Paleta/produto/posto/método de autoria influenciam contexto. |
| Voz | `member-shell/src/routes/voice.ts`, `routes/private-narration.ts` | Transcrição Kids depende da sessão da criança, opção dos pais e contexto; NÃO tem gate do posto/IA. Narração privada verifica o recurso de origem (Pensa/Zappy). Áudios pré-gravados da aula são outra função. |
| Mural/remix | `member-shell/src/lib/studio-tier.ts`, `routes/studio.ts`, página `mural-dos-criadores` | Remix exige Estúdio livre, extensões cobertas e Pro quando necessário; snapshot autoritativo no clique, metadado do card só informa. Projeto publicado é independente do curso vivo. |
| Adult | `core/src/journey/adult-policy.ts`, `members/src/application/adult-journey/adult-journey.service.ts` | Etapas livres por curso/complete ou showcase; capacidades enumeradas; CAS e freeze por visita. Política vazia não libera tudo. IA adulta exige curso avançado; essa regra não deve migrar para Kids (default Kids libera no hacker). |
| Admin Adult | `admin/src/app/admin/professor/jornada-adulta/journey-editor.tsx`, `admin/src/server/adult-journey.ts` | Referência de BFF/editor/CAS; sem preview de impacto nem histórico imutável no código inspecionado. |
| Prontidão/autoria | `admin/src/app/admin/membros/cursos/courses-client.tsx`, `course-form-dialog.tsx`, `members/src/application/content-admin/content-admin.service.ts` | Posições por etapa, presença de base e `hasShowcaseBlock` de aula publicada. Ao vivo fica fora. Autoria de blocos/cursos não é política global. |

`eligibleStudioGrants` tem comentário sobre Adult exigir showcase, mas o predicado de showcase é aplicado somente quando `audience === 'kids'`. A spec toma o código como evidência e não corrige essa divergência como parte de Kids.

## Consumidores que não podem continuar inferindo autorização pelo posto

| Grupo | Arquivos existentes a migrar |
|---|---|
| Estado individual | `members/src/application/gamification/get-gamification.service.ts`, `application/profiles/get-public-profile.service.ts` |
| Batch/terceiros | `members/src/application/avatar/get-avatars-by-profiles.service.ts`, `application/profiles-overview/get-profiles-overview.service.ts`, `application/children-stats/get-children-stats.service.ts` |
| Missões | `members/src/application/gamification/get-missions.service.ts`; revisar usos de `creativeToolAvailability` e acesso efetivo ao Estúdio |
| Cursos e trava autoritativa | `members/src/application/access/check-access.service.ts`, `application/journey-course-locking/journey-course-locking.ts`, list-catalog/list-my-courses/get-my-course/get-lesson que consomem o projetor |
| Menu/criação | `community-kids/src/server/creator-journey.ts`, `server/studio-gate.ts`, `server/studio-pro-access.ts`, `server/studio-services.ts`, páginas `/`, `/estudio`, `/pinta`, `/pensa`, `/molda`, `/mural-dos-criadores` |
| BFF de operações | `member-shell/src/server/creative-apps-access.ts`, `server/zappy-access.ts`, `routes/studio.ts`, `routes/studio-zappy.ts`, `routes/studio-builder.ts`, `routes/pensa.ts`, `routes/private-narration.ts` |
| Pensa/Molda | `member-shell/src/server/pensa/context.ts`, `community-kids/src/lib/molda-tool-access.ts`, `members/src/infrastructure/persistence/drizzle/pensa-team.repository.ts` |
| Presentação | `community-kids/src/lib/journey-map.ts`, `journey-horizon.ts`, `journey-rewards.ts`, `level-info.ts`, `course-badge.ts`, `studio-cta.ts`; componentes de mapa/timeline/lock/celebração; `member-shell/src/lib/types.ts` e tipos/view members |
| Infraestrutura | `members/src/composition-root.ts`, rotas/servidor, `api-gateway/gateway.config.ts`, client factories do member-shell, navegação/BFF/tipos do admin |
| Exclusão | `members/src/infrastructure/persistence/drizzle/user-data-purge.repository.ts`; account fence e ordem dos locks devem proteger novas tabelas/cursor/baseline |

`journeyLevelAtLeast` continua válido para comparar postos conquistados e desenhar a escada. Ele deixa de ser a fonte de autorização para capacidades Kids configuráveis. `computeStudentLevel` ainda atende consumidores Adult legítimos; nenhum ramo Kids migrado deve chamá-lo para calcular posto, acesso ou recompensa. As provas de seed Kids precisam de referência histórica congelada em testes, sem depender de futuras alterações da régua Adult.

## Compatibilidade que carrega significado

- `careerSlot`/`careerLock` e colunas `career_slot` permanecem como contratos existentes. Configurar os requisitos não renumera cursos nem muda a unicidade das posições.
- A contagem de aventuras prontas inclui extras e bônus; progresso para posto usa só requisitos da política. Publicar um bônus em etapa antiga pode tirar o ✓ do mapa de cursos; não tira o posto do perfil.
- Catálogo desconhecido é diferente de vazio. No caminho Kids migrado, política/view ausente significa indisponível; não há modo legado nem fallback de rede. O rollout deve impedir que clientes antigos autorizem Kids por thresholds fixos depois da ativação.
- Autoria de aula usa paleta/extensões/ambiente próprios. Abrir uma ferramenta dentro de aula/oficina não concede a ferramenta livre globalmente.
- Pro pode abrir sem paleta; clássico com paleta vazia não abre. Não eliminar essa distinção durante a mudança.

## O que não foi provado

Não foram medidos número de perfis/marcos, legado sem snapshot, tempo de baseline ou custo de preview. Não foi consultada retenção real dos dados nem configuração de vacuum. Código de purge remove `xpEvents`; não foi encontrada aqui uma promessa de retenção permanente.

`schema.ts` define `xp_events.transactionId` como xid8 NOT NULL. A migration `0074_mission-reward-xp-snapshot.sql` usa `DEFAULT pg_current_xact_id() NOT NULL`, portanto o xid das linhas anteriores à migration não representa sua inserção original. O ranking usa visibilidade MVCC para páginas de uma consulta. Isso não basta para escolher replay pedagógico permanente: ainda exigiria prova SQL sobre fronteiras de versões, transações em voo, legado, atualização de snapshots, purge e custo acumulado.


## Auth admission — prova causal intermediária, 18/10/2026

Recorte ainda não integrado: pending/ready independente de active/archived, job durável/requestId/quota,
initializer privado owner-only e credencial dedicada, guards de seleção, worker bounded sem RPC em TX.
Migrations geradas0023/0024 exercitadas em **banco QA novo owned em 5434**, com perfis ativos/arquivados
anteriores à expansão; existentes continuam ready, futuros nascem pending. Sem deploy nem alteração de produção.

Review identificou dirty snapshot de edição: podia reabrir arquivo e regravar opt-in/nascimento obsoletos.
SQL com row-lock/barreira e serviço/repositório reais reproduziu **6 falhas causais**, junto de 4 positivos
(`auth-admission-sql-red3.log`,8,88s). Após substituir update(snapshot) por patch explícito/decisão
síncrona sobre estado fresh bloqueado +archive separado, **10 pass/0 fail/32 asserções**, 9,50 s,
`auth-admission-sql-green2.log`. Claim revelou também 42601: FOR UPDATE OF exige alias não qualificado;
fonte corrigida com alias da tabela e lease substituída rejeita ACK antigo na mesma prova.

Negativos de setup Date raw e hooks de TRUNCATE permanecem preservados; não contam como prova causal.
Harness final usa owners/UUIDs distintos por caso, sem reset por TRUNCATE, ownership/FIFO/drain e
nenhum aumento de timeout. Bancos red/red2/red3/green/green2 preservados, nenhum DROP/FORCE.
Unit focada criação/admission/worker/voz após fix: **27 pass/0 fail/104 asserções**, 234 ms.
Auth full types/regressão, SQL adicional de quota/purge, rereview e consumidores/Admin permanecem abertos.
Logs estão no cache local `.cache/kids-configurable-journey/`; não são artefatos de produção.

Após migração dos callers do port, os focados HTTP de perfis/sessões/Kids passaram **36/0/164** em
1,23 s e Admin profiles **5/0/14** em 950 ms. O caller Admin agora pede includePending explicitamente;
fixtures representam perfis existentes ready, sem default/fallback no domínio. O check de segurança de
migrations Auth terminou EXIT0. A matriz SQL foi ampliada de dez para dezessete casos, ainda sem execução
adicional: os sete novos e a barreira com captura de erro antes da aquisição aguardam janela coordenada.


## Coorte durável e publicação final — janela18/10/2026

Migration0137_auth_capture gerada pelo Drizzle oficial;0136 permaneceu byte a byte intacta.
Auth SQL fresh em banco QA owned `kids_journey_auth_admission_matrix`: **19pass/0fail/77asserts**,
2,71s. Inclui perfis ready antigos/arquivados, conta bloqueada sem XP e novos IDs aleatórios
fora/atrás da paginação permanecendo pending/não selecionáveis. Units coorte Auth3/10 e Members6/25.

Fence final: fonte sem proteção reproduziu **4falhas causais**: publicação aceitou writer
RowExclusive em cada uma das3 tabelas e publicou V3 após alteração do catálogo entre hash/CAS.
A janela intermediária V2+C1 realmente autorizava slot2/reward; rank/caps sozinhos não bastavam.
Após aplicar SHARE NOWAIT como primeira operação da TX READ COMMITTED, **4pass/0fail/19asserts**,
7,04s. Negativo preservado em catalog-fence-red.log. Primeiro replay foi recusado pelo guard
porque backend do processo anterior ainda constava conectado; nenhuma sessão foi encerrada.
Consulta posterior encontrou zero clientes e o replay green2 passou. Matriz ampliada e tipos ainda
estão em execução/pendentes; esses recibos não encerram integração, consumidores ou Admin.


A matriz completa da captura/fence terminou **37pass/0fail/173asserts**,58,45s, com0137
real, três tabelas, ordens invertidas, DELETE com cascata real e leitura fresh/stale depois do commit.
Auth TSCfull Node24/TS5.9.3 terminou0 após anotações legítimas no cursor do backfill/headers do teste;
Members TSCfull terminou0 sem diagnóstico. Snapshot91 com cópia dos bytes e manifestoSHA foi
preservado em cache `cohort-fence-checkpoint` ANTES de iniciar o próximo lote.

Fonte posterior ao snapshot91 ainda não qualificada: hook transacional de award/replay e6cenários SQL,
query/configuration/bootstrap services e testes unitários, rota Admin não montada, CLI bootstrap não
executada, harness purge additivo semDROP com URLprópria noCI. Portanto SQL37/tipos0 acima não
aprovam essas mudanças posteriores nem a migração dos consumidores. Próxima janela coordenada
precisa RED/GREENaward→matriz→purge3→tipos; publicação continua sem ligação de composição.


## Award transacional e reset QA — recibos frescos18/10/2026

`award-hook-red.log`: fonte anterior restaurada temporariamente (KidsRepo do snapshot91 e Gamma
igual aoHEAD naquele checkpoint) produziu **1pass/5fail/16asserts**,18,37s. As cinco falhas mostraram
posto não congelado após ready/replay, ausência da defesa owner e falta das barreiras de conta/earned.
Adult/live foi o positivo de preservação. Os dois arquivos atuais foram restaurados byte a byte em
finally; manifesto before/after e cópia estão em cache. Um erro prévio de setup/cópia do Gamma não
executou SQL e não foi contado como RED.

Fonte atual: **GREEN6/30**,16,11s, em `award-hook-green2.log`. Primeiro GREEN5/1 foi insuficiente
por timeout de beforeEach5s e permanece preservado. A matriz ampliada inicial também terminou
41/3,194asserts; o monitor mostrou TRUNCATE em `IO/DataFileImmediateSync`, blockers vazios,
5,51–7,124s no reset; os três restores usavam poucos ms. Não era contenção no hook produtivo.

Correção do harness: manter bootstrap real/fullTRUNCATE somente no beforeAll60s já existente;
entre casos usar DELETE das linhas de singleton/histórico/preparações/coorte/XP/Gamma/catálogo e
ledgers/fences usados pelos casos. Owners são UUIDs novos, policy/revision/seedfixture são
explicitamente restaurados. Fila/drain e monitor observado impedem reset sobre trabalho ainda
em voo. Mesmos casos, mesmas asserções, mesmo limite5s, sem alterar PostgreSQL ou encerrar clientes.

`award-cohort-fence-matrix2.log`: **44pass/0fail/206asserts**,18,60s, EXIT0; resets relevantes11–29ms
nos registros finais. Além dos casos anteriores, cobre award após ready, replay sem duplicação,
rollback por owner divergente, publicação vencendo antes da conta, award em voo antes da publicação,
Adult/live sem dependência de policy Kids e JSON corrompido explicitamente unavailable/sem reseed.

`canonical-purge-additive.log`: **3pass/0fail/25asserts**,54,04s, EXIT0. Banco owned novo
`kids_journey_purge_capture` em127.0.0.1:5434; histórico real0..137 aplicado de forma aditiva.
Nenhum DROP/FORCE/kill/fallback de porta. Esta suíte agora exige URL própria/CI explícita,
usa fullreset no beforeAll e UUIDs isolados nos três casos, com fila/drain; não recria banco.

`canonical-services-units.log`: **24pass/0fail/123asserts**,3,23s. Query/config/preview read-only,
coorte e API específica de staff foram exercitados. Staff retorna metadados sem posto/earned,
permite os três roles ativos já existentes/parent próprio sem perfil e recusa customer, inativo,
student/perfil/terceiro, suporte, token inválido, initializing/unavailable; POST não existe.

Limite desta qualificação: novos tipos full, bootstrapCLI, HTTP de mutação Admin e consumidores
recém-migrados ainda precisam checks próprios. A janela pesada foi liberada ao root após o purge.
Não há claim de jornada completa, integração, deploy, push ou prontidão de produção.


### Consumidores de cursos e Estúdio livre — focados posteriores ao SQL44

Antes das novas regressões foi preservado o snapshot byte a byte
`.cache/kids-configurable-journey/course-consumers-checkpoint/manifest.json`: 118 arquivos,
SHA256 `ef04cd347223b9449c8abc18f7610e2dbca9429a1ec4fe08fc868c40203911da`.
O snapshot qualificado `award-cohort-checkpoint` não foi alterado.

Em janela exclusiva autorizada, sequencialmente (Bun1.3.11):

- Core canonical/policy/parity/pause/journey/journey-state: **60 pass/0 fail/2772 asserts**, EXIT0,
  `course-consumers-core.log`. Inclui batch de autorização e pausa com 49 fatos.
- Query/configuração/staff-preview/AdminHTTP: **19/0/125**, EXIT0,
  `course-consumers-http-query.log`. Ator confiável, RBAC, token, CAS e ausência/init explícitos.
- List-catalog/journey-course-access/creator-missions: primeiro **23/1/70**, preservado em
  `course-consumers-integration-first.log`. A falha exigia uma chamada ao motor antigo removido;
  foi substituída pela prova de uma única leitura do snapshot canônico e zero chamadas ao motor
  antigo. Mesmas asserções de marcos/acesso permanecem. Reexecução **24/0/72**, EXIT0,
  `course-consumers-integration-green.log`. Complete-only abre listagem/curso/aula sem conceder
  paleta; ausência do registro materializado responde indisponível.
- FreeRuntime: **12/0/85**, EXIT0, `course-consumers-free-runtime-first.log`. Gate Kids lê
  studio/bridge/pro da política persistida, sem inferir pelo posto; produto e paleta seguem
  independentes. Preview de equipe exige política e conta própria; não fabrica posto/earned.
  Execução/análise Python e gates de projetos existentes continuam nos testes.

Não houve TSC completo, SQL, browser ou build nessa janela. Esses focados não qualificam
GamificationMe, demais consumidores, montagem de rotas, CLI operacional ou UI/Admin integrados.


### Gamificação, owner em lote e preview — fronteira seguinte (tipos abertos)

Snapshot anterior às correções de fixture em
`.cache/kids-configurable-journey/gamification-consumers-checkpoint/manifest.json`, 138 arquivos,
SHA256 `b7f7b61ca8ca8466ffe79f224d2b44c12754c69a48bbff0b1187ffd15488649d`.
A consulta interna `listOwners` lê o registro materializado em lote≤200; não concede sessão.
GetGamification Kids lê view canônica, Admin.inspect resolve owner real, equipe usa metadata
explícita com level:null (sem Noob/God virtual). Missões e Pensa server usam capacidades;
BFF/Pensa/UI e demais consumidores ainda não estão todos migrados.

- Novos profiles/mapper/query/config/guards/AdminHTTP: **25/0/154**, EXIT0,
  `gamification-consumers-units-first.log`.
- Integração inicial **108/2/441**: fixture Admin omitia studio/pinta concedidos pelo seed ao
  floor hacker; fixture FreeRuntime enviava perfil student com role staff como se fosse prévia
  da conta. Negativo preservado em `gamification-consumers-integration-first.log`. Ajustadas só
  fixtures, incluindo ownstaff/parent200 e perfil/support403; produção não foi afrouxada.
- Reexecução dos sete arquivos: **110/0/447**, EXIT0,
  `gamification-consumers-integration-green.log` (inclui Adult e execução/análise JS/Python).
- Members TSC completo Node24/TS5.9.3, Zod legítimos Core/Members4.3.6 e Studio4.5.4:
  **EXIT2**, três diagnósticos próprios: journey-course-locking.ts16/23 precisava estreitar
  lenda antes de courseTier; novo teste Gamification52 precisava tipar o lote de headers.
  Log `gamification-consumers-members-types.log`, SHA256
  `8bb99abcfa67686be5b9ff333a7884d80957e326544f5b5559cfc80cb81bceed`.
  Correções somente de edição aplicadas; rerun aguardando janela. **Tipos ainda não aprovados.**

Nenhum SQL/fullsuite/browser/build foi executado nesse lote. Novo listOwners ainda exige
prova SQL própria; CLI, montagem, aplicações e Admin completos continuam pendentes.


### Fechamento do recorte Gamification e lote batch/identidade

As duas correções de fixture/tipos anteriores foram revalidadas: **22 pass/0 fail/82 asserts**
(`gamification-consumers-narrow-green.log`) e Members TSC incremental **EXIT0**
(`gamification-consumers-members-types2.log`, SHA256 do log vazio
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). Snapshot imediato
`gamification-consumers-qualified-checkpoint`:139 arquivos, manifesto SHA256
`25cc8d5f6873762fc166d0ece5b1d4fe60acc6728c9f1e3348b9d4c8340f0197`.

O lote seguinte migra avatares, overview, perfil público, ranking e painel parental para batch
canônico, incluindo perfis materializados sem XP. Ausência retorna null/indisponível, nunca um
Noob inventado. Fotos da seleção Auth continuam independentes da política pelo consumidor S2S
existente. Publicações pendentes usam identidade congelada do ledger e marco da política.

A primeira execução preservada (`batch-consumers-first.log`:64 pass/10 fail) revelou uma regressão
real no novo contrato: `z.uuid()` exigia versão/variante RFC, enquanto o contrato Auth/HTTP/PG
existente aceita UUID hexadecimal8-4-4-4-12. Prova causal `identity-format-red.log`:2 falhas;
contrato compartilhado Core identity com a expressão existente e normalização de caixa,
`identity-format-green.log`:2 pass/5 asserts. Nenhum ID de fixture foi substituído. A fonte
inspecionada, não dados de produção, fundamenta a compatibilidade; prova SQL adicional pendente.

Quatro fixtures de perfis genuinamente sem XP passaram a registrar admissão explícita no fake;
isso não adiciona fallback em produção. O negativo intermediário69 pass/6 fail permanece em
`batch-consumers-second.log`. Resultados sequenciais em janela autorizada:

- Batch/query/perfis/parent/HTTP: **75 pass/0 fail/292 asserts**,11 arquivos, EXIT0,
  `batch-consumers-green.log`.
- Core identidade/canônico/paridade/pausa/journey/state: **61/0/2787**, EXIT0,
  `batch-identity-core.log`.
- Auth/Members admissão/coorte/gateways/workers: **26/0/86**, EXIT0,
  `batch-identity-admission.log`.
- Members TSC: **EXIT2**, um diagnóstico próprio em get-league.service.ts154: nível canônico
  nullable incompatível com LeagueEntryView. Log `batch-consumers-members-types.log`, SHA256
  `301587852a9c286fd21fa304475a6419ea40817aeefd0a2fee52a93112ad166f`.

Snapshot anterior à correção da Liga `batch-consumers-tested-checkpoint`:159 arquivos, manifesto
SHA256 `4632d1547dc320038396ad954d7bc653e45a2f4de709892dfb6a76780206afff`.
O contrato da Liga foi ajustado para nullable/indisponível, preservando XP e privacidade, e dois
casos foram adicionados; **ainda sem execução** nesta fronteira. Novos listOwners SQL, Auth/Core
TSC, tipos Admin/member-shell/Kids, hosts e UI completa continuam pendentes. Sem SQL/fullsuite,
build ou navegador neste lote; nenhum checkpoint representa entrega integral da jornada.


### Liga e primeiras entradas de host — focados posteriores ao batch75

Snapshot pré-gates `host-entry-checkpoint`:174 arquivos, manifesto SHA256
`32a1d4ce119c35a8de9a62874adfbd14f2add28bed69fd34945dd2af9b30a2db`.
A correção da Liga mantém posto nullable/indisponível e XP real; não concede Noob por falha.
O adapter do host lê capacidades da view persistida, separa paleta/extensões curriculares e
aceita preview somente como saída explícita do Members, sem derivar privilégio de role/rank.
Nível máximo do catálogo é geometria: a lista allowBlocks da criança continua restritiva;
lista vazia não abre criação clássica. Projeto Pro existente conserva sua condição própria.

Em janela exclusiva, Bun1.3.11, sequencialmente:

- `host-entry-members-first.log`:19 pass/1 fail/71 asserts. Uma fixture da Liga sem Gamma,
  sem registro de admissão, ainda esperava posto string. Negativo preservado. `seedKidsAccess`
  passou a admitir explicitamente esses perfis da fixture, inclusive sem XP; produção e as
  asserções de nomes/foto/privacidade/XP não mudaram. Reexecução `host-entry-members-green.log`:
  **20 pass/0 fail/73 asserts**,1,25s, EXIT0; inclui os dois novos casos de indisponibilidade e
  posto offline e a fronteira de owner/identidade.
- `host-entry-shell-first.log`: **43/0/245**,0,769s, EXIT0. Adapter, catálogo real de extensões e
  publicação Pro. Capacidade custom pode abrir no Noob e faltar no God; role de equipe não
  ignora política ausente. Aula Pro contextual segue autorizada sem a capacidade global.
- `host-entry-kids-first.log`: **14/0/26**,0,983s, EXIT0. Gates clássico/Pro distinguem política
  indisponível, capability ausente, paleta ausente/falha e preview sem perfil/sem posto virtual.

Snapshot imediato pós-focados `host-entry-focused-checkpoint`:175 arquivos, manifesto SHA256
`2929eeb95485a37565cb1b6d58f5ec2404527748465364618d3e3314e76e37f7`.
Members TSC incremental iniciado depois, ainda sem resultado neste registro. Não houve SQL,
fullsuite, build ou navegador. Entradas/gates não qualificam o render integrado das páginas,
demais ferramentas, Pensa, BFF completos ou Admin; publicação global segue não exposta.


Members TSC incremental do recorte acima encerrou **EXIT0** (sessão53056), Node24.22.0/TS5.9.3,
cache próprio e dependências legítimas. Sem saída; Tee-Object não criou arquivo para stream vazio,
então `host-entry-members-types.log` foi materializado vazio após o exit confirmado, SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
Recibo `host-entry-members-qualified-receipt.json` referencia o snapshot175 e confere os hashes:
nenhuma fonte mudou desde o snapshot; somente este documento recebeu resultados. A qualificação
de tipos é de Members, não de member-shell/Kids/Admin. Janela pesada liberada ao root.


### Participantes Pensa — contrato canônico e focados

Snapshot pré-gates `pensa-consumers-checkpoint`:179 arquivos, manifesto SHA256
`868eb49f2021ae6c37244988c09384bc6e036ac5e5b6fbd20afc298c16c8e2ef`.
Fatos transportam kidsJourney ou kidsPreview por participante; capacidade não vem do posto.
Preview limita-se ao ator privilegiado da própria conta, sem perfil/suporte/student; participante
terceiro não herda privilégio. O contexto confirma metadados antes de conceder recursos e mantém
paleta/inventário da pessoa que programa. Bandas Molda usam capacidades próprias; não há união
fictícia de blocos entre pessoas. Rank nullable representa a prévia sem posto; strings dos
snapshots Pensa existentes continuam aceitas, sem alteração de progresso/revisões.

Janela autorizada, sequencial, Bun1.3.11:

- `pensa-consumers-first.log`: **46 pass/0 fail/126 asserts**,10 arquivos,1,94s, EXIT0.
  Inclui capabilities, planejamento/fluxos, inspeção, privacidade, proteção, rotas e worker.
  Novos casos: Noob com recursos custom e God sem capacidade; preview próprio sem rank;
  nega preview de pessoa terceira/perfil e política ausente/indisponível.
- `pensa-consumers-core.log`: **83/0/2823**,8 arquivos,1,331s, EXIT0. Pensa e contratos puros,
  identidade, seed/paridade/pausa e jornada histórica de referência/Adult.

Recibo `pensa-consumers-focused-receipt.json` confere zero mudanças em todos os bytes do
snapshot179 após os focados. Este lote **não** qualifica a chamada real do adapter Pensa SQL,
seu fixture de admissão/política, nem Members TSC pós-fatos e tipos globais das aplicações.
Janela liberada para a frente pedagógica; sem SQL/TSC/build/browser automático.


### Hosts e capacidades — matriz curta, negativos preservados

Snapshot pré-gates `hosts-capabilities-checkpoint`:215 arquivos, manifesto SHA256
`d55a728b78ad81faf95b5d50fb0203e0237cb26614458ce15930114c76837e47`.
Bun1.3.11, execução sequencial em janela exclusiva:

- `hosts-capabilities-shell-first.log`: **229 pass/18 fail/1177 asserts**,247 casos,16 arquivos,
  2,72s, EXIT1. Não qualifica o Shell. Quatro falhas Python/publicação apontam fixture antiga
  sem a query Kids obrigatória no construtor FreeStudioAccessService. Nenhum assert de revisão
  retida, linguagem, namespace ou publicação foi relaxado. Quatorze falhas Zappy ficam antes
  da resposta/quota: a fixture STAFF ainda usa aluno God virtual; o consumidor também mantém
  skip curricular por role, divergindo do novo preview explícito. Ambos exigem correção e
  reexecução. Novas regressões mínimas de view de aluno com role diferente/falha de paleta
  foram escritas após este negativo, ainda não executadas.
- `hosts-capabilities-core.log`: **83/0/2823**,8 arquivos,1,377s, EXIT0.
- `hosts-capabilities-kids-first.log`: **40/0/115**,6 arquivos,1,115s, EXIT0.
- `hosts-capabilities-molda.log`: **10/0/38**,1 arquivo,0,388s, EXIT0.

Nenhum SQL/TSC/browser/fullsuite/HTTP child foi executado. Janela liberada para Pedagogia.
A fixture Python passou a injetar a query real sobre seed publicada + perfil admitido + earned
retido; mudança somente de teste, posterior ao snapshot215 e ainda sem gate. Os resultados
Core/Kids/Molda acima qualificam seus bytes no snapshot215, não toda a jornada ou próximos edits.

Precisão da classificação após leitura de rotas: Members `/gamification/me` exige o guard
canônico de own-account preview para roles privilegiadas e recusa perfil/student/impersonação.
Logo os 14 negativos Zappy decorrem de fixture inválida/consistência interna (STAFF retornando
aluno God), sem prova de falha externa de autorização. Os novos casos de variação de role
exercitam a disciplina do consumidor da view; não representam bypass de uma rota válida.
A correção deverá impedir consulta de currículo em preview, pois GET studio/unlocks pode
reconciliar grants: leitura de equipe precisa continuar sem freeze/award/conquista.

Inventário de construtores encontrou também `member-shell/qa/python-builder-sdk-host.ts`.
Adaptação autorizada e aplicada somente à fixture: seed publicada + owner admitido + earned
retido via query real, removendo fake de contagem de slots. Runtime/Pyright/SQL e asserts
preservados. Gates afetados pendentes: `studio-runtime/tests/python-sdk-smoke.ts` e
`member-shell/qa/tsconfig.json`; não executá-los implicitamente na matriz curta de units.


### Hosts/capacidades — contrato Zappy RED/GREEN e matriz posterior

Janela exclusiva, Bun1.3.11; nenhum SQL/TSC/browser/HTTP child/SDK real.

- `zappy-view-contract-red.log`: **1 pass/3 fail/4 asserts**,4 casos,0,686s, EXIT1.
  Controle student abriu com a mesma view/paleta; staff/admin falharam403 e a falha curricular
  esperada503 virou403. São testes do consumidor da view, não prova de bypass de rota externa.
- Correção produtiva Zappy: paleta Kids deriva da view/preview explícito, não de role. Consulta
  curricular só depois da view e do gate IA, nunca em preview, pois o GET pode reconciliar
  grants. Adult conserva sua consulta e autorização anteriores. Python retém autorização
  contextual; nenhuma dependência nova IA→Studio foi inventada. Fixture STAFF retorna preview
  sem rank, não aluno God. `zappy-view-contract-green.log`: **5/0/7**,0,657s, EXIT0; inclui o
  caso de preview cujo endpoint curricular lança se consultado, com zero consultas confirmado.
- `hosts-capabilities-shell-green.log` **é negativo intermediário**, apesar do nome:248 pass/
  4 fail/1230 asserts,2,52s, EXIT1. Três testes Python Pro ainda tinham fake de gamificação BFF
  separado da autorização runtime; agora ambos leem a mesma query sobre snapshot seed/owner
  admitido/earned retido. Um teste student herdava o preview padrão STAFF; recebeu view de aluno
  explícita. Nenhuma asserção de revisão/publicação/idempotência foi alterada.
- `hosts-capabilities-shell-second.log`: **252 pass/0 fail/1267 asserts**,16 arquivos,2,46s, EXIT0.
  Inclui publicação Python classic/Pro, aula/live, resposta Hub perdida, update/restore/disable,
  IA/narração/Pensa, builder e regressão Adult.
- `hosts-capabilities-core-second.log`: **86/0/2866**,9 arquivos,1,296s, EXIT0. Inclui helper
  global de apresentação, paridade dos oito postos e promessa Pensa+IA limitada ao horizonte.
- `hosts-capabilities-kids-second.log`: **51/0/168**,7 arquivos,0,774s, EXIT0. Inclui gates, CTA,
  bandas Molda e ajuda neutra, com Estúdio conquistado/currículo vazio ou indisponível e sem
  promessa de posto futuro ausente na política.
- `hosts-capabilities-members-parent.log`: **15/0/53**,2 arquivos,1,165s, EXIT0. Relatórios
  parentais usam o helper Kids; o consumidor Adult legítimo continua no caminho anterior.

Snapshot imediato `hosts-capabilities-focused-checkpoint`:229 arquivos, manifesto SHA256
`789a235259c283b0e969912fcbe68d11043afc5cd39789985e9e6353c0ac02fd`. Recibo
`hosts-capabilities-focused-receipt.json` registra hashes dos logs e limites. Estes focados não
qualificam tipos completos, composição/render real de menu/Criar, SQL Pensa/registro, HTTP child,
QA SDK, progressão/recompensas/timeline ou Admin. A adaptação SDK é apenas fixture e ainda
exige seu smoke real e QA types. Janela liberada ao root/Pedagogia; próximos lotes separados.


### P6A — progressão/recompensas/timeline, escopo e provas

Sem SQL/TSC/browser/HTTP child/SDK. O RED foi escrito antes de alterar produção.
`progression-ui-red.log` é parcial e encerrou EXIT-1: Bun imprimiu recursivamente um elemento
HappyDOM recebido por toBeNull. Após verificar comando/identidade, somente Bun23512 e sua
pipeline Tee10776 próprios foram parados. O arquivo15.808.651bytes permanece preservado.
Mesma condição de ausência passou a comparar booleano, sem mudar a expectativa semântica.
`progression-ui-red-bounded.log`: **1 pass/5 fail/15 asserts**,6 casos,0,758s, EXIT1.

Falhas: ausência de policy mostrava Faísca; equipe recebia rank/progresso virtual; Coder
custom com IA anunciava Estúdio/Pinta; complete-only ainda exigia Mural; requisito por courseId
ausente era ignorado pelo horizonte calculado a partir do catálogo da UI. Controle seed manteve
os oito nomes. `progression-ui-timeline-green.log`: **6/0/20**,0,566s, EXIT0.

Helper novo `lib/journey-presentation.ts` usa os estados de advances/mode/readiness da view;
não reavalia currículo nem conta slots fixos. Timeline/recompensa/cartão home e hint do perfil
passam a ler a mesma view. Recurso anunciado é capability de fato adquirida/atribuída; a lista
de conquistas retidas permanece mesmo quando removida da policy ou quando horizonte reduz.
Futuro pausado não promete promoção. Preview/indisponível não criam badge Faísca. Consulta extra
do catálogo/hint antigo saiu de home/perfil; timeline não recebe catálogo paralelo. Badges, XP,
paleta/licença, runtime e mecanismos de autoria permanecem separados.

`progression-ui-expanded-green.log`: **10/0/32**,0,942s, EXIT0. Inclui cartão sem policy/preview,
Lenda earned com horizonte Faísca e ferramentas retidas removidas da configuração. Dois casos
posteriores cobrem marco misto complete/showcase e pausa.
`progression-focused-first.log`: **98 pass/2 fail/310 asserts**,100 casos,10 arquivos,1,462s,
EXIT1. Profile-sections ainda simulava gamificação sem policy/view; a fixture ganhou projector
real/seed publicada/curso de entrada conhecido. Asserts originais de nomes/badges/XP intactos;
prop catálogo removida acompanha o contrato novo, sem fallback ao horizonte antigo.
O teste da copy fixa fica explicitamente como referência de migração do seed enquanto a trilha
ainda o consome; suas constantes vêm do Core de referência, não de export Shell removido.

Biome scoped10 arquivos: **EXIT0**,73ms, formatou10. Matriz após formatação
`progression-focused-second.log`: **100 pass/0 fail/318 asserts**,10 arquivos,1,76s, EXIT0.
Inclui UI nova, perfil/feitos, caminho e testes anteriores de mapa/horizonte como regressão de
referência; **não prova mapa custom migrado**, que ainda é lote P6B.

Snapshot imediato `progression-p6a-focused-checkpoint`:237 arquivos, SHA256
`7efa3d058fed1aa01dec38061bd32ec73d334b5be0f50682f3c59a0d28088f51`.
Recibo `progression-p6a-focused-receipt.json` guarda hashes dos logs e limites. Tipos completos,
render/composição real das páginas, mapa/agrupamento/trilha/celebrações, Admin, SQL e rollout
permanecem pendentes. Não houve merge/push.


### P6B parcial — transporte/agrupamento/mapa/trilha/breadcrumb

RED anterior à produção: progression-p6b-map-red.log **0 pass/4 fail/6 asserts**;
progression-p6b-identity-red.log **0/3/7**. O projector não transportava tierAccess, os DTOs
HTTP não transportavam courseId e a prévia não expunha suas próprias regras; agrupamento
fixo ignorava opensAt e deep-link sem policy abria. Foi aprovado pelo root transportar regras
readonly da mesma policy, curso canônico e direito retido sem gate artificial de rank.

Views agora carregam tierAccess copiado da mesma versão publicada, com validator de sete
etapas reaproveitado do contrato. Catalog/MyCourse retornam courseId. Progression-p6b-
transport-green.log preserva **13 pass/1 fail/68 asserts**: expectativa exata do preview
faltava o campo novo. Corrigida só essa expectativa; transport-green-2 **14/0/96**.

Guard de transporte: mapping-guard-red **0/1/1** para view sem mapping; a primeira tentativa
usou .shape em schema readonly e gerou **2 pass/3 fail/93 asserts** (mapping-guard-green.log,
nome preservado embora negativo). A correção extrai schema compartilhado, sem trocar Zod ou
relaxar validação; mapping-guard-green-2 **5/0/110**, incluindo ausência, vazio, tier duplicado
e rank inválido. Nenhum desses estados vira seed ou autorização parcial.

Agrupamento, link de retorno, mapa e trilha leem a configuração canônica. Rank earned/check
separados de trail acessível: recurso retido pode abrir a trilha futura sem conceder o posto.
Unknown policy é explícita; preview próprio autorizado não recebe criança virtual. O mapa
recebe somente view bounded e identidades dos destinos; catálogo inteiro fica no servidor.
Graduação mantém acesso curricular prévio. Contadores não concedem rank/paleta.

Motores de LEVEL_TIER/LEVEL_STUDY, horizonte por catálogo UI e copy fixa de recompensas foram
retirados de produção e isolados como oráculos em tests/fixtures. Os testes default restantes
agora injetam seed explicitamente apenas na fixture. Unknown-rank deixa de fabricar Faísca;
null-policy no deep-link passa a fail-closed conforme contrato aprovado. Demais asserts de
ordenação, extras/rewards, publicação curricular e preservação de checks mantidos.

Gates focados após Biome37/0:
- progression-p6b-kids-final.log: **119 pass/0 fail/357 asserts**,13 arquivos,1,335s.
- progression-p6b-shell-final.log: **117/0/674**,4 arquivos,2,19s.
- progression-p6b-members-final.log: **26/0/181**,4 arquivos,1,469s.
- progression-p6b-core.log: **40/0/2696**,5 arquivos,1,477s; paridade8/49, pausa,
  access monotônico, reward independente e schema compartilhado. Rodado antes de formatação.

Estes gates não qualificam tipos completos, composição real das páginas RSC, celebrações,
Admin, SQL novo, SDK/HTTP child, bootstrap/rollout ou integração com remoto. Sem SQL/browser/
merge/push. Snapshot e recibo complementares em cache; TSC aguarda janela do root.


P6B — tipos segmentados e correções posteriores ao snapshot254:
Core TSC EXIT0 (progression-p6b-core-types.log). Members primeira65361 EXIT2, apenas expected
DTO em application/list-catalog120 sem courseId. RED runtime preservado **3 pass/1 fail/9**;
expected acrescenta publishedCourse.id conhecido antes da execução, sem copiar resposta.
GREEN **4/0/9** e Members incremental types-2 EXIT0 (~5,6s).

Kids primeira96731 EXIT2 com seis diagnósticos: home85 comparava retorno objeto de availability
com string; ranking-hub335/377 passava rank nullable para badge; expiry fixture sem courseId;
Molda teste importava copy fixa já isolada; Hub AuthorAvatarInfo não aceitava level null.
Home usa .state preservando demais gates/produtos. Ranking agora mostra Posto indisponível,
sem badge Faísca inventado. Tipo avatar aceita null (enriquecimento não o troca por posto).
As duas fixtures foram atualizadas, sem mudar assertions anteriores de prazo ou ferramenta.

Ranking RED inicial teve query singular ambígua (zero asserts; preservado). Repetição bounded
**0/1/1** demonstrou **5 badges Faísca** em entradas com rank null. GREEN mínimo **1/0/2**.
Biome scoped7 EXIT0, formatou7, com **1 aviso** de import unused no teste Molda, ainda preservado
para cleanup do próximo lote; não equivale a lint sem warnings.
Kids incremental45189 types-2 **EXIT0**. Node24.22.0/TS5.9.3 absolutos, caches próprios,
sem SQL/browser/build e sem concorrência pesada da raiz. Members passou antes apenas dessa
formatação posterior do teste list-catalog; Core/Kids cobrem os bytes produtivos atuais.

Focados pós-fix: Kids ranking/expiry/Molda **19/0/85** (0,802s); Shell Hub redação **22/0/50**
(48ms); Core final pós-formatação **40/0/2696** (1,261s). Esses gates não substituem os gates
integrados pendentes: RSC real, Shell/QA/Admin types completos, celebrações, SQL novo/retention,
bootstrap/admission/rollout e staging. A próxima fronteira P6B-C foi só inventariada em cache;
fonte de celebração ainda intacta. Requisito explícito normal sem tier precisa caso de UI futuro.


### P6B-C — celebrações por capacidade, fronteira separada do258

Snapshot258 anterior preservado: SHA423deda5379a87ebb6290c553f9786e3c91e7aa99bb0c2448dda382aa608dcac.
Novo RED escrito antes de editar fonte: progression-p6bc-celebration-red **2 pass/4 fail/13**,
6 casos,0,723s. Pipeline de apresentação real rank→moldaLevelGain→watcher omitia Molda em
Coder custom, prometia faixa no Architect sem capability e dizia publicar em complete-only.
Sinal rank isolado sem view gravava storage: este quarto caso é defesa de contrato interno,
não evidência de payload incoerente que a rota atual emite. Primeira visita/troca de perfil
foram controles verdes. O teste depois removeu os props produtivos aposentados, mantendo
extraliteral de rank apenas na negativa de view ausente; mesmas expectativas semânticas.

Watcher/layout agora recebem view Kids validada (equipe fora), nunca posto antigo isolado.
O snapshot local de capabilities é bounded9 por perfil, somente detecção visual: não concede
acesso, matrícula, blocos ou recursos. Unknown/primeira observação não vira array vazio e não
faz festa retrospectiva. Produto adquirido é condição separada para dizer No Molda. Sem view
não grava rank/caps nem busca drawers. Os drawers continuam usando revisão on-demand e o
snapshot curricular anterior; abort/erros de rede/guia/fusão dos overlays foram preservados.
O chrome usa key do perfil para remount na troca, sem transportar snapshot de outra criança.

Não foi criada nova festa por edição da policy: a linha do Molda integra a comemoração de
posto existente. Capacidade nova sem mudança de rank continua disponível nos hosts/menu,
mas não cria overlay extra. A observação pedagógica não depende de compra do produto;
licença desconhecida/não adquirida só impede anúncio, sem fingir revogação do direito.
A copy do posto agora é factual; blurbs curriculares fixos não usados saíram da metadata visual.

GREEN6/15 (0,728s). Prova adicional de view antiga: stale-observation-red **0/1/1**, antes
snapshot local Lenda caía para Coder. Rank observado não regride e capabilities observadas
unem-se monotonamente para detecção de UI, sem alterar a autoridade servidor. Dependências
do efeito são rank/capabilities escalares estáveis, não identidade do objeto RSC.

Affected-green **31 pass/0 fail/112 asserts**,4 arquivos,1,364s, antes da formatação. Inclui
os sete casos novos, watcher existente, arquitetura da busca leve e Molda; seed nas mesmas
faixas por comparação de capacidades reais anteriores/atuais. Testes antigos receberam a
view canônica e posse explícita; não há função produtiva moldaLevelGain ou threshold de posto.
Biome scoped10 **EXIT0**,47ms, formatou10, sem warnings (unused anterior removido).
Tipos e gate focado pós-formatação ainda pendentes deste lote;258 não os qualifica.

Inventário restante de UI: badge opcional em public-profile/user-menu ainda pode fabricar
Faísca quando rank está ausente; requisito explícito normal sem tier ainda precisa ser
oferecido como aventura necessária, usando courseId e marco da mesma view. Não iniciar
novo motor ou inferir cumprimento pelo catálogo da UI para resolver esses casos.

P6B-C — recibo final após adaptação da fixture do aviso:
Focado pós-formatação progression-p6bc-final-focused.log: **51/0/167**,7 arquivos,1,77s.
Kids TSC54126 EXIT2 revelou um único caller de teste do watcher ainda com levelSlug em
platform-renovation-notice128. A fixture recebeu a mesma kidsView canônica usada nos outros
callers; os asserts existentes de aviso→guia→conquista permaneceram intactos. O negativo
progression-p6bc-kids-types.log foi preservado. Biome dessa fixture: **1 arquivo, EXIT0**,
sem fixes. Revalidação final progression-p6bc-final-focused-2.log: **59 pass/0 fail/193**,
8 arquivos,1,98s, agora incluindo os oito casos do aviso. Kids TSC incremental46382 **EXIT0**,
Node24.22.0/TS5.9.3, log progression-p6bc-kids-types-2.log vazio. Gates sequenciais na janela
coordenada, sem SQL/browser/build. Não qualificam os consumidores D, Admin ou composição
RSC integrada ainda pendentes. Snapshot próprio captura os bytes destes gates.

### P6B-D1 — identidade visual indisponível, lote separado de requisitos

Após snapshot C qualificado (265 arquivos, SHA20e4aa4872ce590ebea943812bf2db4d248df8d8b430cdcae2176e58407301a9),
cinco testes foram escritos antes de alterar fonte. RED progression-p6bd1-badge-red.log:
**2 pass/3 fail/15 asserts**,633ms. Helper ausente/desconhecido retornava Faísca; perfil público
com level null e dropdown de criança sem gamification exibiam Faísca. Oito postos explícitos
e conta própria staff sem perfil foram controles verdes. Não é prova de perda no servidor:
o defeito confirmado é a apresentação de ausência como primeiro posto.

levelInfo agora usa metadata visual neutra Posto indisponível (cor neutra e ícone de consulta),
sem tocar policy/gates/rank/currículo. Apenas chaves próprias da metadata são identidades.
A proposta transitória de ampliar PublicProfileGameView para level null foi retirada após
revisão: o serviço público Kids rejeita view ausente e sua resposta exige level não nulo. GREEN mesmo teste **5/0/22**,599ms.
Tipos, formatação e matriz afetada ainda pendentes; não generalizar o GREEN mínimo para UI
integrada nem declarar o lote D1 encerrado. Nenhum SQL/browser/TSC rodou neste recorte.

D1 — precisão da prova após revisão de fonte (ainda sem novo gate):
GetPublicProfileService.execute verifica Kids getMany e lança indisponível antes da resposta se
não houver view; PublicProfileView Members exige level não nulo. Assim, o RED público usando
level:null e seu GREEN anterior são defesa interna de render, não demonstração de resposta
atual da rota. A expansão nullable do DTO compartilhado foi retirada, preservando o contrato.
A fixture pública agora apenas omite o level opcional já aceito pelo DTO web existente.
A mudança produtiva D1 está restrita à metadata neutra de levelInfo. A fixture ajustada ainda
precisa do gate seguinte; os logs anteriores permanecem inalterados. Menu sem gamification e
helper ausente/desconhecido continuam os outros dois casos. Não alegar API pública retornando
null ou perda de conquista no servidor a partir deste recorte.

### Admin A — transporte BFF independente, ainda não qualificado

Durante a janela pesada do root foi escrito apenas transporte no worktree isolado:
server/kids-journey.ts, server/kids-journey-response.ts e sete handlers concretos sob
/api/members/journey/kids. Reutilizam gatewayFetch/forwardUpstream existentes; não repassam
headers de identidade do browser nem inventam ator ou política. IDs de preparação passam pelo
IdentityUuidSchema canônico antes de formar URL, evitando normalização de segmentos como '..'.
Histórico só transporta beforeVersion/limit. POST JSON segue o leitor bounded do Core com teto
512 KiB já usado nas rotas administrativas, recusa encoding/tipo incorreto e marca respostas
private,no-store. A validação completa/RBAC/ator continuam no gateway e Members.

Não houve montagem de rotas Members, mudança de RBAC do gateway, UI/editor, source Auth/SQL,
execução de teste, formatação, TSC ou servidor. São nove arquivos produtivos novos, separados
após C e de D1/D2; nenhum qualificado pelo snapshot C. Dois arquivos de teste estão escritos:
wrapper isolado + fixture com sete casos de transporte, usando o mesmo binário Bun do pai.
Os mocks de gateway só vivem no subprocesso. Estes testes ainda NÃO foram executados e não
comprovarão autenticação real: gates de composição/gateway continuam obrigatórios.

### Cartão de recompensa — RED real, correção de texto ainda sem GREEN

Depois da autorização do root para um teste focado, `journey-canonical-reward-card.test.tsx`
executou quatro casos com o projetor e resolver reais do Core, sem mock de autorização:
**2 pass / 2 fail / 21 asserts**, exit1, 1.151s. Log `catalog-reward-card-red.log` preservado.
Nos negativos, as oito aventuras Iniciante2D já estão concluídas e publicadas, readiness=ready,
o posto continua Coder pelo requisito explícito de outro curso e o resolver devolve tier-reward
com requiredLevel god ou hacker. O cartão ainda prometia terminar a trilha, sem nomear o posto.
Os dois controles passaram: direito reward retido abre abaixo do posto e base conhecida
ausente com whenMissing=open abre reward sem conceder entry. Não é catalog-null fail-open.

A fonte do cartão agora usa apenas requiredLevel dessa decisão do servidor e a metadata dos
oito nomes; ausência de identidade não promete Faísca nem conclusão da trilha. Não muda gates,
matrícula, courseJourneyState, selos, progressos ou grants curriculares. GREEN, formatação,
matriz afetada e tipos ainda NÃO executados. O teste levou 1.151s, ligeiramente acima da
estimativa inferior a um segundo; não houve processo remanescente nem gate pesado adicional.

### D1 e cartão — qualificação posterior à correção da fixture pública

Na janela seguinte autorizada, os dois arquivos focados passaram **9/0/47**,697ms, com a
fixture pública atual omitindo somente o campo opcional do DTO web. Biome dos quatro arquivos
passou sem erros (formatou os dois testes). A matriz posterior de onze arquivos passou
**59/0/253**,1.362s, incluindo os selos curriculares, catálogo, prazo de acesso, perfil,
ranking, menu, mapa e celebrações. Kids TSC incremental sessão18404 terminou **EXIT0**, log
vazio, Node24.22.0/TS5.9.3. Nenhum SQL/browser/Admin foi executado nesta janela.

Snapshot delta de quatro arquivos `badge-reward-qualified-checkpoint`, manifest SHA
`d4c13238ffb318e146a9ed0b2e2d381f0975f34a36c1d97af86999a4a32cdd97`, sourceMismatches=[].
Base explícita no snapshot C265; comparação dos arquivos dessa base mostrou mudanças apenas
em level-info e três documentos de acompanhamento. O novo cartão e os dois testes também
estão copiados no delta. Isto qualifica D1 e a apresentação do requisito de reward, sem
extrapolar para Admin A, D2, integração/staging ou jornada completa. Host liberado ao root.

### Admin A — transporte qualificado, composição e autorização reais ainda pendentes

Fixture isolada `kids-journey-bff.ts`: **7/0/171**,154ms. Wrapper de isolamento: **1/0/1**,226ms.
Biome passou nos onze arquivos, sem erros, formatando só a fixture. Revalidação posterior:
**8/0/172**,365ms. Admin TSC sessão74019 terminou **EXIT0**, log vazio, com Node24.22.0,
TypeScript5.9.3 e cache incremental próprio. Não houve DB, navegador, montagem de rotas ou
alteração de RBAC neste lote. As credenciais continuam nos mecanismos existentes do gateway;
os doubles da fixture não demonstram autenticação/autorização real.

Snapshot `admin-a-transport-qualified-checkpoint`, onze arquivos, manifest SHA
`fdadb60249f2cd818355341f38939ef5418daa31f59e3eab60802327371f3c0d`, sourceMismatches=[].
Composição Members, allowlist/RBAC no gateway, editor, integração, rollout e cleanup restante
continuam pendentes. Fonte de transporte congelada para o lote seguinte; host liberado ao root.

### Admin B — composição e allowlist, focados verdes; tipos e integração pendentes

RED antes da montagem: gateway **0pass/2fail/2**,123ms, sem rotas; servidor Members composto
**0pass/3fail/3**,935ms, HTTP404 nos três casos. São ausência de composição/configuração,
não demonstração de autorização externa quebrada. Logs `admin-b-*-red.log` preservados.

composition-root passa a compor KidsJourneyConfigurationService sobre kidsJourneyRepo já
existente, e createServer monta suas rotas. Gateway declara sete caminhos exatos JWT ativo,
GET/preview para equipe, mutações admin/superadmin; Members mantém a checagem de conta própria
antes de escrever. Não altera seed, grants, currículo, autoria, regras Adult ou política SQL.

GREEN mínimo: gateway **2/0/85**,119ms; Members **3/0/27**,889ms. Biome seis arquivos sem erros.
Matriz pós-formatação: gateway config+stage **52/0/323**,503ms; Members configuração/rotas/
servidor real e regressão Adult **19/0/116**,1.141s. O teste Members usa o serviço real com
porta de persistência fake; o teste gateway usa registro e stage reais com identidade resolvida
fornecida no teste. Não comprovam JWT/forwarding/DB integrados. TSC Gateway/Members e integração
ainda pendentes, aguardando janela do root. Nenhum TSC/SQL/browser rodou neste lote até aqui.

Admin B — tipos posteriormente executados na janela autorizada: Gateway **EXIT0**,2.9s,
log vazio. Members sessão88369 **EXIT2** com um diagnóstico na fixture nova: inferência da
lista inline de headers como união com propriedades opcionais undefined incompatível com
Record<string,string>. Negativo preservado. Apenas a lista recebeu anotação explícita;
asserts e fonte produtiva não mudaram. Revalidação da fixture **3/0/27**,907ms; Members
incremental posterior **EXIT0**,9.6s, log vazio; Biome final da fixture1/0, sem alterações.
Node24.22.0/TS5.9.3, resolvers Core da própria worktree e versões legítimas mantidos.

Snapshot `admin-b-composition-qualified-checkpoint`, oito arquivos, SHA
`5505e9877f40bb176eb277fa47235a4782c7f8949d235edd0b60ed993cc33cd0`, sourceMismatches=[].
Qualifica montagem/configuração e tipos locais; JWT/forwarding/DB integrados, editor,
bootstrap/retention/SDK/staging e conciliação da base continuam pendentes. Sem SQL/browser.

### D2 — identidade canônica e requisito fora da trilha, focados verdes; tipos pendentes

Core RED **0pass/5fail/8**,95ms, antes do campo readonly resolvedCourseId:string|null.
O projetor passa a preencher esse campo usando o mesmo matcher de candidatos da readiness:
único curso Kids gravado publicado, sem formatura; null em ausência/ambiguidade/indisponível.
Estado satisfeito histórico e posto permanecem, mesmo com identidade null. GREEN **5/0/18**;
Biome4/0; matriz Core **68/0/2833**,1.471s, incluindo paridade8/49, pausa e direitos preservados.

Consumidores RED **0pass/2fail/8**,1.114s: alias slot+course contava duas aventuras, e a página
real omitia curso explícito fora da trilha atual. Fixture inicial tinha level:null junto da
view válida; a página lê a view, mas isso não reproduz fielmente o DTO completo do servidor.
Foi corrigida para usar o adapter real kidsStudentLevel(view). RED da página repetido nessa
fixture válida contra a fonte pré-D2: **0pass/1fail/3**,3.26s; fonte nova restaurada em finally
e hash conferido. Logs originais preservados; nenhuma alegação de falha externa de autorização.

UI agrupa só apresentação pela identidade projetada e mantém todos os requisitos/estados.
Oferece cursos necessários fora da trilha em seção suplementar, join por courseId; não resolve
slots novamente nem altera ordenação/gates curriculares. Reutiliza CatalogCourseCard para
matrícula/careerLock. Pausa/equipe não recebem tarefa de promoção; identidade nula não é
substituída por curso parecido. Controles atuais **7/0/28**; matriz UI **70/0/225**,1.98s,
incluindo wrapper em subprocesso (seis casos reais de página foram executados separadamente).
Biome5/0. Tipos Core/Members/Kids, integração e navegador ainda não rodaram neste lote.

D2 — tipos executados na janela seguinte: Core e Members **EXIT0**, logs vazios. Kids sessão23283
**EXIT2** com quatro diagnósticos da mesma inferência larga level/track no objeto bonus da
fixture. Apenas `satisfies CatalogCourseView` foi acrescentado; nenhum assert ou fonte produtiva
mudou. Focados atuais **7/0/28** novamente verdes; Kids sessão76252 **EXIT0**, log vazio.
Biome final fixture1/0, sem alterações. Node24.22.0/TS5.9.3 com resolvers legítimos.

Snapshot `d2-identity-qualified-checkpoint`, nove arquivos, manifest SHA
`c4b977adcab1ee974ca92148aff8071eca83c8d4aacdab70ed82006e55fb6825`, sourceMismatches=[].
Qualifica contrato/projetor e consumidores focados; não integração SQL/SDK/browser/staging,
editor Admin ou tela423 ainda fixa. Host liberado; nenhum processo ou política custom ativada.

### Tela423 — decisão do servidor na mensagem, sem alterar liberação

RED **0pass/2fail/5**,530ms: resolver real exige god no reward, mas a mensagem omitia Lenda
e prometia fechar trilha/publicar; foundation complete-only abre após completed=true com
showcased=false, mas a mensagem antiga exigia Mural. Logs `locked-course-423-red.log` preservados.

A página transporta requiredLevel já existente no envelope423; o componente só traduz uma
identidade visual conhecida. Reward sem identidade mostra indisponível, sem Faísca default.
Foundation-first orienta conferir a aventura anterior sem inventar o marco que o envelope
não transporta. Não altera courseJourneyState, selos, gates, matrícula ou concessão curricular.

GREEN mínimo **2/0/10**; matriz afetada **36/0/106** em sete arquivos,1.80s, incluindo catálogo,
selos, retorno de curso e consumidor D2 isolado. Biome final4/0, sem alterações. Kids TSC
sessão69604 **EXIT0**, log vazio, Node24.22.0/TS5.9.3. Snapshot quatro arquivos
`locked-course-423-qualified-checkpoint`, SHA
`09a17fa89e493ac2d5a5b11f620d0c306f29665ecbf658241a9d1b643b65219c`, sourceMismatches=[].
Não é prova HTTP/JWT/DB integrada da página, apenas render/resolver/parse e tipos; integração
permanece no lote final. Host liberado e revisão em cache `integration-technical-review-2026-10-19.md`.

## Editor Admin C — UI, contrato e permissões (19/10/2026)

Fonte nova: DTO web validado, controller com proteção de geração/operação, página e formulário
bounded em Professor→Jornada Kids, navegação e testes isolados. Postos e ferramentas são um
painel; tierAccess é outro, com mapeamento livre entre os oito postos e as sete etapas. Faísca
é aula-only explicativa, não avanço extra. Cursos ausentes permanecem no rascunho; seleção
nova exige curso Kids gravado publicado, sem formatura. Não existe seed/fallback de produção
no cliente. Initializing e erro bloqueiam novas operações sem substituir dados por Faísca.

GET de configuração acrescenta permissions.canEdit derivado do MESMO policyActor das mutações,
capturado antes do await. É metadata de apresentação: toda escrita continua revalidada no
servidor; getSession do Admin não foi usado para fabricar uma identidade sem contexto.

Comparação usa o servidor; mostra active→paused mesmo changes=[] e identifica a simulação de
novo aluno. Não promete impacto de todos os perfis. Motivo, versão e candidato são capturados
antes da preparação; resposta precisa corresponder. Preparação tem ID no URL, retomada faz
somente leituras/preview, advance é manual, e publish envia apenas os três hashes/version da
mesma preparação. Busy não repete; conflito preserva rascunho e exige nova conferência. A UI
não acrescenta ator ao payload. Histórico falha localmente e mantém revisões já carregadas.

Provas preservadas em .cache/kids-configurable-journey/:

- admin-c-form-red.log e admin-c-editor-red.log: funcionalidades ainda ausentes (module missing).
  Não são alegações de regressão produtiva. GREEN inicial formulário5/19 e fluxo8/43.
- admin-c-editor-boundaries-red.log:11pass/1fail/61; paginação do histórico mostrava erro geral.
  Correção causal no destino do erro; novo GREEN20/97 em3 arquivos, incluindo12 fluxos UI,
  cinco controles do formulário e três contratos. Asserções não foram afrouxadas.
- admin-c-editor-boundaries-green.log:20/97, EXIT0,1.157s antes da formatação final.
- admin-c-affected-green.log:30/140 em8 arquivos, EXIT0,2s após formatação/tipos. Inclui
  wrappers isolados (editor12/64 e transporteBFF7/171); esses filhos não são contagem adicional
  no total30. Inclui navegação/provider/conformidade49 posições.
- admin-c-members-affected-green.log:13/98 em3 arquivos, EXIT0,1.035s; rota/permissão,
  composição e configuração, mantendo origem/ator/preview sem escrita/bootstrapping explícitos.
- admin-c-biome-first.log preserva seis erros de keys e um aviso; chaves imutáveis de comparação
  foram corrigidas, opções usam posição como identidade. Campos de requisitos controlados
  conservam índice de edição deliberadamente para permitir duplicatas temporárias até validar.
- admin-c-biome-final.log:13 arquivos, EXIT0. Nenhuma alteração em contratos Adult/runtime.
- admin-c-admin-types-1.log:Admin TSC79332 EXIT0, vazio; admin-c-members-types-1.log:
  Members TSC81936 EXIT0, vazio. Node24.22.0/TS5.9.3 locais, caches próprios e versões legítimas.

Limites: DOM/handlers/contratos locais, sem navegador/CSS visual ou JWT→Gateway→Members→DB
integrado. Nenhum SQL, deploy, política custom, rebase ou merge foi executado neste lote.
Permissões visuais não são uma nova autoridade. A jornada inteira continua aberta para gates,
retention/bootstrap operacional, consumidores restantes e conciliação da base.

## Cleanup1 — exportações antigas sem consumidor Kids (delta após Admin C)

Inventário: resolveJourneyCourseLock só tinha consumidores em dois testes Core; a tabela
MOLDA_TOOL_BAND_LEVELS só em testes/docs. Foram retirados dos módulos de produção e mantidos
como oráculos em core/tests/fixtures. Tipo MoldaToolBand permanece estrutural, usado na copy de
faixas; famílias/capability→band continuam no modelo novo. CREATOR_JOURNEY_LEVELS, cálculo fixo
computeStudentLevel e creativeToolAvailability continuam para os consumidores Adult legítimos.
Não foram removidos helpers/migrações/ownership/paletas/compatibilidade de projetos JS/Python.

Não houve bug funcional alegado nem RED inventado para mover código morto. Baseline antes:
Core29/2596 em três arquivos (cleanup-1-before.log). Após mover e formatar: Core47/2710 em seis
arquivos (cleanup-1-core-final.log), Kids18/83 em dois (cleanup-1-kids-final.log), cálculo Adult
9/33 (cleanup-1-adult-levels.log), todos EXIT0. Biome11/0 (cleanup-1-biome.log, cinco arquivos
formatados). Busca produtiva pelos dois nomes retornou vazia (cleanup-1-production-reference-check.log).
Tipos desse delta ainda aguardam janela; não extrapolar o TSC anterior do Editor C.

Docs/jornada-do-criador foi atualizado para a autoridade canônica/configurável e preservação
monotônica, conservando currículo, autoria e histórico de migração curricular. Docs/gamificacao
acrescenta nota de autoridade, sem alterar XP/moedas/streak/badges. CLAUDEs dos pacotes distinguem
regra Kids atual de exemplos históricos/ramos Adult. É documentação do modelo em implementação,
sem afirmar deploy. O desenho terminal-retention-next-design.md segue somente desenho, não fonte
ou prova de execução/cron. Nenhum banco, browser, build, deploy ou integração foi executado aqui.

### Cleanup1 — types e review encerrados

Core TSC EXIT0 (2,18s), Members sessão50823 EXIT0 e Kids61506 EXIT0, logs vazios:
cleanup-1-{core,members,kids}-types-1.log. Node24.22.0/TS5.9.3, caches próprios, um processo
por vez. Nenhum SQL/browser/servidor foi iniciado automaticamente após os tipos. ReviewLive
conferiu os18 hashes e oracle textual idêntico ao HEAD, sem novo bloqueio. P3 documental do
quadro de subpaths Core foi corrigido; só essa linha difere do snapshot focado anterior.
A qualificação integrada do Admin/recortes existentes permanece pendente, sem ampliar produto.

## Conciliação3190 e cadeia backend real (19/10/2026)

Checkpoint local5833b73cb preservou 317 arquivos e os recibos anteriores. Merge local
0e20ea3bc incorporou 3190d9e08 sem conflitos, mantendo o novo audience de Zappy e a
nota Adult da base. Não houve push, merge em staging principal ou deploy. Inventário
final para incorporação: .cache/kids-configurable-journey/integration-files-vs-3190.txt
(332 caminhos). A branch estava limpa após a conciliação.

Cadeia nova usou a composição produtiva Members/Gateway, forwarder real, JWT RS256
verificado contra JWKS loopback e PostgreSQL owned 127.0.0.1:5434. Cada execução criou
banco novo e preservou o anterior; nenhum DROP/FORCE. Bootstrap V1 percorreu preparação,
captura e publicação reais com ator system; não foi um INSERT de umaV1 fabricada.

- admin-chain-r1.log: negativa preservada. O harness esperava leitura readonly com
  token de perfil antigo sem claimKids, mas o Gateway recusou corretamente401
  KIDS_LOGIN_REQUIRED. Não foi defeito de autorização do produto. A identidade QA
  foi corrigida para separar perfil antigo 401, aluno Kids válido 403 e impersonação
  readonly com claimact canônica; nenhuma fonte produtiva foi alterada.
- admin-chain-r2.log e qa/admin-chain-result-kids_journey_admin_chain_20261019_r2.json:
  EXIT0, sete cenários / 43 asserções, aproximadamente 6 s, banco novo homônimo.
  Provou leituraV1 persistida/no-store; JWT/S2S e anti-spoof; equipe readonly;
  admission com credencial dedicada e registro semXP; preview sem gravar;
  preparação com ator confiável, candidato/hashes/versão fixos; retomada e avanço
  explícito; hash inválido409; publicação V2 única com histórico e earned intactos;
  expectedVersion antigo409. ScriptQA SHA256197c778f9f945873a25c6f782951ebcb264bf3f7ecaac48b5d90a179458b70df.

Serviços QA47841–47843 encerrados por finally e ausência de listeners47841–47844
conferida. Host devolvido ao root antes de Next/navegador. Escopo ainda NÃO provado:
login/Auth issuer real, coorteAuth não vazia pelo handshake completo, Next/BFF/sessão
no navegador, CSS/a11y e produção. A coorteAuth desta execução era vazia e as
identidades eram assinadas localmente para QA. Os testes SQL prévios de fence/concorrência
continuam provas separadas; esses sete cenários não repetiram essa cobertura.

## Admin integrado em Next/Turbopack e Chrome/Edge (19/10/2026)

Gate final r6: EXIT0, dez cenários reais (cinco por navegador), 42 checks explícitos do
harness, além dos asserts Playwright não somados. Banco novo owned
kids_journey_admin_browser_20261019_r6 em127.0.0.1:5434; sem DROP/FORCE. Node24.22.0,
Next16.3.0 e Bun1.4.3 local, browsers instalados Chrome e Edge, sequenciais. Aplicação
real Admin dev/Turbopack, sessão/cookies RS256 verificados por JWKS, BFF e composições
produtivas Gateway/Members/forwarder/repositório, sem mock de fetch ou de banco.

Provado em cada navegador: ausência de sessão redireciona ao login; sessão assinada
carrega a política persistida; comparar mudança de modo; preparar com motivo; retomar
o mesmo ID após reload sem advance automático; avançar explicitamente até ready;
publicar manualmente; versão/auditoria/earned conferidos no PostgreSQL (V1→V2→V3).
Equipe staff usa sessão real somente leitura e tentativa direta de escrita no BFF
recebe403. Origem estrangeira recebe403. Ao parar o Gateway próprio, a tela mantém a
versão carregada, mostra indisponibilidade e desabilita novas operações; não cria Faísca.
Os500/ECONNREFUSED no log são dessa interrupção deliberada. pageerrors coletados=[];
não é declaração de ausência de qualquer aviso em todos os caminhos do Admin.

Negativos anteriores preservados, sem alterar asserções para esconder produto:

- r1/r3: Turbopack recusou junction de dependências fora da raiz do worktree.
- r2: tentativa de override do runner usou configuração raw sem defaults; falha do runner.
- r4: modo alternativo Webpack encontrou node:crypto em instrumentation/sentry existente;
  não qualificou o app. Nenhuma fonte desse código foi alterada para contornar o erro.
- r5: Turbopack já abriu a página; lista de cursos recebeu404 porque o filtro do runner
  selecionava path exato inexistente em vez da rota real wildcard members-admin-courses-read.
  Corrigido somente o filtro QA; a UI recusou operar enquanto a lista não respondia.

O runner final aplica temporariamente SOMENTE filesystem root/tracing para abranger as
junctions dos worktrees. O restante da config, CSP, middleware, sessão e app é real.
finally restaurou next.config.ts byte-a-byte: SHA original/restaurado
26e44c6445c232ff0ba58567e98bba89dbe9cdf577d590a657921c5ac5d905bd;
SHA durante o overlay37469204a2bdedc57e42ee7eb16467b60207aa84cc681c947a74f405012344b0.
Core foi resolvido explicitamente para a fonte desta worktree, sem trocar versões.
Isso não qualifica build/standalone de produção ou um install físico sem junctions.

Recibos em .cache/kids-configurable-journey/:
admin-browser-chain-r6.log, qa/admin-browser-chain-result-kids_journey_admin_browser_20261019_r6.json,
qa/admin-browser-network-kids_journey_admin_browser_20261019_r6.json,
qa/admin-next-config-r6-restoration.json e dez PNGs em
qa/screenshots-kids_journey_admin_browser_20261019_r6/. Capturas desktop1440×1000 e
mobile390×844 inspecionadas; campos/rótulos legíveis, painéis e readonly explícitos,
sem corte de conteúdo observado. Não foi auditoria completa de acessibilidade.

Todos os serviços próprios foram encerrados, ausência de listeners47841–47844 conferida.
Sem commit/push após o gate por instrução do root. A fonte produtiva não precisou de
correção nesta integração. Limites: identidades JWT emitidas localmente para QA e coorte
Auth inicial vazia; não prova login/refresh Auth, migração de coorte real ou deploy.
O fluxo visual editou modo; demais campos têm provas DOM/contrato específicas, sem
alegar cobertura nativa de todas as combinações. Tipos finais pós-merge3190 aguardam
janela; não extrapolar os tipos pré-merge para esta base.

## Fechamento pós-merge: tipos e Auth/coorte real (19/10/2026)

Tipos sobre a base conciliada3190: Core, Members, Kids, Admin e Gateway EXIT0/logs vazios
em final-3190-{core,members,kids,admin,gateway}-types-1.log. Member Shell inicialmente
EXIT2 apontou três fixtures desatualizadas, sem diagnóstico produtivo: courseId obrigatório,
level obrigatório e import do resolveStudioTier retirado de produção. O foco preservou
RED10pass/1fail/21asserts: a fixtureLLM chamava o export removido. Ajustes limitados aos três
testes: identidade de curso explícita, level:null para o teste genérico de delta, e tier de
preview Kids canônico no teste de textoLLM. Não reintroduz motor antigo, nem muda gates.
GREEN11/24, Biome3/0 (sem alterações) e Member Shell incremental EXIT0/log vazio em
final-3190-member-shell-types-2.log (~9,5s). Os outros cinco tipos não foram repetidos sem causa.

Para fechar o limite da primeira integração com coorte vazia, executou-se nova cadeia REAL:
Auth e Members com composições produtivas e DOIS bancos separados novos owned5434;
Gateway real; login/chaves/JWKS emitidos pelo próprio Auth; sessão de responsável e aluno
Kids reais. Nenhum JWT foi fabricado pelo runner nesta prova. O CLI produtivo
scripts/bootstrap-kids-journey.ts initialize/advance/publish capturou a coorte via endpoint
Auth S2S real e avançou o baseline; não houve seal manual nem INSERT de umaV1 pronta.

Fixture sintética: três perfis criados antes da migrationAuth0023 (Construtor ativo com
marcos históricos da primeira aventura, ativo semXP e arquivado semXP). A expansão manteve
os três ready. Uma matrícula Kids local com maxProfiles5 forneceu o allowance real do
cliente comum; não se usou passe de equipe para criar o novo perfil.

Gate final auth-cohort-admission-chain-r3.log: EXIT0, sete cenários / 45 checks, ~6,6s.
Bancos kids_journey_auth_chain_20261019_r3 e kids_journey_auth_members_chain_20261019_r3.

- EnquantoV0/initializing, sessão de aluno emitida pelo Auth recebeu503 na leitura pública
  de gamificação, sem level/view fabricados. É recusa explícita, não regressão para Faísca.
- CLI capturou e processou os três owners, incluindo semXP/arquivado. Antes da exposição,
  inspeção SQL readonly conferiu o baseline materializado e a versão ainda0.
- V0→V1 preservou o Construtor: coder; studio+pinta; entry das duas primeiras etapas,
  expanded das mesmas duas, reward das sete. São os direitos verdadeiros entre21 possíveis,
  não uma concessão de todos21. O esperado foi derivado da entrada com1 posição concluída+
  publicada, rankcoder e regra conhecida de base ausente: a próxima etapa expande ao entrar;
  reward futuro sem base mantém o quirk legado e NÃO implica entrada. A leitura pública
  com sessãoKids real retornou a mesma earned/policyVersion1. Owners semXP ficaram sem
  novos postos, registrados para preservação futura; arquivado não foi reativado.
- Repetir publish no CLI respondeu already-published e não duplicou histórico; ator system.
- Com o lock de contaMembers retido por uma barreira QA, POST real de cliente criou perfil
  e job duráveis pending. Não havia earned/registroMembers ainda; obter grantKids foi negado.
  A grade parental conseguiu recuperar esse mesmo ID enquanto a chamada remota aguardava.
- Ao liberar a barreira, o initializer Auth→Members com credencial dedicada materializou
  owner/earned; o ACK permitiu Authready/jobcompleted. Só então foi emitida a sessãoKids,
  que leu a política persistidaV1 como novo aluno, sem ferramentas globais indevidas.
  Repetir o requestId retornou o mesmo perfil/job, sem consumir outro lugar no teto.

Negativos do runner preservados em paresDBnovos: r1 usava sql.json raw após serializer
Drizzle, corrigido para parâmetroJSONstring::jsonb; r2 tentava leitura normalreadSnapshot
emV0 e foi corretamente recusado por InitializingError. Apenas a inspeção interna do
baseline pré-publicação passou a SQLreadonly. Nenhuma guarda/fonte produtiva foi alterada.

Recibos: qa/auth-chain-result-kids_journey_auth_chain_20261019_r3.json e
qa/auth-chain-bootstrap-kids_journey_auth_chain_20261019_r3.log. ScriptQA SHA256
3887c6436e592bfa95537f7847aae73f2c88663ee5169a6bdb9609b6f116e2d1.
Todos serviços47841/47842/47845 encerrados; ausência de listeners conferida; host entregue
à próxima janelaHub. Não houve build/browser extra, DROP/FORCE, dados reais ou produção.

O gap Auth/coorte da primeira prova foi fechado localmente; os limites daquele recibo
continuam históricos. Permanecem fora do aceite local: deploy/buildstandalone, escala/coorte
representativa e ordem operacional emstaging/produção, auditoria completaa11y e combinações
nativas de todos os campos. Retenção terminal continua somente desenho. Incorporação na
base principal e ativação controlada pertencem ao root; nenhuma política foi ativada na
plataforma. Este fechamento não autoriza remover contratos Adult/JS/Python legítimos.
