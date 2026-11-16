import {
  type ComandoDeCenario,
  executarLote,
  type ModeloDeCatalogo,
  type RevisaoDeCenario,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core'
import type { CenariosHostAdapter, EstadoDeViewport } from './portas'

export interface EstadoDoEditor {
  projeto: RevisaoDeCenario | null
  catalogo: readonly ModeloDeCatalogo[]
  viewport: EstadoDeViewport
  ocupado: boolean
  erro: string | null
  testando: boolean
  gesto: boolean
  podeDesfazer: boolean
  podeRefazer: boolean
  recuperacao: { base: number; documento: RevisaoDeCenario['documento'] } | null
}
export class EditorOcupado extends Error {}
/** Interface, runtime e agentes usam esta mesma fila de autoria. Não contém renderer nem IO global. */
export function criarController(host: CenariosHostAdapter) {
  let estado: EstadoDoEditor = {
    projeto: null,
    catalogo: [],
    viewport: {
      selecionados: [],
      ferramenta: 'selecionar',
      vista: 'perspectiva',
      encaixe: true,
      inspecao: false,
      pincel: { tipo: 'elevar', raio: 5, valor: 1, intensidade: 0.5 },
    },
    ocupado: false,
    erro: null,
    testando: false,
    gesto: false,
    podeDesfazer: false,
    podeRefazer: false,
    recuperacao: null,
  }
  const ouvintes = new Set<() => void>(),
    passado: { antes: number; depois: number }[] = [],
    futuro: { antes: number; depois: number }[] = []
  const emitir = (m: Partial<EstadoDoEditor>) => {
    estado = { ...estado, ...m }
    for (const fn of ouvintes) fn()
  }
  const exigirLivre = () => {
    if (estado.ocupado || estado.testando || estado.gesto)
      throw new EditorOcupado('Aguarde a operação atual ou retorne à edição')
  }
  const falhou = (e: unknown) =>
    emitir({ ocupado: false, erro: e instanceof Error ? e.message : String(e) })
  return {
    getState: () => estado,
    subscribe(fn: () => void) {
      ouvintes.add(fn)
      return () => {
        ouvintes.delete(fn)
      }
    },
    viewport(m: Partial<EstadoDeViewport>) {
      emitir({ viewport: { ...estado.viewport, ...m } })
    },
    erro(mensagem: string | null) {
      emitir({ erro: mensagem })
    },
    gesto(ativo: boolean) {
      emitir({ gesto: ativo })
    },
    receber(projeto: RevisaoDeCenario) {
      if (
        estado.ocupado ||
        estado.testando ||
        estado.gesto ||
        !estado.projeto ||
        projeto.projetoId !== estado.projeto.projetoId ||
        projeto.revisao <= estado.projeto.revisao
      )
        return false
      validarDocumento(projeto.documento, new Map(estado.catalogo.map((m) => [m.id, m])))
      passado.length = 0
      futuro.length = 0
      emitir({ projeto, podeDesfazer: false, podeRefazer: false })
      return true
    },
    async abrir(id: string) {
      exigirLivre()
      emitir({ ocupado: true, erro: null })
      try {
        const p = await host.abrir(id),
          catalogo = await host.catalogo(p.documento.catalogo),
          recuperacao = await host.recuperar(id)
        validarDocumento(p.documento, new Map(catalogo.map((m) => [m.id, m])))
        passado.length = 0
        futuro.length = 0
        emitir({
          projeto: p,
          recuperacao,
          catalogo,
          ocupado: false,
          podeDesfazer: false,
          podeRefazer: false,
          viewport: { ...estado.viewport, selecionados: [] },
        })
      } catch (e) {
        falhou(e)
        throw e
      }
    },
    async executar(
      comandos: ComandoDeCenario[],
      revisaoEsperada?: number,
      operacaoId: string = crypto.randomUUID(),
    ) {
      exigirLivre()
      const p = estado.projeto
      if (!p) throw Error('Abra um cenário')
      const esperado = revisaoEsperada ?? p.revisao
      const previa = executarLote(
        { documento: p.documento, revisao: p.revisao },
        { revisaoEsperada: esperado, comandos },
        new Map(estado.catalogo.map((m) => [m.id, m])),
      )
      emitir({ ocupado: true, erro: null })
      try {
        await host.guardarRecuperacao(p.projetoId, { base: p.revisao, documento: previa.documento })
        const salvo = await host.editar(p.projetoId, esperado, comandos, operacaoId)
        passado.push({ antes: p.revisao, depois: salvo.revisao })
        if (passado.length > 500) passado.shift()
        futuro.length = 0
        emitir({ projeto: salvo, ocupado: false, podeDesfazer: true, podeRefazer: false })
        try {
          await host.guardarRecuperacao(p.projetoId, null)
          emitir({ recuperacao: null })
        } catch {
          emitir({ erro: 'Cenário salvo na conta. Não foi possível limpar a recuperação local.' })
        }
      } catch (e) {
        falhou(e)
        throw e
      }
    },
    async historico(sentido: 'desfazer' | 'refazer') {
      exigirLivre()
      const p = estado.projeto
      if (!p) throw Error('Abra um cenário')
      const pilha = sentido === 'desfazer' ? passado : futuro,
        item = pilha.at(-1)
      if (!item) return
      emitir({ ocupado: true, erro: null })
      try {
        const salvo = await host.restaurar(
          p.projetoId,
          p.revisao,
          sentido === 'desfazer' ? item.antes : item.depois,
          crypto.randomUUID(),
        )
        pilha.pop()
        ;(sentido === 'desfazer' ? futuro : passado).push(item)
        emitir({
          projeto: salvo,
          ocupado: false,
          podeDesfazer: passado.length > 0,
          podeRefazer: futuro.length > 0,
        })
      } catch (e) {
        falhou(e)
        throw e
      }
    },
    async aplicar() {
      exigirLivre()
      const p = estado.projeto
      if (!p) throw Error('Abra um cenário')
      emitir({ ocupado: true, erro: null })
      try {
        await host.aplicar(p.projetoId, p.revisao)
        emitir({ ocupado: false })
      } catch (e) {
        falhou(e)
        throw e
      }
    },
    async teste(ativo: boolean, alternar: (ativo: boolean) => Promise<void>) {
      if (estado.ocupado) throw new EditorOcupado('Aguarde a operação atual')
      emitir({ ocupado: true, erro: null })
      try {
        await alternar(ativo)
        emitir({ ocupado: false, testando: ativo })
      } catch (e) {
        falhou(e)
        throw e
      }
    },
  }
}
export type CenariosController = ReturnType<typeof criarController>
