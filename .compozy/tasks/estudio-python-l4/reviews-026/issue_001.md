---
status: resolved
file: packages/studio/src/python/language/sourceCopies.ts
line: 100
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Não ativar uma declaração de encoding ao preservar comentários

## Review Comment

Preservar texto e categoria COMMENT não basta para preservar o papel do comentário. A remoção de um comando podia transformar seu comentário de fim de linha em declaração de encoding ativa nas primeiras linhas. A comparação AST usa strings Unicode e não vê a diferença de decodificação do arquivo UTF-8 no CPython.

Reprodução independente com analyzer nativo exato e preparePythonVisualTransaction real: remover primeiro comando de `x = 1 # coding: ascii\nprint("ação")\n` é aceito e produz `# coding: ascii\nprint("ação")\n`. O original compila a partir de bytes UTF-8; o candidato falha com `'ascii' codec can't decode byte 0xc3`. Somente compile foi chamado, sem executar fonte autoral.

Impedir mudança da declaração de encoding efetiva, incluindo as regras de posição das duas primeiras linhas. Recusar a movimentação sem alterar silenciosamente comentários ou o formato do arquivo.

## Triage

- Decision: `VALID`
- Notes: Implementador acrescentou guarda de cookie efetivo em assertPythonCommentsPreserved, com prefixo de comentário e elegibilidade da segunda linha. Nenhuma implementação alterada pelo revisor.

## Verification

- Revalidação independente da mesma transação com analyzer CPython3.14.2: novas declarações ascii, latin-1 e utf-8 são recusadas com mensagem de codificação. A política é conservadora mesmo quando ativar utf-8 não mudaria a decodificação.
- Controle com comentário comum continua aceito, conserva COMMENT e o candidato compila como bytes UTF-8. Resultado: blockedNewEncodingCookies=3, ordinaryCommentPreserved=true, ordinaryCandidateUtf8Compiles=true, exit0.
