/**
 * Os pares de cor que a oferta da Comunidade põe em contato (30/09/2026), medidos com a função de
 * contraste da própria paleta. Teste de CONTRATO: lê a paleta gerada do @sistemazero/ui pelo
 * caminho (como o `badge-conformance` do kids) — mudou a cor canônica, este teste diz onde a
 * oferta deixou de ler. Texto comum ≥ 4,5; ícone e texto grande ≥ 3.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contrast, hexToOklab, oklabToHex } from '../../../ui/src/tokens/color'

const paleta = readFileSync(
  join(import.meta.dir, '..', '..', '..', 'ui', 'src', 'styles', 'palettes', 'community.css'),
  'utf8',
)
/** O primeiro valor de cada token é o da paleta padrão (azul). */
const tokens = new Map<string, string>()
for (const [, nome, hex] of paleta.matchAll(/--sz-([\w-]+):\s*(#[0-9a-f]{6})\b/gi))
  if (nome && hex && !tokens.has(nome)) tokens.set(nome, hex.toLowerCase())
const t = (nome: string) => {
  const hex = tokens.get(nome)
  if (!hex) throw new Error(`A paleta não tem --sz-${nome}`)
  return hex
}
const mixOklab = (a: string, b: string, pa: number) => {
  const x = hexToOklab(a)
  const y = hexToOklab(b)
  return oklabToHex([
    x[0] * pa + y[0] * (1 - pa),
    x[1] * pa + y[1] * (1 - pa),
    x[2] * pa + y[2] * (1 - pa),
  ])
}

describe('Comunidade: contraste dos pares novos da oferta', () => {
  const texto = 4.5
  const grande = 3
  const pares: [string, string, string, number][] = [
    ['eyebrow: tinta no amarelo', 'ink', 'yellow', texto],
    ['chip verde: tinta na menta', 'ink', 'mint', texto],
    ['chip verde: ícone verde na menta', 'green', 'mint', grande],
    ['chip rosa: tinta no rosa-fundo', 'ink', 'pink-surface', texto],
    ['chip rosa: ícone rosa no rosa-fundo', 'pink', 'pink-surface', grande],
    ['chip laranja: tinta no amarelo-fundo', 'ink', 'yellow-surface', texto],
    ['chip laranja: ícone laranja no amarelo-fundo', 'orange', 'yellow-surface', grande],
    ['chip roxo: ícone roxo no lilás', 'purple', 'lilac', grande],
    ['ladrilho: branco no azul', 'on-action', 'blue', grande],
    ['ladrilho: branco no verde', 'on-action', 'green', grande],
    ['ladrilho: branco no rosa', 'on-action', 'pink', grande],
    ['ladrilho: branco no laranja', 'on-action', 'orange', grande],
    ['ladrilho: branco no roxo', 'on-action', 'purple', grande],
    ['selo: tinta-suave no chão', 'ink-muted', 'ground', texto],
    ['selo: ícone verde no chão', 'green', 'ground', grande],
    ['lead: tinta-suave no chão-alt', 'ink-muted', 'ground-alt', texto],
    ['lead: tinta-suave na carta', 'ink-muted', 'card', texto],
    ['link: ação no chão', 'action', 'ground', texto],
    ['link: ação na carta', 'action', 'card', texto],
    ['moldura: url em tinta-suave na superfície-2', 'ink-muted', 'surface-2', texto],
    ['banda: branco no navy', 'card', 'menu', texto],
    ['banda: texto do menu no navy', 'menu-text', 'menu', texto],
    ['banda: texto do menu no navy-2', 'menu-text', 'menu-2', texto],
    ['banda: sobretítulo azul-claro no navy', 'action-light', 'menu', texto],
    ['banda: amarelo no navy', 'yellow', 'menu', grande],
    ['marca: branco na ação', 'on-action', 'action', texto],
    ['marca: sobre-ação na ação (texto pequeno do plano anual)', 'over-action', 'action', texto],
    ['botão inverso: ação no branco', 'action', 'card', texto],
    ['botão contorno: tinta no branco', 'ink', 'card', texto],
    // Redesenho de 01/10/2026: o chip do capítulo, a legenda sobre o fundo da cor e a tira de passos.
    ['chip do capítulo: tinta no lilás', 'ink', 'lilac', texto],
    ['legenda da carta: tinta-suave no rosa-fundo', 'ink-muted', 'pink-surface', texto],
    ['legenda da carta: tinta-suave na menta', 'ink-muted', 'mint', texto],
    ['legenda da carta: tinta-suave no lilás', 'ink-muted', 'lilac', texto],
    ['legenda da carta: tinta-suave no amarelo-fundo', 'ink-muted', 'yellow-surface', texto],
    ['passo da tira: branco na ação', 'on-action', 'action', texto],
    ['seta da tira: tinta no amarelo', 'ink', 'yellow', grande],
    ['texto dentro da folha: tinta-suave no chão', 'ink-muted', 'ground', texto],
  ]
  for (const [nome, fg, bg, min] of pares)
    test(`${nome} ≥ ${min}`, () => {
      expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(min)
    })

  test('chip azul: o fundo é o azul a 10% na carta, em oklab', () => {
    const fundo = mixOklab(t('blue'), t('card'), 0.1)
    expect(contrast(t('ink'), fundo)).toBeGreaterThanOrEqual(texto)
    expect(contrast(t('blue'), fundo)).toBeGreaterThanOrEqual(grande)
    // A legenda da carta azul e a seta das dúvidas ficam sobre o mesmo fundo.
    expect(contrast(t('ink-muted'), fundo)).toBeGreaterThanOrEqual(texto)
    expect(contrast(t('action'), fundo)).toBeGreaterThanOrEqual(grande)
  })

  test('⚠️ o link azul NÃO passa sobre o chão-alt: a oferta só o usa sobre o chão ou numa carta', () => {
    // Documenta a restrição (4,27 hoje). Se um dia passar, o aviso no kids-oferta.css pode sair.
    expect(contrast(t('action'), t('ground-alt'))).toBeLessThan(texto)
    const body = readFileSync(
      join(
        import.meta.dir,
        '..',
        '..',
        'src',
        'components',
        'funnel',
        'oferta',
        'ComunidadeOfertaBody.astro',
      ),
      'utf8',
    )
    // Na seção de chão-alt (os planos) todo kof-link mora dentro da carta da garantia.
    const ini = body.indexOf('class="planos section fundo-alt')
    const fim = body.indexOf('id="duvidas"')
    expect(ini).toBeGreaterThan(-1)
    expect(fim).toBeGreaterThan(ini)
    const alt = body.slice(ini, fim)
    const trechos = alt.split('class="kof-link').slice(0, -1)
    expect(trechos.length).toBeGreaterThan(0)
    for (const trecho of trechos) expect(trecho.slice(-900)).toContain('class="guarantee kof-carta')
  })
})
