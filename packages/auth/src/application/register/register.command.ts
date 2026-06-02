/** Comando de cadastro (registro). `phone`/`source` são opcionais. */
export interface RegisterCommand {
  email: string
  password: string
  firstName: string
  lastName: string
  /** Opcional: telefone. */
  phone?: string
  /** Opcional: origem do cadastro (app/canal: funnel/web/mobile/admin). */
  source?: string
  userAgent?: string | null
  ip?: string | null
}
