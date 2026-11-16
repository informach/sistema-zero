/** Três lances nativos do Templo. A geometria, o furo do terreno e os passeios usam este desenho. */
const escala = 0.65,
  inicio = 118,
  comprimento = 5.6 * escala,
  subida = 3 * escala
export const ESCADAS_DA_COLINA = Array.from({ length: 3 }, (_, i) => ({
  id: `escada-farol-${i}`,
  peca: 'escadaria_pedra_3m',
  x: -3,
  z: inicio - comprimento * (i + 0.5),
  altura: 4 + i * subida,
  giro: 0,
  escala,
  solida: 'escada' as const,
}))
const frente = inicio + 0.04,
  fundo = inicio - 3 * comprimento + 0.02
export const RECORTE_DA_COLINA = {
  furo: [
    { x: -4.14, z: frente },
    { x: -1.86, z: frente },
    { x: -1.86, z: fundo },
    { x: -4.14, z: fundo },
  ],
  retangulo: { minX: -8, maxX: 0, minZ: 104, maxZ: 120 },
}
export const RAMPA_DA_COLINA = {
  inicio,
  fim: inicio - 3 * comprimento,
  subida: 3 * subida,
  inclinacao: subida / comprimento,
}
