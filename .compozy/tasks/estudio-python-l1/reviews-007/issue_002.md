---
status: resolved
file: packages/core/src/studio/project-document.ts
line: 24
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Identidade preparada v3 excedia a política da plataforma

## Review Comment

O envelope e a factory preparados aceitavam ID de 129 caracteres ou `custom.project` e templates como `custom.template`/`Modelo Python`. O CAS recusava essas identidades. As tabelas existentes de builder/uso armazenam project_id em varchar128, e as APIs usam identificadores ASCII com hífen/underscore. A política v3 ainda não ativada deve convergir com esses contratos, sem renomear documentos durante a leitura nem expandir banco/APIs sem necessidade.

## Triage

- Decision: `VALID`
- Notes: `isStudioProjectId` e `isStudioDocumentTemplateId`, no contrato leve project-format, centralizam a política existente (128/80 caracteres). Envelope, factory, requestedId e revisão usam a mesma régua. Entradas inválidas são recusadas, originais preservados. A revisão v1 mantém os mesmos valores aceitos e o mesmo hash. O predicado documental não se confunde com `isStudioProTemplateId`, que consulta o catálogo de templates JS existente.
- Verification: Teste comparativo reader→CAS cobre limites válidos e quatro casos inválidos, além dos testes de factory/envelope. Revalidação independente: 57 testes, 348 verificações, seis arquivos, zero falhas.
