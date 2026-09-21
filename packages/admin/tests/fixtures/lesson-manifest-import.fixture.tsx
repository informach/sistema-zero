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
      '../../../../docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json',
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
          courseSlug="desafio-primeiro-jogo"
          disabled={false}
          beforeImport={async () => {}}
          onImported={async () => {
            imported++
          }}
        />,
      ),
    )
    const textarea = container.querySelector('textarea')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(textarea, source)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      inputInLabel('Substituir o rascunho pelo manifesto')?.click()
    })
    await act(async () => button('Conferir importação')?.click())

    expect(calls[0]?.body.mode).toBe('replace')
    expect(container.textContent).toContain('Fechamento antigo')
    expect(container.textContent).toContain('Quiz · Fechamento antigo')
    expect(button('Substituir rascunho')?.disabled).toBe(true)

    await act(async () => inputInLabel('Entendo que tudo que não está no manifesto')?.click())
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
