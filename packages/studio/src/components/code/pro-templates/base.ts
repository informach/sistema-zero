import type { StudioProTemplateId } from '@sistemazero/core/studio/pro-templates'
import type { ProjectTree } from '#core'

// Versões PINADAS (em sincronia com WEB_CONTAINER_PACKAGE_DEPENDENCIES).
const VITE = '8.1.6'
const TYPESCRIPT = '5.9.3'
const PLUGIN_REACT = '6.0.2'
const REACT = '19.2.0'
const THREE = '0.180.0'

const f = (content: string) => ({ kind: 'file', content }) as const
const dir = { kind: 'dir' } as const

function pkg(deps: Record<string, string>, devDeps: Record<string, string>): string {
  return `${JSON.stringify(
    {
      name: 'sz-app',
      private: true,
      type: 'module',
      scripts: { dev: 'vite --host 0.0.0.0 --strictPort false', build: 'vite build' },
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  )}\n`
}

// vite.config: o dev-server DENTRO do container serve isolado (COOP/COEP) e
// aceita host externo (o preview do WebContainer é cross-origin).
const VITE_CONFIG_VANILLA = `import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
`

const VITE_CONFIG_REACT = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
`

const TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      jsx: 'react-jsx',
      lib: ['ESNext', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      types: ['vite/client'],
      noEmit: true,
    },
    include: ['src'],
  },
  null,
  2,
)}\n`

// Miolo compartilhado da cena 3D (JS puro — vale p/ o template TS e o JS).
const THREE_MAIN = `import * as THREE from 'three'
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.z = 4
const renderer = new THREE.WebGLRenderer({ antialias: true })
document.body.appendChild(renderer.domElement)
scene.add(new THREE.AmbientLight(0xffffff, 1.5))
const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x22d3ee }))
scene.add(cube)
const lifetime = new AbortController()
let previous = performance.now(), disposed = false
const resize = () => {
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1))
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / Math.max(1, innerHeight)
  camera.updateProjectionMatrix()
}
const draw = () => {
  const now = performance.now(), dt = Math.min(.05, (now - previous) / 1000)
  previous = now; cube.rotation.x += dt * .5; cube.rotation.y += dt * .5
  renderer.render(scene, camera)
}
const resume = () => { previous = performance.now(); renderer.setAnimationLoop(document.hidden ? null : draw) }
const dispose = () => {
  if (disposed) return
  disposed = true; lifetime.abort(); renderer.setAnimationLoop(null)
  cube.geometry.dispose(); cube.material.dispose(); renderer.dispose(); renderer.domElement.remove()
}
window.addEventListener('resize', resize, { signal: lifetime.signal })
document.addEventListener('visibilitychange', resume, { signal: lifetime.signal })
window.addEventListener('pagehide', event => { if (!event.persisted) dispose() }, { signal: lifetime.signal })
if (import.meta.hot) import.meta.hot.dispose(dispose)
resize(); resume()
`

export const BASE_TREES: Partial<Record<StudioProTemplateId, ProjectTree>> = {
  // JS puro PRIMEIRO: é o mais simples e vira o template PADRÃO do modal.
  'vanilla-js': {
    'package.json': f(pkg({}, { vite: VITE })),
    'vite.config.js': f(VITE_CONFIG_VANILLA),
    'index.html': f(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu app</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <h1 id="app">Olá, Vite + JavaScript!</h1>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
    ),
    src: dir,
    'src/main.js': f(
      `const app = document.getElementById('app')\nif (app) app.textContent = 'Editado em JavaScript ✨'\n`,
    ),
    'src/style.css': f(`body { font-family: system-ui; padding: 2rem; }\n`),
  },
  'vanilla-vite': {
    'package.json': f(pkg({}, { vite: VITE, typescript: TYPESCRIPT })),
    'vite.config.ts': f(VITE_CONFIG_VANILLA),
    'tsconfig.json': f(TSCONFIG),
    'index.html': f(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu app</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <h1 id="app">Olá, Vite + TypeScript!</h1>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    ),
    src: dir,
    'src/main.ts': f(
      `const app = document.getElementById('app')\nif (app) app.textContent = 'Editado em TypeScript ✨'\n`,
    ),
    'src/style.css': f(`body { font-family: system-ui; padding: 2rem; }\n`),
  },
  'react-ts': {
    'package.json': f(
      pkg(
        { react: REACT, 'react-dom': REACT },
        {
          '@vitejs/plugin-react': PLUGIN_REACT,
          vite: VITE,
          typescript: TYPESCRIPT,
          '@types/react': '19.2.15',
          '@types/react-dom': '19.2.3',
        },
      ),
    ),
    'vite.config.ts': f(VITE_CONFIG_REACT),
    'tsconfig.json': f(TSCONFIG),
    'index.html': f(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu app React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    ),
    src: dir,
    'src/main.tsx': f(
      `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport { App } from './App'\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n`,
    ),
    'src/App.tsx': f(
      `import { useState } from 'react'\n\nexport function App() {\n  const [contador, setContador] = useState(0)\n  return (\n    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>\n      <h1>Olá, React + TypeScript!</h1>\n      <button onClick={() => setContador((c) => c + 1)}>Cliquei {contador} vezes</button>\n    </main>\n  )\n}\n`,
    ),
  },
  'three-js': {
    'package.json': f(pkg({ three: THREE }, { vite: VITE })),
    'vite.config.js': f(VITE_CONFIG_VANILLA),
    'index.html': f(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Cena 3D</title>
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
    ),
    src: dir,
    'src/main.js': f(THREE_MAIN),
  },
  'three-ts': {
    'package.json': f(
      pkg({ three: THREE }, { vite: VITE, typescript: TYPESCRIPT, '@types/three': THREE }),
    ),
    'vite.config.ts': f(VITE_CONFIG_VANILLA),
    'tsconfig.json': f(TSCONFIG),
    'index.html': f(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Cena 3D</title>
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    ),
    src: dir,
    'src/main.ts': f(THREE_MAIN),
  },
}
