---
status: resolved
file: packages/studio/src/runtime/python/turtle/renderer.ts
line: 278
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: Fechar uma tela impede criar outra na mesma execução

## Review Comment

`close` marca permanentemente o renderer como fechado, aborta seus listeners e remove o canvas; qualquer operação posterior é recusada. Porém `Screen.bye()` libera o singleton Python e a API oficial permite uma nova chamada de `Screen()` dentro da mesma execução. O backend novo reinicia IDs, mas o renderer permanece associado à tela encerrada.

Prova Tk real: `s.bye(); s = turtle.Screen(); print(s.window_width() > 0)` imprime True. Em execução isolada do renderer, `close` seguido da criação inicial de item de uma nova tela lança `A tela Turtle foi fechada.`. Isso também impede reabrir a tela pelo console depois de encerrá-la.

Representar explicitamente o ciclo de vida de tela dentro da geração de execução, com reset de cena/IDs/recursos e novos listeners/canvas quando uma nova Screen válida for criada. Não reativar a autoridade após Stop/dispose, que continuam terminais para a execução inteira. Qualificar bye→Screen tanto no programa quanto no REPL, incluindo entrada e imagens da tela anterior sem efeitos residuais.

## Triage

- Decision: `VALID`
- Notes: Corrigido com operação open emitida pelo construtor de Screen; releaseScreen limpa recursos/IDs/entrada e a abertura cria listeners novos, sem reativar dispose terminal. Provas reais Chrome/Edge conferidas em runs/2026-10-16T23-33-04.863Z/report.json: Screen→bye→Screen termina normalmente e novo canvas pinta vermelho. Não se afirma que todas as variações de REPL/telas estejam qualificadas por esse único caso.
