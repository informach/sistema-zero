import {
  CenarioInvalido,
  FragmentoBasicoSchema,
  validarConteudoDeConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Ator,
  type Biblioteca,
  type ConferenciaDeBlob,
  type Conjunto,
  chaveDoBlob,
  type Espaco,
  LIMITES_DOS_CENARIOS,
  normalizarBusca,
  type VersaoDeConjunto,
} from '../../domain/cenarios/cenarios'
import {
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
} from '../../domain/cenarios/cenarios.errors'
import type { BlobReservado, CenariosRepository } from '../../domain/ports/cenarios-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { ArquivoAEnviar, CenarioView, MundoView } from './cenarios.service'

export interface ConjuntoView extends Omit<Conjunto, 'atualizadoEm'> {
  atualizadoEm: string
}
export interface VersaoDeConjuntoView extends Omit<VersaoDeConjunto, 'criadoEm' | 'autorId'> {
  criadoEm: string
}

interface Contexto {
  exigirAberto(ator: Ator): Promise<void>
  bibliotecaDe(ator: Ator, id: string): Promise<{ biblioteca: Biblioteca; espaco: Espaco }>
  abrirCenario(ator: Ator, id: string): Promise<CenarioView>
  abrirMundo(ator: Ator, id: string): Promise<MundoView>
  agora(): Date
  novoId(): string
  reservar(
    espacoId: string,
    blobs: BlobReservado[],
  ): Promise<{ espacoId: string; enviar: ArquivoAEnviar[] }>
}
const view = (c: Conjunto): ConjuntoView => ({ ...c, atualizadoEm: c.atualizadoEm.toISOString() })
const versaoView = ({ autorId: _autor, ...v }: VersaoDeConjunto): VersaoDeConjuntoView => ({
  ...v,
  criadoEm: v.criadoEm.toISOString(),
})

function metadados(d: { nome?: string; pasta?: string; etiquetas?: string[] }) {
  const nome = d.nome?.trim(),
    pasta = d.pasta?.trim()
  const etiquetas = d.etiquetas && [...new Set(d.etiquetas.map((e) => e.trim()).filter(Boolean))]
  if (nome !== undefined && (!nome || nome.length > 120))
    throw new ValidationError('O nome precisa ter de 1 a 120 letras')
  if (pasta !== undefined && pasta.length > 240)
    throw new ValidationError('A pasta passa de 240 letras')
  if (etiquetas && (etiquetas.length > 16 || etiquetas.some((e) => e.length > 40)))
    throw new ValidationError('Use até 16 etiquetas de até 40 letras')
  return {
    ...(nome !== undefined ? { nome } : {}),
    ...(pasta !== undefined ? { pasta } : {}),
    ...(etiquetas !== undefined ? { etiquetas } : {}),
  }
}
function operacao(id: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id))
    throw new ValidationError('A operação precisa de um identificador de 8 a 64 caracteres')
  return id
}
function conteudo(valor: unknown, espacoId: string) {
  const f = FragmentoBasicoSchema.safeParse(valor)
  if (!f.success)
    throw new CenarioInvalidoError(['O conteúdo não é um fragmento de objetos válido'])
  try {
    return validarConteudoDeConjunto(f.data, espacoId)
  } catch (e) {
    if (e instanceof CenarioInvalido) throw new CenarioInvalidoError(e.problemas)
    throw e
  }
}

/** Catálogo da mesma oficina: autorização do espaço e publicação pelo repositório transacional. */
export class ConjuntosService {
  constructor(
    private readonly repo: CenariosRepository,
    private readonly contexto: Contexto,
  ) {}

