import { CenarioInvalido } from '../validacao'
import {
  alteracoesDoGesto,
  alteracoesDoGestoDaMontagem,
  alturaDoChao,
  posicaoDaMontagem,
  posicaoNoMundo,
} from './chao'
import type { ComandoDeCenario } from './comandos'
import { quantidadeDeObjetosDoCenario, volumeDaMontagem } from './conjuntos'
import {
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  LIMITES_CENARIO_V2,
  type ModeloDoCenario,
  ModeloDoCenarioSchema,
  type Transformacao,
} from './documento'
import { volumeDaReferencia } from './fontes'
import { type EntidadeTransformavel, entidadesTransformaveis } from './organizacao'
import { girarNaVertical } from './rotacao'
import { criarSorteio } from './sorteio'
import type { FonteDeAlturas } from './terreno'
import { transformarVolume, type VolumeDeComposicao } from './volume'

export type EixoDeComposicao = 'x' | 'y' | 'z'

/** Inverte a forma dentro do seu volume local; não altera posição, apoio ou escala. */
export function espelharObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  eixo: EixoDeComposicao,
): ComandoDeCenario[] {
  return instanciasEscolhidas(doc, ids).map((o) => ({
    tipo: 'instancia.atualizar',
    id: o.id,
    alteracoes: {
      espelho: {
        x: o.espelho?.x ?? false,
        y: o.espelho?.y ?? false,
        z: o.espelho?.z ?? false,
        [eixo]: !o.espelho?.[eixo],
      },
    },
  }))
}

/** Não sobrescreve referências usadas por outras peças ao trazer outra revisão da biblioteca. */
export function referenciarModelo(
  doc: DocumentoDeCenario,
  entrada: ModeloDoCenario,
): { id: string; comandos: ComandoDeCenario[] } {
  const modelo = ModeloDoCenarioSchema.parse(entrada)
  const igual = doc.modelos.find(
    (m) =>
      m.biblioteca === modelo.biblioteca &&
      m.modelo === modelo.modelo &&
      m.digest === modelo.digest &&
      (['min', 'max'] as const).every((lado) =>
        (['x', 'y', 'z'] as const).every(
          (eixo) => m.volume?.[lado][eixo] === modelo.volume?.[lado][eixo],
        ),
      ),
  )
  if (igual) return { id: igual.id, comandos: [] }
  const usados = new Set([...doc.modelos.map((m) => m.id), ...(doc.formas?.map((f) => f.id) ?? [])])
  let id = modelo.id
  const base = `${modelo.id.slice(0, 165)}/${modelo.digest}`
  for (let n = 0; usados.has(id); n++) {
    if (n > LIMITES_CENARIO_V2.modelos)
      throw new CenarioInvalido(['Não há espaço para outra referência de modelo'])
    id = `${base}/${n}`
  }
  return { id, comandos: [{ tipo: 'modelo.definir', modelo: { ...modelo, id } }] }
}

