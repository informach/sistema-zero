# Camadas, perspectiva 2D e três jogos de neve — plano de implementação

> **Revisão posterior em 01/10/2026:** veja [o relatório de full review](../../../.audits/full-review-2026-10-01-camadas-perspectiva.md). Foram corrigidas regressões de clique, paralaxe, manual, resumo da IA e inventários. A verificação ampliada atual passou integralmente no Pinta, mas ficou bloqueada no Estúdio pela instalação de `parse5` sem leitura permitida. As evidências abaixo registram a rodada original de implementação e não significam aprovação da suíte completa atual.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execução nesta sessão, autorizada pelo usuário; checkpoints informativos sem nova aprovação.

**Goal:** Mostrar transparência no Pinta, oferecer camadas e perspectiva nas duas extensões e entregar o mesmo jogo de neve em Canvas, Jogo 2D e Jogo 2D Avançado.

**Architecture:** Um módulo de cena independente dos motores implementa camadas identificadas, projeção X/Z, objetos e encontros longitudinais. Adaptadores ligam imagens, tamanho de palco, câmera e reinício de cada motor. Blocos/IR/codecs compartilham um catálogo tipado; os três exemplos usam a mesma arte original e percurso, com a versão Canvas expressando a projeção em blocos básicos.

**Tech Stack:** TypeScript, Canvas 2D, SVG, React, Blockly, Zod, Bun.

**Spec:** `.audits/architectural-analysis-2026-10-01-profundidade-2d.md` e aprovação do usuário em 01/10/2026, incluindo três exemplos equivalentes.

## Global Constraints

- Preservar cenário único; camadas novas são explícitas e desenhadas pelo autor antes/depois do mundo.
- Preservar alfa e branco pintado; o papel do Pinta é preferência visual, não conteúdo exportado.
- Não modificar alterações preexistentes de outros pacotes.
- Novos blocos devem sobreviver ao round-trip, importar/exportar e funcionar no player.
- Não criar dependência de extensão na versão Canvas.
- Pista plana com objetos projetados é o incremento aprovado; curvas, relevo e textura por faixas continuam expansões futuras do relatório.
- Exemplos usam arte original, controle por setas/A-D e toque, começo, pausa, reinício e vitória/derrota.

## Task 1: Cena compartilhada e adaptadores

**Files:** criar `packages/studio/src/official-extensions/scene-2d/{contract,runtime}.ts` e testes; integrar os dois `runtime.ts` e `runtimeContract.ts`.

**Interfaces:** `SceneTwoDApi`: `createSceneLayer(name,image,pass)`, `transformSceneLayer(name,x,y,scale,opacity)`, `motionSceneLayer(name,space,fx,fy,repeat)`, `orderSceneLayer(name,order)`, `showSceneLayer(name,visible)`, `removeSceneLayer(name)`, `drawSceneLayers(pass)`; `createTrack(name,horizon,focal,height,follow)`, `viewTrack(name,near,far)`, `cameraTrack(name,x,z)`, `advanceTrack(name,distance)`, `placeTrackObject(track,id,image,x,z,w,h)`, `moveTrackObject(track,id,x,z)`, `removeTrackObject(track,id)`, `drawTrack(track)`, `trackValue(track,property)`, `projectTrack(track,x,z,property)`, `trackPassed(track,id)`, `trackTouching(track,id,x,width)`.

- [x] Testar projeção com distância focal 240, altura 100 e distância relativa 480: escala 0,5; proteger near/far.
- [x] Testar camadas com o mesmo asset e estados independentes, ordem estável, ocultação, repetição limitada e restauração do contexto.
- [x] Testar encontro em salto de progresso, remoção e reinício; manter os registros isolados dos sprites existentes.
- [x] Implementar registros limitados, avisos de entrada inválida, ordem distante→próximo e limpeza explícita na composição das camadas de fundo.
- [x] Integrar adaptadores com transformação de câmera única e hooks de reset dos motores; rodar os testes de cenário existentes junto dos novos.

