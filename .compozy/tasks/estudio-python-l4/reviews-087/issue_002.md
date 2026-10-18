---
status: resolved
file: packages/core/src/studio/python-activity.ts
line: 35
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Schema modifica silenciosamente valores JSON aceitos

## Review Comment

O pré-copy iterativo preserva chaves próprias com defineProperty sem prototype setters, mas o z.record recursivo descarta a chave JSON __proto__ silenciosamente. Isso modifica args e expected de testcase e value de globalEquals durante a leitura de uma atividade aceita. Um teste Python que recebe ou retorna um dicionário com essa chave passa a receber/comparar outro valor, podendo aprovar ou reprovar por critério diferente do autor. Não é uma alegação de prototype pollution ou execução de chave.

Prova independente `bun test ./.cache/review087-activity.test.ts`, cwd packages/core. Entrada criada com JSON.parse: {"__proto__":{"safe":true},"constructor":2,"toString":3}. StudioPythonActivitySchema.parse aceita os três usos, mas imprime {"constructor":2,"toString":3} em testcase.args[0], testcase.expected e behavior.globalEquals.value. JSON.stringify e Object.hasOwn demonstram perda; o protótipo global permanece intacto. Resultado geral1pass2fail/1261asserts exit1; Unicode é issue001 separada. Permanentes activity+inspection13/88 e Biome3 passam, portanto não é falha de lint nem de teste existente.

Preservar integralmente as chaves dos valores JSON aceitos usando a cópia segura já limitada, ou rejeitar explicitamente nomes não suportados antes de aceitar a atividade. Nunca converter silenciosamente o valor do professor/aluno. Cobrir args, expected, globalEquals e chaves aninhadas sem relaxar proteção contra getters/ciclos/protótipos.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e substituiu z.record recursivo por descriptor-copy limitado e validação iterativa tipada. Prova original agora conserva __proto__/constructor/toString nos três caminhos; extensão aninhada conserva chave própria e cópia detached após mutação da entrada. Undefined, NaN/Infinity, BigInt, function, Date, getter, ciclo, profundidade, string e array acima do limite continuam recusados; getter não executa e Object.prototype não recebe chave. Suite própria+permanentes19pass/0fail/1385asserts exit0; Biome4 exit0. Não é relaxamento de prototype pollution nem qualificação de executor; fontes/testes permanentes intactos pelo revisor.