/** Troca apenas a seleção e conserva a base visual da peça, mesmo com pivôs diferentes. */
export function trocarModeloDosObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  entrada: ModeloDoCenario,
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const objetos = instanciasEscolhidas(doc, ids)
  if (!objetos.length || !entrada.volume)
    throw new CenarioInvalido(['Escolha peças e um modelo com medidas conferidas'])
  const { id, comandos } = referenciarModelo(doc, entrada)
  const modelo = { ...entrada, id }
  const novo = { ...doc, modelos: [...doc.modelos.filter((m) => m.id !== id), modelo] }
  if (objetos.length + comandos.length > LIMITES_CENARIO_V2.comandos)
    throw new CenarioInvalido(['Divida a troca em até 499 peças por ação'])
  for (const o of objetos) {
    const base = volumeNoMundo(doc, o, fonte).min.y
    const copia = { ...o, modelo: id }
    const mundo = { ...structuredClone(o.transformacao), posicao: posicaoNoMundo(doc, o, fonte) }
    mundo.posicao.y += base - volumeNoMundo(novo, copia, fonte).min.y
    let alteracoes = alteracoesDoGesto(novo, copia, mundo, fonte)
    if (o.apoio.tipo === 'terreno') {
      const apoio = {
        ...o.apoio,
        referencia: 'volume' as const,
        deslocamento: base - alturaDoChao(doc.base, mundo.posicao.x, mundo.posicao.z, fonte),
      }
      mundo.posicao.y = posicaoNoMundo(novo, { ...copia, transformacao: mundo, apoio }, fonte).y
      alteracoes = { transformacao: mundo, apoio }
    } else if (o.apoio.tipo === 'objeto') {
      alteracoes.apoio = {
        ...o.apoio,
        deslocamento: o.apoio.deslocamento + mundo.posicao.y - posicaoNoMundo(doc, o, fonte).y,
      }
    } else if (o.apoio.tipo === 'agua') {
      const suporte = doc.aguas.find((a) => o.apoio.tipo === 'agua' && a.id === o.apoio.agua)
      if (suporte?.tipo !== 'lago')
        throw new CenarioInvalido(['A água de apoio não está disponível'])
      alteracoes.apoio = {
        ...o.apoio,
        deslocamento:
          o.apoio.deslocamento +
          (mundo.posicao.y - posicaoNoMundo(doc, o, fonte).y) / suporte.escala,
      }
    }
    comandos.push({
      tipo: 'instancia.atualizar',
      id: o.id,
      alteracoes: { ...alteracoes, modelo: id },
    })
  }
  return comandos
}

function instanciasEscolhidas(
  doc: DocumentoDeCenario,
  ids: readonly string[],
): InstanciaDeCenario[] {
  const elementos = escolhidos(doc, ids)
  const instancias = elementos.filter((e): e is InstanciaDeCenario => 'modelo' in e)
  if (instancias.length !== elementos.length)
    throw new CenarioInvalido(['Separe as peças do conjunto para espelhar ou trocar um modelo'])
  return instancias
}
function escolhidos(doc: DocumentoDeCenario, ids: readonly string[]): EntidadeTransformavel[] {
  const porId = new Map(entidadesTransformaveis(doc).map((o) => [o.id, o]))
  if (new Set(ids).size !== ids.length)
    throw new CenarioInvalido(['A seleção contém objetos repetidos'])
  if (ids.length > LIMITES_CENARIO_V2.comandos)
    throw new CenarioInvalido(['Divida a seleção em até 500 objetos por ação'])
  return ids.map((id) => {
    const o = porId.get(id)
    if (!o) throw new CenarioInvalido([`Objeto ausente: ${id}`])
    return o
  })
}

/** Caixa de mundo exata do volume local, incluindo pivô, giro XYZ e escala por eixo. */
export function volumeNoMundo(
  doc: DocumentoDeCenario,
  o: EntidadeTransformavel,
  fonte?: FonteDeAlturas,
): VolumeDeComposicao {
  if ('definicao' in o) return volumeDaMontagem(doc, o, fonte)
  const volume = volumeDaReferencia(doc, o.modelo)
  if (!volume)
    throw new CenarioInvalido([`Traga novamente o modelo para conferir suas medidas: ${o.nome}`])
  return transformarVolume(volume, { ...o.transformacao, posicao: posicaoNoMundo(doc, o, fonte) })
}

function mover(
  doc: DocumentoDeCenario,
  o: EntidadeTransformavel,
  eixo: EixoDeComposicao,
  delta: number,
  fonte?: FonteDeAlturas,
): ComandoDeCenario {
  const posicao =
    'definicao' in o ? posicaoDaMontagem(doc, o, fonte) : posicaoNoMundo(doc, o, fonte)
  posicao[eixo] += delta
  if ('definicao' in o)
    return {
      tipo: 'montagem.atualizar',
      id: o.id,
      alteracoes: alteracoesDoGestoDaMontagem(doc, o, { ...o.transformacao, posicao }, fonte),
    }
  return {
    tipo: 'instancia.atualizar',
    id: o.id,
    alteracoes: alteracoesDoGesto(doc, o, { ...o.transformacao, posicao }, fonte),
  }
}

