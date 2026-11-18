import {
  type AguaDeCenario,
  AguaSchema,
  type AparenciaDaAgua,
  AparenciaDaAguaSchema,
  type IntencaoDeAgua,
  IntencaoDeAguaSchema,
  igual,
  type OperacaoDeAguaPreparada,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Ponto3 } from '@sistemazero/molda-cenarios-motor'

export const NOMES_AGUA: Record<IntencaoDeAgua['tipo'], string> = {
  mar: 'Mar',
  lago: 'Encher de água',
  rio: 'Rio',
  represa: 'Represa',
  cachoeira: 'Cachoeira',
}
export interface FormularioDeAgua {
  tipo: IntencaoDeAgua['tipo']
  nome: string
  pontos: Ponto3[]
  nivel: number
  largura: number
  profundidade: number
  correnteza: number
  folga: number
  suave: boolean
  nado: boolean
  giro: number
  aparencia: AparenciaDaAgua
}
export function formularioDeAgua(tipo: IntencaoDeAgua['tipo']): FormularioDeAgua {
  return {
    tipo,
    nome: tipo === 'lago' ? 'Lago' : NOMES_AGUA[tipo],
    pontos: [],
    nivel: 1,
    largura: 4,
    profundidade: 2,
    correnteza: 1,
    folga: 1,
    suave: true,
    nado: tipo !== 'cachoeira',
    giro: 0,
    aparencia: AparenciaDaAguaSchema.parse({}),
  }
}
export function formularioDaAguaExistente(a: AguaDeCenario): FormularioDeAgua {
  const f = {
    ...formularioDeAgua(a.tipo),
    nome: a.nome,
    nado: a.nado ?? true,
    aparencia: AparenciaDaAguaSchema.parse(a.aparencia ?? {}),
  }
  if (a.tipo === 'mar') f.nivel = a.nivel
  if (a.tipo === 'rio') {
    const controle = a.controle ?? (a.pontos.length <= 128 ? a.pontos : [])
    // Amostras densas não substituem os controles originais nem são truncadas silenciosamente.
    // O material continua editável; recalcular exige escolher uma nova curva neste caso.
    f.pontos = controle.map((p) => ({ x: p.x, y: 0, z: p.z }))
    f.largura = a.largura
    f.profundidade = a.profundidadeDoLeito ?? a.profundidade
    f.correnteza = a.correnteza
    f.suave = a.suave ?? true
  }
  if (a.tipo === 'lago' || a.tipo === 'represa') {
    const mundo = (p: { x: number; z: number }) => ({
      x: a.centro.x + a.escala * (p.x * Math.cos(a.giro) + p.z * Math.sin(a.giro)),
      y: a.nivel,
      z: a.centro.z + a.escala * (-p.x * Math.sin(a.giro) + p.z * Math.cos(a.giro)),
    })
    f.nivel = a.nivel
    f.profundidade = a.profundidade
    f.pontos = [mundo(a.origemPreenchimento ?? { x: 0, z: 0 })]
    if (a.tipo === 'represa') {
      f.pontos = [mundo(a.barragem.de), mundo(a.barragem.ate), ...f.pontos]
      f.largura = a.barragem.largura
      f.folga = Math.max(0, a.barragem.crista - a.nivel)
    }
  }
  if (a.tipo === 'cachoeira') {
    f.pontos = [{ ...a.topo }, { ...a.base }]
    f.largura = a.largura
    f.giro = a.giro
    f.nado = false
  }
  return f
}
export function intencaoDoFormulario(f: FormularioDeAgua): IntencaoDeAgua {
  const comum = { aparencia: f.aparencia, nado: f.nado },
    pontos = f.pontos
  const exigir = (n: number) => {
    if (pontos.length < n)
      throw Error(`Escolha ${n} ${n === 1 ? 'ponto' : 'pontos'} para preparar esta água.`)
  }
  switch (f.tipo) {
    case 'mar':
      return IntencaoDeAguaSchema.parse({ ...comum, tipo: f.tipo, nivel: f.nivel })
    case 'lago':
      exigir(1)
      return IntencaoDeAguaSchema.parse({
        ...comum,
        tipo: f.tipo,
        ponto: { x: pontos[0]!.x, z: pontos[0]!.z },
        nivel: f.nivel,
      })
    case 'rio':
      exigir(2)
      return IntencaoDeAguaSchema.parse({
        ...comum,
        tipo: f.tipo,
        pontos: pontos.map(({ x, z }) => ({ x, z })),
        largura: f.largura,
        profundidade: f.profundidade,
        correnteza: f.correnteza,
        suave: f.suave,
      })
    case 'represa': {
      exigir(3)
      const xz = (p: Ponto3) => ({ x: p.x, z: p.z })
      return IntencaoDeAguaSchema.parse({
        ...comum,
        tipo: f.tipo,
        de: xz(pontos[0]!),
        ate: xz(pontos[1]!),
        montante: xz(pontos[2]!),
        nivel: f.nivel,
        largura: f.largura,
        folga: f.folga,
      })
    }
    case 'cachoeira':
      exigir(2)
      return IntencaoDeAguaSchema.parse({
        ...comum,
        tipo: f.tipo,
        topo: pontos[0],
        base: pontos[1],
        largura: f.largura,
        giro: f.giro,
        nado: false,
      })
  }
}

/** Mudar material/nado/correnteza não volta a escavar o leito já existente. */
export function editarAguaSemRecalcular(
  a: AguaDeCenario,
  f: FormularioDeAgua,
): OperacaoDeAguaPreparada {
  if (a.tipo !== f.tipo) throw Error('Escolha o mesmo tipo de água para editar.')
  const agua = { ...a, nome: f.nome.trim() }
  if (!igual(f.aparencia, AparenciaDaAguaSchema.parse(a.aparencia ?? {})))
    agua.aparencia = f.aparencia
  if (f.nado !== (a.nado ?? true)) agua.nado = a.tipo === 'cachoeira' ? false : f.nado
  if (agua.tipo === 'mar' || ((agua.tipo === 'lago' || agua.tipo === 'represa') && agua.modelo))
    agua.nivel = f.nivel
  if (agua.tipo === 'rio') agua.correnteza = f.correnteza
  if (agua.tipo === 'cachoeira') {
    const intencao = intencaoDoFormulario(f)
    if (intencao.tipo === 'cachoeira') {
      const { topo, base, largura, giro } = intencao
      Object.assign(agua, { topo, base, largura, giro })
    }
  }
  return { agua: AguaSchema.parse(agua), regioes: {} }
}
