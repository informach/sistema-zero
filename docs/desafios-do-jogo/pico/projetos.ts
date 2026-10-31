import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export const VARIACOES = ['plataforma', 'pulo-alto', 'floco', 'quedas'] as const
export type Variacao = (typeof VARIACOES)[number]
/**
 * As medidas da fase. O pinguim tem 44 × 48 e fica de pé em y 368, com os pés no topo do gelo
 * (y 416). O primeiro bloco de gelo vai até x 230 e o segundo começa em 320: o buraco entre os
 * dois tem 90 de largura, e a água fica embaixo, de y 462 até o fim do palco.
 */
export const PICO = {
  largura: 640,
  altura: 480,
  inicioX: 40,
  inicioY: 300,
  emPe: 368,
  topoDoGelo: 416,
  fimDoGelo1: 230,
  inicioDoGelo2: 320,
  mar: 462,
  passo: 2,
  pulo: 12,
  puloBaixo: 9,
  puloAlto: 13,
  /**
   * A fase 2 da fase de plataforma (A46, revisão de 31/10/2026): um gelo no alto, em cima do
   * começo (x 20 a 200, topo em y 300), com a bandeira nele. Do gelo do começo, o pulo de -12 chega
   * lá (sobe 120 e pousa no topo, a 68 do gelo de baixo).
   */
  fase2: { inicio: 20, fim: 200, topo: 300, bandeiraX: 130, bandeiraY: 220, pinguimY: 330 },
} as const
const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '===' | '+' | '-' | '<', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const iff = (cond: JSExpr, then: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: [],
})
/** Se com Senão: a troca de fase não pode cair no mesmo contato que termina a fase 2. */
const seSenao = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const y = (spriteVar: string): JSExpr => ({ type: 'g2d:spriteY', spriteVar })
const x = (spriteVar: string): JSExpr => ({ type: 'g2d:spriteX', spriteVar })
const vel = (spriteVar: string, vx: JSExpr, vy: JSExpr): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar,
  vx,
  vy,
})
const apply = (spriteVar: string): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar })
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
  color = '#1d3b5c',
): JSStatement => ({ type: 'g2d:drawLabel', ctxVar: 'ctx', text, x, y, size, color, align: 'left' })
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const arte: Record<string, string> = {
  pico: svg(
    640,
    480,
    '<defs><linearGradient id="ceu" x2="0" y2="1"><stop stop-color="#cfe9fb"/><stop offset="1" stop-color="#eef7ff"/></linearGradient></defs><rect width="640" height="480" rx="18" fill="url(#ceu)"/><path d="M0 330 120 170 210 260 330 110 450 250 540 180 640 300V480H0Z" fill="#b9d3ea"/><path d="M120 170 150 210 128 206 110 222ZM330 110 368 166 340 158 318 176ZM540 180 566 214 546 210 530 224Z" fill="#ffffff"/><path d="M0 380 90 300 170 350 260 290 360 360 470 300 560 350 640 320V480H0Z" fill="#dcebf7"/><rect y="452" width="640" height="28" fill="#4f8fc0"/><path d="M0 462q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#a9d4f2" stroke-width="3"/><g fill="#ffffff" opacity=".85"><circle cx="70" cy="70" r="3"/><circle cx="190" cy="120" r="2"/><circle cx="290" cy="60" r="3"/><circle cx="420" cy="100" r="2"/><circle cx="600" cy="80" r="3"/></g>',
  ),
  pinguim: svg(
    44,
    48,
    '<ellipse cx="22" cy="27" rx="17" ry="20" fill="#24364f"/><ellipse cx="22" cy="31" rx="11" ry="15" fill="#f6fbff"/><circle cx="16" cy="18" r="3" fill="#ffffff"/><circle cx="28" cy="18" r="3" fill="#ffffff"/><circle cx="16.5" cy="18.5" r="1.5" fill="#1b2433"/><circle cx="27.5" cy="18.5" r="1.5" fill="#1b2433"/><path d="M18 23h8l-4 5Z" fill="#f2a33a"/><path d="M8 40q4 6 10 5M36 40q-4 6-10 5" fill="none" stroke="#f2a33a" stroke-width="4" stroke-linecap="round"/><path d="M10 14q12-12 24 0" fill="none" stroke="#d6566b" stroke-width="5" stroke-linecap="round"/>',
  ),
  gelo: svg(
    120,
    64,
    '<rect x="2" y="2" width="116" height="60" rx="10" fill="#e8f6ff" stroke="#7fb4d8" stroke-width="3"/><rect x="2" y="2" width="116" height="14" rx="7" fill="#ffffff"/><path d="M20 30l14 10M70 26l18 14M50 48l12-8" stroke="#a7d1ec" stroke-width="3" stroke-linecap="round"/>',
  ),
  mar: svg(640, 18, '<rect width="640" height="18" fill="#4f8fc0" opacity=".6"/>'),
  bandeira: svg(
    40,
    80,
    '<rect x="6" y="4" width="5" height="76" rx="2" fill="#6b4a33"/><path d="M11 6 38 16 11 28Z" fill="#e2574c" stroke="#a63a33" stroke-width="2"/><ellipse cx="9" cy="78" rx="9" ry="3" fill="#ffffff"/>',
  ),
  floco: svg(
    32,
    32,
    '<g stroke="#5fa9e0" stroke-width="3" stroke-linecap="round"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13"/><path d="M12 6l4 3 4-3M12 26l4-3 4 3"/></g><circle cx="16" cy="16" r="4" fill="#ffffff" stroke="#5fa9e0" stroke-width="2"/>',
  ),
}
export const assetsDoPico: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `pico-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** Reposição com velocidade e borda, ambos ensinados, sem bloco de posição manual. */
function colocar(sprite: string, x: number, yAlvo: number): JSStatement[] {
  return [
    vel(sprite, n(-640), n(-480)),
    apply(sprite),
    { type: 'g2d:clampToScreen', spriteVar: sprite, ctxVar: 'ctx' },
    vel(sprite, n(x), n(yAlvo)),
    apply(sprite),
    vel(sprite, n(0), n(0)),
  ]
}
function recomecar(variacao: Variacao): JSStatement[] {
  return [
    ...colocar('pinguim', PICO.inicioX, PICO.inicioY),
    ...(variacao === 'plataforma' ? [set('fase', n(1)), ...colocar('bandeira', 572, 336)] : []),
    set('noChao', b(false)),
    set('chegou', b(false)),
    ...(variacao === 'floco' ? [set('pegouFloco', b(false))] : []),
    set('flocos', n(0)),
    set('quedas', n(0)),
    set('recado', s('Ande com as setas e pule com Espaço ou A para passar o buraco.')),
  ]
}
function pular(forca: number): JSStatement[] {
  return [
    iff(v('noChao'), [
      vel('pinguim', n(0), n(-forca)),
      set('noChao', b(false)),
      set('recado', s('O pinguim pulou.')),
    ]),
  ]
}
/**
 * Pousar num gelo (pronto no cenário, C01b): o pinguim dentro da faixa do gelo e chegando ao topo
 * por cima fica de pé nele. Só comparações de posição e contas da trilha; o contato entre dois
 * sprites só avisa o começo do encontro e não segura o pinguim em pé, e o grupo com sprites
 * avulsos só aparece num curso extra. A colisão por eixo em código é matéria do Mestre (Python).
 */
function pousarEm(inicio: number, fim: number, topo: number): JSStatement {
  return iff(bin('<', x('pinguim'), n(fim)), [
    iff(bin('<', n(inicio - 44), x('pinguim')), [
      iff(bin('<', n(topo - 48), y('pinguim')), [
        iff(bin('<', y('pinguim'), n(topo - 30)), [
          vel('pinguim', n(0), bin('-', n(topo - 48), y('pinguim'))),
          apply('pinguim'),
          vel('pinguim', n(0), n(0)),
          set('noChao', b(true)),
        ]),
      ]),
    ]),
  ])
}
function pousar(alto: boolean, fases: boolean): JSStatement[] {
  const f = PICO.fase2
  return [
    pousarEm(0, PICO.fimDoGelo1, PICO.topoDoGelo),
    pousarEm(PICO.inicioDoGelo2, 640, PICO.topoDoGelo),
    ...(alto ? [pousarEm(380, 530, 270)] : []),
    ...(fases ? [iff(bin('===', v('fase'), n(2)), [pousarEm(f.inicio, f.fim, f.topo)])] : []),
  ]
}
/**
 * A bandeira com fases (A46): na fase 1, leva à fase 2 (o pinguim volta ao começo e a bandeira
 * sobe para o gelo do alto); na fase 2, termina o jogo, uma vez só.
 */
function bandeiraComFases(): JSStatement[] {
  const f = PICO.fase2
  return [
    seSenao(
      bin('===', v('fase'), n(1)),
      [
        set('fase', n(2)),
        ...colocar('pinguim', PICO.inicioX, f.pinguimY),
        set('noChao', b(false)),
        ...colocar('bandeira', f.bandeiraX, f.bandeiraY),
        set('recado', s('Fase 2: suba no gelo do alto e chegue à bandeira.')),
      ],
      [
        iff(bin('===', v('chegou'), b(false)), [
          set('chegou', b(true)),
          set('recado', s('O pinguim chegou à bandeira da fase 2. O jogo terminou.')),
        ]),
      ],
    ),
  ]
}

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const basePronta = variacao !== 'plataforma' || pronto
  const alto = variacao === 'pulo-alto'
  const fases = variacao === 'plataforma'
  const forca = alto ? (pronto ? PICO.puloAlto : PICO.puloBaixo) : PICO.pulo
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#dcebf7' },
    // Espaço/A pula e Enter/+ recomeça: teclas da trilha, sem clique em grupo (C01b).
    { type: 'g2d:enableClassicControls', mode: 'auto' },
    ...['noChao', 'chegou', 'pegouFloco'].map(
      (name): JSStatement => ({ type: 'var', name, value: b(false) }),
    ),
    { type: 'var', name: 'flocos', value: n(0) },
    { type: 'var', name: 'quedas', value: n(0) },
    ...(fases ? [{ type: 'var', name: 'fase', value: n(1) } as JSStatement] : []),
    {
      type: 'var',
      name: 'recado',
      value: s('Ande com as setas e pule com Espaço ou A para passar o buraco.'),
    },
    image('pinguim', 'pinguim', PICO.inicioX, PICO.inicioY, 44, 48),
    image('gelo1', 'gelo', 0, PICO.topoDoGelo, PICO.fimDoGelo1, 64),
    image('gelo2', 'gelo', PICO.inicioDoGelo2, PICO.topoDoGelo, 640 - PICO.inicioDoGelo2, 64),
    ...(alto ? [image('geloAlto', 'gelo', 380, 270, 150, 24)] : []),
    ...(fases
      ? [
          image(
            'geloDaFase2',
            'gelo',
            PICO.fase2.inicio,
            PICO.fase2.topo,
            PICO.fase2.fim - PICO.fase2.inicio,
            24,
          ),
        ]
      : []),
    image('mar', 'mar', 0, PICO.mar, 640, 18),
    image('bandeira', 'bandeira', alto ? 470 : 572, alto ? 190 : 336, 40, 80),
    ...(variacao === 'floco' ? [image('floco', 'floco', 46, 236, 32, 32)] : []),
  ]
  const events: JSStatement[] = [
    { type: 'g2d:onKey', key: 'Space', body: basePronta ? pular(forca) : [] },
    // Recomeçar é pronto no cenário (o que era o botão).
    { type: 'g2d:onKey', key: 'Enter', body: recomecar(variacao) },
    { type: 'g2d:onKey', key: 'ArrowUp', body: pronto ? pular(forca) : [] },
    {
      type: 'g2d:onOverlap',
      aVar: 'pinguim',
      bVar: 'mar',
      body: basePronta
        ? [
            ...colocar('pinguim', PICO.inicioX, PICO.inicioY),
            set('noChao', b(false)),
            ...(variacao === 'quedas' && pronto
              ? [set('quedas', bin('+', v('quedas'), n(1)))]
              : []),
            set('recado', s('O pinguim caiu na água e voltou ao começo.')),
          ]
        : [],
    },
    {
      type: 'g2d:onOverlap',
      aVar: 'pinguim',
      bVar: 'bandeira',
      body: !basePronta
        ? []
        : fases
          ? bandeiraComFases()
          : [
              iff(bin('===', v('chegou'), b(false)), [
                set('chegou', b(true)),
                set('recado', s('O pinguim chegou à bandeira. A fase terminou.')),
              ]),
            ],
    },
    ...(variacao === 'floco'
      ? [
          {
            type: 'g2d:onOverlap',
            aVar: 'pinguim',
            bVar: 'floco',
            body: pronto
              ? [
                  iff(bin('===', v('pegouFloco'), b(false)), [
                    set('pegouFloco', b(true)),
                    set('flocos', bin('+', v('flocos'), n(1))),
                    set('recado', s('O pinguim pegou o floco de neve.')),
                  ]),
                ]
              : [],
          } as JSStatement,
        ]
      : []),
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
        {
          type: 'g2d:updateEachFrame',
          body: [
            // Gravidade e pouso prontos; as setas e a borda da tela são da criança no principal.
            set('noChao', b(false)),
            { type: 'g2d:applyGravity', spriteVar: 'pinguim' } as JSStatement,
            ...(basePronta
              ? [{ type: 'g2d:arrowsX', spriteVar: 'pinguim', speed: PICO.passo } as JSStatement]
              : []),
            apply('pinguim'),
            ...(basePronta
              ? [{ type: 'g2d:clampToScreen', spriteVar: 'pinguim', ctxVar: 'ctx' } as JSStatement]
              : []),
            ...pousar(alto, fases),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'pico' },
            label('Fase do Pico Gelado', 18, 32, 25),
            label('Setas andam, Espaço ou A pula. Chegue à bandeira.', 18, 61, 16),
            draw('mar'),
            draw('gelo1'),
            draw('gelo2'),
            ...(alto ? [draw('geloAlto')] : []),
            ...(fases ? [iff(bin('===', v('fase'), n(2)), [draw('geloDaFase2')])] : []),
            draw('bandeira'),
            ...(variacao === 'floco'
              ? [iff(bin('===', v('pegouFloco'), b(false)), [draw('floco')])]
              : []),
            draw('pinguim'),
            label(v('recado'), 18, 92, 15),
            label('Enter ou +: recomeçar a fase.', 400, 32, 15),
            ...(fases
              ? [
                  {
                    type: 'g2d:drawScore',
                    ctxVar: 'ctx',
                    label: 'Fase: ',
                    value: v('fase'),
                    x: 18,
                    y: 122,
                    size: 18,
                    color: '#1d3b5c',
                  } as JSStatement,
                ]
              : []),
            ...(variacao === 'floco' || variacao === 'quedas'
              ? [
                  {
                    type: 'g2d:drawScore',
                    ctxVar: 'ctx',
                    label: variacao === 'floco' ? 'Flocos: ' : 'Quedas: ',
                    value: v(variacao === 'floco' ? 'flocos' : 'quedas'),
                    x: 18,
                    y: 122,
                    size: 18,
                    color: '#1d3b5c',
                  } as JSStatement,
                ]
              : []),
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `pico_${variacao}`)
  const name = 'Fase do Pico Gelado'
  return {
    ...createEmptyProject(`pico-${variacao}`, name),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: assetsDoPico,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
