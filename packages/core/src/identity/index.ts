import { z } from 'zod'

/** Existing Auth/HTTP/Postgres identity contract: format only, without RFC version/variant gates. */
export const IDENTITY_UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
export const IdentityUuidSchema = z.string().regex(new RegExp(IDENTITY_UUID_PATTERN)).transform((value) => value.toLowerCase())
