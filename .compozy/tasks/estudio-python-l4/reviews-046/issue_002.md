---
status: resolved
file: packages/members/src/application/studio/authorize-authoring-runtime.service.ts
line: 31
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Autorização usa leitura que materializa e carrega o rascunho

## Review Comment

`drafts.read()` não é uma leitura pura no adapter de produção. `DrizzleLessonDraftRepository.read` abre e conclui sua própria transação, trava o curso e a estrutura da aula, carrega os blocos/anexos publicados completos e calcula duas variantes do hash de publicação. Se `lesson_drafts` está ausente, insere um rascunho. Só depois desse commit o serviço de autorização compara `draftRevision`. Portanto um pedido recusado por revisão inexistente pode criar estado autoral. O caminho recorrente de autorizações também lê e serializa fontes/mídia de toda a aula, embora precise apenas de revisão e configuração do bloco.

Reprodução independente: `bun .cache/studio-python-l0/review046-draft-read.ts` — exit 0. Executa o repository e service reais com um connection spy (sem PostgreSQL): uma revisão UUID arbitrária retorna `LESSON_DRAFT_CONFLICT` após `inserted=1`, `committed=1`; a linha criada continua presente. O trace registra `courses FOR UPDATE` e selects de todas as colunas de blocos, anexos, estrutura, migração e rascunho. Um campo de mídia de131.072 caracteres foi acessado duas vezes pelo cálculo de revisão publicada. Essa instrumentação comprova o caminho/custo de materialização, não mede latência nem substitui uma prova SQL real.

Usar uma operação de consulta específica da autorização, sem criar rascunho nem bloquear o curso para leitura. Projetar no banco a revisão e, quando necessário, existência/kind/configuração de continuidade e curadoria do bloco. Não transportar fontes, assets ou caches para o processo apenas para descartar depois. Rascunho ausente deve ser recusado sem efeito persistente; a criação continua pertencendo à abertura/edição explícita. Cobrir ausência, revisão obsoleta e manutenção dos casos de autoria nova/ensaio.

## Triage

- Decision: `FIXED`
- Notes: O serviço passou a usar `readStudioRuntimeContext`, consulta de um único SELECT sobre o rascunho existente que projeta revisão, tipo, ambiente e curadoria do bloco. Não abre transação de escrita, não trava curso, não materializa rascunho e não traz fontes/mídia para o processo. A leitura histórica `read` do editor mantém sua semântica. Produção permaneceu somente leitura para o revisor.

## Revalidation

- `bun .cache/studio-python-l0/review046-draft-revalidate.ts` — exit 0. Repository e service reais com connection spy: revisão inexistente retorna `LESSON_DRAFT_CONFLICT`, com `inserted=0`, `committed=0`, `contentReads=0`; exatamente um SELECT de `lessonDrafts`, apenas projeções `revision` e `block`, sem lock. O harness não usa PostgreSQL nem mede latência.
- Inspeção integral da consulta confirma que ambiente/curadoria e revisão vêm da mesma instrução SQL e que o conteúdo do documento não é retornado. O teste permanente `runtime reads only an existing draft metadata snapshot and never creates a rejected draft` verifica ausência sem escrita, projeção de documento existente, bloco ausente/nulo e documento persistido intacto.
- Evidência SQL executada pelo implementador e conferida no log `.cache/studio-python-l0/l6-authoring-draft-sql-2.log`: suíte PostgreSQL com migrações reais, 15 pass, 0 fail, 92 verificações, incluindo o novo teste. O revisor não repetiu banco/TSC/navegador em paralelo. Essa evidência complementa o spy, sem transformar o resultado em medição de desempenho ou qualificação de todos os contextos de execução.
