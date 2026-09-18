/**
 * O sorteio com SEMENTE dos fundos.
 *
 * ⚠️⚠️ É o que substitui o `Math.random()` que o runtime usa para espalhar nuvens, morros,
 * estrelas e prédios. Sem ele, a mesma cena desenharia um céu diferente a cada render — e o palco
 * re-renderiza a cada gesto da criança, o que faria o fundo inteiro piscar no meio do experimento.
 * É a mesma decisão que o `scene-figures.tsx` já tinha tomado para as estrelas dele, e este é
 * literalmente o mesmo gerador (Lehmer, 16807 / 2^31−1), agora num lugar só.
 */
export function sorteioComSemente(semente: number): () => number {
  let s = Math.floor(Math.abs(semente)) % 2147483647
  if (s === 0) s = 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
