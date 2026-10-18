# Techspec — política própria de Jornada Kids

Status: proposta implementável para revisão, sem aprovação de implementação/ativação. A estratégia de baseline precisa das provas SQL de `_test-plan.md` antes de ser considerada correta.

## Arquitetura e alternativas

| Alternativa | Ganho | Limitação | Decisão proposta |
|---|---|---|---|
| Reutilizar Adult diretamente | Menos classes iniciais | Não representa slots legados, identidade/contadores, faixas Molda, trava de base e posto permanente; a regra adulta de IA conflita com Kids | Não escolher |
| Política Kids com adaptador legado e baseline materializado | Mantém semântica atual, permite requisitos/capacidades, custo de preservação limitado por lote | Precisa preparar a ativação e congelar eventos na política corrente | Recomendada; validar em SQL |
| Histórico MVCC + replay por perfil/revisão | Evita varredura antes de publicar | História de xid legada não é original; catálogo mutável, purge, revisões acumuladas e visibilidade exigem provas adicionais | Hipótese futura, sem dependência no MVP |

Fluxo:

```text
xp_events + snapshots + grants curriculares       política Kids versionada
                  │                                     │
                  └──────────► KidsJourneyService ◄──────┘
                                      │
                        projeção pura core/journey
                                      │
                    posto + capacidades + pendências
                                      │
        matrícula ───────────► acesso efetivo ◄──────── contexto de aula
                                      │
        Members / BFF / mapa / pais / Pensa / Molda / Mural / Estúdio

Admin: rascunho → preview sem escrita → baseline em lotes → CAS publicar + auditoria
```

O core descreve regra pura. Members lê/fixa fatos, autoriza e persiste. O BFF traduz capacidades para props dos editores e executa checagens atuais antes de operações. Nenhum pacote criativo precisa conhecer política, banco ou posto.

## Separação das três réguas

1. **Avanço pedagógico:** requisitos da política → posto conquistado. `complete` e `showcase` são marcos do ledger; showcase exige ambos.
2. **Capacidades globais:** política + concessões permanentes → ferramentas/modos/faixas que o perfil conquistou. Não derivar exclusivamente do posto, pois alguém pode ter uma capacidade preservada que a política atual moveu/removou.
3. **Currículo e contexto:** blocos por curso/grants, extensões derivadas, configuração da aula/oficina e ambiente JS/Python. Não alterar seus critérios por consequência implícita de (1) ou (2).

Acesso efetivo ainda cruza capacidade global com matrícula/posse, estado do produto, identidade e, quando cabível, paleta. Perfil `god` não equivale a comprar Pro/IA; equipe continua com bypass explícito que nunca vira grant do aluno.

## Contrato proposto do core

Novos arquivos em `packages/core/src/journey/`: `kids-policy.ts`, `kids-projection.ts`, `kids-validation.ts`. Exportar pelo `index.ts` existente. Nomes abaixo são contratos propostos, não APIs já presentes.

```ts
type KidsMilestone = 'complete' | 'showcase'
type KidsRequirement =
  | { kind: 'slot'; tier: JourneyCourseTier; slot: number; milestone: KidsMilestone }
  | { kind: 'course'; courseId: string; milestone: KidsMilestone }
type KidsCreatorCapability =
  | 'studio' | 'pinta' | 'bridge' | 'pro' | 'ai' | 'pensa'
  | 'molda' | 'molda-intermediate' | 'molda-professional'
interface KidsJourneyStep {
  level: Exclude<JourneyLevelSlug, 'noob'>
  requirements: readonly KidsRequirement[]
  capabilities: readonly KidsCreatorCapability[]
}
type KidsJourneyPolicy =
  | { schemaVersion: 1; mode: 'legacy' }
  | { schemaVersion: 1; mode: 'paused' }
  | { schemaVersion: 1; mode: 'configured'; steps: readonly KidsJourneyStep[] }
interface KidsCourseMilestone {
  courseId: string
  completed: boolean
  showcased: boolean
  qualifiedTier: JourneyCourseTier | null
  qualifiedSlot: number | null
}
interface KidsJourneyEarned {
  level: JourneyLevelSlug
  capabilities: readonly KidsCreatorCapability[]
}
```

