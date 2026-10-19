# Plano de testes — Jornada Kids configurável

Status: checkpoints T1/T2 preservados; contrato/seed/persistência canônicos escritos, fora da composição. Core focado58/2763, SQL30/135 com fila/drain, purge3/25 e TSC Core/Members0 passaram. Admissão Auth, serviços/consumidores e cenários T3+/browser continuam planejados. Executar checks amplos em janela coordenada para não competir com a validação Python no PC de 16 GB.

## Validação T2 — janela coordenada de 18/10/2026

Base `ac85a7a32` + T1 rebaseado `08ad6801f` + WIP T2. Bun **1.3.11**, Windows, PostgreSQL do container owned pelo root em **127.0.0.1:5434**. Nenhum DB remoto ou produção. Alvos informados ao root antes de mutações:

- `kids_journey_repository`: `KIDS_JOURNEY_TEST_DATABASE_URL` explícita, guard loopback/prefixo, histórico real até **0136** (137 entradas); helper não faz DROP. Recusa reuso se houver outro cliente conectado.
- `pensa_account_purge_test`: helper existente de purge, por URL explícita apontada à mesma stack QA; agora verifica clientes antes de **DROP normal**, sem FORCE/encerramento de conexões. Consumers `pensa_*` existentes mantêm seus nomes e guard.

Resultados frescos, executados sequencialmente:

1. `bun test tests/unit/kids-journey-facts.test.ts tests/unit/kids-journey-database-target.test.ts`, Members: **8 pass, 0 fail, 17 asserções, 193 ms**. Precedência campo a campo, complete-only, snapshots de curso apagado, isolamento de curso/perfil, formatura e guard do alvo.
2. `bun test tests/db/kids-journey.repository.test.ts`, Members, variável Kids explícita: **14 pass, 0 fail, 58 asserções, EXIT0, 14,04 s**, sem skips. Snapshot read-only, batch/audiência/posse, catálogo/vitrine alcançável, UPSERT monotônico concorrente, CAS v0/v1 concorrente, baseline offline/cursor atômico, workers repetidos, owner irresolvido, hashes/stale, pausa retida, purge/fence, corrupção recusada, rollback de audit e guard de cliente conectado.
3. `bun test tests/db/user-data-purge.test.ts`, Members, `TEST_DATABASE_URL` explícita da stack owned (o harness deriva seu alvo dedicado): **3 pass, 0 fail, 24 asserções, EXIT0, 26,44 s**, sem skips. Estado Kids incluído no purge; demais regressões existentes preservadas.
4. Biome focado e `git diff --check`: limpos. Migration gerada por `bun run db:generate --name kids_journey_policy`, somente quatro tabelas + índices/FK/checks, sem enum/backfill.

RED/GREEN SQL: a primeira matriz encontrou **2 pass/12 fail**, todos os fluxos de catálogo falhavam com SQLSTATE **42702**. Drizzle remove qualificadores de `Column` interpolada diretamente no campo SQL de um SELECT single-table; o EXISTS literal tornava `id` ambíguo. O subselect passou a usar o query builder/join e `exists(subquery)`, preservando as referências. Regressão catálogo isolada **1 pass/0 fail/4 asserções**, seguida da matriz completa acima. Não foi alterada a migration para corrigir consulta.

O primeiro TSC Members terminou EXIT1 com overlays incompletos/versões Zod misturadas; não foi atribuído à fonte. Após overlays legítimos, root corrigiu somente narrowing da fixture JS classic (companion `a85bcf327`, equivalente a `05bb6a790`). Verificação final completa Members: Node24.22.0/TS5.9.3, `tsc --noEmit --pretty false --incremental --tsBuildInfoFile ../../.cache/kids-configurable-journey/t2-members.tsbuildinfo`, **EXIT0**, log vazio. `@sistemazero/*` resolve ao próprio worktree, Members/Core Zod4.3.6 e Studio4.5.4 conforme manifests. Nenhum pin abaixo do manifesto foi usado para qualificar o resultado.

Review independente identificou lifetime de owner/input e aliasing de defaults. Seis regressões causais SQL foram executadas antes da correção (**RED 0 pass/6 fail/8 asserts, 6,23 s**) e depois (**GREEN 6 pass/0 fail/11 asserts, 5,52 s**). Owner parse e primitives são capturados sincronamente; defaults são fresh. Matriz SQL final completa: **20 pass/0 fail/69 asserts, EXIT0, 17,99 s**. Purge permanece **3/0/24**, fonte purge não mudou desde sua prova. Review readonly confirmou fonte/recibos, sem novo achado.

