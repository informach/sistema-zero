# Full review — categoria Canvas 3D do `packages/studio` (rodada 2)

Data: 2026-07-23  
Escopo: categoria de núcleo **Canvas 3D** — toolbox, blocos, progressão, Blockly, IR/SZIR, gerador JavaScript, parser, Ponte, seletores tipados, preview Three.js, addons, macros semânticos, lifecycle, física leve e integração com a categoria Canvas.  
Natureza desta rodada: auditoria seguida da correção integral dos achados e adição de regressões automatizadas.

## Parecer executivo

A categoria está alinhada no escopo revisado. Os **3 achados reproduzidos — 2 Medium/P2 e 1 Low/P3 — foram corrigidos** e agora possuem regressões automatizadas.

TypeScript, build, a matriz Canvas 3D e os 3 fluxos E2E passaram. A suíte total chegou a 5.297 testes aprovados, mas mantém 4 falhas independentes nas alterações paralelas de “O Chefão das Sombras” (Jogo 3D Avançado); o `check` global também encontra 2 arquivos dessa mesma linha de trabalho. Nenhuma dessas falhas toca a categoria Canvas 3D ou os arquivos desta correção.

## Achados

### C3D-R2-001 — Medium/P2 — corrigido — a Ponte classificava chamadas pelo projeto inteiro

Em [`workspaceState.ts`](../packages/studio/src/blockly/workspaceState.ts), `recognizeThree` é ativado uma vez para todo o projeto (`:159`). Depois, `recognizeT3dCall` (`:385`) e `recognizeT3dSet` (`:481`) reconhecem métodos/propriedades homônimos sem confirmar a capacidade do objeto receptor.

Reprodução confirmada em um mesmo projeto com Three.js:

- `itens.add('moeda')`, onde `itens` é `Set`, vira `sz_t3d_add_to`;
- `estado.visible = true`, onde `estado` é um objeto comum, vira `sz_t3d_set_visible`;
- os blocos genéricos corretos (`sz_js_method_on` e `sz_js_member_set`) desaparecem.

O gate também tem o comportamento inverso: [`statementUsesCanvas3D`](../packages/studio/src/three/canvas3dContract.ts) (`:654`) não percorre corpos aninhados. Se cena, construtor e `cena.add(grupo)` existirem somente dentro de um evento, os dois primeiros voltam como Canvas 3D, mas o `add` volta como chamada genérica.

Correção: o latch global foi substituído pelo índice contextual já ligado aos símbolos da Programação. Ele percorre statements e callbacks, respeita ordem e shadowing e exige a capacidade correta do receptor antes de escolher cada facilitador.

Issue: [`BUG-001.md`](canvas3d-review-round-2/qa/issues/BUG-001.md)

### C3D-R2-002 — Medium/P2 — corrigido — lifecycle confundia classe do aluno com addon Three.js

[`isCanvas3DResourceCreatorExpression`](../packages/studio/src/three/canvas3dContract.ts) (`:381`) considera qualquer `newExpr` sem namespace cujo nome esteja em `CANVAS3D_ADDON_CLASSES` um recurso persistente do Canvas 3D. A validação recursiva em [`schema.ts`](../packages/studio/src/ir/schema.ts) (`:10397` e `:10449`) não recebe informação sobre a origem do símbolo.

Reprodução confirmada: um projeto sem import de Three.js que declara `class Water {}` e cria `new Water()` dentro de `A cada quadro` é rejeitado com “este recurso ou configuração deve ser criado uma vez”. `Water` é a classe da criança, não `three/addons/objects/Water.js`.

Correção: o lifecycle consome o mesmo contexto léxico. A classificação agora exige `THREE.X` ou um binding nomeado comprovadamente importado de `three`/`three/addons`; classes e parâmetros locais fazem shadowing.

Issue: [`BUG-002.md`](canvas3d-review-round-2/qa/issues/BUG-002.md)

### C3D-R2-003 — Low/P3 — corrigido — entrada livre de addons podia gerar import inválido

