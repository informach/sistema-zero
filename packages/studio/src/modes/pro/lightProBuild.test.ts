import { describe, expect, it } from 'bun:test'
import type { Project, ProjectTree } from '#core'
import { BASE_TREES, VITE_CONFIG_VANILLA } from '../../components/code/pro-templates/base'
import { createEmptyProject } from '../../core/project'
import { LIGHT_PRO_CSP, type LightProPlan, planLightProBuild } from './lightProBuild'

const INDEX = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Jogo</title>
  </head>
  <body>
    <canvas id="tela"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`

function project(files: Record<string, string>, extra: Partial<Project> = {}): Project {
  const tree: ProjectTree = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    for (let depth = 1; depth < parts.length; depth++)
      tree[parts.slice(0, depth).join('/')] = { kind: 'dir' }
    tree[path] = { kind: 'file', content }
  }
  return {
    ...createEmptyProject('light', 'Leve'),
    kind: 'pro',
    mode: 'code',
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    tree,
    ...extra,
  }
}

function light(plan: LightProPlan): { html: string; modules: string[]; document: Document } {
  if (plan.kind !== 'light') throw new Error(`Foi ao servidor: ${plan.reason}`)
  const document = new DOMParser().parseFromString(plan.html, 'text/html')
  const bootstrap = [...document.querySelectorAll('script')].find((script) =>
    script.textContent?.includes('importmap'),
  )
  const match = bootstrap?.textContent?.match(/^\(\(\)=>\{const s=(.*?);const m=\{\}/s)
  if (!match?.[1]) throw new Error('Documento sem a montagem dos módulos.')
  return { html: plan.html, modules: JSON.parse(match[1]) as string[], document }
}

function hostedReason(plan: LightProPlan): string {
  if (plan.kind !== 'hosted') throw new Error('Era para ir ao servidor.')
  return plan.reason
}

function treeFiles(tree: ProjectTree | undefined): Record<string, string> {
  const files: Record<string, string> = {}
  for (const [path, node] of Object.entries(tree ?? {}))
    if (node.kind === 'file') files[path] = node.content
  return files
}

describe('execução leve do Pro: o que o navegador monta igual ao Vite', () => {
  it('monta os modelos JavaScript e TypeScript sem biblioteca, com a política do servidor', () => {
    for (const id of ['vanilla-js', 'vanilla-vite'] as const) {
      const { document, modules } = light(planLightProBuild(project(treeFiles(BASE_TREES[id]))))
      const policy = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      expect(policy?.getAttribute('content')).toBe(LIGHT_PRO_CSP)
      // A folha de estilo do index.html entra no lugar do link, como no documento do servidor.
      expect(document.querySelector('link[rel="stylesheet"]')).toBeNull()
      expect(document.querySelector('style')?.textContent).toContain('font-family: system-ui')
      const entry = document.querySelector('body script[type="module"]')
      expect(entry?.textContent).toBe('import "sz-light:0"')
      expect(entry?.hasAttribute('src')).toBe(false)
      expect(modules[0]).toContain("document.getElementById('app')")
    }
  })

  it('tira os tipos, descarta a importação só de tipo e liga cada importação ao seu módulo', () => {
    const { modules } = light(
      planLightProBuild(
        project({
          'index.html': INDEX,
          'src/main.ts': [
            "import type { Ponto } from './tipos'",
            "import { Sem } from './naoUsado'",
            "import { mover } from './fisica.js'",
            "import { cores } from '/src/tema'",
            "import { tela } from './ui'",
            'const p: Ponto = mover({ x: 1, y: 2 })',
            'console.log(p, cores, tela)',
          ].join('\n'),
          'src/tipos.ts': 'export interface Ponto { x: number; y: number }\n',
          'src/naoUsado.ts': 'export const Sem = 1\n',
          'src/fisica.ts':
            "import type { Ponto } from './tipos'\nexport const mover = (p: Ponto): Ponto => p\n",
          'src/tema.ts': "export const cores = ['#fff']\n",
          'src/ui/index.ts': 'export const tela = 1\n',
        }),
      ),
    )
    // main, fisica, tema e ui/index: os tipos e o não usado nunca viram módulo (como no esbuild).
    expect(modules).toHaveLength(4)
    expect(modules[0]).toContain('from "sz-light:1"')
    expect(modules[0]).toContain('from "sz-light:2"')
    expect(modules[0]).toContain('from "sz-light:3"')
    expect(modules[0]).not.toContain('Ponto =')
    expect(modules[0]).not.toContain('naoUsado')
    expect(modules[1]).toContain('export const mover = (p) => p')
  })

  it('aceita ciclos e await no topo, que os módulos nativos resolvem como o Vite', () => {
    const { modules } = light(
      planLightProBuild(
        project({
          'index.html': INDEX,
          'src/main.ts':
            "import { b } from './b'\nconst dados = await Promise.resolve(b)\nconsole.log(dados)\n",
          'src/b.ts': "import { a } from './a'\nexport const b = () => a\n",
          'src/a.ts': "import { b } from './b'\nexport const a = () => b\n",
        }),
      ),
    )
    expect(modules).toHaveLength(3)
    expect(modules[1]).toContain('from "sz-light:2"')
    expect(modules[2]).toContain('from "sz-light:1"')
    expect(modules[0]).toContain('await Promise.resolve(b)')
  })

  it('junta o CSS importado no fim do head, na ordem em que os módulos rodam', () => {
    const { document } = light(
      planLightProBuild(
        project({
          'index.html': INDEX,
          'src/main.ts': "import './a'\nimport './main.css'\n",
          'src/a.ts': "import './a.css'\nexport {}\n",
          'src/a.css': '.a { color: red }',
          'src/main.css': '.main { color: blue }',
        }),
      ),
    )
    const styles = [...document.head.querySelectorAll('style')]
    expect(styles.at(-1)?.textContent).toBe('.a { color: red }\n.main { color: blue }')
  })

  it('JSON vira módulo com o padrão e os nomes, como o plugin do Vite', () => {
    const { modules } = light(
      planLightProBuild(
        project({
          'index.html': INDEX,
          'src/main.ts':
            "import fases, { primeira } from './fases.json'\nconsole.log(fases, primeira)\n",
          'src/fases.json': '{"primeira": 1, "default": 2, "com-traco": 3}',
        }),
      ),
    )
    expect(modules[1]).toContain('export default __szJson;')
    expect(modules[1]).toContain('export const primeira = __szJson["primeira"];')
    expect(modules[1]).not.toContain('export const default')
    expect(modules[1]).not.toContain('com-traco =')
  })

  it('reescreve a importação dinâmica com caminho escrito', () => {
    const { modules } = light(
      planLightProBuild(
        project({
          'index.html': INDEX,
          'src/main.ts': "const fase = await import('./fase2')\nconsole.log(fase)\n",
          'src/fase2.ts': 'export const nome = "dois"\n',
        }),
      ),
    )
    expect(modules[0]).toContain('import("sz-light:1")')
  })

  it('nenhum fechamento de script escapa do documento', () => {
    const plan = planLightProBuild(
      project({
        'index.html': INDEX,
        'src/main.ts': 'console.log("</script><script>alert(1)</script>")\n',
      }),
    )
    const { modules, html } = light(plan)
    expect(modules[0]).toContain('</script><script>alert(1)</script>')
    // Só os dois fechamentos dos scripts do documento: a montagem e a entrada.
    expect(html.match(/<\/script>/g)).toHaveLength(2)
  })
})

describe('execução leve do Pro: o que continua no servidor', () => {
  const base = { 'index.html': INDEX, 'src/main.ts': 'console.log(1)\n' }
  const cases: Array<[string, Record<string, string>, Partial<Project>?]> = [
    [
      'biblioteca',
      { ...base, 'src/main.ts': "import * as THREE from 'three'\nconsole.log(THREE)\n" },
    ],
    [
      'bibliotecas no package.json',
      { ...base, 'package.json': JSON.stringify({ dependencies: { three: '0.184.0' } }) },
    ],
    ['vite.config mudado', { ...base, 'vite.config.ts': `${VITE_CONFIG_VANILLA}// mudei\n` }],
    [
      'materiais',
      base,
      {
        assets: [
          {
            id: 'a',
            name: 'a',
            kind: 'image',
            source: 'upload',
            width: 1,
            height: 1,
            dataUrl: 'data:image/png;base64,',
          },
        ],
      },
    ],
    ['import.meta', { ...base, 'src/main.ts': 'console.log(import.meta.env.MODE)\n' }],
    ['caminho calculado', { ...base, 'src/main.ts': "const n = 'a'\nawait import('./' + n)\n" }],
    [
      'consulta do Vite',
      {
        ...base,
        'src/main.ts': "import t from './a.txt?raw'\nconsole.log(t)\n",
        'src/a.txt': 'oi',
      },
    ],
    [
      'JSX',
      {
        ...base,
        'src/main.ts': "import { App } from './App'\nconsole.log(App)\n",
        'src/App.tsx': 'export const App = 1\n',
      },
    ],
    [
      'arquivo que não existe',
      { ...base, 'src/main.ts': "import { x } from './sumiu'\nconsole.log(x)\n" },
    ],
    ['código que não compila', { ...base, 'src/main.ts': 'const = 1\n' }],
    [
      'CSS Modules',
      { ...base, 'src/main.ts': "import './a.module.css'\n", 'src/a.module.css': '.a{}' },
    ],
    [
      'CSS com nome',
      {
        ...base,
        'src/main.ts': "import css from './a.css'\nconsole.log(css)\n",
        'src/a.css': '.a{}',
      },
    ],
    [
      'url() no CSS',
      {
        ...base,
        'src/main.ts': "import './a.css'\n",
        'src/a.css': '.a{background:url(./fundo.png)}',
      },
    ],
    [
      '@import no CSS',
      { ...base, 'src/main.ts': "import './a.css'\n", 'src/a.css': "@import './b.css';" },
    ],
    [
      'imagem local no HTML',
      { ...base, 'index.html': INDEX.replace('<canvas', '<img src="/fundo.png"><canvas') },
    ],
    [
      'ícone local',
      {
        ...base,
        'index.html': INDEX.replace('<title>', '<link rel="icon" href="/favicon.ico"><title>'),
      },
    ],
    [
      'módulo escrito no HTML',
      {
        ...base,
        'index.html': INDEX.replace(
          '</body>',
          '<script type="module">console.log(1)</script></body>',
        ),
      },
    ],
    ['sem index.html', { 'src/main.ts': 'console.log(1)\n' }],
    ['caminho fora do projeto', { ...base, 'src/main.ts': "import '../../fora'\n" }],
  ]
  for (const [name, files, extra] of cases)
    it(name, () => {
      expect(hostedReason(planLightProBuild(project(files, extra)))).toBeTruthy()
    })

  it('um projeto Python (sem index.html nem módulos JS) continua no caminho dele', () => {
    expect(hostedReason(planLightProBuild(project({ 'main.py': 'print(1)\n' })))).toBe(
      'sem index.html',
    )
  })
})