Logs locais ignorados: `.cache/kids-configurable-journey/t2-db-repository-final.log`, `t2-db-purge.log`, `t2-lifetime-red.log`, `t2-lifetime-green.log`, `t2-members-typecheck-final.log`. Estes testes provam o recorte T2; **não** encerram B02–B05/B13 (award durante/depois de ready/primeira ativação), crash/replay completo, HTTP preview/RBAC, consumidores ou escala. Publicação de baixo nível continua fora da composição até T3+.

## Provas adicionais obrigatórias do modelo canônico

Evidência em andamento (base f664, WIP canônico): core **56 pass/0 fail/2.758 asserts**, 1,386s, seis arquivos focados. Migration0136 regenerada pelo `bun run db:generate --name kids_journey_policy`; somente cinco tabelas Kids e respectivos índices/FKs, histórico até0135 intacto. SQL em NOVO `kids_journey_canonical`, owned loopback5434, histórico real137 entradas: **25 pass/1 fail/105 asserts, 59,01s**. A falha real revelou leitura sem ordem de domínio das capabilities após UPSERT lexical, em contraste com primeiro INSERT. `orderedEarned` agora valida schema estrito e ordena capabilities/tier rights no domínio; assert original de rank/caps/cursor foi preservado, com direitos seed explícitos. Foco veteran **1 pass/0 fail/7 asserts, EXIT0, 1,63s**. Negativo e foco preservados em `canonical-db-first.log`/`canonical-db-baseline.log`; não alegar matriz final verde antes da repetição. TSC/purge canônicos aguardam janela.

Revisão independente fechou duas lacunas adicionais. Entry preservado podia abrir slot2 no resolver sem projetar/congelar expanded: **RED2/4→GREEN2/5**, agora ambos usam tierEligibility pura única, com reward independente; core completo **58/0/2.763**, 1,60s (`canonical-core-focused.log`). Auth append podia provar owner para XP sem Gamma/earned e o capture ainda declarar unowned: **SQL RED0/1/1, 1,98s→GREEN2/0/9, 2,58s** incluindo divergências tardias Gamma/earned/cursor parado. Captura agora prioriza owner Auth coerente e compara todos os vínculos. Logs `canonical-entry-red/green`, `canonical-entry-shared-green`, `canonical-auth-owner-red/green`.

Matriz real seguinte teve **26/4/117 +2 erros**: dois hooks de setup atingiram5s, e suas promises continuaram concorrendo com o TRUNCATE seguinte, gerando AccessExclusive↔AccessShare40P01. Essa cadeia envolve TRUNCATE do harness; não demonstra ciclo produtivo. Timeout não foi ampliado. Fixture passou a capturar UM bootstrap real vazio e restaurar suas linhas válidas por caso; testes dedicados de bootstrap/coorte/auditoria foram preservados. Matriz então **30 pass/0 fail/135 asserts, EXIT0, 35,19s** (`canonical-db-fixture-final.log`).

Depois foi adicionado ownership/drain de beforeAll/beforeEach/casos antes do próximo reset e do close, para impedir trabalho expirado de tocar o próximo TRUNCATE independentemente da velocidade. A entrada de cada trabalho captura a fila anterior antes de qualquer await; o hook inteiro fica registrado, incluindo sua espera. Isso impede que dois hooks continuem juntos após um timeout da própria espera. Barreiras unitárias **3/0/8, EXIT0, 179 ms** provam espera, rejeição e ordem de duas continuações; não matam/cancelam clientes ou alteram deadlines. Repetição com essa fonte: **30 pass/0 fail/135 asserts, EXIT0, 38,12 s**, sem timeout/deadlock (`canonical-db-drain-repeat.log`). Purge canônica **3/0/25, EXIT0, 6,71s** (`canonical-db-purge.log`), incluindo remoção de preparationOwners por conta de filho omitido de userIds.

