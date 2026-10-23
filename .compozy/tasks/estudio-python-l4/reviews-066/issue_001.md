---
status: resolved
file: packages/studio/src/export/pythonWeb.ts
line: 93
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Exportação web rejeita nomes válidos do documento Python

## Review Comment

O exportador passa project.name preservado para StudioPythonWebPayloadSchema, cujo campo name tem máximo120. O contrato canônico StudioProjectDocumentSchema aceita nomes de até200 caracteres. Assim um projeto válido com121 a200 caracteres é carregado e executado normalmente, mas a exportação web falha no parse do payload depois de já autorizar e baixar a distribuição inteira. Não é incompatibilidade de runtime nem ausência da futura integração do host: o exportador implementado rejeita metadados autorais válidos.

Prova independente `packages/studio/.cache/review066-web-boundaries.test.ts`: usa a fixture de distribuição inerte aprovada e o exportador real, define nomes de121 e200 caracteres, confirma que ambos passam refinePythonProjectDocument e chama exportProject. `bun test ./.cache/review066-web-boundaries.test.ts` no pacote Studio: exit1,0 pass,2 fail,2 verificações; ambos falham com ZodError maximum120/path name. Nenhuma fonte de produção modificada pelo revisor e nenhuma qualificação de navegador inferida desses bytes inertes.

Alinhar o nome do payload ao contrato canônico do documento, de preferência compartilhando a validação, e preservar o nome sem truncamento. Cobrir os limites aceitos pelo documento na exportação e na leitura do pacote.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e extraiu StudioProjectNameSchema com a semântica original do documento (string de até200 caracteres, inclusive vazio), reutilizada pelo payload. Prova independente do exportador e leitor reais em `packages/studio/.cache/review066-web-boundaries.test.ts`: nomes vazio/121/200 preservados exatamente no ZIP e201 rejeitado antes de autorização/fetch. Combinado com `review066-web-lifetime.test.ts` e `review066-export-dialog.test.tsx`:11 pass,0 fail,30 verificações,exit0. Confirma captura anterior ao lazy import, aborto na reautorização final, projeto/actor A→B→A sem entrega antiga, unmount, close/reopen e Cancelar explícito sem download tardio/segundo fechamento. Permanentes em8 arquivos (inclui regressão JS, snapshot/source e servidor Python HTTP real):37/214,exit0; Core4/32,exit0. Nenhuma produção alterada pelo revisor. A prova do ZIP usa bytes de runtime inertes; navegador, desempenho e configuração de produção permanecem fora desta revisão.
- Final checks: Biome14 arquivos do recorte/correção:exit0,sem alterações. YAML e meta1/1/0 conferidos após fechamento.
