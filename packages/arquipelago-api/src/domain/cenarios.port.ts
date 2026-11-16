import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'

export interface RevisaoDeCenario {
  projetoId: string
  revisao: number
  documento: DocumentoDeCenario
  autorId: string
  criadoEm: string
  operacaoId: string
  impressao: string
}
export interface ProjetoDeCenario {
  id: string
  nome: string
  revisao: number
  revisaoAplicada: number | null
  atualizadoEm: string
  autorId: string
}
export interface RepositorioDeCenarios {
  listar(): Promise<ProjetoDeCenario[]>
  criar(revisao: RevisaoDeCenario): Promise<boolean>
  ler(id: string, revisao?: number): Promise<RevisaoDeCenario | null>
  historico(id: string, antesDe?: number): Promise<Omit<RevisaoDeCenario, 'documento'>[]>
  operacao(id: string, operacaoId: string): Promise<RevisaoDeCenario | null>
  gravar(revisao: RevisaoDeCenario, revisaoEsperada: number): Promise<boolean>
  aplicar(id: string, revisao: number): Promise<boolean>
}
