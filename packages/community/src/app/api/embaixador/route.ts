import { requireOwnAdultAccount } from '@/server/own-account'
import { shell } from '@/server/shell'

// Embaixador do presente em Meu perfil (20/10/2026): a mesma lógica do Kids (member-shell), com a
// régua da CONTA adulta própria. Leitura e cadastro recusam qualquer sessão de suporte.
export const GET = requireOwnAdultAccount(shell.routes.ambassadorMe.GET)
export const POST = requireOwnAdultAccount(shell.routes.ambassadorMe.POST)
