import { z } from 'zod'
import { PontoSchema, VetorSchema } from '../documento'
import { CenarioInvalido } from '../validacao'
import {
  cavarRio,
  encherLago,
  type LagoNoTerreno,
  nivelDeTransbordo,
  type QuedaDoRio,
  represar,
} from './agua-do-terreno'
import { alturaDoCampo, regiaoDoRetangulo } from './campo-de-alturas'
import { medirCurva, reamostrarCurva, suavizarCurva } from './curvas'
import type { AguaDeCenario } from './documento'
import { clonarEstadoDoTerreno, type EstadoDoTerreno } from './edicao-de-terreno'
import { AguaSchema, EntidadeDeCenarioSchema } from './entidades-schema'
import type { RegioesDeTerreno } from './ferramentas-de-terreno'
import { AparenciaDaAguaSchema } from './parametros-de-agua'
import { errosDaTopologiaDaAgua } from './topologia-de-agua'

const nivel = z.number().finite().min(-10000).max(10000)
const comum = { nado: z.boolean().default(true), aparencia: AparenciaDaAguaSchema.optional() }
export const IntencaoDeAguaSchema = z.discriminatedUnion('tipo', [
  z.object({ ...comum, tipo: z.literal('mar'), nivel }).strict(),
  z.object({ ...comum, tipo: z.literal('lago'), ponto: PontoSchema, nivel }).strict(),
  z
    .object({
      ...comum,
      tipo: z.literal('rio'),
      pontos: z.array(PontoSchema).min(2).max(128),
      largura: z.number().finite().min(0.25).max(200),
      profundidade: z.number().finite().min(0.05).max(200),
      correnteza: z.number().finite().min(0).max(10).default(1),
      suave: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      ...comum,
      tipo: z.literal('represa'),
      de: PontoSchema,
      ate: PontoSchema,
      montante: PontoSchema,
      nivel,
      largura: z.number().finite().min(0.25).max(512).default(4),
      folga: z.number().finite().min(0).max(100).default(1),
    })
    .strict(),
  z
    .object({
      ...comum,
      tipo: z.literal('cachoeira'),
      topo: VetorSchema,
      base: VetorSchema,
      largura: z.number().finite().min(0.25).max(200),
      giro: z.number().finite().min(-100000).max(100000).default(0),
      nado: z.literal(false).default(false),
    })
    .strict(),
])
export type IntencaoDeAgua = z.infer<typeof IntencaoDeAguaSchema>
export type IdentidadeDaAgua = Pick<AguaDeCenario, 'id' | 'nome'> &
  Partial<Pick<AguaDeCenario, 'grupo' | 'camada' | 'bloqueado' | 'oculto' | 'propriedades'>>
export interface ResumoDaAgua {
  area?: number
  volume?: number
  profundidade: number
  vaza: boolean
  transbordo?: ReturnType<typeof nivelDeTransbordo>
  quedas?: QuedaDoRio[]
}
export interface OperacaoDeAguaPreparada {
  agua: AguaDeCenario
  /** Só existe quando a intenção também altera relevo; a origem nunca é mutada. */
  terreno?: EstadoDoTerreno
  regioes: RegioesDeTerreno
  resumo?: ResumoDaAgua
}
const falhar = (texto: string): never => {
  throw new CenarioInvalido([texto])
}
function conferirAgua(entrada: unknown): AguaDeCenario {
  const agua = AguaSchema.parse(entrada),
    erros = errosDaTopologiaDaAgua(agua)
  if (erros.length) throw new CenarioInvalido(erros)
  return agua
}
function conferirPonto(estado: EstadoDoTerreno, p: { x: number; z: number }) {
  const c = estado.campo
  if (
    p.x < c.origem.x ||
    p.z < c.origem.z ||
    p.x > c.origem.x + c.colunas * c.passo ||
    p.z > c.origem.z + c.linhas * c.passo
  )
    falhar('O ponto da água está fora da cobertura do terreno.')
}
const dadosDoLago = (l: LagoNoTerreno, centro: { x: number; z: number }) => {
  const local = (p: { x: number; z: number }) => ({ x: p.x - centro.x, z: p.z - centro.z })
  return {
    modelo: null,
    centro,
    giro: 0,
    escala: 1,
    nivel: l.nivel,
    profundidade: l.profundidade,
    contorno: l.contorno.map(local),
    recorte: l.contorno.map(local),
    ilhas: l.ilhas.map((r) => r.map(local)),
    origemPreenchimento: { x: 0, z: 0 },
  }
}
const resumir = (
  e: EstadoDoTerreno,
  l: LagoNoTerreno,
  ponto: { x: number; z: number },
): ResumoDaAgua => ({
  area: l.area,
  volume: l.volume,
  profundidade: l.profundidade,
  vaza: l.vaza,
  transbordo: nivelDeTransbordo(e.campo, ponto),
})