O campo [`FieldAddonPicker.ts`](../packages/studio/src/blockly/fields/FieldAddonPicker.ts) (`:80`) aceita texto livre. Em [`buildIR.ts`](../packages/studio/src/blockly/buildIR.ts) (`:2112`), o modo `automático` escolhe apenas o primeiro módulo conhecido, mas mantém todos os nomes digitados.

Reprodução confirmada:

- `GLTFLoader, OrbitControls` + `automático` gera `import { GLTFLoader, OrbitControls } from 'three/addons/loaders/GLTFLoader.js'`; esse módulo exporta somente `GLTFLoader`;
- um nome customizado com o módulo ainda em `automático` gera um especificador literal `from 'automático'`.

Correção: o resolvedor agrupa os nomes pelo módulo canônico e emite um import por módulo. Nome desconhecido, lista vazia ou caminho vazio permanece diagnosticado pelo schema até a criança informar um módulo explícito; `automático` não chega ao JavaScript.

Issue: [`BUG-003.md`](canvas3d-review-round-2/qa/issues/BUG-003.md)

## Alinhamento confirmado

- Canvas 3D permanece uma **categoria do núcleo**, não uma extensão.
- O fluxo pedagógico continua correto: `Canvas → cena → renderizador → câmera → iluminação → render`.
- O mesmo ID de Canvas criado na categoria Canvas alimenta renderizador e câmera.
- O inventário tem **67 blocos em 10 grupos**, sendo 56 intermediários e 11 avançados.
- Todos os grupos, blocos, sockets, defaults e tooltips cobertos pela auditoria automatizada estão consistentes.
- Seletores distinguem cena, renderizador, câmera, luz, material, objeto, compositor, loaders e recursos da física.
- IR, gerador, parser, macros v2, source map e round-trip das fixtures existentes permanecem estáveis.
- Three.js está pinado na versão `0.180.0`; as 50 classes core auditadas existem e os 18 módulos de addon resolvem seus exports anunciados.
- DRACO/KTX continuam preservados para compatibilidade de projetos salvos e fora do picker do Studio por limites de WASM/worker.
- Física leve, IDs, grounding, triggers, raycast, terreno, cidade e personagens passaram na suíte focada.
- O preview real desenhou a cena manual sobre o Canvas do núcleo e executou física/cidade em desktop.

## Riscos arquiteturais observados

O contrato compartilhado em `src/three/canvas3dContract.ts` continua atravessando arquivos grandes (`schema.ts`, `buildIR.ts`, `workspaceState.ts` e `generators/js.ts`), mas Ponte, lifecycle e seletores agora compartilham a resolução contextual de símbolos/capacidades. Não foi encontrado dead code comprovável no escopo.

Não foi aberto achado para `WebGLRenderer.dispose()`: o preview troca o `srcDoc`, descarregando o documento anterior, e não houve falha ou vazamento reproduzível nos fluxos reais. Também não foi aberto achado para largura mobile, pois o produto prioriza programação em desktop conforme decisão já registrada.

## Verificação executada

| Verificação | Resultado |
|---|---|
| `bun install --frozen-lockfile` | PASS — lockfile preservado |
| Biome nos 11 arquivos alterados | PASS |
| `bun run typecheck` | PASS |
| build Vite do playground | PASS — 1.526 módulos; aviso global de chunks grandes |
| regressões dos 3 achados | PASS — 32 testes, 392 expectativas, 3 arquivos |
| matriz focada Canvas 3D | PASS — 169 testes, 1.012 expectativas, 24 arquivos |
| `bunx playwright test e2e/canvas3d.spec.ts` | PASS — 3/3 em Chromium |
| `bun test src` | 5.297 PASS / 4 FAIL — falhas externas em “O Chefão das Sombras” |
| `bun run check` global | FAIL externo — 2 arquivos de Jogo 3D Avançado fora desta correção |

## Estado da revisão

**Aprovado no escopo Canvas 3D.** Os três achados estão corrigidos e cobertos por regressões. O worktree geral ainda possui falhas externas na implementação paralela de Jogo 3D Avançado, registradas na verificação sem serem alteradas por esta correção. A evidência detalhada está em [`canvas3d-review-round-2/qa`](canvas3d-review-round-2/qa/).
