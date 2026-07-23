# Auditoria arquitetural — Canvas 3D (rodada 5)

Data: 2026-07-23

## Escopo

Categoria núcleo Canvas 3D: catálogo de 67 blocos, níveis e toolbox, fluxo Canvas → cena → renderizador → câmera → luz, contratos de recursos e lifecycle, Blockly/IR/gerador/parser/Ponte, addons, macros, preview e documentação.

## Achados

### P3 — Detector legado de uso Canvas 3D não tem consumidor

**Status: corrigido em 2026-07-23.** A função e seu conjunto exclusivamente associado foram removidos; o catálogo semântico usado pelo gerador foi preservado.

`CANVAS3D_SEMANTIC_STATEMENT_TYPE_SET` e `statementUsesCanvas3D`, em `packages/studio/src/three/canvas3dContract.ts:641` e `:655`, não são importados nem chamados fora da própria implementação. O conjunto só existe para a função, e a função não participa mais da reconstrução IR → Blockly: essa responsabilidade passou ao índice contextual usado por `workspaceState` e pelos seletores tipados.

Impacto: não altera a geração nem o preview, mas mantém uma rota conceitual morta para detectar Canvas 3D e aumenta a superfície do contrato interno.

Recomendação: remover a função e o conjunto associado. `CANVAS3D_SEMANTIC_STATEMENT_TYPES` deve permanecer, pois o gerador ainda o usa para encapsular macros e runtime.

## Itens verificados sem achados

- Os 67 blocos estão presentes uma única vez no contrato, no catálogo e nos grupos da toolbox; a curadoria separa facilitadores intermediários das peças técnicas avançadas.
- O percurso manual mantém o Canvas como dono do elemento `<canvas>` e Canvas 3D como dono de cena, renderizador, câmera e luz.
- Declarações, referências tipadas, seletores e validação da IR concordam sobre telas, cena, renderizador, câmera, luz, objetos, loaders, efeitos e física leve.
- O catálogo de addons, o importmap e o pin `three@0.180.0` estão centralizados; as limitações de preview documentadas correspondem ao picker e ao sandbox.
- Macros, kernel de física e faixas internas da Ponte preservam versionamento, checksum, round-trip e ocultação correta do código gerado.
- Não foram encontrados ciclos de dependência, duplicações funcionais confirmadas, uso de `any` ou supressões de tipo que afetem o escopo.

## Verificação executável

- Matriz Canvas 3D/Three: 22 arquivos, **141 testes, 875 expectativas, 0 falhas**.
- `bun run typecheck`: aprovado.
- Build Vite de produção: aprovado.
- Playwright `e2e/canvas3d.spec.ts`: **3/3 aprovados** no Chromium.
