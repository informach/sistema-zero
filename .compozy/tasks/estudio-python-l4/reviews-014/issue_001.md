---
status: resolved
file: packages/studio/src/state/projectStore.ts
line: 635
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Duplicação de título no limite gera documento v3 ilegível

## Review Comment

duplicateProject acrescentava ` (cópia)` ao título inteiro, sem aplicar o limite de 200 caracteres do documento v3. Um projeto Python válido com título de 200 caracteres produzia uma cópia de 208 caracteres; persistProject concluía a escrita, mas loadSanitizedProjectById rejeitava a cópia no envelope estrito. A mesma composição afeta os quatro formatos v3. O caminho histórico JavaScript fazia normalização de título durante a leitura, portanto apenas reutilizar a implementação antiga não preserva o contrato novo.

Reprodução independente com fake-indexeddb e funções reais, antes da correção: Python Classic e Pro com name de 200 caracteres; persistir, duplicateProject e reabrir a identidade nova. Ambas as cópias ficaram gravadas com name.length=208; a reabertura lançou Zod too_big, maximum=200, path=name. Limitar a parte original antes de acrescentar o sufixo e cobrir duplicação, persistência e reabertura, mantendo o original intacto.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente antes da integração de staging, em 2026-10-17. O título agora usa source.name.slice(0,192) mais o sufixo; a operação também captura o storage scope. Prova real IDB nas quatro variantes v3: cópia com 200 caracteres e sufixo preservado, documento serializado integralmente igual após reabertura e título original intacto. Importação nas quatro variantes também reabriu. A suíte focada executada pelo revisor passou 54 testes/260 verificações, incluindo o novo teste permanente das quatro variantes. O primeiro assert do ensaio independente comparava também o Symbol de lineage entre duas instâncias; foi corrigido para comparar o documento serializado, pois a identidade local de leitura legitimamente muda. O ensaio corrigido passou completo.
