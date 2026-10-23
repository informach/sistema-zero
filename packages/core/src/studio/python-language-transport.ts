import { z } from 'zod'

/** The BFF may acknowledge fresh authorization before native startup finishes.
 * HTTP failures before that acknowledgement keep their ordinary status. */
export const StudioPythonLanguageTransportSchema = z.strictObject({
  transportVersion: z.literal(1),
  status: z.number().int().min(200).max(599),
  body: z.unknown(),
})
