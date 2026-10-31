import {
  CasaDaVisitaAdultaSchema,
  CodigoDaVisitaAdultaSchema,
  ConfirmacaoDaVisitaAdultaSchema,
  ConviteAdultoCriadoSchema,
  EstadoDoConviteAdultoSchema,
  type Plataforma,
  type RespostaDoServico,
} from '@sistemazero/arquipelago-contracts'
import { createStore } from 'zustand/vanilla'
import type { FilaDeSalvamento } from '../sistemas/salvar'
import { falaDaChegada } from '../sistemas/visitas'
import { irParaAFrenteDaCasa } from './chegada-da-visita'
import type { Pedidos } from './contexto'
import type { LojaDoJogo } from './loja'

export const PAINEL_DAS_VISITAS_ADULTAS = 'visitas-adultas'
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criarLojaDasVisitasAdultas>>()
export function lojaDasVisitasAdultas(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  pedidos: Pedidos,
  fila?: FilaDeSalvamento | null,
) {
  let pronta = lojas.get(loja)
  if (!pronta) {
    pronta = criarLojaDasVisitasAdultas(loja, plataforma, () => irParaAFrenteDaCasa(pedidos), fila)
    lojas.set(loja, pronta)
  }
  return pronta
}

export function criarLojaDasVisitasAdultas(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  posicionar: () => void,
  fila?: Pick<FilaDeSalvamento, 'salvarAgora'> | null,
) {
  const estado = createStore(() => ({
    ativo: null as boolean | null,
    codigoGerado: null as string | null,
    ocupado: false,
    recado: null as string | null,
  }))
  let vivo = false,
    geracao = 0,
    operacao = 0
  let codigoEmVisita: string | null = null,
    conferindo = false
  const pedidos = new Set<AbortController>()
  let cancelarObservacao: (() => void) | null = null

  async function chamar(
    caminho: string,
    metodo: 'GET' | 'POST' | 'DELETE',
    corpo?: unknown,
  ): Promise<RespostaDoServico> {
    const c = new AbortController()
    pedidos.add(c)
    const prazo = setTimeout(() => c.abort(), 5_000)
    const abortado = new Promise<never>((_, reject) => {
      c.signal.addEventListener('abort', () => reject(new Error('A visita não respondeu agora.')), {
        once: true,
      })
    })
    try {
      return await Promise.race([
        plataforma.servico.buscar(`/visitas-adultas/${caminho}`, {
          metodo,
          corpo,
          sinal: c.signal,
        }),
        abortado,
      ])
    } finally {
      clearTimeout(prazo)
      pedidos.delete(c)
    }
  }
  async function executar(acao: (atual: () => boolean) => Promise<void>, consentimento = false) {
    if (!vivo || plataforma.publico !== 'adulto' || estado.getState().ocupado) return
    const g = geracao,
      n = ++operacao
    const atual = () => vivo && g === geracao && n === operacao
    estado.setState({
      ocupado: true,
      recado: null,
      ...(consentimento ? { codigoGerado: null } : {}),
    })
    try {
      await acao(atual)
    } catch {
      if (atual())
        estado.setState({
          recado: 'Não foi possível continuar agora. Tente novamente.',
          ...(consentimento ? { ativo: null, codigoGerado: null } : {}),
        })
    } finally {
      if (atual()) estado.setState({ ocupado: false })
    }
  }
  function sair(recado: string) {
    codigoEmVisita = null
    if (loja.getState().visita?.origem !== 'adulto') return
    loja.getState().visitar(null)
    posicionar()
    loja.getState().dizer(recado)
  }
  return {
    estado,
    iniciar() {
      vivo = true
      geracao++
      cancelarObservacao?.()
      cancelarObservacao = loja.subscribe((s) => {
        if (s.visita?.origem !== 'adulto') codigoEmVisita = null
      })
    },
    parar() {
      vivo = false
      geracao++
      operacao++
      for (const p of pedidos) p.abort()
      cancelarObservacao?.()
      cancelarObservacao = null
      codigoEmVisita = null
      conferindo = false
      estado.setState({ ocupado: false, codigoGerado: null })
      if (loja.getState().visita?.origem === 'adulto') {
        loja.getState().visitar(null)
        posicionar()
      }
    },
    carregar() {
      return executar(async (atual) => {
        const r = await chamar('convite', 'GET')
        if (!atual()) return
        const p = EstadoDoConviteAdultoSchema.safeParse(r.corpo)
        if (r.status !== 200 || !p.success) throw new Error('Estado indisponível')
        estado.setState({ ativo: p.data.ativo })
      })
    },
    gerar() {
      return executar(async (atual) => {
        if (loja.getState().acesso.somenteLeitura) {
          estado.setState({ recado: 'Este acesso permite apenas consultar.' })
          return
        }
        await fila?.salvarAgora()
        if (!atual()) return
        const r = await chamar('convite', 'POST', {})
        if (!atual()) return
        const p = ConviteAdultoCriadoSchema.safeParse(r.corpo)
        if (r.status !== 200 || !p.success) throw new Error('Convite indisponível')
        estado.setState({
          ativo: true,
          codigoGerado: p.data.codigo,
          recado: 'Compartilhe este código somente com quem você quer receber.',
        })
      }, true)
    },
    desligar() {
      return executar(async (atual) => {
        const r = await chamar('convite', 'DELETE')
        if (!atual()) return
        const p = EstadoDoConviteAdultoSchema.safeParse(r.corpo)
        if (r.status !== 200 || !p.success || p.data.ativo)
          throw new Error('Revogação não confirmada')
        estado.setState({
          ativo: false,
          codigoGerado: null,
          recado: 'As visitas à sua casa estão desligadas.',
        })
      }, true)
    },
    abrir(codigo: string) {
      return executar(async (atual) => {
        if (!CodigoDaVisitaAdultaSchema.safeParse(codigo).success) {
          estado.setState({ recado: 'Cole o código de 32 caracteres que você recebeu.' })
          return
        }
        if (loja.getState().modo !== 'chao') {
          estado.setState({ recado: 'Volte ao chão antes de visitar outra casa.' })
          return
        }
        const r = await chamar('abrir', 'POST', { codigo })
        if (!atual()) return
        const p = CasaDaVisitaAdultaSchema.safeParse(r.corpo)
        if (r.status !== 200 || !p.success) {
          estado.setState({
            recado: 'Esta visita não está disponível. Confira o código com quem convidou.',
          })
          return
        }
        loja
          .getState()
          .visitar({ origem: 'adulto', perfilId: 'visita-adulta', nome: 'outra pessoa', ...p.data })
        codigoEmVisita = codigo
        loja.getState().abrirPainel(null)
        posicionar()
        loja.getState().dizer(falaDaChegada({ nome: 'outra pessoa', quarto: p.data.quarto }))
      })
    },
    async conferir() {
      const codigo = codigoEmVisita
      if (!vivo || !codigo || conferindo || loja.getState().visita?.origem !== 'adulto') return
      const g = geracao
      conferindo = true
      try {
        const r = await chamar('conferir', 'POST', { codigo })
        if (!vivo || g !== geracao || codigoEmVisita !== codigo) return
        if (r.status !== 200 || !ConfirmacaoDaVisitaAdultaSchema.safeParse(r.corpo).success)
          sair('A visita foi encerrada. Você voltou para a sua casa.')
      } catch {
        if (vivo && g === geracao && codigoEmVisita === codigo)
          sair('A visita não pôde ser confirmada. Você voltou para a sua casa.')
      } finally {
        if (g === geracao) conferindo = false
      }
    },
    ocultarCodigo() {
      operacao++
      for (const p of pedidos) p.abort()
      estado.setState({ codigoGerado: null, ocupado: false })
    },
  }
}
