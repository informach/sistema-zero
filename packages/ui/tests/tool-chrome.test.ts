/**
 * Contrato de `src/styles/tool-chrome.css` (07/09/2026), lido como TEXTO (o pacote não tem DOM
 * de teste, e uma folha de tokens se prova pela forma): os tokens do escuro são os mesmos do
 * claro, os cinco escopos de tema de cada ferramenta estão nos dois blocos, o escuro vem DEPOIS
 * do claro (empate de especificidade no `html.dark`), todo token usado está declarado, nada de
 * `in oklch`/`!important`, uma camada `components` só, e quem embarca ferramentas importa a
 * folha DEPOIS dos primitivos e ANTES do CSS dos pacotes.
 *
 * Desde 11/09/2026 (o desenho das telas-modelo): as faixas existem nos dois temas, as cores de
 * assinatura moram só nas constantes, as pílulas são chapadas nos editores e têm o 3D do
 * Brilliant só nas galerias, o alvo cresce para 44px no toque e o botão do menu é um quadrado
 * dentro do conteúdo, não mais a aba colada.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const HERE = import.meta.dir
const css = await Bun.file(join(HERE, '../src/styles/tool-chrome.css')).text()
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')

function bloco(ancora: string): { seletor: string; corpo: string } {
  const i = semComentarios.indexOf(ancora)
  if (i < 0) throw new Error(`âncora não encontrada: ${ancora}`)
  const abre = semComentarios.indexOf('{', i)
  const fecha = semComentarios.indexOf('}', abre)
  const anterior = semComentarios.lastIndexOf('}', i)
  return {
    seletor: semComentarios.slice(anterior + 1, abre).trim(),
    corpo: semComentarios.slice(abre + 1, fecha),
  }
}

const tokensDe = (corpo: string): string[] =>
  [...corpo.matchAll(/(--sz-tool-[\w-]+)\s*:/g)].map((m) => m[1] ?? '').sort()

const ESCOPOS_CLAROS = [
  ':root',
  '[data-sz-theme="light"]',
  '[data-pinta-theme="light"]',
  '[data-molda-theme="light"]',
  '.pensa-theme-light',
]
const ESCOPOS_ESCUROS = [
  '.dark',
  '[data-sz-theme="dark"]',
  '[data-pinta-theme="dark"]',
  '[data-molda-theme="dark"]',
  '.pensa-theme-dark',
]

describe('tool-chrome.css: tokens', () => {
  const claro = bloco('.pensa-theme-light {')
  const escuro = bloco('.pensa-theme-dark {')
  const geometria = bloco(':root {')

  it('o escuro declara EXATAMENTE os tokens do claro (derivados inclusive)', () => {
    expect(tokensDe(escuro.corpo)).toEqual(tokensDe(claro.corpo))
    expect(tokensDe(claro.corpo).length).toBeGreaterThan(15)
  })

  it('os cinco escopos de tema de cada ferramenta estão nos dois blocos', () => {
    for (const s of ESCOPOS_CLAROS) expect(claro.seletor).toContain(s)
    for (const s of ESCOPOS_ESCUROS) expect(escuro.seletor).toContain(s)
  })

  it('o escuro vem DEPOIS do claro (no html.dark vence a ordem)', () => {
    expect(semComentarios.indexOf('.pensa-theme-dark {')).toBeGreaterThan(
      semComentarios.indexOf('.pensa-theme-light {'),
    )
  })

  it('todo token usado no arquivo está declarado (claro + geometria)', () => {
    const declarados = new Set([...tokensDe(claro.corpo), ...tokensDe(geometria.corpo)])
    const usados = new Set(
      [...semComentarios.matchAll(/var\(\s*(--sz-tool-[\w-]+)/g)].map((m) => m[1] ?? ''),
    )
    expect(usados.size).toBeGreaterThan(20)
    for (const u of usados) expect(declarados.has(u)).toBe(true)
  })

  it('sem `in oklch`, sem !important, sem bloco de tema do Tailwind', () => {
    expect(semComentarios).not.toMatch(/color-mix\(in oklch/)
    expect(semComentarios).not.toContain('!important')
    expect(semComentarios).not.toContain('@theme')
  })

  it('as três faixas existem nos DOIS temas, e o escuro é literal (o kids já mediu)', () => {
    for (const faixa of ['creme', 'ceu', 'lilas']) {
      expect(claro.corpo).toContain(`--sz-tool-band-${faixa}: var(--sz-kids-`)
      expect(escuro.corpo).toMatch(new RegExp(`--sz-tool-band-${faixa}: oklch\\(`))
    }
    // O fio do cartão some no claro e aparece no escuro (a `--borda-carta` do kids).
    expect(claro.corpo).toContain('--sz-tool-card-edge: transparent')
    expect(escuro.corpo).toContain('--sz-tool-card-edge: var(--sz-tool-line)')
  })

  it('as cores de assinatura e o amarelo do novo moram SÓ nas constantes (fundo não troca de tema)', () => {
    for (const nome of ['sig-estudio', 'sig-pinta', 'sig-pensa', 'sig-molda', 'new', 'on-new']) {
      expect(geometria.corpo).toContain(`--sz-tool-${nome}:`)
      expect(claro.corpo).not.toContain(`--sz-tool-${nome}:`)
      expect(escuro.corpo).not.toContain(`--sz-tool-${nome}:`)
    }
  })

  it('o alvo das receitas novas é 40px no mouse e 44px com o dedo', () => {
    expect(geometria.corpo).toContain('--sz-tool-hit: 2.5rem')
    const i = semComentarios.indexOf('@media (any-pointer: coarse)')
    expect(i).toBeGreaterThan(-1)
    // Fora da camada: é token, e o bloco de constantes também é sem camada.
    expect(i).toBeLessThan(semComentarios.indexOf('@layer components {'))
    expect(semComentarios.slice(i)).toMatch(
      /^@media \(any-pointer: coarse\) \{\s*:root \{\s*--sz-tool-hit: 2\.75rem;\s*\}/,
    )
  })
})

describe('tool-chrome.css: receitas', () => {
  it('uma camada components só, e nenhuma receita fora dela', () => {
    const camadas = semComentarios.match(/@layer components \{/g) ?? []
    expect(camadas.length).toBe(1)
    expect(semComentarios.indexOf('.sz-tool-')).toBeGreaterThan(
      semComentarios.indexOf('@layer components {'),
    )
  })

  it('o botão do menu é o QUADRADO da imagem, com a mesma forma da seta de voltar', () => {
    // Um bloco só para os três: menu, voltar e os outros quadrados de ícone.
    const quadrado = bloco('.sz-tool-back {')
    expect(quadrado.seletor).toContain('.sz-tool-btn-menu')
    expect(quadrado.seletor).toContain('.sz-tool-icon-btn')
    expect(quadrado.corpo).toContain('width: var(--sz-tool-hit)')
    expect(quadrado.corpo).toContain('height: var(--sz-tool-hit)')
    expect(quadrado.corpo).toContain('border-radius: var(--sz-tool-radius-control)')
    // Branco dentro da faixa, céu diluído sobre barra branca (a mesma variável).
    expect(quadrado.corpo).toContain('background: var(--sz-tool-quiet)')
    expect(bloco('.sz-tool-band {').corpo).toContain('--sz-tool-quiet: var(--sz-tool-surface)')
    const pressionado = bloco('.sz-tool-btn-menu[aria-pressed="true"] {')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-tint)')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-line)')
    expect(pressionado.corpo).toContain('color: var(--sz-tool-accent)')
    expect(bloco('.sz-tool-btn-menu[data-tooltip]::after {').corpo).toContain(
      'content: attr(data-tooltip)',
    )
    expect(
      bloco('.sz-tool-btn-menu[data-tooltip]:is(:hover, :focus-visible)::after {').corpo,
    ).toContain('visibility: visible')
  })

  it('o botão do menu deixou de ser a ABA colada na barra lateral (11/09/2026)', () => {
    expect(semComentarios).not.toContain('--sz-tool-inset')
    expect(semComentarios).not.toContain('border-start-start-radius: 0')
    expect(semComentarios).not.toContain('border-end-start-radius: 0')
    expect(semComentarios).not.toMatch(/margin-inline-start:\s*calc\(-1/)
  })

  it('a legend dos chips flutua (inline com os chips, não numa linha acima)', () => {
    expect(bloco('.sz-tool-chips > legend {').corpo).toContain('float: left')
  })

  it('as pílulas, os chips, a busca, o ordenar e o selo são pílulas no alvo novo', () => {
    // `.sz-tool-select {` casa primeiro com o bloco que ele divide com a busca.
    for (const ancora of [
      '.sz-tool-pill {',
      '.sz-tool-chip {',
      '.sz-tool-select {',
      '.sz-tool-status {',
    ]) {
      const { corpo } = bloco(ancora)
      expect(corpo).toContain('min-height: var(--sz-tool-hit)')
      expect(corpo).toContain('border-radius: var(--sz-tool-radius-pill)')
    }
  })

  it('as pílulas são CHAPADAS, e o 3D do Brilliant (11/09/2026) mora SÓ nas galerias', () => {
    // Cada regra com o seletor INTEIRO (do fim da anterior até a chave): é o seletor que diz
    // se ela vale dentro das faixas das galerias ou em qualquer lugar (os editores).
    const regras = [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, seletor = '', corpo = '']) => ({ seletor: seletor.trim(), corpo }))
      .filter(({ seletor }) => seletor.includes('.sz-tool-pill'))
    expect(regras.length).toBeGreaterThanOrEqual(8) // anti-vácuo: base, variantes e hovers
    for (const { seletor, corpo } of regras) {
      expect(corpo).not.toContain('gradient')
      // Fora das faixas, nenhuma sombra: os editores ficam planos (decisão dela).
      if (!seletor.includes('.sz-tool-bands')) expect(corpo).not.toContain('box-shadow')
    }
    // Anti-vácuo do relevo: existe, é das galerias, e a pílula primária desce no degrau da ação.
    const relevo = regras.filter(
      ({ seletor, corpo }) => seletor.includes('.sz-tool-bands') && corpo.includes('box-shadow'),
    )
    expect(relevo.length).toBe(1)
    expect(relevo[0]?.corpo).toContain('var(--sz-3d-degrau)')
    expect(bloco('.sz-tool-bands .sz-tool-pill--primary {').corpo).toContain(
      '--sz-3d-degrau: var(--sz-tool-cta-degrau)',
    )
    // Os chips de filtro são abas: planos até dentro das galerias.
    for (const { seletor, corpo } of relevo) {
      expect(seletor).not.toContain('.sz-tool-chip')
      expect(corpo).not.toContain('.sz-tool-chip')
    }
  })

  it('o cartão "novo" NÃO anda no hover nem no aperto: cartão de grade não pode tremer', () => {
    // 14/09/2026: o cartão é a única peça de GRADE com relevo, e grade tem aresta longa. Com
    // 1px de movimento, o ponteiro parado na borda de baixo entra e sai do hover várias vezes
    // por segundo — é o "cursor tremendo" que ela relatou no Pensa. A sombra e a borda ficam.
    const regras = [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, seletor = '', corpo = '']) => ({ seletor: seletor.trim(), corpo }),
    )
    const trava = regras.findIndex(
      ({ seletor, corpo }) =>
        seletor.includes('.sz-tool-card--new') &&
        seletor.includes(':hover') &&
        /translate:\s*none/.test(corpo),
    )
    expect(trava).toBeGreaterThanOrEqual(0)
    expect(regras[trava]?.corpo).toMatch(/transform:\s*none/)
    // E ela vence: vem DEPOIS de toda regra que dá `translate` ao cartão (mesma especificidade).
    const ultimoMovimento = regras.reduce(
      (indice, { seletor, corpo }, atual) =>
        seletor.includes('.sz-tool-card--new') && /translate:\s*0/.test(corpo) ? atual : indice,
      -1,
    )
    expect(trava).toBeGreaterThan(ultimoMovimento)
  })

  it('as receitas ANTIGAS saíram na limpeza do lote (11/09/2026), com os tokens que só elas liam', () => {
    // O secundário de borda 2px com sombra dura, a pílula 3D, o painel e o pulo no hover.
    expect(semComentarios).not.toMatch(/\.sz-tool-btn(?!-menu)/)
    expect(semComentarios).not.toContain('.sz-tool-panel')
    expect(semComentarios).not.toContain('.sz-tool-pop')
    for (const token of [
      '--sz-tool-control:',
      '--sz-tool-shadow-control',
      '--sz-tool-shadow-card',
      '--sz-tool-shadow-cta',
      '--sz-tool-cta-shade',
      '--sz-tool-line-shade',
    ]) {
      expect(semComentarios).not.toContain(token)
    }
    // Anti-vácuo: o botão do menu (o único `sz-tool-btn-*` que ficou) continua de pé.
    expect(semComentarios).toContain('.sz-tool-btn-menu')
  })

  it('o chip ativo é o azul da marca cheio, e continua cheio no hover', () => {
    const ativo = bloco('.sz-tool-chip[aria-pressed="true"],')
    expect(ativo.seletor).toContain(':hover')
    expect(ativo.corpo).toContain('background: var(--sz-tool-cta)')
    expect(ativo.corpo).toContain('color: var(--sz-tool-on-cta)')
  })

  /*
   * O GUIA DA TAREFA do Pensa (19/09/2026). Três componentes, em dois pacotes e no host,
   * vestindo UMA receita — antes cada um tinha a própria casca, e foi isso que ela leu como
   * "totalmente fora da identidade visual da comunidade".
   */
  it('o guia divide a regra do cartão das galerias, em vez de copiá-la', () => {
    // ! Enquanto eram dois blocos byte a byte iguais, mudar um deixava o outro para trás em
    // silêncio (achado do full review de 19/09/2026). Hoje o seletor é o mesmo bloco.
    const cartao = bloco('.sz-tool-card,')
    expect(cartao.seletor.split(',').map((parte) => parte.trim())).toEqual([
      '.sz-tool-card',
      '.sz-tool-guide',
    ])
    expect(cartao.corpo).toContain('border-radius: var(--sz-tool-radius-card-md)')
    expect(cartao.corpo).toContain('background: var(--sz-tool-surface)')
    // O título idem: o guia entra na regra do `.sz-tool-card-title`.
    expect(bloco('.sz-tool-card-title,').seletor).toContain('.sz-tool-guide__title')
    // E não sobrou uma segunda regra de BASE só para o guia. ! A asserção olha os seletores
    // inteiros: um regex de texto casaria a própria regra compartilhada, que tem o guia numa
    // linha só dele depois da vírgula.
    const soDoGuia = [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, seletor = '']) => seletor.trim())
      .filter((seletor) => seletor === '.sz-tool-guide')
    expect(soDoGuia).toEqual([])
  })

  it('o guia é CHAPADO: o relevo das galerias não o alcança', () => {
    // !! A classe vive no SELETOR, nunca no corpo (que só tem declarações). A primeira versão
    // deste caso olhava o corpo e era verdadeira para sempre — provado no full review de
    // 19/09/2026 somando a classe do guia ao `:is()` do relevo sem o teste piscar. E são QUATRO
    // regras de relevo (base, hover, aperto, reduced-motion), não uma.
    const seletores = [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, seletor = '']) => seletor.trim(),
    )
    const dasFaixas = seletores.filter((seletor) => seletor.includes('.sz-tool-bands'))
    expect(dasFaixas.filter((seletor) => seletor.includes('sz-tool-guide'))).toEqual([])
    // Anti-vácuo: o relevo existe mesmo, e alcança o cartão "Novo projeto".
    expect(dasFaixas.some((seletor) => seletor.includes('sz-tool-card--new'))).toBe(true)
  })

  /*
   * A MISSÃO DO PENSA nas oficinas (20/10/2026, desenho aprovado). Pedido dela: o painel
   * NUNCA cobre o Estúdio, o Pinta ou o Molda, nem aberto nem recolhido. Coluna própria à
   * direita quando sobram 1024px para o editor, faixa embaixo abaixo disso, trilho de 64px ou uma
   * linha quando recolhido.
   */
  const regrasDaMissao = () =>
    [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, seletor = '', corpo = '']) => ({ seletor: seletor.trim(), corpo }))
      .filter(({ seletor }) => seletor.includes('sz-tool-mission'))
  const containerLarga = () => {
    const i = semComentarios.indexOf(
      '@container sz-mission (min-width: calc(1024px + 22.5rem + 0.75rem)) {',
    )
    expect(i).toBeGreaterThan(-1)
    let profundidade = 0
    for (let j = semComentarios.indexOf('{', i); j < semComentarios.length; j++) {
      if (semComentarios[j] === '{') profundidade++
      if (semComentarios[j] === '}') profundidade--
      if (profundidade === 0) return semComentarios.slice(i, j + 1)
    }
    throw new Error('bloco @container sem fim')
  }

  it('a oficina é o contêiner, e o painel fica EMBAIXO dela sem espaço para a coluna', () => {
    expect(bloco('.sz-tool-mission-layout.has-panel {').corpo).toContain(
      'container: sz-mission / inline-size',
    )
    // A direção padrão é a coluna: o painel vem DEPOIS da oficina no DOM, então fica embaixo,
    // e quem rola é a coluna (a faixa nunca espreme nem corta a oficina).
    const linha = bloco('.has-panel > .sz-tool-mission-layout__row {').corpo
    expect(linha).toContain('flex-direction: column')
    expect(linha).toContain('overflow-y: auto')
    // A oficina não desce do piso das ferramentas embarcadas e não pinta fora da caixa dela.
    const oficina = bloco('.has-panel .sz-tool-mission-layout__work {').corpo
    expect(oficina).toContain('min-height: min(34rem, calc(100% - 4.875rem))')
    expect(oficina).toContain('overflow-y: clip')
    expect(bloco('.sz-tool-mission-panel {').corpo).toContain('flex: none')
  })

  it('com espaço para preservar 1024px, o painel é uma coluna de 360px e recolhe para 64px', () => {
    const larga = containerLarga()
    expect(larga).toMatch(/\.has-panel > \.sz-tool-mission-layout__row \{\s*flex-direction: row;/)
    expect(larga).toMatch(/\.sz-tool-mission-panel \{[^}]*width: 22\.5rem/)
    expect(larga).toMatch(
      /\.sz-tool-mission-panel\.is-collapsed:not\(\.has-alert\) \{\s*width: 4rem;/,
    )
    // O texto do trilho é vertical.
    expect(larga).toContain('writing-mode: vertical-rl')
  })

  it('o limiar da coluna reserva 1024px ao editor com fontes raiz de 12, 16 e 20px', () => {
    const query =
      /@container sz-mission \(min-width: calc\((\d+)px \+ ([\d.]+)rem \+ ([\d.]+)rem\)\)/.exec(
        semComentarios,
      )
    expect(query).not.toBeNull()
    const larga = containerLarga()
    const width = /\.sz-tool-mission-panel \{[^}]*width: ([\d.]+)rem/.exec(larga)
    const margin = /\.sz-tool-mission-panel \{[^}]*margin: 0\.75rem ([\d.]+)rem 0\.75rem 0/.exec(
      larga,
    )
    expect(width).not.toBeNull()
    expect(margin).not.toBeNull()
    // Contrato geométrico da folha; identidade DOM continua sendo verificada no browser.
    for (const fontSize of [12, 16, 20]) {
      const threshold = Number(query?.[1]) + (Number(query?.[2]) + Number(query?.[3])) * fontSize
      const panel = (Number(width?.[1]) + Number(margin?.[1])) * fontSize
      expect(threshold - panel).toBeGreaterThanOrEqual(1024)
    }
  })

  it('nada do painel flutua por cima da oficina', () => {
    const regras = regrasDaMissao()
    expect(regras.length).toBeGreaterThan(30) // anti-vácuo
    for (const { seletor, corpo } of regras) {
      expect({ seletor, fixed: corpo.includes('position: fixed') }).toEqual({
        seletor,
        fixed: false,
      })
      expect({ seletor, z: corpo.includes('z-index') }).toEqual({ seletor, z: false })
      // `absolute` só no que é escondido para o leitor de tela (recortado por inteiro).
      if (corpo.includes('position: absolute')) expect(corpo).toContain('clip-path: inset(50%)')
      else
        expect({ seletor, negativa: /margin[\w-]*:\s*-/.test(corpo) }).toEqual({
          seletor,
          negativa: false,
        })
    }
  })

  it('recolhido com um recado, a coluna não vira trilho: problema não se esconde', () => {
    const larga = containerLarga()
    expect(larga).toContain('.sz-tool-mission-panel.is-collapsed.has-alert {')
    // Toda regra de trilho exige a ausência do recado.
    for (const linha of larga.split('\n')) {
      if (linha.includes('.is-collapsed') && linha.includes('{') && !linha.includes('.has-alert {'))
        expect(linha).toContain(':not(.has-alert)')
    }
  })

  it('o texto pequeno do painel respeita o piso de 12px da casa', () => {
    for (const ancora of ['.sz-tool-mission-panel__kicker {', '.sz-tool-mission-panel__chip,']) {
      const tamanho = /font-size:\s*([\d.]+)rem/.exec(bloco(ancora).corpo)?.[1]
      expect({ ancora, tamanho }).toEqual({ ancora, tamanho: '0.75' })
    }
    for (const { seletor, corpo } of regrasDaMissao()) {
      for (const [, rem] of corpo.matchAll(/font-size:\s*([\d.]+)rem/g))
        expect({ seletor, rem: Number(rem) >= 0.75 }).toEqual({ seletor, rem: true })
    }
  })

  it('os botões do painel têm o degrau do desenho aprovado, com classe própria', () => {
    expect(bloco('.sz-tool-mission-panel__btn--primary {').corpo).toContain(
      '0 4px 0 var(--sz-tool-cta-degrau)',
    )
    const botao = bloco('.sz-tool-mission-panel__btn {').corpo
    expect(botao).toContain('var(--sz-tool-degrau)')
    // O alvo da casa: 40px no mouse, 44px no toque.
    expect(botao).toContain('min-height: var(--sz-tool-hit)')
    expect(bloco('.sz-tool-mission-panel__link {').corpo).toContain(
      'min-height: var(--sz-tool-hit)',
    )
  })

  it('o topo âmbar e o menta do pronto usam as constantes, que não trocam de tema', () => {
    const geometria = bloco(':root {').corpo
    for (const nome of [
      'on-tint',
      'sig-pensa-tint',
      'sig-pensa-ink',
      'sig-ok-tint',
      'sig-molda-tint',
    ])
      expect(geometria).toContain(`--sz-tool-${nome}:`)
    const topo = bloco('.sz-tool-mission-panel__head,').corpo
    expect(topo).toContain('background: var(--sz-tool-sig-pensa-tint)')
    expect(topo).toContain('color: var(--sz-tool-on-tint)')
  })

  it('a tinta sobre o âmbar do Pensa é ESCURA, derivada da assinatura, nunca a branca da ação', () => {
    const geometria = bloco(':root {').corpo
    const tinta = /--sz-tool-on-sig-pensa:\s*([^;]+);/.exec(geometria)?.[1] ?? ''
    expect(tinta).toBe('color-mix(in oklab, var(--sz-tool-sig-pensa) 33%, oklch(0 0 0))')
    expect(tinta).not.toContain('cta-tinta')
    // O ladrilho das galerias e a lâmpada do topo da missão leem a mesma tinta.
    expect(bloco('.sz-tool-tile--pensa {').corpo).toContain('color: var(--sz-tool-on-sig-pensa)')
    expect(bloco('.sz-tool-mission-panel__lamp {').corpo).toContain(
      'color: var(--sz-tool-on-sig-pensa)',
    )
  })

  it('o recado de problema tem cara de problema, o de aviso não, e os dois passam nos temas', () => {
    const alerta = bloco('.sz-tool-guide__alert {')
    expect(alerta.corpo).toContain('var(--sz-tool-danger)')
    expect(alerta.corpo).toContain('border-radius: var(--sz-tool-radius-control)')
    // ! A tinta leva um quinto da tinta de texto (o truque da barra do Pinta): o vermelho puro
    // sobre o fundo rosado do próprio alerta deu 4,25:1 no ESCURO, abaixo do piso de 4,5.
    // Medido no playground depois da mistura: 6,31 no claro e 5,74 no escuro.
    expect(alerta.corpo).toContain(
      'color: color-mix(in oklab, var(--sz-tool-danger) 80%, var(--sz-tool-ink))',
    )
    // !! E existe a variante de AVISO: vermelho o tempo todo, para uma criança de 8 anos, lê
    // como "quebrou". Ela vem DEPOIS da base (mesma especificidade: quem decide é a ordem).
    expect(bloco('.sz-tool-guide__alert--warn {').corpo).toContain('var(--sz-tool-warn)')
    expect(semComentarios.indexOf('.sz-tool-guide__alert--warn')).toBeGreaterThan(
      semComentarios.indexOf('.sz-tool-guide__alert {'),
    )
    // A pílula quieta some dentro do recado (fundo do app e fio transparente no claro): lá
    // dentro ela ganha a superfície do cartão e um fio de verdade.
    expect(bloco('.sz-tool-guide__alert .sz-tool-pill--quiet {').corpo).toContain(
      'border-color: var(--sz-tool-line)',
    )
  })
})

