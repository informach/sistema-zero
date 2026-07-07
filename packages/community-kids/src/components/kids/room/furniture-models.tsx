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

// ── Itens de PAREDE: painéis FLAT centrados na origem (X=largura, Y=altura, +Z = frente).
//    O <FurniturePiece> posiciona contra a parede e gira (parede esquerda gira 90°). ──
function Quadro({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.92, h * 0.92, 0.1]} p={[0, 0, 0]} m="woodDark" />
      <Box s={[w * 0.74, h * 0.74, 0.04]} p={[0, 0, 0.06]} m="cream" />
      <Cone s={[w * 0.4, h * 0.4, 0.06]} p={[-w * 0.05, -h * 0.05, 0.09]} m="leaf" />
      <Ball s={[h * 0.22, h * 0.22, 0.06]} p={[w * 0.22, h * 0.2, 0.09]} m="yellow" />
    </group>
  )
}

function Estrela({ w, h }: FProps) {
  return (
    <group>
      <Ball s={[w * 0.78, h * 0.78, 0.18]} p={[0, 0, 0]} m="yellow" />
      <Ball s={[w * 0.34, h * 0.34, 0.12]} p={[0, 0, 0.1]} m="lamp" />
    </group>
  )
}

function Janela({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.96, h * 0.96, 0.1]} p={[0, 0, 0]} m="white" />
      <Box s={[w * 0.82, h * 0.82, 0.05]} p={[0, 0, 0.05]} m="glass" />
      <Box s={[w * 0.86, 0.08, 0.09]} p={[0, 0, 0.07]} m="white" />
      <Box s={[0.08, h * 0.86, 0.09]} p={[0, 0, 0.07]} m="white" />
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

function Relogio({ w, h }: FProps) {
  return (
    <group>
      <Cyl s={[w * 0.88, 0.1, h * 0.88]} p={[0, 0, 0]} m="white" r={[Math.PI / 2, 0, 0]} />
      <Box s={[0.05, h * 0.3, 0.04]} p={[0, h * 0.04, 0.08]} m="black" />
      <Box s={[w * 0.24, 0.05, 0.04]} p={[w * 0.07, 0, 0.08]} m="black" />
      <Ball s={[0.09, 0.09, 0.06]} p={[0, 0, 0.09]} m="red" />
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

// ── Novos móveis de CHÃO ──────────────────────────────────────────────────────
function Mesa({ w, h }: FProps) {
  const leg = (x: number, z: number, k: string) => (
    <Box key={k} s={[0.12, 0.7, 0.12]} p={[x, 0.35, z]} m="woodDark" />
  )
  return (
    <group>
      <Box s={[w * 0.92, 0.14, h * 0.92]} p={[0, 0.74, 0]} m="wood" />
      {leg(-w * 0.36, -h * 0.36, 'a')}
      {leg(w * 0.36, -h * 0.36, 'b')}
      {leg(-w * 0.36, h * 0.36, 'c')}
      {leg(w * 0.36, h * 0.36, 'd')}
    </group>
  )
}

function MesaEstudo({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.94, 0.12, h * 0.88]} p={[0, 0.78, 0]} m="wood" />
      <Box s={[0.12, 0.78, h * 0.8]} p={[-w * 0.42, 0.39, 0]} m="woodDark" />
      <Box s={[w * 0.34, 0.62, h * 0.74]} p={[w * 0.28, 0.31, 0]} m="white" />
      <Box s={[w * 0.34, 0.28, h * 0.4]} p={[-w * 0.18, 0.96, -h * 0.04]} m="grayDark" />
      <Box s={[w * 0.34, 0.04, h * 0.4]} p={[-w * 0.18, 0.86, h * 0.2]} m="blue" />
    </group>
  )
}

function Tv({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.9, 0.4, h * 0.66]} p={[0, 0.2, 0]} m="woodDark" />
      <Box s={[w * 0.86, 0.62, 0.1]} p={[0, 0.78, -h * 0.16]} m="black" />
      <Box s={[w * 0.78, 0.5, 0.04]} p={[0, 0.78, -h * 0.16 + 0.07]} m="screen" />
    </group>
  )
}

