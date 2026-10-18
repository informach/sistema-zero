---
status: resolved
file: packages/studio/src/activity/python.ts
line: 124
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Atividade só estrutural ignora receita explicitamente exigida

## Review Comment

O shortcut checks.every(kind===structure) retorna a nota após inspeção, sem verificar se existe recipe. O contrato aceita receita explícita com stdin, keys/clicks ou requireGraphics e o scope exige Turtle quando necessário. Mesmo assim, atividade somente estrutural pode devolver100/passed sem consumir entrada ou produzir o desenho requerido. A intenção confirmada é cumprir a receita inclusive quando as checagens são somente estruturais.

Prova independente `bun test ./.cache/review091-structure-recipe.test.ts`, cwd Studio, processo Bun isolado com HappyDOM. Runner, snapshot/hash, inspeção e verificadores Core reais; somente porta de análise retorna fatos completos controlados. Projeto whileFalsepass com Turtle instalada, gate100/usesLoop e recipe stdinLia/requireGraphics true. Retorna grade100/passed, analyses1/executions0, apesar de registry.load não poder executar nem capturar. Exit1/0pass1fail/2asserts. Ruído inicial de iframeHappyDOM desabilitado foi removido apenas no cache com restore local; reprodução final é sem esse ruído. Não se atribui prova CPython/browser/SDK à porta de análise sintética.

Permitir otimização puramente estrutural apenas quando nenhuma receita exigir execução/observação, ou cumprir a receita completa antes de aceitar a nota. Receita explícita não deve desaparecer silenciosamente. Preservar fluxo realmente estrutural sem receita, para que não passe a executar programas desnecessariamente.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. Shortcut agora exige ausência de recipe. Repro independente atualizado recusa receita quando execução/captura não existem, preserva purestructure semrecipe analysis-only e passa ordem controles/observação (3pass/10asserts exit0). Browser8 56284241-2444-406d-9709-15a224a5b92e Chrome/Edge consumidor structural tem stdinLia+requireGraphics, executionFrames1, grade100 e framesRemaining0; consumidor invalid tem score0/execFrames0. Fonte/critério/ordem e recipe SHA verificados independentemente no archive; captura consumer não arquivada, prova de requireGraphics depende do caminho obrigatório no runner. Não qualifica Members WIP/servidor/performance.
