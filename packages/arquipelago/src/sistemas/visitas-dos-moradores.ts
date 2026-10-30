import type { QuartoDoJogo, Salvamento } from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO } from '@sistemazero/avatar-quarto/quarto/catalog'
import { effectiveFootprint, type Rot } from '@sistemazero/avatar-quarto/quarto/coords'
import {
  ACONCHEGO_DA_FESTA,
  ACONCHEGO_QUE_CHAMA_VISITA,
  aconchegoDosComodos,
} from './construcao/aconchego'
import { planta } from './construcao/comodos'
import { arestasDaAbertura, chaveDaAresta } from './construcao/grade'
import { type Celula, chaveDaCelula, LOTE_DA_CASA, LOTE_DA_CASA_GRANDE } from './construcao/lote'
import { celulasDoObjeto } from './construcao/projeto-azul'
import { sorteio } from './moradores'

export const PAINEL_DOS_CONVIDADOS = 'convidados-da-casa'
export const MORADORES_CONVIDAVEIS = ['capi', 'bento', 'mare', 'floco', 'jade', 'irie'] as const
export type MoradorConvidado = (typeof MORADORES_CONVIDAVEIS)[number]
export type TipoDeEncontro = 'visita' | 'festa'
export const NOMES_DOS_CONVIDADOS = {
  capi: 'Capi',
  bento: 'Bento',
  mare: 'Maré',
  floco: 'Floco',
  jade: 'Jade',
  irie: 'Iriê',
} as const
const POSTOS = { capi: 2, bento: 3, mare: 4, floco: 5, jade: 6, irie: 7 } as const
const ENTRADA = { x: 2, z: -1 }
const DIRECOES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export interface ConvidadoNaCasa {
  quem: MoradorConvidado
  x: number
  z: number
}
export interface EncontroNaCasa {
  convidados: ConvidadoNaCasa[]
  pontos: number
  motivo: 'pronto' | 'casa' | 'aconchego' | 'amizade' | 'espaco'
}

/** A mesma entrada da casa e a mesma grade dos móveis, sem consultar React ou salvar presença. */
export function encontroNaCasa(
  s: Pick<Salvamento, 'construcao' | 'casa' | 'projetos' | 'moradores'>,
  quarto: QuartoDoJogo,
  jornada: number,
  perfil: string,
  dia: string,
  tipo: TipoDeEncontro,
  evitar?: { x: number; z: number },
): EncontroNaCasa {
  const obra = s.construcao.casa ?? LOTE_DA_CASA.obraInicial
  const vazio = (motivo: EncontroNaCasa['motivo'], pontos = 0): EncontroNaCasa => ({
    convidados: [],
    pontos,
    motivo,
  })
  if (!s.casa.portaNova) return vazio('casa')
  const comodos = aconchegoDosComodos(obra, LOTE_DA_CASA_GRANDE, s.projetos, quarto)
  const pontos = Math.max(0, ...comodos.map((c) => c.total))
  const minimo = tipo === 'festa' ? ACONCHEGO_DA_FESTA : ACONCHEGO_QUE_CHAMA_VISITA
  if (pontos < minimo) return vazio('aconchego', pontos)
  const moradores = MORADORES_CONVIDAVEIS.filter(
    (quem) => jornada >= POSTOS[quem] && s.moradores[quem].conversaEm !== null,
  ).sort(
    (a, b) =>
      sorteio(`${perfil}:${dia}:${a}`) - sorteio(`${perfil}:${dia}:${b}`) || a.localeCompare(b),
  )
  if (!moradores.length) return vazio('amizade', pontos)
  const p = planta(obra, LOTE_DA_CASA_GRANDE)
  const paredes = new Set(p.paredes)
  for (const a of obra.aberturas)
    if (a.tipo === 'porta') for (const e of arestasDaAbertura(a)) paredes.delete(chaveDaAresta(e))
  const livres = new Map<string, Celula>()
  for (const c of p.comodos)
    for (const celula of c.celulas) livres.set(chaveDaCelula(celula), celula)
  for (const o of obra.objetos) for (const c of celulasDoObjeto(o)) livres.delete(chaveDaCelula(c))
  for (const item of quarto.placedItems) {
    const info = ROOM_ITEM_INFO[item.itemId]
    if (!info || info.mount === 'wall' || item.on) continue
    const fp = effectiveFootprint(info.w, info.h, (item.rot ?? 0) as Rot)
    for (let x = 0; x < fp.w; x++)
      for (let z = 0; z < fp.h; z++) livres.delete(`${item.x + x - 6},${item.y + z - 8}`)
  }
  const alcancaveis = (ocupadas: Set<string>) => {
    const vistos = new Set<string>()
    const fila: Celula[] = []
    if (livres.has(chaveDaCelula(ENTRADA)) && !ocupadas.has(chaveDaCelula(ENTRADA)))
      fila.push(ENTRADA)
    for (let i = 0; i < fila.length; i++) {
      const c = fila[i]!
      const chave = chaveDaCelula(c)
      if (vistos.has(chave)) continue
      vistos.add(chave)
      for (const [dx, dz] of DIRECOES) {
        const v = { x: c.x + dx, z: c.z + dz }
        const kv = chaveDaCelula(v)
        const aresta = dx
          ? { eixo: 'z' as const, x: Math.max(c.x, v.x), z: c.z }
          : { eixo: 'x' as const, x: c.x, z: Math.max(c.z, v.z) }
        if (
          livres.has(kv) &&
          !ocupadas.has(kv) &&
          !vistos.has(kv) &&
          !paredes.has(chaveDaAresta(aresta))
        )
          fila.push(v)
      }
    }
    return vistos
  }
  const ocupadas = new Set<string>()
  const antes = alcancaveis(ocupadas)
  const candidatos = comodos
    .filter((c) => c.total >= minimo)
    .sort((a, b) => b.total - a.total || a.comodo.id.localeCompare(b.comodo.id))
    .flatMap((c) => c.comodo.celulas)
  const convidados: ConvidadoNaCasa[] = []
  for (const c of candidatos) {
    const k = chaveDaCelula(c)
    if (!antes.has(k) || (c.x - ENTRADA.x) ** 2 + (c.z - ENTRADA.z) ** 2 < 9) continue
    if (evitar && (evitar.x - c.x - 0.5) ** 2 + (evitar.z - c.z - 0.5) ** 2 < 4) continue
    // Um quadrado livre em torno do corpo deixa folga para a cápsula e para passar ao lado.
    let livre = true
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const v = { x: c.x + dx, z: c.z + dz }
        const kv = chaveDaCelula(v)
        if (!antes.has(kv) || ocupadas.has(kv) || p.comodoDe.get(kv) !== p.comodoDe.get(k))
          livre = false
      }
    if (!livre || convidados.some((v) => (v.x - c.x - 0.5) ** 2 + (v.z - c.z - 0.5) ** 2 < 9))
      continue
    ocupadas.add(k)
    if (alcancaveis(ocupadas).size !== antes.size - ocupadas.size) {
      ocupadas.delete(k)
      continue
    }
    convidados.push({ quem: moradores[convidados.length]!, x: c.x + 0.5, z: c.z + 0.5 })
    if (convidados.length === Math.min(tipo === 'festa' ? 3 : 1, moradores.length)) break
  }
  return { convidados, pontos, motivo: convidados.length ? 'pronto' : 'espaco' }
}
