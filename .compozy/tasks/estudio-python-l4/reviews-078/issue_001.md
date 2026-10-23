---
status: resolved
file: packages/studio/src/python/language/analyzer.py
line: 134
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Fatos completos omitem bindings de parâmetros genéricos

## Review Comment

O extrator adicionava ast.Name(Store), ast.arg, nomes de funções/classes/imports/patterns, mas não os parâmetros genéricos PEP695. CPython representa seus bindings em ast.TypeVar, ast.ParamSpec e ast.TypeVarTuple, cujo campo name é string e portanto não chega ao caso Name(Store). Assim `def identity[T](value: T)`, `class Bucket[T]`, `type Pair[T]`, `def invoke[**P, R]` e `class Bucket[*Ts]` compilavam, recebiam fatos apresentados como completos e omitiam T/P/R/Ts de assignedNames.

Isso viola a intenção declarada de bindings sintáticos completos e poderia futuramente permitir que uma regra negativa tratasse um binding presente como ausente. Não é alegação de consumidores de atividades já ligados: o defeito está no contrato/extrator deste sublote.

Reprodução independente anterior ao patch com CPython3.14.2 real, operação structure do analyzer.py real: `.cache/studio-python-l0/review078-type-parameter.py` retornou ok/diagnostics[] nos cinco casos, mas assignedNames continha apenas identity/value, Bucket/value, Pair, args/invoke/kwargs e Bucket, respectivamente. O implementador confirmou que parâmetros genéricos fazem parte do contrato; não são exceção intencional.

Adicionar os nomes de ast.TypeVar/ParamSpec/TypeVarTuple ao caminho comum de bindings, preservando deduplicação e os mesmos limites de nome/categoria/total/bytes. Não confundir parâmetros genéricos com funções nomeadas, nem resolver/evaluar seus bounds ou defaults.

## Triage

- Decision: `VALID`
- Notes: Implementador corrigiu o extrator incluindo os três tipos e acrescentou caso permanente nativo. Revalidação independente do patch: CPython3.14.2 real no cache acima, exit0, cinco casos agora incluem todos os bindings; parâmetro de257chars rejeita estrutura sem resultado parcial, enquanto compile legado dos mesmos bytes continua válido e sem facts. definedFunctions permanece limitado às funções reais. `bun scripts/verify-python-structure.ts ../../.cache/studio-python-l0/cpython-3.14.2/python.exe`, cwd Studio, exit0/20casos passando pelos leitores/schema. Core9/58, Studio13/55 e serviço20/103 exit0. Fechamento apenas desta causa no extrator nativo; revisão/sublote estrutural seguem abertos até a prova WASM real exigida, sem alegação de imagem/manifest novo ou consumidores qualificados. Nenhuma fonte/teste de produção alterado pelo revisor.

### Confirmação posterior no WASM real

Conferência independente dos artefatos da SDKstructure2 executada pelo implementador: `.cache/studio-python-l0/inspection-sdk/0a140be9-49ab-4c91-8cbe-4e511e57c336/`, exit0, quatro arquivos com fatos completos. `bindings.py` inclui T/jogar/p/t/valor, função jogar, alvos factory/range/t.forward e flags de comprehension/filter; `encoding.py` Latin-1 preserva ação. Core revalida o report contra o seed exato, marker/deployment e hashes dos bytes, incluindo analysis-worker.mjs/inspect.mjs; cleanup.after vazio. Probe independente `.cache/review078-wasm-artifacts.ts` exit0.

Browser real Chrome/Edge executado pelo implementador: `.cache/studio-python-runtime/runs/l6-structure-browser-1/{report.json,artifacts}`, seis casos passaram sem skip/retry. A conferência independente decodifica todos os anexos inspection e recria os payloads pela fixture REAL com a distribuição exata do browser (runtime a2b0cb30604b5b2adaaef47426c39b54b9997ca25e880006e43e8eeeddd04bc2; distribution fcb76a100a0950b47cbfaa746d95551c33daa262a7d7e2542be497350557896c), revalidando pelo Core. O caso structure comprova Alias[T] e jogar[U], comprehension/filter, alvos sintáticos e arquivo vazio; modo legado omite fatos, e return fora da função falha a compilação. Probe `.cache/review078-browser-artifacts.ts` exit0.

Com essas provas, a revisão deste sublote estrutural está encerrada, mantendo escopo: não é conclusão da feature global, ligação de consumidores, desempenho ou Cloudflare remoto. O revisor conferiu artefatos e executou somente testes leves/nativo CPython; não reexecutou SDK/Docker/browser.
