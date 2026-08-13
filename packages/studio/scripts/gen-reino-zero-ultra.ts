/** Gera a IR estática do exemplo core Reino Zero Ultra a partir do fonte canônico. */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REINO_ZERO_ULTRA_SOURCE } from '../src/examples/reinoZeroUltraSource'
import { normalizeSZIR, SZIRV2Schema } from '../src/ir'
import { parseJS } from '../src/parsers/js'

function containsType(value: unknown, type: string): boolean {
  if (Array.isArray(value)) return value.some((child) => containsType(child, type))
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.type === type || Object.values(record).some((child) => containsType(child, type))
}

function stripGeneratedIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripGeneratedIds)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '__id')
      .map(([key, child]) => [key, stripGeneratedIds(child)]),
  )
}

const ir = normalizeSZIR({
  html: [
    {
      type: 'element',
      tag: 'main',
      id: 'reino-shell',
      attrs: { 'aria-label': 'Reino Zero Ultra' },
      children: [
        {
          type: 'element',
          tag: 'header',
          children: [
            { type: 'element', tag: 'strong', text: 'Reino Zero Ultra' },
            {
              type: 'element',
              tag: 'span',
              text: 'Motor nativo · 32 fases · arte vetorial',
            },
          ],
        },
        {
          type: 'canvas',
          id: 'reino-zero-ultra',
          width: 960,
          height: 540,
          attrs: {
            tabindex: '0',
            'aria-label': 'Jogo Reino Zero Ultra',
            'aria-describedby': 'reino-instructions reino-announcement',
          },
        },
        {
          type: 'element',
          tag: 'div',
          id: 'touch-controls',
          attrs: { class: 'touch-controls', 'aria-label': 'Controles por toque' },
          children: [
            {
              type: 'element',
              tag: 'button',
              id: 'touch-left',
              text: 'P1 ◀',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 esquerda' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-up',
              text: 'P1 ▲',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 cima' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-down',
              text: 'P1 ▼',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 baixo' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-right',
              text: 'P1 ▶',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 direita' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-action',
              text: 'P1 AÇÃO',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 ação' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-jump',
              text: 'P1 PULO',
              attrs: { type: 'button', 'aria-label': 'Jogador 1 pular' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-mode',
              text: 'MODO COOP',
              attrs: { type: 'button', 'aria-label': 'Trocar modo de jogo' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-left',
              text: 'P2 ◀',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 esquerda' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-up',
              text: 'P2 ▲',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 cima' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-down',
              text: 'P2 ▼',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 baixo' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-right',
              text: 'P2 ▶',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 direita' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-action',
              text: 'P2 AÇÃO',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 ação' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-p2-jump',
              text: 'P2 PULO',
              attrs: { type: 'button', 'aria-label': 'Jogador 2 pular' },
            },
            {
              type: 'element',
              tag: 'button',
              id: 'touch-start',
              text: 'START',
              attrs: { type: 'button', 'aria-label': 'Começar' },
            },
          ],
        },
        {
          type: 'element',
          tag: 'p',
          id: 'reino-instructions',
          attrs: { class: 'instructions' },
          text: 'Título: 1 solo, 2 turnos, 3 cooperativo · toque/MODO ou ombro direito do gamepad alterna o modo · P1: setas + X/Z · P2: WASD + G/F · P/Esc pausa',
        },
        {
          type: 'element',
          tag: 'span',
          id: 'reino-status',
          text: 'title|1-1|0|0',
          attrs: { 'aria-hidden': 'true' },
        },
        {
          type: 'element',
          tag: 'span',
          id: 'reino-announcement',
          text: '',
          attrs: { role: 'status', 'aria-atomic': 'true', 'aria-live': 'polite' },
        },
      ],
    },
  ],
  css: [
    {
      selector: ':root',
      declarations: {
        'color-scheme': 'dark',
        'font-family': 'system-ui, sans-serif',
        background: '#080b18',
      },
    },
    {
      selector: 'body',
      declarations: {
        margin: '0',
        'min-height': '100vh',
        display: 'grid',
        'place-items': 'center',
        overflow: 'auto',
        background: 'radial-gradient(circle at top, #24345c, #080b18 65%)',
      },
    },
    {
      selector: '#reino-shell',
      declarations: {
        width: 'min(100vw, 1080px)',
        display: 'grid',
        gap: '8px',
        padding: '10px',
        'box-sizing': 'border-box',
      },
    },
    {
      selector: '#reino-shell header',
      declarations: {
        display: 'flex',
        'align-items': 'baseline',
        'justify-content': 'space-between',
        color: '#f4f7ff',
        'letter-spacing': '0.03em',
      },
    },
    {
      selector: '#reino-zero-ultra',
      declarations: {
        display: 'block',
        width: '100%',
        height: 'auto',
        'max-height': 'calc(100vh - 138px)',
        'aspect-ratio': '16 / 9',
        border: '2px solid #7088bd',
        'border-radius': '12px',
        background: '#101827',
        'box-shadow': '0 18px 60px rgba(0,0,0,.45)',
        'image-rendering': 'pixelated',
        'touch-action': 'none',
      },
    },
    {
      selector: '#reino-zero-ultra:focus-visible',
      declarations: {
        outline: '3px solid #ffe066',
        'outline-offset': '2px',
      },
    },
    {
      selector: '.touch-controls',
      declarations: {
        display: 'grid',
        'grid-template-columns': 'repeat(7, minmax(36px, 1fr))',
        gap: '8px',
        'align-items': 'center',
      },
    },
    {
      selector: '.touch-controls button',
      declarations: {
        height: '44px',
        border: '1px solid #8297c7',
        'border-radius': '10px',
        background: '#1b2745',
        color: '#ffffff',
        'font-size': '11px',
        'font-weight': '800',
        'touch-action': 'none',
        'user-select': 'none',
      },
    },
    {
      selector: '.touch-controls button:active',
      declarations: { background: '#35a889', transform: 'translateY(1px)' },
    },
    {
      selector: '.instructions',
      declarations: { margin: '0', color: '#b8c5e4', 'font-size': '12px', 'text-align': 'center' },
    },
    {
      selector: '#reino-status, #reino-announcement',
      declarations: {
        position: 'absolute',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        opacity: '0',
      },
    },
  ],
  js: parseJS(REINO_ZERO_ULTRA_SOURCE),
  extensions: [],
})

if (containsType(ir, 'rawJS') || containsType(ir, 'rawHTML') || containsType(ir, 'rawCSS')) {
  throw new Error('O exemplo gerado contém bloco bruto.')
}
const validated = SZIRV2Schema.safeParse(ir)
if (!validated.success) throw new Error(JSON.stringify(validated.error.issues, null, 2))

const target = join(import.meta.dir, '..', 'src', 'examples', '__gen_reinoZeroUltra.ts')
const body = [
  '// Gerado por scripts/gen-reino-zero-ultra.ts. Não edite.',
  "import type { SZIRV2 } from '#ir'",
  '',
  `export const REINO_ZERO_ULTRA_IR = ${JSON.stringify(validated.data, null, 2)} as SZIRV2`,
  '',
].join('\n')
if (process.argv.includes('--check')) {
  const { REINO_ZERO_ULTRA_IR } = await import('../src/examples/__gen_reinoZeroUltra')
  const current = JSON.stringify(stripGeneratedIds(validated.data))
  const published = JSON.stringify(stripGeneratedIds(REINO_ZERO_ULTRA_IR))
  if (current !== published) {
    throw new Error('A IR publicada divergiu do fonte. Rode `bun run gen:reino-zero-ultra`.')
  }
  console.log(`sincronizado: ${validated.data.behavior.start.length} blocos-raiz`)
} else {
  writeFileSync(target, body)
  const formatted = Bun.spawnSync({
    cmd: [process.execPath, 'x', 'biome', 'format', '--write', target],
    cwd: join(import.meta.dir, '..'),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (formatted.exitCode !== 0) throw new Error('Biome não conseguiu formatar a IR gerada.')
  console.log(`gerado: ${validated.data.behavior.start.length} blocos-raiz → ${target}`)
}