TSC completo canônico Core e Members: **EXIT0**, Node24.22.0/TS5.9.3, `--noEmit --pretty false --incremental`, caches próprios `canonical-core.tsbuildinfo` e `canonical-members.tsbuildinfo`, logs finais vazios. Members inicialmente encontrou somente TS2304 em `kids-journey.repository.ts:355`: `KidsJourneyPolicy` não importado na anotação de `insertPreparation`. Import type corrigido, repetição EXIT0; negativo em `canonical-members-types-red.log`, sem mudança executável depois da SQL30. Resolvers conferidos: Core/Members Zod4.3.6, Studio4.5.4, @types/node24.19.0; `@sistemazero/*` resolve à própria worktree. Não homogeneizar versões para qualificar o gate.

Checkpoint fonte canônica `a4e4babb5`, backup `backup/kids-journey-canonical-before-2e76-a4e4babb5`; rebase ao remoto2e76 gerou `e8be66021` sem conflitos. Range-diff confirma seis commits Kids equivalentes; somente companion ac04aa976 foi retirado por equivalência com guard remoto. Fixture Members JS classic idêntica ao remoto. Gates acima foram executados antes do rebase, com fontes Kids preservadas e versões de dependências já correspondentes. Biome focado19 arquivos **EXIT0**, 147ms, sem fixes; `git diff --check` limpo.

- Seed persistido dos oito postos/49 posições contra oráculo Kids congelado somente de teste; catálogo futuro incompleto, reward futuro sem base e catálogo unknown sem fail-open. Runtime Kids sem import do algoritmo antigo. Helpers legítimos do nível/contrato Adult preservados, com regressões de self/público/batch.
- V1 liberaliza→aluno offline→V2 restringe opensAt/completedAt/base complete→showcase: preservar posto/app capabilities e 21 direitos entry/expanded/reward. Expanded implica entry, reward não implica entry; matrícula continua necessária. Pausa permite expansão por conclusão real da base sem promover posto/app capabilities.
- Bootstrap Auth all inclui sem XP/arquivados/sem matrícula; earned noob/[] persiste. Ausência/corrupção após seed não reseta. Init repetido não sobrescreve Admin. Coorte recorrente inclui todos earned.
- Create pending conta quota; mesmo requestId/ID em timeout/duplo clique; sweeper agendado realmente retoma após crash. Grade parental mostra preparando; selecionar, refresh, impersonação, estudo delegado, público e emissão indireta de sessão recusam pending.
- initializeV1→publishV2→ready preserva V1; publishV2→initialize nasce V2; novo UUID abaixo cursor protegido. Sem RPC em TX nem lock crossDB. initialize→prepareDeletion→purge→ACK não ressuscita. Archive/cancel→ACK não ativa. Defaults existentes não viram pending em massa.
- Backfill direto e todos criadores/seletores inventariados, rollout retira criadores Auth antigos antes da captura; seedV0 antes do novo tráfego Members. Cleanup restrito à jornada Kids, JS/Python e contratos Adult preservados.

## Validação final T1 — janela autorizada após SQL principal

Fonte: `67edc1589` mais anotação literal `as const` da fixture de capacidades em `kids-journey-parity.test.ts`. A primeira execução de TSC identificou somente essa inferência `string[]`; a correção preserva literais, sem alterar comportamento.

1. `bun test tests/kids-journey-policy.test.ts tests/kids-journey-parity.test.ts tests/kids-journey-pause.test.ts tests/journey.test.ts tests/journey-state.test.ts` em `packages/core`: **50 pass, 0 fail, 2.716 asserções, EXIT0, 344 ms**.
2. Node **24.22.0** executando TypeScript **5.9.3** `tsc --noEmit --pretty false`, mesmo diretório: **EXIT0**, aproximadamente **3,8 s**, sem diagnósticos. Executável Node da cache do checkout Python foi somente lido/executado; compilador das dependências já existentes do principal; nenhum arquivo desses checkouts foi alterado.
3. Biome focado e `git diff --cached --check`: limpos. Não houve build/browser/SQL/Docker/suíte global.

T1 puro concluído no recorte revisado. Atualização ao checkpoint publicado e provas de baseline/consumidores continuam obrigatórias para T2+/integração.

## Histórico da primeira rodada T1 — 18/10/2026

Base `3d83a3f46` mais checkpoint documental `534fd038`; atualização ao checkpoint conciliado ainda obrigatória antes de integrar.

