import { z } from 'zod'

/**
 * Booleano a partir de string de ambiente, com default. Aceita apenas
 * `true/false/1/0` (case-insensitive) — valores inválidos FALHAM no boot em vez
 * de virarem `false` silenciosamente.
 */
const BOOL_VALUES = new Set(['true', 'false', '1', '0'])
const optionalBool = (def: boolean) =>
  z
    .string()
    .optional()
    .refine((v) => v === undefined || BOOL_VALUES.has(v.toLowerCase()), {
      message: "deve ser 'true', 'false', '1' ou '0'",
    })
    .transform((v) => (v === undefined ? def : v.toLowerCase() === 'true' || v === '1'))

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    // Endereço de bind. `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório
    // para o private networking do Railway (`payments.railway.internal` resolve
    // IPv6; ambientes legados são IPv6-only e um bind `0.0.0.0` fica inalcançável).
    HOST: z.string().min(1).default('::'),
    HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
    TRUST_PROXY: optionalBool(false),
    // Nº de proxies confiáveis na frente do app (resolve o IP do cliente como a
    // N-ésima entrada do X-Forwarded-For a partir da direita). Só vale com TRUST_PROXY.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().positive().default(1),
    // Teto do corpo da requisição (bytes) — anti-DoS por payload gigante. 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),
    // Rotas admin (`/payments/admin/*`): confere os headers `X-Auth-User-*` que o
    // gateway injeta (defesa em profundidade). Seguro por default; só desligue
    // (`false`) em dev quando bater no serviço SEM passar pelo gateway.
    REQUIRE_ADMIN: optionalBool(true),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

    EFI_CLIENT_ID: z.string().min(1, 'EFI_CLIENT_ID é obrigatória'),
    EFI_CLIENT_SECRET: z.string().min(1, 'EFI_CLIENT_SECRET é obrigatória'),
    EFI_SANDBOX: optionalBool(true),
    // Certificado P12 da Efí: por caminho de arquivo OU por conteúdo em base64
    // (preferível em PaaS como Railway, que não têm upload de arquivo persistente).
    EFI_CERTIFICATE_PATH: z.string().optional(),
    EFI_CERTIFICATE_BASE64: z.string().optional(),
    // Senha do P12 da Efí (quando o arquivo for protegido). Ausente = sem senha.
    EFI_CERTIFICATE_PASSWORD: z.string().optional(),
    EFI_PIX_KEY: z.string().min(1, 'EFI_PIX_KEY é obrigatória'),
    // String vazia desabilitaria silenciosamente o token de webhook (defesa extra).
    // Para desligar, deixe a variável AUSENTE — não vazia.
    EFI_WEBHOOK_SECRET: z
      .string()
      .min(1, 'EFI_WEBHOOK_SECRET não pode ser vazia; remova a variável para desabilitar')
      .optional(),
    // Timeout POR TENTATIVA de requisição HTTP à Efí (ms) — aborta sockets
    // pendurados (mTLS/Bun). Default 20s: o handshake mTLS frio leva ~15-16s sob
    // Bun (15s abortava a request no fim do handshake → PIX 502).
    EFI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    // Teto de tempo da operação INTEIRA contra a Efí (todas as tentativas +
    // backoff, ms). Sem ele o pior caso é (maxRetries+1)×timeout ≈ 86s — acima do
    // timeout do gateway (35s) E do TTL da reserva de idempotência (ver refine
    // abaixo), cuja expiração com a request original viva reabre a janela de
    // cobrança duplicada. A 1ª tentativa sempre roda; o budget só corta retries.
    EFI_TOTAL_RETRY_BUDGET_MS: z.coerce.number().int().positive().default(30_000),
    // TTL da reserva IN_FLIGHT de idempotência (s). Recicla reservas presas por
    // crash e é o LOCKOUT do retry do cliente após falha com efeito colateral.
    // Deve cobrir com folga o budget total da Efí (refine abaixo) — a reserva
    // expirar com a request original VIVA permite outra reserva → novo
    // paymentId/txid → cobrança duplicada no provedor.
    IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: z.coerce.number().int().positive().default(60),

    // Boleto (API Cobranças — SEM certificado/mTLS). Por padrão reusa as
    // credenciais do Pix (a mesma aplicação Efí pode ter os dois escopos);
    // os overrides abaixo só são necessários para uma aplicação separada.
    EFI_COBRANCAS_CLIENT_ID: z.string().optional(),
    EFI_COBRANCAS_CLIENT_SECRET: z.string().optional(),
    EFI_BOLETO_DEFAULT_EXPIRES_DAYS: z.coerce.number().int().positive().default(3),
    // URL pública que a Efí chama na mudança de status do boleto (metadata.notification_url).
    EFI_BOLETO_NOTIFICATION_URL: z.string().url().optional(),
    // Multa/juros padrão (% em centavos, ex.: 200 = 2,00%) aplicados quando não vierem na request.
    EFI_BOLETO_FINE: z.coerce.number().int().nonnegative().optional(),
    EFI_BOLETO_INTEREST: z.coerce.number().int().nonnegative().optional(),

    // Token do `GET /metrics` (`x-metrics-token` ou `Authorization: Bearer`). O
    // serviço tem domínio público (o webhook da Efí chega direto), então /metrics
    // não pode ficar aberto em produção — o refine abaixo o torna obrigatório.
    METRICS_TOKEN: z.string().min(16, 'METRICS_TOKEN deve ter pelo menos 16 caracteres').optional(),

    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    // Após N falhas de publicação, o evento vira DEAD (sai da fila → não bloqueia).
    OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),

    // Escala / resiliência. Default 20: o pool é compartilhado pelo hot path +
    // 4 workers + leituras admin (N réplicas × este valor deve caber no
    // max_connections do Postgres — use pooler em escala).
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
    // LISTEN/NOTIFY acorda os workers na hora (latência ~ms). Desligue (false) atrás
    // de PgBouncer em modo transaction/statement pooling (não suporta LISTEN) — o
    // poll periódico continua processando normalmente.
    PG_LISTEN_ENABLED: optionalBool(true),
    IDEMPOTENCY_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
    // Retenção: idade (dias) a partir da qual linhas terminais (outbox publicado/dead,
    // webhooks processados, entregas concluídas/dead) são removidas — evita crescimento
    // ilimitado. Roda no mesmo job periódico da limpeza de idempotência.
    RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
    // Rate limit GLOBAL das rotas de webhook da Efí (req/min, por instância).
    // É um teto de backpressure (cada item de webhook custa 1 INSERT + 1 chamada
    // à Efí), não a autenticação — esta é o EFI_WEBHOOK_SECRET. Chave única (não
    // por IP): o X-Forwarded-For do webhook não é confiável o bastante p/ punir
    // por IP, e o tráfego legítimo da Efí é baixo. Excedeu → 429 (a Efí re-tenta;
    // a reconciliação é a rede de segurança).
    WEBHOOK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),

    // Criação de cobrança assíncrona (opt-in para picos de lançamento)
    ASYNC_CHARGE_CREATION: optionalBool(false),
    CHARGE_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
    CHARGE_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(20),
    CHARGE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    CHARGE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    // Tempo (ms) até um claim "preso" voltar à fila p/ nova tentativa (lease).
    CHARGE_CLAIM_STALE_MS: z.coerce.number().int().positive().default(60_000),

    // Reconciliação
    RECONCILE_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    RECONCILE_BATCH_SIZE: z.coerce.number().int().positive().default(50),

    // Entrega de webhook de saída (notificar consumidores)
    WEBHOOK_DELIVERY_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    WEBHOOK_DELIVERY_BATCH_SIZE: z.coerce.number().int().positive().default(50),
    WEBHOOK_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),
    // Entregas em paralelo por ciclo (lote cabe no lease → evita re-entrega).
    WEBHOOK_DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(5),
  })
  .refine((e) => Boolean(e.EFI_CERTIFICATE_PATH?.trim() || e.EFI_CERTIFICATE_BASE64?.trim()), {
    message: 'Defina EFI_CERTIFICATE_PATH ou EFI_CERTIFICATE_BASE64 (certificado P12 da Efí)',
    path: ['EFI_CERTIFICATE_PATH'],
  })
  // O lease do worker de cobrança DEVE ser folgadamente maior que o timeout de uma
  // requisição à Efí. Senão uma réplica re-reivindica o pagamento enquanto outra
  // ainda está dentro do POST → como o boleto NÃO é idempotente no provedor, isso
  // gera uma cobrança DUPLICADA. Com lease >= 2× timeout, o detentor original já
  // abortou (ou concluiu) antes que outra réplica possa reivindicar.
  .refine((e) => e.CHARGE_CLAIM_STALE_MS >= e.EFI_REQUEST_TIMEOUT_MS * 2, {
    message:
      'CHARGE_CLAIM_STALE_MS deve ser >= 2× EFI_REQUEST_TIMEOUT_MS (evita re-reivindicar uma cobrança em andamento → boleto duplicado)',
    path: ['CHARGE_CLAIM_STALE_MS'],
  })
  // O budget total precisa comportar ao menos UMA tentativa completa — senão a
  // config é contraditória (o budget nunca permitiria retry algum, mas o operador
  // acha que configurou N tentativas).
  .refine((e) => e.EFI_TOTAL_RETRY_BUDGET_MS >= e.EFI_REQUEST_TIMEOUT_MS, {
    message: 'EFI_TOTAL_RETRY_BUDGET_MS deve ser >= EFI_REQUEST_TIMEOUT_MS (uma tentativa inteira)',
    path: ['EFI_TOTAL_RETRY_BUDGET_MS'],
  })
  // A reserva de idempotência NÃO pode expirar com a perna Efí ainda viva: outra
  // reserva geraria novo paymentId/txid → cobrança duplicada no provedor (o
  // fencing por reservationId protege o registro, não a 2ª cobrança). Folga de
  // 10s sobre o budget cobre persistência + jitter de relógio.
  .refine(
    (e) => e.IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS * 1000 >= e.EFI_TOTAL_RETRY_BUDGET_MS + 10_000,
    {
      message:
        'IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS deve cobrir EFI_TOTAL_RETRY_BUDGET_MS com folga de 10s (reserva expirar com a request viva = risco de cobrança duplicada)',
      path: ['IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS'],
    },
  )
  // Guard de produção: a flag de sandbox DEVE ser explicitamente desligada em
  // produção — senão um deploy aponta silenciosamente para o sandbox da Efí
  // (cobranças que nunca liquidam). Fail-fast no boot.
  .refine((e) => !(e.NODE_ENV === 'production' && e.EFI_SANDBOX), {
    message: 'Em produção defina EFI_SANDBOX=false explicitamente (cobranças reais).',
    path: ['EFI_SANDBOX'],
  })
  // Em produção o webhook é alcançável pela internet (a Efí o chama direto no
  // serviço). Sem o segredo, qualquer um POSTa payloads que custam 1 INSERT +
  // 1 chamada mTLS à Efí por item (amplificação não autenticada). Fail-fast.
  .refine((e) => !(e.NODE_ENV === 'production' && !e.EFI_WEBHOOK_SECRET), {
    message:
      'Em produção EFI_WEBHOOK_SECRET é obrigatório (registre o webhook na Efí com ?token=<segredo>).',
    path: ['EFI_WEBHOOK_SECRET'],
  })
  // /metrics expõe telemetria operacional/financeira (backlog, dead-letters) e o
  // serviço tem ingress público — em produção exige token.
  .refine((e) => !(e.NODE_ENV === 'production' && !e.METRICS_TOKEN), {
    message: 'Em produção METRICS_TOKEN é obrigatório (protege GET /metrics no ingress público).',
    path: ['METRICS_TOKEN'],
  })

export type Env = z.infer<typeof EnvSchema>

/**
 * Valida e tipa as variáveis de ambiente no boot (fail-fast). Lança um erro
 * legível listando todos os problemas de uma vez.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
  }
  return parsed.data
}
