import {
  type Fantasma,
  FantasmaSchema,
  GuardarFantasmaSchema,
  PERCURSOS,
  type RespostaDoServico,
  type SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'

export const CHAVE_DOS_FANTASMAS_FALSOS = 'arquipelago-fantasmas-playground'

/** O playground conserva as recusas do serviço, sem banco remoto e sem prêmio por trajeto. */
export function criarFantasmasFalsos(deps: {
  salvo(): SalvamentoGuardado
  somenteLeitura(): boolean
  familia(caminho: string, metodo: string): RespostaDoServico | null
  exemplo?: Fantasma
  persistencia?: { ler(): string | null; gravar(dado: string): void }
}) {
  const meus = new Map<string, Fantasma>()
  const bruto = deps.persistencia?.ler()
  if (bruto)
    for (const f of FantasmaSchema.array().max(PERCURSOS.length).parse(JSON.parse(bruto)))
      meus.set(f.percurso, f)
  return {
    buscar(caminho: string, metodo: string, corpo?: unknown): RespostaDoServico | null {
      if (caminho === '/fantasmas' && metodo === 'PUT') {
        if (deps.somenteLeitura())
          return { status: 403, corpo: { error: { code: 'SOMENTE_LEITURA' } } }
        const p = GuardarFantasmaSchema.safeParse(corpo)
        if (!p.success) return { status: 400, corpo: { error: { code: 'VALIDATION_ERROR' } } }
        const salvo = deps.salvo(),
          f = p.data.fantasma
        if (
          salvo.revisao !== p.data.revisaoBase ||
          salvo.salvamento?.percursos[f.percurso]?.melhorTempoMs !== f.tempoMs
        )
          return { status: 409, corpo: { error: { code: 'RECORDE_DO_FANTASMA_MUDOU' } } }
        meus.set(f.percurso, structuredClone(f))
        deps.persistencia?.gravar(JSON.stringify([...meus.values()]))
        return { status: 200, corpo: { versao: 1, situacao: 'disponivel', fantasma: f } }
      }
      const partes = caminho.split('/')
      const irmao = partes.length === 5 && partes[1] === 'irmaos' && partes[3] === 'fantasmas'
      if (!(partes.length === 3 && partes[1] === 'fantasmas') && !irmao) return null
      const id = PERCURSOS.find((p) => p === partes.at(-1))
      if (metodo !== 'GET' || !id)
        return { status: 400, corpo: { error: { code: 'VALIDATION_ERROR' } } }
      if (irmao) {
        const permissao = deps.familia(`/irmaos/${partes[2]}/casa`, 'GET')
        if (permissao?.status !== 200) return permissao ?? { status: 404, corpo: null }
        // A Ana é a única massa com trajeto. Os outros recordes continuam honestamente ausentes.
        const f =
          partes[2] === 'aaaaaaaa-0000-4000-8000-00000000000a' && deps.exemplo?.percurso === id
            ? deps.exemplo
            : null
        return {
          status: 200,
          corpo: f
            ? { versao: 1, situacao: 'disponivel', fantasma: f }
            : { versao: 1, situacao: 'ausente' },
        }
      }
      const f = meus.get(id),
        tempo = deps.salvo().salvamento?.percursos[id]?.melhorTempoMs
      return {
        status: 200,
        corpo:
          f && f.tempoMs === tempo
            ? { versao: 1, situacao: 'disponivel', fantasma: f }
            : { versao: 1, situacao: 'ausente' },
      }
    },
  }
}
