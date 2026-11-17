import {
  alteracoesDoGesto,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type EntidadeTransformavel,
  entidadesDoCenario,
  entidadesTransformaveis,
  type FonteDeAlturas,
  type FormaDeCenario,
  type InstanciaDeCenario,
  LIMITES_CENARIO_V2,
  type ModeloDoCenario,
  posicaoNoMundo,
  referenciarModelo,
  type Transformacao,
  trocarModeloDosObjetos,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { ModeloDeBiblioteca } from './portas'

/** Medidas verificadas numa cópia, disponíveis também a operações de leitura como copiar. */
export function conferirMedidasDoDocumento(
  documento: DocumentoDeCenario,
  selecao: readonly string[],
  medir: ((id: string) => VolumeDeComposicao | null) | undefined,
): { documento: DocumentoDeCenario; comandos: ComandoDeCenario[] } {
  const doc = structuredClone(documento),
    comandos: ComandoDeCenario[] = []
  const ids = new Set(selecao)
  for (const inicio of selecao) {
    let o = doc.instancias.find((o) => o.id === inicio)
    for (let n = 0; o?.apoio.tipo === 'objeto' && n < 64; n++) {
      const suporte = o.apoio.objeto
      ids.add(suporte)
      o = doc.instancias.find((p) => p.id === suporte)
    }
  }
  const modelos = new Set(doc.instancias.filter((o) => ids.has(o.id)).map((o) => o.modelo))
  for (const id of modelos) {
    const m = doc.modelos.find((m) => m.id === id)
    if (!m) continue // Formas de rascunho têm medidas determinísticas, sem arquivo da biblioteca.
    const volume = m.volume ?? medir?.(id)
    if (!m.volume && volume) {
      m.volume = volume
      comandos.push({ tipo: 'modelo.definir', modelo: m })
    }
  }
  return { documento: doc, comandos }
}

/** Confere medidas legadas e aplica a ação no mesmo lote, sem gravar ao simplesmente abrir. */
export function comMedidasConferidas(
  documento: DocumentoDeCenario,
  selecao: readonly string[],
  medir: ((id: string) => VolumeDeComposicao | null) | undefined,
  preparar: (doc: DocumentoDeCenario) => ComandoDeCenario[],
): ComandoDeCenario[] {
  const conferido = conferirMedidasDoDocumento(documento, selecao, medir)
  return [...conferido.comandos, ...preparar(conferido.documento)]
}

export function referenciaDeBiblioteca(modelo: ModeloDeBiblioteca): ModeloDoCenario {
  return {
    id: modelo.id,
    biblioteca: modelo.bibliotecaId,
    modelo: modelo.id,
    digest: modelo.digest,
    nome: modelo.nome.slice(0, 120),
    volume: {
      min: { x: modelo.min[0], y: modelo.min[1], z: modelo.min[2] },
      max: { x: modelo.max[0], y: modelo.max[1], z: modelo.max[2] },
    },
  }
}

export function comandosParaTrocar(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  modelo: ModeloDeBiblioteca,
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  return trocarModeloDosObjetos(doc, ids, referenciaDeBiblioteca(modelo), fonte)
}

/** Comandos prontos para as ações da aba Objetos. Puras: a mão e os testes usam as mesmas. */

export type NovoId = () => string
export interface LocalDeColocacao {
  x: number
  z: number
  y?: number
  apoio?: InstanciaDeCenario['apoio']
}

export function novoIdAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return `o-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12)}`
}

function nomeLivre(doc: DocumentoDeCenario, base: string, extras: readonly string[] = []): string {
  const usados = new Set([...entidadesTransformaveis(doc).map((o) => o.nome), ...extras])
  const limpo = base.trim().slice(0, 110) || 'Objeto'
  if (!usados.has(limpo)) return limpo
  for (let n = 2; n < 100_000; n++) if (!usados.has(`${limpo} ${n}`)) return `${limpo} ${n}`
  return limpo
}

