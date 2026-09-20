import type { SceneId } from './actions'

/**
 * A META a que cada degrau da escada de pistas do modelo SERVE.
 *
 * ⭐⭐ Full review de experiência do conjunto (16/09/2026, M1). A caixa da pista é viva, mas o degrau
 * era fixo: `hints[0]` e `hints[1]` falam, quase sempre, da PRIMEIRA meta. A criança que pediu a pista
 * cedo e fez o gesto continuava lendo "Aperte o botão da borda." com a borda já à vista (`stage-size`),
 * e "Mexa só no x" com x e y descobertos (`coordinates`), justo na primeira aula. Os consertos das
 * ondas A e B tinham posto atalhos pela meta que falta em 15 cenas; nas outras 30 a escada seguia cega.
 *
 * Aqui cada degrau diz a que meta ele serve, e `degrau` (evaluate) PULA o degrau cuja meta já caiu, nos
 * três níveis: o nível N é o N-ésimo degrau que ainda faz sentido. Sem nenhum, a escada cai no PEDIDO
 * da meta que falta (o mesmo gesto do "Conferir").
 *
 * - `['a']`: o degrau serve à meta `a`, e some quando ela cai;
 * - `['a', 'b']`: serve às duas (uma observação que vale para as duas), e só some quando AS DUAS caem;
 * - `{ algumaDe: ['a', 'b'] }`: o degrau é um passo que QUALQUER uma delas já prova feito (tocar em
 *   "Criar Dino" na `world`: tanto `hidden` quanto `visible` só caem com o Dino criado).
 *
 * ⚠️ `Record<SceneId, …>` com três degraus: cena nova sem a tabela não compila, e o teste
 * (`pistas.test.ts`) confere que toda meta citada existe no modelo.
 * ⚠️ A escada de CAMADAS da `layers` (`LAYERS_CAMADAS.hints`) tem os mesmos degraus e as mesmas metas.
 */
export type PistaMeta = readonly string[] | { readonly algumaDe: readonly string[] }

