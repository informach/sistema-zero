import { PLATFORM_ACTIONS } from '@sistemazero/core/learning'
import {
  MAP_TILES,
  MESH_LEVELS,
  MIRROR_MODES,
  SCENE_FIGURES,
  SCENE_IDS,
  SCENE_LIMITS,
  SCENE_PILHAS,
  SCENE_PORTS,
  SETUP_LIMITS,
  SHEET_CROP_WIDTHS,
  SYMMETRY_PIECES,
} from '@sistemazero/core/learning/scene'
import { t } from 'elysia'
import { ProjectBlockRelationshipsSchema } from './project-pattern.schema'

const Id = t.String({ format: 'uuid' })
const Label = t.String({ minLength: 1, maxLength: 2000 })
const Choices = t.Array(t.Object({ id: t.String({ minLength: 1, maxLength: 80 }), label: Label }), {
  minItems: 2,
  maxItems: 20,
})
/**
 * As ações de cena, em TypeBox.
 *
 * ⚠️ Os limites vêm de `SCENE_LIMITS` e as portas de `SCENE_PORTS`, em vez de repetidos aqui.
 * Quando eram duas listas, elas divergiram: o `interval` daqui não tinha teto nenhum enquanto
 * o editor do admin oferecia de 0,5 a 2.
 */
