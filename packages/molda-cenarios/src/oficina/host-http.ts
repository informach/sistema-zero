import { conferirPreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import {
  digestDosBytes,
  lerRecursoDeTerreno,
  MAX_BYTES_DE_TEXTURA_CENARIO,
  MAX_BYTES_RECURSO_TERRENO,
  MAX_RECURSOS_TERRENO,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  type CenarioAberto,
  CenarioDesatualizado,
  type CenariosHost,
  type ConjuntoDeBiblioteca,
  type Espaco,
  type ModeloDeBiblioteca,
  type ModeloParaImportar,
  type Mundo,
  type PaginaDeModelos,
  type PaginaDeRevisoes,
  type ResumoDeCenario,
  type TexturaDeBiblioteca,
  type VersaoDeConjunto,
} from './portas'
import { PublicacaoDesatualizada } from './publicacoes'
import { criarPublicacoesHttp } from './publicacoes-http'

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
  criarUmaVez?: boolean
}
export interface Reserva {
  retrato?: string | null
  espacoId: string
  enviar: ArquivoAEnviar[]
}
type BibliotecaDoServidor = Omit<Biblioteca, 'capa'> & { capa: string | null }
type ModeloDoServidor = Omit<ModeloDeBiblioteca, 'miniatura'> & { miniatura: string | null }
type TexturaDoServidor = Omit<TexturaDeBiblioteca, 'imagem'>
type MundoDoServidor = Omit<Mundo, 'capa'> & { capa: string | null }
type ResumoDoServidor = Omit<ResumoDeCenario, 'capa'> & { capa: string | null }
type CenarioDoServidor = ResumoDoServidor & {
  espacoId: string
  documento: CenarioAberto['documento']
  historico: CenarioAberto['historico']
}

const objeto = (valor: unknown): Record<string, unknown> | null =>
  valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null

