export interface AmostraDaPausa {
  x: number
  y: number
  z: number
  noChao: boolean
}

/** O medidor publica a cada 250 ms. Altura fixa não indica se o corpo ainda está no ar. */
export function conferirPausaNoAr(amostras: readonly AmostraDaPausa[]): AmostraDaPausa {
  if (amostras.length !== 5) throw new Error('Medidor não produziu as cinco amostras da pausa.')
  const primeira = amostras[0]
  if (!primeira || amostras.some((a) => a.noChao))
    throw new Error('Pausa não foi observada durante a queda.')
  for (const a of amostras) {
    const deslocamento = Math.hypot(a.x - primeira.x, a.y - primeira.y, a.z - primeira.z)
    if (!Number.isFinite(deslocamento) || deslocamento > 0.02)
      throw new Error(`Personagem continua movendo com menu aberto: ${JSON.stringify(amostras)}`)
  }
  return amostras[4] as AmostraDaPausa
}
