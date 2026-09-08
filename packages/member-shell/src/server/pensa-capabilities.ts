import 'server-only'
import { creativeToolAvailability } from '@sistemazero/core/career'
import { isPrivilegedRole, resolveStudioTier } from '../lib/studio-tier'
import type { MembersClient } from './clients'
import { extensionsForBlocks } from './studio-unlocks'

/** Generation and review use the same earned block set as the free Studio. */
export async function getPensaCapabilities(
  members: Pick<MembersClient, 'getStudioUnlocksReadonly' | 'checkCreativeToolsAccessReadonly'>,
  level: string | undefined,
  role: string | undefined,
) {
  if (!level) return null
  const [unlocks, access] = await Promise.all([
    members.getStudioUnlocksReadonly(),
    members.checkCreativeToolsAccessReadonly(),
  ])
  if (unlocks.status !== 200 || !unlocks.body || access.status !== 200 || !access.body) return null
  const blocks = unlocks.body.blocks
  const tier = resolveStudioTier(level, role, { blocks, extensions: extensionsForBlocks(blocks) })
  const available = (tool: 'molda' | 'pinta' | 'estudio-completo') =>
    creativeToolAvailability({
      tool,
      owned: access.body.access[tool] === true,
      level,
      privileged: isPrivilegedRole(role),
    }) === 'available'
  return {
    tier,
    moldaAvailable: available('molda'),
    pintaAvailable: available('pinta'),
    studioAvailable: available('estudio-completo'),
  }
}