/** Alinha as faces ou centros dos volumes, sem mudar a escala dos modelos. */
export function alinharObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  eixo: EixoDeComposicao,
  lado: 'inicio' | 'centro' | 'fim',
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const objetos = escolhidos(doc, ids)
  if (objetos.length < 2)
    throw new CenarioInvalido(['Escolha pelo menos dois objetos para alinhar'])
  const volumes = objetos.map((o) => volumeNoMundo(doc, o, fonte))
  const inicio = Math.min(...volumes.map((v) => v.min[eixo])),
    fim = Math.max(...volumes.map((v) => v.max[eixo]))
  const alvo = lado === 'inicio' ? inicio : lado === 'fim' ? fim : (inicio + fim) / 2
  return objetos.map((o, i) => {
    const v = volumes[i]!,
      atual =
        lado === 'inicio'
          ? v.min[eixo]
          : lado === 'fim'
            ? v.max[eixo]
            : (v.min[eixo] + v.max[eixo]) / 2
    return mover(doc, o, eixo, alvo - atual, fonte)
  })
}

/** Preserva as extremidades; distribui centros ou vãos iguais entre os volumes. */
export function distribuirObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  eixo: EixoDeComposicao,
  modo: 'centros' | 'vaos',
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const ordenados = escolhidos(doc, ids)
    .map((o) => ({ o, v: volumeNoMundo(doc, o, fonte) }))
    .sort(
      (a, b) =>
        a.v.min[eixo] + a.v.max[eixo] - (b.v.min[eixo] + b.v.max[eixo]) ||
        (a.o.id < b.o.id ? -1 : a.o.id > b.o.id ? 1 : 0),
    )
  if (ordenados.length < 3)
    throw new CenarioInvalido(['Escolha pelo menos três objetos para distribuir'])
  const primeiro = ordenados[0]!,
    ultimo = ordenados.at(-1)!
  const centro = (v: VolumeDeComposicao) => (v.min[eixo] + v.max[eixo]) / 2
  const passo = (centro(ultimo.v) - centro(primeiro.v)) / (ordenados.length - 1)
  const vao =
    (ultimo.v.max[eixo] -
      primeiro.v.min[eixo] -
      ordenados.reduce((s, { v }) => s + v.max[eixo] - v.min[eixo], 0)) /
    (ordenados.length - 1)
  if (modo === 'vaos' && vao < -1e-6)
    throw new CenarioInvalido(['Afaste as extremidades para caberem vãos entre os objetos'])
  let borda = primeiro.v.min[eixo]
  return ordenados.slice(1, -1).map(({ o, v }, i) => {
    borda += ordenados[i]!.v.max[eixo] - ordenados[i]!.v.min[eixo] + vao
    return mover(
      doc,
      o,
      eixo,
      modo === 'centros' ? centro(primeiro.v) + passo * (i + 1) - centro(v) : borda - v.min[eixo],
      fonte,
    )
  })
}

export type Repeticao =
  | { tipo: 'fila'; copias: number; deslocamento: { x: number; y: number; z: number } }
  | {
      tipo: 'circulo'
      copias: number
      centro: { x: number; z: number }
      arco: number
      girar: boolean
    }

