import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { gameTwoDRuntime, gameTwoDRuntimeSource } from '../runtime'

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
// Sprites de texto (13/09): 476.776 B crus / 141.033 B gzip.
// Novo layout, dados e seleção adicionam ~12 KB; preservamos a margem de 2%.
// Fundo de IMAGEM no sprite de texto (14/09): 491.160 B crus / 144.145 B gzip.
// São ~3,3 KB: o layout que deixa a imagem mandar na medida, o desenho da placa e
// o agendador de redraw, que saiu do desenho e agora serve aos DOIS donos de
// imagem (antes era um bloco copiado dentro de `_drawSpriteBody`).
// Camadas e perspectiva (01/10): 508.274 B crus / 149.547 B gzip.
// Inclui a fábrica compartilhada e 19 métodos; mantém margem próxima de 2%.
// 02/10: sprites reais na pista, composição automática e HUD/telas. Depois do full review
// (folha reaproveitada, poda pela projeção, placar só com placar): 541.383 B / 158.850 B gzip
// sem compactar, 457.802 B / 122.147 B compactado.
// A mesma compactação do Mundo 3D tira comentários de linha e linhas vazias.
// O teste de equivalência abaixo conserva tokens e fronteiras de linha (ASI).
const RUNTIME_TETO_CRU = 465_000
const RUNTIME_TETO_GZIP = 124_500

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
  it('compacta sem modificar tokens executáveis ou suas quebras de linha', () => {
    const tokens = (source: string) => {
      const scanner = ts.createScanner(
        ts.ScriptTarget.ES2022,
        true,
        ts.LanguageVariant.Standard,
        source,
      )
      const result: Array<[ts.SyntaxKind, string, boolean]> = []
      while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
        result.push([scanner.getToken(), scanner.getTokenText(), scanner.hasPrecedingLineBreak()])
      }
      return result
    }
    expect(tokens(gameTwoDRuntime)).toEqual(tokens(gameTwoDRuntimeSource))
    expect(Buffer.byteLength(gameTwoDRuntime)).toBeLessThan(
      Buffer.byteLength(gameTwoDRuntimeSource) - 25_000,
    )
  })
  // A compactação apaga linhas por conteúdo e o scanner acima não reanalisa o miolo de um
  // template: um template literal no runtime passaria pela equivalência sem ser conferido.
  it('o runtime não tem template literal fora dos comentários', () => {
    const templates = (source: string) => {
      const scanner = ts.createScanner(
        ts.ScriptTarget.ES2022,
        true,
        ts.LanguageVariant.Standard,
        source,
      )
      let count = 0
      for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
        if (
          kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
          kind === ts.SyntaxKind.TemplateHead
        )
          count++
      return count
    }
    // Sem reanalisar o miolo a contagem não é exata, mas qualquer template aparece.
    expect(templates('var a = 1; /* `comentário` */ var b = 2;')).toBe(0)
    expect(templates('var b = `x`;')).toBeGreaterThan(0)
    expect(templates('var c = `y${a}z`;')).toBeGreaterThan(0)
    expect(templates(gameTwoDRuntimeSource)).toBe(0)
  })
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
