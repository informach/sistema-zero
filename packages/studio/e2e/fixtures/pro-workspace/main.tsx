import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../../src/core/project'
import { getMonacoModelPath } from '../../../src/monaco/modelPaths'
import { createLocalPersistenceAdapter } from '../../../src/state/projectStore'
import { StudioEditor } from '../../../src/studio/StudioEditor'
import type { StudioTutorConfig } from '../../../src/studio/tutor'
import { modularProjectFiles } from './modularProject'
import '../../../playground/styles.css'

const project = {
  ...createEmptyProject('workspace-browser', 'Meu primeiro jogo'),
  kind: 'pro' as const,
  mode: 'code' as const,
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
  assets: [
    {
      id: 'estrela',
      name: 'estrela',
      kind: 'image' as const,
      source: 'upload' as const,
      width: 1,
      height: 1,
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZwoAAAAASUVORK5CYII=',
    },
  ],
  tree: {
    src: { kind: 'dir' as const },
    'src/main.ts': {
      kind: 'file' as const,
      content: 'import { speed } from "./config"\nexport const score = speed + 1\n',
    },
    'src/config.ts': { kind: 'file' as const, content: 'export const speed = 4\n' },
    'src/closed.ts': { kind: 'file' as const, content: 'export const wrong: number = "text"\n' },
  },
}
if (new URLSearchParams(location.search).has('performance')) {
  for (let index = 0; index < 75; index++) {
    const path = `src/fixture-${String(index).padStart(3, '0')}.ts`
    Object.assign(project.tree, {
      [path]: {
        kind: 'file',
        content: `export const value${index} = ${index}\n${'// deterministic workspace fixture\n'.repeat(300)}`,
      },
    })
  }
}
if (new URLSearchParams(location.search).has('modular')) {
  // O projeto modular de 60 arquivos que se importam (etapa 3 do plano, Pro em escala).
  const tree: Record<string, { kind: 'dir' } | { kind: 'file'; content: string }> = {}
  for (const [path, content] of Object.entries(modularProjectFiles())) {
    const parts = path.split('/')
    for (let depth = 1; depth < parts.length; depth++)
      tree[parts.slice(0, depth).join('/')] = { kind: 'dir' }
    tree[path] = { kind: 'file', content }
  }
  Object.assign(project, { tree })
}
if (new URLSearchParams(location.search).has('light')) {
  // Execução leve (etapa 3 do plano): um projeto que o navegador monta igual ao Vite. O jogo
  // escreve na tela o que só sai certo com ES modules de verdade: o valor exportado VIVO (o
  // CommonJS do Sucrase deixaria `lerPontos()` em 0), o ciclo entre módulos, o await no topo, o
  // JSON com padrão e nomes, o `.js` que aponta para o `.ts` e a ordem do CSS.
  const files: Record<string, string> = {
    'index.html': [
      '<!doctype html>',
      '<html lang="pt-BR">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>Leve</title>',
      '    <link rel="stylesheet" href="/src/base.css" />',
      '  </head>',
      '  <body>',
      '    <p id="saida">montando</p>',
      '    <script type="module" src="/src/main.ts"></script>',
      '  </body>',
      '</html>',
      '',
    ].join('\n'),
    'src/base.css': '#saida { color: rgb(1, 2, 3); }\n',
    'src/tema.css': '#saida { color: rgb(4, 5, 6); }\n',
    'src/placar.ts': [
      'export let pontos = 0',
      'export function ganhar(): void {',
      '  pontos++',
      '}',
      'export function lerPontos(): number {',
      '  return pontos',
      '}',
      '',
    ].join('\n'),
    'src/ida.ts': [
      "import { volta } from './volta'",
      "export const ida = (): string => 'ida-' + volta()",
      '',
    ].join('\n'),
    'src/volta.ts': [
      "import { ida } from './ida'",
      'export function volta(): string {',
      "  return typeof ida === 'function' ? 'volta' : 'sem'",
      '}',
      '',
    ].join('\n'),
    'src/fases.json': '{ "lista": [1, 2, 3], "primeira": "floresta" }\n',
    'src/main.ts': [
      "import { pontos, ganhar, lerPontos } from './placar.js'",
      "import { ida } from './ida'",
      "import fases, { primeira } from './fases.json'",
      "import './tema.css'",
      ...(new URLSearchParams(location.search).has('bare')
        ? ["import { Scene } from 'three'", 'console.log(Scene)']
        : []),
      'const espera: number = await new Promise<number>((resolve) => setTimeout(() => resolve(7), 0))',
      'ganhar()',
      'ganhar()',
      "const saida = document.getElementById('saida') as HTMLElement",
      'saida.textContent = JSON.stringify({',
      '  pontos,',
      '  lidos: lerPontos(),',
      '  ciclo: ida(),',
      '  espera,',
      '  fases: fases.lista.length,',
      '  primeira,',
      '})',
      'saida.dataset.cor = getComputedStyle(saida).color',
      '',
    ].join('\n'),
  }
  const tree: Record<string, { kind: 'dir' } | { kind: 'file'; content: string }> = {
    src: { kind: 'dir' },
  }
  for (const [path, content] of Object.entries(files)) tree[path] = { kind: 'file', content }
  Object.assign(project, { tree, assets: [] })
}
const ensaio = new URLSearchParams(location.search).has('ensaio')
if (ensaio) {
  // Ensaio com tudo ligado (frente 4, 21/11/2026): os 60 arquivos do projeto modular com um jogo
  // de verdade em canvas, sem materiais, que a execução leve monta no navegador. O laço guarda o
  // horário de cada quadro em `window.__ensaio`, para o teste medir o jogo enquanto o editor, a
  // análise, o Zappy e os arquivos trabalham.
  const files: Record<string, string> = {
    ...modularProjectFiles(),
    'index.html': [
      '<!doctype html>',
      '<html lang="pt-BR">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <title>Ensaio</title>',
      '  </head>',
      '  <body style="margin:0">',
      '    <canvas id="tela" width="480" height="320"></canvas>',
      '    <script type="module" src="/src/jogo.ts"></script>',
      '  </body>',
      '</html>',
      '',
    ].join('\n'),
    'src/jogo.ts': [
      "import { frame, nextScene } from './main'",
      '',
      "const tela = document.getElementById('tela') as HTMLCanvasElement",
      "const contexto = tela.getContext('2d') as CanvasRenderingContext2D",
      'const quadros: number[] = []',
      'let anterior = performance.now()',
      '',
      'function laco(agora: number): void {',
      '  const dt = Math.min(0.1, (agora - anterior) / 1000)',
      '  anterior = agora',
      '  contexto.clearRect(0, 0, tela.width, tela.height)',
      '  frame(contexto, dt)',
      '  quadros.push(agora)',
      '  if (quadros.length > 1200) quadros.shift()',
      '  requestAnimationFrame(laco)',
      '}',
      '',
      '// O teste lê os horários dos quadros (o jogo não depende disto).',
      'Object.assign(window, { __ensaio: { quadros } })',
      'setInterval(nextScene, 2000)',
      'requestAnimationFrame(laco)',
      '',
    ].join('\n'),
  }
  const tree: Record<string, { kind: 'dir' } | { kind: 'file'; content: string }> = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    for (let depth = 1; depth < parts.length; depth++)
      tree[parts.slice(0, depth).join('/')] = { kind: 'dir' }
    tree[path] = { kind: 'file', content }
  }
  Object.assign(project, { tree, assets: [] })
}
if (new URLSearchParams(location.search).has('symbols')) {
  project.tree['src/main.ts'].content = [
    ...Array.from({ length: 350 }, (_, index) => `export const item${index} = ${index};`),
    'export function zzUpdate() { return item349; }',
  ].join('\n')
}
if (new URLSearchParams(location.search).has('lineBreaks')) {
  // Um arquivo trazido de fora com CRLF e LF juntos (o Monaco mostra com uma quebra só).
  project.tree['src/main.ts'].content =
    'import { speed } from "./config"\r\nexport const score = speed + 1\nexport const mixed: number = "text"\r\n'
}
if (new URLSearchParams(location.search).has('references')) {
  project.tree['src/main.ts'].content = [
    'export const score = 1;',
    ...Array.from({ length: 251 }, () => 'console.log(score);'),
  ].join('\n')
}
// Quantas vezes o compilador do "servidor" foi chamado: a execução leve não chama.
let hostedBuilds = 0
const runtime = {
  async build() {
    hostedBuilds++
    document.documentElement.dataset.hostedBuilds = String(hostedBuilds)
    return {
      html: '<!doctype html><html><body><p id="session"></p><script>document.getElementById("session").textContent="Sessão "+Date.now()</script></body></html>',
    }
  },
}
const startupProject = createEmptyProject('startup-hostile-browser', 'Primeira execução')
startupProject.mode = 'bridge'
startupProject.bridgeCodeAhead = true
startupProject.files['script.js'] = [
  'console.log("startup-first-run");',
  'const dados = Array.from({ length: 300000 }, (_, i) => (i * 7919) % 10007);',
  'const fim = Date.now() + 30000;',
  'function gastar() { if (Date.now() < fim) { dados.slice().sort((a, b) => a - b); gastar(); } }',
  'gastar();',
].join('\n')
const tutor: StudioTutorConfig = {
  adapter: {
    builder: {
      availability: async () => ({
        available: false,
        reason: 'Construtor indisponível neste teste.',
      }),
      latest: async () => null,
      create: async () => {
        throw new Error('O teste não autoriza enviar uma construção.')
      },
      cancel: async () => null,
    },
    loadHistory: async () => ({ messages: [], nextCursor: null }),
    ask: async () => {
      // No ensaio, a resposta leva o tempo de um servidor: a criança continua digitando enquanto
      // a pergunta está em voo (o adaptador do Zappy responde de uma vez, sem partes).
      if (ensaio) await new Promise((resolve) => setTimeout(resolve, 1500))
      return {
        response: {
          id: crypto.randomUUID(),
          text: 'Confira o nome no arquivo.',
          scope: 'concept',
          blockReferences: [],
          createdAt: new Date().toISOString(),
        },
      }
    },
    feedback: async () => {},
    deleteHistory: async () => {},
  },
}
function Fixture() {
  const [models, setModels] = useState({ value: '[]', version: 0 })
  const [zipResult, setZipResult] = useState('')
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {new URLSearchParams(location.search).has('zip') && (
        <div>
          {[false, true].map((cancel) => (
            <button
              type="button"
              key={String(cancel)}
              onClick={async () => {
                const { zipProbe } = await import('./zipProbe')
                setZipResult(JSON.stringify(await zipProbe(cancel)))
              }}
            >
              {cancel ? 'Cancelar ZIP de teste' : 'Gerar ZIP de teste'}
            </button>
          ))}
          <output aria-label="Resultado ZIP">{zipResult}</output>
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          const { editor } = await import('monaco-editor/esm/vs/editor/editor.api.js')
          const value = JSON.stringify(
            editor.getModels().map((model) => ({
              id: model.id,
              path: getMonacoModelPath(model),
              language: model.getLanguageId(),
              markers: editor
                .getModelMarkers({ resource: model.uri })
                .map((marker) => marker.message),
              content: model.getValue(),
            })),
          )
          setModels((previous) => ({ value, version: previous.version + 1 }))
        }}
      >
        Inspecionar buffers
      </button>
      <output
        aria-label="Buffers da sessão"
        data-version={models.version}
        style={{ display: 'none' }}
      >
        {models.value}
      </output>
      <div style={{ flex: 1, minHeight: 0 }}>
        <StudioEditor
          initialProject={
            new URLSearchParams(location.search).has('startup') ? startupProject : project
          }
          // `?historico`: o armazenamento local de verdade, que o Histórico do projeto usa (as
          // versões ficam "neste computador"; com `none` não há onde guardar).
          persistence={
            new URLSearchParams(location.search).has('historico')
              ? createLocalPersistenceAdapter()
              : 'none'
          }
          features={{ terminal: false }}
          proRuntime={runtime}
          editingAccess={
            new URLSearchParams(location.search).has('observer') ? 'observer' : 'author'
          }
          tutor={new URLSearchParams(location.search).has('noTutor') ? undefined : tutor}
        />
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
