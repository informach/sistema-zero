---
status: resolved
file: packages/studio/src/python/language/analyzer.py
line: 67
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Conversão de posições tem custo quadrático em linhas longas

## Review Comment

Cada posição de token/nó recodifica a linha inteira para UTF-8 e/ou seu prefixo para UTF-16. Uma linha grande com muitos nós repete esse trabalho milhares de vezes, mesmo que o documento permaneça abaixo das cotas de bytes, nós, tokens e profundidade. O deadline do worker encerra a operação depois do custo acumulado, mas não resolve a ineficiência do algoritmo.

Prova independente em CPython 3.14.2 com a implementação real: uma lista de 3.000 números e primeiro literal com 0, 100.000 e 500.000 caracteres demorou respectivamente 0,067 s, 0,495 s e 6,07 s. Todos os resultados retornaram ok, com 6.007 tokens. Um caso que também cabe no teto Pro de 256.000 caracteres (`x = ["` + 220.000 caracteres a + `",` + 9.000 números 1 separados por vírgula + `]\n`) contém 238.009 bytes e 18.007 tokens; levou 4,235 s nativo. A fase de análise tem deadline externo de 3 s. Não foi realizado ensaio browser deste caso; o resultado nativo já confirma trabalho desproporcional antes de considerar o custo WASM.

Construir os mapas de coluna por linha uma única vez, convertendo índices codepoint/UTF-8 para UTF-16 por consulta limitada. Preservar mapeamento de CRLF e astral. Acrescentar prova com literal longo seguido de milhares de nós, sem relaxar a cota nem aumentar o timeout para ocultar a causa.

## Triage

- Decision: `VALID`
- Notes: Corrigido pela implementação e revalidado independentemente. O analisador constrói mapas compactos por linha, uma única vez, de fronteiras codepoint/UTF-8 para UTF-16; cada posição usa consulta ao mapa. Cotas e deadlines permanecem inalterados. O mesmo caso de 238.009 bytes retornou em 238 ms na reprodução independente (uma amostra diagnóstica, não um percentil), com SHA-256 do resultado integral `98986cfa355bb61b644245ac75126c10303dd337791d52768bddb89a1387c00c`, idêntico ao baseline anterior. Conformance nativa fresca: 12/12 formas, incluindo intervalos AST/tokens em Unicode e CRLF; testes TypeScript frescos: 5 pass / 27 verificações, exit 0. Os relatórios de 3 aquecimentos e 10 medições do implementador foram inspecionados: baseline p50/p95 3538/4726 ms e otimizado 164/171 ms, com o mesmo hash integral. O revisor não executou browser nem infere desempenho browser destas medições nativas.
