import {
  type Fantasma,
  type IrmaoParaOJogo,
  IrmaosParaOJogoSchema,
  LeituraDoFantasmaSchema,
  type PercursoId,
  type Plataforma,
  SalvamentoGuardadoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createStore } from 'zustand/vanilla'
import { type ArmazemDosFantasmas, criarArmazemDosFantasmas } from '../sistemas/armazem-fantasmas'
import { mesmosDados } from '../sistemas/conciliar-salvamento'
import { criarGravadorDeFantasma } from '../sistemas/fantasma'
import type { FilaDeSalvamento } from '../sistemas/salvar'
import type { LojaDoJogo } from './loja'

interface Referencia {
  perfilId: string
  nome: string
  fantasma: Fantasma
}
interface Estado {
  referencia: Referencia | null
  carregando: boolean
  recado: string | null
  envio: 'nenhum' | 'pendente' | 'enviando' | 'guardado' | 'indisponivel'
}
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criarLojaDosFantasmas>>()
export function lojaDosFantasmas(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  fila?: FilaDeSalvamento | null,
) {
  let feita = lojas.get(loja)
  if (!feita) {
    feita = criarLojaDosFantasmas(loja, plataforma, fila)
    lojas.set(loja, feita)
  }
  return feita
}

export function criarLojaDosFantasmas(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  fila?: Pick<FilaDeSalvamento, 'salvarAgora'> | null,
  abrir: () => Promise<ArmazemDosFantasmas> = () =>
    criarArmazemDosFantasmas(`${plataforma.publico}:${plataforma.perfil.id}`),
) {
  const estado = createStore<Estado>(() => ({
    referencia: null,
    carregando: false,
    recado: null,
    envio: 'nenhum',
  }))
  const gravador = criarGravadorDeFantasma()
  let capturando: PercursoId | null = null
  let ativo = false,
    geracao = 0,
    escolha = 0
  let armazem: Promise<ArmazemDosFantasmas> | null = null
  let envio: Promise<void> | null = null
  let upload: AbortController | null = null,
    leitura: AbortController | null = null
  const arquivo = () => {
    if (armazem) return armazem
    const pedido = abrir()
    armazem = pedido
    void pedido.catch(() => {
      if (armazem === pedido) armazem = null
    })
    return pedido
  }

  async function enviar() {
    if (!ativo || envio || !fila || loja.getState().acesso.somenteLeitura) return
    const g = geracao
    const controller = new AbortController()
    upload = controller
    const prazo = setTimeout(() => controller.abort(), 20_000)
    envio = (async () => {
      const a = await arquivo()
      for (const f of await a.listar()) {
        if (!ativo || g !== geracao) return
        estado.setState({ envio: 'enviando' })
        await fila.salvarAgora()
        if (!ativo || g !== geracao) return
        const r = await plataforma.servico.buscar('/salvamento', { sinal: controller.signal })
        if (!ativo || g !== geracao) return
        controller.signal.throwIfAborted()
        if (r.status !== 200) throw new Error(`Recorde indisponível (${r.status}).`)
        const salvo = SalvamentoGuardadoSchema.parse(r.corpo)
        const tempo = salvo.salvamento?.percursos[f.percurso]?.melhorTempoMs
        if (tempo !== undefined && tempo < f.tempoMs) {
          await a.remover(f.percurso, f.tempoMs)
          continue
        }
        if (tempo !== f.tempoMs || salvo.revisao < 1) {
          estado.setState({ envio: 'pendente' })
          continue
        }
        const resposta = await plataforma.servico.buscar('/fantasmas', {
          metodo: 'PUT',
          corpo: { versao: 1, revisaoBase: salvo.revisao, fantasma: f },
          sinal: controller.signal,
        })
        if (!ativo || g !== geracao) return
        controller.signal.throwIfAborted()
        if (resposta.status === 409) {
          estado.setState({ envio: 'pendente' })
          continue
        }
        const lido = LeituraDoFantasmaSchema.safeParse(resposta.corpo)
        if (
          resposta.status !== 200 ||
          !lido.success ||
          lido.data.situacao !== 'disponivel' ||
          !mesmosDados(lido.data.fantasma, f)
        )
          throw new Error(`Trajeto não confirmado (${resposta.status}).`)
        await a.remover(f.percurso, f.tempoMs)
        if (ativo && g === geracao) estado.setState({ envio: 'guardado' })
      }
    })()
      .catch((erro) => {
        if (!ativo || g !== geracao) return
        estado.setState({ envio: 'indisponivel' })
        plataforma.relatarErro(erro, 'guardar-fantasma')
      })
      .finally(() => {
        clearTimeout(prazo)
        if (upload === controller) upload = null
        envio = null
      })
    await envio
  }

  async function escolher(
    irmao: Pick<IrmaoParaOJogo, 'perfilId' | 'nome'>,
    percurso: PercursoId,
    preservar = false,
  ) {
    if (!ativo || plataforma.publico !== 'kids') return
    const n = ++escolha,
      g = geracao
    leitura?.abort()
    const controller = new AbortController()
    leitura = controller
    const prazo = setTimeout(() => {
      controller.abort()
      if (ativo && n === escolha && g === geracao)
        estado.setState({
          referencia: null,
          carregando: false,
          recado: 'O trajeto não abriu agora. Você pode correr sem ele.',
        })
    }, 5_000)
    estado.setState({ carregando: true, recado: null, ...(preservar ? {} : { referencia: null }) })
    try {
      const caminho = preservar ? '/irmaos' : `/irmaos/${irmao.perfilId}/fantasmas/${percurso}`
      const r = await plataforma.servico.buscar(caminho, {
        sinal: controller.signal,
      })
      if (!ativo || n !== escolha || g !== geracao) return
      controller.signal.throwIfAborted()
      if (preservar) {
        const lista = IrmaosParaOJogoSchema.safeParse(r.corpo)
        const atual =
          lista.success && lista.data.situacao === 'ok'
            ? lista.data.irmaos.find((i) => i.perfilId === irmao.perfilId)
            : undefined
        const anterior = estado.getState().referencia
        if (
          r.status === 200 &&
          atual &&
          anterior?.perfilId === irmao.perfilId &&
          anterior.fantasma.percurso === percurso &&
          atual.percursos[percurso]?.melhorTempoMs === anterior.fantasma.tempoMs
        ) {
          if (atual.nome !== anterior.nome)
            estado.setState({ referencia: { ...anterior, nome: atual.nome } })
        } else
          estado.setState({
            referencia: null,
            recado: 'Este trajeto não está mais disponível. Você pode correr sem ele.',
          })
        return
      }
      const lido = LeituraDoFantasmaSchema.safeParse(r.corpo)
      if (
        r.status !== 200 ||
        !lido.success ||
        lido.data.situacao !== 'disponivel' ||
        lido.data.fantasma.percurso !== percurso
      ) {
        estado.setState({
          referencia: null,
          recado:
            r.status === 403
              ? 'As visitas entre irmãos estão desligadas.'
              : 'Este recorde ainda não tem trajeto disponível.',
        })
        return
      }
      estado.setState({
        referencia: { perfilId: irmao.perfilId, nome: irmao.nome, fantasma: lido.data.fantasma },
      })
    } catch (erro) {
      if (!ativo || n !== escolha || g !== geracao) return
      estado.setState({
        referencia: null,
        recado: 'O trajeto não abriu agora. Você pode correr sem ele.',
      })
      plataforma.relatarErro(erro, 'ler-fantasma')
    } finally {
      clearTimeout(prazo)
      if (ativo && n === escolha && g === geracao) estado.setState({ carregando: false })
      if (leitura === controller) leitura = null
    }
  }

  return {
    estado,
    iniciar() {
      ativo = true
      const g = ++geracao
      if (envio)
        void envio.then(() => {
          if (ativo && g === geracao) void enviar()
        })
      else void enviar()
    },
    parar() {
      ativo = false
      geracao++
      escolha++
      leitura?.abort()
      upload?.abort()
      gravador.cancelar()
      capturando = null
      estado.setState({ referencia: null, carregando: false })
      const a = armazem
      armazem = null
      if (a)
        void a.then(
          (a) => a.fechar(),
          () => {},
        )
    },
    async tentarEnviar() {
      if (envio) await envio
      await enviar()
    },
    escolher,
    revalidar() {
      const r = estado.getState().referencia
      if (r) return escolher(r, r.fantasma.percurso, true)
      return Promise.resolve()
    },
    retirar() {
      escolha++
      leitura?.abort()
      estado.setState({ referencia: null, carregando: false, recado: null })
    },
    comecar(percurso: PercursoId, p: { x: number; y: number; z: number; direcao: number }) {
      const referencia = estado.getState().referencia
      if (referencia?.fantasma.percurso === percurso) void escolher(referencia, percurso)
      capturando =
        ativo && !loja.getState().acesso.somenteLeitura && !loja.getState().visita ? percurso : null
      if (capturando) gravador.comecar(p.x, p.y, p.z, p.direcao)
    },
    quadro(tempoMs: number, p: { x: number; y: number; z: number; direcao: number }) {
      if (capturando) gravador.quadro(tempoMs, p.x, p.y, p.z, p.direcao)
    },
    cancelar(percurso: PercursoId) {
      if (capturando === percurso) {
        capturando = null
        gravador.cancelar()
      }
    },
    terminar(
      percurso: PercursoId,
      tempoMs: number,
      p: { x: number; y: number; z: number; direcao: number },
    ) {
      if (capturando !== percurso) return
      capturando = null
      const f = gravador.terminar(percurso, tempoMs, p.x, p.y, p.z, p.direcao)
      if (!f || loja.getState().salvamento.percursos[percurso]?.melhorTempoMs !== tempoMs) return
      const g = geracao
      return arquivo()
        .then(async (a) => {
          if (!ativo || g !== geracao) return
          await a.guardar(f)
          if (ativo && g === geracao) {
            estado.setState({ envio: 'pendente' })
            if (envio) await envio
            if (ativo && g === geracao) await enviar()
          }
        })
        .catch((erro) => {
          if (!ativo || g !== geracao) return
          estado.setState({ envio: 'indisponivel' })
          plataforma.relatarErro(erro, 'diario-do-fantasma')
        })
    },
  }
}
