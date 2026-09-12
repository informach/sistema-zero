import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { SectionCompletionSchema } from '../../src/interfaces/http/learning.dtos'

const app = new Elysia().post('/criteria', ({ body }) => body, { body: SectionCompletionSchema })
const request = (rule: unknown) =>
  app.handle(
    new Request('http://localhost/criteria', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        blockIds: [],
        projectChecks: [{ id: 'rule', label: 'Objetivo', rule }],
      }),
    }),
  )
test('HTTP preserves exact count, order and nested named connections', async () => {
  const rule = {
    type: 'usesBlock',
    blockType: 'sz_g2d_every_seconds',
    count: 1,
    beforeBlock: 'sz_g2d_every_seconds',
    inputBlocks: {
      BODY: {
        blockType: 'sz_js_if_else',
        inputBlocks: {
          THEN: {
            blockType: 'sz_js_if_else',
            inputBlocks: {
              COND: {
                blockType: 'sz_val_compare',
                fields: { OP: '>' },
                inputBlocks: {
                  LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'velocidade' } },
                },
              },
            },
          },
        },
      },
    },
  }
  const response = await request(rule)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    version: 1,
    blockIds: [],
    projectChecks: [{ id: 'rule', label: 'Objetivo', rule }],
  })
})
test('HTTP rejects negative and fractional counts', async () => {
  for (const count of [-1, 0.5])
    expect((await request({ type: 'usesBlock', blockType: 'sz_g2d_on_key', count })).status).toBe(
      422,
    )
  expect((await request({ type: 'usesBlock', blockType: 'sz_g2d_on_key', count: 0 })).status).toBe(
    200,
  )
})