```ts
const distance = objectZ - cameraZ
const scale = focal / distance
const screenX = width / 2 + (objectX - cameraX) * scale
const baseY = height * horizon / 100 + cameraHeight * scale
```

## Task 2: Blocos, IR e Ponte

**Files:** criar `scene-2d/{catalog,blocks,ir,codec}.ts`; integrar `ir/schema.ts`, `blockly/{buildIR,workspaceState}.ts`, `generators/{js,expr}.ts`, `parsers/js.ts`, catálogos e paletas das duas extensões. Atualizar documentação e conhecimento do tutor.

**Interfaces:** comandos `g2d:sceneCommand`/`gk:sceneCommand`, valores `g2d:sceneValue`/`gk:sceneValue`, discriminados por método com argumentos tipados pelo catálogo; sem callbacks ou declarações ocultas.

- [x] Catalogar método, argumentos, campos, limites, dica e posição de cada bloco em um módulo puro.
- [x] Validar aridade e opções na IR e no parser; chamadas incompatíveis permanecem código avançado, sem alteração silenciosa.
- [x] Implementar todos os caminhos por codecs injetados, incluindo coleta de identificadores e reconhecimento de expressão simples.
- [x] Testar cada bloco: workspace → IR → código → IR → workspace, valores aninhados e descoberta na paleta.

```ts
type SceneTarget = 'g2d' | 'gk'
// O catálogo fornece o método e a ordem dos argumentos em todos os adaptadores.
// Exemplo de código produzido:
// SZGame2D.createSceneLayer('montanhas', 'serra', 'back');
// SZGame2D.advanceTrack('pista', velocidade / 60);
```

## Task 3: Papel do Pinta

**Files:** `packages/pinta/src/components/editor/vector/VectorStage.tsx`, componente pequeno de seleção de papel, copy e CSS, testes de UI/export.

**Interfaces:** preferência visual local `'transparent' | 'white' | 'dark'`, padrão transparente; seletor com rótulo acessível. Não adicionar formas ao documento nem alterar metadados de exportação.

- [x] Inserir seletor acessível próximo ao palco; trocar simultaneamente os fundos do contêiner e do SVG.
- [x] Testar seleção, ausência de alteração do asset e branco explícito no export.
- [x] Atualizar testes que exigiam papel branco fixo para o novo contrato visual.

## Task 4: Três versões de “Descida da Neve”

**Files:** módulo compartilhado de arte/percurso em `packages/studio/src/examples/snowDescent*`, exemplos e catálogos das duas extensões, catálogo Canvas, gerador reproduzível das IRs e testes.

**Interfaces:** mesma tela lógica, SVGs de céu/montanhas/neve/pinheiros/personagem/bandeiras/estrelas; percurso determinístico; progresso e controles iguais. Código-fonte Canvas sem `SZGame2D`/`SZGameKit`; fontes das extensões chamam os blocos novos.

- [x] Criar SVGs autocontidos e percurso com bandeiras, estrelas e decoração, usando tamanho e enquadramento comuns nas camadas.
- [x] Implementar começo por Enter/toque, movimento lateral por teclado/ponteiro, pausa, coleta, colisão por distância, fim e reinício.
- [x] Gerar IR a partir das fontes com parser existente; rejeitar rawJS inesperado e registrar os três exemplos pesquisáveis.
- [x] Testar equivalência do percurso, uso dos novos blocos, jogo sem extensão independente, vitória/derrota/reinício e runtime dos exemplos.

## Task 5: Verificação e entrega

- [x] Rodar testes específicos de cena, blocos, exemplos e Pinta, depois suites relevantes de arquitetura, API, documentação e catálogos.
- [x] Rodar typecheck de Studio e Pinta e Biome nos arquivos alterados; resolver falhas na origem.
- [x] Regenerar catálogos derivados do servidor e de exemplos; conferir o diff para evitar alterações alheias.
- [x] Verificar visualmente quando houver navegador disponível; se não houver, registrar o limite e usar rasterização nativa dos jogos para verificar composição, além dos testes de execução.
- [x] Atualizar este plano com evidências e apresentar os três exemplos e o resultado dos checks ao usuário.