- `bun test tests/kids-journey-policy.test.ts tests/kids-journey-parity.test.ts tests/journey.test.ts tests/journey-state.test.ts` em `packages/core`: **44 pass, 0 fail, 2.641 asserções**, aproximadamente 1,7 s na última rodada.
- Biome focado nos três módulos novos, barrel e três arquivos de testes/fixtures: **7 arquivos verificados, sem erros**.
- Cobertura efetiva: fronteiras de posto, cada slot ausente, ordem inversa, capacidades atuais, 2.352 combinações de locks, snapshots sem catálogo, identidade de base substituída, complete/showcase, schema/limites estruturais, piso/grants, pausa, preview sem mutação, ciclo explícito/slot e indisponibilidade de vitrine implícita.
- Dependências locais: junction ignorada `packages/core/node_modules` aponta ao mesmo diretório do checkout principal; sem instalação ou alteração das dependências compartilhadas.
- TSC/build/DB/browser/Docker/suíte global **não executados**, conforme restrição do root. Testes do avaliador não provam baseline/CAS/SQL nem integração dos consumidores.

### Correção após revisão independente

A primeira entrega (`286614934`) perdeu o critério de base custom ao representar pausa sem regra retida: no repro complete-only, `{ locked: false }` virava `foundation-first`. O contrato agora exige `paused.policy` ativa validada (legacy/configured, sem nesting), mantém seus gates e não concede novos postos/capacidades. A revisão também levou `graduationOnly` ao fato do curso para distinguir formatura de curso normal fora da escada, preservando o acesso legado de lenda.

- RED: o repro original confirmou a regressão de gate; os novos testes de pausa recusavam a forma sem regra retida. Dois testes de formatura demonstraram readiness incorretamente pronta.
- GREEN focado atual: `bun test tests/kids-journey-pause.test.ts tests/kids-journey-policy.test.ts` → **21 pass, 0 fail, 120 asserções**, aproximadamente 205 ms.
- Revisão independente da pausa: policy/parity/pause → **25 pass, 0 fail, 2.591 asserções**, antes da adição dos dois casos de formatura.
- Revisão independente de formatura: os dois casos novos → **2 pass, 0 fail, 4 asserções**; ajuste aprovado no recorte puro. O futuro adaptador precisa derivar `graduationOnly` do nível real do curso.
- Uma execução concorrente à validação SQL/Biome atingiu o timeout de 5 s no teste agregado de locks. O timeout não foi ampliado. A branch legacy do resolver deixou de calcular projeção/readiness que não utilizava; na janela final sequencial a matriz completa passou em 344 ms.

## Provas de domínio e default

