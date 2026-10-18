---
status: resolved
file: packages/studio/src/runtime/python/turtle/_sz_turtle_backend.py
line: 179
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Scheduler diverge de after_idle e update do Turtle oficial

## Review Comment

O scheduler representa `ontimer(fun, 0)` como um timer vencido comum. No CPython 3.14.2 fixado, `TurtleScreenBase._ontimer` usa `after_idle` para zero e `after` para atrasos positivos. Isso altera a ordem observável: agendar `idle` com zero, agendar `due` com 1 ms, dormir 30 ms e chamar `screen.update()` produz `['due', 'idle']` no Tk, mas `['idle', 'due']` no backend.

A versão inicialmente revista também congelava relógio/sequence antes do despacho: se `first` agenda `second` com zero, um único `update()` produzia apenas `['first']`, enquanto Tk produzia `['first', 'second']`. A remoção desse snapshot foi revalidada e corrige a cadeia finita. A fila idle separada também corrigiu a prioridade do timer que já estava vencido antes do despacho.

A segunda revalidação encontrou a fronteira da geração idle: dois callbacks idle já estão enfileirados; o primeiro dorme 80 ms e há um timer de 40 ms. Tk imprime `['idle-first', 'idle-second', 'positive']`, enquanto a nova implementação imprime `['idle-first', 'positive', 'idle-second']`. O teste de vencimento a cada callback antecipa o positivo para dentro de uma geração idle que o Tk conclui antes de retornar ao processamento de timers. É necessário preservar essa unidade de despacho e ainda permitir `update()` reentrante consumir o trabalho elegível.

Modelar separadamente callbacks idle e timers positivos vencidos; esgotar trabalho elegível com a ordem/reentrância do Tk, sem impor uma troca silenciosa de semântica para limitar execução. Eventuais cotas devem gerar diagnóstico explícito e preservar a possibilidade de Parar. Acrescentar os dois programas portáveis ao comparador desktop/backend, incluindo timer que se torna vencido durante outro callback.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado com CPython 3.14.2 em subprocessos desktop/backend, sem navegador. A fila idle agora conserva uma geração por sequência, mantendo a fila compartilhada para chamadas reentrantes. Cadeia zero, positivo previamente vencido, positivo que vence durante uma geração idle e reentrância coincidem com Tk. Harness fresco: dez pares aprovados em engine-1792192825333614600.json. Prova independente adicional: callback agenda novo idle, dorme até vencer positivo e chama update; ambos imprimem `['first', 'positive', 'old-idle', 'new-idle', 'first-resumed']`.
