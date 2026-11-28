import { createFreeProRuntimeBuild } from '@sistemazero/member-shell/server/free-pro-toolchain'
import { authorizeFreeStudioPro } from '@/server/free-studio-pro-access'
export const runtime = 'nodejs'
export const POST = createFreeProRuntimeBuild(authorizeFreeStudioPro)