| ID | Preparação/ação | Resultado exigido |
|---|---|---|
| D01 | Política ausente/corrompida ou initializing num leitor normal | Indisponível; não retornar noob/fallback. Seed published+perfil sem marcos permanece noob, sem ferramentas globais, com entrada pedagógica da configuração. |
| D02 | Curso de entrada completo sem showcase / com ambos | Sem ambos continua noob; com ambos coder, livre/Pinta e mesmas recompensas atuais. |
| D03 | Cada fronteira cumulativa 1,9,17,25,33,41,49 slots qualificados | coder,hacker,explorer,elite,architect,champion,god respectivamente; 1 e 8 por etapa, não 48 no total. |
| D04 | Remover cada slot obrigatório, com todos os demais presentes | Nunca pular avanço incompleto; igualdade com `computeJourneyLevelSlug` legado. |
| D05 | Complete A e showcase B, ambos com mesmo slot histórico | Não combinar marcos de cursos distintos. |
| D06 | Curso re-nivelado/apagado depois dos dois marcos | Snapshot preserva slot/posto; precedência showcase→complete→fallback conforme legado. |
| D07 | Base publicada / base ausente, posições 2+ e reward | Mesmo future-tier/foundation-first/tier-reward/fail-open do legado, em listagem e URL direta. |
| D08 | Extra com e sem matrícula; curso lenda; combinação de tier inválida | Extra sem trava de jornada, matrícula permanece; lenda/par fora da escada sem gate pedagógico novo. |
| D09 | Curso ao vivo concluído, mesma conta com chave-mestra | Não conta posto nem paleta; vaga por aula continua a fonte de acesso. |
| D10 | Default em cada posto | Livre/Pinta coder, IA/Pensa hacker, Molda explorer, faixa intermediária architect, Ponte champion, Pro/profissional god. |
| D11 | Política custom muda curso X de showcase para complete | Conclusão basta para avanço; fundação usa critério configurado; paleta posicionada continua pendente de Mural e a UI explica. |
| D12 | Curso explícito extra de etapa alcançável / curso reward que depende do próprio avanço | Primeiro permitido com licença; segundo gera diagnóstico de ciclo e não publica. |
| D13 | Curso futuro, adulto, live, inexistente ou com vitrine impossível | Tipo/audiência inválida rejeitados; futuro circular aponta curso/avanço; showcase sem vitrine é indisponível, sem prometer avanço pronto. |
| D14 | Policy canônica malformada, passo repetido/fora de ordem, vazio, slot9; modos antigos | Não normalizar silenciosamente, não subir por requisito vazio; legacy/configured são recusados. |
| D15 | Arrays de capacidades vazios / modo paused | Vazio não libera tudo; pausa retém steps+tierAccess, congela posto/app capabilities e permite expansão real da base sob posto congelado. Ausência é indisponível; payload vazio/aninhado é inválido. |
| D16 | pro sem studio; bridge sem studio; pensa sem ai; Molda profissional sem intermediário | Rejeitar dependência cumulativa inválida. Pro+studio sem bridge é tecnicamente permitido. |
| D17 | Mover capacidade para depois/remover na revisão seguinte | Quem conquistou conserva; novo perfil depende da regra atual, mesmo se outro perfil da família conquistou. |
| D18 | Piso conquistado architect, novos requisitos anteriores faltantes | Não rebaixar nem pedir refazer etapas anteriores; avaliar próximo avanço a partir do piso. |
| D19 | Política mais fácil concede capacidade a posto já conquistado | Torna elegível pela regra ativa; baseline da próxima troca protege também quem não visitou. |
| D20 | XP alto/coins/badges sem marcos | Não substituem curso/slot; calcular jornada não muda valores nem ledger. |
| D21 | Requisito explícito para curso normal tier=null / graduationOnly=true | O normal permanece elegível se acessível; formatura não é requisito para avançar, inclusive para god. Gate de acesso a lenda continua sem trava pedagógica nova. |

Oráculos existentes: `packages/core/tests/journey.test.ts`, `journey-state.test.ts`; `packages/members/tests/unit/levels.test.ts`, `journey-migration-contract.test.ts`; `packages/community-kids/tests/journey-conformance.test.ts` e `journey-rewards-conformance.test.ts`. Acrescentar fixtures de curso apagado e legado sem snapshot sem apagar expectativas atuais.

## Provas SQL obrigatórias de baseline/CAS

Usar Postgres real com barreiras de duas conexões/transações. Um fake que reimplementa o algoritmo não prova isolamento/lock/CAS. Não usar `created_at` como fronteira de commit e não usar sleeps para coordenar o cenário.

| ID | Corrida/falha | Invariante |
|---|---|---|
| B01 | Aluno já coder no legado, nunca leu a jornada; preparar custom mais restritivo | Baseline materializa coder e capacidades legadas antes do CAS; mantém após ativação. |
| B02 | V1 liberaliza para studio em posto já conquistado; perfil não visita nem ganha marco; preparar V2 restrita | Varredura da política V1 preserva studio. Não depender do GET. |
| B03 | Award conclui último requisito enquanto baseline lê o mesmo perfil | Resultado final tem conquista sob uma versão coerente; nenhum marco confirmado elegível é perdido na troca. |
| B04 | Award começou antes de publish, commit depois / aguardando lock de policy | Ordem efetiva é definida pelos locks e versão, sem grants atribuídos à política errada. Provar os dois lados da barreira. |
| B05 | Novo perfil com UUID menor que cursor durante preparação | Hook do marco protege; paginação não causa perda de conquista. |
| B06 | Retry da mesma página após conexão cair antes/depois de commit | UPSERT e cursor idempotentes; sem capacidade perdida/duplicada; sem XP novo. |
| B07 | Dois operadores preparam/publicam expectedVersion igual | Só um CAS ativa; outro recebe 409 mantendo draft; histórico sem duas versões iguais. |
| B08 | Crash depois de freeze e antes de ready / antes do commit final | Regra ativa permanece V; retoma e publica integralmente, sem estado parcialmente ativo. |
| B09 | Curso retaggeado, arquivado, vitrine removida ou fallback alterado durante preparação | Hash/validação final detectam mudança relevante; preparação stale exige refazer; conquistas já congeladas permanecem. |
| B10 | Purge da conta concorre com baseline/GET/award | Fence vence persistência tardia; replay não recria dados do perfil; sem deadlock por ordem invertida. |
| B11 | Linha legada com snapshot parcial/owner ausente na coorte | Regra explícita de fallback/auditoria; não marcar preparação pronta com perfil silenciosamente descartado. Dados reais determinam se caso existe. |
| B12 | Batch/getMany/publish concorrentes com grant de capacidade e avanço | Maior posto e união sempre monotônicos; getMany usa versão coerente e não vira N+1; Adult não recebe grant Kids. |
| B13 | Primeira publicação v0 com linha de policy ainda ausente e award em voo | Lock estável protege v0; SELECT FOR SHARE em resultado vazio não é considerado proteção. Só um primeiro CAS ativa e nenhum ganho legado confirmado é perdido. |

