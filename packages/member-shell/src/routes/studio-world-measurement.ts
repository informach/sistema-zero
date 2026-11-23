import { randomUUID } from 'node:crypto'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { Faixa, MedidaRecebida } from '../lib/world-measurement'
import { r2PutObjectPrivate } from '../server/r2'

/**
 * A gravação da medida dos mundos grandes (plano "Mundos de 2 km", lote 8, 23/11/2026).
 *
 * A página `/estudio/medida-mundos` (só a equipe) roda o mundo de 2 km no aparelho de quem a abre
 * e manda os números para cá. A rota grava um JSON por medida no R2 PRIVADO do ambiente
 * (`qa/medidas-mundos/<dia>/...`), com o commit do deploy, o navegador e quem mediu (o id da
 * conta, nunca o e-mail). Sem o R2 (ou com ele fora), o registro vai inteiro para o log do
 * servidor com o prefixo `[medida-mundos]` e a resposta diz onde ficou: a página também oferece
 * baixar o JSON. Quem não é da equipe vê 404, como na rota dos exemplos grandes.
 */
export const MAXIMO_DE_BYTES_DA_MEDIDA = 64 * 1024
const SHA256 = /^[0-9a-f]{64}$/

export interface RegistroDaMedida {
  formato: 'sz-medida-mundo'
  versao: 1
  recebidoEm: string
  commit: string | null
  ambiente: string | null
  conta: string
  motor: 'js' | 'python'
  arquivo: string
  aparelho: string | null
  navegador: string | null
  tela: { largura: number; altura: number; dpr: number } | null
  tempos: { baixarMs: number | null; ateResultadoMs: number | null }
  medida: MedidaRecebida
}

const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const numeroOuNulo = (v: unknown): number | null | undefined =>
  v === null || v === undefined ? null : numero(v) ? v : undefined
