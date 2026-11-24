# Lote 8.4 — Jogo 3D — Implementation Plan

> Execução principal com writing-plans/executing-plans, sem delegação ou aprovação intermediária, conforme autorização da usuária. Canvas concluído e enviado em `c20dd5edc`; staging local/remota conferida e arquivos deste motor limpos antes deste recorte. Não iniciar Avançado enquanto este motor não estiver implementado, testado, revisado e enviado.

**Goal:** usar uma cena compilada do Molda no Jogo 3D iniciante, conservando seus objetos, controles, câmeras, animações, física e regras.

**Architecture:** `SZGame3D.loadScene(world, id)` utiliza `SZScene3D.instalar` sobre a Scene do mundo existente. O SDK mantém a propriedade e troca atômica da base; um fragmento do motor adapta chão/triângulos aos controladores existentes. O loop, renderer, câmeras e inventário de objetos do jogo continuam sendo os atuais. Um comando explícito `SZGame3D.sceneStart(obj)` posiciona um objeto no início compilado, inclusive se chamado durante o preparo.

**Tech Stack:** Three 0.184.0 compartilhado; SDK, BVH/cápsula e chegada canônicos; runtime didático com velocidades internas por quadro normalizadas pelo delta; Blockly/IR/codec e lifecycle gerenciado existentes.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [seção 5 do plano de motores](2026-11-19-cenarios-lote8-motores.md), [Canvas qualificado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-canvas.md).

## Restrições e decisões

- Usar o SDK compartilhado. Um GLB achatado perderia terreno/recortes/metadados; embutir o explorador portátil duplicaria renderer/controlador. Não adotar essas alternativas.
- Não substituir a física do Jogo 3D pelo Physics Lite do Canvas. Adaptar os pontos existentes de movimento/gravidade/passo aos triângulos emprestados do SDK, sem outro BVH ou motor.
- Sem cenário, preservar exatamente a experiência atual. Com cenário, não converter ausência de chão em zero nem cobrir recortes por uma caixa global.
- Conservar modelos, coordenadas/origem, alturas, máscara, águas, clipes, caminhos, licenças, sólidos e objetos autorais. Não apagar um chão autoral por nome nem eliminar todos os objetos da Scene.
- Remover somente as luzes padrão criadas pelo próprio motor, com referências explícitas e somente após a instalação bem-sucedida. Luzes/objetos criados pelo programa são preservados; a iluminação compilada não deve receber uma segunda iluminação padrão.
- `sceneStart` é explícito: não teleportar arbitrariamente todos os objetos da cena. A chegada usa `SZScene3D.inicio`, a área dos pés e a dimensão/pivô do objeto. Uma posição explícita posterior cancela um pedido de chegada ainda pendente.
- Primeira carga segura o passo de jogo até o preparo. Uma troca conserva o cenário vigente até o próximo estar pronto. Falha/cancelamento não pode instalar um resultado antigo ou reanimar um mundo descartado.
- O SDK e o mundo encerram seus próprios recursos antes do renderer. Conferir também caches compartilhados do motor na prova real de descarte, sem zerar contadores artificialmente.
- Preservar o contrato existente de bfcache: `pagehide` com `persisted` não pode destruir o cenário enquanto o motor conserva seu mundo. Há regressão real do bootstrap para diferenciar saída persistida e definitiva; o cache de modelos do documento continua preservado no recomeço da partida.
- O recomeço no canvas HTML reutiliza seu renderer/contexto enquanto descarta os recursos e laços da partida anterior. Um renderer que a nova fábrica não reutiliza é encerrado. O descarte definitivo continua liberando caches e contextos; não criar outro renderer sobre um contexto perdido.
- Manter identidade Kids/adulta e paleta dourada do Jogo 3D, seletor `scene3d` por ID e nomes de referência atuais. Sem interfaces de infraestrutura no fluxo da criança.
- Conservar limites originais de assets, build e desempenho. Implantação/conta real e aceite global somente no encerramento de todos os lotes.

## 1. Contratos dos dois comandos

**Files:** criar `official-extensions/game-3d/sceneIR.ts`, `sceneCodec.ts` e `__tests__/sceneBlocks.test.ts`; modificar `platformIR.ts`, `platformCodec.ts`, `blocks.ts`, `palette.ts`, `manifest.ts`, `three/game3dContract.ts`, `blockly/blockLevels.ts`, `blockly/workspaceState.ts`, `generators/js.ts` e as delegações existentes descobertas pela auditoria. Interfaces/schema em módulos focados, sem aumentar desnecessariamente as fachadas históricas.

**Interfaces:** `g3d:loadScene { worldVar, asset }` gera `SZGame3D.loadScene(cena, "id-estavel")`; `g3d:sceneStart { objVar }` gera `SZGame3D.sceneStart(personagem)`. O primeiro bloco seleciona cenário e mundo, o segundo seleciona um objeto do mundo. A extensão passa de 0.32.0 para 0.33.0.

- [x] Escrever teste vermelho da paleta/seletor por ID e dos dois nós. Montar programa com `g3d:createScene`, `g3d:loadScene`, criação de objeto e `g3d:sceneStart`; usar `SZIRSchema` e exigir referências corretas de mundo/objeto.
- [x] Exercitar o ciclo completo: `generateJS` → `parseJS` → `buildWorkspaceStateFromIR` → `buildIRFromWorkspace`. O código gerado e o ID precisam ser idênticos; sem `rawJS` para representar os comandos novos.
- [x] Implementar interfaces, schema local, codec de chamadas/blocos, emissão/coleção de nomes e serialização seguindo os métodos de modelos já existentes. Registrar aridade e semântica no contrato central; recurso não pode ser recarregado por quadro.
- [x] Incluir na família “Cena, céu e câmera / Começar” e no nível iniciante correspondente. Atualizar documentação dos comandos, sem prometer física rígida exata ou nado que o motor não oferece.
- [x] Rodar teste novo, auditorias de blocos/pedagogia, lifecycle/schema e arquitetura antes de ligar o runtime.

