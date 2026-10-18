---
provider: manual
pr:
round: 1
created_at: 2026-10-16T22:10:40Z
---

## Summary
- Total: 3
- Resolved: 3
- Unresolved: 0

## Scope

Revisão independente de snapshot Pro, buffer de console, protocolo de mensagens, leitor do snapshot transmitido, interpretador Python/TypeScript, worker e builder/manifesto de distribuição. A rodada registra também o achado anterior do console, confirmado e corrigido antes desta revalidação. Supervisor, provider, Turtle e ativação da interface ainda não pertencem à fatia implementada.

## Evidence

- `bun test src/runtime/python/snapshot.test.ts src/runtime/python/consoleBuffer.test.ts`, executado em `packages/studio`: 9 testes, 39 verificações, nenhuma falha.
- Biome: 11 arquivos TypeScript/JSON, nenhuma correção aplicada.
- Reprodução no Pyodide 314.0.7 local: o Writer.write corrigido processou 819.200 bytes sem LF, reteve 61.440 caracteres e contou 757.760 omitidos; dois fragmentos produziram exatamente `ab`.
- Reprodução do adaptador Python real: conclusão normal e erro deixam texto sem LF no TextIOWrapper até um flush Python explícito.
- Reprodução Unicode: `ValueError('🐢' * 10000)` produziu JSON com 168.235 unidades UTF-16 e traceback com 20.174, ultrapassando os limites TypeScript.
- Verificação somente leitura confirmou os hashes dos 7 arquivos vendor e dos 9 arquivos em cada uma das 2 distribuições então existentes. Isso não substitui qualificação do runtime em navegador.

Nenhuma fonte de produto foi alterada nesta revisão. As provas de integração em navegador são conduzidas separadamente pelo implementador.

## Revalidation

- Issues 002/003 resolvidos e revalidados independentemente. `_finish` descarrega a saída Python antes dos resultados; `_bounded_text` usa a mesma unidade UTF-16 do leitor TypeScript.
- Conferido o relatório completo `.cache/studio-python-runtime/playwright.json`: início `2026-10-16T22:13:10.701Z`, duração aproximada de 65,3 segundos, 28 testes aprovados (14 Chrome + 14 Edge), nenhum inesperado, flaky ou skipped. Todos os anexos identificam a distribuição `e90b2e7f273fe07d50df0000ed76392d0890792b88a57dbbe4a2d51213a3c37a`.
- Reprodução independente em Node/Pyodide confirmou sucesso e erro com saída parcial, stream sem closed, falha de flush estruturada, preservação de erro principal e SystemExit(0.0). O erro com 10.000 emojis agora cabe no envelope e conserva o caminho da fonte; 30 combinações adicionais de texto/limite passaram.
- Encerrada a revisão desta fatia sem achados pendentes. Isso não encerra L3: supervisor, provider, integração de catálogo/hosts e qualificação das respectivas fronteiras continuam nas próximas entregas.