**Entrega no workspace — 01/10/2026**

- 19 blocos de camadas/perspectiva em cada extensão, derivados do mesmo catálogo e ligados à IR, Ponte, runtime, paleta e conhecimento do tutor.
- Camadas com imagem, posição, escala, opacidade, ordem, plano, repetição e paralaxe. O cenário único conserva o comportamento anterior.
- Pista plana com horizonte, foco, altura e recuo; objetos em X/Z; projeção, ordenação por distância e encontros pelo intervalo percorrido. Nos cálculos, distância até a câmera = Z do objeto − progresso + recuo.
- Pinta vetorial: quadriculado por padrão e opções de papel branco/escuro somente para visualização. Exportação conserva alfa vazio e branco pintado.
- Novo bloco Canvas “mouse/dedo pressionado?”. Os três exemplos têm arte original, 12 estrelas, três vidas, teclado/toque, pausa, vitória, derrota e reinício.

| Exemplo na galeria | Implementação |
|---|---|
| Descida da Neve (Canvas) | Contas, listas, laço de animação e imagens em blocos do núcleo; nenhuma extensão |
| Descida da Neve (Jogo 2D) | Novos blocos de camadas e pista; avanço por quadro |
| Descida da Neve (Jogo 2D Avançado) | Mesmos blocos de cena; atualização por delta de tempo |

As fontes ficam em `packages/studio/src/examples/snowDescentSource.ts`; arte e percurso em `snowDescentAssets.ts`. As três IRs são geradas por `bun run gen:snow-descent` no pacote Studio; `bun run check:snow-descent` detecta divergências. Os catálogos derivados têm 35 exemplos do núcleo e 158 exemplos no índice total do servidor.

**Evidências finais**

| Verificação | Resultado |
|---|---|
| Studio: ambas as extensões completas, cena compartilhada, três jogos, catálogo, contratos dos exemplos, codecs web e arquitetura | 3.417 testes aprovados, 0 falhas; 114 arquivos |
| Pinta: papel vetorial, interface do editor e ponte para o Studio | 23 testes aprovados, 0 falhas |
| TypeScript de Studio e Pinta (`tsc --noEmit`) | Ambos aprovados |
| Biome nos 78 arquivos TS/TSX/JSON novos ou alterados | Aprovado, sem avisos nem correções pendentes |
| Geração dos três jogos e catálogos | IR estruturada, sem rawJS/rawHTML/rawCSS/memberCall; round-trip aprovado |
| Rasterização nativa dos três jogos | Telas de início e partida em 640×720 inspecionadas; composição e perspectiva coerentes |
| Alfa exportado pelo Pinta | Vazio RGBA 0/0/0/0; branco pintado 255/255/255/255 |

Os testes de execução usam os motores reais e o JavaScript gerado, com DOM e contexto de desenho simulados; verificam início, teclado, toque, pausa, coleta, colisão em salto grande, vitória, derrota e reinício. Também verificam que reiniciar cada motor remove camadas e pistas antigas antes de reconstruir o projeto. A conferência de pixels foi feita separadamente com Canvas nativo e os SVGs reais.

**Limite da validação visual:** o navegador integrado não disponibilizou uma sessão. Não foi possível inspecionar o editor/player em navegador real ou em um dispositivo móvel físico. Os registros locais desta sessão estão em `.tmp/snow-final-studio-tests.log`, `.tmp/snow-final-pinta-tests.log`, `.tmp/snow-studio-typecheck.log`, `.tmp/snow-pinta-typecheck.log`, `.tmp/snow-biome-final.log` e `.tmp/snow-{canvas,basic,advanced}-{title,game}.png` (temporários ignorados pelo Git).

O incremento entregue tem pista plana; curvas, elevação e textura de chão por faixas permanecem expansões futuras. O limite do runtime básico foi ajustado com medição explícita: 508.274 bytes crus / 149.547 bytes gzip, mantendo margem aproximada de 2%.
