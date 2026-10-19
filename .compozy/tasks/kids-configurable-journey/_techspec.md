# Techspec — política própria de Jornada Kids

Status em 19/10/2026: contrato, seed persistido, preservação, admissão Auth, composição, leitores/consumidores canônicos e editor Admin implementados no worktree isolado, com provas por lote em _evidence.md. Cleanup1 e Editor C têm tipos e review independentes encerrados. Base 3190d9e08 incorporada sem conflitos pelo merge local 0e20ea3bc; cadeia backend real (JWT RS256/JWKS → Gateway → Members → PostgreSQL) passou sete cenários / 43 asserções. Next/sessão/BFF real e Chrome/Edge passaram dez cenários / 42 checksQA com JWT local/coorte inicial vazia. Os seis pacotes passaram nos tipos pós-merge. Auth real/CLI/S2S com coorte não vazia e admissão pending→ready passaram sete cenários / 45 checks, incluindo Construtor e sessãoKids pública. Validação representativa em staging, incorporação principal e ativação controlada continuam pendentes. Retenção terminal segue apenas desenho. Nenhuma política custom foi ativada na plataforma; recibos antigos são históricos, não uma reivindicação de deploy.

## Arquitetura e alternativas

| Alternativa | Ganho | Limitação | Decisão proposta |
|---|---|---|---|
| Reutilizar Adult diretamente | Menos classes iniciais | Não representa slots legados, identidade/contadores, faixas Molda, trava de base e posto permanente; a regra adulta de IA conflita com Kids | Não escolher |
| Política Kids canônica com seed explícito e baseline materializado | Uma fonte persistida com comportamento inicial exato | Precisa bootstrap e captura antes de cada publicação | Escolhida pelo usuário; fluxo em revisão |
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
interface KidsJourneyPolicy {
  schemaVersion: 1
  mode: 'active' | 'paused'
  steps: readonly KidsJourneyStep[]
  tierAccess: readonly KidsTierAccess[]
}
interface KidsTierAccess {
  tier: JourneyCourseTier
  opensAt: JourneyLevelSlug
  completedAt: JourneyLevelSlug
  foundation: { slot: 1; milestone: KidsMilestone; whenMissing: 'open' | 'locked' }
}
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
  courseAccess: {
    entry: readonly JourneyCourseTier[]
    expanded: readonly JourneyCourseTier[]
    reward: readonly JourneyCourseTier[]
  }
}
```

Entradas mínimas dos projetores (complementar os views de saída com os campos descritos nesta spec, sem segundo formato de milestones):

```ts
interface KidsJourneyCourseFact {
  id: string
  graduationOnly: boolean // adaptador deriva de course.level === 'lenda'
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

`steps` contém exatamente os sete avanços coder→god; noob é entrada. `tierAccess` contém exatamente os sete tiers, sem repetição, com slugs válidos e opensAt ≤ completedAt. Esse contrato substitui legacy/configured/paused do protótipo ainda não implantado, sem tradutor ABI.

Pausa conserva steps e tierAccess completos. O comando deriva da configuração corrente no servidor e verifica igualdade/hash; não aceitar trocar gates disfarçadamente ao pausar. Não há regra vazia/aninhada nem algoritmo alternativo.

`slot` é identidade pedagógica legada, não um alias de courseId. Dois marcos do mesmo curso qualificam um slot com a precedência atual de snapshots (showcase → complete → fallback vivo). Não combinar complete de um curso e showcase de outro que ocupou o mesmo slot. Cursos explícitos satisfazem somente seu próprio ID; a mesma matéria pode ser repetida em avanços posteriores sem apagar marcos.

O seed explícito contém 49 requisitos de showcase em 1+8×6, capacidades e regras de acesso atuais. Gerar/conferir o artefato contra referência congelada do algoritmo Kids anterior. Runtime Kids normal não importa seed/fábrica/algoritmo antigo como fallback. Requisitos, rewards, thresholds e learning mapping Kids normais não vêm de `CREATOR_JOURNEY_LEVELS`; metadados estruturais de slug/ordem/tier/limites podem continuar em código. Remover caminhos Kids antigos depois da substituição completa, mantendo sua referência histórica nas provas. Helpers ainda usados pelo nível/contrato Adult permanecem nesse ramo, com regressão própria; não constituem um segundo autorizador Kids.

`opensAt` governa posições futuras. `completedAt` transforma posições em revisão e abre recompensas; antes disso, posições 2+ usam a fundação explícita. Reward sem base segue `whenMissing` mesmo em tier futuro, preservando exatamente o comportamento atual. Extra/live/formatura continuam sob autoridade do currículo/matrícula, sem gate novo de Lenda.

| Tier do seed | opensAt | completedAt | Fundação |
|---|---|---|---|
| primeiros-passos-2d | noob | coder | slot1/showcase, missing open |
| iniciante-2d | coder | hacker | slot1/showcase, missing open |
| iniciante-3d | hacker | explorer | slot1/showcase, missing open |
| intermediario-2d | explorer | elite | slot1/showcase, missing open |
| intermediario-3d | elite | architect | slot1/showcase, missing open |
| avancado-2d | architect | champion | slot1/showcase, missing open |
| avancado-3d | champion | god | slot1/showcase, missing open |

Não duplicar um learningTier hardcoded: apresentações derivam dos requisitos e dessas regras. Readiness usa o mesmo resolver e rejeita auto-bloqueio avanço/reward/base. Esse payload é a proposta final para review antes da implementação canônica.

Exportações públicas propostas:

```ts
projectKidsJourney(input: KidsJourneyProjectionInput): KidsJourneyView
validateKidsJourneyPolicy(input: unknown): KidsJourneyPolicyValidation
analyzeKidsJourneyReadiness(input: KidsJourneyReadinessInput): KidsJourneyReadiness
compareKidsJourney(input: KidsJourneyComparisonInput): KidsJourneyImpact
```

O resolver único exige catálogo conhecido; desconhecido não é base ausente. Remover delegação legacy e helpers que se tornem aliases sem valor no novo contrato. Consumidores não serão ligados ao protótipo intermediário antes dessa substituição.

Os 21 direitos pedagógicos limitados preservam gates editáveis sem congelar IDs de cursos: expanded implica entry; reward não implica entry (recompensa futura sem base é um quirk atual). Entry elegível exige posto≥opensAt; expanded exige posto≥completedAt ou entry+fundação satisfeita/ausente conhecida com whenMissing open; reward exige posto≥completedAt ou base ausente conhecida com whenMissing open. Acesso efetivo usa a união dos direitos persistidos e calculados, depois cruza currículo/contexto/matrícula. Antes de toda troca, congelar também esses direitos, não apenas posto/app capabilities. Assim V1 liberal→aluno offline→V2 restritiva não fecha aulas já liberadas pela política.

Pausa congela posto/app capabilities; direitos de curso seguem política retida+posto congelado e podem ampliar após conclusão real da base. Congelar esse acesso monotonicamente. Pausa não impede novato de estudar entrada nem promove posto com novos fatos.

Tipos de entrada carregam política/versão, marcos, concessões e fatos mínimos de catálogo. Não recebem clients, banco ou callback de persistência. Schemas Zod estritos, UUIDs, listas sem repetição, limite de 200 requisitos por avanço, slots conforme `journeySlotsForTier`, capacidades enumeradas. Não introduzir Effect-TS: projeto usa TS/Zod/ports.

### Projeção

- Começar do maior posto materializado e das capacidades congeladas; regras sempre vêm do JSON canônico persistido, inclusive no baseline inicial com seed.
- Avaliar somente os avanços posteriores ao posto conquistado, em ordem; requisitos removidos de etapas vencidas não reabrem dívida. Array vazio de requisito custom é inválido, nunca avanço automático.
- Acrescentar capacidades que a política corrente oferece em postos já atingidos; isso permite liberalização sem forçar refazer cursos. Remoção futura não apaga grants já ganhos.
- Congelar posto e capacidade em campos distintos. O posto preservado não autoriza automaticamente uma ferramenta nova que não foi atribuída nem oferecida naquela política.
- Pausado conserva materializado e congela novos postos/app capabilities, inclusive capacidades oferecidas a postos antigos ainda não congeladas. Direitos de aula podem expandir por conclusão real da base sob posto congelado. Antes de pausar, baseline preserva regra de saída. Avanços/requisitos ficam retidos; não conquistados têm available:false.
- Não somar XP nem alterar moedas, badges, streak ou marcos durante projeção/reconciliação.

View aditiva proposta:

```ts
interface KidsJourneyView {
  audience: 'kids'
  policyVersion: number
  mode: 'active' | 'paused'
  tierAccess: readonly KidsTierAccess[] // cópia da mesma versão publicada; somente leitura
  earned: KidsJourneyEarned
  nextLevel: JourneyLevelSlug | null
  missing: readonly KidsRequirement[]
  advances: readonly KidsJourneyAdvanceView[]
  readiness: KidsJourneyReadiness
}
```

`advances` informa requisitos satisfeito/pendente/indisponível, capacidade oferecida e se o avanço já foi conquistado. `readiness` pode ser desconhecida quando catálogo falha. Não mandar nomes de outros perfis nem política administrativa completa ao aluno.

O diff de requisitos/capacidades de uma pausa pura fica vazio porque a regra foi retida. A UI deve comparar também `before.mode`/`after.mode` e apresentar a transição para pausado; `changes.length === 0` sozinho não significa que a configuração é idêntica.

O payload Kids exige sua view `kidsJourney`; o namespace `journey` Adult permanece separado. `level.slug/next` pode ser apresentação derivada da mesma projeção, sem espelho de remaining calculado pelo algoritmo antigo. Migrar consumidores juntos: view ausente é indisponível, não autorização por posto fixo. Não inventar ABI/contagens por slot para curso extra.

## Trava dos cursos e prontidão

Preservar papéis/posições. O único resolver recebe policy.tierAccess, posto efetivo e catálogo para future-tier/tier-reward/foundation-first. Não usa learningTier/thresholds do catálogo antigo nem inventa showcase se a base foi omitida do avanço. O marco da base está explícito no payload. Mesmo resolver serve listagem, readiness e `CheckAccessService`.

Análise estrutural monta dependências entre avanço, curso e base. Exemplos:

- Exigir curso de etapa futura para chegar ao posto que abre essa etapa: ciclo, rejeitar.
- Exigir `reward` para completar a etapa que libera o próprio reward: ciclo, rejeitar.
- Exigir showcase sem uma vitrine alcançável em aula publicada: requisito indisponível; novo requisito assim não pode publicar como caminho pronto. Requisito legado sem curso/vitrine é diagnóstico herdado, não motivo para impedir editar a configuração atual.
- Base tem critério complete na política, mas o grant curricular pede showcase: avanço pode ocorrer, paleta ainda pendente; informar as duas razões.
- Requisito por courseId aponta a adulto/live/ID inexistente: rejeitar nova configuração. Se o curso saiu depois da publicação, manter histórico e marcos; mostrar necessidade de manutenção para quem não concluiu.
- Curso arquivado pode seguir acessível a matriculados conforme `isCourseAccessible`; não declarar globalmente pronto para novo aluno só por existir. Diferenciar disponibilidade do catálogo e acesso do perfil simulado.
- Dependências de capacidades: bridge→studio, pro→studio, pensa→ai, molda-intermediate→molda, molda-professional→molda-intermediate. São validações cumulativas até o posto, não exigência de estarem no mesmo cartão. Reavaliar qualquer dependência adicional com evidência do consumidor.

Não prometer ausência de ciclos de todo o conteúdo didático. O primeiro validador cobre as travas de jornada/base/recompensa e a vitrine conhecida; objetivos, quizzes, conteúdo de runtime e permissão comercial são informados separadamente. Ambiente JS/Python precisa ser incorporado à prontidão a partir do contrato conciliado, sem inferência por nome do curso.

`graduationOnly` preserva a informação perdida por `tier: null`: o adaptador de catálogo deriva esse booleano de `course.level === 'lenda'`. Readiness rejeita conteúdo de formatura como requisito de avanço, inclusive para chegar ao topo onde esse conteúdo é oferecido. Curso normal fora da escada (`tier: null`, `graduationOnly: false`) continua distinto e pode ser requisito explícito alcançável. Isso é validação de autoria/readiness; não introduz novo gate de acesso ao curso `lenda` (o acesso direto continua pela matrícula).

## Persistência, CAS e auditoria

Novas tabelas conceituais no schema `members` (migration aditiva gerada depois do checkpoint; não reservar número agora):

| Tabela | Dados e invariantes |
|---|---|
| `kids_journey_policy` | Uma regra canônica persistida, fase/versão e data. Proposta: initializing V0 explícita e published V>=1, com CHECK coerente. Ausência não é configuração. |
| `kids_journey_revisions` | Versão única, política imutável, versão anterior, autor autenticado, data servidor, motivo de 1–500 caracteres, hashes e preparação de origem. Diff é derivado dos JSONs das políticas, sem segunda cópia divergente. Sem UPDATE para restaurar revisão antiga. |
| `kids_journey_earned` | Por perfil Kids admitido, inclusive noob sem XP, conta proprietária imutável, maior posto, nove capacidades e 21 direitos de curso, versão reconciliada/data. UPSERT monotônico; listas enumeradas sem entradas desconhecidas. |
| `kids_journey_preparations` | ID, expectedVersion, sourcePolicy, candidatePolicy, draftHash/catalogHash/cohortHash, catálogo capturado, cursores/bounds e fases capturing/preparing/ready/stale/published. Captura auth→members→hashing→done é retomável. Owner irresolvido interrompe captura sem avançar. Retention operacional pertence ao serviço. |
| `kids_journey_preparation_owners` | Pares mínimos preparationId/profileId/accountId, PK por preparação/perfil; owner divergente é erro. Purge remove referências por perfil/conta. Não incluir nome/email/data infantil no histórico administrativo. |

É aceitável armazenar grants separados por capacidade para unicidade e origem; o contrato exige maior posto e união monotônica, não uma obrigação de compactar tudo em JSON. Definir a forma final após revisar o padrão de migrations no checkpoint.

Captura concreta é bounded: append Auth até200 por chamada, TX individual por owner com fence/lock; cópia Members uma identidade por TX com cursor/CAS, hashing até50 pares por TX e hash encadeado de páginas, depois baseline uma identidade por TX. Seal apenas muda etapa/limite, não executa INSERT SELECT nem aggregate de toda a coorte. CoorteHash identifica a captura efetivamente processada, sem prometer snapshot MVCC Auth/Member simultâneo; exclusões verificadas/fenced podem remover linhas de trabalho. Inicialização de perfil/award protegem novos IDs fora do corte. Publicação recorrente captura todos earned, não depende de gamification/visita. CatálogoHash continua uma fotografia real do catálogo usado pela avaliação.

CAS compara fase/versão no UPDATE/INSERT. Init idempotente não sobrescreve edição/histórico existentes. Publicação+histórico+preparação real são uma transação. Bootstrap usa actorKind system/actorId null; operação humana usa actorKind user/UUID autenticado. Não fabricar conta humana ou preparação vazia. Ajustar schema/port intermediários sem ABI do protótipo não implantado.

A inicialização usa o namespace advisory estável: ausência de linha não é protegida por FOR SHARE. V0 é provisionamento com JSON completo, não sentinela de algoritmo legado. Hook usa essa configuração persistida na mesma transação do marco; publish exclusivo antes da preparação. Sem transação global longa, preservando CAS.

### Bootstrap canônico — em revisão

Persistir seed completo como initializing V0; preparar baseline real com o mesmo avaliador; hook protege perfis/commits novos; revalidar hashes, fence e CAS e publicar V1 com revisão seed/system. Só então expor a primeira política publicada. Antes do provisionamento, operações dependentes ficam indisponíveis; depois dele, ausência com histórico é invariante, nunca reseed/reset. Init repetido não altera política editada. Capturar catálogo/coorte e hashes.

Catálogo incompleto não apaga slots futuros nem impede seed estruturalmente válido que reproduz o produto atual. Readiness distingue pendências herdadas de novo ciclo inválido; falha de leitura não vira catálogo vazio. Preservar checkpoint/backup T2, rebase remoto e regenerar a 0136 ainda não publicada com snapshot/journal coerentes, sem traduzir JSON antigo de teste. A regeneração local deve ser comprovada em banco QA próprio novo, com guard de prefixo/loopback; o harness atual não permite DROP/FORCE nem clientes alheios. Não reescrever migrations já publicadas.

Restaurar consiste em publicar cópia de uma política antiga como nova revisão, com CAS e baseline. Não apagar grants ou reduzir números de versão em rollback operacional.

## Preservação de quem ficou offline: baseline proposto

O estado atual só congela slots/blocos; não há uma tabela completa de posto/capacidades Kids. Portanto trocar requisitos e fazer freeze apenas no GET é insuficiente.

Preparação proposta, a provar com Postgres:

1. Iniciar sob a versão ativa V. Validar draft, guardar hash, fotografia do catálogo e upperBound da coorte completa. Bootstrap captura Auth id/owner de TODOS os perfis, inclusive sem XP/arquivados, mais históricos Members comprovados. Depois da admissão universal descrita abaixo, a coorte recorrente é TODOS os registros earned, inclusive noob/listas vazias; não presumir gamification universal.
2. Processar páginas por chave estável (primeira implementação: até 50 perfis por chamada, default 20; medir antes de ajustar). Cada perfil é reconciliado pela política V, gravando maior posto e união de capacidades/21 direitos de curso. Cursor avança atomicamente com o resultado; repetição é idempotente. Não usar OFFSET em coleção mutável.
3. A política V continua ativa. Award/reconciliação congelam V sob a mesma disciplina de locks. Perfil novo só fica visível após initialize Members persistir earned sob política corrente; isso protege IDs abaixo/fora do cursor mesmo sem marco. Perfis elegíveis pela mera publicação de V entram na varredura antes de V sair.
4. Ao terminar, marcar ready. Publicar compara expectedVersion/draftHash, confere readiness/catalogHash novamente e só então ativa V+1 com histórico. Mudança incompatível do catálogo exige nova preparação; grants já materializados sob V permanecem válidos.
5. Crash antes de ready ou antes do CAS não troca a regra ativa. Repetir etapa não duplica XP nem grants. Publicações concorrentes deixam no máximo uma versão ativa; preparação antiga fica stale.

O hook de award deve ser instalado em todas as instâncias escritoras antes de permitir a primeira preparação custom. Precisa executar na MESMA transação do marco, inclusive replay do evento. Não transformar falha de freeze em rollback da aula fora do contrato atual de gamificação: o award continua fail-open para conclusão didática; o replay/reconciliação conserva a recuperação. Se o award inteiro falhou, não alegar que há um marco que não foi gravado.

Ordem de locks proposta para provar: conta/cerca → owner/gamification → política compartilhada (inclusive v0) → cursor da preparação, quando houver. A publicação final usa TX READ COMMITTED e, como primeira operação, LOCK TABLE SHARE NOWAIT em courses/lessons/lesson_blocks; depois adquire política exclusiva e preparação, sem percorrer contas. Hash, CAS e commit usam a mesma conexão. Conflito55P03 aborta e libera a TX antes de devolver erro compreensível ao autor, sem retry automático nem mudança de estado. O catálogo fica coerente no instante do commit; alterações posteriores continuam legítimas. Preview permanece RR read-only separado. Reservar uma chamada de processamento, se necessário, usa lease em transação curta; não manter o lock da preparação enquanto espera por conta/política. O processamento de baseline usa uma transação por perfil, evitando segurar locks de várias famílias durante um lote. Revisar callers de award e purge para não introduzir inversão; o código atual de award começa em `gamification:<userId>` e precisará acomodar a proteção da conta nas operações Kids pertinentes.

Jobs não concluem ignorando linhas com owner não resolvido. Auditoria local deve medir legados sem vínculo/snapshot; falha operacional permanece visível e impede publicar uma preparação que não provou preservação. Isso não afirma que tais linhas existam no banco real.

### Admissão Auth sem lock entre databases

Estado separado `admissionState: pending|ready` preserva `status:active|archived`. Novos perfis nascem pending durável e contam no teto. Create com requestId estável tem unicidade por conta e retorna/reutiliza o mesmo ID no retry; não cria outro irmão. A grade parental pode mostrar preparando/repetir/cancelar, sem seleção. Nenhuma sessão/perfil público/estudo delegado/impersonação aceita pending.

Após commit Auth, S2S específico Auth→Members initialize recebe owner capturado pelo Auth autorizado, persiste earned mesmo noob/[] sob lock account/fence→owner→policy e retorna recibo. Não ampliar ownership geral para pending, nem fazer RPC Auth dentro da TX Members. Após ACK, Auth CAS pending→ready sob seu lock local profile:<account>, compartilhado com createWithinLimit e prepareDeletion, revalidando conta ativa e perfil active/pending/mesmo owner. Não exige repetir CAS da versão de política: conquista já está persistida e incluída na coorte.

Pending é trabalho durável: mesmo ID/requestId, nextAttemptAt/attempts/leaseUntil, retry com limites e sweeper efetivamente agendado/observável. Falha de rede não remove perfil nem gera outra cobrança (criação atual apenas consulta allowance). Crash após Members commit repete initialize idempotente e une direitos atuais. Arquivamento cancela visibilidade; ready não revive arquivado. prepareDeletion bloqueia conta sob lock Auth antes de Members purge; ACK tardio não ativa conta bloqueada, initializer depois da purge é negado por fence.

Auth proíbe índices novos em tabelas ativas nas migrations transacionais desde0018. Portanto estado uniforme fica em profiles, mas idempotência/retry vivem em nova tabela profile_admissions (PK profileId/FKcascade, unique accountId+requestId, requestHash, attempts/lease/nextAttempt). Perfil pending+trabalho entram na MESMA TX Auth; antigos ready não necessitam trabalho. Índices pertencem à tabela nova, sem CREATE INDEX em profiles. Schema gerado expande admissionState com DEFAULT ready para atuais, depois outra migration gerada altera DEFAULT pending para inserts futuros; criadores novos explicitam pending. Não editar SQL gerado nem tornar antigos pending em massa. CAS ready também revalida conta com bloqueio da linha users, perfil active/pending e trabalho da mesma conta; nenhuma chamada de rede mantém TX aberta.

Purge Members remove earned e pares de preparação. Cursor/bounds remanescentes são identificadores residuais de trabalho, não dados anônimos: manter continuidade da varredura e executar retention terminal com prazo explícito em T3. Não zerar bounds ativos e pular sobreviventes. Se surgir requisito de remoção imediata integral, marcar preparação afetada stale antes de limpar watermarks e exigir nova captura, preservando grants.

Rollout inicial suspende criação/import/backfill e retira instâncias Auth antigas de create. Provisionar seedV0 e capturar pares existentes antes de habilitar somente criadores pending. Perfis antigos active/archived permanecem ready: não mudar todos para pending. Baseline completo precede V1/exposição do novo modelo. Captura usa keyset UUID/upperBound e pares owner imutáveis, copiados/hash na preparação; exclusão precisa receipt/fence, não skip silencioso. Não há lock PG compartilhado Auth/Members nem 2PC.

Inventário obrigatório: CreateProfileService/profile.repository; backfill-default-profiles SQL direto; select-profile/refresh/change-impersonation-mode/study-access/get-own-profile/get-public-profile/update-profile; listas active/batch/search/admin/internal ownership/recipients e emissores de token/browser/desktop. RegisterService cria somente conta/tokens; não foi encontrado import/restore produtivo de perfil (restore do aggregate hidrata registro). Se surgir novo criador/restauração, usar mesma admissão. Worker Auth agendado processa até20 jobs, um por vez, com lease/nextAttempt persistidos e drain no shutdown; sua implementação e testes focados estão em WIP, sem rollout. Backfill foi migrado para o mesmo CreateProfileService/idempotência; não foi executado.

### Retomada da coorte Auth

`authCapture:null` significa captura autoritativa ainda desconhecida; `{upperBound:null,cursor:null}` significa coorte conhecida vazia. A migration0137 adiciona esse envelope à preparação sem alterar0136. Cada página Auth possui limite200; a orquestração Members solicita no máximo20 owners por avanço. Cada owner é copiado junto com CAS do cursor em sua própria transação, sob fence/owner→policy→preparation. Interrupção no meio da página retoma do último cursor persistido com o mesmo preparationId. Seal exige o cursor exato confirmado como done pelo Auth; falha HTTP/configuração nunca vira coorte vazia.

A rota interna Auth exige credencial S2S e inclui todos os perfis, inclusive archived/pending, conta bloqueada e sem XP. O limite UUID é de trabalho, não um snapshot MVCC entre chamadas. IDs novos aleatórios abaixo do cursor ou acima do upperBound são cobertos pela admissão universal: permanecem pending e sem seleção até existir o registro Members/earned; após isso a publicação recorrente os inclui ou initialize congela a versão vigente sob o mesmo lock de política. Esse argumento exige retirar os criadores antigos antes de iniciar a captura, conforme rollout acima.

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
| `GetGamificationService` | Para Kids usar resultado único de KidsJourneyService para level+kidsJourney. Adult preserva o nível atual e o campo independente AdultJourney; não remover o helper compartilhado enquanto esse ramo o consumir. |
| Público/avatar/pais/admin | Usar projeção batch do mesmo serviço; não rodar `computeStudentLevel` independente nem produzir N+1. Respeitar autorizações atuais antes de carregar fatos. |
| Listagem e `CheckAccessService` | Compartilhar resolução de trava usando política/posto/base milestone. Manter checagem de matrícula e modalidade. |
| Missões | Usar capacidades/acesso efetivo para elegibilidade de criação; não reembaralhar missões já atribuídas nem invalidar resgates concluídos. |
| Member-shell | Adicionar `kidsStudioTier(view, blocks)` no server de unlocks; inferir modos pelo view. Blocos→extensões continua server-only. Migrar gates de IA/Pensa/Pro e narração para capability resolvida. |
| Kids UI | Menu, locks, recompensas e horizonte recebem a mesma view canônica. Não usar adapters antigos nem derivar requisitos de `LEVEL_STUDY`/remaining fixo. |
| Pensa | Transportar KidsJourneyView/capacidades de cada participante no contrato interno e usar na montagem do contexto; bloco/extension/grants continuam individuais. |
| Molda | Converter capacidades/faixas em famílias. Faltando view, retornar estado indisponível; nunca `undefined` liberador por erro. |
| Mural/remix | Usar tier resolvido no clique e no selo, mantendo checagem autoritativa do snapshot. Jogar publicação existente não ganha novo requisito de curso. |
| Purge | Apagar estado/grants por perfil/conta, excluir baseline de perfil se materializado, manter cerca. Histórico administrativo não contém payload infantil; não ressuscitar por retry de preparação. |

### Presentation e deploy skew

Manter os oito slugs e assets. Para custom, gerar promessas de ferramentas pelos grants oferecidos por avanço, não por tabela fixa. Frases sobre “publicou seu primeiro jogo”, “dominou 3D” etc. só se sustentam se os requisitos realmente provam isso; caso contrário usar mensagem neutra. Nomes/arte podem permanecer.

Horizonte custom usa requisitos e disponibilidade conhecidos da política; não é automaticamente o maior tier com oito slots. Visão nunca esconde posto conquistado. Diferenciar contagem da trilha inteira e requisitos para próximo posto. Curso completo sem Mural pode estar pronto para avanço custom e pendente de paleta; mostrar a pendência específica sem mentir.

Finalizar todos os consumidores sobre o mesmo modelo antes de liberar em staging/produção. Provisionar schema/hooks/seed antes da exposição não cria modo legado permanente. Campo ausente/indisponível não permite voltar a thresholds fixos. Preservar contratos compartilhados Adult e JS/Python.

## O que permanece em seu sistema

XP/moedas/streak/badges; snapshots/blocos/extensões por curso; runtime/catalog e execução; projetos JSv2; autoria/aulas/oficinas; vagas ao vivo; matrícula/assinaturas; namespaces/ownership; política Adult e histórico de migrations. Cleanup é somente da jornada Kids substituída. Não remover outros contratos por se chamarem legacy nem renomear campos career.

## Validação e implantação

Testes unitários de paridade/algoritmo, HTTP de RBAC/escopo/preview, SQL real de baseline/CAS/concorrência/purge e UI como descritos em `_test-plan.md`. Exigir `typecheck`, testes e Biome dos packages alterados antes de entrega; coordenar as execuções pesadas com a tarefa Python. Ativação depende de medir preparação/preview no conjunto representativo de staging e registrar resultados sem prometer escala não medida.


## Operação inicial e superfície Admin em implementação

O comando `journey:bootstrap` é explícito e separado do startup/GET: `initialize` provisionaV0
idempotente e devolve preparationId; `advance --preparation <uuid> --steps <1..20>` realiza somente
passos limitados e retoma os cursores persistidos; `publish` exige ready/expectedVersion0 e actor system.
A publicação por Admin recusa preparações de bootstrap. O CLI exige `--confirm-rollout-order`,
um reconhecimento operacional da ordem de retirada dos criadores antigos e instalação do hook;
ele não alega detectar remotamente todas as instâncias Auth. O CLI ainda não foi executado; as provas SQL usam somente bancos QA owned.

A rota Admin projetada exige token interno configurado, conta ativa e papel administrativo. Staff pode
ler/visualizar preview, mas mutações globais exigem admin/superadmin sem sessão de perfil, contextoKids
ou impersonação. ActorId vem da identidade confiável, nunca do body. Preview expõe simulação de novo
aluno e amostra explicitamente rotulada de até20 perfis; não afirma ser contagem da coorte inteira,
não grava earned/preparação e mostra before/after.mode mesmo que changes esteja vazio. Criar preparação
registra motivo; avançar faz até20 operações CAS individuais por chamada. Rotas e UI ainda não montadas:
o hook/transações e consumers precisam ser qualificados antes da exposição.


### Prévia própria de equipe

Staff/admin/superadmin já possuem acesso pleno pedagógico aos editores; isso foi verificado em
FreeStudioAccessService, resolveStudioTier, creative-apps-access, Pensa, Molda e Zappy. O endpoint
separado `GET /members/journey/kids/staff-preview` reutiliza isPrivilegedActor e exige tokenS2S,
statusactive e conta própria, sem profile/accountheader, student, impersonação ou suporte.
Contexto parent sem perfil é permitido somente para equipe ativa; não concede privilégio por si.
Retorno tem kind, policyVersion/mode, tierAccess da mesma configuração, capacidades existentes e readiness, sem level/earned/progresso.
Política persistida published é obrigatória; initializing/ausência/corrupção são indisponibilidade.
Não é chamado por get/getMany de crianças, award ou freeze; suas negativas foram cobertas nos24units.
Rotas/callers de equipe ainda precisam ser montados/migrados antes da integração.


### P6B — agrupamento e identidade do curso na apresentação

CatalogCourseView/MyCourseView transportam courseId canônico, além do slug de navegação.
A view da criança e a prévia própria autorizada transportam os sete tierAccess da MESMA
versão publicada. Não é um editor nem fonte paralela: o DTO é cópia readonly das regras da
policy persistida. O schema compartilhado valida as sete etapas, unicidade e ordem dos gates;
ausência/malformação é indisponibilidade, nunca seed automática.

Agrupamento e breadcrumb usam opensAt; vários tiers podem aparecer na mesma trilha.
Os limites estruturais de posições permanecem 1+6×8. Graduação lenda continua metadata
curricular fora dos requisitos; não cria gate novo. Contadores de aventura são marcos
curriculares separados do requisito complete/showcase do avanço.

O mapa conserva identidades conquistadas e seu check. Um curso com hasAccess e careerLock
aberto pode tornar a trilha futura navegável, inclusive acima do horizonte, sem marcar o
posto futuro conquistado. A página calcula somente os oito destinos acessíveis no servidor;
não envia todo o catálogo ao mapa cliente para reavaliar gates. Policy indisponível exibe
estado explícito; prévia de equipe é separada, sem rank/progresso fictício. Course breadcrumb
pode voltar ao mapa quando a policy está indisponível, sem inventar Faísca.

LEVEL_TIER/LEVEL_STUDY, horizonte calculado pelo catálogo da UI e copy fixa de recompensas
saíram destes caminhos produtivos. Referência anterior vive apenas em tests/fixtures.
Celebrações por banda Molda ainda são lote separado; não considerar cleanup integral concluído.

### D2 — identidade avaliada e consumidores qualificados

Cada requirement da projeção de avanço transporta resolvedCourseId:string|null readonly,
resolvido usando a mesma captura de catálogo do avaliador. Preenchimento apenas para candidato
único; catálogo indisponível, curso ausente ou seleção ambígua devolvem null. A UI não resolve
slots novamente a partir de outro RPC. satisfied histórico permanece satisfeito com null:
identidade indisponível não cria dívida nem retira posto/direito. Requisito por curso explícito
fora da escada precisa poder aparecer como aventura necessária, ligado por ID canônico e
respeitando matrícula/careerLock; não se infere conclusão/publicação do catálogo da tela.

D2 permanece separado de D1: RED de slot único, course explícito, ambiguidade e histórico
precedeu a alteração do DTO; a prova de consumidor sem tier e alias precedeu a mudança de UI.
Política, currículo e licença continuam autoridades distintas. Trata-se de projeção de leitura,
não de persistir nova regra nem congelar IDs atuais no seed.

O matcher da readiness também resolve a identidade; curso não elegível/publicado não vira ação.
O contador agrupa por identidade somente na apresentação, preservando marcos/estados do DTO.
CatalogPage une IDs com a lista atual de cursos e oferece uma seção suplementar para requisitos
fora da trilha, reutilizando os gates de matrícula/careerLock do cartão. Pausa e preview da
equipe não mostram tarefas de promoção. Core68/2833 e UI70/225 passaram; Core/Members/Kids tipos0.




## Editor Admin C — contrato de apresentação implementado

O cliente valida DTO web com policy Core; datas permanecem ISO string. Exige permissions.canEdit
booleana do servidor e não deriva permissão de papel isolado/getSession. Initializing(version0)
não habilita formulário nem bootstrap; published exige versão positiva/policy válida. Não importa
seed no funcionamento normal. Sete avanços e sete regras tierAccess são editados separadamente;
ordem/nomes/limites estruturais ficam fixos. Erros de dependências e de percurso ficam explícitos.

Cada edição invalida a comparação. Preview é somente backend, exibe transição de modo mesmo
sem diffs de requisitos, e marca novo aluno como simulação. Error/unavailable do percurso impede
preparar; warnings de catálogo futuro não viram bloqueio genérico. Motivo é obrigatório. Prepare
leva apenas expectedVersion/policy/reason; retomada usa UUID do URL e confere identidade/candidato.
Não há advance/publish automático. Candidato fica readonly até voltar explicitamente à edição;
isso não apaga a preparação durável. Publish usa version/draftHash/catalogHash/cohortHash da
mesma preparação pronta. O CAS e o fence de catálogo do servidor permanecem a autoridade final.

Geração de carga impede resposta antiga de trocar plataforma ou repovoar tela errada. Operação
síncrona protege duplo clique antes do commit React. Falha/refetch mantém dados consultáveis,
bloqueia novas operações e não fabrica posto; histórico tem falha própria, sem invalidar edição.
As provas e limites do lote estão em _evidence.md. UI DOM/API isolada e tipos não equivalem a
integração de autenticação/banco ou validação visual em navegador.
