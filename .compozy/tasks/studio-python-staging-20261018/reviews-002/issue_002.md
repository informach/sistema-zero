---
status: resolved
file: packages/member-shell/src/routes/studio-zappy.ts
line: 296
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Histórico Python aplica nível Kids no host adulto

## Review Comment

A rota contextual `studioZappyHistory.POST`, preservada do WIP Python, chama `isStudioZappyAllowedForRequest(members,user)` diretamente depois de validar o corpo. Esse helper consulta o nível Kids. Na factory compartilhada, GET/DELETE, feedback legado e mensagens já escolhem a política de audiência: o adulto precisa de identidade adulta válida e `journey.capabilities` contendo `ai`, por meio de `allowed(user)` ou da mesma checagem na mensagem. O novo POST contextual cobre histórico, exclusão e feedback Python, e ficou fora dessa conciliação.

Reprodução independente com a rota real: `bun test ./.cache/studio-python-l0/review-staging-zappy-audience.test.ts`, cwd feature, EXIT0, 1 teste/8 asserts. Com sessão adulta ativa sem perfil Kids, capacidade adulta `ai` e nível Kids `noob`, GET retorna200 mas POST contextual retorna403 `ZAPPY_NOT_ENABLED` antes da autorização Python. Retirando a capacidade adulta e mudando apenas o nível para `hacker`, GET retorna403 enquanto POST alcança `authorizePythonAnalysis`, que retorna409 sentinela controlado. O projeto e a autorização analisados vêm da fixture Python real; apenas a porta Members usada pelo probe é controlada. Uma primeira tentativa de import estático falhou em `server-only` antes de executar testes; o probe final registra o mock de boundary antes do import dinâmico.

Usar o mesmo `allowed(user)` sensível à audiência antes de `authorizePythonAnalysis`. Preservar a autorização Python, o vínculo projectId/subject, a validação da decisão e o owner como verificações independentes. Esta prova demonstra a troca indevida do gate de audiência, **não** acesso efetivo a histórico sem autorização Python, nem grant arbitrário de execução. A regressão permanente cobre as três operações com adulto habilitado em nível Kids baixo, contexto revogado e adulto sem capacidade IA em nível Kids alto. É um defeito da conciliação do POST novo com o host adulto, separado da integração FreeRuntime ainda em andamento.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium e autorizou formalização em reviews-002/issue_002.md. Produção permanece sob edição exclusiva da raiz; status valid/unresolved até revalidação e gates da conciliação. Testes permanentes autorizados em studio-zappy-python.test.ts e fixtures/zappy-python.ts.

## Revalidation

A raiz trocou somente o gate do POST contextual para `allowed(user)`, mantendo o bloco de `authorizePythonAnalysis`/`validatePythonAnalysisDecision`. O teste permanente reproduziu antes7pass/1fail/58asserts (adulto AI/noob: esperado200, recebido403). Depois da correção, `bun test ./packages/member-shell/tests/studio-zappy-python.test.ts ./packages/member-shell/tests/studio-zappy.test.ts` retornou EXIT0,87pass/0fail/428asserts. As três operações adultas passaram com política Python real; revogação de contexto retornou409; retirada da capacidade adulta com nível Kids alto retornou403 antes de policy. Logs de erro de conhecimento nas negativas JavaScript foram esperados e os respectivos testes passaram; não há alegação de stderr vazio.

Somente os dois arquivos de teste autorizados foram alterados por este revisor; Biome verificou2arquivos sem mudanças/EXIT0. A prova independente de fronteira foi adaptada ao contrato corrigido, preservando a comparação GET/POST e a porta de análise controlada. Estado permanece valid/unresolved enquanto a raiz coleta os gates globais de conciliação; não qualifica AI real, SDK/R2, browser, TSC ou push.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
