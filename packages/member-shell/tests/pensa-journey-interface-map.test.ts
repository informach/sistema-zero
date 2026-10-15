import { describe, expect, test } from 'bun:test'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import {
  extensionInstallStep,
  GAME_RUNTIME_EXTENSION_IDS,
  installStepsByMission,
  STUDIO_AREA_NAMES,
  STUDIO_EXTENSION_NAMES,
  STUDIO_INTERFACE_MAP,
} from '../src/server/pensa-journey/interface-map'

/**
 * O mapa da interface que vai ao modelo só cita rótulos REAIS (A3, full review de 14/10/2026).
 * Lido pelo caminho, como os outros testes de conformidade: mudou o rótulo numa ferramenta, este
 * teste reprova antes de o guia mandar a criança procurar um botão que não existe.
 */
const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text()
const studioPt = await read('../../studio/src/core/i18n/pt-BR.ts')
const preview = await read('../../studio/src/components/preview/PreviewIframe.tsx')
const pintaCopy = await read('../../pinta/src/core/copy.ts')

const ptLabel = (key: string) => {
  const match = new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*'([^']+)'`).exec(studioPt)
  if (!match?.[1]) throw new Error(`rótulo ${key} sumiu do pt-BR do Estúdio`)
  return match[1]
}

describe('o mapa da interface do Pensa casa com as ferramentas', () => {
  test('os rótulos do Estúdio que o mapa cita existem no pt-BR', () => {
    for (const key of [
      'topbar.more',
      'topbar.extensions',
      'extensions.install',
      'extensions.installed',
      'assets.tab.images',
      'assets.tab.models3d',
      'pintaImport.button',
      'moldaImport.button',
      'topbar.showPreview',
    ]) {
      const label = ptLabel(key)
      const install = extensionInstallStep('game-2d')
      const cited =
        STUDIO_INTERFACE_MAP.includes(label) ||
        install.text.includes(label) ||
        install.hint.includes(label)
      expect({ key, label, cited }).toEqual({ key, label, cited: true })
    }
  })

  test('os botões da pré-visualização e o foguete do Pinta são os de verdade', () => {
    for (const label of ['▶ Reproduzir', '⏹ Parar', '⟳ Atualizar']) {
      expect(preview).toContain(`'${label}'`)
      expect(STUDIO_INTERFACE_MAP).toContain(label)
    }
    expect(pintaCopy).toContain("sendToStudio: 'Usar no Estúdio'")
    expect(STUDIO_INTERFACE_MAP).toContain('"Usar no Estúdio"')
  })

  test('o nome de cada extensão é o do manifesto (o cartão da janela de extensões)', async () => {
    for (const [id, name] of Object.entries(STUDIO_EXTENSION_NAMES)) {
      const manifest = await read(`../../studio/src/official-extensions/${id}/manifest.ts`)
      expect(manifest).toContain(`id: '${id}'`)
      expect(manifest).toContain(`name: '${name}'`)
    }
  })

  test('cada extensão é instalada na primeira missão do Estúdio que a usa, e só nela', () => {
    const steps = installStepsByMission([
      { key: 'arte', destination: 'pinta', extensionIds: ['game-2d'] },
      { key: 'a', destination: 'studio', extensionIds: ['game-2d'] },
      { key: 'b', destination: 'studio', extensionIds: ['game-2d'] },
      { key: 'c', destination: 'studio', extensionIds: [] },
    ])
    expect([...steps.keys()]).toEqual(['a'])
    expect(steps.get('a')?.map((s) => s.id)).toEqual(['install-game-2d'])
    expect(steps.get('a')?.[0]?.text).toBe(
      'Clique no botão ⋯ (Mais opções), no alto do Estúdio, escolha "Extensões" e, no cartão Jogo 2D, aperte "Instalar".',
    )
  })

  test('extensão de JOGO entra uma vez só no plano (o Estúdio recusa a segunda)', () => {
    const steps = installStepsByMission([
      { key: 'a', destination: 'studio', extensionIds: ['game-2d'] },
      { key: 'b', destination: 'studio', extensionIds: ['game-2d', 'game-2d-advanced'] },
    ])
    expect([...steps.keys()]).toEqual(['a'])
  })

  test('as extensões de jogo são as donas do palco no Estúdio (espelho lido pelo caminho)', async () => {
    const source = await read('../../studio/src/official-extensions/fullscreenConflicts.ts')
    const list = /FULLSCREEN_RUNTIME_EXTENSION_IDS = \[([^\]]+)\]/.exec(source)?.[1] ?? ''
    const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(ids.length).toBeGreaterThan(0)
    expect([...GAME_RUNTIME_EXTENSION_IDS].sort()).toEqual([...ids].sort() as string[])
  })

  test('os nomes das áreas são os rótulos dos blocos de área da paleta', () => {
    const frames = SERVER_BLOCK_CATALOG.filter((b) => b.type.startsWith('sz_frame_'))
    expect(frames.length).toBeGreaterThan(0)
    for (const [area, name] of Object.entries(STUDIO_AREA_NAMES)) {
      const frame = frames.find((b) => b.area === area)
      expect({ area, label: frame?.label }).toEqual({ area, label: name })
      expect(frame?.palettePath.join(' › ')).toBe('🗂️ Áreas do projeto')
      expect(STUDIO_INTERFACE_MAP).toContain(name)
    }
    expect(STUDIO_INTERFACE_MAP).toContain('"🗂️ Áreas do projeto"')
  })
})
