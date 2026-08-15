import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import { CelebrationWatcher } from '../src/components/kids/celebration-watcher'
import type { DrawerSnapshot } from '../src/lib/tools-gain'

const PERFIL = 'perfil-1'
const levelKey = `sz:kids:level:${PERFIL}`
const toolsKey = `sz:kids:tools:${PERFIL}`
const REV_1 = 'revision-1'
const REV_2 = 'revision-2'

/** A gaveta é identificada pelo caminho INTEIRO da paleta, nunca pela folha. */
function gaveta(label: string, blockIds: string[], family = 'Jogo 2D'): DrawerSnapshot {
  return { key: `${family} › ${label}`, family, label, blockIds }
}

const sprites: DrawerSnapshot[] = [gaveta('🎮 Sprites', ['sprite:draw', 'sprite:move'])]
const spritesMaisColisoes: DrawerSnapshot[] = [
  ...sprites,
  gaveta('💥 Colisões', ['collision:touch']),
]

const restores: Array<() => void> = []

function stored(revision: string, blockIds: string[]): string {
  return JSON.stringify({ version: 2, revision, blockIds: [...blockIds].sort() })
}

function respondWith(drawers: DrawerSnapshot[], status = 200) {
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ drawers }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
  restores.push(() => fetchSpy.mockRestore())
  return fetchSpy
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  while (restores.length > 0) restores.pop()?.()
})

describe('CelebrationWatcher', () => {
  it('primeira carga busca uma vez, registra e NÃO comemora retroativamente', async () => {
    const fetchSpy = respondWith(sprites)
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_1}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )

    await waitFor(() =>
      expect(localStorage.getItem(toolsKey)).toBe(stored(REV_1, sprites[0]!.blockIds)),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(levelKey)).toBe('coder')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('revisão igual não busca payload nem comemora', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    const fetchSpy = respondWith(sprites)
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_1}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('revisão nova + ids novos → festa da gaveta', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    respondWith(spritesMaisColisoes)
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_2}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    expect((await screen.findByRole('dialog')).getAttribute('aria-label')).toBe(
      'Você ganhou 💥 Colisões!',
    )
  })

  it('subiu de nível E ganhou gaveta → um overlay do nível com o ganho dentro', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    respondWith(spritesMaisColisoes)
    render(
      <CelebrationWatcher
        levelSlug="hacker"
        toolsRevision={REV_2}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    const dialog = await screen.findByRole('dialog')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog.getAttribute('aria-label')).toContain('Inventor')
    expect(screen.getByText(/E tem mais/)).toBeDefined()
    expect(screen.getByText(/💥 Colisões/)).toBeDefined()
  })

  it('falha de rede das ferramentas não engole a comemoração de nível', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    restores.push(() => fetchSpy.mockRestore())
    render(
      <CelebrationWatcher
        levelSlug="hacker"
        toolsRevision={REV_2}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    expect((await screen.findByRole('dialog')).getAttribute('aria-label')).toContain('Inventor')
  })

  it('falha ao salvar ferramentas não engole o nível já detectado', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    respondWith(spritesMaisColisoes)
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const storageSpy = spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).startsWith('sz:kids:tools:')) throw new Error('quota exceeded')
      originalSetItem(key, value)
    })
    restores.push(() => storageSpy.mockRestore())

    render(
      <CelebrationWatcher
        levelSlug="hacker"
        toolsRevision={REV_2}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    expect((await screen.findByRole('dialog')).getAttribute('aria-label')).toContain('Inventor')
  })

  it('acesso desconhecido não busca nem toca no snapshot anterior', async () => {
    localStorage.setItem(levelKey, 'coder')
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    const fetchSpy = respondWith([])
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_2}
        ownsStudio={null}
        profileKey={PERFIL}
      />,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(toolsKey)).toBe(stored(REV_1, sprites[0]!.blockIds))
  })

  it('sem produto não busca nem apaga uma posse anterior', async () => {
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    const fetchSpy = respondWith([])
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_2}
        ownsStudio={false}
        profileKey={PERFIL}
      />,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(toolsKey)).toBe(stored(REV_1, sprites[0]!.blockIds))
  })

  it('revisão desconhecida não toca no snapshot', async () => {
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    const fetchSpy = respondWith([])
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={null}
        ownsStudio={true}
        profileKey={PERFIL}
      />,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(toolsKey)).toBe(stored(REV_1, sprites[0]!.blockIds))
  })

  it('irmãos no mesmo navegador têm snapshots independentes', async () => {
    localStorage.setItem(toolsKey, stored(REV_1, sprites[0]!.blockIds))
    respondWith(sprites)
    render(
      <CelebrationWatcher
        levelSlug="coder"
        toolsRevision={REV_1}
        ownsStudio={true}
        profileKey="perfil-2"
      />,
    )
    await waitFor(() =>
      expect(localStorage.getItem('sz:kids:tools:perfil-2')).toBe(
        stored(REV_1, sprites[0]!.blockIds),
      ),
    )
    expect(localStorage.getItem(toolsKey)).toBe(stored(REV_1, sprites[0]!.blockIds))
  })
})