## 2. Carga, chegada e propriedade

**Files:** criar `official-extensions/game-3d/runtimeScene.ts` e `__tests__/scene3d.test.ts`; modificar pontos focados de composição, `_setupWorld`, `setPosition`, `animate` e `dispose` em `runtime.ts`. Reutilizar o harness existente onde ele permite geometria Three real; somente renderer pode ser substituído no ensaio sem WebGL.

**Interfaces:** `loadScene(world, id): Promise<boolean>`; `sceneStart(obj): void`; helpers internos `disposeImportedScene(world)`, `updateImportedScene(world, dt)`, `placeAtImportedStart(world, obj)`. Estado por mundo, fora de `Scene.userData`; controle de cancelamento e pedidos de chegada pertencem ao mundo.

```ts
const plano = await criarTransporteDeEnsaio({ origem: { x: 200, z: 300 } })
const mundo = api.createScene('tela')
const personagem = api.createBox(mundo, '#448855', 1)
const carga = api.loadScene(mundo, plano.assetId)
api.sceneStart(personagem)
expect(await carga).toBe(true)
expect(personagem.position.x).toBeGreaterThan(190)
```

- [x] Confirmar vermelho com fixture compilada real, carregador canônico e Three real: API ausente, não uma resposta fake de carregamento.
- [x] Instalar pela Scene existente, esperar o SDK e conservar a referência anterior em caso de falha. Registrar somente luzes padrão na criação do mundo; retirá-las e liberar mapas próprios após sucesso.
- [x] Implementar chegada explícita imediata/pendente e cancelamento do pedido por `setPosition`. Usar marcador principal/fallback canônico e apoio real da área dos pés, convertendo pés para centro pelo semieixo vertical. Não alterar a escala do avatar para resolver encaixe.
- [x] Atualizar clipes/água/setores no `animate` existente, respeitando pausa, sem RAF concorrente. Reutilizar câmera e objeto de foco do modo ativo.
- [x] Testar duas cenas independentes, três trocas, erro, abort, recomeço/descarte durante preparo e resultado atrasado. O descarte de uma base não pode restaurar o ambiente por cima da seguinte ou destruir os objetos autorais.

## 3. Física e câmera existentes sobre a cena

**Files:** `runtimeScene.ts`, pontos focados de `topDown`, `applyGravity`, `stepBody`, `groundHit`/`groundHeight`/`onGround` e atualização de câmera; casos no teste novo. Não reescrever os controladores de plataforma/FPS.

**Interface:** helpers internos recebem mundo, objeto e deslocamento do controlador; resolvem cápsula vertical nos triângulos canônicos, subdividindo conforme raio. Atualizam a posição central e velocidades internas existentes a partir das normais. Apoio usa superfície real; não há chão sentinela nem teletransporte de segurança ocultando queda.

- [x] Testar chão fora da origem, recorte com queda contínua, apoio em ponte/junta/tora, parede fina, teto/salto e sólido autoral. Manter o caminho legado e suas unidades por segundo/graus.
- [x] Ligar ao `stepBody` existente, conservando sólidos, caronas e registros de contato. Adaptar `applyGravity` e a exploração `topDown` para a geografia importada; não aplicar duas integrações no mesmo controlador.
- [x] Preservar áreas permitidas, orientação e clipes de caminhada do `topDown`. O chão passa a seguir a cena apenas quando uma base importada está ativa.
- [x] Consultas de chão consideram a cena e os objetos já consultáveis; no recorte não devolver um piso zero. Sem cenário, conservar a resposta histórica.
- [x] Limitar câmera pelas superfícies reais somente nos modos que seguem um objeto; conservar enquadramento manual/panorâmico e controles existentes. Conferir dimensões, origem e alvo em coordenadas coerentes.
- [x] Regressão de física, câmera, plataforma, grupos e controles; revisar ausência de alteração de velocidades globais ou novo motor.

## 4. Qualificação do motor e fechamento

**Files:** produtores/driver em `playground/cenarios-integration`, checkpoint/evidências na pasta de reforma, checklists deste plano e do plano de motores.

- [x] Criar projeto pelos blocos/IR reais, reabrir pelo validador e executar cena de galeria e recorte, com controlador e câmeras do Jogo 3D. Chegada, caminhada/corrida, curvas, salto/pouso e pausa precisam acontecer em movimento.
- [x] Comparar as 441 alturas/máscara da mesma cena com a referência nativa; conferir água/clipes, três ciclos de recursos, falha/cancelamento, reabertura/export e player local. Não confundir SDK isolado com integração do motor.
- [x] Medir build/orçamento original antes da tipagem integral; rodar regressões pertinentes, geradores em `--check`, Biome/diff e tipagem. Corrigir a origem de falhas, sem elevar limites ou relaxar contratos.
- [x] Vídeos, capturas e recibo sem bytes privados. Registrar limitações de dispositivos físicos, host local, percurso parcial e aprovação artística.
- [x] Review linha a linha, relatório, commit/push em staging. Só então iniciar Jogo 3D Avançado. 8.4 completo, Pro autoral, 8.5/8.6, lotes 9–10, Faísca final, full review/CI e implantação/validação real continuam pendentes.
