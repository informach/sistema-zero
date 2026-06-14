import { describe, expect, it } from 'bun:test'
import { shouldStickToBottom } from './AIPanel'

// happy-dom não faz layout (scrollHeight/clientHeight = 0), então testamos a
// heurística pura de "grudar no rodapé" com geometrias sintéticas em vez de
// renderizar o painel inteiro (que dependeria de probes da store + provider).
describe('shouldStickToBottom', () => {
  it('gruda quando já está exatamente no fim', () => {
    expect(shouldStickToBottom({ scrollHeight: 1000, scrollTop: 800, clientHeight: 200 })).toBe(
      true,
    )
  })

  it('gruda quando está dentro da folga de 48px do fim', () => {
    // distância = 1000 - 760 - 200 = 40 <= 48
    expect(shouldStickToBottom({ scrollHeight: 1000, scrollTop: 760, clientHeight: 200 })).toBe(
      true,
    )
  })

  it('NÃO gruda quando o aluno rolou para cima além da folga', () => {
    // distância = 1000 - 200 - 200 = 600 > 48 → lendo histórico, não puxa
    expect(shouldStickToBottom({ scrollHeight: 1000, scrollTop: 200, clientHeight: 200 })).toBe(
      false,
    )
  })

  it('gruda no estado inicial sem scroll (tudo zero)', () => {
    // Painel recém-montado / conteúdo curto: distância 0 → gruda.
    expect(shouldStickToBottom({ scrollHeight: 0, scrollTop: 0, clientHeight: 0 })).toBe(true)
  })
})
