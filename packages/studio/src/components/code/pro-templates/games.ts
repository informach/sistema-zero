import {
  type StudioProTemplateMetadata,
  studioProTemplate,
} from '@sistemazero/core/studio/pro-templates'
import type { ProjectTree } from '#core'
import { PRO_ASSET_MANIFEST } from '../../../core/proAssetPaths'
import { GAMEDEV_NOTICES } from './games/licenses'
import { SHARED_SOURCES } from './games/shared'

/** Only the selected engine's examples are fetched; no engine is imported by the editor. */
export async function createGameTree(template: StudioProTemplateMetadata): Promise<ProjectTree> {
  const canonical = studioProTemplate(template.id)
  if (!canonical?.kitVersion || canonical.engine !== template.engine) {
    throw new Error(`Kit ou motor profissional incompatível: ${template.id}`)
  }
  if (template.id === 'canvas-survival') {
    return (await import('./games/canvas-survival')).createCanvasSurvivalTemplate().tree
  }
  if (
    ![
      'canvas-puzzle',
      'phaser-arcade',
      'phaser-platformer',
      'three-exploration',
      'three-action',
      'canvas-grid-arena',
      'phaser-tactics',
      'three-tactics',
    ].includes(template.id)
  ) {
    throw new Error(`Kit profissional desconhecido: ${template.id}`)
  }
  const grid = ['canvas-grid-arena', 'phaser-tactics', 'three-tactics'].includes(template.id)
  const configPath = grid
    ? template.id === 'canvas-grid-arena'
      ? 'src/arena-config.ts'
      : 'src/tactics-config.ts'
    : 'src/config.ts'
  const game = grid
    ? (await import('./games/grid')).gridSources(template.id)
    : template.engine === 'canvas'
      ? (await import('./games/canvas')).canvasSources()
      : template.engine === 'phaser'
        ? (await import('./games/phaser')).phaserSources(template.id)
        : (await import('./games/three')).threeSources(template.id)
  const dependencies: Record<string, string> =
    template.engine === 'phaser'
      ? { phaser: '3.90.0' }
      : template.engine === 'three'
        ? { three: '0.180.0' }
        : {}
  const devDependencies: Record<string, string> = { vite: '8.1.6', typescript: '5.9.3' }
  if (template.engine === 'three') devDependencies['@types/three'] = '0.180.0'
  const sources: Record<string, string> = {
    'THIRD_PARTY_NOTICES.md': GAMEDEV_NOTICES,
    ...SHARED_SOURCES,
    ...game,
    'package.json': JSON.stringify(
      {
        name: template.id,
        private: true,
        type: 'module',
        scripts: { dev: 'vite --host 0.0.0.0', build: 'vite build', typecheck: 'tsc --noEmit' },
        dependencies,
        devDependencies,
      },
      null,
      2,
    ),
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ['vite/client'],
        },
        include: ['src'],
      },
      null,
      2,
    ),
    'vite.config.ts':
      "import { defineConfig } from 'vite'\nexport default defineConfig({ base: './', server: { host: '0.0.0.0', headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } } })\n",
    'index.html':
      '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meu jogo</title></head><body><main id="app"></main><script type="module" src="/src/main.ts"></script></body></html>',
    'studio-kit.json': JSON.stringify(
      {
        id: template.id,
        version: template.kitVersion,
        engine: template.engine,
        entry: 'src/main.ts',
        config: configPath,
        controller: { module: 'src/game.ts', factory: 'createGame', contract: 'src/contracts.ts' },
        controls: ['keyboard', 'touch', 'gamepad'],
        performance: {
          maxDpr: 1.5,
          maxFrameDeltaSeconds: 0.05,
          targetFps: 60,
          ...(template.id.endsWith('-tactics') ? { drawing: 'on-change' } : {}),
        },
        qualityProfiles: ['standard', 'reduced'],
        assets: PRO_ASSET_MANIFEST,
      },
      null,
      2,
    ),
    'README.md':
      '# ' +
      template.name +
      '\n\n' +
      template.description +
      `\n\n## Personalize\n\n- ${configPath}: regras, velocidade, cores e objetivos.\n- src/game.ts: comportamento do jogo.\n- src/ui.ts e src/input.ts: menus acessíveis e ações de teclado/toque/controle.\n- Materiais do Pinta e Molda aparecem em ${PRO_ASSET_MANIFEST}. Use os caminhos indicados no painel Materiais; evite URLs externas.\n- Peça ao Zappy uma mudança de cada vez e teste antes de continuar. Pensa ajuda a organizar a missão.\n\n## Executar\n\n${grid ? 'npm ci' : 'npm install'}\nnpm run dev\n\n## Conferir\n\nnpm run typecheck\nnpm run build\n\nTeste começar, pausar, reiniciar, vencer/perder, redimensionar e voltar de outra aba. Os controles de toque também funcionam por teclado. Som inicia desligado e só é ativado por um gesto. Recordes e vitórias ficam neste aparelho, separados por projeto e perfil no Estúdio; não são um save da partida em andamento nem sincronização entre dispositivos. O recorde só é mostrado como atualizado após confirmação da gravação.\n\n## Procedência\n\nImplementação adaptada para o Estúdio a partir dos padrões estudados na pasta GameDev (tabuleiro puro, estados, ondas, câmera, pooling e descarte). As imagens, modelos e sons dos repositórios não foram redistribuídos. Visuais são formas procedurais e som sintetizado. Consulte CREDITS.md.\n`,
    'CREDITS.md':
      'Código dos kits: Sistema Zero.\n\nReferências de arquitetura: everything-game-dev-code (Tetris2DMutation, PirateInvaders; MIT), phaserjs-oakwoods (MIT), PocketBomber (mecânicas de grade), TinySwords (camadas visuais), Threejs Tactics (referências públicas de turnos), kits Three.js da pasta GameDev. Adaptação independente das mecânicas, sem cópia dos assets. Dependências npm mantêm suas licenças: Phaser (MIT), Three.js (MIT), Vite (MIT), TypeScript (Apache-2.0).\n',
  }
  const tree: ProjectTree = {}
  for (const [path, content] of Object.entries(sources)) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) tree[parts.slice(0, i).join('/')] = { kind: 'dir' }
    tree[path] = { kind: 'file', content }
  }
  return tree
}
