import type { Database } from './db'

export type TransacaoDeCenarios = Parameters<Parameters<Database['transaction']>[0]>[0]
export type ExecutorDeCenarios = Database | TransacaoDeCenarios
