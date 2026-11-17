import { CenarioInvalido } from '../validacao'
import { posicaoNoMundo } from './chao'
import type { ComandoDeCenario } from './comandos'
import {
  type DefinicaoDeConjunto,
  DefinicaoDeConjuntoSchema,
  type MontagemDeConjunto,
} from './conjuntos-schema'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  DocumentoDeCenarioSchema,
  LIMITES_CENARIO_V2,
} from './documento'
import { validarFragmento } from './fragmento'
import { igual } from './igual'
import { comporGiros } from './rotacao'
import { transformarPonto } from './volume'

const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}
const semId = ({ id: _id, ...resto }: { id: string }) => resto

/** A biblioteca e os agentes fixam referências sem sobrescrever aliases existentes. */
export function referenciarConjunto(
  doc: DocumentoDeCenario,
  entrada: Omit<DefinicaoDeConjunto, 'id'>,
): {
  definicao: DefinicaoDeConjunto
  comandos: ComandoDeCenario[]
} {
  const equivalente = doc.definicoesConjuntos?.find(
    (d) =>
      d.biblioteca === entrada.biblioteca &&
      d.conjunto === entrada.conjunto &&
      d.revisao === entrada.revisao,
  )
  const base = `${entrada.conjunto.slice(0, 180)}/v${entrada.revisao}`
  let id = equivalente?.id ?? base
  for (let n = 0; !equivalente && doc.definicoesConjuntos?.some((d) => d.id === id); n++)
    id = `${base}/${n}`
  const definicao = DefinicaoDeConjuntoSchema.parse({ ...entrada, id })
  if (equivalente && !igual(equivalente, definicao)) falhar('A revisão do conjunto é imutável')
  return { definicao, comandos: equivalente ? [] : [{ tipo: 'conjunto.definir', definicao }] }
}