function Beliche({ w, h }: FProps) {
  const post = (x: number, z: number, k: string) => (
    <Box key={k} s={[0.12, 2.4, 0.12]} p={[x, 1.2, z]} m="metal" />
  )
  return (
    <group>
      {post(-w * 0.44, -h * 0.46, 'p1')}
      {post(w * 0.44, -h * 0.46, 'p2')}
      {post(-w * 0.44, h * 0.46, 'p3')}
      {post(w * 0.44, h * 0.46, 'p4')}
      <Box s={[w * 0.92, 0.18, h * 0.92]} p={[0, 0.5, 0]} m="blue" />
      <Box s={[w * 0.84, 0.16, h * 0.84]} p={[0, 0.66, 0]} m="white" />
      <Box s={[w * 0.92, 0.18, h * 0.92]} p={[0, 1.72, 0]} m="green" />
      <Box s={[w * 0.84, 0.16, h * 0.84]} p={[0, 1.88, 0]} m="white" />
      <Box s={[0.08, 1.5, 0.08]} p={[w * 0.5, 1.05, h * 0.2]} m="metal" />
    </group>
  )
}

function Pufe() {
  return (
    <group>
      <Ball s={[0.96, 0.66, 0.96]} p={[0, 0.3, 0]} m="purple" />
      <Ball s={[0.66, 0.34, 0.66]} p={[0, 0.58, 0]} m="pink" />
    </group>
  )
}

function Globo() {
  return (
    <group>
      <Cyl s={[0.42, 0.1, 0.42]} p={[0, 0.05, 0]} m="woodDark" />
      <Cyl s={[0.06, 0.7, 0.06]} p={[0, 0.4, 0]} m="metal" />
      <Ball s={[0.5, 0.5, 0.5]} p={[0, 0.85, 0]} m="blue" />
      <Cone s={[0.34, 0.18, 0.34]} p={[0, 0.95, 0.08]} m="leaf" r={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

function Guitarra({ h }: FProps) {
  return (
    <group>
      <Ball s={[0.55, 0.72, 0.2]} p={[0, 0.55, 0]} m="red" />
      <Box s={[0.14, h * 0.92, 0.1]} p={[0, 1.3, 0]} m="woodDark" />
      <Box s={[0.22, 0.2, 0.1]} p={[0, 1.82, 0]} m="black" />
    </group>
  )
}

function Bola() {
  return (
    <group>
      <Ball s={[0.6, 0.6, 0.6]} p={[0, 0.32, 0]} m="white" />
      <Ball s={[0.18, 0.18, 0.06]} p={[0, 0.32, 0.3]} m="grayDark" />
      <Ball s={[0.14, 0.14, 0.06]} p={[0.26, 0.46, 0.12]} m="grayDark" />
    </group>
  )
}

// ── Novos itens de PAREDE (painéis flat) ──────────────────────────────────────
function Prateleira({ w }: FProps) {
  return (
    <group>
      <Box s={[w * 0.94, 0.12, 0.5]} p={[0, -0.18, 0.2]} m="woodDark" />
      <Box s={[0.08, 0.4, 0.42]} p={[-w * 0.42, -0.04, 0.16]} m="woodDark" />
      <Box s={[0.08, 0.4, 0.42]} p={[w * 0.42, -0.04, 0.16]} m="woodDark" />
      <Box s={[0.22, 0.34, 0.22]} p={[-w * 0.26, 0.05, 0.22]} m="red" />
      <Box s={[0.2, 0.28, 0.2]} p={[-w * 0.04, 0.02, 0.22]} m="green" />
      <Ball s={[0.24, 0.24, 0.24]} p={[w * 0.22, 0.0, 0.22]} m="blue" />
    </group>
  )
}

function Poster({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.92, h * 0.94, 0.04]} p={[0, 0, 0]} m="white" />
      <Box s={[w * 0.82, h * 0.48, 0.03]} p={[0, h * 0.18, 0.03]} m="purple" />
      <Box s={[w * 0.82, h * 0.34, 0.03]} p={[0, -h * 0.28, 0.03]} m="pink" />
      <Ball s={[w * 0.34, w * 0.34, 0.05]} p={[0, h * 0.2, 0.05]} m="yellow" />
    </group>
  )
}

function Espelho({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.9, h * 0.96, 0.08]} p={[0, 0, 0]} m="woodDark" />
      <Box s={[w * 0.72, h * 0.86, 0.04]} p={[0, 0, 0.05]} m="glass" />
    </group>
  )
}

