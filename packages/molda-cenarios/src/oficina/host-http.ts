import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  type CenarioAberto,
  CenarioDesatualizado,
  type CenariosHost,
  type Espaco,
  type ModeloDeBiblioteca,
  type ModeloParaImportar,
  type Mundo,
  type PaginaDeModelos,
  type ResumoDeCenario,
} from './portas'

/**
 * A oficina falando com a plataforma: tudo passa por `/api/cenarios/*` do app (o BFF do
 * `member-shell`), que guarda no `members`. Os arquivos (o `.glb`, o retrato do modelo e a capa
 * do cenário) sobem DIRETO ao armazenamento, por um endereço assinado que só aceita aquele
 * tamanho e aquele tipo; depois o servidor do app confere que chegaram.
 */

/** O `fetch` que a oficina usa: só o endereço e as opções (o do navegador e o `sessionFetch` servem). */
export type Buscar = (endereco: string, opcoes?: RequestInit) => Promise<Response>

export interface OpcoesDoHostHttp {
  /** Onde o app serve o BFF. Padrão: `/api/cenarios`. */
  base?: string
  /**
   * O `fetch` das chamadas ao app. No Kids é o `sessionFetch`, que leva a prova de que a página
   * ainda é do mesmo perfil. O envio dos arquivos ao armazenamento usa sempre o do navegador.
   */
  buscar?: Buscar
  /** Quem está usando (o perfil no Kids): o app recusa se a sessão trocou de pessoa no meio. */
  pessoaId?: string
  /** Pedidos diretos ao armazenamento, para enviar e baixar arquivos (só os testes trocam). */
  enviar?: Buscar
}

/** Quantos modelos vão por pedido (o teto do servidor). */
const POR_LOTE = 50
/** Arquivos subindo ao mesmo tempo: o bastante para andar rápido sem travar a conexão. */
const ENVIOS_JUNTOS = 4
/** Retrato maior que isto não sobe: o modelo entra sem retrato. */
const RETRATO_MAX_BYTES = 256 * 1024
const CAPA_MAX_BYTES = 512 * 1024

const NOMES_DOS_ESPACOS = { conta: 'Meu espaço', equipe: 'Equipe Sistema Zero' } as const

/** O que o servidor recusou, com a frase dele quando há uma. */
export class ErroDaOficina extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo: string | null,
    readonly detalhes: Record<string, unknown> | null,
  ) {
    super(mensagem)
    this.name = 'ErroDaOficina'
  }
}

interface ArquivoAEnviar {
  digest: string
  tipoDoConteudo: string
  url: string
}
interface Reserva {
  espacoId: string
  enviar: ArquivoAEnviar[]
}
type BibliotecaDoServidor = Omit<Biblioteca, 'capa'> & { capa: string | null }
type ModeloDoServidor = Omit<ModeloDeBiblioteca, 'miniatura'> & { miniatura: string | null }
type MundoDoServidor = Omit<Mundo, 'capa'> & { capa: string | null }
type ResumoDoServidor = Omit<ResumoDeCenario, 'capa'> & { capa: string | null }

const objeto = (valor: unknown): Record<string, unknown> | null =>
  valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null

async function emFila<T>(itens: readonly T[], juntos: number, fazer: (item: T) => Promise<void>) {
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(juntos, itens.length) }, async () => {
      while (proximo < itens.length) await fazer(itens[proximo++]!)
    }),
  )
}

