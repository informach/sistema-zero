import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ⚠️ Prazo PRÓPRIO, e não o padrão de 5 s do `bun:test`: este caso empacota a
 * extensão INTEIRA num processo filho. Sozinho ele fecha em ~5,1 s — ou seja,
 * sempre esteve raspando o limite —, e dentro do `bun test src`, disputando CPU
 * com os outros 480 arquivos, estourava. O sintoma era o pior possível: VERDE
 * rodado sozinho (que é como a gente confere um teste) e vermelho na suíte
 * inteira, com cara de regressão de orçamento quando era só relógio.
 */
const PRAZO_DO_BUILD_MS = 120_000

describe('bundle inicial do Jogo 2D', () => {
  it(
    'mantém runtime e exemplos em chunks sob demanda',
    () => {
      const entrypoint = resolve(import.meta.dir, '../index.ts')
      const probe = spawnSync(
        process.execPath,
        [
          '-e',
          `
          const build = await Bun.build({
            entrypoints: [${JSON.stringify(entrypoint)}],
            target: 'browser',
            minify: true,
            splitting: true,
            write: false,
          })
          if (!build.success) {
            console.error(build.logs.map((log) => log.message).join('\\n'))
            process.exit(1)
          }
          const entry = build.outputs.find((output) => output.kind === 'entry-point')
          if (!entry) throw new Error('build do Jogo 2D sem entry-point')
          const source = await entry.text()
          console.log(JSON.stringify({
            rawBytes: entry.size,
            gzipBytes: Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength,
            chunks: build.outputs.filter((output) => output.kind === 'chunk').length,
            containsRuntime: source.includes('Jogo 2D interativo'),
            containsExample: source.includes('Pegue a moeda'),
            containsFullDocs: source.includes('Receitas que a gente monta com o que já existe'),
          }))
        `,
        ],
        { encoding: 'utf8' },
      )
      expect(probe.status, probe.stderr).toBe(0)

      const metrics = JSON.parse(probe.stdout.trim()) as {
        rawBytes: number
        gzipBytes: number
        chunks: number
        containsRuntime: boolean
        containsExample: boolean
        containsFullDocs: boolean
      }
      // O teto histórico virou uma linha colada à medição. Exigimos 5% de margem
      // real e mantemos os três conteúdos pesados em chunks sob demanda.
      expect(metrics.rawBytes).toBeLessThan(Math.floor(193_300 * 0.95))
      expect(metrics.gzipBytes).toBeLessThan(Math.floor(51_700 * 0.95))
      expect(metrics.chunks).toBeGreaterThanOrEqual(6)
      expect(metrics.containsRuntime).toBe(false)
      expect(metrics.containsExample).toBe(false)
      expect(metrics.containsFullDocs).toBe(false)
    },
    PRAZO_DO_BUILD_MS,
  )
})

/**
 * ⭐⭐ O PAYLOAD do runtime, que é coisa diferente do bundle acima.
 *
 * O bundle mede o MÓDULO (o que o editor carrega). Isto mede a STRING que é
 * injetada no `<head>` de todo preview e escrita em todo jogo exportado — o que a
 * criança de fato baixa. Ele não tinha teto: o único assert era um PISO
 * (`templateGuard`, > 1000 chars), e por isso passou de ~309 KB (registrado no
 * design doc de 02/08) para 459 KB sem nada acusar. São 150 KB que ninguém viu.
 *
 * ⚠️ A margem é de 2%, não os 5% do vizinho, e o motivo é a FORMA do crescimento:
 * o bundle cresce por dependência (salto grande e raro), o runtime cresce por
 * BLOCO NOVO (salto pequeno e frequente). Com 5% caberia um lote inteiro de
 * blocos em silêncio.
 */
// Medido em 14/08, no fim do lote: 464.034 B crus / 137.437 B gzip.
// ⚠️ O lote de desempenho SUBIU o payload em ~4,5 KB e mesmo assim é um ganho:
// ele troca bytes (uma vez, no download) por trabalho por quadro (60× por
// segundo, para sempre). O ajuste de nitidez de um mapa de 375 células saiu de
// 1.125 travessias de contexto para 2, e as 400 partículas de 800 para 2.
const RUNTIME_TETO_CRU = 473_000
const RUNTIME_TETO_GZIP = 140_000

/**
 * Os maiores fragmentos de `runtime/`, por tamanho de FONTE. Não é o tamanho do
 * que cada um contribui ao payload (o template tem aspas e indentação), mas
 * responde a pergunta que importa quando o teto estoura: QUAL arquivo cresceu.
 */
function maioresFragmentos(): string {
  const pasta = resolve(import.meta.dir, '../runtime')
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.ts'))
    .map((nome) => ({ nome, bytes: statSync(resolve(pasta, nome)).size }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8)
    .map(({ nome, bytes }) => `  ${nome.padEnd(24)} ${String(bytes).padStart(7)} B`)
    .join('\n')
}

describe('payload do runtime do Jogo 2D', () => {
  it('não cresce sem alguém decidir', async () => {
    const { gameTwoDRuntime } = await import('../runtime')
    const { gzipSync } = await import('node:zlib')
    const cru = Buffer.byteLength(gameTwoDRuntime)
    const gzip = gzipSync(gameTwoDRuntime).byteLength

    // A mensagem de falha ATRIBUI: quem estourar vê QUAL fragmento cresceu, em vez
    // de só um número maior. Bumpar informado é decisão; bumpar cego é acidente.
    const culpados = `\nmaiores fragmentos de runtime/:\n${maioresFragmentos()}`
    expect(cru, culpados).toBeLessThanOrEqual(RUNTIME_TETO_CRU)
    expect(gzip, culpados).toBeLessThanOrEqual(RUNTIME_TETO_GZIP)

    // ⭐ PISO junto do teto. Sem ele a catraca só sobe, para sempre, e um lote de
    // desempenho bem-sucedido vira folga grátis para o próximo bloco — que é
    // exatamente como 309 KB viraram 459 KB. Encolheu mais de 10%? BAIXE o teto.
    expect(gzip).toBeGreaterThan(Math.floor(RUNTIME_TETO_GZIP * 0.9))
  })
})
