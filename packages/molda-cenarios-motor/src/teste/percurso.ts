import type { MedidaDoPercurso, PontoDoTeste } from './tipos'

const ponto = (p: PontoDoTeste): PontoDoTeste => ({ x: p.x, y: p.y, z: p.z })
const distancia = (a: PontoDoTeste, b: PontoDoTeste) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** Recebe somente subpassos físicos ativos. Nunca liga uma retomada ao trecho anterior. */
export class PercursoDoTeste {
  private valor: MedidaDoPercurso = {
    estado: 'parado',
    inicio: null,
    fim: null,
    direta: 0,
    caminhada: 0,
    segundos: 0,
  }
  ler(): MedidaDoPercurso {
    return {
      ...this.valor,
      inicio: this.valor.inicio && ponto(this.valor.inicio),
      fim: this.valor.fim && ponto(this.valor.fim),
    }
  }
  iniciar(p: PontoDoTeste) {
    this.valor = {
      estado: 'medindo',
      inicio: ponto(p),
      fim: ponto(p),
      direta: 0,
      caminhada: 0,
      segundos: 0,
    }
  }
  finalizar(p: PontoDoTeste) {
    if (this.valor.estado === 'medindo') {
      this.atualizarFim(p)
      this.valor.estado = 'concluido'
    }
  }
  zerar() {
    this.valor = { estado: 'parado', inicio: null, fim: null, direta: 0, caminhada: 0, segundos: 0 }
  }
  passo(antes: PontoDoTeste, depois: PontoDoTeste, segundos: number, caminhando: boolean) {
    if (this.valor.estado !== 'medindo' || !caminhando || segundos <= 0 || segundos > 0.1) return
    this.valor.caminhada += distancia(antes, depois)
    this.valor.segundos += segundos
    this.atualizarFim(depois)
  }
  private atualizarFim(p: PontoDoTeste) {
    this.valor.fim = ponto(p)
    this.valor.direta = this.valor.inicio ? distancia(this.valor.inicio, p) : 0
  }
}
