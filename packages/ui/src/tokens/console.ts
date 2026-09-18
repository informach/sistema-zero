/**
 * O chassi CONSOLE: as ferramentas internas (admin, helpdesk-app, marketing-app) vestidas com a
 * paleta do Pen.
 *
 * Duas decisões da dona (17/09/2026), e as duas SIMPLIFICAM:
 * - **Sem cor por pessoa.** O público é o time interno; o console abre sempre na cor da casa. Por
 *   isso o arquivo gerado não tem bloco `[data-sz-palette=…]` nenhum.
 * - **Sem claro/escuro.** O modo escuro saiu, como já tinha saído das comunidades em 11/09/2026.
 *   Um tema só, em todo o ecossistema.
 *
 * ⚠️ O `@custom-variant dark (&:is(.dark *))` FICA nos três `globals.css`: sem ele o Tailwind v4
 * volta ao padrão dele (`prefers-color-scheme`) e os `dark:` que o `@sistemazero/ui` e o
 * member-shell ainda trazem passariam a seguir o modo escuro do sistema operacional. Com ele, e
 * sem `.dark` em lugar nenhum, eles não fazem nada.
 */
import { DEFAULT_PALETTE, type Palette } from '@sistemazero/core/palette'
import { contrast, fitChroma, hexToOklch, oklchToHex } from './color'
import { derive } from './derive'

/**
 * A luminosidade que faz uma matiz bater o contraste pedido contra um fundo.
 *
 * Mesma ideia da âncora da cor de ação: o contraste cresce com a distância de luminosidade, então
 * a bisseção acha uma raiz só. É o que dá o verde de TEXTO do selo de sucesso sem ninguém
 * escolher um hexadecimal a dedo.
 */
function escurecerAte(hue: number, tetoDeCroma: number, fundo: string, alvo: number): string {
  const em = (l: number) => contrast(oklchToHex([l, fitChroma(l, tetoDeCroma, hue), hue]), fundo)
  let baixo = 0.05
  let alto = 0.95
  for (let i = 0; i < 40; i++) {
    const meio = (baixo + alto) / 2
    if (em(meio) > alvo) baixo = meio
    else alto = meio
  }
  const l = (baixo + alto) / 2
  return oklchToHex([l, fitChroma(l, tetoDeCroma, hue), hue])
}

/** Mesma cor, com alfa — o `--sz-hot-tint` é um véu, não uma cor sólida. */
function comAlfa(hex: string, alfa: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r} ${g} ${b} / ${alfa})`
}

/**
 * Os tokens de COR que o `@theme inline` dos três consoles consome.
 *
 * ⚠️ Tirar um daqui apaga a cor no app em SILÊNCIO (o `var()` vira valor inválido no tempo de
 * computação) — `tests/console-theme.test.ts` cobra a lista lendo os `globals.css` de verdade.
 */
export function deriveConsole(id: Palette = DEFAULT_PALETTE): Record<string, string> {
  const p = derive(id)
  // ESTADO e IDENTIDADE não seguem paleta — nem aqui, nem na comunidade.
  const verde = p.green
  const vermelho = p.red
  // O selo de sucesso é TEXTO sobre um véu claro (`bg-success/15`): precisa do verde escurecido,
  // não do sólido. 6:1 é a mesma folga que o `--pen-ok-texto` da comunidade tem.
  const verdeTexto = escurecerAte(hexToOklch(verde)[2], 0.14, p.card, 6)

  return {
    background: p.ground,
    foreground: p.ink,
    card: p.card,
    'card-foreground': p.ink,
    popover: p.card,
    'popover-foreground': p.ink,

    primary: p.action,
    'primary-foreground': p['on-action'],
    // O botão primário é a pílula CHAPADA do Pen: o hover troca a COR, e não o degradê.
    'primary-hover': p['action-hover'],

    link: p.action,
    'link-hover': p['action-hover'],

    secondary: p['surface-2'],
    'secondary-foreground': p.ink,

    muted: p['surface-2'],
    'muted-foreground': p['ink-muted'],

    // `accent` marca ESTADO de sucesso — a mesma régua da comunidade.
    accent: verde,
    'accent-foreground': p['on-action'],

    success: verdeTexto,
    'success-foreground': verdeTexto,

    destructive: vermelho,
    'destructive-foreground': p['on-action'],

    border: p.line,
    input: p.field,
    ring: p.action,

    // ⚠️ Séries têm de ser DISTINGUÍVEIS entre si: `blue` (identidade) é o mesmo valor da ação
    // na cor da casa, então usá-lo aqui daria duas séries idênticas no gráfico.
    'chart-1': p.action,
    'chart-2': p.purple,
    'chart-3': verde,
    'chart-4': vermelho,
    'chart-5': p['ink-muted'],

    'sz-primary': p.action,
    'sz-primary-fg': p['on-action'],
    'sz-accent': verde,
    'sz-hot': vermelho,
    'sz-hot-tint': comAlfa(vermelho, 0.1),

    // O ZERO da logo oficial (`@sistemazero/ui/brand-logo`): o degradê da marca, um por fundo.
    // ⚠️ Os nomes são os MESMOS do `:root` do community — o componente é compartilhado e lê
    // `var(--logo-zero-<fundo>-{de,ate})`; divergir aqui apagaria o ZERO nos painéis.
    'logo-zero-escuro-de': p['action-light'],
    'logo-zero-escuro-ate': p['logo-zero'],
    'logo-zero-claro-de': p.action,
    'logo-zero-claro-ate': p['logo-zero'],
  }
}

/** Tokens que não são cor e viajam literais. */
export const CONSOLE_STATIC: Record<string, string> = {
  'font-sans':
    '\n    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,\n    "Helvetica Neue", Arial, sans-serif',
  'font-mono':
    '\n    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",\n    monospace',
  // A régua do Pen, a MESMA da comunidade (`community/src/app/globals.css`): cartão de 24px.
  // ⚠️ Ela reverbera em todo `rounded-sm/md/lg/xl` dos painéis (o `@theme inline` deriva os
  // quatro deste token) — é o que faz o console ter a forma da comunidade, não só a cor.
  radius: '1.25rem',
}
