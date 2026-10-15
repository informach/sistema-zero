import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { FileSystemTree } from '@webcontainer/api'
import { StrictMode, useEffect } from 'react'
import { buildProProject, type Project } from '#core'
import { useProjectStore } from '../../state/projectStore'

const client = { ...(await import('../../components/terminal/webContainerClient')) }
let resets = 0
let mounts = 0
let releaseMount: (() => void) | null = null
const gate = () =>
  new Promise<void>((resolve) => {
    releaseMount = resolve
  })
let mountGate: Promise<void> | null = null
const root = await mkdtemp(join(tmpdir(), 'studio-mount-lifecycle-'))
async function mountFiles(tree: FileSystemTree, parent = root) {
  for (const [name, node] of Object.entries(tree)) {
    if ('directory' in node) {
      await mkdir(join(parent, name), { recursive: true })
      await mountFiles(node.directory, join(parent, name))
    } else if ('file' in node && 'contents' in node.file)
      await writeFile(join(parent, name), node.file.contents)
  }
}
const container = {
  workdir: '/home/project',
  async mount(tree: FileSystemTree) {
    mounts++
    await mountGate
    await mountFiles(tree)
  },
  fs: {
    watch: () => ({ close() {} }),
    readdir: (path: string, options?: { withFileTypes: true }) =>
      options ? readdir(join(root, path), options) : readdir(join(root, path)),
    readFile: (path: string, encoding?: 'utf-8') =>
      encoding ? readFile(join(root, path), encoding) : readFile(join(root, path)),
    writeFile: (path: string, content: string | Uint8Array) => writeFile(join(root, path), content),
    mkdir: (path: string, options: { recursive: true }) => mkdir(join(root, path), options),
    rm: (path: string, options: { force: true; recursive?: boolean }) =>
      rm(join(root, path), options),
  },
}
mock.module('../../components/terminal/webContainerClient', () => ({
  ...client,
  getWebContainer: async () => container,
  resetWebContainerFs: async () => {
    resets++
    for (const entry of await readdir(root))
      await rm(join(root, entry), { recursive: true, force: true })
  },
}))
const { useWebContainerSync } = await import('./useWebContainerSync')
afterAll(async () => {
  mock.module('../../components/terminal/webContainerClient', () => client)
  await rm(root, { recursive: true, force: true })
})
afterEach(async () => {
  releaseMount?.()
  cleanup()
  await act(async () => {
    await Promise.resolve()
  })
  const owner = client.currentFsOwner()
  if (owner) client.releaseFsOwnership(owner)
  client.setProFsMounted(null)
  client.registerProMountTrigger(null)
  useProjectStore.setState({ project: null })
  mounts = 0
  resets = 0
  mountGate = null
  releaseMount = null
})

function Probe({ project }: { project: Project }) {
  const sync = useWebContainerSync({
    id: project.id,
    name: project.name,
    kind: 'pro',
    tree: project.tree,
    files: null,
    extraFiles: [],
  })
  useEffect(() => {
    void sync.ensureMounted()
  }, [sync.ensureMounted])
  return (
    <button type="button" onClick={() => void sync.ensureMounted()}>
      {sync.state}
    </button>
  )
}
const project = (id: string) =>
  buildProProject(
    id,
    id,
    { 'main.ts': { kind: 'file', content: 'const x = 1' } },
    'dev',
    'vanilla-vite',
  )

describe('posse e cancelamento do filesystem Pro', () => {
  it('StrictMode repete os efeitos sem duplicar a montagem nem perder a posse', async () => {
    const source = project('strict')
    useProjectStore.setState({ project: source })
    const view = render(
      <StrictMode>
        <Probe project={source} />
      </StrictMode>,
    )
    await view.findByRole('button', { name: 'mounted' })
    expect(mounts).toBe(1)
    expect(resets).toBe(1)
    expect(client.currentFsOwner()).not.toBeNull()
  })
  it('não libera o container enquanto a montagem da instância desmontada ainda escreve', async () => {
    const source = project('one')
    useProjectStore.setState({ project: source })
    mountGate = gate()
    const first = render(<Probe project={source} />)
    await waitFor(() => expect(mounts).toBe(1))
    const owner = client.currentFsOwner()
    first.unmount()
    expect(client.currentFsOwner()).toBe(owner)
    const second = render(<Probe project={source} />)
    await second.findByRole('button', { name: 'busy' })
    expect(resets).toBe(1)
    await act(async () => {
      releaseMount?.()
      await mountGate
    })
    await waitFor(() => expect(client.currentFsOwner()).toBeNull())
    fireEvent.click(second.getByRole('button', { name: 'busy' }))
    await second.findByRole('button', { name: 'mounted' })
    expect(mounts).toBe(2)
  })
  it('troca de projeto aguarda a montagem antiga antes de limpar e montar o novo', async () => {
    const first = project('one')
    const next = project('two')
    useProjectStore.setState({ project: first })
    mountGate = gate()
    const view = render(<Probe project={first} />)
    await waitFor(() => expect(mounts).toBe(1))
    useProjectStore.setState({ project: next })
    view.rerender(<Probe project={next} />)
    expect(resets).toBe(1)
    await act(async () => {
      releaseMount?.()
      await mountGate
    })
    await view.findByRole('button', { name: 'mounted' })
    expect(resets).toBe(2)
    expect(client.getProFsMountedProjectId()).toBe('two')
  })
})
