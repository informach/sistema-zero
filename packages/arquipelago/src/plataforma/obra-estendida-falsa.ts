import {
  GravarObraEstendidaSchema,
  type LeituraDaObraEstendida,
  LeituraDaObraEstendidaSchema,
  type RespostaDoServico,
} from '@sistemazero/arquipelago-contracts'

export const CHAVE_DA_OBRA_ESTENDIDA_FALSA = 'arquipelago-playground:obra-estendida'

/**
 * A obra estendida do playground: a mesma troca por revisão do serviço (`GET` e `PUT
 * /obra-estendida`), em memória e, se der, no localStorage. Suporte não grava.
 */
export function criarObraEstendidaFalsa(deps: {
  somenteLeitura(): boolean
  persistencia?: { ler(): string | null; gravar(dado: string): void }
}) {
  let guardada: LeituraDaObraEstendida = { revisao: 0, obra: null }
  try {
    const bruto = deps.persistencia?.ler()
    const lida = bruto ? LeituraDaObraEstendidaSchema.safeParse(JSON.parse(bruto)) : null
    if (lida?.success) guardada = lida.data
  } catch {}
  return {
    buscar(caminho: string, metodo: string, corpo?: unknown): RespostaDoServico | null {
      if (caminho !== '/obra-estendida') return null
      if (metodo === 'GET') return { status: 200, corpo: structuredClone(guardada) }
      if (metodo !== 'PUT') return { status: 404, corpo: { error: { code: 'NOT_FOUND' } } }
      if (deps.somenteLeitura())
        return { status: 403, corpo: { error: { code: 'SOMENTE_LEITURA' } } }
      const pedido = GravarObraEstendidaSchema.safeParse(corpo)
      if (!pedido.success) return { status: 400, corpo: { error: { code: 'VALIDATION_ERROR' } } }
      if (pedido.data.revisaoBase !== guardada.revisao)
        return {
          status: 409,
          corpo: {
            error: {
              code: 'OBRA_ESTENDIDA_DESATUALIZADA',
              message: 'A obra mudou em outro aparelho',
            },
            atual: structuredClone(guardada),
          },
        }
      guardada = { revisao: guardada.revisao + 1, obra: structuredClone(pedido.data.obra) }
      deps.persistencia?.gravar(JSON.stringify(guardada))
      return { status: 200, corpo: structuredClone(guardada) }
    },
  }
}
