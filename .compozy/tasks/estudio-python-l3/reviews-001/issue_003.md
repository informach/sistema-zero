---
status: resolved
file: packages/studio/src/runtime/python/interpreter.ts
line: 59
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Limites Python e TypeScript usam unidades Unicode diferentes

## Review Comment

interpreter.py limita repr/traceback com slices de strings Python, medidos em codepoints; readResult limita os mesmos campos pelo length TypeScript, medido em unidades UTF-16. Caracteres fora do BMP ocupam duas unidades UTF-16. Assim uma resposta que respeita o limite Python é recusada pelo leitor TypeScript e vira uma falha genérica do interpretador, perdendo o resultado ou diagnóstico original. json.dumps usa ensure_ascii por padrão, ampliando também o envelope com escapes Unicode.

Reprodução real com `raise ValueError('🐢' * 10000)`: execute produziu JSON com 168.235 unidades UTF-16, text com 8.000 e traceback com 20.174. O leitor admite, respectivamente, 160.000, 8.000 e 16.000. O envelope e o traceback válidos segundo o produtor são recusados. O mesmo desacordo afeta repr de resultados REPL com caracteres fora do BMP.

Definir uma única unidade para as cotas e alinhar produtor, envelope serializado e consumidor; truncar apenas entre caracteres completos. Testar erro e resultado REPL com ASCII, acentos, emojis e limites exatos, preservando a resposta truncada em vez de transformar texto longo em indisponibilidade do runtime.

## Triage

- Decision: `VALID`
- Notes: Corrigido por `_bounded_text`: produtor mede as cotas em UTF-16, trunca entre caracteres completos e sinaliza truncamento. O traceback conserva o início, incluindo os caminhos da fonte. O limite do envelope continua suficiente para os escapes de json.dumps. Nenhuma fonte foi alterada pela revisão.
- Verification: Rodada real de 28 testes, 14 Chrome + 14 Edge, todos aprovados, sem retry/flaky/skipped; relatório `.cache/studio-python-runtime/playwright.json`, início `2026-10-16T22:13:10.701Z`, distribuição `e90b2e7f273fe07d50df0000ed76392d0890792b88a57dbbe4a2d51213a3c37a`. Os testes cobrem erro Unicode com caminho de fonte e resultado REPL longo com emojis. Reprodução independente do erro original agora produziu JSON com 119.199 unidades UTF-16, text com 3.999 e traceback com 16.000, todos dentro dos limites. Mais 30 combinações de limites e textos vazios/ASCII/acentos/emojis/mistos respeitaram a cota sem terminar em high surrogate isolado.
