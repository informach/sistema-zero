import { envelope } from '@sistemazero/core/http'

export type UpstreamErrorKind = 'no_target' | 'open_circuit' | 'timeout' | 'connect' | 'bad_gateway'

const MAP: Record<UpstreamErrorKind, { status: number; code: string; message: string }> = {
  no_target: {
    status: 503,
    code: 'NO_UPSTREAM_AVAILABLE',
    message: 'Nenhuma instância saudável disponível',
  },
  open_circuit: {
    status: 503,
    code: 'CIRCUIT_OPEN',
    message: 'Circuito aberto para o serviço de destino',
  },
  timeout: {
    status: 504,
    code: 'UPSTREAM_TIMEOUT',
    message: 'Tempo de resposta do upstream excedido',
  },
  connect: { status: 502, code: 'BAD_GATEWAY', message: 'Falha ao conectar ao upstream' },
  bad_gateway: { status: 502, code: 'BAD_GATEWAY', message: 'Resposta inválida do upstream' },
}

/** Constrói a resposta de erro do proxy (envelope padrão do core) com X-Request-Id. */
export function upstreamErrorResponse(kind: UpstreamErrorKind, requestId: string): Response {
  const { status, code, message } = MAP[kind]
  return new Response(JSON.stringify(envelope(code, message)), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  })
}
