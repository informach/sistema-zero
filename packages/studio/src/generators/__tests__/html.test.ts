import { describe, expect, it } from 'bun:test'
import type { HTMLNode } from '#ir'
import { generateHTML } from '../html'
import { GeneratorDepthError, MAX_GENERATOR_DEPTH } from '../js'

describe('generateHTML', () => {
  it('produz um documento HTML válido com title, link CSS e script JS', () => {
    const html = generateHTML({
      title: 'Olá',
      body: [{ type: 'element', tag: 'h1', text: 'Olá' }],
    })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>Olá</title>')
    expect(html).toContain('<link rel="stylesheet" href="style.css" />')
    expect(html).toContain('<h1>Olá</h1>')
    expect(html).toContain('<script src="script.js"></script>')
  })

  it('inclui a viewport móvel na casca padrão', () => {
    const html = generateHTML({ title: 'Jogo', body: [] })

    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1" />')
  })

  it('descarta atributos com nome inválido e mantém os válidos', () => {
    const html = generateHTML({
      title: 'Test',
      body: [
        {
          type: 'element',
          tag: 'div',
          attrs: {
            'data-ok': 'sim',
            'onmouseover=alert(1) x': 'y',
            '': 'vazio',
          },
        },
      ],
    })
    expect(html).toContain('data-ok="sim"')
    expect(html).not.toContain('onmouseover=alert(1)')
    expect(html).not.toContain('="vazio"')
  })

  it('escapa o valor de atributo (não permite quebrar do par chave="valor")', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'element', tag: 'div', attrs: { title: 'a" onload="x' } }],
    })
    expect(html).toContain('title="a&quot; onload=&quot;x"')
    expect(html).not.toContain('onload="x"')
  })

  it('escapa caracteres perigosos no texto', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'element', tag: 'p', text: '<img onerror=alert(1)>' }],
    })
    expect(html).not.toContain('<img onerror=alert(1)>')
    expect(html).toContain('&lt;img onerror=alert(1)&gt;')
  })

  it('impede que o texto de um comentário encerre o comentário e injete HTML', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'comment', text: 'fim--><h1>visível</h1><!--' }],
    })
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    expect(parsed.querySelector('h1')).toBeNull()
    expect(parsed.body.textContent).not.toContain('visível')
  })

  it('renderiza canvas com largura/altura', () => {
    const html = generateHTML({
      title: 'Jogo',
      body: [{ type: 'canvas', id: 'game', width: 400, height: 300 }],
    })
    expect(html).toContain('<canvas id="game" width="400" height="300"></canvas>')
  })

  it('renderiza canvas sem largura/altura (sem atributos de tamanho)', () => {
    const html = generateHTML({
      title: 'Jogo',
      body: [{ type: 'canvas', id: 'tela' }],
    })
    expect(html).toContain('<canvas id="tela"></canvas>')
  })

  it('preserva nó rawHTML (modo avançado)', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'rawHTML', html: '<section data-x="1"><b>oi</b></section>', advanced: true }],
    })
    expect(html).toContain('<section data-x="1"><b>oi</b></section>')
  })

  it('re-emite a casca do documento (head/doctype) verbatim quando fornecida', () => {
    const html = generateHTML({
      title: 'Ignorado quando há shell',
      body: [{ type: 'element', tag: 'h1', text: 'Oi' }],
      shell: {
        doctype: '<!doctype html>',
        htmlAttrs: ' lang="pt-BR" data-tema="escuro"',
        head: '\n    <meta charset="UTF-8" />\n    <title>Meu título</title>\n    <link rel="stylesheet" href="style.css" />\n  ',
      },
    })
    expect(html).toContain('<html lang="pt-BR" data-tema="escuro">')
    expect(html).toContain('<title>Meu título</title>')
    expect(html).toContain('<h1>Oi</h1>')
    expect(html).toContain('<script src="script.js"></script>')
    // Não duplica o link nem usa o título-padrão quando há shell.
    expect(html).not.toContain('Ignorado quando há shell')
  })

  it('não duplica o script canônico quando a casca já o mantém no cabeçalho', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'element', tag: 'h1', text: 'Oi' }],
      shell: { head: '\n    <script src="script.js"></script>\n  ' },
    })
    expect(html.match(/<script src="script\.js"><\/script>/g)).toHaveLength(1)
    expect(html.indexOf('<script src="script.js"></script>')).toBeLessThan(html.indexOf('<body>'))
  })

  it('renderiza elementos aninhados (container com filhos)', () => {
    const html = generateHTML({
      title: 'Landing',
      body: [
        {
          type: 'element',
          tag: 'section',
          id: 'hero',
          children: [
            { type: 'element', tag: 'h1', text: 'Bem-vindo' },
            { type: 'element', tag: 'p', text: 'Subtítulo' },
          ],
        },
      ],
    })
    expect(html).toContain('<section id="hero">')
    expect(html).toContain('<h1>Bem-vindo</h1>')
    expect(html).toContain('</section>')
  })

  it('renderiza tags void (img/input) como self-closing', () => {
    const html = generateHTML({
      title: 'X',
      body: [
        { type: 'element', tag: 'img', attrs: { src: 'logo.png', alt: 'logo' } },
        {
          type: 'element',
          tag: 'input',
          id: 'email',
          attrs: { type: 'email', placeholder: 'E-mail' },
        },
      ],
    })
    expect(html).toContain('<img src="logo.png" alt="logo" />')
    expect(html).toContain('<input id="email" type="email" placeholder="E-mail" />')
    // Não deve fechar a tag void.
    expect(html).not.toContain('</img>')
    expect(html).not.toContain('</input>')
  })

  it('não injeta runtime de extensão nos arquivos gerados', () => {
    const html = generateHTML({
      title: 'Game',
      body: [],
    })
    expect(html).not.toContain('SZGame2D')
  })

  it('neutraliza </script> literal em JS inline (não fecha o elemento cedo)', () => {
    const js = 'const s = "</script><img src=x onerror=alert(1)>";'
    const html = generateHTML({
      title: 'Test',
      body: [],
      shell: { jsPlacement: 'inline-body-end' },
      jsCode: js,
    })
    // O fechamento literal foi neutralizado com a barra invertida — o `<img>`
    // continua sendo TEXTO dentro do script, não fecha o elemento cedo.
    expect(html).toContain('<\\/script><img src=x onerror=alert(1)>')
    expect(html).not.toContain('</script><img')
    // Exatamente um `</script>` (o do elemento): o conteúdo não fecha outro.
    expect(html.match(/<\/script>/g)?.length).toBe(1)
  })

  it('neutraliza </style> literal em CSS inline (não fecha o elemento cedo)', () => {
    const css = 'body::after { content: "</style><b>x</b>"; }'
    const html = generateHTML({
      title: 'Test',
      body: [],
      shell: { cssPlacement: 'inline-head' },
      cssCode: css,
    })
    expect(html).toContain('<\\/style>')
    expect(html).not.toContain('</style><b>')
    expect(html.match(/<\/style>/g)?.length).toBe(1)
  })

  it('neutraliza só o fechamento </script no JS inline (preserva <!-- e <script)', () => {
    const js = '/* <!-- */ const t = "<script>foo</script>";'
    const html = generateHTML({
      title: 'Test',
      body: [],
      shell: { jsPlacement: 'inline-body-end' },
      jsCode: js,
    })
    // Aberturas ficam intactas (regex /u do aluno preservado); só o fechamento
    // literal é neutralizado. O `<script>foo` (abertura) sai cru; o `</script>`
    // após `foo` (fechamento) é neutralizado para `<\/script>`.
    expect(html).toContain('<!--')
    expect(html).not.toContain('<\\!--')
    expect(html).toContain('<script>foo<\\/script>')
    // Só o elemento de fato fecha (o `</script>` interno foi escapado).
    expect(html.match(/<\/script>/g)?.length).toBe(1)
  })

  it('script inline é CLÁSSICO mesmo com import/export em string (sem virar module)', () => {
    // O bug M3: o sniff por regex `/^\s*(?:import|export)\b/m` ligava no token
    // `export` no INÍCIO de uma linha dentro de uma STRING do aluno, promovendo
    // o script a `type="module"` — o que quebra funções globais e `onclick=...`.
    // Agora confiamos só em `shell.jsModule` (autoritativo do parser).
    const js = 'const texto = `\nexport isso é só texto\n`;\nfunction saudar() {}'
    const html = generateHTML({
      title: 'Test',
      body: [],
      shell: { jsPlacement: 'inline-body-end' },
      jsCode: js,
    })
    expect(html).toContain('<script>')
    expect(html).not.toContain('type="module"')
  })

  it('script inline vira module SÓ quando shell.jsModule é true', () => {
    const html = generateHTML({
      title: 'Test',
      body: [],
      shell: { jsPlacement: 'inline-body-end', jsModule: true },
      jsCode: 'import { x } from "./mod.js";',
    })
    expect(html).toContain('<script type="module">')
  })

  it('escapa < e > no valor de atributo (consistência com escapeHtml)', () => {
    const html = generateHTML({
      title: 'Test',
      body: [{ type: 'element', tag: 'div', attrs: { title: 'a<b>c' } }],
    })
    expect(html).toContain('title="a&lt;b&gt;c"')
    expect(html).not.toContain('a<b>c')
  })

  it('lança GeneratorDepthError (capturável) com elementos aninhados demais', () => {
    let node: HTMLNode = { type: 'element', tag: 'span', text: 'fundo' }
    for (let i = 0; i < MAX_GENERATOR_DEPTH + 50; i += 1) {
      node = { type: 'element', tag: 'div', children: [node] }
    }
    expect(() => generateHTML({ title: 'X', body: [node] })).toThrow(GeneratorDepthError)
  })

  it('aplica a mesma guarda aos filhos alternativos de Canvas', () => {
    let child: HTMLNode = { type: 'element', tag: 'span', text: 'fundo' }
    for (let i = 0; i < MAX_GENERATOR_DEPTH + 50; i += 1) {
      child = { type: 'element', tag: 'span', children: [child] }
    }
    const canvas: HTMLNode = { type: 'canvas', id: 'jogo', children: [child] }

    expect(() => generateHTML({ title: 'X', body: [canvas] })).toThrow(GeneratorDepthError)
  })

  describe('chokepoint de atributos (handlers inline + URLs)', () => {
    it('DESCARTA handlers inline on* (onclick/onerror/onload/onmouseover)', () => {
      const html = generateHTML({
        title: 'X',
        body: [
          {
            type: 'element',
            tag: 'button',
            text: 'Clica',
            attrs: {
              onclick: 'alert(1)',
              ONERROR: 'alert(2)',
              onLoad: 'alert(3)',
              onmouseover: 'alert(4)',
              'data-ok': 'sim',
            },
          },
        ],
      })
      expect(html).not.toContain('onclick')
      expect(html).not.toContain('ONERROR')
      expect(html).not.toContain('onLoad')
      expect(html).not.toContain('onmouseover')
      expect(html).not.toContain('alert(')
      // Atributo legítimo permanece.
      expect(html).toContain('data-ok="sim"')
    })

    it('REJEITA href javascript:/vbscript: (e variações com controle/maiúscula)', () => {
      const html = generateHTML({
        title: 'X',
        body: [
          { type: 'element', tag: 'a', text: 'um', attrs: { href: 'javascript:alert(1)' } },
          { type: 'element', tag: 'a', text: 'dois', attrs: { href: 'JavaScript:alert(2)' } },
          { type: 'element', tag: 'a', text: 'três', attrs: { href: '  javascript:alert(3)' } },
          { type: 'element', tag: 'a', text: 'quatro', attrs: { href: 'java\tscript:alert(4)' } },
          { type: 'element', tag: 'a', text: 'cinco', attrs: { href: 'vbscript:msgbox(5)' } },
        ],
      })
      expect(html.toLowerCase()).not.toContain('javascript:')
      expect(html.toLowerCase()).not.toContain('vbscript:')
      expect(html).not.toContain('alert(')
      // O texto do link continua presente (só o atributo perigoso some).
      expect(html).toContain('>um<')
    })

    it('REJEITA data:text/html em href mas MANTÉM data:image em src', () => {
      const html = generateHTML({
        title: 'X',
        body: [
          {
            type: 'element',
            tag: 'a',
            text: 'mau',
            attrs: { href: 'data:text/html,<script>alert(1)</script>' },
          },
          {
            type: 'element',
            tag: 'img',
            attrs: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'pixel' },
          },
        ],
      })
      expect(html).not.toContain('data:text/html')
      expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="')
    })

    it('MANTÉM href http/https/relativo/âncora/protocolo-relativo', () => {
      const html = generateHTML({
        title: 'X',
        body: [
          { type: 'element', tag: 'a', text: 'http', attrs: { href: 'http://exemplo.com' } },
          { type: 'element', tag: 'a', text: 'https', attrs: { href: 'https://exemplo.com/p' } },
          { type: 'element', tag: 'a', text: 'rel', attrs: { href: 'pagina/sobre.html' } },
          { type: 'element', tag: 'a', text: 'anc', attrs: { href: '#secao' } },
          { type: 'element', tag: 'a', text: 'pr', attrs: { href: '//cdn.exemplo.com/x' } },
          { type: 'element', tag: 'a', text: 'mail', attrs: { href: 'mailto:oi@exemplo.com' } },
        ],
      })
      expect(html).toContain('href="http://exemplo.com"')
      expect(html).toContain('href="https://exemplo.com/p"')
      expect(html).toContain('href="pagina/sobre.html"')
      expect(html).toContain('href="#secao"')
      expect(html).toContain('href="//cdn.exemplo.com/x"')
      expect(html).toContain('href="mailto:oi@exemplo.com"')
    })

    it('aplica o filtro em outros atributos de URL (formaction/action/poster)', () => {
      const html = generateHTML({
        title: 'X',
        body: [
          {
            type: 'element',
            tag: 'button',
            text: 'go',
            attrs: { formaction: 'javascript:alert(1)' },
          },
          { type: 'element', tag: 'form', attrs: { action: 'javascript:alert(2)' } },
          { type: 'element', tag: 'div', attrs: { poster: 'javascript:alert(3)' } },
        ],
      })
      expect(html.toLowerCase()).not.toContain('javascript:')
      expect(html).not.toContain('alert(')
    })
  })
})