export function criarHostHttp(opcoes: OpcoesDoHostHttp = {}): CenariosHost {
  const base = (opcoes.base ?? '/api/cenarios').replace(/\/+$/, '')
  const buscar: Buscar = opcoes.buscar ?? ((endereco, o) => fetch(endereco, o))
  const enviar: Buscar = opcoes.enviar ?? ((endereco, o) => fetch(endereco, o))

  // De que espaço é cada biblioteca e cada mundo: é o que monta o endereço dos arquivos.
  const espacoDaBiblioteca = new Map<string, string>()
  const espacoDoMundo = new Map<string, string>()

  async function pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    corpo?: unknown,
    sinal?: AbortSignal,
  ): Promise<T> {
    let resposta: Response
    try {
      resposta = await buscar(`${base}/${caminho}`, {
        method: metodo,
        signal: sinal,
        headers: {
          accept: 'application/json',
          ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
          ...(opcoes.pessoaId ? { 'x-sz-viewer': opcoes.pessoaId } : {}),
        },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      })
    } catch {
      sinal?.throwIfAborted()
      throw new ErroDaOficina('Sem conexão agora. Tente de novo.', 0, null, null)
    }
    const lido: unknown = await resposta.json().catch(() => null)
    if (resposta.ok) return lido as T
    const envelope = objeto(lido)
    const erro = objeto(envelope?.error)
    const codigo = typeof erro?.code === 'string' ? erro.code : null
    const detalhes = objeto(envelope?.details)
    if (codigo === 'CENARIO_DESATUALIZADO' && typeof detalhes?.revisaoAtual === 'number')
      throw new CenarioDesatualizado(detalhes.revisaoAtual)
    throw new ErroDaOficina(
      typeof erro?.message === 'string' && erro.message
        ? erro.message
        : 'Não consegui falar com a oficina agora. Tente de novo.',
      resposta.status,
      codigo,
      detalhes,
    )
  }

  const enderecoDoArquivo = (espacoId: string, digest: string) =>
    `${base}/espacos/${espacoId}/arquivos/${digest}`
  const retrato = (espacoId: string | undefined, digest: string | null) =>
    espacoId && digest ? enderecoDoArquivo(espacoId, digest) : null

  const biblioteca = (b: BibliotecaDoServidor): Biblioteca => {
    espacoDaBiblioteca.set(b.id, b.espacoId)
    return { ...b, capa: retrato(b.espacoId, b.capa) }
  }
  const modelo = (m: ModeloDoServidor): ModeloDeBiblioteca => ({
    ...m,
    miniatura: retrato(espacoDaBiblioteca.get(m.bibliotecaId), m.miniatura),
  })
  const mundo = (m: MundoDoServidor): Mundo => {
    espacoDoMundo.set(m.id, m.espacoId)
    return { ...m, capa: retrato(m.espacoId, m.capa) }
  }
  const resumo = (
    c: ResumoDoServidor,
    espacoId = espacoDoMundo.get(c.mundoId),
  ): ResumoDeCenario => ({
    id: c.id,
    mundoId: c.mundoId,
    nome: c.nome,
    revisao: c.revisao,
    capa: retrato(espacoId, c.capa),
    atualizadoEm: c.atualizadoEm,
  })

  /** O espaço de uma biblioteca que esta página ainda não listou (endereço aberto direto). */
  async function acharEspacoDaBiblioteca(bibliotecaId: string): Promise<string> {
    const conhecido = espacoDaBiblioteca.get(bibliotecaId)
    if (conhecido) return conhecido
    for (const espaco of await host.espacos()) {
      await host.listarBibliotecas(espaco.id)
      const achado = espacoDaBiblioteca.get(bibliotecaId)
      if (achado) return achado
    }
    throw new ErroDaOficina('A biblioteca não existe mais', 404, 'CENARIO_NAO_ENCONTRADO', null)
  }

  /** Põe no armazenamento os arquivos que a reserva pediu. */
  async function subir(
    reserva: Reserva,
    conteudos: ReadonlyMap<string, Blob | Uint8Array>,
    sinal?: AbortSignal,
  ) {
    await emFila(reserva.enviar, ENVIOS_JUNTOS, async (arquivo) => {
      sinal?.throwIfAborted()
      const conteudo = conteudos.get(arquivo.digest)
      if (!conteudo) throw new ErroDaOficina('O arquivo a enviar se perdeu', 0, null, null)
      let resposta: Response
      try {
        resposta = await enviar(arquivo.url, {
          method: 'PUT',
          signal: sinal,
          headers: { 'content-type': arquivo.tipoDoConteudo },
          body: conteudo as BodyInit,
        })
      } catch {
        sinal?.throwIfAborted()
        throw new ErroDaOficina('O envio parou no meio. Tente de novo.', 0, null, null)
      }
      if (!resposta.ok)
        throw new ErroDaOficina(
          'O envio parou no meio. Tente de novo.',
          resposta.status,
          null,
          null,
        )
    })
  }

  const host: CenariosHost = {
    async espacos() {
      const lista = await pedir<Array<Omit<Espaco, 'nome'>>>('GET', 'espacos')
      return lista.map((e) => ({ ...e, nome: NOMES_DOS_ESPACOS[e.tipo] }))
    },

    async listarBibliotecas(espacoId) {
      const lista = await pedir<BibliotecaDoServidor[]>('GET', `espacos/${espacoId}/bibliotecas`)
      return lista.map(biblioteca)
    },
    async criarBiblioteca(espacoId, dados) {
      return biblioteca(
        await pedir<BibliotecaDoServidor>('POST', `espacos/${espacoId}/bibliotecas`, dados),
      )
    },
    async editarBiblioteca(id, dados) {
      return biblioteca(await pedir<BibliotecaDoServidor>('PATCH', `bibliotecas/${id}`, dados))
    },
    async apagarBiblioteca(id) {
      await pedir('DELETE', `bibliotecas/${id}`)
      espacoDaBiblioteca.delete(id)
    },

    async organizacaoDaBiblioteca(bibliotecaId) {
      return pedir('GET', `bibliotecas/${bibliotecaId}/organizacao`)
    },
    async listarModelos(bibliotecaId, filtro = {}) {
      await acharEspacoDaBiblioteca(bibliotecaId)
      const consulta = new URLSearchParams()
      if (filtro.busca?.trim()) consulta.set('busca', filtro.busca.trim().slice(0, 120))
      if (filtro.pasta !== undefined) consulta.set('pasta', filtro.pasta)
      if (filtro.cursor) consulta.set('cursor', filtro.cursor)
      if (filtro.limite) consulta.set('limite', String(filtro.limite))
      const sufixo = consulta.size ? `?${consulta}` : ''
      const pagina = await pedir<Omit<PaginaDeModelos, 'itens'> & { itens: ModeloDoServidor[] }>(
        'GET',
        `bibliotecas/${bibliotecaId}/modelos${sufixo}`,
      )
      return { ...pagina, itens: pagina.itens.map(modelo) }
    },

    async importarModelos(bibliotecaId, modelos, aoAndar, sinal) {
      sinal?.throwIfAborted()
      await acharEspacoDaBiblioteca(bibliotecaId)
      const criados: ModeloDeBiblioteca[] = []
      let feitos = 0
      aoAndar?.(0, modelos.length)
      for (let inicio = 0; inicio < modelos.length; inicio += POR_LOTE) {
        sinal?.throwIfAborted()
        const lote = modelos.slice(inicio, inicio + POR_LOTE)
        // O retrato também é guardado por conteúdo; grande demais, o modelo entra sem ele.
        const preparados = await Promise.all(
          lote.map(async (m: ModeloParaImportar) => {
            const cabe = m.miniatura.size > 0 && m.miniatura.size <= RETRATO_MAX_BYTES
            const bytes = cabe ? new Uint8Array(await m.miniatura.arrayBuffer()) : null
            return {
              m,
              retrato: bytes,
              digestDoRetrato: bytes ? await digestDosBytes(bytes) : null,
            }
          }),
        )
        const conteudos = new Map<string, Blob | Uint8Array>()
        for (const p of preparados) {
          conteudos.set(p.m.digest, p.m.conteudo)
          if (p.retrato && p.digestDoRetrato) conteudos.set(p.digestDoRetrato, p.retrato)
        }
        const reserva = await pedir<Reserva>(
          'POST',
          `bibliotecas/${bibliotecaId}/modelos/reservar`,
          {
            modelos: preparados.map((p) => ({
              digest: p.m.digest,
              bytes: p.m.conteudo.byteLength,
              miniatura:
                p.retrato && p.digestDoRetrato
                  ? { digest: p.digestDoRetrato, bytes: p.retrato.byteLength }
                  : null,
            })),
          },
          sinal,
        )
        await subir(reserva, conteudos, sinal)
        sinal?.throwIfAborted()
        const registrados = await pedir<ModeloDoServidor[]>(
          'POST',
          `bibliotecas/${bibliotecaId}/modelos`,
          {
            espacoId: reserva.espacoId,
            modelos: preparados.map((p) => ({
              nome: p.m.nome,
              pasta: p.m.pasta,
              etiquetas: p.m.etiquetas,
              digest: p.m.digest,
              triangulos: p.m.triangulos,
              min: p.m.min,
              max: p.m.max,
              miniatura: p.digestDoRetrato,
            })),
          },
          sinal,
        )
        criados.push(...registrados.map(modelo))
        feitos += lote.length
        aoAndar?.(feitos, modelos.length)
      }
      return criados
    },

    async editarModelo(id, dados) {
      return modelo(await pedir<ModeloDoServidor>('PATCH', `modelos/${id}`, dados))
    },
    async apagarModelos(bibliotecaId, ids) {
      for (let inicio = 0; inicio < ids.length; inicio += 200)
        await pedir('POST', `bibliotecas/${bibliotecaId}/modelos/apagar`, {
          ids: ids.slice(inicio, inicio + 200),
        })
    },
    async conteudoDoModelo(ref) {
      const espacoId = await acharEspacoDaBiblioteca(ref.biblioteca)
      // O app diz onde o arquivo está; a busca vai direto ao armazenamento, sem os cabeçalhos da
      // sessão (com eles o navegador barraria o pedido a outra origem).
      const { url } = await pedir<{ url: string }>(
        'GET',
        `espacos/${espacoId}/arquivos/${ref.digest}?tipo=modelo&como=endereco`,
      )
      let resposta: Response
      try {
        resposta = await enviar(url)
      } catch {
        throw new ErroDaOficina('Sem conexão agora. Tente de novo.', 0, null, null)
      }
      if (!resposta.ok)
        throw new ErroDaOficina(
          'O arquivo do modelo não foi encontrado',
          resposta.status,
          null,
          null,
        )
      return resposta.arrayBuffer()
    },

    async listarMundos(espacoId) {
      return (await pedir<MundoDoServidor[]>('GET', `espacos/${espacoId}/mundos`)).map(mundo)
    },
    async criarMundo(espacoId, nome) {
      return mundo(await pedir<MundoDoServidor>('POST', `espacos/${espacoId}/mundos`, { nome }))
    },
    async editarMundo(id, dados) {
      return mundo(await pedir<MundoDoServidor>('PATCH', `mundos/${id}`, dados))
    },
    async apagarMundo(id) {
      await pedir('DELETE', `mundos/${id}`)
      espacoDoMundo.delete(id)
    },

    async listarCenarios(mundoId) {
      const lista = await pedir<ResumoDoServidor[]>('GET', `mundos/${mundoId}/cenarios`)
      return lista.map((c) => resumo(c))
    },
    async criarCenario(mundoId, nome) {
      return resumo(await pedir<ResumoDoServidor>('POST', `mundos/${mundoId}/cenarios`, { nome }))
    },
    async abrirCenario(id): Promise<CenarioAberto> {
      const aberto = await pedir<
        ResumoDoServidor & { espacoId: string; documento: CenarioAberto['documento'] }
      >('GET', `cenarios/${id}`)
      espacoDoMundo.set(aberto.mundoId, aberto.espacoId)
      return {
        resumo: resumo(aberto, aberto.espacoId),
        documento: aberto.documento,
        revisao: aberto.revisao,
      }
    },
    async editarCenario(id, revisaoEsperada, comandos, operacaoId) {
      const { revisao } = await pedir<{ revisao: number }>('POST', `cenarios/${id}/lotes`, {
        revisaoEsperada,
        comandos,
        operacaoId,
      })
      return { revisao }
    },
    async duplicarCenario(id) {
      return resumo(await pedir<ResumoDoServidor>('POST', `cenarios/${id}/duplicar`))
    },
    async apagarCenario(id) {
      await pedir('DELETE', `cenarios/${id}`)
    },
    async guardarCapa(cenarioId, imagem) {
      // A capa é um enfeite do cartão: grande demais, fica a anterior.
      if (imagem.size < 1 || imagem.size > CAPA_MAX_BYTES) return
      const bytes = new Uint8Array(await imagem.arrayBuffer())
      const digest = await digestDosBytes(bytes)
      const reserva = await pedir<Reserva>('POST', `cenarios/${cenarioId}/capa/reservar`, {
        digest,
        bytes: bytes.byteLength,
      })
      await subir(reserva, new Map([[digest, bytes]]))
      await pedir('POST', `cenarios/${cenarioId}/capa`, { espacoId: reserva.espacoId, digest })
    },
  }
  return host
}
