import { describe, expect, it } from 'bun:test'
import { extractHTMLShell, parseHTML } from '../html'

describe('parseHTML', () => {
  it('mantém texto solto como texto escapável, nunca como HTML avançado', () => {
    const ir = parseHTML('&lt;img src=x onerror="alert(1)"&gt;')
    expect(ir).toEqual([{ type: 'text', text: '<img src=x onerror="alert(1)">' }])
  })

  it('extrai h1 e p simples', () => {
    const ir = parseHTML('<html><body><h1>Oi</h1><p>texto</p></body></html>')
    expect(ir).toEqual([
      { type: 'element', tag: 'h1', text: 'Oi' },
      { type: 'element', tag: 'p', text: 'texto' },
    ])
  })

  it('extrai canvas com largura/altura', () => {
    const ir = parseHTML('<canvas id="t" width="200" height="100"></canvas>')
    expect(ir[0]).toEqual({ type: 'canvas', id: 't', width: 200, height: 100 })
  })

  it('extrai canvas sem largura/altura (tamanho definido no JS)', () => {
    const ir = parseHTML('<canvas id="tela"></canvas>')
    expect(ir[0]).toEqual({ type: 'canvas', id: 'tela' })
  })

  it('marca tag desconhecida como rawHTML advanced', () => {
    const ir = parseHTML('<article><b>oi</b></article>')
    const first = ir[0]
    expect(first?.type).toBe('rawHTML')
    if (first?.type === 'rawHTML') {
      expect(first.html).toContain('<article>')
      expect(first.advanced).toBe(true)
    }
  })

  it('extrai h2, h3 e span como elementos nativos', () => {
    const ir = parseHTML('<h2>Subtítulo</h2><span>detalhe</span>')
    expect(ir).toEqual([
      { type: 'element', tag: 'h2', text: 'Subtítulo' },
      { type: 'element', tag: 'span', text: 'detalhe' },
    ])
  })

  it('extrai SVG (svg/g/path/circle) como elementos com atributos (NÃO rawHTML)', () => {
    const ir = parseHTML(
      '<svg id="moinho" width="200" height="250"><g class="cata" transform="translate(100,100)"><circle r="8"></circle><path d="M -7 -20 L 2 -80"></path></g></svg>',
    )
    expect(ir).toEqual([
      {
        type: 'element',
        tag: 'svg',
        id: 'moinho',
        attrs: { width: '200', height: '250' },
        children: [
          {
            type: 'element',
            tag: 'g',
            attrs: { class: 'cata', transform: 'translate(100,100)' },
            children: [
              { type: 'element', tag: 'circle', text: '', attrs: { r: '8' } },
              { type: 'element', tag: 'path', text: '', attrs: { d: 'M -7 -20 L 2 -80' } },
            ],
          },
        ],
      },
    ])
    // nada virou "código avançado"
    expect(JSON.stringify(ir)).not.toContain('rawHTML')
  })

  it('mapeia container com filhos recursivamente (aninhamento)', () => {
    const ir = parseHTML('<section id="hero"><h1>x</h1><p>y</p></section>')
    expect(ir[0]).toEqual({
      type: 'element',
      tag: 'section',
      id: 'hero',
      children: [
        { type: 'element', tag: 'h1', text: 'x' },
        { type: 'element', tag: 'p', text: 'y' },
      ],
    })
  })

  it('preserva filho desconhecido dentro de container como rawHTML (sem perder código)', () => {
    const ir = parseHTML('<div><h1>ok</h1><marquee>!!!</marquee></div>')
    expect(ir[0]?.type).toBe('element')
    if (ir[0]?.type === 'element') {
      expect(ir[0].children?.[0]).toEqual({ type: 'element', tag: 'h1', text: 'ok' })
      expect(ir[0].children?.[1]).toMatchObject({ type: 'rawHTML', advanced: true })
    }
  })

  it('extrai img e input como elementos void com atributos', () => {
    const ir = parseHTML(
      '<img src="logo.png" alt="logo" /><input id="email" type="email" placeholder="Seu e-mail" />',
    )
    expect(ir).toEqual([
      { type: 'element', tag: 'img', attrs: { src: 'logo.png', alt: 'logo' } },
      {
        type: 'element',
        tag: 'input',
        id: 'email',
        attrs: { type: 'email', placeholder: 'Seu e-mail' },
      },
    ])
  })

  it('converte inline "limpo" dentro de p (só elementos) em filhos', () => {
    const ir = parseHTML('<p><span>x</span></p>')
    expect(ir[0]?.type).toBe('element')
    if (ir[0]?.type === 'element') {
      expect(ir[0].tag).toBe('p')
      expect(ir[0].children?.some((c) => c.type === 'element' && c.tag === 'span')).toBe(true)
    }
  })

  it('decompõe conteúdo MISTO (texto + inline) em filhos aninhados, sem perder texto', () => {
    const ir = parseHTML('<p>© <span id="y"></span> Sistema Zero.</p>')
    expect(ir[0]?.type).toBe('element')
    if (ir[0]?.type === 'element') {
      expect(ir[0].tag).toBe('p')
      const children = ir[0].children ?? []
      expect(children[0]).toEqual({ type: 'text', text: '© ' })
      expect(children[1]).toMatchObject({ type: 'element', tag: 'span', id: 'y' })
      expect(children[2]).toEqual({ type: 'text', text: ' Sistema Zero.' })
    }
  })

  it('extrai strong e em como elementos nativos', () => {
    const ir = parseHTML('<strong>1</strong><em>nota</em>')
    expect(ir).toEqual([
      { type: 'element', tag: 'strong', text: '1' },
      { type: 'element', tag: 'em', text: 'nota' },
    ])
  })

  it('extrai link <a> com href', () => {
    const ir = parseHTML('<a href="https://x.com">Saiba mais</a>')
    expect(ir[0]).toEqual({
      type: 'element',
      tag: 'a',
      text: 'Saiba mais',
      attrs: { href: 'https://x.com' },
    })
  })

  it('mapeia elemento com class para bloco, preservando a class nos attrs', () => {
    const ir = parseHTML('<p class="destaque">oi</p>')
    expect(ir[0]).toEqual({
      type: 'element',
      tag: 'p',
      text: 'oi',
      attrs: { class: 'destaque' },
    })
  })

  it('ignora o <script src> de wiring canônico (não vira bloco avançado)', () => {
    const ir = parseHTML('<body><h1>Olá, mundo!</h1><script src="script.js"></script></body>')
    expect(ir).toEqual([{ type: 'element', tag: 'h1', text: 'Olá, mundo!' }])
  })

  it('ignora o <link rel=stylesheet> de wiring canônico', () => {
    const ir = parseHTML('<body><link rel="stylesheet" href="style.css" /><p>x</p></body>')
    expect(ir).toEqual([{ type: 'element', tag: 'p', text: 'x' }])
  })

  it('preserva <script> inline (com código) como rawHTML advanced', () => {
    const ir = parseHTML('<body><script>console.log(1)</script></body>')
    expect(ir[0]?.type).toBe('rawHTML')
  })

  it('preserva <script src> de arquivo extra (utils.js) como rawHTML advanced', () => {
    const ir = parseHTML('<body><h1>x</h1><script src="utils.js"></script></body>')
    expect(ir[0]).toEqual({ type: 'element', tag: 'h1', text: 'x' })
    expect(ir[1]).toMatchObject({ type: 'rawHTML', advanced: true })
    if (ir[1]?.type === 'rawHTML') expect(ir[1].html).toContain('utils.js')
  })

  it('preserva <link> de folha de estilo extra (cores.css) como rawHTML advanced', () => {
    const ir = parseHTML('<body><link rel="stylesheet" href="cores.css" /><p>x</p></body>')
    expect(ir[0]).toMatchObject({ type: 'rawHTML', advanced: true })
    if (ir[0]?.type === 'rawHTML') expect(ir[0].html).toContain('cores.css')
    expect(ir[1]).toEqual({ type: 'element', tag: 'p', text: 'x' })
  })

  it('trata ./script.js e /style.css como wiring canônico (prefixos relativos)', () => {
    const ir = parseHTML(
      '<body><link rel="stylesheet" href="/style.css" /><p>x</p><script src="./script.js"></script></body>',
    )
    expect(ir).toEqual([{ type: 'element', tag: 'p', text: 'x' }])
  })

  it('NÃO trata style.css em subpasta como canônico (preserva)', () => {
    const ir = parseHTML('<body><link rel="stylesheet" href="css/style.css" /></body>')
    expect(ir[0]).toMatchObject({ type: 'rawHTML', advanced: true })
  })

  it('preserva comentário HTML entre blocos no round-trip (vira nó comment)', () => {
    const ir = parseHTML('<body><h1>a</h1><!--keep--><p>b</p></body>')
    expect(ir).toEqual([
      { type: 'element', tag: 'h1', text: 'a' },
      { type: 'comment', text: 'keep' },
      { type: 'element', tag: 'p', text: 'b' },
    ])
  })

  it('preserva comentário inline em <p> SEM fundir os textos vizinhos', () => {
    const ir = parseHTML('<p>x<!--c-->y</p>')
    expect(ir[0]?.type).toBe('element')
    if (ir[0]?.type === 'element') {
      expect(ir[0].tag).toBe('p')
      expect(ir[0].text).toBeUndefined()
      expect(ir[0].children).toEqual([
        { type: 'text', text: 'x' },
        { type: 'comment', text: 'c' },
        { type: 'text', text: 'y' },
      ])
    }
  })

  it('preserva comentário inline dentro de container (recursão)', () => {
    const ir = parseHTML('<div><!--topo--><p>oi</p></div>')
    expect(ir[0]?.type).toBe('element')
    if (ir[0]?.type === 'element') {
      expect(ir[0].children?.[0]).toEqual({ type: 'comment', text: 'topo' })
      expect(ir[0].children?.[1]).toEqual({ type: 'element', tag: 'p', text: 'oi' })
    }
  })

  it('preserva comentário inline em folha não-inline (<a>) verbatim', () => {
    const ir = parseHTML('<a href="#">x<!--c-->y</a>')
    expect(ir[0]?.type).toBe('rawHTML')
    if (ir[0]?.type === 'rawHTML') {
      expect(ir[0].advanced).toBe(true)
      expect(ir[0].html).toContain('<!--c-->')
      expect(ir[0].html).toContain('x')
      expect(ir[0].html).toContain('y')
    }
  })

  it('aninhamento patologicamente profundo não crasha (degrada ou parseia)', () => {
    // A guarda de profundidade EXPLÍCITA (MAX_HTML_NESTING) precisa honrar o
    // contrato de não-crashar mesmo para entradas patológicas.
    const depth = 20000
    const source = `<body>${'<div>'.repeat(depth)}x${'</div>'.repeat(depth)}</body>`
    const ir = parseHTML(source)
    expect(Array.isArray(ir)).toBe(true)
  })

  it('limita a profundidade de forma PREVISÍVEL: o trecho fundo vira rawHTML advanced', () => {
    // Abaixo do limite (64) tudo é estruturado; o nó MAIS FUNDO que cruza o
    // limite degrada para um único `rawHTML advanced` verbatim (via outerHTML),
    // sem perder nada e sem depender de catch de RangeError.
    const depth = 200
    const source = `<body>${'<div>'.repeat(depth)}fundo${'</div>'.repeat(depth)}</body>`
    const ir = parseHTML(source)
    expect(ir).toHaveLength(1)

    // Desce pelos containers estruturados e confirma que, em algum ponto, a
    // subárvore foi preservada como avançado (limite atingido) — e que o texto
    // mais fundo não se perdeu.
    let node = ir[0]
    let sawAdvanced = false
    let structuredLevels = 0
    while (node) {
      if (node.type === 'rawHTML') {
        sawAdvanced = true
        expect(node.advanced).toBe(true)
        expect(node.html).toContain('fundo')
        break
      }
      if (node.type !== 'element' || !node.children) break
      structuredLevels += 1
      node = node.children.find((c) => c.type === 'element' || c.type === 'rawHTML')
    }
    expect(sawAdvanced).toBe(true)
    // A estruturação parou perto do limite, não percorreu os 200 níveis.
    expect(structuredLevels).toBeLessThanOrEqual(66)
    expect(structuredLevels).toBeGreaterThan(60)
  })
})

describe('extractHTMLShell', () => {
  it('escapa aspas duplas no valor de atributo de <html> (round-trip fiel)', () => {
    // Sem escape, a aspa dupla embutida quebraria a fronteira do atributo.
    const shell = extractHTMLShell("<!doctype html><html data-x='a\"b'><head></head></html>")
    expect(shell?.htmlAttrs).toContain('data-x="a&quot;b"')
    expect(shell?.htmlAttrs).not.toContain('"a"b"')
  })

  it('escapa &, < e > no valor de atributo de <html>', () => {
    const shell = extractHTMLShell('<html data-x="a&amp;b&lt;c&gt;d"><head></head></html>')
    expect(shell?.htmlAttrs).toContain('data-x="a&amp;b&lt;c&gt;d"')
  })
})
