import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

/** O principal (Quadro das Cores) e as três variações do desafio do dia. */
export const VARIACOES = ['jardim', 'rega-forte', 'sol-forte', 'chuva'] as const
export type Variacao = (typeof VARIACOES)[number]

/**
 * Os números do jardim. A cada segundo o tempo passa; com água e sol, a flor cresce `cresce` e gasta
 * um de cada. Em `floresce` o jardim floresce. Regar e Sol guardam `rega` e `sol` de uma vez.
 */
export const JARDIM = {
  largura: 640,
  altura: 480,
  agua: 0,
  sol: 3,
  rega: 3,
  regaForte: 5,
  luz: 3,
  cresce: 10,
  cresceForte: 20,
  solForte: 6,
  chuva: 1,
  botaoFlor: 40,
  floresce: 100,
} as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const somar = (name: string, quanto: number): JSStatement =>
  set(name, {
    type: 'binop',
    op: quanto < 0 ? '-' : '+',
    left: v(name),
    right: n(Math.abs(quanto)),
  })
const bin = (op: '===' | '>' | '>=' | '<', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const iff = (cond: JSExpr, then: JSStatement[], senao?: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: senao ?? [],
})
const image = (
  varName: string,
  image: string,
  x: number,
  y: number,
  w: number,
  h: number,
): JSStatement => ({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (
  text: string | JSExpr,
  x: number,
  y: number,
  size = 17,
  color = '#3b2f6b',
): JSStatement => ({ type: 'g2d:drawLabel', ctxVar: 'ctx', text, x, y, size, color, align: 'left' })
const placar = (rotulo: string, valor: string, x: number, y: number): JSStatement => ({
  type: 'g2d:drawScore',
  ctxVar: 'ctx',
  label: rotulo,
  value: v(valor),
  x,
  y,
  size: 18,
  color: '#3b2f6b',
})
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const arte: Record<string, string> = {
  jardim: svg(
    640,
    480,
    '<defs><linearGradient id="ceu" x2="0" y2="1"><stop stop-color="#efe8ff"/><stop offset="1" stop-color="#c9b8f4"/></linearGradient></defs><rect width="640" height="480" rx="18" fill="url(#ceu)"/><g fill="#ffffff" opacity=".85"><ellipse cx="90" cy="110" rx="58" ry="22"/><ellipse cx="130" cy="96" rx="40" ry="24"/><ellipse cx="520" cy="80" rx="64" ry="22"/><ellipse cx="560" cy="68" rx="36" ry="20"/></g><g fill="none" stroke-width="7" stroke-linecap="round" opacity=".55"><path d="M430 210a120 120 0 0 1 200 0" stroke="#ff5f5f"/><path d="M440 218a110 110 0 0 1 180 0" stroke="#ffd84f"/><path d="M450 226a100 100 0 0 1 160 0" stroke="#5aa9ff"/></g><path d="M80 360Q320 300 560 360Q600 372 580 392Q320 420 60 392Q40 372 80 360Z" fill="#ffffff"/><path d="M110 366Q320 322 530 366Q320 392 110 366Z" fill="#8a6a4f"/><g fill="#ffffff" opacity=".9"><ellipse cx="96" cy="390" rx="40" ry="16"/><ellipse cx="548" cy="390" rx="42" ry="16"/></g>',
  ),
  muda: svg(
    96,
    120,
    '<path d="M48 118V70" stroke="#4f9a4a" stroke-width="7" stroke-linecap="round"/><path d="M48 86Q26 76 22 58Q42 58 48 78Z" fill="#6cd06a" stroke="#3f7f3a" stroke-width="3"/><path d="M48 80Q70 70 74 52Q54 52 48 72Z" fill="#6cd06a" stroke="#3f7f3a" stroke-width="3"/>',
  ),
  /** A muda ainda sem água ou sem plantio, desbotada (troca de imagem no lugar da opacidade). */
  'muda-cinza': svg(
    96,
    120,
    '<path d="M48 118V70" stroke="#b9b6c2" stroke-width="7" stroke-linecap="round"/><path d="M48 86Q26 76 22 58Q42 58 48 78Z" fill="#dcdae2" stroke="#a9a6b3" stroke-width="3"/><path d="M48 80Q70 70 74 52Q54 52 48 72Z" fill="#dcdae2" stroke="#a9a6b3" stroke-width="3"/>',
  ),
  botaoFlor: svg(
    96,
    120,
    '<path d="M48 118V46" stroke="#4f9a4a" stroke-width="7" stroke-linecap="round"/><path d="M48 92Q24 84 20 64Q42 64 48 86Z" fill="#6cd06a" stroke="#3f7f3a" stroke-width="3"/><path d="M48 78Q72 70 76 50Q54 50 48 72Z" fill="#6cd06a" stroke="#3f7f3a" stroke-width="3"/><path d="M48 18Q34 30 38 46Q48 52 58 46Q62 30 48 18Z" fill="#b07cff" stroke="#6a45b5" stroke-width="3"/>',
  ),
  flor: svg(
    96,
    120,
    '<path d="M48 118V50" stroke="#4f9a4a" stroke-width="7" stroke-linecap="round"/><path d="M48 96Q24 88 20 68Q42 68 48 90Z" fill="#6cd06a" stroke="#3f7f3a" stroke-width="3"/><g stroke="#6a45b5" stroke-width="3"><circle cx="48" cy="18" r="13" fill="#ff8fb0"/><circle cx="72" cy="34" r="13" fill="#ffd84f"/><circle cx="62" cy="58" r="13" fill="#5aa9ff"/><circle cx="34" cy="58" r="13" fill="#6cd06a"/><circle cx="24" cy="34" r="13" fill="#ffa04f"/></g><circle cx="48" cy="38" r="12" fill="#fff3b0" stroke="#b28a2a" stroke-width="3"/>',
  ),
  botao: svg(
    172,
    44,
    '<rect x="2" y="5" width="168" height="37" rx="13" fill="#5b4596"/><rect x="2" y="1" width="168" height="37" rx="13" fill="#7f66c4"/>',
  ),
}
export const assetsDoNuvens: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `nuvens-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

const RECADO_DO_COMECO = 'Regue e dê sol. A cada segundo a flor usa um de cada para crescer.'

/** Tudo volta ao começo (o extra: Enter recomeça o jardim). */
function recomecar(): JSStatement[] {
  return [
    set('agua', n(JARDIM.agua)),
    set('sol', n(JARDIM.sol)),
    set('tempo', n(0)),
    set('crescimento', n(0)),
    set('florida', b(false)),
    set('recado', s(RECADO_DO_COMECO)),
  ]
}

/**
 * Um passo da simulação, a cada segundo: o tempo passa; com água e sol a flor cresce e gasta um
 * de cada; chegando a cem, o jardim floresce uma vez. A variação muda uma regra só.
 */
function simular(variacao: Variacao, pronto: boolean): JSStatement[] {
  const chuva = variacao === 'chuva' && pronto
  const solForte = variacao === 'sol-forte' && pronto
  const crescer: JSStatement[] = solForte
    ? [
        iff(
          bin('>=', v('sol'), n(JARDIM.solForte)),
          [somar('crescimento', JARDIM.cresceForte)],
          [somar('crescimento', JARDIM.cresce)],
        ),
      ]
    : [somar('crescimento', JARDIM.cresce)]
  return [
    somar('tempo', 1),
    ...(chuva ? [somar('agua', JARDIM.chuva)] : []),
    // As duas condições juntas, com um se dentro do outro (o "e" lógico não é da trilha, C01b).
    iff(bin('>', v('agua'), n(0)), [
      iff(bin('>', v('sol'), n(0)), [...crescer, somar('agua', -1), somar('sol', -1)]),
    ]),
    iff(bin('>=', v('crescimento'), n(JARDIM.floresce)), [
      iff(bin('===', v('florida'), b(false)), [
        set('florida', b(true)),
        set('recado', s('O jardim floresceu.')),
      ]),
    ]),
  ]
}

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  // No principal a criança completa os botões e a simulação; nas variações eles já funcionam.
  const basePronta = variacao !== 'jardim' || pronto
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: JARDIM.largura, height: JARDIM.altura, bg: '#efe8ff' },
    // Espaço/A rega e a seta para cima dá sol: teclas da trilha, sem clique em grupo (C01b).
    { type: 'g2d:enableClassicControls', mode: 'auto' },
    { type: 'var', name: 'agua', value: n(JARDIM.agua) },
    { type: 'var', name: 'sol', value: n(JARDIM.sol) },
    { type: 'var', name: 'tempo', value: n(0) },
    { type: 'var', name: 'crescimento', value: n(0) },
    { type: 'var', name: 'florida', value: b(false) },
    { type: 'var', name: 'recado', value: s(RECADO_DO_COMECO) },
    image('flor', 'muda', 272, 236, 96, 120),
  ]
  const rega = variacao === 'rega-forte' && pronto ? JARDIM.regaForte : JARDIM.rega
  const events: JSStatement[] = [
    { type: 'g2d:onKey', key: 'Space', body: basePronta ? [somar('agua', rega)] : [] },
    { type: 'g2d:onKey', key: 'ArrowUp', body: basePronta ? [somar('sol', JARDIM.luz)] : [] },
    { type: 'g2d:onKey', key: 'Enter', body: pronto ? recomecar() : [] },
  ]
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        // A simulação, a cada segundo (um bloco raiz, ao lado do laço de cada quadro).
        {
          type: 'g2d:everySeconds',
          key: 'simulacao',
          seconds: n(1),
          body: basePronta ? simular(variacao, pronto) : [],
        },
        {
          type: 'g2d:updateEachFrame',
          body: [
            // A flor mostra o tamanho: muda, botão e a flor aberta.
            iff(
              bin('>=', v('crescimento'), n(JARDIM.floresce)),
              [{ type: 'g2d:setImage', spriteVar: 'flor', image: 'flor' }],
              [
                iff(
                  bin('>=', v('crescimento'), n(JARDIM.botaoFlor)),
                  [{ type: 'g2d:setImage', spriteVar: 'flor', image: 'botaoFlor' }],
                  [{ type: 'g2d:setImage', spriteVar: 'flor', image: 'muda' }],
                ),
              ],
            ),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'jardim' },
            label('Jardim que floresce', 18, 32, 25),
            label(v('recado'), 18, 61, 15),
            placar('Água: ', 'agua', 18, 100),
            placar('Sol: ', 'sol', 18, 126),
            placar('Tempo: ', 'tempo', 470, 100),
            placar('Crescimento: ', 'crescimento', 470, 126),
            draw('flor'),
            label('Espaço ou A rega. Seta para cima dá sol. Enter ou +: recomeçar.', 18, 455, 15),
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `nuvens_${variacao}`)
  const name = 'Jardim que floresce'
  return {
    ...createEmptyProject(`nuvens-${variacao}`, name),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: assetsDoNuvens,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