function tipoDeImagem(tipo: string): 'image/png' | 'image/webp' {
  if (tipo !== 'image/png' && tipo !== 'image/webp')
    throw new ErroDaOficina('Use uma imagem PNG ou WebP para o retrato', 0, null, null)
  return tipo
}

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
  const espacoDoCenario = new Map<string, string>()
  const espacoDoConjunto = new Map<string, string>()

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
    sinal?.throwIfAborted()
    if (resposta.ok) return lido as T
    const envelope = objeto(lido)
    const erro = objeto(envelope?.error)
    const codigo = typeof erro?.code === 'string' ? erro.code : null
    const detalhes = objeto(envelope?.details)
    if (codigo === 'CENARIO_DESATUALIZADO' && typeof detalhes?.revisaoAtual === 'number')
      throw new CenarioDesatualizado(detalhes.revisaoAtual)
    if (codigo === 'PUBLICACAO_CENARIO_CONFLITANTE')
      throw new PublicacaoDesatualizada(
        typeof erro?.message === 'string' ? erro.message : undefined,
      )
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
  const conjunto = (c: ConjuntoDeBiblioteca, espacoId: string): ConjuntoDeBiblioteca => {
    espacoDoConjunto.set(c.id, espacoId)
    espacoDaBiblioteca.set(c.bibliotecaId, espacoId)
    return { ...c, miniatura: retrato(espacoId, c.miniatura) }
  }
  const textura = (t: TexturaDoServidor): TexturaDeBiblioteca => ({
    ...t,
    imagem: retrato(espacoDaBiblioteca.get(t.bibliotecaId), t.digest) ?? '',
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
  const cenarioAberto = (aberto: CenarioDoServidor): CenarioAberto => {
    espacoDoCenario.set(aberto.id, aberto.espacoId)
    espacoDoMundo.set(aberto.mundoId, aberto.espacoId)
    // Arquivos fixados continuam autorizados mesmo depois de apagar a biblioteca de origem.
    for (const ref of [
      ...aberto.documento.modelos,
      ...(aberto.documento.definicoesConjuntos?.flatMap((d) => d.conteudo.modelos) ?? []),
    ])
      espacoDaBiblioteca.set(ref.biblioteca, aberto.espacoId)
    for (const ref of [
      ...(aberto.documento.texturas ?? []),
      ...(aberto.documento.definicoesConjuntos?.flatMap((d) => d.conteudo.texturas) ?? []),
    ])
      espacoDaBiblioteca.set(ref.biblioteca, aberto.espacoId)
    return {
      resumo: resumo(aberto, aberto.espacoId),
      documento: aberto.documento,
      revisao: aberto.revisao,
      historico: aberto.historico,
    }
  }

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
          headers: {
            'content-type': arquivo.tipoDoConteudo,
            ...(arquivo.criarUmaVez ? { 'if-none-match': '*' } : {}),
          },
          body: conteudo as BodyInit,
        })
      } catch {
        sinal?.throwIfAborted()
        throw new ErroDaOficina('O envio parou no meio. Tente de novo.', 0, null, null)
      }
      if (!resposta.ok && !(arquivo.criarUmaVez && resposta.status === 412))
        throw new ErroDaOficina(
          'O envio parou no meio. Tente de novo.',
          resposta.status,
          null,
          null,
        )
    })
  }

  const host: CenariosHost = {
    publicacoes: criarPublicacoesHttp({ pedir, subir }),
    async espacos() {
      const lista = await pedir<Array<Omit<Espaco, 'nome'>>>('GET', 'espacos')
      return lista.map((e) => ({ ...e, nome: NOMES_DOS_ESPACOS[e.tipo] }))
    },

    async listarBibliotecas(espacoId) {
      const lista = await pedir<BibliotecaDoServidor[]>('GET', `espacos/${espacoId}/bibliotecas`)
      return lista.map(biblioteca)
    },
    async obterBibliotecaDoMolda(espacoId) {
      return biblioteca(await pedir('POST', `espacos/${espacoId}/biblioteca-molda`))
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
      if (filtro.digest) consulta.set('digest', filtro.digest)
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
              tipoDoConteudo: cabe ? tipoDeImagem(m.miniatura.type) : undefined,
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
                  ? {
                      digest: p.digestDoRetrato,
                      bytes: p.retrato.byteLength,
                      tipoDoConteudo: p.tipoDoConteudo,
                    }
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
    async listarConjuntos(bibliotecaId, filtro = {}) {
      const espacoId = await acharEspacoDaBiblioteca(bibliotecaId)
      const consulta = new URLSearchParams()
      for (const chave of ['busca', 'pasta', 'cursor', 'limite'] as const) {
        const valor = filtro[chave]
        if (valor !== undefined && valor !== null) consulta.set(chave, String(valor))
      }
      const pagina = await pedir<{
        itens: ConjuntoDeBiblioteca[]
        total: number
        proximo: string | null
      }>('GET', `bibliotecas/${bibliotecaId}/conjuntos?${consulta}`)
      return { ...pagina, itens: pagina.itens.map((c) => conjunto(c, espacoId)) }
    },
    async obterConjunto(id) {
      const r = await pedir<{ conjunto: ConjuntoDeBiblioteca; espacoId: string }>(
        'GET',
        `conjuntos/${id}`,
      )
      return conjunto(r.conjunto, r.espacoId)
    },
    async obterMundo(id) {
      return mundo(await pedir<MundoDoServidor>('GET', `mundos/${id}`))
    },
    async versaoDoConjunto(id, revisao) {
      if (!espacoDoConjunto.has(id)) await host.obterConjunto(id)
      const espacoId = espacoDoConjunto.get(id)!
      const v = await pedir<VersaoDeConjunto>('GET', `conjuntos/${id}/versoes/${revisao}`)
      for (const ref of [...v.conteudo.modelos, ...v.conteudo.texturas])
        espacoDaBiblioteca.set(ref.biblioteca, espacoId)
      return { ...v, miniatura: retrato(espacoId, v.miniatura) }
    },
    async criarConjunto(bibliotecaId, dados) {
      const espacoId = await acharEspacoDaBiblioteca(bibliotecaId)
      return conjunto(await pedir('POST', `bibliotecas/${bibliotecaId}/conjuntos`, dados), espacoId)
    },
    async editarConjunto(id, dados) {
      if (!espacoDoConjunto.has(id)) await host.obterConjunto(id)
      return conjunto(await pedir('PATCH', `conjuntos/${id}`, dados), espacoDoConjunto.get(id)!)
    },
    async editarConjuntoNaOficina(id) {
      const r = await pedir<{
        conjunto: ConjuntoDeBiblioteca
        mundo: MundoDoServidor
        cenario: CenarioDoServidor
      }>('POST', `conjuntos/${id}/editar`)
      return {
        conjunto: conjunto(r.conjunto, r.cenario.espacoId),
        mundo: mundo(r.mundo),
        cenario: cenarioAberto(r.cenario),
      }
    },
    async publicarConjunto(id, dados) {
      if (!espacoDoConjunto.has(id)) await host.obterConjunto(id)
      const r = await pedir<{
        conjunto: ConjuntoDeBiblioteca
        cenarios: Array<{ id: string; revisao: number }>
      }>('POST', `conjuntos/${id}/publicar`, dados)
      return { ...r, conjunto: conjunto(r.conjunto, espacoDoConjunto.get(id)!) }
    },
    async apagarConjunto(id) {
      await pedir('DELETE', `conjuntos/${id}`)
      espacoDoConjunto.delete(id)
    },
    async guardarMiniaturaDoConjunto(id, revisao, imagem, sinal) {
      sinal?.throwIfAborted()
      if (imagem.size < 1 || imagem.size > RETRATO_MAX_BYTES)
        throw new Error('A miniatura deve ter até 256 KB')
      const bytes = new Uint8Array(await imagem.arrayBuffer()),
        digest = await digestDosBytes(bytes)
      sinal?.throwIfAborted()
      const prefixo = `conjuntos/${id}/versoes/${revisao}/miniatura`
      const reserva = await pedir<Reserva>(
        'POST',
        `${prefixo}/reservar`,
        { digest, bytes: bytes.byteLength, tipoDoConteudo: tipoDeImagem(imagem.type) },
        sinal,
      )
      await subir(reserva, new Map([[digest, bytes]]), sinal)
      sinal?.throwIfAborted()
      await pedir('POST', prefixo, { espacoId: reserva.espacoId, digest }, sinal)
    },
    async conteudoDoModelo(ref, sinal) {
      sinal?.throwIfAborted()
      const espacoId = ref.espacoId ?? (await acharEspacoDaBiblioteca(ref.biblioteca))
      sinal?.throwIfAborted()
      // O app diz onde o arquivo está; a busca vai direto ao armazenamento, sem os cabeçalhos da
      // sessão (com eles o navegador barraria o pedido a outra origem).
      const { url } = await pedir<{ url: string }>(
        'GET',
        `espacos/${espacoId}/arquivos/${ref.digest}?tipo=modelo&como=endereco`,
        undefined,
        sinal,
      )
      let resposta: Response
      try {
        resposta = await enviar(url, { signal: sinal })
      } catch {
        sinal?.throwIfAborted()
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

    async listarTexturas(bibliotecaId, filtro = {}) {
      await acharEspacoDaBiblioteca(bibliotecaId)
      const consulta = new URLSearchParams()
      if (filtro.busca?.trim()) consulta.set('busca', filtro.busca.trim().slice(0, 120))
      if (filtro.pasta !== undefined) consulta.set('pasta', filtro.pasta)
      if (filtro.digest) consulta.set('digest', filtro.digest)
      if (filtro.cursor) consulta.set('cursor', filtro.cursor)
      if (filtro.limite) consulta.set('limite', String(filtro.limite))
      const pagina = await pedir<{
        itens: TexturaDoServidor[]
        total: number
        proximo: string | null
      }>('GET', `bibliotecas/${bibliotecaId}/texturas${consulta.size ? `?${consulta}` : ''}`)
      return { ...pagina, itens: pagina.itens.map(textura) }
    },
    async conteudoDaTextura(ref, sinal) {
      sinal?.throwIfAborted()
      const espacoId = ref.espacoId ?? (await acharEspacoDaBiblioteca(ref.biblioteca))
      const { url } = await pedir<{ url: string }>(
        'GET',
        `espacos/${espacoId}/arquivos/${ref.digest}?tipo=textura&como=endereco`,
        undefined,
        sinal,
      )
      const resposta = await enviar(url, { signal: sinal, credentials: 'omit' })
      if (!resposta.ok)
        throw new ErroDaOficina('Não consegui carregar a textura', resposta.status, null, null)
      if (!resposta.body) throw new ErroDaOficina('A textura está vazia', 0, null, null)
      const leitor = resposta.body.getReader(),
        partes: Uint8Array[] = []
      let tamanho = 0,
        completo = false
      try {
        while (true) {
          sinal?.throwIfAborted()
          const p = await leitor.read()
          if (p.done) break
          tamanho += p.value.byteLength
          if (tamanho > MAX_BYTES_DE_TEXTURA_CENARIO) throw new Error('A textura excede 4 MB')
          partes.push(p.value)
        }
        sinal?.throwIfAborted()
        const bytes = new Uint8Array(tamanho)
        let posicao = 0
        for (const parte of partes) {
          bytes.set(parte, posicao)
          posicao += parte.byteLength
        }
        completo = true
        return bytes.buffer
      } finally {
        if (!completo) await leitor.cancel().catch(() => undefined)
        leitor.releaseLock()
      }
    },
    async importarTexturas(bibliotecaId, texturas, aoAndar, sinal) {
      sinal?.throwIfAborted()
      await acharEspacoDaBiblioteca(bibliotecaId)
      const criadas: TexturaDeBiblioteca[] = []
      for (let inicio = 0; inicio < texturas.length; inicio += POR_LOTE) {
        sinal?.throwIfAborted()
        const lote = texturas.slice(inicio, inicio + POR_LOTE)
        const reserva = await pedir<Reserva>(
          'POST',
          `bibliotecas/${bibliotecaId}/texturas/reservar`,
          {
            texturas: lote.map((t) => ({
              digest: t.digest,
              bytes: t.conteudo.size,
              tipoDoConteudo: tipoDeImagem(t.conteudo.type),
            })),
          },
          sinal,
        )
        await subir(reserva, new Map(lote.map((t) => [t.digest, t.conteudo])), sinal)
        sinal?.throwIfAborted()
        const registradas = await pedir<TexturaDoServidor[]>(
          'POST',
          `bibliotecas/${bibliotecaId}/texturas`,
          {
            espacoId: reserva.espacoId,
            texturas: lote.map(({ conteudo: _conteudo, ...t }) => t),
          },
          sinal,
        )
        criadas.push(...registradas.map(textura))
        aoAndar?.(Math.min(inicio + POR_LOTE, texturas.length), texturas.length)
      }
      return criadas
    },
    async editarTextura(id, dados) {
      return textura(await pedir<TexturaDoServidor>('PATCH', `texturas/${id}`, dados))
    },
    async apagarTexturas(bibliotecaId, ids) {
      for (let inicio = 0; inicio < ids.length; inicio += 200)
        await pedir('POST', `bibliotecas/${bibliotecaId}/texturas/apagar`, {
          ids: ids.slice(inicio, inicio + 200),
        })
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
      return cenarioAberto(await pedir<CenarioDoServidor>('GET', `cenarios/${id}`))
    },
    async prepararExportacao(id, revisaoEsperada, sinal) {
      sinal?.throwIfAborted()
      const dados = await conferirPreparoDeExportacao(
        await pedir('POST', `cenarios/${id}/exportacao`, { revisaoEsperada }, sinal),
        id,
        revisaoEsperada,
      )
      sinal?.throwIfAborted()
      espacoDoCenario.set(id, dados.espacoId)
      return dados
    },
    async moverHistorico(id, revisaoEsperada, acao, operacaoId) {
      return cenarioAberto(
        await pedir<CenarioDoServidor>('POST', `cenarios/${id}/historico`, {
          revisaoEsperada,
          acao,
          operacaoId,
        }),
      )
    },
    async listarRevisoes(id, antes) {
      const pagina = await pedir<PaginaDeRevisoes>(
        'GET',
        `cenarios/${id}/revisoes${antes === undefined ? '' : `?antes=${antes}`}`,
      )
      if (!espacoDoCenario.has(id)) await host.abrirCenario(id)
      const espacoId = espacoDoCenario.get(id)
      return {
        ...pagina,
        retratoInicial: retrato(espacoId, pagina.retratoInicial),
        itens: pagina.itens.map((r) => ({ ...r, miniatura: retrato(espacoId, r.miniatura) })),
      }
    },
    async restaurarRevisao(id, revisaoEsperada, revisao, operacaoId) {
      return cenarioAberto(
        await pedir<CenarioDoServidor>('POST', `cenarios/${id}/restaurar`, {
          revisaoEsperada,
          revisao,
          operacaoId,
        }),
      )
    },
    async conteudoDoTerreno(cenarioId, digest, sinal) {
      if (!espacoDoCenario.has(cenarioId)) await host.abrirCenario(cenarioId)
      const { url } = await pedir<{ url: string }>(
        'GET',
        `espacos/${espacoDoCenario.get(cenarioId)}/arquivos/${digest}?como=endereco`,
        undefined,
        sinal,
      )
      const resposta = await enviar(url, { signal: sinal })
      if (!resposta.ok)
        throw new ErroDaOficina('Não consegui carregar o relevo', resposta.status, null, null)
      if (!resposta.body) throw new ErroDaOficina('A peça de terreno está vazia', 0, null, null)
      const leitor = resposta.body.getReader(),
        bytes = new Uint8Array(MAX_BYTES_RECURSO_TERRENO)
      let posicao = 0,
        completo = false
      try {
        while (true) {
          sinal?.throwIfAborted()
          const parte = await leitor.read()
          if (parte.done) break
          if (posicao + parte.value.byteLength > bytes.byteLength)
            throw new Error('A peça de terreno excede o tamanho permitido')
          bytes.set(parte.value, posicao)
          posicao += parte.value.byteLength
        }
        sinal?.throwIfAborted()
        const conteudo = bytes.slice(0, posicao)
        lerRecursoDeTerreno(conteudo)
        if ((await digestDosBytes(conteudo)) !== digest)
          throw new Error('O hash da peça de terreno é inválido')
        completo = true
        return conteudo.buffer
      } finally {
        if (!completo) await leitor.cancel().catch(() => undefined)
        leitor.releaseLock()
      }
    },
    async guardarRecursos(cenarioId, pecas, sinal) {
      const unicas = [...new Map(pecas.map((p) => [p.digest, p])).values()]
      if (unicas.length > MAX_RECURSOS_TERRENO) throw new Error('O terreno tem peças demais')
      let espacoId = espacoDoCenario.get(cenarioId)
      for (let i = 0; i < unicas.length; i += POR_LOTE) {
        const lote = unicas.slice(i, i + POR_LOTE)
        for (const p of lote) {
          sinal?.throwIfAborted()
          lerRecursoDeTerreno(p.conteudo)
          if ((await digestDosBytes(p.conteudo)) !== p.digest)
            throw new Error('O hash da peça de terreno é inválido')
        }
        const reserva = await pedir<Reserva>(
          'POST',
          `cenarios/${cenarioId}/recursos/reservar`,
          { recursos: lote.map((p) => ({ digest: p.digest, bytes: p.conteudo.byteLength })) },
          sinal,
        )
        if (espacoId && espacoId !== reserva.espacoId) throw new Error('O espaço do cenário mudou')
        espacoId = reserva.espacoId
        espacoDoCenario.set(cenarioId, espacoId)
        await subir(reserva, new Map(lote.map((p) => [p.digest, p.conteudo])), sinal)
      }
      if (!espacoId) {
        await host.abrirCenario(cenarioId)
        espacoId = espacoDoCenario.get(cenarioId)
      }
      if (!espacoId) throw new Error('O espaço do cenário não foi encontrado')
      return { espacoId, digests: unicas.map((p) => p.digest) }
    },
    async editarCenario(id, revisaoEsperada, comandos, operacaoId, recursos) {
      const { revisao } = await pedir<{ revisao: number }>('POST', `cenarios/${id}/lotes`, {
        revisaoEsperada,
        comandos,
        operacaoId,
        ...(recursos?.digests.length ? { recursos } : {}),
      })
      return { revisao }
    },
    async duplicarCenario(id) {
      return resumo(await pedir<ResumoDoServidor>('POST', `cenarios/${id}/duplicar`))
    },
    async apagarCenario(id) {
      await pedir('DELETE', `cenarios/${id}`)
    },
    async guardarCapa(cenarioId, revisao, imagem, sinal) {
      // A capa é um enfeite do cartão: grande demais, fica a anterior.
      if (imagem.size < 1 || imagem.size > CAPA_MAX_BYTES)
        throw new Error('O retrato deve ter até 512 KB')
      const bytes = new Uint8Array(await imagem.arrayBuffer())
      const digest = await digestDosBytes(bytes)
      const reserva = await pedir<Reserva>(
        'POST',
        `cenarios/${cenarioId}/capa/reservar`,
        {
          revisao,
          digest,
          bytes: bytes.byteLength,
          tipoDoConteudo: tipoDeImagem(imagem.type),
        },
        sinal,
      )
      if (reserva.retrato) return retrato(reserva.espacoId, reserva.retrato)!
      await subir(reserva, new Map([[digest, bytes]]), sinal)
      const resultado = await pedir<{ digest: string; revisao: number }>(
        'POST',
        `cenarios/${cenarioId}/capa`,
        { espacoId: reserva.espacoId, revisao, digest },
        sinal,
      )
      if (resultado.revisao !== revisao || !/^[a-f0-9]{64}$/.test(resultado.digest))
        throw new ErroDaOficina(
          'O servidor não confirmou o retrato desta versão',
          502,
          'CENARIOS_RETRATO',
          null,
        )
      return retrato(reserva.espacoId, resultado.digest)!
    },
  }
  return host
}
