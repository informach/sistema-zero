'use client'

import type { MatKey } from './materials'
import { Ball, Box, Cone, Cyl } from './prims'

/**
 * Móveis/decoração em low-poly (primitivas THREE em código — sem GLTF). Cada modelo é
 * CENTRADO na origem em X/Z, base em y=0, crescendo +Y; é construído para o footprint BASE
 * (w×h em células) e o `<FurniturePiece>` pai posiciona/gira o grupo. Itens de luz
 * (luminária/vela) brilham por material `emissive` (sem point light — barato). Id
 * desconhecido → caixa neutra (forward-compat, como o emoji ignorado antes).
 */
interface FProps {
  w: number
  h: number
}

function Cama({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.98, 0.46, h * 0.98]} p={[0, 0.23, 0]} m="woodDark" />
      <Box s={[w * 0.9, 0.3, h * 0.82]} p={[0, 0.6, h * 0.06]} m="white" />
      <Box s={[w * 0.86, 0.08, h * 0.5]} p={[0, 0.78, h * 0.16]} m="pink" />
      <Box s={[w * 0.5, 0.18, h * 0.3]} p={[0, 0.8, -h * 0.28]} m="blue" />
      <Box s={[w * 0.98, 0.95, 0.14]} p={[0, 0.48, -h * 0.5]} m="woodDark" />
    </group>
  )
}

function Cadeira({ w, h }: FProps) {
  const leg = (x: number, z: number, k: string) => (
    <Box key={k} s={[0.1, 0.5, 0.1]} p={[x, 0.25, z]} m="woodDark" />
  )
  return (
    <group>
      <Box s={[w * 0.8, 0.14, h * 0.5]} p={[0, 0.52, h * 0.08]} m="wood" />
      <Box s={[w * 0.8, 0.7, 0.14]} p={[0, 0.86, -h * 0.16]} m="wood" />
      {leg(-w * 0.3, h * 0.16, 'a')}
      {leg(w * 0.3, h * 0.16, 'b')}
      {leg(-w * 0.3, -h * 0.12, 'c')}
      {leg(w * 0.3, -h * 0.12, 'd')}
    </group>
  )
}

function Sofa({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.96, 0.4, h * 0.86]} p={[0, 0.2, 0]} m="grayDark" />
      <Box s={[w * 0.7, 0.22, h * 0.62]} p={[0, 0.5, h * 0.06]} m="gray" />
      <Box s={[w * 0.96, 0.62, 0.3]} p={[0, 0.6, -h * 0.4]} m="gray" />
      <Box s={[0.28, 0.6, h * 0.86]} p={[-w * 0.46, 0.55, 0]} m="gray" />
      <Box s={[0.28, 0.6, h * 0.86]} p={[w * 0.46, 0.55, 0]} m="gray" />
      <Box s={[w * 0.34, 0.16, h * 0.5]} p={[-w * 0.2, 0.6, h * 0.06]} m="blue" />
      <Box s={[w * 0.34, 0.16, h * 0.5]} p={[w * 0.2, 0.6, h * 0.06]} m="green" />
    </group>
  )
}

function Estante({ w }: FProps) {
  const d = 0.7
  const shelf = (y: number, k: string) => (
    <Box key={k} s={[w * 0.86, 0.08, d * 0.9]} p={[0, y, 0]} m="woodDark" />
  )
  const book = (x: number, y: number, m: MatKey, k: string) => (
    <Box key={k} s={[0.16, 0.5, d * 0.6]} p={[x, y, 0]} m={m} />
  )
  return (
    <group>
      <Box s={[w * 0.94, 2.4, d]} p={[0, 1.2, 0]} m="wood" />
      <Box s={[w * 0.8, 2.1, d * 0.6]} p={[0, 1.2, d * 0.16]} m="woodDark" />
      {shelf(0.72, 's1')}
      {shelf(1.4, 's2')}
      {shelf(2.06, 's3')}
      {book(-w * 0.22, 0.46, 'red', 'b1')}
      {book(-w * 0.04, 0.46, 'green', 'b2')}
      {book(w * 0.14, 0.46, 'blue', 'b3')}
      {book(-w * 0.16, 1.06, 'yellow', 'b4')}
      {book(w * 0.08, 1.06, 'pink', 'b5')}
    </group>
  )
}

function Bau({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.86, 0.5, h * 0.7]} p={[0, 0.25, 0]} m="wood" />
      <Box s={[w * 0.9, 0.18, h * 0.74]} p={[0, 0.56, 0]} m="woodDark" />
      <Box s={[0.16, 0.16, 0.1]} p={[0, 0.5, h * 0.37]} m="yellow" />
    </group>
  )
}

function Quadro({ w, h }: FProps) {
  return (
    <group>
      <Box s={[0.34, 0.28, h * 0.36]} p={[0, 0.14, 0]} m="woodDark" />
      <Box
        s={[w * 0.74, w * 0.72, 0.1]}
        p={[0, w * 0.52, -h * 0.08]}
        m="woodDark"
        r={[0.12, 0, 0]}
      />
      <Box
        s={[w * 0.58, w * 0.56, 0.04]}
        p={[0, w * 0.52, -h * 0.08 + 0.06]}
        m="blue"
        r={[0.12, 0, 0]}
      />
    </group>
  )
}

function Estrela() {
  return (
    <group>
      <Cyl s={[0.06, 0.9, 0.06]} p={[0, 0.45, 0]} m="metal" />
      <Ball s={[0.52, 0.52, 0.52]} p={[0, 1.0, 0]} m="yellow" />
    </group>
  )
}

