import type { Minijogo, MinijogoAberto } from '@sistemazero/arquipelago-contracts'
import type { Jogador } from './jogador'

export interface RepositorioDosMinijogos {
  guardar(e: {
    jogador: Jogador
    desafioId: string
    titulo: string
    projeto: unknown
    agora: Date
  }): Promise<void>
  listar(jogadorId: string): Promise<Minijogo[]>
  abrir(jogadorId: string, desafioId: string): Promise<MinijogoAberto | null>
  pertenceAConta(jogadorId: string, contaId: string): Promise<boolean>
}
