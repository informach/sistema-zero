---
status: resolved
file: packages/studio/src/runtime/python/turtle/_sz_turtle_backend.py
line: 239
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Checkpoint aninhado observa callback Turtle incompleto

## Review Comment

_update chama o checkpoint de atividade ao final de cada invocação. Um callback de key/click/timer pode executar Turtle.setx/forward/update, que reentra em _update pelo fluxo normal do motor antes de o callback original terminar. Se existe pedido de correção, a chamada aninhada captura observáveis no meio desse callback; alterações que ocorrem logo após o desenho ficam ausentes e o grader já marca done. A guarda _grading impede recursão causada pelos testes, mas não impede iniciar a primeira correção durante um callback do programa ainda incompleto.

Prova independente `python.exe -I -B .cache/review091-nested-checkpoint.py`, cwd Studio, CPython3.14.2/Turtle/backend/grader reais, transporte gráfico controlado semGUI/WASM. onkey(space) chama actor.setx40 e depois score=1. Trace real: key-start→checkpointScore0→key-finished→checkpointScore1. Feedback único globalEquals1 éfalse, apesar de score final1. Exit1/1falha,12ms. A segunda passagem pelo checkpoint já não pode corrigir o resultado terminado. Diferente de091001: aqui o estado intermediário aparece mesmo sem timer ou janela de observação.

Fazer o checkpoint somente fora de todos os callbacks/dispatches ativos e no nível externo seguro de atualização. Manter try/finally na contagem de profundidade, cobertura de key/click/timer e update aninhado e a guarda contra recursão durante testcase/code que desenha. Não remover execução normal de eventos/timers nem reentrar no interpretador pelo JS para resolver a espera.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. Depth com try/finally faz checkpoint apenas após dispatch externo. Repro CPython3.14.2 original passou sem enfraquecer cenário: key-start→key-finished→checkpointScore1, feedbacktrue; permanente nativo também passa. Probe público adicional testa screen.update aninhado em callback e só anuncia activity-turn após key-finished. Browser8 real Chrome/Edge while/update (callback setx antes score1) e mainloop/timer passam score/position/callbacks; teste direto de função que desenha continua sem recursão. Revisor conferiu20cases/24runtimefiles e PNGs diretos. Resultado formativo cliente; não afirma autoridade Members/performance.
