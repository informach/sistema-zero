import { shell } from '@/server/shell'

// Arquipélago Vagalume: o cliente compilado do jogo (manifesto e arquivos com hash), na mesma
// origem. Fora do matcher do proxy: o navegador importa o módulo sem a prova da sessão.
export const { GET } = shell.routes.arquipelagoCliente
