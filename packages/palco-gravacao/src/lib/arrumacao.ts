/** A caixa de uma pilha de blocos na tela. */
export interface Caixa {
  left: number
  top: number
  right: number
  bottom: number
}

/** Alguma pilha cobre parte de outra. */
export function sobrepostas(caixas: readonly Caixa[]): boolean {
  for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i]
      const b = caixas[j]
      if (!a || !b) continue
      if (a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top) return true
    }
  return false
}

/** Tentativas de abrir o menu antes de deixar a área como está. */
const TENTATIVAS = 3

/**
 * A arrumação de quando o Estúdio abre: cada área de trabalho nova passa por ela uma vez, e com
 * pilhas uma por cima da outra (o projeto que veio de outra parte ou dos exemplos da aula) recebe
 * Organizar blocos antes de a gravação começar. Enquanto ela não passou, a página está ocupada,
 * e o EdiAula espera para ligar o vídeo. Uma área já vista não é mexida de novo: o que o robô faz
 * nela durante a gravação fica como ele fez.
 */
export function arrumacao<Area extends object>() {
  const feitas = new WeakSet<Area>()
  const vistas = new WeakMap<Area, { pilhas: number; tentativas: number }>()
  let andando = false
  return {
    /** A área tem blocos e ainda não passou pela arrumação. */
    pendente(area: Area | null, caixas: readonly Caixa[]): boolean {
      return !!area && caixas.length > 0 && !feitas.has(area)
    },
    /** Um passo, a cada pouco: decide só quando as pilhas pararam de chegar. */
    async passo(
      area: Area | null,
      caixas: readonly Caixa[],
      organizar: () => Promise<boolean>,
    ): Promise<void> {
      if (!area || andando || feitas.has(area) || caixas.length === 0) return
      const antes = vistas.get(area)
      // Os blocos do projeto aparecem aos poucos: espera a contagem repetir.
      if (antes?.pilhas !== caixas.length) {
        vistas.set(area, { pilhas: caixas.length, tentativas: antes?.tentativas ?? 0 })
        return
      }
      if (!sobrepostas(caixas)) {
        feitas.add(area)
        return
      }
      andando = true
      try {
        const ok = await organizar().catch(() => false)
        antes.tentativas++
        if (ok || antes.tentativas >= TENTATIVAS) feitas.add(area)
      } finally {
        andando = false
      }
    },
  }
}
