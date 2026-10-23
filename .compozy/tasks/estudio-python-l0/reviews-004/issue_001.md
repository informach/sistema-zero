---
status: resolved
file: experiments/studio-python-l0/reference-runner.mjs
line: 50
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Timeout pode deixar descendentes e interrupção continua testes

## Review Comment

O timeout de spawn encerra só o Node filho, sem garantir encerramento de Bun/browser. O finally do filho não executa em término forçado. Além disso o README promete interrupção ao fechar a janela, mas o runner continua a próxima etapa após a falha do probe. Controlar a árvore própria no timeout, confirmar término, não continuar após falha/interrupção e documentar o mecanismo real de interrupção. Preservar diagnóstico mesmo em timeout.

## Triage

- Decision: `VALID`
- Notes: `reference-process.mjs` encerra a árvore do PID que criou com taskkill /T /F no timeout; o runner interrompe a sequência após falha e preserva relatório. `reference-process.test.mjs` confirma o término de pai e descendente reais e a saída normal. README descreve a interrupção suportada. Nove testes Node passaram; nenhum processo alheio é selecionado pelo nome.
