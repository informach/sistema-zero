import { expect, test } from 'bun:test'
import { createStoredPintaFormatMemory } from '../src/lib/pinta-cloud-persistence'

class QuotaStorage implements Storage {
  readonly rows = new Map<string, string>()
  failWrites = false
  get length(): number {
    return this.rows.size
  }
  key(index: number): string | null {
    return [...this.rows.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.rows.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.rows.set(key, value)
  }
  removeItem(key: string): void {
    if (this.failWrites) throw new Error('SecurityError')
    this.rows.delete(key)
  }
  clear(): void {
    this.rows.clear()
  }
}

function usingStorage(run: (storage: QuotaStorage) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    storage = new QuotaStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  try {
    run(storage)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

test('a memória de formato continua protegendo o registro quando a escrita estoura a cota', () =>
  usingStorage((storage) => {
    storage.failWrites = true
    const memory = createStoredPintaFormatMemory('quota')
    memory.set('mapa', { schema: 4, writtenAt: 10 })
    expect(memory.get('mapa')).toEqual({ schema: 4, writtenAt: 10 })
    memory.set('mapa', { schema: 4, writtenAt: 20, cut: true })
    expect(memory.get('mapa')).toEqual({ schema: 4, writtenAt: 20, cut: true })
  }))

test('um valor antigo legível não substitui a atualização que só coube em memória', () =>
  usingStorage((storage) => {
    storage.rows.set(
      'quota',
      JSON.stringify({ mapa: { schema: 3 }, outro: { schema: 4, writtenAt: 5 } }),
    )
    storage.failWrites = true
    const memory = createStoredPintaFormatMemory('quota')
    memory.set('mapa', { schema: 4, writtenAt: 10 })
    expect(memory.get('mapa')).toEqual({ schema: 4, writtenAt: 10 })
    expect(memory.get('outro')).toEqual({ schema: 4, writtenAt: 5 })
    memory.delete('mapa')
    expect(memory.get('mapa')).toBeUndefined()
  }))

test('falha ao remover não ressuscita uma marca apagada na mesma instância', () =>
  usingStorage((storage) => {
    storage.rows.set('quota', JSON.stringify({ mapa: { schema: 4 } }))
    storage.failWrites = true
    const memory = createStoredPintaFormatMemory('quota')
    memory.delete('mapa')
    expect(memory.get('mapa')).toBeUndefined()
  }))

test('storage saudável continua propagando alterações entre instâncias', () =>
  usingStorage(() => {
    const first = createStoredPintaFormatMemory('perfil'),
      second = createStoredPintaFormatMemory('perfil')
    first.set('mapa', { schema: 4, writtenAt: 10 })
    expect(second.get('mapa')).toEqual({ schema: 4, writtenAt: 10 })
    second.delete('mapa')
    expect(first.get('mapa')).toBeUndefined()
  }))

test('revisão, capacidade e autoria da assinatura sobrevivem à reabertura sem apagar entradas antigas', () =>
  usingStorage((storage) => {
    storage.rows.set('perfil', JSON.stringify({ antigo: { schema: 4, writtenAt: 10 } }))
    const first = createStoredPintaFormatMemory('perfil')
    const entry = {
      schema: 5,
      revision: 3,
      localRevision: 'native-revision-026',
      writtenAt: 20,
      signature: { at: 20, schema: 4, revision: 3, maxSchema: 5, writerId: 'sessao-B' },
    }
    first.set('mapa', entry)
    const reopened = createStoredPintaFormatMemory('perfil')
    expect(reopened.get('mapa')).toEqual(entry)
    expect(reopened.get('antigo')).toEqual({ schema: 4, writtenAt: 10 })
  }))

test('assinatura sem capacidade/autoria ou revisão inválida exige nova conferência', () =>
  usingStorage((storage) => {
    storage.rows.set(
      'perfil',
      JSON.stringify({
        semAutoria: {
          schema: 5,
          revision: 3,
          signature: { at: 20, schema: 4, revision: 3, maxSchema: 5 },
        },
        semCapacidade: {
          schema: 5,
          revision: 3,
          signature: { at: 20, schema: 4, revision: 3, writerId: 'B' },
        },
        revisaoInvalida: { schema: 5, revision: -1 },
      }),
    )
    const memory = createStoredPintaFormatMemory('perfil')
    expect(memory.get('semAutoria')).toBeUndefined()
    expect(memory.get('semCapacidade')).toBeUndefined()
    expect(memory.get('revisaoInvalida')).toBeUndefined()
  }))
