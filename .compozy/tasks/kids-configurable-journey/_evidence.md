# Evidências e mapa de migração

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

`journeyLevelAtLeast` continua válido para comparar postos conquistados e desenhar a escada. Ele deixa de ser a fonte de autorização para capacidades configuráveis. `computeStudentLevel` continua sendo a régua pura do legado e um oráculo de paridade, não a resolução de toda política ativa.

## Compatibilidade que carrega significado

- `careerSlot`/`careerLock` e colunas `career_slot` permanecem como contratos existentes. Configurar os requisitos não renumera cursos nem muda a unicidade das posições.
- A contagem de aventuras prontas inclui extras e bônus; progresso para posto usa só requisitos da política. Publicar um bônus em etapa antiga pode tirar o ✓ do mapa de cursos; não tira o posto do perfil.
- Catálogo desconhecido é diferente de vazio; ausência do novo campo de rede durante deploy só pode cair no legado enquanto a política ativa for explicitamente legado.
- Autoria de aula usa paleta/extensões/ambiente próprios. Abrir uma ferramenta dentro de aula/oficina não concede a ferramenta livre globalmente.
- Pro pode abrir sem paleta; clássico com paleta vazia não abre. Não eliminar essa distinção durante a mudança.

## O que não foi provado

Não foram medidos número de perfis/marcos, legado sem snapshot, tempo de baseline ou custo de preview. Não foi consultada retenção real dos dados nem configuração de vacuum. Código de purge remove `xpEvents`; não foi encontrada aqui uma promessa de retenção permanente.

`schema.ts` define `xp_events.transactionId` como xid8 NOT NULL. A migration `0074_mission-reward-xp-snapshot.sql` usa `DEFAULT pg_current_xact_id() NOT NULL`, portanto o xid das linhas anteriores à migration não representa sua inserção original. O ranking usa visibilidade MVCC para páginas de uma consulta. Isso não basta para escolher replay pedagógico permanente: ainda exigiria prova SQL sobre fronteiras de versões, transações em voo, legado, atualização de snapshots, purge e custo acumulado.
