# Revisão A — contrato/grading Python

Escopo python-activity.ts/test e dependências structure/project-json/playtest, plano18/10 A e proposta seção12. B/C explicitamente pendentes, não tratados como omissões. Nenhum fonte de produto ou teste permanente alterado pelo revisor; nenhum browser/TSC/SDK/Docker/workerd executado.

Antes: `bun test ./.cache/review087-activity.test.ts`, cwd packages/core, exit1/1pass2fail/1261asserts. CPython3.14.2 real analyzer.py sobre bytes completos comprova NFKC dos nomes mas grading estrutural dava0 ao gate100; JSON.parse literal __proto__ aceito perdia chave nos três caminhos. Dedupe: não existem issues anteriores desses contratos;078typeparams/038Pyright/085preview são raízes distintas.

Depois, originais e extensões: `bun test ./.cache/review087-activity.test.ts ./src/studio/python-activity.test.ts ./src/studio/python-inspection.test.ts`, cwd packages/core, exit0/19pass/0fail/1385asserts. Prova própria usa CPython3.14.2 nativo fixado e analyzer REAL, somente compilação/estrutura; nenhuma execução do aluno. SHA dos bytes/revisão Core e relatório completo vinculam avaliador. Nomes Kelvin/decompostos e target pontuado normalizados correspondem aos fatos e score100; limites pós-NFKC mantidos. Valores JSON conservam chaves especiais aninhadas, são detached e não poluem protótipo; negativos de valores inválidos, getters/ciclos/depth/tamanho continuam recusados.

Matriz própria25combinações de pesos×100thresholds: toda definição aceita mantém peso estrutural suficiente para negar aprovação sócom comportamento forjado. Feedback exato/ordem/kind, cliente não pode conferir server, resultado estrutural fornecido pelo caller de evidência, scope perfil/Turtle e limites/schema estrito conferidos. Não há claim de autoridade servidor por relatório do aluno.

`bunx biome check src/studio/python-activity.ts src/studio/python-activity.test.ts src/studio/python-activity-structure.ts src/studio/python-inspection.test.ts`, cwd Core, exit0/4files/no fixes. Comandos iniciais sem ./cache e uma tentativa em cwd raiz não descobriram testes e foram corrigidos; não são prova de aprovação nem bugs de produto. Apenas comandos finais acima fundamentam fechamento.

Ambos achados medium VALID/resolved, metadata2/2/0. Contrato A revalidado; consumidores, executor WASM, integração servidor e featureglobal continuam fora desta conclusão. Nenhum processo próprio ativo.