// ── 🏆 Troféus (07/2026) — concedidos por conquista; dourado com brilho leve ──
function TrofeuPrimeiroJogo() {
  return (
    <group>
      <Box s={[0.56, 0.16, 0.56]} p={[0, 0.08, 0]} m="woodDark" />
      <Cyl s={[0.14, 0.3, 0.14]} p={[0, 0.3, 0]} m="gold" />
      <Cyl s={[0.42, 0.34, 0.42]} p={[0, 0.62, 0]} m="gold" />
      <Ball s={[0.14, 0.14, 0.14]} p={[-0.3, 0.66, 0]} m="gold" />
      <Ball s={[0.14, 0.14, 0.14]} p={[0.3, 0.66, 0]} m="gold" />
      <Ball s={[0.16, 0.16, 0.16]} p={[0, 0.88, 0]} m="yellow" />
    </group>
  )
}

function TrofeuDiploma({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.88, h * 0.9, 0.08]} p={[0, 0, 0]} m="gold" />
      <Box s={[w * 0.72, h * 0.72, 0.04]} p={[0, 0, 0.05]} m="cream" />
      <Ball s={[w * 0.18, w * 0.18, 0.06]} p={[w * 0.2, -h * 0.22, 0.08]} m="red" />
      <Box s={[w * 0.5, 0.05, 0.03]} p={[0, h * 0.16, 0.07]} m="grayDark" />
      <Box s={[w * 0.42, 0.05, 0.03]} p={[0, h * 0.02, 0.07]} m="grayDark" />
    </group>
  )
}

function TrofeuChama() {
  return (
    <group>
      <Cyl s={[0.5, 0.2, 0.5]} p={[0, 0.1, 0]} m="grayDark" />
      <Cone s={[0.36, 0.6, 0.36]} p={[0, 0.5, 0]} m="red" />
      <Cone s={[0.22, 0.44, 0.22]} p={[0.04, 0.62, 0]} m="yellow" />
      <Cone s={[0.1, 0.26, 0.1]} p={[-0.03, 0.74, 0]} m="lamp" />
    </group>
  )
}

function TrofeuMedalhaMil({ w, h }: FProps) {
  return (
    <group>
      <Box s={[w * 0.34, h * 0.5, 0.05]} p={[0, h * 0.24, 0]} m="blue" />
      <Ball s={[w * 0.6, w * 0.6, 0.12]} p={[0, -h * 0.14, 0.04]} m="gold" />
      <Ball s={[w * 0.4, w * 0.4, 0.1]} p={[0, -h * 0.14, 0.1]} m="yellow" />
    </group>
  )
}

function TrofeuFoguete({ h }: FProps) {
  return (
    <group>
      <Cyl s={[0.5, 0.16, 0.5]} p={[0, 0.08, 0]} m="grayDark" />
      <Cyl s={[0.34, h * 0.5, 0.34]} p={[0, h * 0.36, 0]} m="white" />
      <Cone s={[0.34, 0.4, 0.34]} p={[0, h * 0.66, 0]} m="red" />
      <Ball s={[0.16, 0.16, 0.1]} p={[0, h * 0.4, 0.16]} m="glass" />
      <Cone s={[0.16, 0.3, 0.16]} p={[-0.22, 0.24, 0]} m="red" />
      <Cone s={[0.16, 0.3, 0.16]} p={[0.22, 0.24, 0]} m="red" />
      <Cone s={[0.2, 0.26, 0.2]} p={[0, 0.12, 0]} m="lamp" r={[Math.PI, 0, 0]} />
    </group>
  )
}

