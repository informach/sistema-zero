---
status: resolved
file: packages/studio/src/state/editableProjectValidation.ts
line: 23
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Discriminante legado executa getter antes do guard JSON

## Review Comment

O ramo legado acessa raw.programmingLanguage antes de usar o copiador estrutural. isDocumentRecord aceita objetos comuns com accessors, portanto essas duas leituras executam uma propriedade que o contrato JSON exige recusar sem invocar. A inspeção de formatVersion já usa descriptor para evitar esse problema; o discriminante novo reintroduz a execução antes da validação.

Reprodução independente: createEmptyProject('getter', 'Before') com programmingLanguage definido por Object.defineProperty como getter enumerável, retornando 'javascript' e alterando files['script.js']. prepareProjectForHost recusa 'O projeto contém uma propriedade executável' com zero invocações e fonte intacta. prepareEditableStudioProject invoca o getter duas vezes, a fonte original é alterada, e somente depois a cópia JSON recusa o documento. Isso não depende de Python nem de imports lazy.

Inspecionar o descriptor sem invocar o accessor, ou capturar o documento estruturalmente antes de ler seu discriminante; preservar a lineage local ao repassar a cópia. Acrescentar negativo de accessor no ramo legado, exigindo zero invocações e entrada intacta. O achado trata da API unknown usada pelo host, sem alegar que JSON serializado possa conter getters.

## Triage

- Decision: `VALID`
- Notes: Resolvido e revalidado independentemente em 2026-10-17T01:14:08Z. A cópia estrutural precede agora a leitura do discriminante também no ramo legado. Provas com formato 1 e 2 recusaram o getter com zero invocações e fonte original intacta; alteração da entrada imediatamente após a chamada não mudou o snapshot legado retornado, e a lineage foi preservada. Suíte focada após as duas correções: 29 pass, 0 fail, 166 verificações.