Também verificar migration aditiva em banco novo, execução conjunta com purge nas duas ordens e que todos os DB tests foram executados, sem `describe.skipIf` por conexão ausente. Inspecionar índices para paginação por perfil/coorte; medir custo por batch e preview. Não atribuir limite de escala sem medição.

## HTTP, segurança de escopo e acesso efetivo

| ID | Caso | Resultado |
|---|---|---|
| H01 | Sem origem interna/customer em rotas globais; staff em prepare/advance/publish | Recusa. Staff ativo pode ler e simular; somente admin/superadmin próprios podem alterar. Esconder menu não é a proteção. |
| H02 | Admin/superadmin autenticado | Pode operar política; autor/data derivados do servidor; campos spoofados não gravam. |
| H03 | Perfil de irmão/outra conta em consulta, preview ou participante Pensa | Autorização atual aplicada; nunca herda capacidades por matrícula da família. |
| H04 | Preview repetido e depois comparar tabelas/ledger | Nenhum grant, baseline, XP, progresso, consumo de IA ou auditoria de publicação criada. |
| H05 | Product grant revogado/expirado com conquista permanente | Conquista permanece; uso pago/armazenamento/operação exige acesso ativo atual. |
| H06 | Falha de policy/milestone/catalog | 503/estado indisponível recuperável, sem fallback liberador ou resete de posto. |
| H07 | Members novo/BFF antigo durante deploy | Custom permanece desativado; novo campo aditivo não quebra Adult. Após ativar custom, campo ausente não aplica regra fixa silenciosamente. |
| H08 | Curso/base complete-only na UI vs URL direta | A mesma trava decide; pendência de paleta/Mural explicitada separadamente. |
| H09 | Endpoint interno da journey / header role fabricado pelo cliente | Gateway não expõe internos; identidade/role vem de cadeia autenticada. |
| H10 | Restore de revisão antiga | Nova versão/CAS/histórico; não reescreve passado nem remove grants. |

## Estúdio, Pensa, Molda, Mural, aula e voz

| ID | Caso | Resultado |
|---|---|---|
| C01 | Mesmo rank, duas configurações diferentes de studio/bridge/pro/ai | Gate segue capacidade/view; comparação de rank sozinha não autoriza. |
| C02 | studio concedido, paleta [] ou só IDs desconhecidos | Clássico bloqueado com motivo de currículo; não passar allowBlocks vazio ao editor liberado. |
| C03 | pro+studio concedidos, sem paleta | Pro abre conforme contrato existente, sem inventar kit de blocos ou requisito Ponte. |
| C04 | Grant curricular antigo após remover bloco/despublicar/apagar curso | Paleta preservada pelo sistema atual; política Kids não limpa studio_block_grants. |
| C05 | Instalar extensão com um bloco conquistado / importar jogo com extensão não conquistada | Extensões derivadas do catálogo de blocos; importar não burla portão. |
| C06 | Dois participantes Pensa com capacidades diferentes | Recursos pertencem a cada pessoa; programação/artes/tutor/Molda coerentes com sua licença e grants. |
| C07 | Falha de view Molda ou faixa movida/removida após conquista | Indisponibilidade não retorna undefined liberador; capacidade congelada continua família disponível com posse. |
| C08 | Remix Pro/extension não coberto, card antigo sem studioMeta | Snapshot autoritativo no clique; recusa antes de criar versão/award; publicado continua jogável. |
| C09 | Aula/oficina permite bloco/ambiente ainda não global | Aula funciona pelo contexto; não grava conquista global nem abre editor livre. |
| C10 | Mesmos casos com JS e Python no checkpoint conciliado | Linguagem/contexto e capacidade global separados; conteúdo incompatível diagnosticado pelo contrato real, sem habilitar tudo. |
| C11 | Transcrição Kids com opção dos pais ligada/desligada, noob/hacker | Opção/contexto e limites atuais governam; jornada não adiciona requisito de IA. |
| C12 | Narração privada Pensa/Zappy sem capacidade ou produto / com acesso | Recusa/permite coerentemente com recurso; áudio gravado de aula e professor não ganham gate global. |

