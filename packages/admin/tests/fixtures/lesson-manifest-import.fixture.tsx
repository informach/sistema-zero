import { expect, mock, test } from 'bun:test'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const calls: Array<{ url: string; body: Record<string, unknown> }> = []
mock.module('@/lib/api', () => ({
  apiSend: async (url: string, _method: string, body: Record<string, unknown>) => {
    calls.push({ url, body })
    if (url.endsWith('/import-preview'))
      return {
        title: 'A nave ganha vida',
        fingerprint: '11111111-1111-1111-1111-111111111111',
        warnings: ['A versão publicada permanece disponível.'],
        sections: [
          {
            id: 'nova',
            title: 'Nova abertura',
            objective: 'Começar a aula.',
            intent: 'presentation',
            blockIds: [],
            workspaceBlockId: null,
            externalTool: null,
            pendingMedia: [],
            completion: { version: 1, blockIds: [] },
          },
        ],
        blocks: [
          { id: 'mantido', action: 'preserve' },
          { id: 'removido', label: 'Quiz · Fechamento antigo', action: 'remove' },
          {
            id: 'video-antigo',
            label: 'Vídeo vinculado (Vimeo 1232673566) · Avise quem está jogando',
            action: 'remove',
          },
        ],
        removedSections: [{ id: 'antiga', title: 'Fechamento antigo' }],
      }
    return { ok: true, sections: [], blocks: [], revision: crypto.randomUUID() }
  },
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonManifestImport } = await import('../../src/components/editor/lesson-manifest-import')

test('confirma todas as remoções antes de substituir o rascunho', async () => {
  calls.length = 0
  const source = await Bun.file(
    resolve(
      import.meta.dir,
      '../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-dia-1.manifesto.json',
    ),
  ).text()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let imported = 0
  const button = (label: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    )
  const inputInLabel = (label: string) =>
    [...container.querySelectorAll<HTMLLabelElement>('label')]
      .find((candidate) => candidate.textContent?.includes(label))
      ?.querySelector<HTMLInputElement>('input')

  try {
    await act(async () =>
      root.render(
        <LessonManifestImport
          lessonId="lesson"
          lessonSlug="dia-1"
          courseSlug="nave-contra-asteroides"
          disabled={false}
          beforeImport={async () => {}}
          onImported={async () => {
            imported++
          }}
        />,
      ),
    )
    expect(container.textContent).toContain('O projeto inicial do Estúdio vem sempre do manifesto')
    const textarea = container.querySelector('textarea')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(textarea, source)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      inputInLabel('Substituir o rascunho inteiro')?.click()
    })
    await act(async () => button('Conferir importação')?.click())

    expect(calls[0]?.body.mode).toBe('replace')
    expect(container.textContent).toContain('Fechamento antigo')
    expect(container.textContent).toContain('Quiz · Fechamento antigo')
    expect(button('Substituir rascunho')?.disabled).toBe(true)

    await act(async () => inputInLabel('Entendo que os blocos criados aqui no Admin')?.click())
    expect(button('Substituir rascunho')?.disabled).toBe(false)
    await act(async () => button('Substituir rascunho')?.click())

    expect(calls[1]?.body).toMatchObject({
      mode: 'replace',
      expectedFingerprint: '11111111-1111-1111-1111-111111111111',
    })
    expect(typeof calls[1]?.body.operationId).toBe('string')
    expect(imported).toBe(1)
    expect(container.textContent).toContain('Rascunho substituído pelo manifesto')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('atualizar pelo manifesto é o padrão e aplica sem confirmação extra, mostrando o que sai', async () => {
  calls.length = 0
  const source = await Bun.file(
    resolve(
      import.meta.dir,
      '../../../../docs/aulas-interativas/aulas/nave-contra-asteroides-dia-1.manifesto.json',
    ),
  ).text()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const button = (label: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    )
  try {
    await act(async () =>
      root.render(
        <LessonManifestImport
          lessonId="lesson"
          lessonSlug="dia-1"
          courseSlug="nave-contra-asteroides"
          disabled={false}
          beforeImport={async () => {}}
          onImported={async () => {}}
        />,
      ),
    )
    const textarea = container.querySelector('textarea')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(textarea, source)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('Conferir importação')?.click())

    expect(calls[0]?.body.mode).toBe('preserve')
    expect(container.textContent).toContain('Blocos que sairão do rascunho')
    expect(container.textContent).toContain('Vídeo vinculado (Vimeo 1232673566)')
    expect(container.textContent).toContain('2 saem do rascunho')
    expect(button('Aplicar ao rascunho desta aula')?.disabled).toBe(false)
    await act(async () => button('Aplicar ao rascunho desta aula')?.click())
    expect(calls[1]?.body.mode).toBe('preserve')
    expect(container.textContent).toContain('Rascunho atualizado pelo manifesto')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
