import { describe, expect, it } from 'bun:test'
import { bitmapBytes, createHistory } from './history'

describe('createHistory (undo/redo por snapshots com orçamento)', () => {
  it('record → undo → redo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    history.record('v2')
    expect(history.canUndo()).toBe(true)

    expect(history.undo('v3')).toBe('v2')
    expect(history.undo('v2')).toBe('v1')
    expect(history.canUndo()).toBe(false)
    expect(history.undo('v1')).toBeNull()

    expect(history.redo('v1')).toBe('v2')
    expect(history.redo('v2')).toBe('v3')
    expect(history.canRedo()).toBe(false)
  })

  it('gesto novo invalida o redo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    expect(history.undo('v2')).toBe('v1')
    history.record('v1')
    expect(history.canRedo()).toBe(false)
  })

  it('orçamento derruba os passos mais antigos mas mantém pelo menos 1', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 5 })
    history.record('aa')
    history.record('bb')
    history.record('cc') // 6 bytes > 5 → derruba 'aa'
    expect(history.undo('dd')).toBe('cc')
    expect(history.undo('cc')).toBe('bb')
    expect(history.undo('bb')).toBeNull()
  })

  it('um snapshot sozinho maior que o orçamento ainda permite 1 undo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length, byteBudget: 2 })
    history.record('grande-demais')
    expect(history.canUndo()).toBe(true)
    expect(history.undo('atual')).toBe('grande-demais')
  })

  it('clear zera tudo', () => {
    const history = createHistory<string>({ sizeOf: (s) => s.length })
    history.record('v1')
    history.undo('v2')
    history.clear()
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
  })

  it('bitmapBytes aproxima pelo byteLength', () => {
    expect(bitmapBytes({ data: new Uint8Array(100) })).toBe(164)
  })
})

describe('orçamento com total corrente', () => {
  it('`sizeOf` é chamado UMA vez por snapshot gravado (não a pilha inteira a cada gesto) e o orçamento continua o mesmo', () => {
    let calls = 0
    const history = createHistory<string>({
      sizeOf: (s) => {
        calls += 1
        return s.length
      },
      byteBudget: 10,
    })
    history.record('aaaa') // 4
    history.record('bbbb') // 8
    history.record('cccc') // 12 → derruba 'aaaa'
    expect(calls).toBe(3)
    expect(history.undo('atual')).toBe('cccc')
    expect(history.undo('cccc')).toBe('bbbb')
    expect(history.undo('bbbb')).toBeNull()
    // Refazer reinsere o estado corrente na pilha (medido de novo: 1 chamada).
    expect(history.redo('bbbb')).toBe('cccc')
    expect(calls).toBe(4)
    history.clear()
    expect(history.canUndo()).toBe(false)
  })
})

describe('partes divididas entre os passos (as camadas que o gesto não tocou)', () => {
  type Mapa = { camadas: Int16Array[] }
  const historico = (byteBudget: number) =>
    createHistory<Mapa>({
      sizeOf: () => 10,
      sharedOf: (m) => m.camadas.map((key) => ({ key, bytes: key.byteLength })),
      byteBudget,
    })
  const camada = () => new Int16Array(500) // 1000 bytes

  it('um buffer que vários passos seguram conta UMA vez: 16 camadas não custam 16 por pincelada', () => {
    // Cada passo troca UMA das 16 camadas; as outras 15 são o mesmo objeto.
    const base = Array.from({ length: 16 }, camada)
    const history = historico(40_000)
    let atual: Mapa = { camadas: base }
    for (let passo = 0; passo < 20; passo += 1) {
      history.record(atual)
      const camadas = [...atual.camadas]
      camadas[0] = camada()
      atual = { camadas }
    }
    // 15 fixas + 20 versões da primeira = 35 buffers de 1000 bytes: cabem os 20 passos.
    let desfeitos = 0
    while (history.undo(atual) !== null) desfeitos += 1
    expect(desfeitos).toBe(20)
  })

  it('sem dividir nada (cada passo com buffers próprios) o orçamento corta como antes', () => {
    const history = historico(40_000)
    for (let passo = 0; passo < 20; passo += 1)
      history.record({ camadas: Array.from({ length: 16 }, camada) })
    let desfeitos = 0
    while (history.undo({ camadas: [] }) !== null) desfeitos += 1
    expect(desfeitos).toBe(2)
  })

  it('o buffer deixa de contar quando o último passo que o segura sai (por corte ou por desfazer)', () => {
    const fixa = camada()
    const history = historico(3_100)
    history.record({ camadas: [fixa, camada()] })
    history.record({ camadas: [fixa, camada()] })
    // Com o terceiro são 4 buffers únicos (4000) > 3100: o primeiro passo cai e leva o buffer
    // que só ele segurava; ficam 3 buffers e 2 passos.
    history.record({ camadas: [fixa, camada()] })
    let desfeitos = 0
    while (history.undo({ camadas: [] }) !== null) desfeitos += 1
    expect(desfeitos).toBe(2)
    // Vazio de novo: o que entra agora não herda bytes de quem saiu.
    history.record({ camadas: [fixa, camada()] })
    history.record({ camadas: [fixa] })
    desfeitos = 0
    while (history.undo({ camadas: [] }) !== null) desfeitos += 1
    expect(desfeitos).toBe(2)
  })

  it('o mesmo buffer repetido dentro de um snapshot conta uma vez, e `clear` zera a conta', () => {
    const b = camada()
    const history = historico(1_500)
    history.record({ camadas: [b, b, b] })
    history.record({ camadas: [b] })
    expect(history.undo({ camadas: [] })).not.toBeNull()
    expect(history.undo({ camadas: [] })).not.toBeNull()
    history.record({ camadas: [b] })
    history.clear()
    expect(history.canUndo()).toBe(false)
    history.record({ camadas: [camada()] })
    history.record({ camadas: [camada()] })
    // 2000 > 1500: só um passo fica. Se `clear` deixasse resto, não ficaria nem a conta certa.
    expect(history.undo({ camadas: [] })).not.toBeNull()
    expect(history.undo({ camadas: [] })).toBeNull()
  })
})
