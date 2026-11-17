import {
  ConflitoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  executarLote,
  inverterLote,
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
  type TexturaDeBiblioteca,
} from './portas'

interface CenarioGuardado {
  resumo: ResumoDeCenario
  documento: DocumentoDeCenario
  operacoes: Map<string, number>
  passado: number[]
  futuro: number[]
  lotes: Map<
    number,
    {
      comandos: Parameters<CenariosHost['editarCenario']>[2]
      inversos: Parameters<CenariosHost['editarCenario']>[2]
      criadoEm: string
    }
  >
  versoes: Map<number, DocumentoDeCenario>
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
  const texturas = new Map<string, TexturaDeBiblioteca>()
  const espacoDasBibliotecas = new Map<string, string>()
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
    biblioteca.texturas = [...texturas.values()].filter(
      (t) => t.bibliotecaId === bibliotecaId,
    ).length
    if (biblioteca.capaModelo && !modelos.has(biblioteca.capaModelo)) biblioteca.capaModelo = null
    biblioteca.capa =
      (biblioteca.capaModelo ? modelos.get(biblioteca.capaModelo)?.miniatura : null) ??
      [...modelos.values()].find((m) => m.bibliotecaId === bibliotecaId)?.miniatura ??
      [...texturas.values()].find((t) => t.bibliotecaId === bibliotecaId)?.imagem ??
      null
    biblioteca.atualizadaEm = agora()
  }
  const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const copia = <T>(valor: T): T => structuredClone(valor)

  const host: CenariosHost = {
    async espacos() {
      await esperar()
      return copia(espacos)
    },

    async listarBibliotecas(espacoId) {
      await esperar()
      for (const b of bibliotecas.values()) contar(b.id)
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
        descricao: dados.descricao ?? '',
        capaModelo: null,
        modelos: 0,
        capa: null,
        atualizadaEm: agora(),
      }
      bibliotecas.set(biblioteca.id, biblioteca)
      espacoDasBibliotecas.set(biblioteca.id, espacoId)
      return copia(biblioteca)
    },
    async obterBibliotecaDoMolda(espacoId) {
      await esperar()
      if (espacoDe(espacoId).tipo !== 'conta') throw Error('Os moldes pertencem ao espaço da conta')
      const existente = [...bibliotecas.values()].find(
        (b) => b.espacoId === espacoId && b.fonte === 'molda:playground',
      )
      if (existente) return copia(existente)
      const b: Biblioteca = {
        id: novoId('bib'),
        espacoId,
        nome: 'Cópias do Molda',
        fonte: 'molda:playground',
        licenca: 'propria',
        modelos: 0,
        capa: null,
        atualizadaEm: agora(),
      }
      bibliotecas.set(b.id, b)
      return copia(b)
    },
    async editarBiblioteca(id, dados) {
      await esperar()
      const biblioteca = exigir(bibliotecas, id, 'A biblioteca')
      if (dados.nome !== undefined) biblioteca.nome = dados.nome.trim()
      if (dados.licenca !== undefined) biblioteca.licenca = dados.licenca
      if (dados.descricao !== undefined) biblioteca.descricao = dados.descricao.trim()
      if (dados.capaModelo !== undefined) biblioteca.capaModelo = dados.capaModelo
      contar(id)
      biblioteca.atualizadaEm = agora()
      return copia(biblioteca)
    },
    async apagarBiblioteca(id) {
      await esperar()
      exigir(bibliotecas, id, 'A biblioteca')
      await host.apagarTexturas(
        id,
        [...texturas.values()].filter((t) => t.bibliotecaId === id).map((t) => t.id),
      )
      for (const m of [...modelos.values()]) if (m.bibliotecaId === id) modelos.delete(m.id)
      bibliotecas.delete(id)
      for (const mundo of mundos.values())
        mundo.bibliotecas = mundo.bibliotecas.filter((b) => b !== id)
    },

    async organizacaoDaBiblioteca(bibliotecaId) {
      await esperar()
      exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      const lista = [...modelos.values(), ...texturas.values()].filter(
        (m) => m.bibliotecaId === bibliotecaId,
      )
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
        .filter((m) => filtro.digest === undefined || m.digest === filtro.digest)
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

    async listarTexturas(bibliotecaId, filtro = {}) {
      await esperar()
      exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      const termos = semAcento(filtro.busca ?? '')
        .split(/\s+/)
        .filter(Boolean)
      const todos = [...texturas.values()]
        .filter(
          (t) =>
            t.bibliotecaId === bibliotecaId &&
            (filtro.pasta === undefined || t.pasta === filtro.pasta) &&
            (!filtro.digest || t.digest === filtro.digest) &&
            termos.every((termo) =>
              semAcento(`${t.nome} ${t.pasta} ${t.etiquetas.join(' ')}`).includes(termo),
            ),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      const inicio = Number(filtro.cursor ?? 0) || 0,
        limite = Math.min(200, Math.max(1, filtro.limite ?? 60))
      return copia({
        itens: todos.slice(inicio, inicio + limite),
        total: todos.length,
        proximo: inicio + limite < todos.length ? String(inicio + limite) : null,
      })
    },
    async importarTexturas(bibliotecaId, lista, aoAndar, sinal) {
      const biblioteca = exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      espacoDasBibliotecas.set(bibliotecaId, biblioteca.espacoId)
      const espaco = espacoDe(biblioteca.espacoId)
      const criadas: TexturaDeBiblioteca[] = []
      for (const [i, t] of lista.entries()) {
        await esperar()
        sinal?.throwIfAborted()
        const existente = [...texturas.values()].find(
          (x) => x.bibliotecaId === bibliotecaId && x.digest === t.digest,
        )
        if (!existente) {
          const chave = `${espaco.id}:${t.digest}`
          if (!conteudos.has(chave) && espaco.usadoBytes + t.conteudo.size > espaco.limiteBytes)
            throw Error('O espaço está cheio')
          if (!conteudos.has(chave)) {
            conteudos.set(chave, new Uint8Array(await t.conteudo.arrayBuffer()))
            espaco.usadoBytes += t.conteudo.size
          }
          const { conteudo, ...metadados } = t
          const criada = {
            ...metadados,
            id: novoId('tex'),
            bibliotecaId,
            bytes: conteudo.size,
            imagem: URL.createObjectURL(conteudo),
          }
          texturas.set(criada.id, criada)
          criadas.push(criada)
        }
        aoAndar?.(i + 1, lista.length)
      }
      contar(bibliotecaId)
      return copia(criadas)
    },
    async editarTextura(id, dados) {
      await esperar()
      const atual = exigir(texturas, id, 'O chão')
      Object.assign(atual, dados)
      contar(atual.bibliotecaId)
      return copia(atual)
    },
    async apagarTexturas(bibliotecaId, ids) {
      await esperar()
      const biblioteca = exigir(bibliotecas, bibliotecaId, 'A biblioteca')
      const espaco = espacoDe(biblioteca.espacoId)
      for (const id of ids) {
        const t = texturas.get(id)
        if (!t || t.bibliotecaId !== bibliotecaId) continue
        texturas.delete(id)
        URL.revokeObjectURL(t.imagem)
        if (
          ![...texturas.values()].some(
            (x) => x.digest === t.digest && espacoDasBibliotecas.get(x.bibliotecaId) === espaco.id,
          )
        ) {
          const chave = `${espaco.id}:${t.digest}`
          const bytes = conteudos.get(chave)?.byteLength ?? 0
          conteudos.delete(chave)
          espaco.usadoBytes -= bytes
        }
      }
      contar(bibliotecaId)
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
        passado: [],
        futuro: [],
        lotes: new Map(),
        versoes: new Map(),
      })
      mundo.cenarios++
      mundo.atualizadoEm = agora()
      return copia(resumo)
    },
    async abrirCenario(id): Promise<CenarioAberto> {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      return copia({
        resumo: c.resumo,
        documento: c.documento,
        revisao: c.resumo.revisao,
        historico: {
          revisao: c.resumo.revisao,
          desfazer: c.passado.length,
          refazer: c.futuro.length,
        },
      })
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
        const inversos = inverterLote(c.documento, depois.documento)
        if (!c.versoes.size) c.versoes.set(c.resumo.revisao, copia(c.documento))
        c.lotes.set(depois.revisao, { comandos: copia(comandos), inversos, criadoEm: agora() })
        if (inversos.length) {
          c.passado.push(depois.revisao)
          c.passado = c.passado.slice(-200)
          c.futuro = []
        }
        c.documento = depois.documento
        if (depois.revisao % 50 === 0) c.versoes.set(depois.revisao, copia(depois.documento))
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
    async moverHistorico(id, revisaoEsperada, acao, operacaoId) {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      if (c.operacoes.has(operacaoId)) return host.abrirCenario(id)
      if (c.resumo.revisao !== revisaoEsperada) throw new CenarioDesatualizado(c.resumo.revisao)
      const de = acao === 'desfazer' ? c.passado : c.futuro
      const alvo = de.at(-1),
        passo = alvo === undefined ? undefined : c.lotes.get(alvo)
      if (alvo === undefined || !passo) throw Error('Não há outro passo para esta ação')
      const passado = [...c.passado],
        futuro = [...c.futuro]
      await host.editarCenario(
        id,
        revisaoEsperada,
        acao === 'desfazer' ? passo.inversos : passo.comandos,
        operacaoId,
      )
      c.passado = passado
      c.futuro = futuro
      const origem = acao === 'desfazer' ? c.passado : c.futuro
      const destino = acao === 'desfazer' ? c.futuro : c.passado
      origem.pop()
      destino.push(alvo)
      return host.abrirCenario(id)
    },
    async listarRevisoes(id, antes) {
      await esperar()
      const c = exigir(cenarios, id, 'O cenário')
      const itens = [...c.lotes]
        .filter(([r]) => antes === undefined || r < antes)
        .reverse()
        .slice(0, 50)
        .map(([revisao, l]) => ({ revisao, criadoEm: l.criadoEm }))
      return {
        inicio: [...c.versoes.keys()][0] ?? null,
        itens,
        proximo: itens.length === 50 ? itens.at(-1)!.revisao : null,
      }
    },
    async restaurarRevisao(id, revisaoEsperada, revisao, operacaoId) {
      const c = exigir(cenarios, id, 'O cenário')
      if (c.operacoes.has(operacaoId)) return host.abrirCenario(id)
      if (c.resumo.revisao !== revisaoEsperada) throw new CenarioDesatualizado(c.resumo.revisao)
      const fotografia = [...c.versoes].filter(([r]) => r <= revisao).at(-1)
      if (
        !Number.isInteger(revisao) ||
        revisao < 0 ||
        revisao > c.resumo.revisao ||
        (!fotografia && revisao !== c.resumo.revisao)
      )
        throw Error('Revisão fora do histórico deste cenário')
      let documento = revisao === c.resumo.revisao ? c.documento : copia(fotografia![1])
      for (
        let r = fotografia ? fotografia[0] + 1 : revisao + 1;
        r <= revisao && revisao !== c.resumo.revisao;
        r++
      )
        documento = executarLote(
          { documento, revisao: r - 1 },
          { revisaoEsperada: r - 1, comandos: c.lotes.get(r)!.comandos },
        ).documento
      const comandos = inverterLote(documento, c.documento)
      await host.editarCenario(
        id,
        revisaoEsperada,
        comandos.length ? comandos : [{ tipo: 'cenario.restaurar', documento }],
        operacaoId,
      )
      return host.abrirCenario(id)
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
        passado: [],
        futuro: [],
        lotes: new Map(),
        versoes: new Map(),
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
  return host
}
