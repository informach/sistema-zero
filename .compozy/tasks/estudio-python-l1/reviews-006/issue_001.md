---
status: resolved
file: packages/studio/src/state/projectValidation.ts
line: 1095
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Leitor v3 cunhava outro ID para documentos válidos

## Review Comment

O refinamento JavaScript v3 reutilizava `boundProjectIdFromBody`, cuja política legada limita o ID a 128 caracteres e a um charset menor que o envelope/factory v3. Um projeto criado com 129 caracteres ou `custom.project` recebia outro ULID ao abrir, perdendo sua identidade e a lineage local. A leitura não pode criar outra criação silenciosamente. Preservar o ID validado pelo contrato v3 e validar substituições internas pela mesma política.

## Triage

- Decision: `VALID`
- Notes: O adapter usa o ID validado, sem fallback que cunhe outra criação. Na revisão seguinte, a política preparada v3 foi alinhada ao limite existente de banco/builder/uso: 128 caracteres ASCII de identificador. `isStudioProjectId`/`StudioProjectIdSchema` são compartilhados por envelope, factory, requestedId e revisão; entradas fora desse contrato são recusadas sem alterar o original. A duplicação/importação continua sendo um fluxo separado.
- Verification: Primeira correção revalidada independentemente: 21 testes, 100 verificações. O teste atualizado cobre preservação/lineage até128, hífen/underscore, e recusa explícita de129/pontuação/Unicode nos caminhos de corpo e requestedId. Verificação conjunta da política final registrada na revisão007.
