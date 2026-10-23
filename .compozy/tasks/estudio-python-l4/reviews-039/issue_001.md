---
status: resolved
file: packages/member-shell/src/components/studio/lesson-studio-draft.ts
line: 143
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Conferir continuidade antes de autorizar subida ou conflito

## Review Comment

A compatibilidade nova é conferida ao abrir uma fonte e ao substituir o documento ativo, mas não antes de autorizar a versão local a substituir a conta. No ramo `local` de `prepareStudioLessonDraft`, a função pode adotar a revisão remota e devolver `upload: true` sem conferir o ambiente do documento local. `studio-block.tsx` enfileira essa subida no `.then()` da preparação, antes de `resolveStudioLessonSeed` recusar o mesmo documento. O produtor também relê o disco sem conferir continuidade. Outra entrada da mesma causa é `resolveStudioConflict(..., false)`: uma versão remota incompatível é guardada como outra versão e o retorno sem `adopted` autoriza a fila a substituí-la pelo documento local.

Reprodução executada: `bun .cache/studio-python-l0/review039-continuity.ts` (exit 0). Semente JS, rascunho Python mais novo e conta JS na revisão 7 produziram `{upload:true,other:true}`, marca 7 e documento de subida Python; a resolução da semente só então lançou `StudioLessonSeedCompatibilityError`. A prova também confirmou que um conflito posterior com conta Python e local JS retorna `{kept:true,opened:null,adoptedAt:null}` em vez de recusar. O contrato público de `LessonDraftConflictOutcome` explicita que sem `adopted` a versão local sobe por cima da conta.

Conferir o vínculo/baseline autorizado antes de marcas, restauração ou autorização de upload, incluindo o documento fresco capturado pelo produtor e ambos os lados de um conflito. Uma incompatibilidade precisa interromper a operação e conservar os documentos, sem reconhecer silenciosamente a nova revisão como base de sobrescrita. Acrescentar provas dos ramos `local`, conflito não inicial e produtor cujo documento mudou no disco.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado independentemente. Continuidade é conferida antes de autorizar subida, reconhecer revisão ou substituir ativo/backup; a baseline autoritativa permanece no escopo separado de 002.

## Revalidation

A primeira correção acrescentou conferência do local na preparação/produtor e do remoto nos conflitos comuns. Os testes permanentes novos passam. A issue permanece pendente por duas entradas da mesma causa, reproduzidas em `bun .cache/studio-python-l0/review039-equal-fingerprint.ts` (exit 0):

- Dois documentos Python Pro válidos com `templateId` diferente têm o mesmo fingerprint v2 calculado de verdade, porque o template não participa dessa impressão de conteúdo. O atalho de `resolveStudioConflict` devolve `adoptedAt: 1` antes de baixar ou conferir o remoto (`downloads: 0`), embora a continuidade devolva `template`.
- No ramo `cloud`, `backupLocal` ainda é gravado antes de `readRemote` conferir a compatibilidade. Com uma outra versão previamente existente, a operação rejeita a nuvem incompatível, mas já substituiu esse backup pelo local. O ramo `submission` também valida o candidato depois da gravação do backup. Conferir integralmente a fonte candidata antes de qualquer efeito e antes do atalho de igualdade.

## Resolution

A correção final separou `conferir` de `gravar`: candidatos de nuvem/envio são validados antes de qualquer gravação de backup. O atalho de fingerprint igual agora carrega e confere o documento remoto antes de devolver `adoptedAt`. A preparação confere o local antes de consultar a conta, e o produtor confere a cópia fresca relida do disco.

Prova independente executada: `bun .cache/studio-python-l0/review039-001-revalidate.ts` (exit 0). Fingerprints v2 realmente iguais com templates Pro diferentes foram recusados no primeiro contato e nos conflitos posteriores, com dois downloads, zero escritas e zero marcas. Nuvem e envio incompatíveis conservaram o projeto ativo e o backup anterior por identidade. Trocar o documento local depois de criar o produtor foi recusado tanto pela preparação (antes do `peek`) quanto pelo produtor. O caso compatível com fingerprint igual continuou reconhecendo a revisão sem gravar backups.

Regressão fresca: `bun test tests/lesson-draft-persistence.test.ts tests/lesson-draft-outdated.test.ts tests/studio-lesson-seed.test.ts` em member-shell: 44 pass, 0 fail, 130 assertions. Biome verificou os dois arquivos alterados sem correções. Sem browser, TSC ou escrita HTTP remota nesta revalidação. A issue 002 permanece pendente e não foi alterada.
