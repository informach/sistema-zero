import { describe, expect, test } from 'bun:test'
import { createLatestWins } from '../src/lib/latest-wins'

// Substitui o teste de componente da fila de entregas (zz-entregas-client),
// que exigia `mock.module` de módulos compartilhados e envenenava o registry
// global do bun:test entre arquivos no Linux do CI (21/08). A REGRA protegida
// é a mesma: uma resposta antiga nunca sobrescreve a mais recente.
describe('latest-wins — a leitura mais nova vence', () => {
  test('o padrão real: duas buscas sobrepostas, a resposta atrasada não publica', async () => {
    const authority = createLatestWins()
    let publicado = ''
    async function carregar(resposta: Promise<string>) {
      const generation = authority.begin()
      const valor = await resposta
      if (!authority.isCurrent(generation)) return
      publicado = valor
    }
    const lenta = Promise.withResolvers<string>()
    const rapida = Promise.withResolvers<string>()
    const antiga = carregar(lenta.promise)
    const nova = carregar(rapida.promise)
    rapida.resolve('resposta nova')
    await nova
    expect(publicado).toBe('resposta nova')
    // A busca ANTIGA termina por último — sem o guard, ela sobrescreveria.
    lenta.resolve('resposta antiga')
    await antiga
    expect(publicado).toBe('resposta nova')
  })

  test('cada begin invalida tudo que estava em voo', () => {
    const authority = createLatestWins()
    const primeira = authority.begin()
    expect(authority.isCurrent(primeira)).toBe(true)
    const segunda = authority.begin()
    expect(authority.isCurrent(primeira)).toBe(false)
    expect(authority.isCurrent(segunda)).toBe(true)
  })

  test('invalidate descarta o que está em voo sem começar leitura nova', () => {
    const authority = createLatestWins()
    const emVoo = authority.begin()
    authority.invalidate()
    expect(authority.isCurrent(emVoo)).toBe(false)
  })

  test('geração antiga nunca volta a valer', () => {
    const authority = createLatestWins()
    const primeira = authority.begin()
    authority.begin()
    const terceira = authority.begin()
    expect(authority.isCurrent(primeira)).toBe(false)
    expect(terceira).toBeGreaterThan(primeira)
  })
})
