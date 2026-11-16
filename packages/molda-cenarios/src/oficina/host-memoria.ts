import {
  ConflitoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  executarLote,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  type CenarioAberto,
  CenarioDesatualizado,
  type CenariosHost,
  type Espaco,
  type ModeloDeBiblioteca,
  type Mundo,
  type ResumoDeCenario,
} from './portas'

interface CenarioGuardado {
  resumo: ResumoDeCenario
  documento: DocumentoDeCenario
  operacoes: Map<string, number>
}

export interface OpcoesDoHostEmMemoria {
  /** Além do espaço da conta, cria o espaço da equipe. */
  equipe?: boolean
  /** Atraso de cada chamada, para ver os estados de espera. */
  atrasoMs?: number
}

/**
 * Um host inteiro em memória: serve o playground e os testes, e é a referência de
 * comportamento do host de verdade (mesmas recusas, mesma ordem de revisões).
 */
export function criarHostEmMemoria(opcoes: OpcoesDoHostEmMemoria = {}): CenariosHost {
  let contador = 0
  const novoId = (prefixo: string) => `${prefixo}-${(++contador).toString(36).padStart(4, '0')}`
  const agora = () => new Date().toISOString()
  const esperar = () =>
    opcoes.atrasoMs
      ? new Promise<void>((resolver) => setTimeout(resolver, opcoes.atrasoMs))
      : Promise.resolve()

  const espacos: Espaco[] = [
    { id: 'conta', tipo: 'conta', nome: 'Meu espaço', usadoBytes: 0, limiteBytes: 2 * 1024 ** 3 },
  ]
  if (opcoes.equipe)
    espacos.push({
      id: 'equipe',
      tipo: 'equipe',
      nome: 'Equipe Sistema Zero',
      usadoBytes: 0,
      limiteBytes: 20 * 1024 ** 3,
    })
  const bibliotecas = new Map<string, Biblioteca>()
  const modelos = new Map<string, ModeloDeBiblioteca>()
  const conteudos = new Map<string, Uint8Array>()
  const mundos = new Map<string, Mundo>()
  const cenarios = new Map<string, CenarioGuardado>()

  const exigir = <T>(mapa: Map<string, T>, id: string, oque: string): T => {
    const valor = mapa.get(id)
    if (!valor) throw new Error(`${oque} não existe mais`)
    return valor
  }
  const espacoDe = (id: string) => {
    const espaco = espacos.find((e) => e.id === id)
    if (!espaco) throw new Error('Espaço não existe')
    return espaco
  }
  const contar = (bibliotecaId: string) => {
    const biblioteca = bibliotecas.get(bibliotecaId)
    if (!biblioteca) return
    let total = 0
    for (const m of modelos.values()) if (m.bibliotecaId === bibliotecaId) total++
    biblioteca.modelos = total
    biblioteca.atualizadaEm = agora()
  }
  const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const copia = <T>(valor: T): T => structuredClone(valor)

  return {
    async espacos() {
      await esperar()
      return copia(espacos)
    },

    async listarBibliotecas(espacoId) {
      await esperar()
      return copia([...bibliotecas.values()].filter((b) => b.espacoId === espacoId))
    },
    async criarBiblioteca(espacoId, dados) {
      await esperar()
      espacoDe(espacoId)
      const biblioteca: Biblioteca = {
        id: novoId('bib'),
        espacoId,
        nome: dados.nome.trim(),
        licenca: dados.licenca,
        modelos: 0,
        capa: null,
        atualizadaEm: agora(),
      }
      bibliotecas.set(biblioteca.id, biblioteca)
      return copia(biblioteca)
    },
    async editarBiblioteca(id, dados) {
      await esperar()
      const biblioteca = exigir(bibliotecas, id, 'A biblioteca')
      if (dados.nome !== undefined) biblioteca.nome = dados.nome.trim()
      if (dados.licenca !== undefined) biblioteca.licenca = dados.licenca
      biblioteca.atualizadaEm = agora()
      return copia(biblioteca)
    },
    async apagarBiblioteca(id) {
      await esperar()
      exigir(bibliotecas, id, 'A biblioteca')
      for (const m of [...modelos.values()]) if (m.bibliotecaId === id) modelos.delete(m.id)
      bibliotecas.delete(id)
      for (const mundo of mundos.values())
        mundo.bibliotecas = mundo.bibliotecas.filter((b) => b !== id)
    },

    async organizacaoDaBiblioteca(bibliotecaId) {
      await esperar()
      exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      const lista = [...modelos.values()].filter((m) => m.bibliotecaId === bibliotecaId)
      return {
        pastas: [...new Set(lista.map((m) => m.pasta))].sort(),
        etiquetas: [...new Set(lista.flatMap((m) => m.etiquetas))].sort(),
      }
    },
    async listarModelos(bibliotecaId, filtro = {}) {
      await esperar()
      const busca = semAcento(filtro.busca?.trim() ?? '')
      const termos = busca ? busca.split(/\s+/) : []
      const todos = [...modelos.values()]
        .filter((m) => m.bibliotecaId === bibliotecaId)
        .filter((m) => filtro.pasta === undefined || m.pasta === filtro.pasta)
        .filter((m) => {
          if (!termos.length) return true
          const alvo = semAcento(`${m.nome} ${m.pasta} ${m.etiquetas.join(' ')}`)
          return termos.every((t) => alvo.includes(t))
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      const inicio = Number(filtro.cursor ?? 0) || 0
      const limite = Math.min(200, Math.max(1, filtro.limite ?? 60))
      const itens = todos.slice(inicio, inicio + limite)
      return copia({
        itens,
        total: todos.length,
        proximo: inicio + limite < todos.length ? String(inicio + limite) : null,
      })
    },
    async importarModelos(bibliotecaId, lista, aoAndar, sinal) {
      sinal?.throwIfAborted()
      const biblioteca = exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      const espaco = espacoDe(biblioteca.espacoId)
      const criados: ModeloDeBiblioteca[] = []
      for (let i = 0; i < lista.length; i++) {
        await esperar()
        sinal?.throwIfAborted()
        const m = lista[i]!
        if (espaco.usadoBytes + m.conteudo.length > espaco.limiteBytes)
          throw new Error('O espaço está cheio: apague modelos que não usa para trazer mais')
        const repetido = [...modelos.values()].find(
          (x) => x.bibliotecaId === bibliotecaId && x.digest === m.digest,
        )
        if (!repetido) {
          if (!conteudos.has(m.digest)) {
            conteudos.set(m.digest, m.conteudo)
            espaco.usadoBytes += m.conteudo.length
          }
          const modelo: ModeloDeBiblioteca = {
            id: novoId('mod'),
            bibliotecaId,
            nome: m.nome,
            pasta: m.pasta,
            etiquetas: [...m.etiquetas],
            digest: m.digest,
            bytes: m.conteudo.length,
            triangulos: m.triangulos,
            min: m.min,
            max: m.max,
            miniatura: URL.createObjectURL(m.miniatura),
          }
          modelos.set(modelo.id, modelo)
          criados.push(modelo)
          if (!biblioteca.capa) biblioteca.capa = modelo.miniatura
        }
        aoAndar?.(i + 1, lista.length)
      }
      contar(bibliotecaId)
      return copia(criados)
    },
    async editarModelo(id, dados) {
      await esperar()
      const modelo = exigir(modelos, id, 'O modelo')
      if (dados.nome !== undefined) modelo.nome = dados.nome.trim()
      if (dados.pasta !== undefined) modelo.pasta = dados.pasta
      if (dados.etiquetas !== undefined) modelo.etiquetas = [...dados.etiquetas]
      return copia(modelo)
    },
    async apagarModelos(bibliotecaId, ids) {
      await esperar()
      for (const id of ids) if (modelos.get(id)?.bibliotecaId === bibliotecaId) modelos.delete(id)
      contar(bibliotecaId)
    },
    async conteudoDoModelo(ref) {
      await esperar()
      const conteudo = conteudos.get(ref.digest)
      if (!conteudo) throw new Error('O arquivo do modelo não foi encontrado')
      return conteudo.slice().buffer
    },

    async listarMundos(espacoId) {
      await esperar()
      return copia([...mundos.values()].filter((j) => j.espacoId === espacoId))
    },
    async criarMundo(espacoId, nome) {
      await esperar()
      espacoDe(espacoId)
      const mundo: Mundo = {
        id: novoId('mundo'),
        espacoId,
        nome: nome.trim(),
        cenarios: 0,
        bibliotecas: [],
        capa: null,
        atualizadoEm: agora(),
      }
      mundos.set(mundo.id, mundo)
      return copia(mundo)
    },
    async editarMundo(id, dados) {
      await esperar()
      const mundo = exigir(mundos, id, 'O mundo')
      if (dados.nome !== undefined) mundo.nome = dados.nome.trim()
      if (dados.bibliotecas !== undefined)
        mundo.bibliotecas = dados.bibliotecas.filter((b) => bibliotecas.has(b))
      mundo.atualizadoEm = agora()
      return copia(mundo)
    },
    async apagarMundo(id) {
      await esperar()
      exigir(mundos, id, 'O mundo')
      for (const c of [...cenarios.values()])
        if (c.resumo.mundoId === id) cenarios.delete(c.resumo.id)
      mundos.delete(id)
    },

    async listarCenarios(mundoId) {
      await esperar()
      return copia(
        [...cenarios.values()].filter((c) => c.resumo.mundoId === mundoId).map((c) => c.resumo),
      )
    },
    async criarCenario(mundoId, nome) {
      await esperar()
      const mundo = exigir(mundos, mundoId, 'O mundo')
      const id = novoId('cen')
      const resumo: ResumoDeCenario = {
        id,
        mundoId,
        nome: nome.trim(),
        revisao: 0,
        capa: null,
        atualizadoEm: agora(),
      }
      cenarios.set(id, {
        resumo,
        documento: criarDocumentoVazio(id, resumo.nome),
        operacoes: new Map(),
      })
      mundo.cenarios++
      mundo.atualizadoEm = agora()
      return copia(resumo)
    },
    async abrirCenario(id): Promise<CenarioAberto> {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      return copia({ resumo: c.resumo, documento: c.documento, revisao: c.resumo.revisao })
    },
    async editarCenario(id, revisaoEsperada, comandos, operacaoId) {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      // A mesma operação mandada duas vezes (resposta perdida) não se aplica de novo.
      const feita = c.operacoes.get(operacaoId)
      if (feita !== undefined) return { revisao: feita }
      try {
        const depois = executarLote(
          { documento: c.documento, revisao: c.resumo.revisao },
          { revisaoEsperada, comandos },
        )
        c.documento = depois.documento
        c.resumo.revisao = depois.revisao
        c.resumo.nome = depois.documento.nome
        c.resumo.atualizadoEm = agora()
        c.operacoes.set(operacaoId, depois.revisao)
        const mundo = mundos.get(c.resumo.mundoId)
        if (mundo) mundo.atualizadoEm = c.resumo.atualizadoEm
        return { revisao: depois.revisao }
      } catch (erro) {
        if (erro instanceof ConflitoDeCenario) throw new CenarioDesatualizado(erro.revisaoAtual)
        throw erro
      }
    },
    async duplicarCenario(id) {
      await esperar()
      const original = exigir(cenarios, id, 'O cenário')
      const novo = novoId('cen')
      const resumo: ResumoDeCenario = {
        ...original.resumo,
        id: novo,
        nome: `${original.resumo.nome} (cópia)`.slice(0, 120),
        revisao: 0,
        atualizadoEm: agora(),
      }
      cenarios.set(novo, {
        resumo,
        documento: { ...copia(original.documento), id: novo, nome: resumo.nome },
        operacoes: new Map(),
      })
      const mundo = mundos.get(resumo.mundoId)
      if (mundo) mundo.cenarios++
      return copia(resumo)
    },
    async apagarCenario(id) {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      cenarios.delete(id)
      const mundo = mundos.get(c.resumo.mundoId)
      if (mundo) mundo.cenarios = Math.max(0, mundo.cenarios - 1)
    },
    async guardarCapa(cenarioId, imagem) {
      const c = cenarios.get(cenarioId)
      if (!c) return
      const endereco = URL.createObjectURL(imagem)
      c.resumo.capa = endereco
      const mundo = mundos.get(c.resumo.mundoId)
      if (mundo) mundo.capa = endereco
    },
  }
}