/** Identificadores são fornecidos pelo chamador: a mesma entrada produz o mesmo lote. */
export function repetirObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  receita: Repeticao,
  novosIds: readonly string[],
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const objetos = escolhidos(doc, ids),
    quantidade = objetos.length * receita.copias
  const pecasNovas =
    objetos.reduce(
      (n, o) =>
        n +
        ('definicao' in o
          ? doc.definicoesConjuntos!.find((d) => d.id === o.definicao)!.conteudo.instancias.length
          : 1),
      0,
    ) * receita.copias
  if (
    !Number.isInteger(receita.copias) ||
    receita.copias < 1 ||
    !objetos.length ||
    quantidade > LIMITES_CENARIO_V2.comandos ||
    pecasNovas + quantidadeDeObjetosDoCenario(doc) > LIMITES_CENARIO_V2.objetos ||
    novosIds.length !== quantidade ||
    new Set(novosIds).size !== quantidade
  )
    throw new CenarioInvalido([
      'A repetição precisa de identificadores únicos e até 500 novas peças',
    ])
  if (
    receita.tipo === 'fila'
      ? !Object.values(receita.deslocamento).every(Number.isFinite)
      : ![receita.centro.x, receita.centro.z, receita.arco].every(Number.isFinite)
  )
    throw new CenarioInvalido(['As medidas da repetição precisam ser finitas'])
  const comandos: ComandoDeCenario[] = []
  for (let i = 0; i < receita.copias; i++)
    for (const o of objetos) {
      const copia = structuredClone(o),
        posicao =
          'definicao' in o ? posicaoDaMontagem(doc, o, fonte) : posicaoNoMundo(doc, o, fonte)
      const transformacao: Transformacao = { ...structuredClone(o.transformacao), posicao }
      if (receita.tipo === 'fila')
        for (const eixo of ['x', 'y', 'z'] as const)
          posicao[eixo] += receita.deslocamento[eixo] * (i + 1)
      else {
        // Num círculo completo a última peça não duplica a primeira.
        const fechado = Math.abs(Math.abs(receita.arco) - 2 * Math.PI) < 1e-6
        const angulo = (receita.arco * (i + 1)) / (receita.copias + (fechado ? 1 : 0)),
          x = posicao.x - receita.centro.x,
          z = posicao.z - receita.centro.z
        posicao.x = receita.centro.x + x * Math.cos(angulo) + z * Math.sin(angulo)
        posicao.z = receita.centro.z - x * Math.sin(angulo) + z * Math.cos(angulo)
        if (receita.girar) transformacao.rotacao = girarNaVertical(transformacao.rotacao, angulo)
      }
      copia.id = novosIds[comandos.length]!
      copia.nome = `${o.nome.slice(0, 108)} ${i + 2}`
      copia.bloqueado = false
      if ('definicao' in copia) {
        Object.assign(copia, alteracoesDoGestoDaMontagem(doc, copia, transformacao, fonte))
        comandos.push({ tipo: 'montagem.definir', montagem: copia })
        continue
      }
      // Uma cópia de objeto apoiado fora da seleção mantém a posição visível, não um vínculo deslocado.
      if (copia.apoio.tipo !== 'terreno') copia.apoio = { tipo: 'absoluto' }
      Object.assign(copia, alteracoesDoGesto(doc, copia, transformacao, fonte))
      comandos.push({ tipo: 'instancia.criar', instancia: copia })
    }
  return comandos
}

/** PRNG inteiro definido aqui, igual no servidor e navegador; não depende de Math.random. */
export function sortearTransformacoes(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  semente: number,
  variacao: { giro: number; tamanhoMin: number; tamanhoMax: number },
): ComandoDeCenario[] {
  if (
    !Number.isSafeInteger(semente) ||
    ![variacao.giro, variacao.tamanhoMin, variacao.tamanhoMax].every(Number.isFinite) ||
    variacao.giro < 0 ||
    variacao.tamanhoMin <= 0 ||
    variacao.tamanhoMin > variacao.tamanhoMax
  )
    throw new CenarioInvalido(['Confira a semente e o intervalo de variação'])
  const sorteio = criarSorteio(semente)
  return escolhidos(doc, ids).map((o) => {
    const t = structuredClone(o.transformacao),
      fator = variacao.tamanhoMin + sorteio() * (variacao.tamanhoMax - variacao.tamanhoMin)
    t.rotacao = girarNaVertical(t.rotacao, (sorteio() * 2 - 1) * variacao.giro)
    t.escala = { x: t.escala.x * fator, y: t.escala.y * fator, z: t.escala.z * fator }
    return {
      tipo: 'definicao' in o ? 'montagem.atualizar' : 'instancia.atualizar',
      id: o.id,
      alteracoes: { transformacao: t },
    }
  })
}
