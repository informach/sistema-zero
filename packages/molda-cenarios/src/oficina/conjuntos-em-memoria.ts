import {
  conferirFormatoDoCenarioDeConjunto,
  conteudoDoCenarioDeConjunto,
  type DefinicaoDeConjunto,
  type DocumentoDeCenario,
  digestDosBytes,
  documentoParaEditarConjunto,
  type FragmentoBasico,
  igual,
  referenciarConjunto,
  validarConteudoDeConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import type { CenarioGuardado } from './host-memoria'
import type { ImagensEmMemoria } from './imagens-em-memoria'
import {
  type Biblioteca,
  CenarioDesatualizado,
  type CenariosHost,
  type ConjuntoDeBiblioteca,
  type Espaco,
  type Mundo,
  type VersaoDeConjunto,
} from './portas'

type Operacao =
  | 'listarConjuntos'
  | 'obterConjunto'
  | 'versaoDoConjunto'
  | 'criarConjunto'
  | 'editarConjunto'
  | 'editarConjuntoNaOficina'
  | 'publicarConjunto'
  | 'apagarConjunto'
  | 'guardarMiniaturaDoConjunto'
type DefinicaoPublicada = Omit<DefinicaoDeConjunto, 'id'>
export type PrepararLoteDoEnsaio = (
  ...args: [...Parameters<CenariosHost['editarCenario']>, publicando?: DefinicaoPublicada]
) => () => { revisao: number }
interface Contexto {
  imagens: ImagensEmMemoria
  bibliotecas: Map<string, Biblioteca>
  mundos: Map<string, Mundo>
  cenarios: Map<string, CenarioGuardado>
  novoId(prefixo: string): string
  agora(): string
  esperar(): Promise<void>
  espaco(id: string): Espaco
  conferirArquivos(f: FragmentoBasico, espacoId: string): void
  prepararLote: PrepararLoteDoEnsaio
  abrirCenario(id: string): ReturnType<CenariosHost['abrirCenario']>
  apagarFonte(id: string): void
}
interface Registro {
  conjunto: ConjuntoDeBiblioteca
  criacao: { operacaoId: string; nome: string; conteudo: FragmentoBasico }
  versoes: Map<number, VersaoDeConjunto>
  publicacoes: Map<
    string,
    { conteudo: FragmentoBasico; cenarios: Array<{ id: string; revisao: number }> }
  >
}
const copia = <T>(v: T): T => structuredClone(v)
const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
const bytesDo = (f: FragmentoBasico) => new TextEncoder().encode(JSON.stringify(f)).length

/** Persistência de ensaio; usa a mesma preparação/gravação de gestos da oficina. */
export function criarConjuntosEmMemoria(ctx: Contexto) {
  const registros = new Map<string, Registro>()
  const exigir = (id: string) => {
    const r = registros.get(id)
    if (!r) throw new Error('O conjunto não existe mais')
    return r
  }
  const biblioteca = (id: string) => {
    const b = ctx.bibliotecas.get(id)
    if (!b) throw new Error('A biblioteca não existe mais')
    return b
  }
  const espacoDo = (r: Registro) => biblioteca(r.conjunto.bibliotecaId).espacoId
  const conferir = (f: FragmentoBasico, espacoId: string) => {
    const valido = validarConteudoDeConjunto(f, espacoId)
    ctx.conferirArquivos(valido, espacoId)
    return valido
  }
  const cota = (espacoId: string, bytes: number) => {
    const e = ctx.espaco(espacoId)
    if (e.usadoBytes + bytes > e.limiteBytes) throw new Error('O espaço está cheio')
    return e
  }
  const metadados = (d: { nome?: string; pasta?: string; etiquetas?: string[] }) => {
    const nome = d.nome?.trim(),
      pasta = d.pasta?.trim(),
      etiquetas = d.etiquetas && [...new Set(d.etiquetas.map((e) => e.trim()).filter(Boolean))]
    if (nome !== undefined && (!nome || nome.length > 120))
      throw new Error('O nome precisa ter de 1 a 120 letras')
    if (pasta !== undefined && pasta.length > 240) throw new Error('A pasta passa de 240 letras')
    if (etiquetas && (etiquetas.length > 16 || etiquetas.some((e) => e.length > 40)))
      throw new Error('Use até 16 etiquetas de até 40 letras')
    return {
      ...(nome !== undefined ? { nome } : {}),
      ...(pasta !== undefined ? { pasta } : {}),
      ...(etiquetas !== undefined ? { etiquetas } : {}),
    }
  }
  const soltarFoto = (dono: string) => {
    ctx.imagens.soltar(`conjunto:${dono}`)
  }
  const remover = (id: string) => {
    const r = exigir(id),
      espaco = ctx.espaco(espacoDo(r))
    registros.delete(id)
    for (const v of r.versoes.values()) {
      espaco.usadoBytes -= v.bytes
      soltarFoto(`${id}:${v.revisao}`)
    }
    if (r.conjunto.cenarioDeEdicaoId) ctx.apagarFonte(r.conjunto.cenarioDeEdicaoId)
  }
  const operacao = (id: string) => {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id))
      throw new Error('Use um identificador de operação de 8 a 64 caracteres')
  }
  const host: Pick<CenariosHost, Operacao> = {
    async listarConjuntos(bibliotecaId, filtro = {}) {
      await ctx.esperar()
      biblioteca(bibliotecaId)
      const termos = normal(filtro.busca ?? '')
        .split(/\s+/)
        .filter(Boolean)
      const todos = [...registros.values()]
        .map((r) => r.conjunto)
        .filter(
          (c) =>
            c.bibliotecaId === bibliotecaId &&
            (filtro.pasta === undefined || c.pasta === filtro.pasta) &&
            termos.every((t) =>
              normal(`${c.nome} ${c.pasta} ${c.etiquetas.join(' ')}`).includes(t),
            ),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      const inicio = Number(filtro.cursor ?? 0),
        limite = filtro.limite ?? 60
      if (
        !Number.isSafeInteger(inicio) ||
        inicio < 0 ||
        !Number.isInteger(limite) ||
        limite < 1 ||
        limite > 200
      )
        throw new Error('A página está fora do intervalo')
      return copia({
        itens: todos.slice(inicio, inicio + limite),
        total: todos.length,
        proximo: inicio + limite < todos.length ? String(inicio + limite) : null,
      })
    },
    async obterConjunto(id) {
      await ctx.esperar()
      return copia(exigir(id).conjunto)
    },
    async versaoDoConjunto(id, revisao) {
      await ctx.esperar()
      const v = exigir(id).versoes.get(revisao)
      if (!v) throw new Error('A revisão não existe mais')
      return copia(v)
    },
    async criarConjunto(bibliotecaId, dados) {
      await ctx.esperar()
      operacao(dados.operacaoId)
      const b = biblioteca(bibliotecaId),
        f = conferir(dados.conteudo, b.espacoId),
        m = metadados(dados)
      const existente = [...registros.values()].find(
        (r) =>
          r.conjunto.bibliotecaId === bibliotecaId && r.criacao.operacaoId === dados.operacaoId,
      )
      if (existente) {
        if (!igual(existente.criacao.conteudo, f) || existente.criacao.nome !== m.nome)
          throw new Error('Esta operação já criou outro conteúdo')
        return copia(existente.conjunto)
      }
      if (
        [...registros.values()].filter((r) => r.conjunto.bibliotecaId === bibliotecaId).length >=
        1000
      )
        throw new Error('Esta biblioteca chegou ao limite de conjuntos')
      const bytes = bytesDo(f),
        espaco = cota(b.espacoId, bytes),
        id = ctx.novoId('conjunto')
      const snapshot = copia(f)
      const conjunto: ConjuntoDeBiblioteca = {
        id,
        bibliotecaId,
        nome: m.nome!,
        pasta: m.pasta ?? '',
        etiquetas: m.etiquetas ?? [],
        revisao: 1,
        cenarioDeEdicaoId: null,
        revisaoPublicadaDoCenario: null,
        miniatura: null,
        bytes,
        objetos: f.instancias.length,
        atualizadoEm: ctx.agora(),
      }
      registros.set(id, {
        conjunto,
        criacao: { operacaoId: dados.operacaoId, nome: conjunto.nome, conteudo: snapshot },
        publicacoes: new Map(),
        versoes: new Map([
          [
            1,
            {
              conjuntoId: id,
              revisao: 1,
              nome: conjunto.nome,
              conteudo: snapshot,
              miniatura: null,
              bytes,
              objetos: f.instancias.length,
              criadoEm: conjunto.atualizadoEm,
            },
          ],
        ]),
      })
      espaco.usadoBytes += bytes
      return copia(conjunto)
    },
    async editarConjunto(id, dados) {
      await ctx.esperar()
      const c = exigir(id).conjunto
      Object.assign(c, metadados(dados), { atualizadoEm: ctx.agora() })
      return copia(c)
    },
    async editarConjuntoNaOficina(id) {
      await ctx.esperar()
      const r = exigir(id),
        c = r.conjunto,
        espacoId = espacoDo(r)
      if (!c.cenarioDeEdicaoId) {
        const v = r.versoes.get(c.revisao)!,
          cenarioId = ctx.novoId('fonte')
        const documento = documentoParaEditarConjunto(v.conteudo, cenarioId, c.nome, espacoId)
        let mundo = [...ctx.mundos.values()].find((m) => m.bibliotecaConjuntosId === c.bibliotecaId)
        if (!mundo) {
          mundo = {
            id: ctx.novoId('conjuntos'),
            espacoId,
            bibliotecaConjuntosId: c.bibliotecaId,
            nome: 'Conjuntos da biblioteca',
            cenarios: 0,
            bibliotecas: [],
            capa: null,
            atualizadoEm: ctx.agora(),
          }
          ctx.mundos.set(mundo.id, mundo)
        }
        mundo.bibliotecas = [
          ...new Set([
            ...mundo.bibliotecas,
            c.bibliotecaId,
            ...v.conteudo.modelos.map((m) => m.biblioteca),
            ...v.conteudo.texturas.map((t) => t.biblioteca),
          ]),
        ].filter((id) => ctx.bibliotecas.get(id)?.espacoId === espacoId)
        ctx.cenarios.set(cenarioId, {
          resumo: {
            id: cenarioId,
            mundoId: mundo.id,
            nome: c.nome,
            revisao: 0,
            capa: null,
            atualizadoEm: ctx.agora(),
          },
          documento,
          operacoes: new Map(),
          passado: [],
          futuro: [],
          lotes: new Map(),
          versoes: new Map(),
        })
        mundo.cenarios++
        c.cenarioDeEdicaoId = cenarioId
        c.revisaoPublicadaDoCenario = 0
      }
      const fonte = ctx.cenarios.get(c.cenarioDeEdicaoId)!
      return {
        conjunto: copia(c),
        mundo: copia(ctx.mundos.get(fonte.resumo.mundoId)!),
        cenario: await ctx.abrirCenario(fonte.resumo.id),
      }
    },
    async publicarConjunto(id, dados) {
      operacao(dados.operacaoId)
      const chaveOperacao = `conjunto:${await digestDosBytes(new TextEncoder().encode(`${id}:${dados.operacaoId}`))}`
      await ctx.esperar()
      const r = exigir(id),
        c = r.conjunto,
        espacoId = espacoDo(r),
        f = conferir(dados.conteudo, espacoId)
      const repetida = r.publicacoes.get(dados.operacaoId)
      if (repetida) {
        if (!igual(repetida.conteudo, f))
          throw new Error('Esta operação já publicou outro conteúdo')
        return copia({ conjunto: c, cenarios: repetida.cenarios })
      }
      if (c.revisao !== dados.revisaoEsperada) throw new CenarioDesatualizado(c.revisao)
      if (c.revisao >= 1000) throw new Error('Este conjunto chegou ao limite de versões')
      const fonte = c.cenarioDeEdicaoId ? ctx.cenarios.get(c.cenarioDeEdicaoId) : undefined
      let publicarFonte: (() => { revisao: number }) | null = null
      let revisaoDaFonte = fonte?.resumo.revisao ?? null
      if (dados.rascunho) {
        if (!fonte || fonte.resumo.id !== dados.rascunho.cenarioId)
          throw new Error('Este rascunho não pertence ao conjunto')
        if (fonte.resumo.revisao !== dados.rascunho.revisao)
          throw new CenarioDesatualizado(fonte.resumo.revisao)
        if (!igual(conteudoDoCenarioDeConjunto(fonte.documento, espacoId), f))
          throw new Error('O conteúdo diverge do rascunho salvo')
      } else if (fonte) {
        if (fonte.resumo.revisao !== c.revisaoPublicadaDoCenario)
          throw new Error(
            'Há alterações não publicadas no conjunto. Abra o rascunho para continuar.',
          )
        const documento = documentoParaEditarConjunto(f, fonte.resumo.id, c.nome, espacoId)
        if (!igual(documento, fonte.documento)) {
          publicarFonte = ctx.prepararLote(
            fonte.resumo.id,
            fonte.resumo.revisao,
            [{ tipo: 'cenario.restaurar', documento }],
            `${chaveOperacao}:fonte`,
          )
          revisaoDaFonte = fonte.resumo.revisao + 1
        }
      }
      const bytes = bytesDo(f),
        espaco = cota(espacoId, bytes),
        revisao = c.revisao + 1
      const planos = [...ctx.cenarios.values()]
        .filter(
          (s) =>
            ctx.mundos.get(s.resumo.mundoId)?.espacoId === espacoId &&
            s.documento.montagens?.some((m) =>
              s.documento.definicoesConjuntos?.some(
                (d) => d.id === m.definicao && d.biblioteca === c.bibliotecaId && d.conjunto === id,
              ),
            ),
        )
        .map((s) => {
          const { definicao } = referenciarConjunto(s.documento, {
            biblioteca: c.bibliotecaId,
            conjunto: id,
            revisao,
            nome: c.nome,
            conteudo: f,
          })
          return {
            id: s.resumo.id,
            aplicar: ctx.prepararLote(
              s.resumo.id,
              s.resumo.revisao,
              [{ tipo: 'conjunto.atualizar', definicao }],
              chaveOperacao,
              undefined,
              definicao,
            ),
          }
        })
      // Não há await entre preparar todas as mudanças e gravá-las: uma só troca de estado do ensaio.
      const snapshot = copia(f)
      publicarFonte?.()
      const cenarios = planos.map((p) => ({ id: p.id, revisao: p.aplicar().revisao }))
      r.versoes.set(revisao, {
        conjuntoId: id,
        revisao,
        nome: c.nome,
        conteudo: snapshot,
        miniatura: null,
        bytes,
        objetos: f.instancias.length,
        criadoEm: ctx.agora(),
      })
      r.publicacoes.set(dados.operacaoId, { conteudo: snapshot, cenarios })
      Object.assign(c, {
        revisao,
        revisaoPublicadaDoCenario: revisaoDaFonte,
        miniatura: null,
        bytes,
        objetos: f.instancias.length,
        atualizadoEm: ctx.agora(),
      })
      espaco.usadoBytes += bytes
      return copia({ conjunto: c, cenarios })
    },
    async apagarConjunto(id) {
      await ctx.esperar()
      remover(id)
    },
    async guardarMiniaturaDoConjunto(id, revisao, imagem, sinal) {
      const preparada = await ctx.imagens.preparar(imagem, 256 * 1024, sinal)
      await ctx.esperar()
      sinal?.throwIfAborted()
      const r = exigir(id),
        v = r.versoes.get(revisao)
      if (!v) throw new Error('A revisão não existe mais')
      v.miniatura = ctx.imagens.fixar(`conjunto:${id}:${revisao}`, espacoDo(r), preparada)
      if (r.conjunto.revisao === revisao) r.conjunto.miniatura = v.miniatura
    },
  }
  return {
    host,
    organizacaoDaBiblioteca(id: string) {
      return [...registros.values()]
        .filter((r) => r.conjunto.bibliotecaId === id)
        .map((r) => ({ pasta: r.conjunto.pasta, etiquetas: [...r.conjunto.etiquetas] }))
    },
    conferirCenario(id: string, d: DocumentoDeCenario, publicando?: DefinicaoPublicada) {
      const espacoId = ctx.mundos.get(ctx.cenarios.get(id)!.resumo.mundoId)!.espacoId
      const fixadas = new Map(d.definicoesConjuntos?.map((f) => [f.id, f]))
      for (const f of fixadas.values()) ctx.conferirArquivos(f.conteudo, espacoId)
      for (const m of d.montagens ?? []) {
        const f = fixadas.get(m.definicao)!,
          r = registros.get(f.conjunto)
        if (!r) continue
        const proposta =
          publicando?.conjunto === r.conjunto.id && publicando.revisao === f.revisao
            ? publicando
            : null
        const v = proposta ?? r.versoes.get(f.revisao)
        if (
          espacoDo(r) !== espacoId ||
          r.conjunto.bibliotecaId !== f.biblioteca ||
          !v ||
          v.nome !== f.nome ||
          !igual(v.conteudo, f.conteudo)
        )
          throw new Error('A definição fixada diverge da revisão da biblioteca')
      }
      const fonte = [...registros.values()].find((r) => r.conjunto.cenarioDeEdicaoId === id)
      if (!fonte) return
      conferirFormatoDoCenarioDeConjunto(d)
      if (
        d.montagens?.some((m) =>
          d.definicoesConjuntos?.some(
            (f) => f.id === m.definicao && f.conjunto === fonte.conjunto.id,
          ),
        )
      )
        throw new Error('Um conjunto não pode conter uma cópia de si mesmo')
    },
    ehFonte(id: string) {
      return [...registros.values()].some((r) => r.conjunto.cenarioDeEdicaoId === id)
    },
    apagarDaBiblioteca(id: string) {
      for (const r of [...registros.values()])
        if (r.conjunto.bibliotecaId === id) remover(r.conjunto.id)
    },
    texturasFixadas(espacoId: string) {
      const digests = new Set<string>()
      for (const r of registros.values())
        if (espacoDo(r) === espacoId)
          for (const v of r.versoes.values())
            for (const t of v.conteudo.texturas) digests.add(t.digest)
      return digests
    },
  }
}
