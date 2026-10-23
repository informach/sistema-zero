---
status: resolved
file: packages/core/src/studio/python-activity-structure.ts
line: 10
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Critérios estruturais ignoram normalização Python dos nomes

## Review Comment

O novo contrato de atividades aceita identificadores Unicode e normaliza NFKC em globalEquals e functionName, mas os critérios estruturais reutilizam name/callTargets sem essa normalização. CPython normaliza identificadores ao produzir AST. Assim uma atividade que pede exatamente o nome escrito na fonte pode reprovar corretamente compilado, incluindo cafe seguido de combining acute, uma grafia Unicode comum.

Prova independente `bun test ./.cache/review087-activity.test.ts`, cwd packages/core: CPython3.14.2 nativo REAL executa apenas o analyzer.py confiável sobre bytes de `K = 1`, definição e chamada `cafe\u0301`. O compilador retorna assignedNames K/café, definedFunctions café e callTargets café, sem diagnóstico. Snapshot tem SHA dos bytes e revisão Core real; relatório completo é vinculado por prepareStudioPythonStructureEvaluation. StudioPythonActivitySchema aceita os três critérios com os nomes originais; gradeStudioPythonActivity dá três false/score0/gate100 failed, esperado100/passed. Não executa programa aluno, browser ou serviço SDK. A mesma suíte confirma pesos e feedback,1pass2fail/1261asserts total (segunda falha é issue002).

Canonicalizar nomes estruturais conforme NFKC do Python, inclusive segmentos de targets pontuados, antes da comparação, conservando limites e sem resolver aliases/dynamic dispatch nem alterar fonte. Cobrir atribuição, função e chamada em formas compostas/decompostas e Kelvin. Não é a antiga078001 (omissão de typeparams na extração) nem038001 (renomeação Pyright).

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou transform NFKC com limites antes/depois em nomes e calltargets. Prova independente original CPython3.14.2 real agora gera score100/passed; ampliada inclui target pontuado K.cafe+combining→K.café e recusa expansão NFKC acima do limite. Suite própria+permanentes19pass/0fail/1385asserts exit0; Biome4 exit0. Source/hash/revisão originais preservados; avaliador continua sintático, sem executar programa ou resolver alias. Contrato A ainda não habilitado em consumidores; nenhum fonte/teste permanente editado pelo revisor.
