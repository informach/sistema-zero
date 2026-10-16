import {
  type AssetLibraryPage,
  projectSchema,
  UPLOAD_PART_BYTES,
} from '@sistemazero/marketing-contracts'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'
import { MediaLibrary } from '../src/media-library'
import type { WorkbenchPort } from '../src/port'

declare global {
  interface Window {
    mediaLibraryProof?: { ok: boolean; message: string; statusCalls: number }
  }
}
const project = projectSchema.parse({
  id: crypto.randomUUID(),
  name: 'Revisão da biblioteca',
  product: 'Teste',
  createdBy: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  sequence: 1,
  permissions: ['read', 'edit'],
})
function entry(index: number, state: AssetLibraryPage['items'][number]['state'] = 'confirmed') {
  return {
    manifest: {
      schemaVersion: 1 as const,
      id: crypto.randomUUID(),
      projectId: project.id,
      name: `arquivo-${index}.txt`,
      size: 100,
      sha256: 'a'.repeat(64),
      mime: 'text/plain' as const,
      role: 'original' as const,
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    },
    state,
    error: null,
  }
}
const first = Array.from({ length: 50 }, (_, index) => entry(index))
const second = entry(50, 'verifying'),
  uploaded = entry(51, 'verifying')
let statusCalls = 0
let chosen = false
const noop = async () => {}
const port: WorkbenchPort = {
  location: 'desktop',
  identity: 'browser-proof',
  userId: project.createdBy,
  projects: async () => [project],
  createProject: async () => project,
  save: noop,
  saveBatch: noop,
  resolveDrafts: noop,
  synchronize: noop,
  openDesktop: noop,
  subscribe: () => () => {},
  assetUrl: async () => {
    throw new Error('No media requested')
  },
  view: async () => ({
    items: [],
    pending: [],
    pendingBatches: [],
    report: { phase: 'idle', message: '', pending: 0, confirmedAt: null },
    transfers: chosen
      ? [
          {
            input: { operationId: crypto.randomUUID(), manifest: uploaded.manifest },
            state: 'verifying',
            error: null,
            uploadedBytes: uploaded.manifest.size,
          },
        ]
      : [],
  }),
  chooseMedia: async () => {
    chosen = true
    return {
      ...uploaded,
      bytesReceived: true,
      parts: [],
      partBytes: UPLOAD_PART_BYTES,
    }
  },
  request: async (path, method, body) => {
    if (path.endsWith('/status')) {
      if (method !== 'POST') throw new Error('Unexpected method')
      const { ids } = z.object({ ids: z.array(z.string()) }).parse(body)
      statusCalls++
      if (statusCalls === 1) throw new Error('Conexão de teste interrompida')
      return {
        projectId: project.id,
        items: [second, uploaded]
          .filter((item) => ids.includes(item.manifest.id))
          .map((item) => ({ ...item, state: 'confirmed' })),
      }
    }
    return path.includes('?after=')
      ? { items: [second], nextCursor: null }
      : { items: first, nextCursor: first.at(-1)?.manifest.id }
  },
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
async function wait(check: () => boolean, label: string) {
  const deadline = performance.now() + 16000
  while (!check()) {
    assert(performance.now() < deadline, `Tempo excedido: ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
function click(text: string) {
  const button = [...document.querySelectorAll('button')].find((item) => item.textContent === text)
  assert(button && !button.disabled, `Botão indisponível: ${text}`)
  button.click()
}
async function run() {
  const container = document.getElementById('root')
  assert(container, 'Root ausente')
  const root = createRoot(container, {
    onUncaughtError: (error) => {
      window.mediaLibraryProof = { ok: false, message: String(error), statusCalls }
    },
  })
  root.render(<MediaLibrary port={port} project={project} onClose={() => {}} onChanged={noop} />)
  await wait(() => document.querySelectorAll('li').length === 50, 'primeira página')
  click('Carregar mais arquivos')
  await wait(() => document.querySelectorAll('li').length === 51, 'segunda página')
  await wait(
    () => !document.querySelector<HTMLButtonElement>('button')?.disabled,
    'conclusão da leitura',
  )
  click('Adicionar arquivo do computador')
  await wait(
    () => document.body.textContent?.includes('Aguardando a conferência') ?? false,
    'upload recebido',
  )
  assert(
    document.querySelectorAll('li').length === 52,
    'O upload descartou páginas ou não exibiu o novo arquivo',
  )
  await wait(
    () => document.body.textContent?.includes('Conexão de teste interrompida') ?? false,
    'falha de rede',
  )
  assert(
    document.querySelectorAll('li').length === 52,
    'A falha de rede apagou arquivos carregados',
  )
  await wait(
    () => document.body.textContent?.includes('Arquivo confirmado') ?? false,
    'recuperação automática',
  )
  assert(
    document.querySelectorAll('li').length === 52,
    'A conferência descartou páginas carregadas',
  )
  assert(
    !document.body.textContent?.includes('Conexão de teste interrompida'),
    'Erro de leitura não foi recuperado',
  )
  assert(
    !document.body.textContent?.includes('Conferindo no servidor'),
    'Estado pendente não foi atualizado',
  )
  click('Atualizar')
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await wait(
    () =>
      ![...document.querySelectorAll('button')].find((button) => button.textContent === 'Atualizar')
        ?.disabled,
    'atualização explícita',
  )
  assert(
    !document.body.textContent?.includes('Conferindo no servidor'),
    'Cache local atrasado substituiu confirmação do servidor',
  )
  window.mediaLibraryProof = {
    ok: true,
    message:
      '52 arquivos preservados; upload fora da primeira página confirmado após falha de rede',
    statusCalls,
  }
}
void run().catch((error) => {
  window.mediaLibraryProof = { ok: false, message: String(error), statusCalls }
})