Suítes a reutilizar: `member-shell/tests/studio-tier.test.ts`, `studio-unlocks.test.ts`, `creative-apps-access.test.ts`, `pensa-capabilities.test.ts`, `pensa-routes.test.ts`, `voice-transcribe.test.ts`, `private-voice.test.ts`; `community-kids/tests/studio-gate.test.ts`, `pensa-capabilities.test.ts`, testes de journey/map/horizon; regressões Adult de Members e DB.

## UI e revisão humana

| ID | Fluxo | O que conferir |
|---|---|---|
| U01 | Editor inicial | Oito postos atuais; placeholders honestos; filtro Kids gravados; campos sem reorder artificial. |
| U02 | Escolher complete/showcase | Explicação clara de avanço, fundação e paleta; aviso de vitrine/ciclo no requisito correspondente. |
| U03 | Preview | Diff por avanço/capacidade, direitos preservados, requisitos removidos e indisponíveis; nenhum número populacional inventado. |
| U04 | Conflito/versionamento | Draft não desaparece; reload/comparação explícitos; sem save v0 sobrescrevendo v1. |
| U05 | Preparação interrompida | Progresso/erro/retomar; regra atual identificada; publicar desabilitado até ready; retorno antigo não troca draft novo. |
| U06 | Mapa/horizonte custom | Posto conquistado sempre visível, curso inexistente não gera falsa contagem para avanço; catálogo falhando ≠ vazio. |
| U07 | Bônus novo em trilha vencida | Contador da trilha pode regredir; posto no perfil e ferramentas conquistadas permanecem. |
| U08 | Recompensas/blurbs custom | Nome/arte preservados; ferramentas reais e dependências explícitas; não afirmar publicou/domina 3D quando requisito não prova. |
| U09 | Loading/error/empty | Erro não se converte em zero, “não comprado” ou “nenhum requisito”; retry claro. |
| U10 | Mobile/teclado/conta sem passe | Seleção, avisos, preview e publicação alcançáveis; bypass de equipe não mascara gates do aluno. |

## Execução e registro

1. Rodar primeiro testes puros focados (T1) e HTTP/unidade, sem global suite repetida.
2. Coordenar Postgres e provas B01–B12 com root; banco isolado, sem usar produção nem subir Docker por iniciativa própria.
3. Depois das mudanças completas, rodar `bun run typecheck`, `bun test`, `bun run check` nos packages alterados conforme seus contratos. Builds/browser somente na janela acordada.
4. Registrar commit, ambiente, comando, tempo, contagens pass/fail/skip e resultado de UX. Um resultado de fake/skip não preenche a prova SQL.

Checklist de liberação:

- [ ] Default exato e testes de fronteira passam.
- [ ] Baseline offline/concorrência/purge provado em Postgres real.
- [ ] Todos os consumidores de posto/capacidade migrados e batch preservado.
- [ ] Preview comprovadamente sem escrita.
- [ ] JS/Python e Adult sem regressão.
- [ ] UI conferida como aluno sem passe, admin e staff.
- [ ] Tempo/carga de baseline e preview registrados em dados representativos.
- [ ] Schema/readers/hooks implantados antes da ativação custom; rollback preserva grants/histórico.
- [ ] Root revisou evidências e autorizou o próximo passo de publicação no fluxo principal.

## Lotes de apresentação C/D — prova e pendências atuais

P6C qualificado no snapshot SHA20e4aa4872ce590ebea943812bf2db4d248df8d8b430cdcae2176e58407301a9:
59 testes/193 asserções e Kids TSC EXIT0. Negativos anteriores permanecem em `_evidence.md`.
Este resultado não cobre os lotes seguintes nem a composição administrativa.

