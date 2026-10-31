import type { AndarDeCima } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import { type FonteDoAndar, lojaDaConstrucao } from '../estado/construcao'
import { type EscadaViva, useEstado, useJogo } from '../estado/contexto'
import { lojaDaObraEstendida, useObraEstendida } from '../estado/obra-estendida'
import {
  conferirAndar,
  type Escada,
  lugarDaEscada,
  podeTerAndar,
} from '../sistemas/construcao/andar'
import type { Lote } from '../sistemas/construcao/lote'
import { Colisores } from './colisores'
import { lerColisores } from './colisores-da-ilha'
import { useModelo } from './modelos'
import { KIT_DA_CASA } from './obra'

/**
 * O andar de cima da casa no mundo (E04): lido do documento à parte do serviço. `null` sem escada,
 * antes do Pico, na visita (o documento não viaja com ela) e se a obra do térreo não o segura mais
 * (o andar só aparece inteiro).
 */
export function useAndarDaCasa(lote: Lote): AndarDeCima | null {
  const { loja, plataforma } = useJogo()
  const extensa = lojaDaObraEstendida(loja, plataforma)
  const andar = useObraEstendida(extensa, (s) => s.obra?.andar ?? null)
  const obra = useEstado((s) => s.salvamento.construcao.casa)
  const vale = useEstado((s) => podeTerAndar(s.jornada) && s.visita === null)
  return useMemo(() => {
    if (!vale || !andar?.escada || !obra) return null
    return conferirAndar(andar, obra, lote) === null ? andar : null
  }, [vale, andar, obra, lote])
}

/**
 * Liga o andar ao Construir: a fonte que a loja do Construir lê e grava, e a primeira leitura do
 * documento (do Pico em diante, quando a Escada aparece na barra).
 */
export function AndarNoConstruir() {
  const { loja, plataforma } = useJogo()
  const extensa = lojaDaObraEstendida(loja, plataforma)
  const pode = useEstado((s) => podeTerAndar(s.jornada) && s.visita === null)
  useEffect(() => {
    if (!pode) return
    if (extensa.getState().situacao !== 'pronta') void extensa.getState().carregar()
    const fonte: FonteDoAndar = {
      ler: () => extensa.getState().obra?.andar ?? null,
      gravar: (andar) => extensa.getState().mudar((o) => ({ ...o, andar })),
    }
    const construcao = lojaDaConstrucao(loja)
    construcao.getState().registrarAndar(fonte)
    return () => {
      if (construcao.getState().fonteDoAndar === fonte) construcao.getState().registrarAndar(null)
    }
  }, [pode, extensa, loja])
  return null
}

/** A largura dos degraus para o modo escada (a da escada do Bosque). */
const LARGURA_DA_ESCADA = 0.6

/**
 * A escada interna: os colisores do `casa-andar.glb` (a rampa e as caixas de baixo, o guarda-corpo
 * do vão, o da parede quando ela encosta numa) no lugar e no giro dela, e as âncoras do modo escada
 * registradas para o personagem. `base` é o ponto (0, 0) da grade da casa no mundo.
 */
export function EscadaDaCasa({
  escada,
  naParede,
  base,
}: {
  escada: Escada
  naParede: boolean
  base: readonly [number, number, number]
}) {
  const { movimento } = useJogo()
  const raiz = useModelo(KIT_DA_CASA.andar)
  const lugar = lugarDaEscada(escada)
  const colisores = useMemo(
    () =>
      lerColisores(raiz).filter(
        (c) =>
          c.nome.startsWith('col-escada-reta-') ||
          (naParede
            ? c.nome.startsWith('col-guarda-vao-parede-')
            : /^col-guarda-vao-\d+$/.test(c.nome)),
      ),
    [raiz, naParede],
  )
  const viva = useMemo<EscadaViva | null>(() => {
    const a = (nome: string) => {
      const o = raiz.getObjectByName(nome)
      if (!o) return null
      const cos = Math.cos(lugar.giro)
      const sen = Math.sin(lugar.giro)
      // O giro do three em volta do y: (x, z) vai a (x cos + z sen, -x sen + z cos).
      return {
        x: base[0] + lugar.x + o.position.x * cos + o.position.z * sen,
        y: base[1] + o.position.y,
        z: base[2] + lugar.z - o.position.x * sen + o.position.z * cos,
      }
    }
    const pe = a('escada-1-base')
    const topo = a('escada-1-topo')
    const saida = a('escada-1-saida')
    if (!pe || !topo || !saida) return null
    return { id: 'casa:escada-1', base: pe, topo, saida, largura: LARGURA_DA_ESCADA }
  }, [raiz, lugar.x, lugar.z, lugar.giro, base])
  useEffect(() => {
    if (!viva) return
    movimento.escadas.push(viva)
    return () => {
      const i = movimento.escadas.indexOf(viva)
      if (i >= 0) movimento.escadas.splice(i, 1)
    }
  }, [movimento, viva])
  return (
    <group position={[base[0] + lugar.x, base[1], base[2] + lugar.z]} rotation-y={lugar.giro}>
      <Colisores lista={colisores} />
    </group>
  )
}
