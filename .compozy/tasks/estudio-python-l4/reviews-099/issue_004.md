---
status: resolved
file: packages/members/src/application/submit-studio-project/submit-studio-project.service.ts
line: 512
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Tentativas idempotentes admitem efeitos duplicados ou indevidos

## Review Comment

O upsert da galeria recusa sobrescrever um requestId já concluído, mas não devolvia essa decisão ao SubmitStudioProjectService. Depois desse no-op, Submit continuava awardStudioSubmitted/awardStudioPassed com a nota da tentativa perdedora. A correção099003 do receipt no GalleryDeliveryService acontece somente depois desses efeitos e não remove o prêmio indevido.

Reprodução independente invertendo as notas na corrida de persistência: A com loop recebe grade aprovada e fica suspensa imediatamente antes do upsert; B sem loop, mesmo requestId/outra geração, persiste score0/passedfalse, passedAtnull e nenhum evento studio_passed. Liberar A mantém snapshotB e passedAtnull; a resposta tardia também é corretamente score0 após099003. Entretanto o ledger ganha um evento studio_passed pela gradeA, apesar de A nunca ter sido aceita. `bun test ./.cache/review099-copy-generation.test.ts --test-name-pattern 'must not award'`, cwdMembers:0pass1fail/14asserts exit1, falha exclusiva em expected events0/actual1 apósrelease.

Gallery/Submit/AwardGamificationService, policies, snapshots, verificadores e TCP gzip reader reais; repo de gamificação em memória preserva o ledger/idempotência, transporte do compilador e gate de persistência controlados. Não afirma execução SQL/R2/CPython real nem concessão indevida de progresso passedAt: o registro permaneceu reprovado.

Extensão confirmada da mesma invariante de efeitos do pedido: ao incluir o mesmo recado nos dois attempts, ambos espelhavam um turno antes de o upsert decidir o vencedor. O dedupeId usava hash do snapshot que agora inclui generation/paths distintos, portanto não deduplicava o mesmo requestId. Própria prova após o primeiro patch de XP:1pass1fail/25asserts exit1, expected1/actual2 mensagens antes mesmo de liberar A. Implementador aceitou incluir este caso no mesmo achado. Não equivale a mensagens diferentes do usuário nem à semântica histórica de reenvio comum.

Fazer a decisão transacional de upsert devolver explicitamente o receipt vencedor quando o pedido é duplicado. Submit deve terminar com esse receipt antes de admitir efeitos de gamificação da tentativa perdedora; aplicar o mesmo contrato aos adapters e preservar caminhos JS/Pinta. O read posterior do GalleryService continua útil para receipt, mas não pode ser a única barreira de efeitos.

Para a galeria, deduplicar o recado pela identidade estável do pedido (owner/block/requestId/message), independente da geração isolada. Manter o hash de projeto nos envios comuns JS/Pinta e a gravação do recado exigida antes de confirmar entrega.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente. Candidata proposta pelo implementador e confirmada pelo revisor com inversão das notas/ledger antes-depois; extensão recado aceita na mesma issue. Distinta de099003: aquela corrigiu resposta; esta impede efeitos indevidos/duplicados de um pedido idempotente. SQL/fake retornam duplicateGallery+receipt e ambos caminhos Submit terminam antes dos prêmios; mirror usa gallery:requestId só paraGallery, owner/block/message preservados. Própria5casos+wrapperpermanente6pass0fail/67asserts exit0 apósúltimomove dafixture para member-shell/qa. Caso com recado exige1turno antes/depoisrelease e nenhum studio_passed; persistedscore0/passedAtnull e receipt0 preservados. Regressões anterioresMembers25/203 eShell19/86 exit0, Biome6 exit0. Conferida evidência SQLfresh do implementador (`l6-python-gallery-sql-5.log`):8pass0fail/42asserts semskip, incluindo receiptpersistedwinner0/false/no losingretain/1evidence/loserGC e accountpurgefullschema com ownerfence/preservação deoutra conta. Scriptdeconferência próprio .cache/review099-sql-artifacts.ts exit0; nenhumSQLexecutado pelo revisor. Fonte/testes permanentes intocados pelo revisor. Limites: não CloudflareR2/SDK/HTTPauthgatewaySQLendtoend; fixture sparsePensa antiga segue pendênciaQA declarada, não ocultada por este fechamento.