/** Intenção comum à mão e ao agente; o chamador envia recursos e dados pelo mesmo histórico. */
export function prepararOperacaoDeAgua(
  identidade: IdentidadeDaAgua,
  entrada: unknown,
  estado: EstadoDoTerreno | null,
): OperacaoDeAguaPreparada {
  const a = IntencaoDeAguaSchema.parse(entrada),
    entidade = {
      ...EntidadeDeCenarioSchema.parse({
        ...identidade,
        grupo: identidade.grupo ?? null,
        bloqueado: identidade.bloqueado ?? false,
        oculto: identidade.oculto ?? false,
      }),
      nado: a.nado,
      ...(a.aparencia ? { aparencia: a.aparencia } : {}),
    }
  if (a.tipo === 'mar')
    return { agua: conferirAgua({ ...entidade, tipo: 'mar', nivel: a.nivel }), regioes: {} }
  if (a.tipo === 'cachoeira') return { agua: conferirAgua({ ...entidade, ...a }), regioes: {} }
  if (!estado) return falhar('Crie e carregue o terreno antes de preencher ou escavar água.')
  if (a.tipo === 'lago') {
    conferirPonto(estado, a.ponto)
    const l = encherLago(estado.campo, a.ponto, a.nivel)
    if (!l) return falhar('O nível escolhido precisa ficar acima do chão no ponto tocado.')
    return {
      agua: conferirAgua({ ...entidade, tipo: 'lago', ...dadosDoLago(l, a.ponto) }),
      regioes: {},
      resumo: resumir(estado, l, a.ponto),
    }
  }
  if (a.tipo === 'represa') {
    for (const p of [a.de, a.ate, a.montante]) conferirPonto(estado, p)
    const terreno = clonarEstadoDoTerreno(estado),
      r = represar(terreno.campo, a)
    if (!r.lago) return falhar('O nível da represa precisa ficar acima do chão a montante.')
    return {
      agua: conferirAgua({
        ...entidade,
        tipo: 'represa',
        ...dadosDoLago(r.lago, a.montante),
        barragem: {
          de: { x: a.de.x - a.montante.x, z: a.de.z - a.montante.z },
          ate: { x: a.ate.x - a.montante.x, z: a.ate.z - a.montante.z },
          crista: r.crista,
          largura: a.largura,
        },
      }),
      terreno,
      regioes: { alturas: r.regiao },
      resumo: resumir(terreno, r.lago, a.montante),
    }
  }
  for (const p of a.pontos) conferirPonto(estado, p)
  const curva = a.suave
    ? suavizarCurva(a.pontos, { passo: Math.max(0.25, estado.campo.passo / 2) })
    : medirCurva(a.pontos)
  for (const p of curva.pontos) conferirPonto(estado, p)
  const passo = Math.max(estado.campo.passo / 2, curva.comprimento / 50000)
  if (Math.round(curva.comprimento / passo) + 1 > 4096)
    return falhar(
      'O rio gera mais de 4.096 estações. Divida-o em trechos menores ou aumente a distância entre amostras do terreno.',
    )
  const estacoes = reamostrarCurva(curva, passo)
  if (
    estacoes.some(
      (p) => alturaDoCampo(estado.campo, p.x, p.z) - a.profundidade < estado.campo.min - 1e-9,
    )
  )
    return falhar(
      'A escavação do rio ultrapassa a altura mínima do terreno. Ajuste o leito ou os limites do terreno antes de continuar.',
    )
  let trabalho = 0
  const alcance = a.largura * 1.5
  for (let i = 1; i < estacoes.length; i++) {
    const p = estacoes[i - 1]!,
      q = estacoes[i]!,
      r = regiaoDoRetangulo(
        estado.campo,
        Math.min(p.x, q.x) - alcance,
        Math.min(p.z, q.z) - alcance,
        Math.max(p.x, q.x) + alcance,
        Math.max(p.z, q.z) + alcance,
      )
    if (r) trabalho += (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1)
    if (trabalho > 16_000_000)
      return falhar(
        'Este rio exige escavar amostras demais. Divida-o em trechos menores ou reduza a largura antes de continuar.',
      )
  }
  const terreno = clonarEstadoDoTerreno(estado),
    r = cavarRio(terreno.campo, curva, a)
  const profundidade = a.profundidade * 0.7
  return {
    agua: conferirAgua({
      ...entidade,
      tipo: 'rio',
      largura: a.largura,
      profundidade,
      profundidadeDoLeito: a.profundidade,
      correnteza: a.correnteza,
      controle: a.pontos,
      suave: a.suave,
      pontos: r.eixo.map(({ x, y, z }) => ({ x, y, z })),
    }),
    terreno,
    regioes: { alturas: r.regiao },
    resumo: { profundidade, vaza: false, quedas: r.quedas },
  }
}
