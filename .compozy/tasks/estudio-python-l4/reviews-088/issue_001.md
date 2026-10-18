---
status: resolved
file: packages/studio/src/runtime/python/activity-grader.py
line: 132
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Wrapper altera strings da asserção Python do professor

## Review Comment

O novo executor _code cria `def _assertion(ctx)` prefixando quatro espaços a cada linha de source.splitlines(). Esses espaços também entram nos literais Python multilinha e nas strings continuadas por backslash. Uma asserção válida é então executada com valores diferentes dos escritos pelo professor e pode reprovar mesmo quando sua condição original é True. Não é alteração do programa do aluno, mas mudança de semântica do critério autorizado.

Prova independente leve CPython3.14.2 nativo: `python.exe -I -B .cache/review088-grader.py`, cwd packages/studio, exit1/1pass2fail. Corpo `text = """first\nsecond"""` seguido de `return text == "first\\nsecond"` tem controle Python True e resultado do grader false. Corpo com `text = "first\\\nsecond"` e comparação com firstsecond também retorna false. `return True` passa. O teste importa activity-grader.py real e publica feedback normal, sem mocks de implementação, browser/SDK/Node executor ou execução do programa aluno.

Construir a função de asserção a partir do AST do corpo original, ou usar inserção de indentação que preserve tokens de literais e continuações. Manter contexto ctx, retorno estritamente bool, async suportado, limites e isolamento no worker. Cobrir triplequoted, continuação backslash e condições normais. A antiga006002 tratava reindentação de edição visual da fonte do aluno; este novo caminho é compilação/executor de asserções, fora daquele consumidor e do grading puro087.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e substituiu indentação textual por ast.parse do corpo original/FunctionDef/fix_missing_locations/compile, conservando literais. Prova independente CPython3.14.2 real original agora3pass exit0; permanente nativo7pass. Transport/session/renderer própria+permanentes24pass/0fail/152asserts e Biome15 exit0. Qualificação posterior browser3 real083fc977-c711-4fe3-a747-3bef39b32d88 Chrome/Edge inclui precisamente triplequoted/backslash e passou; probe independente Core/artefatos exit0/verifiedtrue verifica source/SHA/revisão/atividade completa preservados após089001. Nenhuma fonte/teste permanente editado pelo revisor. Achado fechado e caminhos B exercitados qualificados; consumidoresC/servidor/performance/featureglobal não concluídos.
