---
status: resolved
file: packages/pinta/src/export/tiled/import.ts
line: 144
severity: medium
author: codex
provider_ref:
---

# Issue 021: Cor opaca muda de representação após reexportar no Tiled real

## Review Comment

O ensaio real do Tiled 1.12.2 preservou os dois mapas, mas a comparação exata encontrou `#20a0ff` convertido para `#20a0ffff`. O Tiled escreve a cor como ARGB `#ff20a0ff`; o importador convertia corretamente para RGBA, porém conservava o alfa opaco redundante. A semântica visual permanecia igual, mas o roundtrip canônico tinha drift.

## Triage

- Decision: `VALID`
- Fix: conservar a conversão ARGB→RGBA e omitir apenas o alfa `ff` opaco, inclusive quando escrito em maiúsculas. Alfa parcial ou zero continua presente. Sem alteração do formato nativo.
- Minimal related test edit: a expectativa antiga em `tiled/import.test.ts` para ARGB preto opaco passou de `#000000ff` para `#000000`, refletindo a normalização intencional. Nenhuma outra expectativa foi relaxada.

## Remediation and Verification

- Red: o teste novo esperava `#20a0ff` e recebeu `#20a0ffff`.
- Green: `cd packages/pinta && bun test src/export/tiled/review-regressions.test.ts`: 7 pass, 0 fail, 42 assertivas. Cobre ARGB opaco minúsculo/maiúsculo, semialfa `80`, transparente `00`, RGB de seis dígitos, JSON, TMX e novo roundtrip canônico.
- Reprodução do artefato externo já gerado: `bun .tmp/pinta-tiled-diff.ts` retornou `warnings: []` e `diffs: []`. O executável Tiled foi rodado pelo coordenador antes desta correção; este comando reimporta seu resultado real, não roda novamente o executável.
- Biome dos arquivos alterados e `git diff --check` passaram. Gate global delegado ao coordenador; status valid até esse gate. Sem commits.

## Fechamento da rodada

Normalização de alfa opaco coberta pela suíte completa do Pinta e pela comparação integral dos dois mapas reexportados pelo Tiled real, sem diferenças/avisos.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
