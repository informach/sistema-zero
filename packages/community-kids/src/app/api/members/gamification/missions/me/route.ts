import { shell } from '@/server/shell'

// Missões diárias/semanais do aluno (progresso derivado do ledger no members).
export const { GET } = shell.routes.missionsGet
