---
status: resolved
file: packages/studio/src/state/projectStorageRecords.ts
line: 37
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Lock Python tornava pesada a leitura dos resumos

## Review Comment

A projeção de metadados incluía toda a configuração Python, incluindo o lock de dependências. A listagem lê os metadados completos antes de produzir resumos. Uma reprodução dentro dos limites do schema (256 distribuições × 256 artefatos) produziu meta de 18.713.835 bytes para um resumo de 268 bytes. Trata-se do limite admitido pelo contrato, não de um projeto real medido. Mover a configuração para a partição dos arquivos preserva a atomicidade sem amplificar a leitura da lista.

## Triage

- Decision: `VALID`
- Notes: Configuração Python movida para files, junto da fonte/árvore. O mesmo exemplo agora tem meta de 658 bytes e roundtrip exato. Teste com IndexedDB verifica leitura somente de meta e miniatura; 11 testes/73 verificações passaram. Revisão independente confirmou a correção. O autosave continua escrevendo a partição files; não se alega redução desse custo.