const L = SCENE_LIMITS
const SceneActionSchema = t.Union([
  t.Object({ type: t.Literal('create') }),
  t.Object({
    type: t.Literal('connect'),
    port: t.Union(SCENE_PORTS.map((p) => t.Literal(p))),
    enabled: t.Boolean(),
  }),
  t.Object({ type: t.Literal('layer'), front: t.Boolean() }),
  t.Object({
    type: t.Union([t.Literal('jump'), t.Literal('start')]),
    input: t.Union([t.Literal('key'), t.Literal('tap')]),
  }),
  t.Object({
    type: t.Literal('impulse'),
    force: t.Number({ minimum: L.impulse.min, maximum: L.impulse.max }),
  }),
  t.Object({
    type: t.Literal('advance'),
    seconds: t.Number({ minimum: L.scriptAdvance.min, maximum: L.scriptAdvance.max }),
  }),
  t.Object({
    type: t.Literal('move'),
    distance: t.Number({ minimum: L.move.min, maximum: L.move.max }),
  }),
  t.Object({
    type: t.Literal('resize'),
    width: t.Number({ minimum: L.resize.min, maximum: L.resize.max }),
  }),
  t.Object({
    type: t.Union([
      t.Literal('collide'),
      t.Literal('home'),
      t.Literal('restart'),
      t.Literal('clock'),
      t.Literal('reset'),
    ]),
  }),
  t.Object({
    type: t.Literal('interval'),
    seconds: t.Number({ minimum: L.interval.min, maximum: L.interval.max }),
  }),
  t.Object({
    type: t.Literal('sample'),
    kind: t.Union([t.Literal('position'), t.Literal('velocity')]),
    unit: t.Number({ minimum: L.sample.min, maximum: L.sample.max }),
    guided: t.Boolean(),
  }),
  t.Object({
    type: t.Literal('hint'),
    level: t.Number({ minimum: L.hint.min, maximum: L.hint.max }),
  }),
  // As duas cenas de 14/09/2026. ⚠️ Os limites vêm do core (`SCENE_LIMITS`), nunca reescritos
  // aqui: já houve três cópias desta regra e elas divergiram.
  // ⚠️ Lote 5 do Raio-X: o endereço vai até a MAIOR tela de um caso (`addressX`/`addressY`, 800 ×
  // 480); quem prende na tela do caso é o motor. Com `placeX` a borda recusava o Desafio.
  t.Object({
    type: t.Literal('place'),
    x: t.Integer({ minimum: L.addressX.min, maximum: L.addressX.max }),
    y: t.Integer({ minimum: L.addressY.min, maximum: L.addressY.max }),
  }),
  t.Object({ type: t.Literal('describe'), text: t.String({ maxLength: L.describe.max }) }),
  t.Object({ type: t.Literal('listen') }),
  t.Object({
    type: t.Literal('stage'),
    width: t.Integer({ minimum: L.stageWidth.min, maximum: L.stageWidth.max }),
    height: t.Integer({ minimum: L.stageHeight.min, maximum: L.stageHeight.max }),
  }),
  t.Object({ type: t.Literal('border'), visible: t.Boolean() }),
  t.Object({ type: t.Literal('loop'), on: t.Boolean() }),
  t.Object({ type: t.Literal('erase'), on: t.Boolean() }),
  // As seis cenas do lote 4 (desenho e vidas). Mesma regra: faixa do core, nunca literal aqui.
  t.Object({ type: t.Literal('frame'), index: t.Union([t.Literal(1), t.Literal(2)]) }),
  t.Object({ type: t.Literal('play'), on: t.Boolean() }),
  t.Object({
    type: t.Literal('rate'),
    perSecond: t.Number({ minimum: L.rate.min, maximum: L.rate.max }),
  }),
  t.Object({ type: t.Literal('onion'), on: t.Boolean() }),
  t.Object({
    type: t.Literal('shift'),
    offset: t.Integer({ minimum: L.shift.min, maximum: L.shift.max }),
  }),
  t.Object({
    type: t.Literal('paint'),
    column: t.Integer({ minimum: L.column.min, maximum: L.column.max }),
  }),
  t.Object({
    type: t.Literal('mirror'),
    on: t.Boolean(),
    line: t.Integer({ minimum: L.mirrorLine.min, maximum: L.mirrorLine.max }),
  }),
  t.Object({
    type: t.Literal('inspect'),
    kind: t.Union([t.Literal('pixel'), t.Literal('vector')]),
    zoom: t.Integer({ minimum: L.zoom.min, maximum: L.zoom.max }),
  }),
  t.Object({
    type: t.Literal('cut'),
    cell: t.Integer({ minimum: L.cell.min, maximum: L.cell.max }),
  }),
  t.Object({
    type: t.Literal('sprite'),
    size: t.Integer({ minimum: L.sprite.min, maximum: L.sprite.max }),
  }),
  // O ateliê do lote 5 do Raio-X (G4): os dois espelhos do Pinta, os traços da nave na grade 16 × 16 e
  // a largura do recorte da folha. Mesma regra: as listas vêm do core, nunca literais aqui.
  t.Object({
    type: t.Literal('mirror-mode'),
    mode: t.Union(MIRROR_MODES.map((m) => t.Literal(m))),
  }),
  t.Object({
    type: t.Literal('trace'),
    piece: t.Union(SYMMETRY_PIECES.map((p) => t.Literal(p))),
  }),
  t.Object({
    type: t.Literal('dot'),
    x: t.Integer({ minimum: L.paperCell.min, maximum: L.paperCell.max }),
    y: t.Integer({ minimum: L.paperCell.min, maximum: L.paperCell.max }),
  }),
  t.Object({ type: t.Literal('clear-paper') }),
  t.Object({
    type: t.Literal('crop'),
    width: t.Union(SHEET_CROP_WIDTHS.map((w) => t.Literal(w))),
  }),
  // As onze cenas do núcleo do Iniciante 2D (15/09/2026). Mesma regra: faixa do core.
  t.Object({
    type: t.Literal('velocity'),
    vx: t.Integer({ minimum: L.velocity.min, maximum: L.velocity.max }),
    vy: t.Integer({ minimum: L.velocity.min, maximum: L.velocity.max }),
  }),
  t.Object({ type: t.Literal('press') }),
  t.Object({ type: t.Literal('hold'), on: t.Boolean() }),
  t.Object({
    type: t.Literal('store'),
    value: t.Integer({ minimum: L.boxValue.min, maximum: L.boxValue.max }),
  }),
  t.Object({
    type: t.Literal('change'),
    by: t.Integer({ minimum: L.boxChange.min, maximum: L.boxChange.max }),
  }),
  t.Object({ type: t.Literal('show'), on: t.Boolean() }),
  t.Object({
    type: t.Union([t.Literal('look'), t.Literal('choose')]),
    id: t.Integer({ minimum: L.targetId.min, maximum: L.targetId.max }),
  }),
  t.Object({
    type: t.Literal('define'),
    field: t.Union([t.Literal('speed'), t.Literal('life')]),
    // ⚠️ A faixa POR CAMPO é do core (`isSceneSetup`/`isSceneAction`): aqui vale a mais larga
    // das duas, e o guard do domínio aperta a certa na publicação.
    value: t.Integer({ minimum: L.typeLife.min, maximum: L.typeSpeed.max }),
  }),
  t.Object({ type: t.Literal('spawnOne') }),
  t.Object({
    type: t.Literal('walk'),
    x: t.Integer({ minimum: L.worldX.min, maximum: L.worldX.max }),
  }),
  t.Object({
    type: t.Literal('approach'),
    distance: t.Integer({ minimum: L.approach.min, maximum: L.approach.max }),
  }),
  t.Object({
    type: t.Literal('mode'),
    kind: t.Union([t.Literal('ask'), t.Literal('event')]),
  }),
  t.Object({ type: t.Literal('shoot') }),
  t.Object({
    type: t.Literal('recharge'),
    seconds: t.Number({ minimum: L.recharge.min, maximum: L.recharge.max }),
  }),
  t.Object({
    type: t.Literal('target'),
    x: t.Integer({ minimum: L.aimX.min, maximum: L.aimX.max }),
    y: t.Integer({ minimum: L.aimY.min, maximum: L.aimY.max }),
  }),
  t.Object({
    type: t.Literal('direction'),
    x: t.Integer({ minimum: -1, maximum: 1 }),
    y: t.Integer({ minimum: -1, maximum: 1 }),
  }),
  // Lote 5 do Raio-X (G5): "Andar 1 segundo" na `diagonal`, o gesto que tomou o lugar do relógio.
  t.Object({ type: t.Literal('stride') }),
  t.Object({
    type: t.Literal('paint-tile'),
    row: t.Integer({ minimum: L.mapRow.min, maximum: L.mapRow.max }),
    col: t.Integer({ minimum: L.mapCol.min, maximum: L.mapCol.max }),
    tile: t.Union(MAP_TILES.map((t2) => t.Literal(t2))),
  }),
  /* ── O motor, o 3D e o ateliê (15/09/2026) ─────────────────────────────────────────────── */
  t.Object({
    type: t.Literal('brain'),
    id: t.Integer({ minimum: L.brainId.min, maximum: L.brainId.max }),
    state: t.Union([
      t.Literal('parado'),
      t.Literal('mirar'),
      t.Literal('atirar'),
      t.Literal('recarregar'),
    ]),
  }),
  t.Object({
    type: t.Literal('count'),
    kind: t.Union([t.Literal('frames'), t.Literal('seconds')]),
  }),
  t.Object({
    type: t.Literal('radius'),
    which: t.Union([t.Literal('a'), t.Literal('b')]),
    value: t.Integer({ minimum: L.radius.min, maximum: L.radius.max }),
  }),
  t.Object({
    type: t.Literal('place3d'),
    x: t.Integer({ minimum: L.spaceX.min, maximum: L.spaceX.max }),
    // ⚠️ O y do 3D cresce para CIMA e o piso é ZERO: a faixa não é a da tela 2D.
    y: t.Integer({ minimum: L.spaceY.min, maximum: L.spaceY.max }),
    z: t.Integer({ minimum: L.spaceZ.min, maximum: L.spaceZ.max }),
  }),
  t.Object({
    type: t.Literal('orbit'),
    yaw: t.Integer({ minimum: L.yaw.min, maximum: L.yaw.max }),
    pitch: t.Integer({ minimum: L.pitch.min, maximum: L.pitch.max }),
  }),
  t.Object({ type: t.Literal('recenter') }),
  t.Object({ type: t.Literal('wireframe'), on: t.Boolean() }),
  // Lote 5 do Raio-X (G6): "Ver os pontos" em três degraus (`mesh`) e onde o estado das torres mora
  // (`entity-state`). Os degraus vêm do core, como as letras do mapa.
  t.Object({
    type: t.Literal('see-points'),
    level: t.Union(MESH_LEVELS.map((nivel) => t.Literal(nivel))),
  }),
  t.Object({ type: t.Literal('brain-scope'), shared: t.Boolean() }),
  t.Object({
    type: t.Literal('point'),
    x: t.Integer({ minimum: L.pointX.min, maximum: L.pointX.max }),
    y: t.Integer({ minimum: L.pointY.min, maximum: L.pointY.max }),
  }),
  t.Object({
    type: t.Literal('ink'),
    part: t.Union([t.Literal('fill'), t.Literal('stroke')]),
    on: t.Boolean(),
  }),
  t.Object({
    type: t.Literal('light'),
    side: t.Union([t.Literal('left'), t.Literal('right')]),
  }),
  t.Object({ type: t.Literal('shade'), on: t.Boolean() }),
])
const SceneId = t.Union(SCENE_IDS.map((id) => t.Literal(id)))
/**
 * Quem está no palco: a mesma cena servindo outro curso.
 *
 * ⚠️ O nome é TEXTO que a criança lê dentro da frase da cena, então ele é limitado aqui e
 * conferido de novo pelo `isSceneCast` do core na hora de publicar. O gênero não é enfeite: é
 * ele que decide o artigo em português.
 */
const SceneActorSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 24 }),
  gender: t.Union([t.Literal('m'), t.Literal('f')]),
  plural: t.Optional(t.String({ maxLength: 28 })),
  // ⚠️ O que o palco DESENHA (Raio-X, lote 3). Sem ele no schema, o `normalize` do Elysia apagaria
  // a figura escolhida no admin numa rota de corpo tipado, e a nave voltaria a ser desenhada pelo
  // nome (ou como o Dino). Ausente = "pelo nome", que é o caso dos manifestos já publicados.
  figure: t.Optional(t.Union(SCENE_FIGURES.map((f) => t.Literal(f)))),
})
/**
 * Como a pilha da `layers` se apresenta (full review de experiência do conjunto, A1): a lista de blocos
 * do Estúdio (padrão) ou o painel Camadas do Pinta. Derivado de `SCENE_PILHAS`; quem recusa a pilha
 * fora da `layers` é o `isSceneActivity` do core, na publicação.
 */
const ScenePilhaSchema = t.Union(SCENE_PILHAS.map((p) => t.Literal(p)))
const SceneCastSchema = t.Object({
  hero: t.Optional(SceneActorSchema),
  obstacle: t.Optional(SceneActorSchema),
  scenery: t.Optional(SceneActorSchema),
})
/**
 * O CASO da atividade: por onde a cena começa e o que ela cobra.
 *
 * ⚠️ Os tetos vêm de `SETUP_LIMITS`, e o conteúdo é conferido de novo pelo `isSceneSetup` do
 * core na publicação — é lá que mora a régua que recusa ação de outra cena, `reset` dentro do
 * caso e meta que não existe no modelo. Aqui é a porta de entrada, não o juiz.
 */