function instanciaNoLugar(
  doc: DocumentoDeCenario,
  modelo: string,
  nome: string,
  minY: number,
  ponto: LocalDeColocacao,
  id: string,
  colisao: InstanciaDeCenario['colisao'],
): InstanciaDeCenario {
  return {
    id,
    nome: nomeLivre(doc, nome),
    grupo: null,
    bloqueado: false,
    oculto: false,
    modelo,
    transformacao: {
      posicao: {
        x: ponto.x,
        y: ponto.apoio?.tipo === 'absoluto' ? (ponto.y ?? 0) - minY : 0,
        z: ponto.z,
      },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
    apoio: ponto.apoio ?? {
      tipo: 'terreno',
      deslocamento: 0,
      inclinar: false,
      referencia: 'volume',
    },
    colisao,
  }
}

export function comandosParaForma(
  doc: DocumentoDeCenario,
  forma: FormaDeCenario,
  ponto: LocalDeColocacao,
  novoId: NovoId = novoIdAleatorio,
): { comandos: ComandoDeCenario[]; id: string } {
  const id = novoId()
  return {
    id,
    comandos: [
      { tipo: 'forma.definir', forma },
      {
        tipo: 'instancia.criar',
        instancia: instanciaNoLugar(doc, forma.id, forma.nome, 0, ponto, id, 'malha'),
      },
    ],
  }
}

/** Põe no cenário uma cópia de um modelo da biblioteca, pisando no chão. */
export function comandosParaPor(
  doc: DocumentoDeCenario,
  modelo: ModeloDeBiblioteca,
  ponto: LocalDeColocacao,
  novoId: NovoId = novoIdAleatorio,
): { comandos: ComandoDeCenario[]; id: string } {
  const { id: referencia, comandos } = referenciarModelo(doc, referenciaDeBiblioteca(modelo))
  const id = novoId()
  comandos.push({
    tipo: 'instancia.criar',
    instancia: instanciaNoLugar(doc, referencia, modelo.nome, modelo.min[1], ponto, id, 'caixa'),
  })
  return { comandos, id }
}

const PASSO_DA_COPIA = 1

export function comandosParaDuplicar(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  novoId: NovoId = novoIdAleatorio,
  fonte?: FonteDeAlturas,
): { comandos: ComandoDeCenario[]; ids: string[] } {
  const comandos: ComandoDeCenario[] = [],
    novos: string[] = [],
    nomes: string[] = []
  for (const id of ids) {
    const montagem = doc.montagens?.find((m) => m.id === id)
    if (montagem) {
      const novo = novoId()
      const nome = nomeLivre(doc, montagem.nome, nomes)
      comandos.push({
        tipo: 'montagem.duplicar',
        id,
        novoId: novo,
        nome,
        deslocamento: { x: PASSO_DA_COPIA, y: 0, z: PASSO_DA_COPIA },
      })
      novos.push(novo)
      nomes.push(nome)
      continue
    }
    const original = doc.instancias.find((o) => o.id === id)
    if (!original) continue
    const copia: InstanciaDeCenario = structuredClone(original)
    copia.id = novoId()
    copia.nome = nomeLivre(doc, original.nome, nomes)
    copia.bloqueado = false
    const mundo = {
      ...structuredClone(original.transformacao),
      posicao: posicaoNoMundo(doc, original, fonte),
    }
    mundo.posicao.x += PASSO_DA_COPIA
    mundo.posicao.z += PASSO_DA_COPIA
    Object.assign(copia, alteracoesDoGesto(doc, original, mundo, fonte))
    nomes.push(copia.nome)
    novos.push(copia.id)
    comandos.push({ tipo: 'instancia.criar', instancia: copia })
  }
  return { comandos, ids: novos }
}

export function comandosParaApagar(
  doc: DocumentoDeCenario,
  ids: readonly string[],
): ComandoDeCenario[] {
  const existentes = new Set(doc.instancias.map((o) => o.id))
  const conjuntos = new Set(entidadesDoCenario(doc).map((e) => e.id))
  const alvos = [...new Set(ids)].filter((id) => conjuntos.has(id))
  if (alvos.length > LIMITES_CENARIO_V2.comandos || alvos.some((id) => !existentes.has(id)))
    return [{ tipo: 'elementos.remover', ids: alvos }]
  return ids
    .filter((id) => existentes.has(id))
    .map((id) => ({ tipo: 'instancia.remover' as const, id }))
}

/** O que gravar depois de um gesto no palco, que fala em coordenadas de mundo. */
export function comandosDoGesto(
  doc: DocumentoDeCenario,
  mudancas: readonly {
    id: string
    transformacao: Transformacao
    apoio?: InstanciaDeCenario['apoio']
  }[],
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const comandos: ComandoDeCenario[] = []
  const proximo = structuredClone(doc)
  const originais = new Map(entidadesTransformaveis(doc).map((o) => [o.id, o]))
  const profundidade = (id: string) => {
    let o = originais.get(id),
      n = 0
    while (o && 'apoio' in o && o.apoio.tipo === 'objeto' && n < 64) {
      o = originais.get(o.apoio.objeto)
      n++
    }
    return n
  }
  // Os suportes mudam antes dos seus dependentes. Uma seleção da pilha inteira não pode
  // somar duas vezes a translação do pai ao recalcular o ponto de contato do filho.
  for (const mudanca of [...mudancas].sort((a, b) => profundidade(a.id) - profundidade(b.id))) {
    const montagem = proximo.montagens?.find((m) => m.id === mudanca.id)
    if (montagem) {
      montagem.transformacao = mudanca.transformacao
      comandos.push({
        tipo: 'montagem.atualizar',
        id: montagem.id,
        alteracoes: { transformacao: mudanca.transformacao },
      })
      continue
    }
    const objeto = proximo.instancias.find((o) => o.id === mudanca.id)
    if (!objeto) continue
    const alteracoes = mudanca.apoio
      ? { transformacao: mudanca.transformacao, apoio: mudanca.apoio }
      : alteracoesDoGesto(proximo, objeto, mudanca.transformacao, fonte)
    comandos.push({
      tipo: 'instancia.atualizar',
      id: objeto.id,
      alteracoes,
    })
    Object.assign(objeto, alteracoes)
  }
  return comandos
}

/** A transformação de um objeto como a pessoa a vê: no mundo, com o apoio resolvido. */
export function transformacaoNoMundo(
  doc: DocumentoDeCenario,
  objeto: EntidadeTransformavel,
  fonte?: FonteDeAlturas,
): Transformacao {
  return {
    ...objeto.transformacao,
    posicao:
      'apoio' in objeto ? posicaoNoMundo(doc, objeto, fonte) : { ...objeto.transformacao.posicao },
  }
}
