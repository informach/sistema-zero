import { buildProProject, type Project, type ProjectTree } from '#core'

/**
 * Catálogo ESTÁTICO de templates do MODO PROFISSIONAL. Cada template é uma
 * `ProjectTree` literal (montada no FS do WebContainer) + metadados. Sem rede:
 * os literais já contêm `package.json` com deps PINADAS e `vite.config`.
 */
export interface ProTemplate {
  id: string
  name: string
  description: string
  /** Script npm de dev (vai para `proMeta.devScript`). */
  devScript: string
  tree: ProjectTree
}

// Versões PINADAS (em sincronia com WEB_CONTAINER_PACKAGE_DEPENDENCIES).
const VITE = '8.0.14'
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
    },
    include: ['src'],
  },
  null,
  2,
)}\n`

export const PRO_TEMPLATES: Record<string, ProTemplate> = {
  'vanilla-vite': {
    id: 'vanilla-vite',
    name: 'Vanilla + Vite + TypeScript',
    description: 'Projeto web moderno com Vite e TypeScript, sem framework.',
    devScript: 'dev',
    tree: {
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
  },
  'react-ts': {
    id: 'react-ts',
    name: 'React + TypeScript',
    description: 'App React com Vite e TypeScript (JSX, componentes).',
    devScript: 'dev',
    tree: {
      'package.json': f(
        pkg(
          { react: REACT, 'react-dom': REACT },
          { '@vitejs/plugin-react': PLUGIN_REACT, vite: VITE, typescript: TYPESCRIPT },
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
  },
  'three-ts': {
    id: 'three-ts',
    name: 'Three.js + TypeScript',
    description: 'Cena 3D com Three.js, Vite e TypeScript (npm real).',
    devScript: 'dev',
    tree: {
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
      'src/main.ts': f(
        `import * as THREE from 'three'\n\nconst scene = new THREE.Scene()\nconst camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)\ncamera.position.z = 4\nconst renderer = new THREE.WebGLRenderer({ antialias: true })\nrenderer.setSize(innerWidth, innerHeight)\ndocument.body.appendChild(renderer.domElement)\nscene.add(new THREE.AmbientLight(0xffffff, 0.7))\nconst cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x22d3ee }))\nscene.add(cube)\nrenderer.setAnimationLoop(() => {\n  cube.rotation.x += 0.01\n  cube.rotation.y += 0.01\n  renderer.render(scene, camera)\n})\n`,
      ),
    },
  },
}

export function listProTemplates(): ProTemplate[] {
  return Object.values(PRO_TEMPLATES)
}

export function getProTemplate(id: string): ProTemplate | undefined {
  return PRO_TEMPLATES[id]
}

/** Cria um `Project` profissional a partir de um template do catálogo. */
export function createProProject(id: string, name: string, templateId: string): Project {
  const template = getProTemplate(templateId)
  if (!template) throw new Error(`Template profissional desconhecido: ${templateId}`)
  // Clona a árvore do template (cópia rasa por nó é suficiente — nós são imutáveis).
  const tree = Object.fromEntries(
    Object.entries(template.tree).map(([path, node]) => [path, { ...node }]),
  )
  return buildProProject(id, name, tree, template.devScript, template.id)
}
