import { describe, expect, it } from 'bun:test'
import { OpenRouterError } from '../../ai/providers/openRouterProvider'
import { describeAIError, shouldStickToBottom } from './AIPanel'

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

// Mapeamento de erro do provider → mensagem calma em PT-BR. Mapeia por
// status/name, NUNCA por texto cru — testamos justamente que o JSON do upstream
// não vaza para a criança e que cada caso tem um próximo passo amigável.
describe('describeAIError', () => {
  it('401 → chave inválida + oferece abrir as configurações', () => {
    const r = describeAIError(new OpenRouterError('OpenRouter erro 401: Unauthorized', 401))
    expect(r.text).toMatch(/chave de IA parece inválida/)
    expect(r.text).toMatch(/Configurar IA/)
    expect(r.offerSettings).toBe(true)
    // Não vaza o texto cru do upstream.
    expect(r.text).not.toMatch(/Unauthorized/)
  })

  it('403 → mesmo tratamento de chave inválida', () => {
    const r = describeAIError(new OpenRouterError('forbidden', 403))
    expect(r.text).toMatch(/chave de IA parece inválida/)
    expect(r.offerSettings).toBe(true)
  })

  it('429 → muitas perguntas seguidas, sem oferecer configurações', () => {
    const r = describeAIError(new OpenRouterError('rate limited', 429))
    expect(r.text).toMatch(/Muitas perguntas seguidas/)
    expect(r.offerSettings).toBe(false)
  })

  it('TimeoutError → pede para tentar de novo', () => {
    const err = new Error('OpenRouter sem resposta após 30000ms')
    err.name = 'TimeoutError'
    const r = describeAIError(err)
    expect(r.text).toMatch(/demorou demais/)
    expect(r.offerSettings).toBe(false)
  })

  it('erro genérico (500) → fallback amigável, sem vazar JSON', () => {
    const r = describeAIError(new OpenRouterError('OpenRouter erro 500: {"error":"boom"}', 500))
    expect(r.text).toMatch(/Não consegui falar com a IA agora/)
    expect(r.offerSettings).toBe(false)
    expect(r.text).not.toMatch(/boom/)
  })

  it('erro desconhecido (string) → fallback genérico', () => {
    const r = describeAIError('explodiu')
    expect(r.text).toMatch(/Não consegui falar com a IA agora/)
    expect(r.offerSettings).toBe(false)
  })
})
