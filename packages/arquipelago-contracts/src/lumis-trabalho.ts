import type { LumiId } from './salvamento'

export interface PerfilDeTrabalhoLumi {
  voo: number
  carga: number
  trabalho: number
  /** Intensidade relativa à luz já preparada na arte, apenas à noite. */
  brilho: number
  jeito: string
}

/** Balanceamento compartilhado pelo jogo e pelo editor. Raridade não é uma escala de poder. */
export const PERFIS_DOS_LUMIS = {
  estrelinha: { voo: 2, carga: 12, trabalho: 1.2, brilho: 1.5, jeito: 'Brilha mais à noite.' },
  buzio: { voo: 2, carga: 24, trabalho: 1.2, brilho: 1, jeito: 'Leva mais alimentos por viagem.' },
  pitanga: { voo: 2.5, carga: 12, trabalho: 1, brilho: 1, jeito: 'Cuida da horta com agilidade.' },
  ipe: { voo: 2, carga: 24, trabalho: 1.2, brilho: 1, jeito: 'Leva mais alimentos por viagem.' },
  quindim: { voo: 2.5, carga: 12, trabalho: 1, brilho: 1, jeito: 'Cuida da horta com agilidade.' },
  brigadeiro: {
    voo: 2,
    carga: 24,
    trabalho: 1.2,
    brilho: 1,
    jeito: 'Leva mais alimentos por viagem.',
  },
  bolha: { voo: 3, carga: 8, trabalho: 1, brilho: 1, jeito: 'Voa rápido com uma carga pequena.' },
  perola: { voo: 2, carga: 12, trabalho: 1.2, brilho: 1.5, jeito: 'Brilha mais à noite.' },
  gelinho: { voo: 2.5, carga: 12, trabalho: 1, brilho: 1, jeito: 'Cuida da horta com agilidade.' },
  cristal: { voo: 2, carga: 12, trabalho: 1.2, brilho: 1.5, jeito: 'Brilha mais à noite.' },
  ovinho: { voo: 2, carga: 24, trabalho: 1.2, brilho: 1, jeito: 'Leva mais alimentos por viagem.' },
  brotinho: {
    voo: 2,
    carga: 12,
    trabalho: 0.9,
    brilho: 1,
    jeito: 'Trabalha com cuidado e rapidez.',
  },
  algodao: { voo: 2, carga: 12, trabalho: 1.2, brilho: 1.5, jeito: 'Brilha mais à noite.' },
  pluma: { voo: 3, carga: 8, trabalho: 1, brilho: 1, jeito: 'Voa rápido com uma carga pequena.' },
  // Os Lumis de luz (B12) trabalham como a rara da família (a forma é a dela).
  'buzio-de-luz': {
    voo: 2,
    carga: 24,
    trabalho: 1.2,
    brilho: 1,
    jeito: 'Leva mais alimentos por viagem.',
  },
  'ipe-de-luz': {
    voo: 2,
    carga: 24,
    trabalho: 1.2,
    brilho: 1,
    jeito: 'Leva mais alimentos por viagem.',
  },
  'brigadeiro-de-luz': {
    voo: 2,
    carga: 24,
    trabalho: 1.2,
    brilho: 1,
    jeito: 'Leva mais alimentos por viagem.',
  },
  'perola-de-luz': { voo: 2, carga: 12, trabalho: 1.2, brilho: 1.5, jeito: 'Brilha mais à noite.' },
  'cristal-de-luz': {
    voo: 2,
    carga: 12,
    trabalho: 1.2,
    brilho: 1.5,
    jeito: 'Brilha mais à noite.',
  },
  'brotinho-de-luz': {
    voo: 2,
    carga: 12,
    trabalho: 0.9,
    brilho: 1,
    jeito: 'Trabalha com cuidado e rapidez.',
  },
  'pluma-de-luz': {
    voo: 3,
    carga: 8,
    trabalho: 1,
    brilho: 1,
    jeito: 'Voa rápido com uma carga pequena.',
  },
} as const satisfies Readonly<Record<LumiId, PerfilDeTrabalhoLumi>>

export function cargaDoLumi(carga: Readonly<Record<string, number>>): number {
  let total = 0
  for (const item in carga) total += carga[item] ?? 0
  return total
}

export function descricaoDoTrabalhoLumi(lumi: LumiId): string {
  const p = PERFIS_DOS_LUMIS[lumi]
  return `${p.jeito} Leva até ${p.carga} alimentos. Voa a ${String(p.voo).replace('.', ',')} metros por segundo.`
}
