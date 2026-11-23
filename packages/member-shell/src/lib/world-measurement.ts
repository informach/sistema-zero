/**
 * A medida dos mundos grandes (plano "Mundos de 2 km", lote 8, 23/11/2026): a forma que o
 * percurso do jogo devolve (`medirNoNavegador`, `studio/src/medida/mundoGrande.ts`) e os números
 * de aceite do plano para o notebook simples, motores JS. A rota que grava
 * (`routes/studio-world-measurement.ts`) e a página que mostra leem daqui.
 */
export type Faixa = { p50: number; p95: number; maximo: number }

export interface MedidaRecebida {
  gpu: string
  duracaoMs: number
  quadros: number
  fpsMediano: number
  quadroMs: { p50: number; p95: number; p99: number; maximo: number }
  desenhos: Faixa | null
  triangulos: Faixa | null
  entradas: Array<{
    regiao: string
    quadros: number
    acima100: number
    acima200: number
    piorMs: number
  }>
  regioesVisitadas: string[]
  memoria: {
    heapJs: number | null
    geometrias: number | null
    texturas: number | null
    programas: number | null
    bytesDeTexturas: number
  }
  rota: { pontos: number; metros: number; voltas: number }
}

const MIB = 1024 * 1024

/** A placa emulada não mede nada de verdade (sem aceleração de vídeo no navegador). */
export const placaEmulada = (gpu: string) => /swiftshader|llvmpipe|software|basic render/i.test(gpu)

export interface ItemDoAceite {
  nome: string
  valor: string
  meta: string
  ok: boolean | null
}

/** Os números de aceite do plano (notebook simples, motores JS). */
export function aceiteDaMedida(m: MedidaRecebida): ItemDoAceite[] {
  const pior100 = Math.max(0, ...m.entradas.map((e) => e.acima100))
  const acima200 = m.entradas.reduce((soma, e) => soma + e.acima200, 0)
  const um = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return [
    {
      nome: 'Quadros por segundo (mediana)',
      valor: um(m.fpsMediano),
      meta: '30 ou mais',
      ok: m.fpsMediano >= 30,
    },
    {
      nome: 'Quadro mais lento em 95% do tempo',
      valor: `${um(m.quadroMs.p95)} ms`,
      meta: 'até 45 ms',
      ok: m.quadroMs.p95 <= 45,
    },
    {
      nome: 'Travadas ao entrar numa região',
      valor: `até ${pior100} quadros acima de 100 ms; ${acima200} acima de 200 ms`,
      meta: 'até 3 acima de 100 ms e nenhum acima de 200 ms',
      ok: m.entradas.length === 0 ? null : pior100 <= 3 && acima200 === 0,
    },
    {
      nome: 'Desenhos por quadro',
      valor: m.desenhos ? um(m.desenhos.p95) : 'não medido',
      meta: 'até 100',
      ok: m.desenhos ? m.desenhos.p95 <= 100 : null,
    },
    {
      nome: 'Triângulos na tela',
      valor: m.triangulos ? `${um(m.triangulos.p95 / 1000)} mil` : 'não medido',
      meta: 'até 400 mil',
      ok: m.triangulos ? m.triangulos.p95 <= 400_000 : null,
    },
    {
      nome: 'Texturas na placa de vídeo',
      valor: `${um(m.memoria.bytesDeTexturas / MIB)} MiB`,
      meta: 'até 96 MiB',
      ok: m.memoria.bytesDeTexturas <= 96 * MIB,
    },
    {
      nome: 'Memória do JavaScript',
      valor: m.memoria.heapJs === null ? 'não medida' : `${um(m.memoria.heapJs / 1e6)} MB`,
      meta: 'até 350 MB',
      ok: m.memoria.heapJs === null ? null : m.memoria.heapJs <= 350e6,
    },
  ]
}
