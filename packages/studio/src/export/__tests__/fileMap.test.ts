import { describe, expect, it } from 'bun:test'
import type { Project } from '#core'
import { createProProject } from '../../components/code/pro-templates'
import { buildClassicFileMap, buildProFileMap } from '../fileMap'
import { identityMinifiers } from '../minify'

function classicProject(overrides: Partial<Project> = {}): Project {
  return {
    id: '01',
    name: 'Meu Jogo',
    createdAt: 0,
    updatedAt: 0,
    mode: 'blocks',
    files: {
      'index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<title>Meu Jogo</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<script src="script.js"></script>
</body>
</html>
`,
      'style.css': 'body { color: red; }',
      'script.js': 'console.log("oi");',
    },
    extraFiles: [],
    ir: { html: [], css: [], js: [], extensions: [] },
    blocksState: null,
    installedExtensions: [],
    ...overrides,
  }
}

describe('buildClassicFileMap', () => {
  it('placement external: emite os 3 arquivos sob public/ e mantem as referencias', async () => {
    const { files } = await buildClassicFileMap(classicProject(), identityMinifiers)
    expect(files['public/index.html']).toBeDefined()
    expect(files['public/style.css']).toBe('body { color: red; }')
    expect(files['public/script.js']).toBe('console.log("oi");')
    expect(files['public/index.html']).toContain('href="style.css"')
    expect(files['public/index.html']).toContain('src="script.js"')
  })

  it('assets viram arquivos binários public/<nome> (url() relativa do CSS resolve)', async () => {
    // "AAAA" base64 = 3 bytes 0x00 — o suficiente p/ aferir a decodificação.
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html': '<!doctype html><html><body></body></html>',
          'style.css': "#canvas1 { background: url('background.png'); }",
          'script.js': '',
        },
        assets: [
          {
            id: 'a1',
            name: 'background.png',
            kind: 'image',
            dataUrl: 'data:image/png;base64,AAAA',
            width: 1,
            height: 1,
            source: 'library',
          },
        ],
      }),
      identityMinifiers,
    )
    const bytes = files['public/background.png']
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect((bytes as Uint8Array).length).toBe(3)
    // O CSS persistido segue com o nome LÓGICO (a troca por data:URL é só do preview).
    expect(files['public/style.css']).toContain("url('background.png')")
    // sz-assets.js continua alimentando o __SZGAME_ASSETS dos blocos de imagem.
    expect(files['public/sz-assets.js']).toBeDefined()
    expect(warnings).toEqual([])
  })

  it('placement inline (css/js vazios): nao emite arquivos externos vazios', async () => {
    const { files } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html':
            '<!doctype html><html><head><style>x{}</style></head><body><script>1</script></body></html>',
          'style.css': '',
          'script.js': '',
        },
      }),
      identityMinifiers,
    )
    expect(files['public/index.html']).toBeDefined()
    expect(files['public/style.css']).toBeUndefined()
    expect(files['public/script.js']).toBeUndefined()
  })

  it('extras: .ts vira .js sem tipos, .css e linkado, nome reservado e pulado', async () => {
    const { files } = await buildClassicFileMap(
      classicProject({
        extraFiles: [
          { name: 'utils.ts', language: 'typescript', content: 'export const x: number = 1' },
          { name: 'cores.css', language: 'css', content: '.a{color:blue}' },
          { name: 'script.js', language: 'javascript', content: 'NOPE' },
        ],
      }),
      identityMinifiers,
    )
    expect(files['public/utils.js']).toBeDefined()
    expect(files['public/utils.js']).not.toContain(': number')
    expect(files['public/cores.css']).toBe('.a{color:blue}')
    expect(files['public/index.html']).toContain('href="cores.css"')
    // extra com nome canonico reservado nao deve aparecer
    expect(files['public/script.js']).toBe('console.log("oi");') // o canonico, nao o extra
    expect(String(files['public/script.js'])).not.toContain('NOPE')
  })

  it('colisao de nome de saida: extra script.ts NAO sobrescreve o public/script.js canonico (perda de dados)', async () => {
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html': classicProject().files['index.html'],
          'style.css': '',
          'script.js': 'CODIGO_PRINCIPAL_DO_ALUNO()',
        },
        // `script.ts` nao e reservado (so os nomes EXATOS sao) e viraria script.js.
        extraFiles: [{ name: 'script.ts', language: 'typescript', content: 'CODIGO_DO_EXTRA()' }],
      }),
      identityMinifiers,
    )
    // O canonico do aluno e preservado; o extra fica de fora com aviso.
    expect(files['public/script.js']).toBe('CODIGO_PRINCIPAL_DO_ALUNO()')
    expect(String(files['public/script.js'])).not.toContain('CODIGO_DO_EXTRA')
    expect(warnings.some((w) => w.includes('script.ts') && w.includes('script.js'))).toBe(true)
  })

  it('colisao de nome de saida: dois extras com mesmo basename (utils.js + utils.ts) nao se clobam', async () => {
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        extraFiles: [
          { name: 'utils.js', language: 'javascript', content: 'DE_JS()' },
          { name: 'utils.ts', language: 'typescript', content: 'DE_TS()' },
        ],
      }),
      identityMinifiers,
    )
    // O primeiro vence; o segundo (mesmo nome de saida utils.js) fica de fora com aviso.
    expect(files['public/utils.js']).toBe('DE_JS()')
    expect(String(files['public/utils.js'])).not.toContain('DE_TS')
    expect(warnings.some((w) => w.includes('utils.ts'))).toBe(true)
  })

  it('extensao game-3d: emite o bootstrap e injeta importmap com three', async () => {
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
      }),
      identityMinifiers,
    )
    expect(files['public/sz-ext/game-3d.js']).toBeDefined()
    const index = String(files['public/index.html'])
    expect(index).toContain('<script type="importmap">')
    expect(index).toContain('three')
    expect(index).toContain('src="sz-ext/game-3d.js"')
    // LOW: avisa que a lib 3D vem da internet (esm.sh) — visitante precisa estar online.
    expect(warnings.some((w) => w.includes('esm.sh'))).toBe(true)
  })

  it('A1: reinjeta o link de style.css quando o aluno tirou a referencia do index', async () => {
    const { files } = await buildClassicFileMap(
      classicProject({
        files: {
          // HTML sem <link> de style.css, mas com style.css populado (external).
          'index.html': '<!doctype html><html><head><title>x</title></head><body></body></html>',
          'style.css': 'body{color:red}',
          'script.js': '',
        },
      }),
      identityMinifiers,
    )
    expect(files['public/style.css']).toBe('body{color:red}')
    expect(String(files['public/index.html'])).toContain('href="style.css"')
  })

  it('A1: reinjeta o script de script.js quando o aluno tirou a referencia do index', async () => {
    const { files } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html': '<!doctype html><html><head></head><body><h1>oi</h1></body></html>',
          'style.css': '',
          'script.js': 'console.log(1)',
        },
      }),
      identityMinifiers,
    )
    expect(files['public/script.js']).toBe('console.log(1)')
    expect(String(files['public/index.html'])).toMatch(/<script[^>]*src="script\.js"/)
  })

  it('A2 externaliza: JS 3D inline unico vira public/script.js deferido', async () => {
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html':
            '<!doctype html><html><head></head><body><canvas id="c"></canvas><script>SZGame3D.createScene("c")</script></body></html>',
          'style.css': '',
          // script.js canonico VAZIO ⇒ placement inline (o JS esta no index).
          'script.js': '',
        },
        installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
      }),
      identityMinifiers,
    )
    // O conteudo inline migrou para o arquivo externo...
    expect(files['public/script.js']).toBe('SZGame3D.createScene("c")')
    const index = String(files['public/index.html'])
    // ...e o index agora aponta para o arquivo, deferido (roda apos o module da extensao).
    expect(index).toMatch(
      /<script[^>]*\bdefer[^>]*src="script\.js"|<script[^>]*src="script\.js"[^>]*\bdefer/,
    )
    expect(index).not.toContain('SZGame3D.createScene("c")</script>')
    // Caminho externalizado nao emite o aviso de JS inline (so o de esm.sh).
    expect(warnings.some((w) => w.includes('coloque o seu código'))).toBe(false)
  })

  it('A2 ambiguo: dois scripts inline + extensao 3D viram aviso, sem mexer no HTML', async () => {
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        files: {
          'index.html':
            '<!doctype html><html><head></head><body><script>a()</script><script>b()</script></body></html>',
          'style.css': '',
          'script.js': '',
        },
        installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
      }),
      identityMinifiers,
    )
    // Ambiguo: nao externaliza (sem public/script.js) e mantem os 2 scripts inline.
    expect(files['public/script.js']).toBeUndefined()
    const index = String(files['public/index.html'])
    expect(index).toContain('a()')
    expect(index).toContain('b()')
    expect(warnings.some((w) => w.includes('script.js'))).toBe(true)
  })

  it('M1: extra .ts que nao compila vira aviso e nao quebra o export', async () => {
    // Minificador que LANCA para um extra especifico, simulando a falha de
    // transpileExtra/minify por arquivo. O export precisa seguir de pe com aviso.
    const throwingMinifiers = {
      ...identityMinifiers,
      js: async (code: string) => {
        if (code.includes('VAI_QUEBRAR')) throw new Error('boom de compilacao')
        return code
      },
    }
    const { files, warnings } = await buildClassicFileMap(
      classicProject({
        extraFiles: [
          { name: 'quebrado.ts', language: 'typescript', content: 'const x = "VAI_QUEBRAR"' },
        ],
      }),
      throwingMinifiers,
    )
    // O export segue de pe (index.html emitido) e o arquivo problematico ficou de fora.
    expect(files['public/index.html']).toBeDefined()
    expect(files['public/quebrado.js']).toBeUndefined()
    expect(warnings.some((w) => w.includes('quebrado.ts'))).toBe(true)
  })
})

describe('buildProFileMap', () => {
  it('emite a arvore inteira, sem warnings quando os caminhos sao seguros e ha build', () => {
    const project = createProProject('02', 'App Pro', 'vanilla-vite')
    const { files, warnings } = buildProFileMap(project)
    expect(files['package.json']).toBeDefined()
    expect(files['vite.config.ts']).toBeDefined()
    expect(files['src/main.ts']).toBeDefined()
    expect(warnings).toEqual([])
  })

  it('pula node_modules (subsumido por normalizeProPath) com aviso nao-fatal', () => {
    const project = createProProject('02b', 'App Pro', 'vanilla-vite')
    // injeta um node_modules que deve ser ignorado pela guarda de caminho
    project.tree = { ...project.tree, 'node_modules/x/index.js': { kind: 'file', content: 'x' } }
    const { files, warnings } = buildProFileMap(project)
    expect(files['package.json']).toBeDefined()
    expect(files['node_modules/x/index.js']).toBeUndefined()
    expect(warnings.some((w) => w.includes('node_modules/x/index.js'))).toBe(true)
  })

  it('zip-slip: caminho com .. (e absoluto) fica de fora do pacote com aviso', () => {
    const project = createProProject('02c', 'App Pro', 'vanilla-vite')
    // Caminhos cruus perigosos no limite do ZIP: travessia e absoluto. normalizeProPath
    // rejeita ambos (null), entao a guarda de defesa em profundidade os descarta.
    project.tree = {
      ...project.tree,
      '../escapa.js': { kind: 'file', content: 'MALICIOSO()' },
      '/etc/passwd': { kind: 'file', content: 'MALICIOSO()' },
    }
    const { files, warnings } = buildProFileMap(project)
    expect(files['../escapa.js']).toBeUndefined()
    expect(files['/etc/passwd']).toBeUndefined()
    expect(files['package.json']).toBeDefined()
    expect(warnings.some((w) => w.includes('../escapa.js'))).toBe(true)
    expect(warnings.some((w) => w.includes('/etc/passwd'))).toBe(true)
  })

  it('avisa quando o package.json nao tem script de build', () => {
    const project = createProProject('03', 'App Pro', 'vanilla-vite')
    project.tree = {
      ...project.tree,
      'package.json': { kind: 'file', content: JSON.stringify({ name: 'x', scripts: {} }) },
    }
    const { warnings } = buildProFileMap(project)
    expect(warnings.length).toBeGreaterThan(0)
  })
})