Entradas mínimas dos projetores (complementar os views de saída com os campos descritos nesta spec, sem segundo formato de milestones):

```ts
interface KidsJourneyCourseFact {
  id: string
  audience: 'kids' | 'adult'
  modality: 'recorded' | 'live'
  status: 'draft' | 'published' | 'archived'
  tier: JourneyCourseTier | null
  slot: number | null
  journeyRole: 'positioned' | 'reward' | 'extra'
  hasShowcaseBlock: boolean | null
}
interface KidsJourneyProjectionInput {
  policy: KidsJourneyPolicy
  policyVersion: number
  milestones: readonly KidsCourseMilestone[]
  earned: KidsJourneyEarned
  catalog: readonly KidsJourneyCourseFact[] | null
}
interface KidsJourneyReadinessInput {
  policy: KidsJourneyPolicy
  catalog: readonly KidsJourneyCourseFact[] | null
}
interface KidsJourneyComparisonInput extends KidsJourneyProjectionInput {
  proposedPolicy: KidsJourneyPolicy
}
interface KidsJourneyIssue {
  code: string
  level: JourneyLevelSlug | null
  requirementIndex: number | null
  severity: 'error' | 'warning' | 'unavailable'
  message: string
}
type KidsJourneyPolicyValidation =
  | { success: true; policy: KidsJourneyPolicy }
  | { success: false; issues: readonly KidsJourneyIssue[] }
interface KidsJourneyReadiness {
  status: 'ready' | 'incomplete' | 'unavailable'
  horizon: JourneyLevelSlug | null
  issues: readonly KidsJourneyIssue[]
}
```

`KidsJourneyImpact` contém versão base, alterações por avanço (`requirementsAdded/Removed/Changed`, `capabilitiesAdded/Removed`), readiness proposta e comparação opcional do perfil (`before/after/preservedCapabilities`, pendências curriculares/comerciais informadas por camada autorizada). Códigos de issue são um enum central durante implementação, não comparação de strings traduzidas. `KidsJourneyAdvanceView` contém `level`, `earned`, `available`, requisitos com estado e capacidades oferecidas. Esses dois views são somente saída; não aceitam concessões vindas do navegador.

`steps` configurados contém exatamente os sete avanços na ordem coder→god. Os oito postos continuam presentes: noob é entrada, não uma etapa artificial que exige zero cursos. O schema/runtime distingue `mode` explicitamente; pausa não é o mesmo que registro ausente.

`slot` é identidade pedagógica legada, não um alias de courseId. Dois marcos do mesmo curso qualificam um slot com a precedência atual de snapshots (showcase → complete → fallback vivo). Não combinar complete de um curso e showcase de outro que ocupou o mesmo slot. Cursos explícitos satisfazem somente seu próprio ID; a mesma matéria pode ser repetida em avanços posteriores sem apagar marcos.

O adaptador `legacyKidsJourneyPolicy()` deriva os requisitos incrementais de `CREATOR_JOURNEY_LEVELS`; não copia outra tabela manual. Default tem 49 requisitos de showcase distribuídos em 1+8×6. Recompensas incrementais derivam dos defaults atuais, incluindo faixas Molda. `computeStudentLevel` e `resolveJourneyCourseLock` permanecem como oráculos do comportamento legado.

Exportações públicas propostas:

```ts
legacyKidsJourneyPolicy(): KidsJourneyPolicy
projectKidsJourney(input: KidsJourneyProjectionInput): KidsJourneyView
validateKidsJourneyPolicy(input: unknown): KidsJourneyPolicyValidation
analyzeKidsJourneyReadiness(input: KidsJourneyReadinessInput): KidsJourneyReadiness
compareKidsJourney(input: KidsJourneyComparisonInput): KidsJourneyImpact
```

Tipos de entrada carregam política/versão, marcos, concessões e fatos mínimos de catálogo. Não recebem clients, banco ou callback de persistência. Schemas Zod estritos, UUIDs, listas sem repetição, limite de 200 requisitos por avanço, slots conforme `journeySlotsForTier`, capacidades enumeradas. Não introduzir Effect-TS: projeto usa TS/Zod/ports.