function TrofeuConsole() {
  return (
    <group>
      <Box s={[0.6, 0.5, 0.44]} p={[0, 0.4, 0]} m="grayDark" />
      <Box s={[0.48, 0.3, 0.04]} p={[0, 0.46, 0.23]} m="screen" />
      <Box s={[0.64, 0.16, 0.5]} p={[0, 0.08, 0]} m="gold" />
      <Ball s={[0.08, 0.08, 0.08]} p={[-0.14, 0.14, 0.28]} m="red" />
      <Ball s={[0.08, 0.08, 0.08]} p={[0.14, 0.14, 0.28]} m="green" />
    </group>
  )
}

// 5 pontas da estrela no plano XY (uma p/ cima), pré-computadas (graus → rad).
const STAR_RAYS = [0, 72, 144, 216, 288].map((deg) => (deg * Math.PI) / 180)

function TrofeuEstrelaDoMural() {
  return (
    <group>
      <Cyl s={[0.5, 0.2, 0.5]} p={[0, 0.1, 0]} m="grayDark" />
      <Cyl s={[0.12, 0.34, 0.12]} p={[0, 0.36, 0]} m="gold" />
      {/* estrela dourada de frente: núcleo + 5 pontas de cone irradiando no plano XY */}
      <Ball s={[0.2, 0.2, 0.14]} p={[0, 0.68, 0]} m="gold" />
      {STAR_RAYS.map((theta) => (
        <Cone
          key={theta}
          s={[0.11, 0.26, 0.11]}
          p={[-Math.sin(theta) * 0.22, 0.68 + Math.cos(theta) * 0.22, 0]}
          r={[0, 0, theta]}
          m="yellow"
        />
      ))}
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
    case 'mesa':
      return <Mesa w={w} h={h} />
    case 'mesa-estudo':
      return <MesaEstudo w={w} h={h} />
    case 'tv':
      return <Tv w={w} h={h} />
    case 'beliche':
      return <Beliche w={w} h={h} />
    case 'pufe':
      return <Pufe />
    case 'globo':
      return <Globo />
    case 'guitarra':
      return <Guitarra w={w} h={h} />
    case 'bola':
      return <Bola />
    case 'quadro':
      return <Quadro w={w} h={h} />
    case 'estrela':
      return <Estrela w={w} h={h} />
    case 'janela':
      return <Janela w={w} h={h} />
    case 'prateleira':
      return <Prateleira w={w} h={h} />
    case 'poster':
      return <Poster w={w} h={h} />
    case 'espelho':
      return <Espelho w={w} h={h} />
    case 'bandeira':
      return <Bandeira w={w} h={h} />
    case 'ursinho':
      return <Ursinho />
    case 'balao':
      return <Balao />
    case 'relogio':
      return <Relogio w={w} h={h} />
    case 'planta':
      return <Planta />
    case 'arvore':
      return <Arvore w={w} h={h} />
    case 'luminaria':
      return <Luminaria />
    case 'vela':
      return <Vela />
    case 'trofeu-primeiro-jogo':
      return <TrofeuPrimeiroJogo />
    case 'trofeu-diploma':
      return <TrofeuDiploma w={w} h={h} />
    case 'trofeu-chama':
      return <TrofeuChama />
    case 'trofeu-medalha-mil':
      return <TrofeuMedalhaMil w={w} h={h} />
    case 'trofeu-foguete':
      return <TrofeuFoguete w={w} h={h} />
    case 'trofeu-console':
      return <TrofeuConsole />
    case 'trofeu-estrela-do-mural':
      return <TrofeuEstrelaDoMural />
    default:
      return <FallbackBox w={w} h={h} />
  }
}