describe('nenhum pacote usa uma receita que a folha não tem mais', () => {
  // Classe sem receita não quebra nada em teste nenhum: o botão só aparece sem desenho. Por isso
  // a varredura lê o código-fonte de quem consome a folha (como texto, sem importar nada).
  const PACOTES = ['studio', 'pinta', 'pensa', 'molda', 'community-kids']
  const REMOVIDAS = [/\bsz-tool-btn(?!-menu)\b/, /\bsz-tool-panel\b/, /\bsz-tool-pop\b/]
  for (const pacote of PACOTES) {
    it(`${pacote}: sem .sz-tool-btn, -3d, .sz-tool-panel nem .sz-tool-pop`, async () => {
      const raiz = join(HERE, '../..', pacote, 'src')
      const achados: string[] = []
      let lidos = 0
      for await (const arquivo of new Bun.Glob('**/*.{ts,tsx,css}').scan({ cwd: raiz })) {
        // Teste não é consumidor de estilo (e é lá que se confere a AUSÊNCIA da classe).
        if (/\.test\.tsx?$/.test(arquivo)) continue
        lidos++
        // Comentário também não (a história de uma receita que saiu pode citar o nome dela).
        const texto = (await Bun.file(join(raiz, arquivo)).text())
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:])\/\/.*$/gm, '$1')
        for (const re of REMOVIDAS) {
          if (re.test(texto)) achados.push(`${pacote}/src/${arquivo} (${re.source})`)
        }
      }
      expect(lidos).toBeGreaterThanOrEqual(5) // anti-vácuo: a pasta existe e tem código (o pensa tem 10)
      expect(achados).toEqual([])
    })
  }
})

