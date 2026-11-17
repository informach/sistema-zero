import {
  alteracoesDoGesto,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  type InstanciaDeCenario,
  posicaoNoMundo,
  type Transformacao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { ModeloDeBiblioteca } from './portas'

/** Comandos prontos para as ações da aba Objetos. Puras: a mão e os testes usam as mesmas. */

export type NovoId = () => string

export function novoIdAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return `o-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12)}`
}

function nomeLivre(doc: DocumentoDeCenario, base: string, extras: readonly string[] = []): string {
  const usados = new Set([...doc.instancias.map((o) => o.nome), ...extras])
  const limpo = base.trim().slice(0, 110) || 'Objeto'
  if (!usados.has(limpo)) return limpo
  for (let n = 2; n < 100_000; n++) if (!usados.has(`${limpo} ${n}`)) return `${limpo} ${n}`
  return limpo
}

/** Põe no cenário uma cópia de um modelo da biblioteca, pisando no chão. */
export function comandosParaPor(
  doc: DocumentoDeCenario,
  modelo: ModeloDeBiblioteca,
  ponto: { x: number; z: number },
  novoId: NovoId = novoIdAleatorio,
): { comandos: ComandoDeCenario[]; id: string } {
  const comandos: ComandoDeCenario[] = []
  const naTabela = doc.modelos.find((m) => m.id === modelo.id)
  if (!naTabela || naTabela.digest !== modelo.digest || !naTabela.volume)
    comandos.push({
      tipo: 'modelo.definir',
      modelo: {
        id: modelo.id,
        biblioteca: modelo.bibliotecaId,
        modelo: modelo.id,
        digest: modelo.digest,
        nome: modelo.nome.slice(0, 120),
        volume: {
          min: { x: modelo.min[0], y: modelo.min[1], z: modelo.min[2] },
          max: { x: modelo.max[0], y: modelo.max[1], z: modelo.max[2] },
        },
      },
    })
  const id = novoId()
  comandos.push({
    tipo: 'instancia.criar',
    instancia: {
      id,
      nome: nomeLivre(doc, modelo.nome),
      grupo: null,
      bloqueado: false,
      oculto: false,
      modelo: modelo.id,
      transformacao: {
        posicao: { x: ponto.x, y: 0, z: ponto.z },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
      // Pés no chão: quem tem o pivô no meio sobe a metade da altura que fica abaixo dele.
      apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
      colisao: 'caixa',
    },
  })
  return { comandos, id }
}

const PASSO_DA_COPIA = 1

export function comandosParaDuplicar(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  novoId: NovoId = novoIdAleatorio,
): { comandos: ComandoDeCenario[]; ids: string[] } {
  const comandos: ComandoDeCenario[] = [],
    novos: string[] = [],
    nomes: string[] = []
  for (const id of ids) {
    const original = doc.instancias.find((o) => o.id === id)
    if (!original) continue
    const copia: InstanciaDeCenario = structuredClone(original)
    copia.id = novoId()
    copia.nome = nomeLivre(doc, original.nome, nomes)
    copia.bloqueado = false
    copia.transformacao.posicao.x += PASSO_DA_COPIA
    copia.transformacao.posicao.z += PASSO_DA_COPIA
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
  return ids
    .filter((id) => existentes.has(id))
    .map((id) => ({ tipo: 'instancia.remover' as const, id }))
}

/** O que gravar depois de um gesto no palco, que fala em coordenadas de mundo. */
export function comandosDoGesto(
  doc: DocumentoDeCenario,
  mudancas: readonly { id: string; transformacao: Transformacao }[],
  fonte?: FonteDeAlturas,
): ComandoDeCenario[] {
  const comandos: ComandoDeCenario[] = []
  for (const mudanca of mudancas) {
    const objeto = doc.instancias.find((o) => o.id === mudanca.id)
    if (!objeto) continue
    comandos.push({
      tipo: 'instancia.atualizar',
      id: objeto.id,
      alteracoes: alteracoesDoGesto(doc, objeto, mudanca.transformacao, fonte),
    })
  }
  return comandos
}

/** A transformação de um objeto como a pessoa a vê: no mundo, com o apoio resolvido. */
export function transformacaoNoMundo(
  doc: DocumentoDeCenario,
  objeto: InstanciaDeCenario,
  fonte?: FonteDeAlturas,
): Transformacao {
  return { ...objeto.transformacao, posicao: posicaoNoMundo(doc, objeto, fonte) }
}