const SceneSetupActions = t.Array(SceneActionSchema, {
  minItems: 1,
  maxItems: SETUP_LIMITS.actions,
})
const SceneSetupSchema = t.Object({
  actions: t.Optional(SceneSetupActions),
  goals: t.Optional(
    t.Array(t.String({ minLength: 1, maxLength: 80 }), {
      minItems: 1,
      maxItems: SETUP_LIMITS.goals,
    }),
  ),
})
const SceneScriptSchema = t.Array(
  t.Object({
    id: t.String({ minLength: 1, maxLength: 80 }),
    caption: t.String({ minLength: 1, maxLength: 500 }),
    highlight: t.Optional(t.Union([t.Literal('scene'), t.Literal('tools'), t.Literal('compare')])),
    actions: t.Array(SceneActionSchema, { minItems: 1, maxItems: 16 }),
    waitFor: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  }),
  { minItems: 1, maxItems: 12 },
)
export const InteractiveBlockSchema = t.Object({
  kind: t.Literal('interactive'),
  title: t.String({ minLength: 1, maxLength: 200 }),
  instructions: t.String({ minLength: 1, maxLength: 10000 }),
  hints: t.Array(t.String({ maxLength: 10000 }), { maxItems: 10 }),
  required: t.Boolean(),
  /**
   * As quatro atividades. ⚠️ Mexer aqui vem ANTES de mexer no admin, nunca depois: um campo
   * que o editor mande sem estar declarado só é aceito por acidente.
   *
   * ⚠️ E o comportamento é diferente em cada nível, MEDIDO no fluxo real de rascunho →
   * publicação: campo não declarado no nível do BLOCO é RECUSADO alto (400 `VALIDATION_ERROR`);
   * campo não declarado DENTRO de `activity` não é recusado nem apagado — é gravado tal e
   * qual, porque o rascunho usa `additionalProperties: true` e o `t.Object` aninhado do
   * TypeBox não fecha as extras. Quem protege a criança disso é o `publicInteractiveBlock`,
   * que poda por ALLOWLIST (`PUBLIC_ACTIVITY_FIELDS`) antes de o bloco chegar nela.
   *
   * Saíram `simulation` (a geração 1), `experiment`, `comparison`, `prediction` e `sequence`:
   * nenhum curso usava os três primeiros, e os dois últimos foram reescritos no conteúdo.
   */
  activity: t.Union([
    t.Object({
      type: t.Literal('demonstration'),
      scene: SceneId,
      instructionAudioUrl: t.Optional(t.String({ maxLength: 4000 })),
      /** Sem roteiro próprio, vale o do modelo da cena. */
      script: t.Optional(SceneScriptSchema),
      cast: t.Optional(SceneCastSchema),
      /**
       * ⚠️⚠️ O MESMO schema da experimentação, de propósito, mesmo que a demonstração não cobre
       * meta nenhuma. Declarando só `actions`, o `normalize` do Elysia APAGA o `goals` que
       * viesse junto em vez de recusá-lo: o payload era aceito com o campo sumido, e o guard do
       * core — que é quem tem a régua e a mensagem certa — nunca chegava a vê-lo. Quem recusa é
       * o `isSceneSetup(..., { goals: false })` na publicação.
       */
      setup: t.Optional(SceneSetupSchema),
      presentation: t.Optional(t.Union([t.Literal('guided'), t.Literal('inline')])),
      pilha: t.Optional(ScenePilhaSchema),
    }),
    t.Object({
      type: t.Literal('experimentation'),
      scene: SceneId,
      instructionAudioUrl: t.Optional(t.String({ maxLength: 4000 })),
      initialImpulse: t.Optional(t.Integer({ minimum: L.impulse.min, maximum: L.impulse.max })),
      cast: t.Optional(SceneCastSchema),
      setup: t.Optional(SceneSetupSchema),
      pilha: t.Optional(ScenePilhaSchema),
    }),
    t.Object({ type: t.Literal('question') }),
    t.Object({ type: t.Literal('html'), html: t.String({ minLength: 1, maxLength: 500000 }) }),
  ]),
  checkpoint: t.Optional(
    t.Object({
      prompt: t.String({ minLength: 1, maxLength: 5000 }),
      choices: Choices,
      correctChoiceId: t.String({ maxLength: 80 }),
      explanation: t.String({ minLength: 1, maxLength: 5000 }),
    }),
  ),
  /**
   * A pergunta de ANTES de mexer. ⚠️ O gabarito é opcional e não avalia nada: previsão errada
   * é caminho de aprendizado, e reprovar por ela ensinaria a criança a não arriscar.
   */
  prediction: t.Optional(
    t.Object({
      prompt: t.String({ minLength: 1, maxLength: 5000 }),
      /**
       * ⚠️ As escolhas da previsão têm `shows` (para onde olhar quando a criança escolheu esta e a
       * cena mostrou outra coisa). Com o `Choices` da pergunta, o `normalize` do Elysia APAGARIA o
       * campo em silêncio: o bloco salvava e o player nunca mais tinha a frase.
       */
      choices: t.Array(
        t.Object({
          id: t.String({ minLength: 1, maxLength: 80 }),
          label: Label,
          shows: t.Optional(t.String({ minLength: 1, maxLength: 2000 })),
        }),
        { minItems: 2, maxItems: 20 },
      ),
      correctChoiceId: t.Optional(t.String({ maxLength: 80 })),
      /** A meta cuja queda responde o palpite. Quem confere que ela existe na cena é o core. */
      revealOn: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    }),
  ),
})
const SectionRule = t.Union([
  t.Object({ type: t.Literal('usesLoop') }),
  t.Object({
    type: t.Literal('usesBlock'),
    blockType: t.String({ maxLength: 200 }),
    area: t.Optional(
      t.Union(
        (['structure', 'appearance', 'molds', 'start', 'events', 'loops'] as const).map((area) =>
          t.Literal(area),
        ),
      ),
    ),
    withinBlock: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    ...ProjectBlockRelationshipsSchema,
    fields: t.Optional(
      t.Record(t.String(), t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]), {
        maxProperties: 20,
      }),
    ),
    inputs: t.Optional(
      t.Record(t.String(), t.Union([t.String({ maxLength: 200 }), t.Number(), t.Boolean()]), {
        maxProperties: 20,
      }),
    ),
  }),
  ...(['declaresVariable', 'definesFunction', 'callsFunction'] as const).map((type) =>
    t.Object({ type: t.Literal(type), name: t.String({ maxLength: 200 }) }),
  ),
])
export const SectionCompletionSchema = t.Object({
  version: t.Literal(1),
  blockIds: t.Array(Id, { maxItems: 200 }),
  platformAction: t.Optional(t.Union(PLATFORM_ACTIONS.map((action) => t.Literal(action)))),
  projectChecks: t.Optional(
    t.Array(
      t.Object({
        id: t.String({ minLength: 1, maxLength: 200 }),
        label: t.String({ maxLength: 200 }),
        rule: SectionRule,
      }),
      { maxItems: 20 },
    ),
  ),
})
export const SectionProjectParams = t.Object({ lessonId: Id, sectionId: Id })
export const SectionProjectBody = t.Object({ revision: Id, project: t.Unknown() })
export const LessonSectionSchema = t.Object({
  id: Id,
  title: t.String({ minLength: 1, maxLength: 200 }),
  objective: t.String({ maxLength: 2000 }),
  intent: t.Union([
    t.Literal('presentation'),
    t.Literal('demonstration'),
    t.Literal('exploration'),
    t.Literal('explanation'),
    t.Literal('application'),
    t.Literal('delivery'),
    t.Literal('material'),
    t.Literal('closing'),
  ]),
  blockIds: t.Array(Id, { maxItems: 200 }),
  workspaceBlockId: t.Nullable(Id),
  externalTool: t.Nullable(t.Union([t.Literal('estudio'), t.Literal('pinta')])),
  completion: t.Optional(SectionCompletionSchema),
  pendingMedia: t.Array(t.String({ minLength: 1, maxLength: 2000 }), { maxItems: 20 }),
})
export const LearningStructureBody = t.Object({
  expectedRevision: t.Nullable(Id),
  sections: t.Array(LessonSectionSchema, { minItems: 1, maxItems: 60 }),
})
export const LearningLessonParams = t.Object({ lessonId: Id })
export const LearningBlockParams = t.Object({ lessonId: Id, blockId: Id })
export const LearningNavigationBody = t.Object({ sectionId: Id })
export const LearningHelpBody = t.Object({
  requestId: t.Optional(t.String({ format: 'uuid' })),
  sectionId: Id,
  body: t.String({ minLength: 1, maxLength: 8000 }),
})
const Answers = t.Record(
  t.String({ pattern: '^[a-zA-Z][\\w-]{0,79}$' }),
  t.Union([
    t.String({ maxLength: 8000 }),
    t.Number(),
    t.Boolean(),
    t.Null(),
    t.Array(t.String({ maxLength: 10000 }), { maxItems: 100 }),
    t.Record(t.String(), t.Number(), { maxProperties: 20 }),
  ]),
  { maxProperties: 40 },
)
const ProgressFields = {
  revision: t.String({ minLength: 1, maxLength: 32 }),
  answers: Answers,
  hintsUsed: t.Integer({ minimum: 0, maximum: 10 }),
}
export const LearningProgressBody = t.Object({
  ...ProgressFields,
  positionSeconds: t.Nullable(t.Integer({ minimum: 0, maximum: 86400 })),
})
export const LearningAttemptBody = t.Object({ ...ProgressFields, id: Id })
export const LearningReportQuery = t.Object({ userId: Id, accountId: Id })
export const LearningImportPreviewBody = t.Object({ document: t.Unknown() })
export const LearningImportApplyBody = t.Object({
  operationId: Id,
  document: t.Unknown(),
  // Import preview returns the same UUID revision used by draft writes/publication.
  expectedFingerprint: Id,
})
