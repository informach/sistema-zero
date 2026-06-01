import { describe, expect, test } from 'bun:test'
import { createPipeline } from '../../src/application/pipeline/pipeline'
import type { Stage } from '../../src/application/pipeline/stage.port'
import { makeContext, recordingLogger } from '../helpers'

const stage = (name: string, run: Stage['run']): Stage => ({ name, run })

describe('pipeline (CoR)', () => {
  test('1ª Response curto-circuita; finalizers rodam', async () => {
    const order: string[] = []
    const p = createPipeline(
      [
        stage('a', () => {
          order.push('a')
          return undefined
        }),
        stage('b', () => {
          order.push('b')
          return new Response('short', { status: 418 })
        }),
        stage('c', () => {
          order.push('c')
          return undefined
        }), // não deve rodar
      ],
      [
        stage('fin', () => {
          order.push('fin')
          return undefined
        }),
      ],
    )
    const res = await p.run(makeContext())
    expect(res.status).toBe(418)
    expect(order).toEqual(['a', 'b', 'fin']) // 'c' pulado, 'fin' sempre roda
  })

  test('exceção num stage NÃO pula os finalizers (vira 500 + log/métricas)', async () => {
    let finalizerRan = false
    const p = createPipeline(
      [
        stage('boom', () => {
          throw new Error('falha inesperada')
        }),
      ],
      [
        stage('fin', (ctx) => {
          finalizerRan = true
          expect(ctx.response?.status).toBe(500)
          return undefined
        }),
      ],
    )
    const res = await p.run(makeContext())
    expect(res.status).toBe(500)
    expect(finalizerRan).toBe(true)
  })

  test('exceção é logada com stack trace (serializeError)', async () => {
    const rec = recordingLogger()
    const p = createPipeline(
      [
        stage('boom', () => {
          throw new Error('falha com stack')
        }),
      ],
      [],
    )
    await p.run(makeContext({ logger: rec.logger }))

    const logged = rec.entries.find((e) => e.message === 'pipeline.stage_failed')
    expect(logged?.level).toBe('error')
    const err = logged?.context?.error as { message: string; stack?: string }
    expect(err.message).toBe('falha com stack')
    expect(err.stack).toContain('falha com stack')
  })
})
