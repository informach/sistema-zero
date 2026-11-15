/** Layout de estudo em metros locais. A arte e os testes consomem o mesmo mapa. */
export interface PontoDaFaisca {
  x: number
  z: number
}
const p = (x: number, z: number): PontoDaFaisca => ({ x, z })
export const BASE_DO_FAROL = p(-3, 100)
export const BASE_DA_OFICINA = p(-46, 120)
export const LUGAR_DA_FAISCA = {
  casa: p(0, 150),
  praca: p(0, 137),
  horta: p(20, 139),
  patio: p(-24, 132),
  oficina: p(-40, 126),
  costa: p(20, 153),
  pier: p(8, 225),
  farol: p(-3, 109),
  bosque: p(112, -55),
  lago: p(58, 127),
  pomar: p(58, 153),
  bancada: p(-39, 114),
  galpao: p(-57, 110),
  miranteOeste: p(-28, 82),
  miranteLeste: p(28, 70),
  miranteNorte: p(40, -155),
  enseadaAreia: p(-45, 210),
  pocas: p(-90, 177),
  dunas: p(65, 202),
  gruta: p(-136, 120),
  clareiraFlores: p(112, -55),
  troncoOco: p(130, -15),
  lagoEscondido: p(140, -85),
  arvoreDaChave: p(94, -110),
  observacao: p(-55, 130),
  descida: p(22, 171),
} as const
export type LugarDaFaiscaId = keyof typeof LUGAR_DA_FAISCA
export const DISTRITOS_DA_FAISCA = [
  {
    id: 'vila',
    nome: 'Vila dos Criadores',
    x: 0,
    z: 146,
    raio: 32,
    marco: 'praca',
    cor: '#e5bb78',
  },
  { id: 'campos', nome: 'Campos da Íris', x: 42, z: 136, raio: 35, marco: 'horta', cor: '#9bc668' },
  { id: 'costa', nome: 'Costa do Nico', x: -22, z: 207, raio: 44, marco: 'pier', cor: '#e2ca8f' },
  {
    id: 'oficina',
    nome: 'Pátio das Invenções',
    x: -47,
    z: 121,
    raio: 28,
    marco: 'patio',
    cor: '#bd8869',
  },
  { id: 'farol', nome: 'Colina do Farol', x: -3, z: 79, raio: 47, marco: 'farol', cor: '#f0d781' },
  {
    id: 'bosque',
    nome: 'Bosque das Lanternas',
    x: 112,
    z: -55,
    raio: 72,
    marco: 'bosque',
    cor: '#75af8f',
  },
] as const
const l = LUGAR_DA_FAISCA
export interface RotaDaFaisca {
  id: string
  nome: string
  tipo: 'cotidiano' | 'anel' | 'atalho' | 'cabeceira' | 'ponte-interna'
  pontos: readonly PontoDaFaisca[]
}
const r = (
  id: string,
  nome: string,
  tipo: RotaDaFaisca['tipo'],
  ...pontos: PontoDaFaisca[]
): RotaDaFaisca => ({ id, nome, tipo, pontos })
export const ROTAS_DA_FAISCA: RotaDaFaisca[] = [
  r('casa-praca', 'Porta → Praça', 'cotidiano', l.casa, l.praca),
  r('praca-horta', 'Praça → Horta', 'cotidiano', l.praca, l.horta),
  r('praca-patio', 'Praça → Pátio', 'cotidiano', l.praca, l.patio),
  r('praca-costa', 'Praça → Descida da Costa', 'cotidiano', l.praca, l.costa),
  r('praca-farol', 'Praça → Farol', 'cotidiano', l.praca, p(-3, 120), l.farol),
  r('patio-oficina', 'Entrada da oficina', 'anel', l.patio, l.oficina),
  r('oficina-farol', 'Encosta das invenções', 'anel', l.oficina, p(-35, 96), l.farol),
  r(
    'farol-bosque',
    'Anel das lanternas',
    'anel',
    l.farol,
    p(-15, 109),
    p(-18, 86),
    p(-30, 35),
    l.miranteNorte,
    p(95, -100),
    l.bosque,
  ),
  r('bosque-campos', 'Anel do pomar', 'anel', l.bosque, p(105, 15), p(90, 80), p(58, 119)),
  r('ponte-lago', 'Ponte dos Campos', 'ponte-interna', p(58, 119), p(58, 135)),
  r('lago-horta', 'Caminho dos canteiros', 'anel', p(58, 135), p(35, 147), p(20, 147), l.horta),
  r(
    'horta-costa',
    'Anel das fontes',
    'anel',
    l.horta,
    p(20, 147),
    p(35, 147),
    l.pomar,
    l.descida,
    l.costa,
  ),
  r('costa-pier', 'Descida ao píer', 'anel', l.costa, l.descida, p(15, 197), l.pier),
  r(
    'pier-oficina',
    'Anel das enseadas',
    'anel',
    l.pier,
    l.enseadaAreia,
    l.pocas,
    p(-80, 140),
    l.oficina,
  ),
  r('horta-patio', 'Atalho dos Campos', 'atalho', l.horta, p(20, 119), p(0, 116), l.patio),
  r(
    'bosque-clareiras',
    'Clareiras e retorno',
    'atalho',
    l.bosque,
    l.troncoOco,
    p(153, -48),
    l.lagoEscondido,
    l.arvoreDaChave,
    p(95, -100),
  ),
  r('costa-segredo', 'Trilha da gruta', 'atalho', l.pocas, p(-120, 153), l.gruta),
]
/** As cabeceiras vêm da geografia, sem importar esse módulo de volta e criar um ciclo. */
export function ligarCabeceiras(cabecas: readonly { id: string; origem: PontoDaFaisca }[]) {
  const saidas: Record<string, PontoDaFaisca> = {
    bosque: l.miranteNorte,
    'vila-doce': l.bosque,
    recife: l.descida,
    pico: l.pier,
    'vale-dos-dinos': l.pocas,
    nuvens: p(-30, 35),
  }
  return cabecas.map((c) =>
    r(`ponte-${c.id}`, `Cabeceira ${c.id}`, 'cabeceira', saidas[c.id]!, c.origem),
  )
}
export function comprimentoDaRota(
  pontos: readonly PontoDaFaisca[],
  altura: (x: number, z: number) => number,
): number {
  const amostras = pontosAoLongo(pontos, 1)
  let metros = 0
  for (let i = 1; i < amostras.length; i++) {
    const a = amostras[i - 1]!,
      b = amostras[i]!
    metros += Math.hypot(b.x - a.x, b.z - a.z, altura(b.x, b.z) - altura(a.x, a.z))
  }
  return metros
}
export function pontosAoLongo(
  pontos: readonly PontoDaFaisca[],
  intervalo: number,
): PontoDaFaisca[] {
  if (!Number.isFinite(intervalo) || intervalo <= 0) throw Error('Intervalo inválido')
  if (!pontos.length) return []
  const saida = [{ ...pontos[0]! }]
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]!,
      b = pontos[i]!,
      n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / intervalo)
    for (let j = 1; j <= n; j++)
      saida.push(p(a.x + ((b.x - a.x) * j) / n, a.z + ((b.z - a.z) * j) / n))
  }
  return saida
}
export function suave(a: number, b: number, v: number) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
/** Colina suave, relevo opcional ao norte e bacia real do lago. */
export function relevoDaFaisca(x: number, z: number): number {
  const colina = 6 * (1 - suave(6, 40, Math.hypot(x - BASE_DO_FAROL.x, z - BASE_DO_FAROL.z)))
  const longe = suave(85, 150, Math.hypot(x, z - 140))
  const norte = 8 * longe * (0.5 + 0.5 * Math.sin(x / 67) * Math.cos(z / 81))
  const lago = Math.hypot((x - l.lago.x) / 9, (z - l.lago.z) / 4.8)
  return colina + norte - 2.4 * (1 - suave(0.45, 1, lago))
}
