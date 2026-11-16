import type { ProjetoDeCenario, RevisaoDeCenario } from '@sistemazero/molda-cenarios-core'

export type { ProjetoDeCenario, RevisaoDeCenario } from '@sistemazero/molda-cenarios-core'
export interface RepositorioDeCenarios {
  listar(): Promise<ProjetoDeCenario[]>
  criar(revisao: RevisaoDeCenario): Promise<boolean>
  ler(id: string, revisao?: number): Promise<RevisaoDeCenario | null>
  historico(id: string, antesDe?: number): Promise<Omit<RevisaoDeCenario, 'documento'>[]>
  operacao(id: string, operacaoId: string): Promise<RevisaoDeCenario | null>
  gravar(revisao: RevisaoDeCenario, revisaoEsperada: number): Promise<boolean>
  aplicar(id: string, revisao: number,autorId?:string): Promise<boolean>
  aplicado?(base:string):Promise<RevisaoDeCenario|null>
}
