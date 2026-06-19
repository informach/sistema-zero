import { t } from 'elysia'

const Channel = t.Union([t.Literal('email'), t.Literal('whatsapp')])

/** Params `:id` (uuid) — sem isto um id malformado vira erro de cast do Postgres (500). */
export const IdParams = t.Object({ id: t.String({ format: 'uuid' }) })

/** Anexo por URL (e-mail): só METADADOS viajam no body (teto 64KB) — o worker
 *  busca os bytes na `url` no momento do envio. */
const SendAttachment = t.Object({
  filename: t.String({ minLength: 1, maxLength: 200 }),
  url: t.String({ pattern: '^https?://', maxLength: 2048 }),
  contentType: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
})

export const SendBody = t.Object({
  channel: Channel,
  templateKey: t.String({ minLength: 1, maxLength: 64 }),
  recipient: t.Object({
    name: t.String({ minLength: 1, maxLength: 200 }),
    email: t.Optional(t.String({ format: 'email', maxLength: 254 })),
    phone: t.Optional(t.String({ minLength: 8, maxLength: 20 })),
  }),
  variables: t.Optional(t.Record(t.String(), t.String())),
  attachments: t.Optional(t.Array(SendAttachment, { maxItems: 3 })),
  senderId: t.Optional(t.String({ format: 'uuid' })),
  scheduledAt: t.Optional(t.String({ format: 'date-time' })),
  priority: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})

// ── Templates ─────────────────────────────────────────────────────────────────
export const CreateTemplateBody = t.Object({
  key: t.String({ minLength: 1, maxLength: 64 }),
  channel: Channel,
  name: t.String({ minLength: 1, maxLength: 200 }),
  subject: t.Optional(t.String({ maxLength: 300 })),
  body: t.String({ minLength: 1, maxLength: 20_000 }),
  variables: t.Optional(t.Array(t.String({ maxLength: 64 }), { maxItems: 50 })),
  active: t.Optional(t.Boolean()),
})

export const UpdateTemplateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  subject: t.Optional(t.String({ maxLength: 300 })),
  body: t.Optional(t.String({ minLength: 1, maxLength: 20_000 })),
  variables: t.Optional(t.Array(t.String({ maxLength: 64 }), { maxItems: 50 })),
  active: t.Optional(t.Boolean()),
})

export const ListTemplatesQuery = t.Object({
  channel: t.Optional(Channel),
  q: t.Optional(t.String({ maxLength: 100 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
})

// ── Remetentes de e-mail ────────────────────────────────────────────────────────
const SenderStatus = t.Union([t.Literal('VERIFIED'), t.Literal('UNVERIFIED')])

export const CreateSenderBody = t.Object({
  fromEmail: t.String({ format: 'email', maxLength: 254 }),
  fromName: t.String({ minLength: 1, maxLength: 200 }),
  replyTo: t.Optional(t.String({ format: 'email', maxLength: 254 })),
  status: t.Optional(SenderStatus),
  enabled: t.Optional(t.Boolean()),
  isDefault: t.Optional(t.Boolean()),
})

export const UpdateSenderBody = t.Object({
  fromName: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  replyTo: t.Optional(t.String({ format: 'email', maxLength: 254 })),
  status: t.Optional(SenderStatus),
  enabled: t.Optional(t.Boolean()),
  isDefault: t.Optional(t.Boolean()),
})

// ── Instâncias de WhatsApp (pool de números) ────────────────────────────────────
const InstanceStatus = t.Union([
  t.Literal('CONNECTED'),
  t.Literal('DISCONNECTED'),
  t.Literal('PAUSED'),
  t.Literal('BANNED'),
])

export const CreateInstanceBody = t.Object({
  instanceName: t.String({ minLength: 1, maxLength: 100 }),
  phoneNumber: t.String({ minLength: 8, maxLength: 20 }),
  dailyCap: t.Optional(t.Integer({ minimum: 1, maximum: 100_000 })),
  warmup: t.Optional(t.Boolean()),
})

export const UpdateInstanceBody = t.Object({
  status: t.Optional(InstanceStatus),
  enabled: t.Optional(t.Boolean()),
  dailyCap: t.Optional(t.Integer({ minimum: 1, maximum: 100_000 })),
  warmup: t.Optional(t.Boolean()),
})

export const ListQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
})

export const ListMessagesQueryDto = t.Object({
  channel: t.Optional(Channel),
  status: t.Optional(
    t.Union([
      t.Literal('QUEUED'),
      t.Literal('SCHEDULED'),
      t.Literal('SENDING'),
      t.Literal('SENT'),
      t.Literal('DELIVERED'),
      t.Literal('READ'),
      t.Literal('FAILED'),
      t.Literal('SUPPRESSED'),
    ]),
  ),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
})
