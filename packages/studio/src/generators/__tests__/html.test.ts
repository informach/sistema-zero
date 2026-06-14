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
})