| ID | Caso | Resultado esperado / evidência |
|---|---|---|
| U11 | Capacidade Molda concedida em posto custom, removida de posto fixo ou produto ausente | Anúncio vem do delta real de capabilities e da licença; sem promessa fixa por slug. P6C focado aprovado. |
| U12 | Complete-only, primeira visita, troca de perfil e view antiga depois de posto maior | Copy não afirma publicação; sem festa retrospectiva, regressão do observado ou mistura entre perfis. P6C focado aprovado. |
| U13 | Aviso, guia e conquista na mesma visita | Aparecem em sequência sem perder conquista. O teste existente entrou na matriz final59; fixture adaptada para journey. |
| U14 | Metadata ausente/desconhecida, menu sem gamification e oito postos explícitos | Posto indisponível para ausência; oito nomes preservados. D1 qualificado em matriz59/253 e Kids tipos0. |
| U15 | Render público com level ausente na estrutura web opcional | Defesa interna não fabrica Faísca. A rota pública atual exige view/level; não interpretar a fixture como prova de resposta null da rota. Fixture atual qualificada. |
| U16 | Slot único, requisito course fora de tier, ambiguidade e catálogo indisponível | resolvedCourseId vem da mesma captura; apenas candidato único identificado. D2 RED0/5→GREEN5/18 e matrizCore68/2833; Core/Members/Kids tipos0. |
| U17 | Histórico satisfeito sem curso na captura de catálogo | Estado continua satisfied, sem dívida nova por identidade null. Prova incluída no Core D2. |
| U18 | Curso necessário fora de agrupamento, pausa e preview da equipe | Criança encontra curso real por ID e marco honesto; matrícula/careerLock mantidos, pausa sem promessa de promoção e equipe sem tarefas virtuais. Controles7/28 e matrizUI70/225; Core/Members/Kids tipos0. |
| U19 | Reward por completedAt custom e tela423 | Card e recado nomeiam requiredLevel real; ausência não fabrica Faísca. Reward preservado e known-missing-open não implicam entry. Card59/253 e tela42336/106, Kids tipos0. |
| U20 | Foundation complete-only e mensagem423 | Resolver abre com complete sem showcase; recado não impõe Mural por regra fixa. Não altera selos/concessões curriculares. Prova incluída em tela423. |

Gates seguintes devem registrar separadamente RED, correção, GREEN, formatação, matriz afetada e
tipos. A matriz de um lote anterior não qualifica novo DTO ou fixture alterada posteriormente.
O host é compartilhado: aguardar janela explícita do root antes de SQL/TSC/browser e de qualquer
subprocesso HTTP/SDK; durante desempenho, até unidades curtas aguardam coordenação.

## Editor Admin C — casos locais executados, integração ainda aberta

| Caso | Prova local |
|---|---|
| Oito postos/sete avanços; Faísca sem ferramentas globais iniciais | Formulário5/19, sem importar seed em produção. |
| Marco/ferramentas e tierAccess editados separadamente; curso ausente não é descartado | Controles reais DOM, readonly de equipe e pausa retendo regra. |
| Comparação mode-only e simulação honestamente rotulada | Fluxo de UI real/compare Core, sem escrita antes do botão. |
| Prepare sem ator; URL retomável; advance manual; publish três hashes/version | Filho editor12/64, sem concessão no cliente. |
| Initializing/falha/refetch malformado não fabricam política/Noob | Dados anteriores retidos, novas operações bloqueadas. |
| Preview velho/edição/conflict/busy/ready semcohortHash | Sem retry ou publicação fictícia; rascunho/candidato conservados. |
| Troca de plataforma durante resposta pendente | Resposta velha ignorada, sem repovoar tela adulta. |
| Paginação do histórico falha sem apagar dados/edição | RED causal11/1→GREEN; erro fica na seção correspondente. |
| Papel/perfil/conta/contexto/impersonação para canEdit | Members13/98 inclui guardas da rota e composição. |

Matriz afetada Admin30/140, Members13/98, Biome13/0, Admin/Members tipos0. Faltam navegador
real/CSS, JWT/S2S/DB/BFF integrado, bootstrap/retention e staging; não marcar esses gates como
passados usando a fixture de fetch. Snapshots e logs próprios preservam negativas e fonte.
