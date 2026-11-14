import type { Object3D, Quaternion, Vector3 } from 'three'

/**
 * Para quem mexe nos ossos DEPOIS da pose do mixer (os pés no chão, os dedos no cabo da lanterna).
 *
 * O mixer do three só reescreve um osso quando o valor animado muda de um quadro para o outro
 * (`PropertyMixer.apply`). Na pausa, ou num clipe em que aquele osso fica parado, ele não reescreve:
 * o ajuste do quadro anterior continua no osso, e somar outro ajuste em cima o acumula (o quadril
 * afundava no chão a cada quadro com o jogo pausado numa rampa).
 *
 * `antes()` devolve a cada osso a pose que o mixer deixou: se o osso ainda tem exatamente o que o
 * ajuste escreveu no quadro anterior, o mixer não passou por ele, e volta a pose guardada; senão,
 * o mixer escreveu de novo, e a pose nova é guardada. `depois()` lembra o que o ajuste escreveu.
 * `soltar()` devolve a pose do mixer quando o ajuste para de vez (a lanterna saiu da mão).
 */
export class PoseLimpa {
  private readonly base: { posicao: Vector3; giro: Quaternion }[]
  private readonly escrito: { posicao: Vector3; giro: Quaternion }[]
  private temEscrito = false

  constructor(private readonly ossos: readonly Object3D[]) {
    this.base = ossos.map((o) => ({ posicao: o.position.clone(), giro: o.quaternion.clone() }))
    this.escrito = ossos.map((o) => ({ posicao: o.position.clone(), giro: o.quaternion.clone() }))
  }

  antes(): void {
    this.ossos.forEach((o, i) => {
      const base = this.base[i]
      const escrito = this.escrito[i]
      if (!base || !escrito) return
      if (
        this.temEscrito &&
        o.position.equals(escrito.posicao) &&
        o.quaternion.equals(escrito.giro)
      ) {
        o.position.copy(base.posicao)
        o.quaternion.copy(base.giro)
      } else {
        base.posicao.copy(o.position)
        base.giro.copy(o.quaternion)
      }
    })
  }

  depois(): void {
    this.ossos.forEach((o, i) => {
      const escrito = this.escrito[i]
      if (!escrito) return
      escrito.posicao.copy(o.position)
      escrito.giro.copy(o.quaternion)
    })
    this.temEscrito = true
  }

  soltar(): void {
    this.antes()
    this.temEscrito = false
  }
}
