import {
  escolherPedidoDoMorador,
  type Morador,
  prepararEntregaDoPedido,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { conversar, coracoes, darPresente, ehAniversario } from './moradores'
import {
  CORACOES_DAS_PAGINAS_DO_ANEL,
  MORADORES_COM_NOVA_AMIZADE,
  type MoradorDoAnel,
  VIDA_NO_ANEL,
} from './moradores-do-anel'
import { cestaDoMorador, receitasNovasDoMorador } from './receitas'

export function temAmizadeDoAnel(quem: string): quem is MoradorDoAnel {
  return MORADORES_COM_NOVA_AMIZADE.some((nome) => nome === quem)
}

/** A ação da ilha (ovo, planador) e a amizade pertencem ao mesmo salvamento. */
export function conversarComAtividade(
  s: Salvamento,
  quem: MoradorDoAnel,
  dia: string,
  perfil: string,
  atividade: (
    s: Salvamento,
    dia: string,
    perfil: string,
  ) => { salvamento: Salvamento; falas: string[] },
) {
  const r = atividade(s, dia, perfil)
  return conversarNoAnel(r.salvamento, quem, dia, perfil, r.falas)
}

function comMorador(s: Salvamento, quem: MoradorDoAnel, morador: Morador): Salvamento {
  return s.moradores[quem] === morador
    ? s
    : { ...s, moradores: { ...s.moradores, [quem]: morador } }
}

function falasDasConquistas(quem: MoradorDoAnel, antes: number, depois: number): string[] {
  const pagina = VIDA_NO_ANEL[quem].pagina
  const falas = receitasNovasDoMorador(quem, antes, depois).map(
    (r) =>
      `Vou ensinar ${r.nome.toLowerCase()}. A receita está no seu diário. Meus pedidos dão os ingredientes que não vêm da horta.`,
  )
  if (
    pagina &&
    coracoes(antes) < CORACOES_DAS_PAGINAS_DO_ANEL &&
    coracoes(depois) >= CORACOES_DAS_PAGINAS_DO_ANEL
  )
    falas.push(pagina.entrega)
  return falas
}

export function pedidoDoAnel(s: Salvamento, quem: MoradorDoAnel, dia: string) {
  const p = s.moradores[quem].pedido
  return p?.dia === dia && !p.entregue
    ? (VIDA_NO_ANEL[quem].pedidos.find((pedido) => pedido.id === p.id) ?? null)
    : null
}

/** Acrescenta a relação às falas e recompensas específicas que o morador já tinha. */
export function conversarNoAnel(
  s: Salvamento,
  quem: MoradorDoAnel,
  dia: string,
  perfil: string,
  falasDaAtividade: readonly string[],
) {
  const dados = VIDA_NO_ANEL[quem]
  const antes = s.moradores[quem]
  const id = escolherPedidoDoMorador(quem, perfil, dia, s.bichos.achados.length)
  const comPedido =
    antes.pedido?.dia === dia
      ? antes
      : {
          ...antes,
          pedido: { dia, id, entregue: false },
        }
  const { capi: morador, primeiraDoDia } = conversar(comPedido, dia)
  const salvamento = comMorador(s, quem, morador)
  const falas = [...falasDaAtividade]
  if (primeiraDoDia) {
    if (ehAniversario(dia, dados.aniversario))
      falas.push('Hoje é meu aniversário. Sua visita já alegra o dia.')
    falas.push(dados.amizade[coracoes(morador.amizade)] ?? dados.amizade[0])
  }
  const pedido = pedidoDoAnel(salvamento, quem, dia)
  if (primeiraDoDia && pedido)
    falas.push(`Hoje eu preciso de uma coisa: ${pedido.texto.toLowerCase()}.`)
  falas.push(...falasDasConquistas(quem, antes.amizade, morador.amizade))
  return { salvamento, falas }
}

const RESPOSTAS = {
  adorou: 'Era um dos meus preferidos. Agradeço pelo carinho.',
  agradeceu: 'Agradeço pelo presente. Vou guardar para o lanche.',
  devolveu: 'Guarde isso com você. Prefiro receber uma comida da mochila.',
  'ja-ganhou-hoje': 'Já recebi um presente hoje. Guarde este para outra visita.',
  'sem-item': 'Esse item não está na mochila agora.',
} as const

export function presentearNoAnel(s: Salvamento, quem: MoradorDoAnel, item: string, dia: string) {
  const dados = VIDA_NO_ANEL[quem]
  const r = darPresente(s.moradores[quem], s.inventario, item, dia, dados.gostos, dados.aniversario)
  const ganhou = r.reacao === 'adorou' || r.reacao === 'agradeceu'
  const salvamento = ganhou ? { ...comMorador(s, quem, r.capi), inventario: r.inv } : s
  return {
    salvamento,
    reacao: r.reacao,
    falas: [
      RESPOSTAS[r.reacao],
      ...falasDasConquistas(quem, s.moradores[quem].amizade, r.capi.amizade),
    ],
  }
}

export function entregarNoAnel(s: Salvamento, quem: MoradorDoAnel, dia: string) {
  const pedido = pedidoDoAnel(s, quem, dia)
  if (!pedido) return { salvamento: s, entregou: false, falas: [] as string[] }
  const r = prepararEntregaDoPedido(s, quem, dia)
  if (!r.ok)
    return {
      salvamento: s,
      entregou: false,
      falas:
        r.motivo === 'mochila-cheia' || r.motivo === 'salvamento-cheio'
          ? [
              'Use ou guarde alguns ingredientes da mochila para caber a cesta inteira. Seu pedido continua aqui.',
            ]
          : [],
    }
  const cesta = cestaDoMorador(quem, r.salvamento.moradores[quem].amizade)
  return {
    salvamento: r.salvamento,
    entregou: true,
    falas: [
      'Você trouxe o que faltava. Agradeço pela ajuda.',
      ...(Object.keys(cesta).length > 0 ? ['Leve também os ingredientes da sua receita.'] : []),
      ...falasDasConquistas(quem, s.moradores[quem].amizade, r.salvamento.moradores[quem].amizade),
    ],
  }
}
