import { afterEach, describe, expect, test } from 'bun:test'
import type { TeacherThreadView } from '@sistemazero/member-shell/lib/types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RecadoThreadClient } from '../src/app/(app)/recados/[threadId]/recado-thread-client'
import { desinstalarMicrofone, falar, instalarMicrofone, parar } from './helpers/fake-microphone'

/**
 * Responder nos Recados falando (14/10/2026): o botão só aparece com a fala ligada pelos pais, e
 * a resposta que veio da fala chega à equipe marcada (o chip "falado" do Admin).
 */

const THREAD = '55555555-5555-4555-8555-555555555555'
const VIEWER = '11111111-1111-4111-8111-111111111111'

const conversa: TeacherThreadView = {
  id: THREAD,
  userId: VIEWER,
  accountId: null,
  audience: 'kids',
  contextType: 'section_help',
  contextRef: null,
  courseId: null,
  lessonId: null,
  title: 'O Farol',
  lastMessageAt: '2026-10-14T12:00:00.000Z',
  createdAt: '2026-10-14T12:00:00.000Z',
  messages: [
    {
      id: 'm1',
      threadId: THREAD,
      authorRole: 'teacher',
      authorName: 'Helena',
      body: 'O que você tentou?',
      createdAt: '2026-10-14T12:00:00.000Z',
    },
  ],
  nextCursor: null,
} as unknown as TeacherThreadView

afterEach(desinstalarMicrofone)

function servidor(enviadas: Array<Record<string, unknown>>) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/messages') && init?.method === 'POST') {
      enviadas.push(JSON.parse(String(init.body)))
      return Response.json(conversa)
    }
    if (url.endsWith('/read')) return Response.json({ ok: true })
    return Response.json(conversa)
  }
}

describe('Recados: responder falando', () => {
  test('sem a fala ligada, só a caixa de escrever', async () => {
    instalarMicrofone(servidor([]))
    render(<RecadoThreadClient threadId={THREAD} viewerId={VIEWER} />)
    const caixa = await screen.findByLabelText('Resposta para a equipe')
    expect(caixa.getAttribute('placeholder')).toBe('Escreva uma resposta…')
    expect(screen.queryByRole('button', { name: 'Falar em vez de escrever' })).toBeNull()
  })

  test('com a fala ligada, a resposta falada chega marcada como falada', async () => {
    const enviadas: Array<Record<string, unknown>> = []
    instalarMicrofone(servidor(enviadas))
    render(<RecadoThreadClient threadId={THREAD} viewerId={VIEWER} voiceEnabled />)
    const caixa = (await screen.findByLabelText('Resposta para a equipe')) as HTMLTextAreaElement
    expect(caixa.getAttribute('placeholder')).toBe('Escreva ou fale uma resposta…')
    await falar(2)
    await parar()
    expect(caixa.value).toBe('meu personagem não pula')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))
    await waitFor(() => expect(enviadas).toHaveLength(1))
    expect(enviadas[0]).toEqual({ body: 'meu personagem não pula', spoken: true })
  })
})
