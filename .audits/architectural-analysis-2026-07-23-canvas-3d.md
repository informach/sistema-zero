# Full review e correção — categoria Canvas 3D do `packages/studio`

Data: 2026-07-23  
Escopo: categoria de núcleo **Canvas 3D** — toolbox, blocos, progressão, Blockly, IR/SZIR, gerador JavaScript, parser, Ponte, seletores tipados, preview Three.js, macros semânticos, física leve e integração com a categoria Canvas.

## Parecer executivo

Os **8 achados reproduzíveis** da revisão foram corrigidos: **2 High, 3 Medium e 3 Low**. As correções preservam a proposta da categoria: o aluno cria o elemento `canvas` pela categoria Canvas e monta cena, renderizador, câmera e iluminação separadamente em Canvas 3D.

O inventário e a progressão continuam alinhados, a Ponte mantém construtores externos em Programação, recursos persistentes não podem mais ser criados por quadro por meio de uma expressão aninhada, e as regressões de física, macros, seletores e addons estão cobertas por testes.

## Alinhamento confirmado

- Canvas 3D continua sendo uma **categoria de núcleo**, não uma extensão.
- O fluxo manual continua sendo `Canvas → cena → renderizador → câmera → iluminação → render`.
- A categoria Canvas permanece disponível para criar o elemento HTML usado pelo renderizador.
- Os blocos técnicos e facilitadores continuam separados segundo a progressão pedagógica existente.
- Blockly, SZIR, JavaScript, Ponte, preview e seletores tipados permanecem integrados.
- O preview usa a versão pinada de Three.js e mantém os limites defensivos documentados.

## Achados corrigidos

| ID | Severidade | Correção | Regressão |
|---|---|---|---|
| C3D-001 | High/P1 | A validação de lifecycle agora percorre expressões aninhadas e rejeita construtores persistentes dentro de loops, sem bloquear valores temporários como `Vector3`. | `canvas3dSafety.test.ts` |
| C3D-002 | High/P1 | Colisões com esfera calculam normal e separação determinísticas, inclusive no centro exato, e marcam suporte superior como `grounded`. | `physicsLiteRuntime.test.ts` |
| C3D-003 | Medium/P2 | Somente `THREE.X` ou addons realmente importados de Three usam blocos Canvas 3D; `PIXI.Application` e `API.Client` permanecem genéricos. | `canvas3dSelectors.test.ts` |
| C3D-004 | Medium/P2 | Declarações genéricas com `new THREE.X()` preservam capacidades 3D no coletor de símbolos e nos pickers. | `programmingSymbols.test.ts`, `FieldNamePicker.test.ts` |
| C3D-005 | Medium/P2 | O codec de macros v2 usa framing por comprimento; sentinelas presentes no conteúdo do aluno não encerram o macro. | `canvas3dMacroCodec.test.ts` |
| C3D-006 | Low/P3 | A integridade v2 cobre payload semântico e corpo expandido; macros legados continuam compatíveis. | `canvas3dMacroCodec.test.ts` |
| C3D-007 | Low/P3 | Contatos físicos usam chaves com comprimento prefixado, eliminando ambiguidade para IDs contendo `|`. | `physicsLiteRuntime.test.ts` |
| C3D-008 | Low/P3 | `LineMaterial` foi incluído entre os materiais aceitos pelo bloco de cor. | `canvas3dAudit.test.ts` |

## Decisões arquiteturais

- A classificação de construtores ficou baseada na origem real (`THREE` ou addon importado), não na mera presença de namespace.
- A regra de lifecycle passou a considerar a árvore completa de expressões do statement.
- Valores matemáticos temporários possuem uma allowlist explícita; os demais construtores Three/addons são tratados conservadoramente como recursos persistentes.
- O framing de macro v2 não depende de procurar a sentinela de fim no conteúdo do aluno e autentica metadado e código juntos.
- A codificação interna de pares físicos não restringe os IDs válidos oferecidos pela interface.

## Verificação final

| Verificação | Resultado |
|---|---|
| regressões diretamente alteradas | PASS — 191 testes, 842 expectativas, 0 falhas |
| matriz ampliada Canvas 3D | PASS — 272 testes, 1.194 expectativas, 0 falhas |
| `bun test src` | PASS — 5.258 testes, 48.469 expectativas, 317 arquivos |
| `bun run check` | PASS — 798 arquivos, sem correções; 1 warning alheio em teste de Jogo 3D |
| build Vite do playground | PASS — 1.526 módulos |
| `bunx playwright test e2e/canvas3d.spec.ts` | PASS — 3/3 em Chromium |
| `git diff --check` | PASS |
| `bun run typecheck` | BLOQUEADO fora do escopo — somente erros em testes já alterados de `official-extensions/game-3d`; nenhum diagnóstico nos arquivos Canvas 3D corrigidos |

## Estado da revisão

**Aprovado no escopo Canvas 3D.** Todos os achados desta rodada estão corrigidos e possuem cobertura automatizada. O typecheck global do worktree ainda depende da correção de testes não relacionados da extensão Jogo 3D; esses arquivos foram preservados por pertencerem a mudanças externas a esta tarefa.

Issues detalhadas e a evidência de QA estão em `.audits/canvas3d-review/qa/`.
