import { describe, expect, it } from 'bun:test'
import { MicroCache } from '../../src/infrastructure/cache/micro-cache'

describe('MicroCache', () => {
  it('hit dentro do TTL; expira depois', async () => {
    const cache = new MicroCache<string>(20)
    cache.set('a', 'valor')
    expect(cache.get('a')).toBe('valor')
    await Bun.sleep(30)
    expect(cache.get('a')).toBeUndefined()
  })

  it('cacheia null (negative cache) distinguindo de miss', () => {
    const cache = new MicroCache<string | null>(1000)
    expect(cache.get('404')).toBeUndefined() // miss
    cache.set('404', null)
    expect(cache.get('404')).toBeNull() // cached miss — não volta ao banco
  })

  it('ttl 0 desliga (get sempre miss, set no-op)', () => {
    const cache = new MicroCache<string>(0)
    cache.set('a', 'valor')
    expect(cache.get('a')).toBeUndefined()
  })

  it('eviction FIFO respeita o teto de entradas', () => {
    const cache = new MicroCache<number>(60_000, 2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3) // evicta 'a' (mais antigo)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('re-set da mesma chave atualiza o valor sem evictar terceiros', () => {
    const cache = new MicroCache<number>(60_000, 2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10) // re-insere 'a' (vai para o fim da fila), sem estourar o teto
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBe(2)
    cache.set('c', 3) // agora 'b' é o mais antigo
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(10)
    expect(cache.get('c')).toBe(3)
  })
})
