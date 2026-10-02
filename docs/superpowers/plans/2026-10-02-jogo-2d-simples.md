# Jogo 2D: sprites na pista e exemplos por nível — implementação

> Execução aprovada pelo usuário em 02/10/2026, nesta sessão, com a skill `executing-plans`. Checkpoints informativos; seguir até a entrega sem pedir novamente autorização.

**Goal:** Integrar sprites animados à perspectiva, oferecer composição e movimento automáticos e refazer os três exemplos da Descida da Neve conforme o nível pedagógico.

**Architecture:** Substituir a API pública de cena existente; apenas projeção e composição ficam internas ao motor. Um controlador compartilhado de cena de sprites usa sua projeção e recebe adaptadores dos motores para aparência, contato, entrada e ciclo de vida. O catálogo compartilhado ganha comandos por intenção e eventos com corpo estruturado; os exemplos das extensões deixam de compartilhar a implementação manual.

**Tech Stack:** TypeScript, JavaScript de runtime, Blockly, Canvas, Zod, Bun, Playwright.

**Spec:** `.audits/review-2026-10-02-jogo-2d-simplicidade.md`, aprovada integralmente, incluindo a reconstrução dos três exemplos.

## Restrições

- Correção explícita do usuário durante a implementação: remover os blocos antigos e a compatibilidade; só há staging, sem projetos de alunos.
- Básico e intermediário sem pré-requisito de objetos de dados, funções próprias ou contas com `dt`.
- Reutilizar sprites, animações e relógios existentes; nenhum segundo scheduler.
- Projeção não sobrescreve temporariamente posição ou tamanho físicos para desenhar.
- Preservar a arte, o percurso, as regras e os controles da neve; animação adicional nas versões com extensão.
- Não modificar o trabalho preexistente de marketing, funil e área dos responsáveis.
- Validação pedagógica com crianças exige observação humana posterior; verificar tecnicamente todas as tarefas disponíveis no ambiente.

## 1. Cena automática com sprites

Arquivos: criar `scene-2d/spriteContract.ts`, `spriteRuntime.ts`, `spriteRuntime.test.ts`, `spriteHosts.ts`; ajustar `scene-2d/runtime.ts`, contratos dos dois motores, `game-2d/runtime/lifecycle.ts`, `game-2d/runtime/sprites.ts`, `game-2d/runtime/worldEvents.ts`, `game-2d-advanced/runtime.ts` e `runtime/shell.ts`.

Interfaces públicas compartilhadas:

```ts
interface SceneSprite { x: number; y: number; w: number; h: number }
interface SpriteSceneApi {
  addSceneBackdrop(name: string, image: string, plane: 'far' | 'back' | 'front'): void
  sceneBackdropMotion(name: string, amount: number): void
  sceneBackdropFit(name: string, fit: 'cover' | 'contain' | 'repeat'): void
  createSpriteTrack(name: string): void
  trackPlayer(name: string, sprite: SceneSprite, lives: number): void
  trackControls(name: string, speed: number, limit: number): void
  trackTravel(name: string, speed: number, finish: number): void
  putTrackSprite(name: string, sprite: SceneSprite, x: number, distance: number): void
  repeatTrackSprite(name: string, sprite: SceneSprite, count: number, spacing: number, pattern: string): void
  trackSpriteVelocity(sprite: SceneSprite, lateral: number, distance: number): void
  trackCameraView(name: string, view: 'near' | 'wide' | 'high'): void
  onTrackEncounter(name: string, sprite: SceneSprite, fn: () => void): void
  onTrackFinish(name: string, fn: () => void): void
  collectTrackItem(): void
  trackScore(name: string, amount: number): void
  trackHurt(name: string, amount: number): void
  trackHud(name: string, label: string, total: number): void
  sceneGameScreens(title: string, instructions: string): void
}
```

- [x] Testar projeção de sprite com tamanho preservado, ordenação, remoção e reinício.
- [x] Testar encontros por movimento relativo, salto grande, uma ocorrência por passagem, coleta de uma cópia e callbacks que reiniciam a partida.
- [x] Implementar vínculo a sprites reais e cópias com aparência herdada. Usar `projectTrack` para a matemática.
- [x] Implementar passos e passes de desenho integrados aos motores. Camadas automáticas atrás do mapa/campanha e frente antes do HUD.
- [x] Integrar teclado/toque, estados, pausa, início, reinício e HUD com as APIs nativas.
- [x] Verificar clique projetado, animação, opacidade, flip, figuras e sprites de texto; nenhuma dupla pintura.

## 2. Blocos curtos e animação pelo nome

