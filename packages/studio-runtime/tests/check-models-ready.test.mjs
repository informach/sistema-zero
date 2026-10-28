import { expect, spyOn, test } from 'bun:test'
import { observeSteadyFrames, waitForModels } from '../runtime/check-models-ready.mjs'

test('modelos ainda pendentes no prazo não autorizam os passos do objetivo', async () => {
  let now = 0
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  try {
    await expect(
      waitForModels(
        {
          waitForTimeout: async () => {
            now += 5000
          },
        },
        { main: async (fn) => (fn.toString().includes('SZGame3D') ? true : 1) },
      ),
    ).rejects.toThrow()
  } finally {
    clock.mockRestore()
  }
})

test('falha de observação não é tratada como zero modelos pendentes', async () => {
  await expect(
    waitForModels(
      {},
      {
        main: async () => {
          throw new Error('probe desconectado')
        },
      },
    ),
  ).rejects.toThrow('probe desconectado')
})

test('quadros continuamente lentos encerram com indisponibilidade', async () => {
  let now = 0
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  const frames = async () => {
    now += 5000
    return 700
  }
  try {
    await expect(
      waitForModels(
        {},
        {
          main: async (fn, ms) => (ms ? frames() : fn.toString().includes('SZGame3D') ? true : 0),
          isolated: frames,
        },
      ),
    ).rejects.toThrow()
  } finally {
    clock.mockRestore()
  }
})

test('jogo 2D não espera nem inspeciona modelos 3D', async () => {
  let reads = 0
  await waitForModels(
    {},
    {
      main: async () => {
        reads++
        return false
      },
    },
  )
  expect(reads).toBe(1)
})

test('só libera após carregar, observar quadros estáveis e reconferir pendências', async () => {
  let remaining = 2
  let frames = 0
  let reads = 0
  await waitForModels(
    {
      waitForTimeout: async () => {
        remaining--
      },
    },
    {
      main: async (fn) => {
        if (fn.toString().includes('SZGame3D')) return true
        reads++
        return remaining
      },
      isolated: async () => {
        frames++
        return 110
      },
    },
  )
  expect(frames).toBe(1)
  expect(reads).toBe(4)
})

test('primeiro quadro atrasado não conta como janela estável', async () => {
  const previous = globalThis.requestAnimationFrame
  const now = performance.now()
  globalThis.requestAnimationFrame = (callback) => {
    queueMicrotask(() => callback(now + 5000))
    return 1
  }
  try {
    expect(await observeSteadyFrames(2000)).toBe(Infinity)
  } finally {
    globalThis.requestAnimationFrame = previous
  }
})

test('uma leitura que nunca responde fica limitada pelo relógio do executor', async () => {
  await expect(waitForModels({}, { main: () => new Promise(() => {}) })).rejects.toThrow(
    'não ficou pronto no prazo',
  )
}, 20_000)
