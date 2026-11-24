import { shell } from '@/server/shell'
export const runtime = 'nodejs'
// O "Construir" do Pro espera o executor (até 170 s no adaptador): o mesmo teto do Kids.
export const maxDuration = 180
export const { POST } = shell.routes.studioBuilder