### Projeção

- Começar do maior posto materializado e das capacidades congeladas; em modo legado não materializado, partir da avaliação legada atual.
- Avaliar somente os avanços posteriores ao posto conquistado, em ordem; requisitos removidos de etapas vencidas não reabrem dívida. Array vazio de requisito custom é inválido, nunca avanço automático.
- Acrescentar capacidades que a política corrente oferece em postos já atingidos; isso permite liberalização sem forçar refazer cursos. Remoção futura não apaga grants já ganhos.
- Congelar posto e capacidade em campos distintos. O posto preservado não autoriza automaticamente uma ferramenta nova que não foi atribuída nem oferecida naquela política.
- Pausado conserva materializado e interrompe ganhos. Antes de pausar, baseline precisa preservar o estado da regra que está saindo.
- Não somar XP nem alterar moedas, badges, streak ou marcos durante projeção/reconciliação.

View aditiva proposta:

```ts
interface KidsJourneyView {
  audience: 'kids'
  policyVersion: number
  mode: 'legacy' | 'configured' | 'paused'
  earned: KidsJourneyEarned
  nextLevel: JourneyLevelSlug | null
  missing: readonly KidsRequirement[]
  advances: readonly KidsJourneyAdvanceView[]
  readiness: KidsJourneyReadiness
}
```

`advances` informa requisitos satisfeito/pendente/indisponível, capacidade oferecida e se o avanço já foi conquistado. `readiness` pode ser desconhecida quando catálogo falha. Não mandar nomes de outros perfis nem política administrativa completa ao aluno.

`GamificationMeView` recebe `kidsJourney?` ao lado do `journey?` Adult. `level.slug/next` permanece coerente com Kids. `level.remaining` continua um espelho legado por etapa para clientes antigos, mas nenhuma UI custom pode inferir requisitos/capacidades dele; os novos consumidores usam `kidsJourney`. Não inventar contagens por slot para curso extra sem posição.

## Trava dos cursos e prontidão

Preservar organização fixa de `learningTier`, papéis e posições. Em modo legado delegar ao código atual. Custom usa posto efetivo para `future-tier`/`tier-reward` e resolve a base pelo marco configurado para a base no avanço daquela etapa; na ausência desse requisito mantém showcase legado. Mesmo projetor serve listagem e `CheckAccessService`.

Análise estrutural monta dependências entre avanço, curso e base. Exemplos:

- Exigir curso de etapa futura para chegar ao posto que abre essa etapa: ciclo, rejeitar.
- Exigir `reward` para completar a etapa que libera o próprio reward: ciclo, rejeitar.
- Exigir showcase sem uma vitrine alcançável em aula publicada: requisito indisponível; novo requisito assim não pode publicar como caminho pronto. Requisito legado sem curso/vitrine é diagnóstico herdado, não motivo para impedir editar a configuração atual.
- Base tem critério complete na política, mas o grant curricular pede showcase: avanço pode ocorrer, paleta ainda pendente; informar as duas razões.
- Requisito por courseId aponta a adulto/live/ID inexistente: rejeitar nova configuração. Se o curso saiu depois da publicação, manter histórico e marcos; mostrar necessidade de manutenção para quem não concluiu.
- Curso arquivado pode seguir acessível a matriculados conforme `isCourseAccessible`; não declarar globalmente pronto para novo aluno só por existir. Diferenciar disponibilidade do catálogo e acesso do perfil simulado.
- Dependências de capacidades: bridge→studio, pro→studio, pensa→ai, molda-intermediate→molda, molda-professional→molda-intermediate. São validações cumulativas até o posto, não exigência de estarem no mesmo cartão. Reavaliar qualquer dependência adicional com evidência do consumidor.

Não prometer ausência de ciclos de todo o conteúdo didático. O primeiro validador cobre as travas de jornada/base/recompensa e a vitrine conhecida; objetivos, quizzes, conteúdo de runtime e permissão comercial são informados separadamente. Ambiente JS/Python precisa ser incorporado à prontidão a partir do contrato conciliado, sem inferência por nome do curso.