function Janela({ w, h }: FProps) {
  const z = -h * 0.18
  return (
    <group>
      <Box s={[w * 0.82, w * 0.82, 0.12]} p={[0, w * 0.52, z]} m="white" />
      <Box s={[w * 0.66, w * 0.66, 0.06]} p={[0, w * 0.52, z + 0.05]} m="glass" />
      <Box s={[w * 0.72, 0.06, 0.08]} p={[0, w * 0.52, z + 0.08]} m="white" />
      <Box s={[0.06, w * 0.72, 0.08]} p={[0, w * 0.52, z + 0.08]} m="white" />
    </group>
  )
}

function Bandeira({ h }: FProps) {
  return (
    <group>
      <Cyl s={[0.06, 1.7, 0.06]} p={[0, 0.85, -h * 0.08]} m="woodDark" />
      <Box s={[0.7, 0.44, 0.04]} p={[0.38, 1.45, -h * 0.08]} m="red" />
    </group>
  )
}

function Ursinho() {
  return (
    <group>
      <Ball s={[0.72, 0.8, 0.62]} p={[0, 0.42, 0]} m="terracotta" />
      <Ball s={[0.56, 0.56, 0.5]} p={[0, 0.95, 0.06]} m="terracotta" />
      <Ball s={[0.2, 0.2, 0.2]} p={[-0.2, 1.16, 0]} m="terracotta" />
      <Ball s={[0.2, 0.2, 0.2]} p={[0.2, 1.16, 0]} m="terracotta" />
      <Ball s={[0.16, 0.16, 0.16]} p={[0, 0.92, 0.3]} m="woodDark" />
    </group>
  )
}

function Balao() {
  return (
    <group>
      <Box s={[0.02, 1.2, 0.02]} p={[0, 0.6, 0]} m="grayDark" />
      <Ball s={[0.6, 0.74, 0.6]} p={[0, 1.42, 0]} m="red" />
    </group>
  )
}

function Relogio() {
  return (
    <group>
      <Box s={[0.22, 0.5, 0.22]} p={[0, 0.25, 0]} m="woodDark" />
      <Cyl s={[0.72, 0.16, 0.72]} p={[0, 0.78, 0]} m="white" r={[Math.PI / 2, 0, 0]} />
      <Box s={[0.04, 0.28, 0.02]} p={[0, 0.82, 0.1]} m="black" />
      <Box s={[0.04, 0.18, 0.02]} p={[0.07, 0.78, 0.1]} m="black" r={[0, 0, Math.PI / 2]} />
    </group>
  )
}

function Planta() {
  return (
    <group>
      <Cyl s={[0.5, 0.5, 0.5]} p={[0, 0.25, 0]} m="terracotta" />
      <Cone s={[0.82, 0.8, 0.82]} p={[0, 0.82, 0]} m="leaf" />
      <Cone s={[0.6, 0.64, 0.6]} p={[0, 1.24, 0]} m="leafLight" />
    </group>
  )
}

function Arvore({ w }: FProps) {
  return (
    <group>
      <Cyl s={[0.4, 1.4, 0.4]} p={[0, 0.7, 0]} m="woodDark" />
      <Cone s={[w * 0.92, 1.1, w * 0.92]} p={[0, 1.7, 0]} m="leaf" />
      <Cone s={[w * 0.72, 0.95, w * 0.72]} p={[0, 2.25, 0]} m="leafLight" />
      <Cone s={[w * 0.5, 0.8, w * 0.5]} p={[0, 2.75, 0]} m="leaf" />
    </group>
  )
}

function Luminaria() {
  return (
    <group>
      <Cyl s={[0.62, 0.12, 0.62]} p={[0, 0.06, 0]} m="grayDark" />
      <Cyl s={[0.08, 2.0, 0.08]} p={[0, 1.0, 0]} m="metal" />
      <Cone s={[0.84, 0.55, 0.84]} p={[0, 2.1, 0]} m="lamp" r={[Math.PI, 0, 0]} />
    </group>
  )
}

function Vela() {
  return (
    <group>
      <Cyl s={[0.4, 0.62, 0.4]} p={[0, 0.31, 0]} m="cream" />
      <Ball s={[0.14, 0.24, 0.14]} p={[0, 0.74, 0]} m="lamp" />
    </group>
  )
}

function FallbackBox({ w, h }: FProps) {
  return <Box s={[w * 0.7, 0.7, h * 0.7]} p={[0, 0.35, 0]} m="gray" />
}

/** Modelo 3D de um item pelo id do catálogo (w×h = footprint base em células). */
export function FurnitureModel({ itemId, w, h }: { itemId: string; w: number; h: number }) {
  switch (itemId) {
    case 'cama':
      return <Cama w={w} h={h} />
    case 'cadeira':
      return <Cadeira w={w} h={h} />
    case 'sofa':
      return <Sofa w={w} h={h} />
    case 'estante':
      return <Estante w={w} h={h} />
    case 'bau':
      return <Bau w={w} h={h} />
    case 'quadro':
      return <Quadro w={w} h={h} />
    case 'estrela':
      return <Estrela />
    case 'janela':
      return <Janela w={w} h={h} />
    case 'bandeira':
      return <Bandeira w={w} h={h} />
    case 'ursinho':
      return <Ursinho />
    case 'balao':
      return <Balao />
    case 'relogio':
      return <Relogio />
    case 'planta':
      return <Planta />
    case 'arvore':
      return <Arvore w={w} h={h} />
    case 'luminaria':
      return <Luminaria />
    case 'vela':
      return <Vela />
    default:
      return <FallbackBox w={w} h={h} />
  }
}
