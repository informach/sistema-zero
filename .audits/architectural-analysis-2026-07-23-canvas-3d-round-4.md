# Auditoria arquitetural — Canvas 3D (rodada 4)

Data: 2026-07-23

## Escopo

Categoria núcleo Canvas 3D: catálogo e curadoria de blocos, Blockly/IR/Ponte, imports de addons, lifecycle, seletores tipados, macros, preview/importmap, documentação e runtime leve de física.

## Achados

### P3 — Resolvedor exclusivo do modo automático ficou sem consumidor

**Status: corrigido em 2026-07-23.** O wrapper sem referências foi removido; o resolvedor unificado permanece como única rota de imports Canvas 3D.

`resolveCanvas3DAutomaticAddonImports` em `packages/studio/src/three/canvas3dAddons.ts:164` apenas delega para o resolvedor unificado, mas não é importado nem chamado. A centralização recente passou `buildIR` a usar `resolveCanvas3DAddonImports(names, module)` para cobrir tanto o marcador automático quanto caminhos explícitos da Ponte.

Impacto: não altera o comportamento atual, mas mantém uma API interna morta e sugere que existe uma segunda rota de resolução.

Recomendação: remover esse wrapper e o tipo exportado que só o suporta, se não houver consumidor externo planejado. O módulo não integra a API pública de `src/index.ts`.

## Itens verificados sem achados

- Os 18 addons do catálogo exportam o símbolo declarado no `three@0.180.0` instalado; o catálogo, importmap e versão pinada usam a mesma versão.
- A documentação de preview está alinhada: DRACO/KTX2 fora do picker, Pointer Lock oferecido e descrito como dependente de gesto.
- O fluxo Canvas → cena → renderizador → câmera → luz permanece separado do elemento Canvas, conforme o contrato da categoria.
- Lifecycle, contexto léxico da Ponte e seletores continuam usando o mesmo índice tipado de recursos Canvas 3D.
- Macros preservam checksum/versionamento e o kernel de física continua separado do código didático.
- Não houve ciclo de dependência, duplicação funcional relevante, uso de `any`/supressões de tipo nem inconsistência de catálogo confirmados no escopo.

## Verificação executável

- Matriz Canvas 3D/Three: 22 arquivos, **141 testes, 875 expectativas, 0 falhas**.
- `bun run typecheck`: aprovado.
- Build de produção Vite: aprovado.
- Playwright `e2e/canvas3d.spec.ts`: **3/3 aprovados**.
- `bun run check`: bloqueado por formatação pré-existente fora do escopo em `official-extensions/world-3d/__tests__/blockAudit.test.ts`; há também um aviso informativo em `game-3d-advanced/__gen_chefao.ts`.