## Persistência, CAS e auditoria

Novas tabelas conceituais no schema `members` (migration aditiva gerada depois do checkpoint; não reservar número agora):

| Tabela | Dados e invariantes |
|---|---|
| `kids_journey_policy` | Uma linha `id='kids'`, versão ativa, JSON validado, data; ausência = legado v0. |
| `kids_journey_policy_revisions` | Versão única, política imutável, versão anterior, autor autenticado, data servidor, motivo de 1–500 caracteres, resumo do diff, baseline de origem. Sem UPDATE para restaurar revisão antiga. |
| `kids_journey_earned` | Por perfil Kids, conta proprietária conhecida, maior posto, capacidades permanentes, versão reconciliada e data. UPSERT monotônico; capacidades enumeradas sem entradas desconhecidas. Pode usar linhas de grant separadas se isso simplificar unicidade/auditoria real. |
| `kids_journey_preparations` | ID, expectedVersion, draftHash, catálogo/fallback capturado, cursor, upperBound, status preparing/ready/failed/stale, contagens e erro operacional sem PII desnecessária. Dados de trabalho expirados têm limpeza explícita. |

É aceitável armazenar grants separados por capacidade para unicidade e origem; o contrato exige maior posto e união monotônica, não uma obrigação de compactar tudo em JSON. Definir a forma final após revisar o padrão de migrations no checkpoint.

CAS compara a versão no UPDATE/INSERT, não read-then-write na aplicação. Primeiro registro v0→v1 usa INSERT on conflict do nothing. Publicação ativa+histórico+referência da preparação são uma transação. O cliente não envia autor/data/concessões. Sem histórico fictício para alterações anteriores à feature.

A ausência da linha ativa precisa da mesma proteção de concorrência: `SELECT ... FOR SHARE` em linha inexistente não bloqueia sua criação. A implementação deve usar um lock de política estável mesmo no v0 (advisory compartilhado/exclusivo por namespace), ou criar o registro sentinela legado v0 na migration e provar a transição das instâncias antigas. Recomendação inicial: lock advisory transacional de política também no v0, compartilhado pelos writers e exclusivo no publish, sem transação global aberta durante preparação. O caminho CAS continua necessário; lock não substitui expectedVersion.

Restaurar consiste em publicar cópia de uma política antiga como nova revisão, com CAS e baseline. Não apagar grants ou reduzir números de versão em rollback operacional.

## Preservação de quem ficou offline: baseline proposto

O estado atual só congela slots/blocos; não há uma tabela completa de posto/capacidades Kids. Portanto trocar requisitos e fazer freeze apenas no GET é insuficiente.

Preparação proposta, a provar com Postgres:

1. Iniciar sob a versão ativa V. Validar draft, guardar hash, fotografia dos fatos de curso usados como fallback legado e upperBound da coorte relevante. Coorte = perfis Kids com marcos ou estado de jornada já existente; perfis sem marco não tinham capacidades globais no default.
2. Processar páginas por chave estável (primeira implementação: até 50 perfis por chamada, default 20; medir antes de ajustar). Cada perfil é reconciliado pela política V, gravando somente o maior posto e a união das capacidades. Cursor avança atomicamente com o resultado, e repetição é idempotente. Não usar OFFSET em coleção mutável.
3. A política V continua ativa. Durante todo o processo, award de marco Kids e leitura autenticada de jornada reconciliam V sob a mesma disciplina de locks. Perfil novo que apareça abaixo do cursor é protegido pelo hook do próprio marco. Perfis elegíveis pela mera publicação de V, sem visita/award novo, entram na varredura antes de V sair.
4. Ao terminar, marcar ready. Publicar compara expectedVersion/draftHash, confere readiness/catalogHash novamente e só então ativa V+1 com histórico. Mudança incompatível do catálogo exige nova preparação; grants já materializados sob V permanecem válidos.
5. Crash antes de ready ou antes do CAS não troca a regra ativa. Repetir etapa não duplica XP nem grants. Publicações concorrentes deixam no máximo uma versão ativa; preparação antiga fica stale.