const texto = (v: unknown, maximo: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= maximo ? v : null

function faixa(v: unknown): Faixa | null | undefined {
  if (v === null) return null
  if (!objeto(v) || !numero(v.p50) || !numero(v.p95) || !numero(v.maximo)) return undefined
  return { p50: v.p50, p95: v.p95, maximo: v.maximo }
}

/** Confere a forma da medida (a de `medirNoNavegador`, `studio/src/medida/mundoGrande.ts`). */
export function conferirMedida(v: unknown): MedidaRecebida | null {
  if (!objeto(v)) return null
  const gpu = texto(v.gpu, 300)
  const q = v.quadroMs
  const m = v.memoria
  const r = v.rota
  const desenhos = faixa(v.desenhos)
  const triangulos = faixa(v.triangulos)
  if (
    !gpu ||
    !numero(v.duracaoMs) ||
    !numero(v.quadros) ||
    !numero(v.fpsMediano) ||
    !objeto(q) ||
    !numero(q.p50) ||
    !numero(q.p95) ||
    !numero(q.p99) ||
    !numero(q.maximo) ||
    desenhos === undefined ||
    triangulos === undefined ||
    !Array.isArray(v.entradas) ||
    v.entradas.length > 500 ||
    !Array.isArray(v.regioesVisitadas) ||
    v.regioesVisitadas.length > 500 ||
    !objeto(m) ||
    !numero(m.bytesDeTexturas) ||
    !objeto(r) ||
    !numero(r.pontos) ||
    !numero(r.metros) ||
    !numero(r.voltas)
  )
    return null
  const memoria = {
    heapJs: numeroOuNulo(m.heapJs),
    geometrias: numeroOuNulo(m.geometrias),
    texturas: numeroOuNulo(m.texturas),
    programas: numeroOuNulo(m.programas),
  }
  if (Object.values(memoria).some((x) => x === undefined)) return null
  const entradas: MedidaRecebida['entradas'] = []
  for (const e of v.entradas) {
    const regiao = objeto(e) ? texto(e.regiao, 80) : null
    if (
      !objeto(e) ||
      !regiao ||
      !numero(e.quadros) ||
      !numero(e.acima100) ||
      !numero(e.acima200) ||
      !numero(e.piorMs)
    )
      return null
    entradas.push({
      regiao,
      quadros: e.quadros,
      acima100: e.acima100,
      acima200: e.acima200,
      piorMs: e.piorMs,
    })
  }
  const regioesVisitadas: string[] = []
  for (const nome of v.regioesVisitadas) {
    const t = texto(nome, 80)
    if (!t) return null
    regioesVisitadas.push(t)
  }
  return {
    gpu,
    duracaoMs: v.duracaoMs,
    quadros: v.quadros,
    fpsMediano: v.fpsMediano,
    quadroMs: { p50: q.p50, p95: q.p95, p99: q.p99, maximo: q.maximo },
    desenhos,
    triangulos,
    entradas,
    regioesVisitadas,
    memoria: {
      heapJs: memoria.heapJs ?? null,
      geometrias: memoria.geometrias ?? null,
      texturas: memoria.texturas ?? null,
      programas: memoria.programas ?? null,
      bytesDeTexturas: m.bytesDeTexturas,
    },
    rota: { pontos: r.pontos, metros: r.metros, voltas: r.voltas },
  }
}

/** A chave no R2: um arquivo por medida, ordenado por dia e hora (UTC). */
export function chaveDaMedida(agora: Date, motor: string, sufixo: string): string {
  const iso = agora.toISOString()
  const dia = iso.slice(0, 10)
  const hora = iso.slice(11, 19).replaceAll(':', '')
  return `qa/medidas-mundos/${dia}/${hora}-${motor}-${sufixo}.json`
}

const json = (corpo: unknown, status: number) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export function createStudioWorldMeasurementRoute(deps: {
  /** A sessão do pedido, ou a resposta de recusa dela (`media.requireUploadSession`). */
  requireSession: (request: Request) => Promise<{ id: string; role?: string } | Response>
  put?: (input: { key: string; body: Uint8Array; contentType: string }) => Promise<void>
  now?: () => Date
  id?: () => string
  log?: (linha: string) => void
  env?: () => { commit?: string; ambiente?: string }
}) {
  const put = deps.put ?? r2PutObjectPrivate
  const now = deps.now ?? (() => new Date())
  const id = deps.id ?? (() => randomUUID().slice(0, 8))
  const log = deps.log ?? ((linha: string) => console.info(linha))
  const env =
    deps.env ??
    (() => ({
      commit: process.env.RAILWAY_GIT_COMMIT_SHA,
      ambiente: process.env.RAILWAY_ENVIRONMENT_NAME,
    }))
  return {
    async POST(request: Request) {
      const sessao = await deps.requireSession(request)
      if (sessao instanceof Response) return sessao
      if (!isPrivilegedRole(sessao.role)) return new Response('Not found', { status: 404 })
      const declarado = Number(request.headers.get('content-length') ?? Number.NaN)
      if (Number.isFinite(declarado) && declarado > MAXIMO_DE_BYTES_DA_MEDIDA)
        return json({ error: { code: 'TOO_LARGE', message: 'A medida passou do tamanho.' } }, 413)
      const bruto = await request.text()
      if (bruto.length > MAXIMO_DE_BYTES_DA_MEDIDA)
        return json({ error: { code: 'TOO_LARGE', message: 'A medida passou do tamanho.' } }, 413)
      let corpo: unknown
      try {
        corpo = JSON.parse(bruto)
      } catch {
        corpo = null
      }
      const medida = objeto(corpo) ? conferirMedida(corpo.medida) : null
      const motor = objeto(corpo) ? corpo.motor : null
      const arquivo = objeto(corpo) ? corpo.arquivo : null
      if (
        !objeto(corpo) ||
        !medida ||
        (motor !== 'js' && motor !== 'python') ||
        typeof arquivo !== 'string' ||
        !SHA256.test(arquivo)
      )
        return json({ error: { code: 'INVALID', message: 'A medida chegou incompleta.' } }, 400)
      const tela = objeto(corpo.tela) ? corpo.tela : null
      const tempos = objeto(corpo.tempos) ? corpo.tempos : {}
      const ambiente = env()
      const agora = now()
      const registro: RegistroDaMedida = {
        formato: 'sz-medida-mundo',
        versao: 1,
        recebidoEm: agora.toISOString(),
        commit: ambiente.commit || null,
        ambiente: ambiente.ambiente || null,
        conta: sessao.id,
        motor,
        arquivo,
        aparelho: texto(corpo.aparelho, 80),
        navegador: texto(request.headers.get('user-agent'), 400),
        tela:
          tela && numero(tela.largura) && numero(tela.altura) && numero(tela.dpr)
            ? { largura: tela.largura, altura: tela.altura, dpr: tela.dpr }
            : null,
        tempos: {
          baixarMs: numeroOuNulo(tempos.baixarMs) ?? null,
          ateResultadoMs: numeroOuNulo(tempos.ateResultadoMs) ?? null,
        },
        medida,
      }
      const conteudo = JSON.stringify(registro)
      const chave = chaveDaMedida(agora, motor, id())
      try {
        await put({
          key: chave,
          body: new TextEncoder().encode(conteudo),
          contentType: 'application/json',
        })
        return json({ guardado: 'r2', chave }, 201)
      } catch {
        // O R2 fora (ou sem configuração) não pode perder a medida: o registro vai ao log.
        log(`[medida-mundos] ${conteudo}`)
        return json({ guardado: 'registro' }, 202)
      }
    },
  }
}