export const PISTA_DA_META: Record<SceneId, readonly [PistaMeta, PistaMeta, PistaMeta]> = {
  'once-vs-always': [['once'], ['always', 'on-event'], ['both', 'key-fires', 'flood']],
  'fixed-vs-read': [['same-spot'], ['follows'], ['box-marks']],
  'collision-pair': [['whole-group'], ['just-the-pair'], ['others-stay']],
  invincibility: [['no-shield'], ['window'], ['expires']],
  'number-line': [['colder'], ['greater'], ['stops', 'silent']],
  'unique-names': [['missing'], ['clash'], ['own-name']],
  'motion-amount': [['no-change'], ['local-move'], ['too-much']],
  'two-clocks': [['more-rocks'], ['faster-spin'], ['each-one']],
  'copy-vs-original': [['exported'], ['imported'], ['independent']],
  'published-copy': [['first-publish'], ['only-project'], ['republish']],
  'same-rules-new-skin': [['skin-only'], ['three-skins'], ['rule-off']],
  coordinates: [['right'], ['down'], ['origin']],
  'screen-reader': [['heard-empty'], ['says-goal'], ['says-control']],
  'stage-size': [['border-on'], ['resized'], ['target']],
  'draw-loop': [['frozen'], ['trail'], ['moving']],
  frames: [['two-drawings'], ['movement', 'paused-one'], ['slow-shows-two', 'same-frames']],
  'onion-skin': [['blind-move'], ['ghost-on'], ['even-step']],
  symmetry: [['one-side'], ['two-sides'], ['axis-decides', 'fill-ignores-mirror']],
  'pixel-vector': [['stairs'], ['smooth'], ['alike']],
  'sheet-vs-sprite': [['squeezed', 'crop-half'], ['crop-whole'], ['size-apart']],
  world: [['hidden', 'visible'], { algumaDe: ['hidden', 'visible'] }, ['hidden', 'visible']],
  layers: [['front'], ['front'], ['front']],
  gravity: [['floating'], ['landed'], ['floating', 'landed']],
  impulse: [['first-height', 'other-height'], ['other-height'], ['other-height']],
  'jump-sound': [['false-sound'], ['silent-jump'], ['every-jump']],
  spawn: [['every-frame'], ['every-frame', 'with-timer'], ['with-timer']],
  cleanup: [['invisible-stored'], ['invisible-stored'], ['rule-removes']],
  'game-state': [['outside'], ['waiting', 'playing'], ['waiting', 'playing']],
  controls: [['missing-touch'], ['start-tap'], ['start-tap', 'start-key']],
  restart: [
    ['ended', 'screen-only'],
    ['clean-track'],
    ['screen-only', 'clean-track', 'back-to-menu'],
  ],
  hitbox: [['contact'], ['area-contrast'], ['too-small']],
  score: [
    ['score-runaway', 'score-idle-wrong'],
    ['score-start', 'score-waiting', 'score-playing', 'score-end', 'score-kept'],
    [
      'score-runaway',
      'score-idle-wrong',
      'score-start',
      'score-waiting',
      'score-playing',
      'score-end',
      'score-kept',
    ],
  ],
  lives: [['points-stay'], ['life-lost', 'points-stay'], ['over']],
  random: [['positions'], ['positions', 'velocities'], ['repeat', 'velocities']],
  acceleration: [['old-speed'], ['base-limit'], ['variation-limit']],
  velocity: [['moves'], ['moves'], ['left']],
  'hold-vs-press': [['one-step'], ['while-held'], ['apart']],
  variable: [
    ['stored', 'changed-hidden'],
    ['changed-hidden', 'shown'],
    ['changed-hidden', 'shown'],
  ],
  'group-loop': [['looked-all'], ['nearest'], ['looked-all', 'nearest']],
  'enemy-type': [['many'], ['all-change'], ['many', 'all-change']],
  camera: [['lost'], ['lost'], ['follows']],
  contact: [['drain', 'once'], ['drain', 'once'], ['apart']],
  cooldown: [['burst'], ['waiting'], ['waiting']],
  aim: [['arrow'], ['straight-miss', 'follows'], ['follows']],
  diagonal: [['straight'], ['faster'], ['same']],
  tilemap: [['text-is-map'], ['text-is-map'], ['coin-row']],
  pool: [['grows'], ['grows', 'recycled'], ['steady']],
  'entity-state': [['own'], ['acts', 'independent'], ['own', 'acts']],
  'delta-time': [['apart'], ['apart'], ['apart', 'together']],
  'circle-collision': [['touch'], ['touch'], ['formula']],
  'axis-z': [['depth'], ['up'], ['up', 'shadow']],
  'camera-3d': [
    ['one-face', 'two-faces', 'three-faces'],
    ['two-faces', 'three-faces'],
    ['one-face'],
  ],
  mesh: [['points'], ['points', 'skin'], ['points', 'skin']],
  'pick-ray': [['first', 'face'], ['first'], ['first']],
  'fill-stroke': [
    ['only-fill', 'only-stroke'],
    ['only-fill', 'only-stroke'],
    ['only-fill', 'only-stroke', 'both'],
  ],
  shading: [['volume'], ['side'], ['side']],
}

/** As metas que um degrau cita, na ordem em que foram escritas. */
export function metasDaPista(meta: PistaMeta): readonly string[] {
  return 'algumaDe' in meta ? meta.algumaDe : meta
}

/** O degrau já foi cumprido com estas descobertas? */
export function pistaCumprida(meta: PistaMeta, descobertas: readonly string[]): boolean {
  if ('algumaDe' in meta) return meta.algumaDe.some((m) => descobertas.includes(m))
  return meta.length > 0 && meta.every((m) => descobertas.includes(m))
}