O hook de award deve ser instalado em todas as instâncias escritoras antes de permitir a primeira preparação custom. Precisa executar na MESMA transação do marco, inclusive replay do evento. Não transformar falha de freeze em rollback da aula fora do contrato atual de gamificação: o award continua fail-open para conclusão didática; o replay/reconciliação conserva a recuperação. Se o award inteiro falhou, não alegar que há um marco que não foi gravado.

Ordem de locks proposta para provar: conta/cerca → owner/gamification → política compartilhada (inclusive v0) → cursor da preparação, quando houver. A publicação adquire política exclusiva antes da preparação e não percorre contas nessa transação. Reservar uma chamada de processamento, se necessário, usa lease em transação curta; não manter o lock da preparação enquanto espera por conta/política. O processamento de baseline usa uma transação por perfil, evitando segurar locks de várias famílias durante um lote. Revisar callers de award e purge para não introduzir inversão; o código atual de award começa em `gamification:<userId>` e precisará acomodar a proteção da conta nas operações Kids pertinentes.

Jobs não concluem ignorando linhas com owner não resolvido. Auditoria local deve medir legados sem vínculo/snapshot; falha operacional permanece visível e impede publicar uma preparação que não provou preservação. Isso não afirma que tais linhas existam no banco real.

### Baseline versus MVCC

Baseline usa fatos materializados e não depende de reabrir snapshot antigo nem reavaliar todas as revisões por visita. Não precisa manter transação de banco aberta enquanto o operador edita. Possui custo proporcional à coorte por mudança; por isso paginação, progresso e medidas de staging são necessários.

MVCC com `transaction_id` pode ser explorado depois se for demonstravelmente mais simples. Antes disso provar: linhas pré-0074, transações começadas antes/commitadas depois do corte, vacuum/freeze, delete/purge, mudanças de fatos de curso, updates que alterem source snapshot, revisões intermediárias liberalizadas sem visita e custo de centenas de revisões. Não usar `created_at` como substituto: o próprio ranking documenta por que transação pode confirmar depois da data.

## Preview sem escrita

`KidsJourneyService.preview` lê política, marcos/concessões e catálogo; chama projetores puros. Não chamar `get` que congela estado. A projeção inclui um baseline virtual da regra ativa para que o preview do próximo draft preserve veteranos mesmo antes da preparação real.

Retorno: versão base, diff por avanço/capacidade, diagnósticos por requisito, pendências de currículo/produto distintas e, se solicitado, comparação de um perfil autorizado. Sem total de população estimado. Catálogo/profile indisponível é diagnóstico indisponível, nunca lista vazia.

## API e permissões propostas

| Endpoint | Papel/uso |
|---|---|
| `GET /members/journey/kids` | Perfil autenticado resolvido no servidor; visão própria. |
| `GET /members/admin/journey/kids` | Admin/superadmin; registro ativo + preparação vigente. |
| `POST /members/admin/journey/kids/preview` | Admin/superadmin; `{policy, expectedVersion, profileId?}`; sem escrita. Perfil opcional validado pelo escopo de administração existente. |
| `POST /members/admin/journey/kids/prepare` | Admin/superadmin; draft+versão+motivo; retorna ID/progresso, não ativa. |
| `POST /members/admin/journey/kids/prepare/:id/advance` | Admin/superadmin; um lote limitado, protegido contra concorrência/replay. |
| `PUT /members/admin/journey/kids` | Admin/superadmin; `{preparationId, expectedVersion, draftHash}`; ativa revisão pronta. |
| `GET /members/admin/journey/kids/history` | Admin/superadmin; paginado. |

BFF admin em `/api/members/journey/kids/...`, servidor via gateway. Criar regras de gateway específicas; os endpoints internos não ficam expostos como wildcard amplo. Members exige origem interna e RBAC, inclusive se o menu estiver escondido. Responder 409 para versão/preparação/catalogHash obsoletos, 400/422 para policy inválida conforme padrão vigente, 403 para permissão, 503 para dependência indisponível. Campos de política/autor/ownership não vêm de query arbitrária do aluno.

