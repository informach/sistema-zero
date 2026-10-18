---
status: resolved
file: packages/studio/e2e-runtime/python-runtime.spec.ts
line: 105
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Golden aceita hashes diferentes dos resultados de referência

## Review Comment

A fixture calcula hashes da fonte recuperada por inspect e do traceback, mas o teste aceita quaisquer dois hashes hexadecimais. Dessa forma a saída pode mudar entre baseline e distribuição pré-compilada e a suíte ainda aprova a alegação de preservação; o teste não faz a comparação que esses hashes foram introduzidos para permitir. Uma string com 64 letras a e 64 letras b passa no predicado atual, embora não corresponda aos resultados reais de referência.

Os anexos foram comparados independentemente: a baseline válida de 22:57:01 e a distribuição otimizada de 22:57:56 geraram os mesmos hashes nos dois navegadores: c66c59735e9f502ab02d7bed190e04b8e9842b8d117afd8750209c511d4cc632 para a fonte e 853c73dd0f702114c7b495354569e5d2a8fdec2706ac627aeff627c6568ae74c para o traceback. Portanto a equivalência observada está preservada; o defeito é que a prova automatizada não a exige nas próximas execuções.

Fixar os valores obtidos da baseline válida no golden ou comparar os resultados das duas distribuições por um verificador explícito. Uma atualização futura da fixture/runtime deve exigir revisão consciente do golden, em vez de aceitar qualquer hash com o tamanho correto.

## Triage

- Decision: `VALID`
- Notes: Gap confirmado na validação do teste, sem diferença semântica observada nas duas distribuições atuais. A rodada otimizada salva contém 56 testes aprovados e nenhuma falha/flaky/skipped.

- Resolution: A spec usa igualdade exata com os dois hashes obtidos da baseline. O literal atual foi comparado independentemente com os quatro anexos salvos (baseline/otimizada, Chrome/Edge): todos coincidem; hashes diferentes são recusados.
- Verification: Código corrigido lido integralmente; reproduções independentes passaram. Fontes não foram modificadas pela revisão.