/** Projeção de leitura: autoria conserva raízes e definições; o palco recebe peças resolvidas. */
export function resolverConjuntos(entrada: DocumentoDeCenario): {
  documento: DocumentoDeCenario
  origens: ReadonlyMap<string, string>
} {
  const origens = new Map<string, string>()
  if (!entrada.montagens?.length && !entrada.definicoesConjuntos?.length)
    return { documento: entrada, origens }
  const doc = DocumentoDeCenarioSchema.parse(entrada),
    definicoes = new Map(doc.definicoesConjuntos?.map((d) => [d.id, d]))
  if (definicoes.size !== (doc.definicoesConjuntos?.length ?? 0))
    falhar('Uma definição de conjunto está repetida')
  if (new TextEncoder().encode(JSON.stringify(doc)).length > LIMITES_CENARIO_V2.bytes)
    falhar('O conjunto excede o orçamento do documento')
  const fontes = new Map<string, ReturnType<typeof validarFragmento>>()
  const revisoes = new Set<string>()
  for (const d of definicoes.values()) {
    const identidade = JSON.stringify([d.biblioteca, d.conjunto, d.revisao])
    if (revisoes.has(identidade)) falhar('Uma revisão de conjunto está fixada mais de uma vez')
    revisoes.add(identidade)
    fontes.set(d.id, validarFragmento(d.conteudo))
  }
  const total =
    doc.instancias.length +
    (doc.montagens ?? []).reduce((n, m) => {
      const f = fontes.get(m.definicao)
      if (!f) falhar('Uma montagem está sem definição fixada')
      return n + f!.instancias.length
    }, 0)
  if (total > LIMITES_CENARIO_V2.objetos)
    falhar('A expansão dos conjuntos excede o orçamento de objetos')
  const montagens = doc.montagens ?? []
  delete doc.montagens
  delete doc.definicoesConjuntos
  const usados = new Set(
    [...doc.grupos, ...doc.instancias, ...doc.caminhos, ...doc.aguas, ...doc.marcadores].map(
      (e) => e.id,
    ),
  )
  const reservar = (id: string) => {
    if (usados.has(id)) falhar('Um identificador da montagem já está em uso')
    usados.add(id)
    return id
  }
  const tabelas = new Map<string, { modelos: Map<string, string>; camadas: Map<string, string> }>()
  const idsDosModelos = new Set([...doc.modelos, ...(doc.formas ?? [])].map((e) => e.id))
  const referenciar = <T extends { id: string }>(
    atuais: T[],
    novos: readonly T[],
    prefixo: string,
    chave: (t: T) => unknown,
    reservados?: Set<string>,
  ) => {
    const chaves = new Map(atuais.map((e) => [JSON.stringify(chave(e)), e.id])),
      ids = reservados ?? new Set(atuais.map((e) => e.id)),
      mapa = new Map<string, string>()
    for (const [i, e] of novos.entries()) {
      const k = JSON.stringify(chave(e))
      let id = chaves.get(k)
      if (!id) {
        let n = 0
        id = `${prefixo}/${i}`
        while (ids.has(id)) id = `${prefixo}/${i}/${n++}`
        ids.add(id)
        atuais.push({ ...e, id })
        chaves.set(k, id)
      }
      mapa.set(e.id, id)
    }
    return mapa
  }
  const texturas = new Map<string, Map<string, string>>()
  const usadas = new Set(montagens.map((m) => m.definicao))
  for (const [i, [id, f]] of [...fontes].entries()) {
    if (!usadas.has(id)) continue
    const modelos = referenciar(
      doc.modelos,
      f.modelos,
      `conjunto-recurso/${i}/modelo`,
      (m) => [
        m.biblioteca,
        m.modelo,
        m.digest,
        m.volume
          ? [
              m.volume.min.x,
              m.volume.min.y,
              m.volume.min.z,
              m.volume.max.x,
              m.volume.max.y,
              m.volume.max.z,
            ]
          : null,
      ],
      idsDosModelos,
    )
    if (f.formas.length) {
      doc.formas ??= []
      const formas = referenciar(
        doc.formas,
        f.formas,
        `conjunto-recurso/${i}/forma`,
        semId,
        idsDosModelos,
      )
      for (const [a, b] of formas) modelos.set(a, b)
    }
    if (f.texturas.length) {
      doc.texturas ??= []
      texturas.set(
        id,
        referenciar(doc.texturas, f.texturas, `conjunto-recurso/${i}/textura`, (t) => [
          t.biblioteca,
          t.textura,
          t.digest,
        ]),
      )
    }
    let camadas = new Map<string, string>()
    if (f.camadas.length) {
      doc.camadas ??= []
      camadas = referenciar(doc.camadas, f.camadas, `conjunto-recurso/${i}/camada`, semId)
    }
    tabelas.set(id, { modelos, camadas })
  }
  const montar = (m: MontagemDeConjunto) => {
    const f = fontes.get(m.definicao)!,
      tabela = tabelas.get(m.definicao)!
    const fonte = {
      ...criarDocumentoVazio('fonte', 'Conjunto'),
      modelos: f.modelos,
      instancias: f.instancias,
      grupos: f.grupos,
      ...(f.formas.length ? { formas: f.formas } : {}),
      ...(f.texturas.length ? { texturas: f.texturas } : {}),
      ...(f.camadas.length ? { camadas: f.camadas } : {}),
    }
    const grupos = new Map(f.grupos.map((g, i) => [g.id, reservar(`${m.id}/grupo/${i}`)]))
    reservar(m.id)
    const { definicao: _definicao, transformacao: _transformacao, ...raiz } = m
    doc.grupos.push(raiz)
    const organizacao = (e: { grupo: string | null; camada?: string | null }) => ({
      grupo: e.grupo ? grupos.get(e.grupo)! : m.id,
      ...(e.camada !== undefined
        ? { camada: e.camada ? tabela.camadas.get(e.camada)! : null }
        : {}),
    })
    for (const g of f.grupos) {
      const id = grupos.get(g.id)!
      doc.grupos.push({ ...g, ...organizacao(g), id })
      origens.set(id, m.id)
    }
    for (const [i, o] of f.instancias.entries()) {
      const p = posicaoNoMundo(fonte, o),
        t = m.transformacao
      const local = { x: p.x - f.ancora.x, y: p.y - f.ancora.y, z: p.z - f.ancora.z }
      const id = reservar(`${m.id}/objeto/${i}`),
        posicao = transformarPonto(local, t)
      doc.instancias.push({
        ...o,
        ...organizacao(o),
        id,
        modelo: tabela.modelos.get(o.modelo)!,
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao,
          rotacao: comporGiros(t.rotacao, o.transformacao.rotacao),
          escala: {
            x: o.transformacao.escala.x * t.escala.x,
            y: o.transformacao.escala.y * t.escala.y,
            z: o.transformacao.escala.z * t.escala.z,
          },
        },
        ...(o.aparencia?.textura
          ? {
              aparencia: {
                ...o.aparencia,
                textura: {
                  ...o.aparencia.textura,
                  id: texturas.get(m.definicao)!.get(o.aparencia.textura.id)!,
                },
              },
            }
          : {}),
      })
      origens.set(id, m.id)
    }
  }
  for (const m of montagens) montar(m)
  if (
    doc.modelos.length > LIMITES_CENARIO_V2.modelos ||
    (doc.formas?.length ?? 0) > 2000 ||
    (doc.texturas?.length ?? 0) > 256 ||
    (doc.camadas?.length ?? 0) > 128 ||
    doc.grupos.length > LIMITES_CENARIO_V2.objetos ||
    new TextEncoder().encode(JSON.stringify(doc)).length > LIMITES_CENARIO_V2.bytes
  )
    falhar('A expansão dos conjuntos excede o orçamento do documento')
  return { documento: doc, origens }
}
