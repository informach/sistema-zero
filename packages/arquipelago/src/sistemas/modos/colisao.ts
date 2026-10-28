import type { Ponto } from '../cipo'
import { CORPO } from '../corpo'
import type {
  AvisoDeModo,
  EntradaDoPasso,
  EstadoDoCorpo,
  ModoDeMovimento,
  MundoDoMovimento,
} from './tipos'
import { mudarModo } from './trocas'

/** A fronteira com o controlador físico; os modos continuam independentes do renderer. */
export interface ControladorFisico<Colisor> {
  enableAutostep(altura: number, largura: number, dinamicos: boolean): void
  disableAutostep(): void
  computeColliderMovement(
    colisor: Colisor,
    deslocamento: Ponto,
    flags?: number,
    grupos?: undefined,
    aceitar?: (colisor: Colisor) => boolean,
  ): void
  computedMovement(): Ponto
  computedGrounded(): boolean
  numComputedCollisions(): number
  computedCollision(indice: number): { normal1: Ponto } | null
}

const NORMAL_DE_APOIO = Math.cos((CORPO.sobeAte * Math.PI) / 180)

/** O apoio pode elevar/desviar a cápsula na quina sem interromper o percurso. */
function somenteApoio<Colisor>(controlador: ControladorFisico<Colisor>): boolean {
  const total = controlador.numComputedCollisions()
  if (total === 0) return false
  for (let i = 0; i < total; i++) {
    const contato = controlador.computedCollision(i)
    if (!contato || contato.normal1.y < NORMAL_DE_APOIO) return false
  }
  return true
}

export function passoComColisao<Colisor>(
  modo: ModoDeMovimento,
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  mundo: MundoDoMovimento,
  colisor: Colisor,
  chao: ControladorFisico<Colisor>,
  livre: ControladorFisico<Colisor>,
  filtro: number,
  aceitar: (colisor: Colisor) => boolean,
  aviso: AvisoDeModo,
): boolean {
  const controlador = modo.passo(c, e, mundo)
  const guiado = controlador === 'direto'
  const k = controlador === 'chao' ? chao : livre
  if (controlador === 'chao') {
    if (c.noChao) chao.enableAutostep(CORPO.degrau, 0.25, true)
    else chao.disableAutostep()
  }
  if (guiado) {
    c.desloc.x = c.prox.x - e.p.x
    c.desloc.y = c.prox.y - e.p.y
    c.desloc.z = c.prox.z - e.p.z
  }
  k.computeColliderMovement(colisor, c.desloc, filtro, undefined, aceitar)
  const mov = k.computedMovement()
  const pisou = controlador === 'chao' && k.computedGrounded()
  // Os modos guiados calculam um alvo; a física continua tendo a última palavra.
  // Correções de contato inferiores a 5% da folga mantêm o apoio. A cápsula recebe
  // SEMPRE o movimento do Rapier, inclusive abaixo desse limiar (não ignora a colisão).
  const pedido = Math.hypot(c.desloc.x, c.desloc.y, c.desloc.z)
  const avancou =
    pedido > 0 ? (mov.x * c.desloc.x + mov.y * c.desloc.y + mov.z * c.desloc.z) / pedido : 0
  const bloqueado = guiado && pedido - avancou > CORPO.folga * 0.05 && !somenteApoio(k)
  const gastou = modo.depois(c, e, mundo, guiado ? null : mov, pisou, aviso)
  if (guiado) {
    c.prox.x = e.p.x + mov.x
    c.prox.y = e.p.y + mov.y
    c.prox.z = e.p.z + mov.z
    if (bloqueado) {
      // Não continuar avançando o parâmetro do trilho atrás da parede nem saltar para
      // recuperá-lo no quadro seguinte. Solta o apoio e volta ao controle com colisão.
      if (c.modo !== 'chao') mudarModo(c, 'chao', e.agora, aviso)
      c.noChao = false
      c.velY = 0
      c.vel.x = c.vel.z = 0
      c.embalo.x = c.embalo.y = c.embalo.z = 0
    }
  }
  return gastou
}