Preparação progride por chamadas limitadas do painel e retoma ao reabrir. Não exige novo worker de infraestrutura no primeiro escopo. Implementação deve limitar tempo de chamada e medir carga; se a coorte exigir um worker, isso é uma decisão de operação após evidência, não motivo para uma transação global bloqueante.

## Migração dos consumidores

| Responsabilidade | Mudança |
|---|---|
| `members/application/kids-journey/` e port/repo novos | `KidsJourneyService`: get/reconcile, getMany para batch, preview, prepare/advance/publish, history; repo fornece fatos e operações atômicas. |
| `GetGamificationService` | Para Kids usar resultado único de KidsJourneyService para level+kidsJourney. Adult continua no serviço Adult. |
| Público/avatar/pais/admin | Usar projeção batch do mesmo serviço; não rodar `computeStudentLevel` independente nem produzir N+1. Respeitar autorizações atuais antes de carregar fatos. |
| Listagem e `CheckAccessService` | Compartilhar resolução de trava usando política/posto/base milestone. Manter checagem de matrícula e modalidade. |
| Missões | Usar capacidades/acesso efetivo para elegibilidade de criação; não reembaralhar missões já atribuídas nem invalidar resgates concluídos. |
| Member-shell | Adicionar `kidsStudioTier(view, role, blocks)` no server de unlocks; inferir modos pelo view. Blocos→extensões continua server-only. Migrar gates de IA/Pensa/Pro e narração para capability resolvida. |
| Kids UI | Menu, locks, recompensas e horizonte recebem view; default pode usar adapters antigos verificados por paridade. Custom não deriva requisitos de `LEVEL_STUDY`/remaining fixo. |
| Pensa | Transportar KidsJourneyView/capacidades de cada participante no contrato interno e usar na montagem do contexto; bloco/extension/grants continuam individuais. |
| Molda | Converter capacidades/faixas em famílias. Faltando view, retornar estado indisponível; nunca `undefined` liberador por erro. |
| Mural/remix | Usar tier resolvido no clique e no selo, mantendo checagem autoritativa do snapshot. Jogar publicação existente não ganha novo requisito de curso. |
| Purge | Apagar estado/grants por perfil/conta, excluir baseline de perfil se materializado, manter cerca. Histórico administrativo não contém payload infantil; não ressuscitar por retry de preparação. |

### Presentation e deploy skew

Manter os oito slugs e assets. Para custom, gerar promessas de ferramentas pelos grants oferecidos por avanço, não por tabela fixa. Frases sobre “publicou seu primeiro jogo”, “dominou 3D” etc. só se sustentam se os requisitos realmente provam isso; caso contrário usar mensagem neutra. Nomes/arte podem permanecer.

Horizonte custom usa requisitos e disponibilidade conhecidos da política; não é automaticamente o maior tier com oito slots. Visão nunca esconde posto conquistado. Diferenciar contagem da trilha inteira e requisitos para próximo posto. Curso completo sem Mural pode estar pronto para avanço custom e pendente de paleta; mostrar a pendência específica sem mentir.

Implantar reader/backend primeiro, interfaces depois, ativação custom por último. Enquanto algum leitor não entende KidsJourneyView, manter modo legado. Ausência do campo novo não é permissão para aplicar fallback fixo após custom ativo: isso precisa virar indisponibilidade recuperável ou impedir ativação pelo rollout. Verificar shared member-shell consumido também por Adult para não regressar seu contrato.

## O que permanece em seu sistema

XP/moedas/streak/badges e calendário; bloco/extensão por curso; runtime e servidores de execução; autoria de aula/oficina; vagas ao vivo; matrícula e assinaturas; catálogo comercial; serviços criativos; política Adult. Não renomear campos career de rede/banco para implementar esta feature.

## Validação e implantação

Testes unitários de paridade/algoritmo, HTTP de RBAC/escopo/preview, SQL real de baseline/CAS/concorrência/purge e UI como descritos em `_test-plan.md`. Exigir `typecheck`, testes e Biome dos packages alterados antes de entrega; coordenar as execuções pesadas com a tarefa Python. Ativação depende de medir preparação/preview no conjunto representativo de staging e registrar resultados sem prometer escala não medida.
