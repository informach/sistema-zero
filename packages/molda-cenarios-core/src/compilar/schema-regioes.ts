import { z } from 'zod'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'
import { type CaixaDeRegiao, errosDasRegioesNoRetangulo, type RegiaoDeCenario } from '../v2/regioes'
import { RegiaoSchema } from '../v2/regioes-schema'

/**
 * As regiões na cena compilada (lote 5 da conclusão do plano do Estúdio, 22/11/2026; formato em
 * `docs/estudio-evolucao/regioes-3d-especificacao.md`). Cada região do documento leva a lista do
 * que pertence a ela: os nós (lotes do "Juntar peças" e instâncias), as colisões e as águas. O
 * jogo carrega a região do personagem e as vizinhas; o que não está em lista nenhuma é "de todas"
 * e fica sempre carregado.
 *
 * A pertença é decidida pela posição, por UMA função pura que o compilador e o leitor usam:
 * - um item vai a cada região que a pegada dele no chão (o volume em x e z) toca. Atravessar a
 *   borda leva o item às duas; só encostar na borda, com área, não leva (o que tem largura zero
 *   em cima da borda vai às duas);
 * - item que não toca região nenhuma é "de todas";
 * - são sempre "de todas": o ator animado (`preservarHierarquia`), o objeto com propriedades (o
 *   jogo lê e muda o estado dele, que nunca pode descarregar) e as colisões dele, o lote do
 *   "Juntar peças" que leva um objeto com propriedades nas faixas, o piso plano, a colisão do
 *   relevo (o mapa de alturas é global: é o chão onde a região não está carregada) e o mar;
 * - uma água vale pela pegada inteira (os nós e as colisões dela), e os nós e as colisões dela vão
 *   às mesmas regiões que ela.
 *
 * O leitor confere a lista inteira (`conferirPertencaDasRegioes`): lista velha, incompleta ou com
 * item que não existe é recusada antes de desenhar, e a ordem segue a da cena.
 */

const id = IdentificadorDeCenarioSchema

export const RegiaoCompiladaSchema = RegiaoSchema.extend({
  nos: z.array(id).max(32768),
  colisoes: z.array(id).max(32768),
  aguas: z.array(id).max(4096),
}).strict()

export const RegioesCompiladasSchema = z.array(RegiaoCompiladaSchema).min(1).max(64)

export type RegiaoCompilada = z.infer<typeof RegiaoCompiladaSchema>

interface Volume {
  min: { x: number; z: number }
  max: { x: number; z: number }
}

/** O que a pertença lê da cena compilada (a cena inteira serve). */
export interface ItensDasRegioes {
  entidades: readonly { id: string; propriedades?: Readonly<Record<string, unknown>> }[]
  nos: readonly {
    id: string
    entidade: string | null
    volume: Volume
    preservarHierarquia?: true
    efeito?: 'agua'
    faixas?: readonly { entidade: string | null }[]
  }[]
  colisoes: readonly { id: string; entidade: string | null; tipo: string; volume: Volume }[]
  aguas: readonly { id: string; tipo: string }[]
  plano?: { colisao: string }
}

/** Folga das bordas, a mesma das caixas das regiões do documento. */
const FOLGA = 1e-6
/** Volume de reserva (nunca lido: a água sem pegada não chega ao `toca`). */
const ZERO: Volume = { min: { x: 0, z: 0 }, max: { x: 0, z: 0 } }

function eixoToca(min: number, max: number, inicio: number, fim: number): boolean {
  const sobreposto = Math.min(max, fim) - Math.max(min, inicio)
  if (sobreposto < -FOLGA) return false
  // Com largura, precisa entrar na região; sem largura (um plano em cima da borda), basta tocar.
  return max - min <= FOLGA || sobreposto > FOLGA
}

function toca(volumes: readonly Volume[], caixa: CaixaDeRegiao): boolean {
  const x0 = Math.min(caixa.x0, caixa.x1),
    x1 = Math.max(caixa.x0, caixa.x1),
    z0 = Math.min(caixa.z0, caixa.z1),
    z1 = Math.max(caixa.z0, caixa.z1)
  return volumes.some(
    (v) => eixoToca(v.min.x, v.max.x, x0, x1) && eixoToca(v.min.z, v.max.z, z0, z1),
  )
}

/**
 * As regiões cuja caixa a pegada do volume toca, na ordem das regiões. O "Juntar peças" usa isto
 * para não misturar no mesmo lote peças de regiões diferentes.
 */
export function regioesQueOVolumeToca(
  regioes: readonly RegiaoDeCenario[],
  volume: Volume,
): string[] {
  return regioes.filter((r) => toca([volume], r.caixa)).map((r) => r.id)
}

