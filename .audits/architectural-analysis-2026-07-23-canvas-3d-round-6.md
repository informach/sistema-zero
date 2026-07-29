# Auditoria arquitetural — Canvas 3D (rodada 6)

Data: 2026-07-23

## Escopo

Categoria núcleo Canvas 3D: catálogo de blocos, níveis, toolbox, fluxo Canvas → cena → renderizador → câmera → luz, contratos de recursos e lifecycle, Blockly/IR/gerador/parser/Ponte, addons, macros, preview e documentação.

## Resultado

**Nenhum achado acionável.**

## Itens verificados

- Os 67 blocos têm correspondência única entre contrato, catálogo, grupos da toolbox e curadoria por nível.
- Canvas continua responsável pelo elemento `<canvas>`; Canvas 3D oferece, separadamente, cena, renderizador, câmera e iluminação.
- Blockly, IR, gerador, parser e workspace state usam os mesmos papéis de recursos e preservam o round-trip, inclusive macros, loaders, física leve e imports de addons.
- Catálogo de addons, importmap centralizado, pin do Three.js e limites do preview seguem consistentes com a documentação.
- Não foram encontradas rotas mortas, duplicação funcional, ciclos de dependência, supressões de tipo ou `any` no escopo.
- Alguns aliases de tipo são internos aos próprios módulos; eles dão nome a contratos locais e não representam código morto em runtime.

## Nota de execução E2E

Uma execução concorrente observou uma captura WebGL uniforme no primeiro cenário visual, sem erro de página e com contexto WebGL válido. A reprodução isolada do mesmo cenário e uma nova execução isolada dos três cenários passaram; não houve alteração de código e a oscilação não é reproduzível como defeito do Canvas 3D.

## Verificação executável

- Matriz Canvas 3D/Three: 22 arquivos, **141 testes, 875 expectativas, 0 falhas**.
- `bun run typecheck`: aprovado.
- Biome nos módulos Canvas 3D: aprovado.
- Playwright `e2e/canvas3d.spec.ts`: **3/3 aprovados** no Chromium.
