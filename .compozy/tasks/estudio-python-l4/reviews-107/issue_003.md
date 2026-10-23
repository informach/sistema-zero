---
status: resolved
file: packages/studio/src/components/tutor/ProBuilderPanel.tsx
line: 392
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Baseline Python é rotulado como diagnóstico TypeScript

## Review Comment

A captura do editor Python fornece diagnósticos Pyright ligados ao sourceHash atual, mas o novo consumidor compartilhado do painel construía baseline.source='typescript' para ambas as linguagens. O contrato Core também aceitava exclusivamente esse valor. Uma observação Python correta chegaria ao builder com proveniência errada, dificultando distinguir a análise tipada Python do caminho JavaScript. Não se trata de evidência de execução bem-sucedida.

O bloqueio anterior107002 impedia observar esse payload pelo fluxo Python completo. Depois de corrigido esse guard, foi criada uma cópia isolada do Panel em `.cache/review107-panel-old-baseline.tsx`, restaurando SOMENTE a linha anterior source:'typescript' e mantendo o restante da implementação corrigida. A probe `.cache/review107-diagnostic-before.test.tsx` usa captura/contexto/store/Panel/Core reais com diagnóstico e sourceHash atuais: main.py chega ao adapter com source TypeScript, enquanto o controle JS está correto. Resultado1pass/1fail/16asserts exit1, log `.cache/studio-python-l0/review107-diagnostic-before.log`. Não foi alterado nenhum arquivo de produção para esta reprodução; o diagnóstico é controlado, não uma nova execução Pyright real.

Admitir proveniência Pyright no contrato e escolher a fonte pela linguagem da revisão. Preservar a proveniência TypeScript legada e a validação de sourceHash. Regressões permanentes autorizadas foram adicionadas em novo `ProBuilderPanel.python.test.tsx` para ambos os casos.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. Core aceita pyright|typescript e Panel escolhe pela linguagem. Permanente autorizado ProBuilderPanel.python.test.tsx verifica payload.baseline completo, CAS/sourceHash/mensagem atuais e fontes pyright/TS, com controle JS preservado. Permanente+causal1070029/74 e suite UI/legado27/169 passaram; Biome11 arquivos limpo. Counterfactual isolado restaurando exclusivamente a linha antiga confirma antes1pass/1fail/16asserts; nenhuma produção foi alterada pelo revisor. Diagnóstico controlado, não uma execução Pyright real; sua proveniência é a propriedade qualificada.
