# Auditoria arquitetural — Canvas 3D (rodada 3)

Data: 2026-07-23

## Escopo

Revisão da categoria núcleo **Canvas 3D** (não extensão): catálogo de blocos, progressão Canvas → cena → renderizador → câmera → luz, Blockly/IR, parser e Ponte, gerador, lifecycle, referências tipadas, addons, macros, preview e regressões de browser.

## Achados

### P1 — A Ponte aceita e reemite um addon conhecido apontado para o módulo errado

**Status: corrigido em 2026-07-23.** A normalização agora separa nomes conhecidos por seus módulos canônicos mesmo quando o caminho chegou explícito; addons livres preservam o caminho manual. A validação da SZ-IR também recusa pares conhecidos incompatíveis.

O bloco/IR `importNamed` conhece tanto o nome do addon quanto o caminho de módulo, mas só normaliza a combinação quando `MODULE` é o marcador `automático`. Para um caminho explícito, o parser aceita qualquer par `names`/`module`, o schema só rejeita módulo vazio ou o marcador, e o gerador emite a declaração sem validar os exports.

Reprodução confirmada:

```ts
import { GLTFLoader, OrbitControls } from 'three/addons/loaders/GLTFLoader.js';
```

- A IR passa em `SZIRSchema.safeParse(...)`.
- O gerador reproduz exatamente essa declaração.
- O módulo real expõe somente `GLTFLoader`; `OrbitControls` não é um export dele. Assim, o carregamento ESM do preview falha antes de o projeto iniciar.
- A própria suíte atualmente protege essa combinação inválida no round-trip: `packages/studio/src/parsers/__tests__/canvas3dLoaders.test.ts:48` usa `GLTFLoader, DRACOLoader` a partir de `GLTFLoader.js`.

Locais envolvidos:

- `packages/studio/src/parsers/js.ts:411` converte qualquer import nomeado sem alias em `importNamed`;
- `packages/studio/src/ir/schema.ts:5209` valida apenas que o módulo seja preenchido e não seja `automático`;
- `packages/studio/src/blockly/buildIR.ts:44` resolve somente o caso automático;
- `packages/studio/src/generators/js.ts:798` emite os nomes sem verificar o módulo.

Correção de raiz recomendada: tratar os nomes que pertencem ao catálogo como uma relação nome → módulo canônico também no caminho explícito (dividindo por módulo, quando necessário), e preservar o caminho manual apenas para nomes fora do catálogo. Cobrir o caso com um teste que rejeite ou normalize a combinação cruzada e remover o fixture inválido.

## Verificações aprovadas

- Matriz Canvas 3D/Three: `bun test` em 22 arquivos — **140 testes, 871 expectativas, 0 falhas**.
- Build de produção: `bun run --bun vite build --config playground/vite.config.ts` — aprovado.
- Browser real: `bunx playwright test e2e/canvas3d.spec.ts` — **3/3 aprovados**, incluindo cena real, física leve e cidade.
- `bun run check` não teve erro; há somente um aviso informativo em arquivo não relacionado de Jogo 3D Avançado (`__gen_chefao.ts`).

## Limite externo da verificação

`bun run typecheck` segue bloqueado por alteração não relacionada em Jogo 3D Avançado: `__tests__/runtime.test.ts:231` referencia `KitApi.endGame`, inexistente no tipo atual. O bloqueio não percorre código Canvas 3D e não impede a matriz, build ou E2E específicos acima.

## Resultado arquitetural

Fora o achado P1, os contratos permanecem alinhados: a categoria continua usando Canvas como origem do elemento; Canvas 3D separa cena, renderizador, câmera e luz; lifecycle e Ponte compartilham o mesmo contexto léxico; seletores usam papéis tipados; e macros/imports automáticos não voltaram a introduzir duplicações ou imports literais `automático`.