/** As entidades cujo estado o jogo lê e muda (com ao menos uma propriedade): nunca descarregam. */
export function entidadesComPropriedades(entidades: ItensDasRegioes['entidades']): Set<string> {
  return new Set(
    entidades
      .filter((e) => e.propriedades && Object.keys(e.propriedades).length > 0)
      .map((e) => e.id),
  )
}

const semListas = ({ id, nome, caixa, vizinhas }: RegiaoDeCenario): RegiaoDeCenario => ({
  id,
  nome,
  caixa: { ...caixa },
  vizinhas: [...vizinhas],
})

/** As listas de cada região, na ordem das regiões e, dentro delas, na ordem da cena. */
export function calcularPertencaDasRegioes(
  regioes: readonly RegiaoDeCenario[],
  itens: ItensDasRegioes,
): RegiaoCompilada[] {
  const comPropriedades = entidadesComPropriedades(itens.entidades)
  const mares = new Set(itens.aguas.filter((a) => a.tipo === 'mar').map((a) => a.id))
  const aguas = new Set(itens.aguas.map((a) => a.id))
  const pegadaDaAgua = new Map<string, Volume[]>()
  const daAgua = (entidade: string | null) =>
    entidade !== null && aguas.has(entidade) ? entidade : null
  for (const item of [...itens.nos, ...itens.colisoes]) {
    const agua = daAgua(item.entidade)
    if (agua === null) continue
    const lista = pegadaDaAgua.get(agua) ?? []
    lista.push(item.volume)
    pegadaDaAgua.set(agua, lista)
  }
  const deTodas = (entidade: string | null) =>
    entidade !== null && (comPropriedades.has(entidade) || mares.has(entidade))
  // A água toca uma região pela pegada inteira (todas as peças e colisões dela): a resposta é a
  // mesma para cada item da água, então é calculada uma vez por água e região. Recalcular por
  // item custava regiões × itens² (revisão do lote 5).
  const aguaToca = new Map<string, boolean>()
  const tocaPelaPegada = (
    entidade: string | null,
    volume: Volume,
    regiao: RegiaoDeCenario,
  ): boolean => {
    const agua = daAgua(entidade)
    if (agua === null) return toca([volume], regiao.caixa)
    const chave = `${agua}|${regiao.id}`
    let resposta = aguaToca.get(chave)
    if (resposta === undefined) {
      resposta = toca(pegadaDaAgua.get(agua) ?? [volume], regiao.caixa)
      aguaToca.set(chave, resposta)
    }
    return resposta
  }
  return regioes.map((regiao) => ({
    ...semListas(regiao),
    nos: itens.nos
      .filter(
        (n) =>
          !n.preservarHierarquia &&
          !deTodas(n.entidade) &&
          !n.faixas?.some((f) => deTodas(f.entidade)) &&
          tocaPelaPegada(n.entidade, n.volume, regiao),
      )
      .map((n) => n.id),
    colisoes: itens.colisoes
      .filter(
        (c) =>
          c.id !== itens.plano?.colisao &&
          c.tipo !== 'terreno' &&
          !deTodas(c.entidade) &&
          tocaPelaPegada(c.entidade, c.volume, regiao),
      )
      .map((c) => c.id),
    aguas: itens.aguas
      .filter(
        (a) =>
          !mares.has(a.id) && (pegadaDaAgua.has(a.id) ? tocaPelaPegada(a.id, ZERO, regiao) : false),
      )
      .map((a) => a.id),
  }))
}

const iguais = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((valor, i) => valor === b[i])

/**
 * Os problemas das regiões de uma cena compilada: a régua das regiões do documento (ids e nomes
 * únicos, vizinhas em par, sem sobreposição, dentro do chão quando ele é conhecido) e as listas
 * iguais às que a pertença calcula.
 */
export function conferirPertencaDasRegioes(
  cena: ItensDasRegioes & {
    regioes?: readonly RegiaoCompilada[]
    limite?: CaixaDeRegiao | null
  },
): string[] {
  const regioes = cena.regioes
  if (!regioes?.length) return []
  const erros = errosDasRegioesNoRetangulo(regioes, cena.limite ?? null)
  const esperadas = calcularPertencaDasRegioes(regioes, cena)
  regioes.forEach((r, i) => {
    const e = esperadas[i]
    if (!e) return
    for (const lista of ['nos', 'colisoes', 'aguas'] as const)
      if (!iguais(r[lista], e[lista]))
        erros.push(
          `A lista de ${lista === 'nos' ? 'peças' : lista === 'colisoes' ? 'colisões' : 'águas'} da região ${r.nome} não corresponde à cena.`,
        )
  })
  return erros
}