  private async de(ator: Ator, id: string) {
    await this.contexto.exigirAberto(ator)
    const conjunto = await this.repo.conjunto(id)
    if (!conjunto) throw new CenarioNaoEncontradoError('O conjunto')
    const { espaco } = await this.contexto.bibliotecaDe(ator, conjunto.bibliotecaId)
    return { conjunto, espaco }
  }
  async listar(
    ator: Ator,
    bibliotecaId: string,
    filtro: { busca?: string; pasta?: string; cursor?: string; limite?: number },
  ) {
    await this.contexto.bibliotecaDe(ator, bibliotecaId)
    const inicio = Number(filtro.cursor ?? 0),
      limite = filtro.limite ?? 60
    if (
      !Number.isSafeInteger(inicio) ||
      inicio < 0 ||
      !Number.isInteger(limite) ||
      limite < 1 ||
      limite > LIMITES_DOS_CENARIOS.paginaDeModelos
    )
      throw new ValidationError('A página de conjuntos está fora do intervalo')
    const pagina = await this.repo.conjuntos(bibliotecaId, {
      termos: normalizarBusca(filtro.busca ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 8),
      ...(filtro.pasta !== undefined ? { pasta: filtro.pasta } : {}),
      inicio,
      limite,
    })
    return {
      itens: pagina.itens.map(view),
      total: pagina.total,
      proximo: inicio + pagina.itens.length < pagina.total ? String(inicio + limite) : null,
    }
  }
  async abrir(ator: Ator, id: string) {
    const { conjunto, espaco } = await this.de(ator, id)
    return { conjunto: view(conjunto), espacoId: espaco.id }
  }
  async versao(ator: Ator, id: string, revisao: number) {
    await this.de(ator, id)
    if (!Number.isInteger(revisao) || revisao < 1)
      throw new ValidationError('A revisão precisa ser um inteiro positivo')
    const v = await this.repo.versaoDoConjunto(id, revisao)
    if (!v) throw new CenarioNaoEncontradoError('A revisão do conjunto')
    return versaoView(v)
  }
  async criar(
    ator: Ator,
    bibliotecaId: string,
    dados: {
      nome: string
      pasta?: string
      etiquetas?: string[]
      conteudo: unknown
      operacaoId: string
    },
  ) {
    const { espaco } = await this.contexto.bibliotecaDe(ator, bibliotecaId)
    const m = metadados(dados)
    const c = await this.repo.criarConjunto(
      {
        id: this.contexto.novoId(),
        bibliotecaId,
        nome: m.nome!,
        pasta: m.pasta ?? '',
        etiquetas: m.etiquetas ?? [],
        conteudo: conteudo(dados.conteudo, espaco.id),
        operacaoId: operacao(dados.operacaoId),
        autorId: ator.usuarioId,
      },
      LIMITES_DOS_CENARIOS.conjuntosPorBiblioteca,
      this.contexto.agora(),
    )
    if (!c) throw new CenarioNaoEncontradoError('A biblioteca')
    return view(c)
  }
  async editar(
    ator: Ator,
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
  ) {
    await this.de(ator, id)
    const c = await this.repo.editarConjunto(id, metadados(dados), this.contexto.agora())
    if (!c) throw new CenarioNaoEncontradoError('O conjunto')
    return view(c)
  }
  async editarNaOficina(ator: Ator, id: string) {
    await this.de(ator, id)
    const fonte = await this.repo.prepararEdicaoDeConjunto(
      id,
      ator.usuarioId,
      this.contexto.agora(),
    )
    if (!fonte) throw new CenarioNaoEncontradoError('O conjunto')
    const { conjunto } = await this.de(ator, id)
    const [mundo, cenario] = await Promise.all([
      this.contexto.abrirMundo(ator, fonte.mundoId),
      this.contexto.abrirCenario(ator, fonte.cenarioId),
    ])
    return { conjunto: view(conjunto), mundo, cenario }
  }
  async publicar(
    ator: Ator,
    id: string,
    dados: {
      revisaoEsperada: number
      operacaoId: string
      conteudo: unknown
      rascunho?: { cenarioId: string; revisao: number }
    },
  ) {
    const { conjunto, espaco } = await this.de(ator, id)
    if (!Number.isInteger(dados.revisaoEsperada) || dados.revisaoEsperada < 1)
      throw new ValidationError('Informe a revisão publicada que está editando')
    if (dados.rascunho) {
      if (dados.rascunho.cenarioId !== conjunto.cenarioDeEdicaoId)
        throw new CenarioNaoEncontradoError('O rascunho')
    }
    const r = await this.repo.publicarConjunto(
      {
        id,
        revisaoEsperada: dados.revisaoEsperada,
        operacaoId: operacao(dados.operacaoId),
        conteudo: conteudo(dados.conteudo, espaco.id),
        autorId: ator.usuarioId,
        ...(dados.rascunho ? { rascunho: dados.rascunho } : {}),
      },
      LIMITES_DOS_CENARIOS.versoesPorConjunto,
      this.contexto.agora(),
    )
    if (!r) throw new CenarioNaoEncontradoError('O conjunto')
    return { conjunto: view(r.conjunto), cenarios: r.cenarios }
  }
  async apagar(ator: Ator, id: string) {
    const { espaco } = await this.de(ator, id)
    return {
      apagar: (await this.repo.apagarConjunto(id, this.contexto.agora())).map((d) =>
        chaveDoBlob(espaco.id, d),
      ),
    }
  }
  async reservarMiniatura(
    ator: Ator,
    id: string,
    revisao: number,
    imagem: { digest: string; bytes: number; tipoDoConteudo: 'image/png' | 'image/webp' },
  ) {
    const { espaco } = await this.de(ator, id)
    await this.versao(ator, id, revisao)
    if (
      !/^[a-f0-9]{64}$/.test(imagem.digest) ||
      !Number.isInteger(imagem.bytes) ||
      imagem.bytes < 1 ||
      imagem.bytes > LIMITES_DOS_CENARIOS.miniaturaBytes ||
      !['image/png', 'image/webp'].includes(imagem.tipoDoConteudo)
    )
      throw new ValidationError('Envie uma miniatura PNG ou WebP de até 256 KB')
    return this.contexto.reservar(espaco.id, [{ ...imagem, tipo: 'miniatura' }])
  }
  /** Chamado pelo BFF após conferir o bucket; associação e confirmação são atômicas. */
  async definirMiniatura(
    ator: Ator,
    id: string,
    revisao: number,
    digest: string,
    recurso: { espacoId: string; conferido: ConferenciaDeBlob },
  ) {
    const { espaco } = await this.de(ator, id)
    if (espaco.id !== recurso.espacoId) throw new CenarioNaoEncontradoError('O conjunto')
    if (
      !(await this.repo.definirMiniaturaDoConjunto(
        id,
        revisao,
        digest,
        this.contexto.agora(),
        recurso,
      ))
    )
      throw new CenarioNaoEncontradoError('A revisão do conjunto')
    return { ok: true }
  }
}