describe('quem embarca ferramentas importa a folha na ordem certa', () => {
  const hosts: Array<[string, string]> = [
    ['../../community-kids/src/app/globals.css', 'studio/src/styles/studio.css'],
    ['../../pinta/playground/styles.css', 'pinta.css'],
    ['../../studio/playground/styles.css', 'studio.css'],
    ['../../molda/playground/styles.css', 'molda.css'],
    ['../../pensa/playground/styles.css', 'pensa.css'],
  ]
  for (const [arquivo, cssDoPacote] of hosts) {
    it(`${arquivo}: theme-kids -> tool-chrome -> ${cssDoPacote}`, async () => {
      const texto = await Bun.file(join(HERE, arquivo)).text()
      const iKids = texto.indexOf('theme-kids.css')
      const iTool = texto.indexOf('tool-chrome.css')
      const iPacote = texto.indexOf(cssDoPacote)
      expect(iKids).toBeGreaterThan(-1)
      expect(iTool).toBeGreaterThan(iKids)
      expect(iPacote).toBeGreaterThan(iTool)
    })
  }
})

describe('os três guias do Pensa vestem a MESMA casca', () => {
  /*
   * 19/09/2026. Não existe "o painel do guia": são TRÊS componentes, em dois pacotes e no host,
   * e foi assim que cada um acabou com a própria casca (fio de 2px no acento, fio da marca,
   * faixa sem canto) até ela dizer que aquilo estava "totalmente fora da identidade visual da
   * comunidade". A regressão a evitar é a óbvia: alguém mexer em UM e deixar os outros dois
   * para trás. Classe sem receita não quebra teste nenhum — o painel só sai sem desenho —,
   * então a trava é ler os três como TEXTO.
   * ! O que ela vê é PRESENÇA, não divergência fina: um ganhar uma peça nova e os outros não
   * continua passando.
   */
  const GUIAS = [
    '../../pinta/src/components/TaskBriefPanel.tsx',
    '../../studio/src/studio/TaskGuidePanel.tsx',
    '../../member-shell/src/components/creator/molda-mission-guide.tsx',
  ]
  it('a receita existe na folha que os três consomem', () => {
    // Fora do laço: repetida a cada arquivo, ela não era anti-vácuo de nada.
    expect(semComentarios).toMatch(/\.sz-tool-mission-panel__head\b/)
  })
  it('o ponto de entrada Kids encaminha para o mesmo guia compartilhado', async () => {
    const wrapper = await Bun.file(
      join(HERE, '../../community-kids/src/components/kids/molda-mission-guide.tsx'),
    ).text()
    expect(wrapper.trim()).toBe(
      "export * from '@sistemazero/member-shell/components/creator/molda-mission-guide'",
    )
    const workspace = await Bun.file(
      join(HERE, '../../member-shell/src/components/creator/molda-client.tsx'),
    ).text()
    expect(workspace).toContain("from './molda-mission-guide'")
    expect(workspace).toContain('<MoldaMissionGuide')
  })
  for (const arquivo of GUIAS) {
    it(`${arquivo} usa .sz-tool-guide`, async () => {
      const texto = await Bun.file(join(HERE, arquivo)).text()
      const semComentario = texto
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      // ! Por LIMITE de palavra: `toContain('sz-tool-guide')` casaria `sz-tool-guideXYZ` e
      // `--aside` sozinho (achado do full review de 19/09/2026).
      expect(semComentario).toContain('PensaMissionPanel')
      // !! E a cor do recado vem da receita: um `text-*-danger` no consumidor desfaz a mistura
      // que faz o alerta passar no contraste do tema escuro.
      for (const linha of semComentario.split('\n')) {
        if (!linha.includes('sz-tool-guide__alert')) continue
        expect({ arquivo, linha: linha.trim() }).toEqual({
          arquivo,
          linha: linha.trim().replace(/\btext-\w+-danger\b/g, 'COR-PROPRIA-NO-ALERTA'),
        })
      }
    })
  }
})

describe('o conteúdo funcional da missão usa o tema compartilhado', () => {
  it('a receita de conteúdo existe e não depende de tokens de uma oficina', async () => {
    expect(semComentarios).toContain('.sz-tool-mission-content {')
    const texto = await Bun.file(
      join(HERE, '../src/components/ui/pensa-mission-content.tsx'),
    ).text()
    expect(texto).toContain('sz-tool-mission-content')
    expect(texto).not.toMatch(/\b(bg|text|border|ring|fill|stroke|outline)-(sz|pin)-/)
    expect(texto).not.toMatch(/--sz-kids-|--sz-tool-/)
  })
})
