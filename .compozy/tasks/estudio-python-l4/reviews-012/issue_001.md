---
status: resolved
file: packages/studio/src/state/projectStorageCoordinator.ts
line: 413
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Recuperação em conflito ainda usa o leitor JavaScript antigo

## Review Comment

loadRecoverableProjectDraft foi integrado ao leitor comum, mas copyConflictingRecovery ainda chamava prepareProjectForHost. Esse leitor envia formato 3 para a migração histórica 1→2, que o recusa. Por isso a recuperação de saída funciona sem conflito, mas não cria a cópia preservada quando outro escritor já venceu. O catch externo mantém os bytes no journal, porém loadRecoverableProjectDraft também recusa esse rascunho por ser conflitante; ele não fica acessível como documento recuperado.

Reprodução independente com fake-indexeddb e APIs reais: persistir documento, abri-lo duas vezes para obter escritores distintos, gravar a revisão vencedora, stage exit da revisão antiga e chamar recoverProjectWrites. JavaScript formato 2 cria recuperado-* e remove o journal. As quatro variantes formato 3 retornaram recovered=[], nenhuma chave project-meta:recuperado-* e loadRecoverableProjectDraft=null, com o journal ainda presente. O documento vencedor permaneceu intacto.

Usar prepareEditableStudioProject também na cópia de conflito, preservando identidade nova e o CAS já existente. Cobrir as quatro variantes com disputa real entre escritores, incluindo fonte, ambiente, assets e caches na cópia recuperada e preservação do vencedor.

## Triage

- Decision: `VALID`
- Notes: Resolvido e revalidado independentemente em 2026-10-17T01:14:08Z. copyConflictingRecovery usa o leitor comum. A mesma disputa entre escritores passou nas quatro variantes v3: exatamente uma cópia recuperada, documento equivalente à revisão perdedora exceto novo id/nome, assets e cache opaco Python preservados, vencedor estruturalmente intacto, journal removido e segunda chamada de recuperação sem efeito. Nenhuma fonte de implementação foi alterada pelo revisor.
