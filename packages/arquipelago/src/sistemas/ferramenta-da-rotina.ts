import {
  type CartaoDaRotina,
  cartasDaRotina,
  conferirResultadoDaRotina,
  contarCartoes,
  type LumiId,
  limparRotina,
  type MoldeDaRotina,
  type Plataforma,
  RascunhoInicialDaRotinaSchema,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { cartasNaMao, guardarRotina, mundoDaRotina } from './rotina'

/** Abertura e retorno sobre o estado atual, nunca sobre uma cópia antiga do salvamento. */
export async function editarRotinaNaPlataforma(opcoes: {
  plataforma: Plataforma
  lumi: LumiId
  rascunho: readonly CartaoDaRotina[]
  ler(): Salvamento
  ativo(): boolean
  guardar(s: Salvamento): void
}): Promise<{ rotina?: CartaoDaRotina[]; motivo?: string }> {
  const { plataforma, lumi } = opcoes
  const inicial = opcoes.ler()
  const anterior = JSON.stringify(inicial.rotinas[lumi] ?? null)
  const lerCartas = () =>
    plataforma.servico.buscar('/cartas', { sinal: AbortSignal.timeout(15_000) })
  // Como o Guardar e o Testar: a Escolha com um caso vazio vale (`limparRotina` tira o vazio).
  const rascunho = RascunhoInicialDaRotinaSchema.safeParse(limparRotina(opcoes.rascunho))
  if (!rascunho.success)
    return {
      motivo:
        'Complete a sequência de cartões antes de abrir em blocos. Seu rascunho continua aqui.',
    }
  try {
    const cartas = await cartasDaRotina(lerCartas)
    if (!opcoes.ativo()) return {}
    const molde: MoldeDaRotina = {
      versao: 1,
      abertura: crypto.randomUUID(),
      lumi,
      rotina: rascunho.data,
      outrosCartoes: Object.entries(inicial.rotinas).reduce(
        (n, [id, r]) => n + (id !== lumi && r ? contarCartoes(r) : 0),
        0,
      ),
      cartas,
      mundo: structuredClone(mundoDaRotina(inicial)),
      agora: new Date().toISOString(),
    }
    const resposta = await plataforma.abrirFerramenta({
      ferramenta: 'rotina-lumi',
      proposito: 'rotina',
      molde,
    })
    if (!opcoes.ativo() || resposta.situacao === 'cancelado') return {}
    if (resposta.situacao !== 'rotina-pronta')
      return { motivo: 'O mini estúdio não abriu agora. Você pode continuar com os cartões aqui.' }
    const atuais = await cartasDaRotina(lerCartas)
    if (!opcoes.ativo()) return {}
    const lido = conferirResultadoDaRotina({ ...molde, cartas: atuais }, resposta.resultado)
    if ('motivo' in lido) return lido
    const atual = opcoes.ler()
    if (JSON.stringify(atual.rotinas[lumi] ?? null) !== anterior)
      return {
        motivo:
          'Esta rotina mudou enquanto você montava. Abra novamente para continuar da versão guardada.',
      }
    const r = guardarRotina(atual, lumi, lido.resultado.rotina, cartasNaMao(atuais))
    if ('motivo' in r) return r
    opcoes.guardar(r.salvamento)
    return { rotina: lido.resultado.rotina }
  } catch {
    return { motivo: 'Não deu para abrir ou conferir os blocos agora. Seu rascunho continua aqui.' }
  }
}
