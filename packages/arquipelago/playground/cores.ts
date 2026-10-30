import { ILHAS, type Plataforma } from '@sistemazero/arquipelago-contracts'
import { pinturaDaIlha } from '../src/mundo/pintura-da-ilha'
import { coresDoCatalogo } from '../src/sistemas/cores-conquistadas'
import { lerDesafios } from '../src/sistemas/quadro-das-cores'

/** Só playground: falhas de leitura, histórico arquivado e inspeção dos uniforms reais. */
export function configurarCoresDoPlayground(plataforma: Plataforma, modo: string) {
  const buscar = plataforma.servico.buscar
  plataforma.servico.buscar = async (caminho, opcoes) => {
    if (!caminho.startsWith('/desafios')) return buscar(caminho, opcoes)
    if (modo === 'fora-do-ar') return { status: 503, corpo: {} }
    if (modo === 'desligado' && caminho !== '/desafios/cores')
      return { status: 403, corpo: { error: { code: 'DESAFIOS_DESLIGADOS' } } }
    if (modo === 'antigo' && caminho === '/desafios/cores') return { status: 404, corpo: {} }
    if (modo === 'sem-conquistas' && (caminho === '/desafios' || caminho === '/desafios/cores')) {
      const r = await buscar('/desafios', opcoes)
      const dados = lerDesafios(r.corpo)
      if (!dados) return r
      // Retira somente a conquista inicial do exemplo. Concluir o quadro 1 continua valendo.
      dados.desafios = dados.desafios.map((d) =>
        d.quadro === 3 ? { ...d, situacao: 'disponivel', recompensaVista: false } : d,
      )
      if (caminho === '/desafios/cores')
        return { status: 200, corpo: coresDoCatalogo(dados.desafios) }
      for (const ilha of dados.ilhas)
        ilha.quadro.feitos = dados.desafios.filter(
          (d) => d.ilha === ilha.id && d.tipo === 'quadro-das-cores' && d.situacao === 'concluido',
        ).length
      return { status: 200, corpo: dados }
    }
    const r = await buscar(caminho, opcoes)
    if (modo === 'arquivadas' && caminho === '/desafios') {
      const dados = lerDesafios(r.corpo)
      if (dados) return { status: 200, corpo: { ...dados, desafios: [], doDia: null } }
    }
    return r
  }
  Object.assign(window, {
    __arquipelagoCores: () =>
      ILHAS.filter((i) => i.angulo !== null).map((ilha) => {
        const u = pinturaDaIlha(ilha).uniforms
        return {
          ilha: ilha.id,
          quadros: [...u.uArqPedacos.value],
          chegada: u.uArqChegada.value,
          base: u.uArqBase.value,
        }
      }),
  })
}
