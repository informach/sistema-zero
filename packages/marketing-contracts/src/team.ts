import { z } from 'zod'
import { idSchema, permissionSchema } from './common'
export const staffIdentitySchema = z
  .object({ id: idSchema, name: z.string().min(1), active: z.boolean() })
  .strict()
export type StaffIdentity = z.infer<typeof staffIdentitySchema>
export const teamMemberSchema = staffIdentitySchema.extend({
  permissions: z.array(permissionSchema),
})
export type TeamMember = z.infer<typeof teamMemberSchema>