Arquivos: `scene-2d/{catalog,blocks,codec,ir}.ts`, novos `spriteCatalog.ts`, `codecs de eventos`; integrações em `schema.ts`, `generators/js.ts`, `workspaceState.ts`, codecs das extensões e regras de ciclo de vida; `FieldSpritePicker.ts`, `FieldAnimationPicker.ts`, `core/project.ts` e ponte de assets.

Interface de eventos:

```ts
type SceneEvent = {
  type: 'g2d:sceneEvent' | 'gk:sceneEvent'
  method: 'onTrackEncounter' | 'onTrackFinish'
  args: JSExpr[]
  body: JSStatement[]
}
```

- [x] Estender catálogo com campo de sprite (variável, não texto), posicionamento inicial e eventos.
- [x] Implementar parser, IR, geração e reconstrução de corpos de eventos, com identificadores e validação de argumentos.
- [x] Acrescentar animação nomeada com metadados normalizados do projeto e seleção visual, preservando configuração explícita de folhas antigas.
- [x] Criar entrada “Começar” nas duas paletas; controles intermediários em “Mais opções”; remover blocos anteriores dos registros, paletas e API pública.
- [x] Testar cada novo bloco em código → IR → blocos → código, incluindo seleção de sprites e animações.

## 3. Reconstruir a Descida da Neve

Arquivos: `examples/snowDescentSource.ts`, `snowDescentAssets.ts`, novas fontes separadas por nível, `scripts/gen-snow-descent.ts`, IRs geradas, catálogos das extensões e Canvas, `snowDescent.test.ts`, `snowDescentRuntime.test.ts`.

- [x] Criar arte animada a partir do desenho original, com metadados de animação e tamanho de quadro.
- [x] Reescrever o básico por sprites, padrões e eventos, sem objetos de dados/listas/funções próprias; acrescentar atividade inicial curta.
- [x] Reescrever o intermediário com controles de percurso e comportamento, sem `dt` explícito.
- [x] Reorganizar e explicar o Canvas independente, mantendo a programação manual visível.
- [x] Gerar os projetos e comparar o percurso com `SNOW_COURSE`, conservando as 108 colocações e regras.
- [x] Adaptar testes de execução para observar as APIs públicas e os quadros reais, sem depender das antigas funções privadas do exemplo.

## 4. Documentação e entrega

Arquivos: manuais e resumos de IA de `scene-2d`, `game-2d`, `game-2d-advanced`; catálogos derivados, referências e testes de contratos.

- [x] Atualizar instruções para criar sprites, escolher animação, compor cenários e modificar regras nas duas extensões.
- [x] Atualizar versões e índices gerados, preservando IDs dos exemplos antigos.
- [x] Executar testes direcionados de runtime, animação, contato, eventos, codecs, ausência da API antiga e exemplos.
- [x] Executar suítes das extensões e verificações de arquitetura, TypeScript e Biome.
- [x] Conferir no navegador os exemplos nos tamanhos desktop e celular, com console limpo, início, pausa e reinício.
- [x] Registrar contagem de comandos e total de blocos dos exemplos; conferir a meta da primeira atividade (até 30 comandos/eventos).
- [x] Documentar resultados e qualquer limite de validação, sem afirmar avaliação com crianças não realizada.


## Evidências finais — 02/10/2026

- `bun test src`: 8.659 testes, zero falhas, 550 arquivos (171,83 s).
- `bunx tsc --noEmit`: saída zero, sem diagnósticos.
- Biome nos 82 arquivos TypeScript alterados/adicionados: sem erros ou alterações pendentes.
- `check:snow-descent`: as três IRs correspondem às fontes.
- Playwright Chromium: oito casos aprovados (37,1 s), incluindo os três exemplos na galeria,
  seleção de nomes e os dois motores a 960 e 390 px; quadros 0/52 da animação, toque, pausa,
  retomada, reinício e console sem erros/avisos do jogo. Capturas conferidas visualmente.
- Ausência dos 19 métodos antigos verificada nos dois motores; ausência dos 19 blocos e do
  seletor de objetos verificada nos registros e nas listas de blocos permitidos.
- Percurso completo: as 108 posições dos dois exemplos são iguais ao percurso original.
- Básico: 42 blocos serializados / 40 comandos e eventos; intermediário: 49 / 45.
  Atividade inicial do guia: 18 comandos e eventos, convertidos e reabertos em blocos no teste.
- Não houve publicação ou deploy. A avaliação com crianças permanece uma validação humana
  posterior, distinta dos testes técnicos concluídos.
