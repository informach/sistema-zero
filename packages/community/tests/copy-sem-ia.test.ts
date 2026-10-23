import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
// A MESMA máquina dos guardas de copy do Kids (só leitura): duas cópias do detector envelheceriam
// separadas.
import {
  listarFontes,
  literaisVisiveis,
  naoETextoDeTela,
} from '../../community-kids/tests/helpers/copy-scan'

/**
 * A comunidade adulta nomeia o recurso, não a tecnologia (pedido da dona, 20/10/2026): o Zappy (o
 * tutor do Estúdio), o Pensa e os créditos que pagam os dois, nunca "IA" solta ("tutor de IA",
 * "IA e voz", "Quanto resta da ajuda da IA").
 *
 * O guarda lê o texto de TELA pelo parser (comentário, identificador, `import`, log e erro que fica
 * no servidor não contam) e reprova "IA", "IAs" ou "inteligência artificial". Sobram o aviso de
 * transparência e o nome do curso "No Comando da IA", pelo trecho EXATO e uma vez por arquivo.
 *
 * Alcance: o `src/` deste app e o member-shell que roda aqui. O Estúdio e o core têm texto com
 * "IA" que também aparece aqui (painel do Pro, medidor do Zappy); têm dono próprio.
 */

const PACOTES = join(import.meta.dir, '..', '..')

const RAIZES = [
  'community/src',
  'member-shell/src/components',
  'member-shell/src/lib',
  'member-shell/src/routes',
  'member-shell/src/server',
]

const TEM_IA = (texto: string) =>
  /\bIAs?\b/.test(texto) || /intelig[êe]ncia artificial/i.test(texto)

const PERMITIDOS: readonly { arquivo: string; trecho: string; motivo: string }[] = [
  {
    arquivo: 'community/src/components/community/profile/ai-credits-panel.tsx',
    trecho:
      'O Zappy e o Pensa são assistentes virtuais, feitos com inteligência artificial. Quem responde não é uma pessoa da equipe.',
    motivo: 'transparência: o que o Zappy e o Pensa são, e que não são uma pessoa',
  },
  {
    arquivo: 'member-shell/src/components/customer-helpdesk-content.tsx',
    trecho: 'Assistente de IA',
    motivo: 'transparência no atendimento: o autor da resposta automática, ao lado da equipe',
  },
]

function achadosEm(raiz: string): { fontes: number; achados: string[] } {
  const fontes = listarFontes(join(PACOTES, raiz)).filter((f) => !/\.test\.tsx?$/.test(f))
  const achados: string[] = []
  for (const fonte of fontes) {
    const caminho = relative(PACOTES, fonte).replaceAll('\\', '/')
    const usados = new Set<string>()
    for (const literal of literaisVisiveis(readFileSync(fonte, 'utf8'), fonte)) {
      if (naoETextoDeTela(literal) || !TEM_IA(literal.texto)) continue
      const texto = literal.texto.replace(/\s+/g, ' ').trim()
      const permitido = PERMITIDOS.find(
        (p) => p.arquivo === caminho && p.trecho === texto && !usados.has(p.trecho),
      )
      if (permitido) {
        usados.add(permitido.trecho)
        continue
      }
      achados.push(`${caminho}:${literal.linha} → ${texto.slice(0, 100)}`)
    }
  }
  return { fontes: fontes.length, achados }
}

describe('copy adulta: o recurso tem nome, sem "IA" solta', () => {
  test('nenhum "IA" no texto de tela fora da transparência e do nome do curso', () => {
    const resultado = RAIZES.map(achadosEm)
    // Guarda que não lê nada aprova tudo, em silêncio.
    expect(resultado[0]?.fontes).toBeGreaterThan(100)
    expect(resultado.reduce((n, r) => n + r.fontes, 0)).toBeGreaterThan(300)
    expect(resultado.flatMap((r) => r.achados)).toEqual([])
  })

  test('cada trecho permitido ainda existe (entrada que não esconde nada reprova)', () => {
    for (const { arquivo, trecho } of PERMITIDOS) {
      const fonte = readFileSync(join(PACOTES, arquivo), 'utf8')
      const textos = literaisVisiveis(fonte, arquivo).map((l) =>
        l.texto.replace(/\s+/g, ' ').trim(),
      )
      expect({ arquivo, presente: textos.includes(trecho) }).toEqual({ arquivo, presente: true })
    }
  })

  test('o detector pega "IA" de tela e deixa passar comentário e log', () => {
    const achar = (fonte: string) =>
      literaisVisiveis(fonte, 'x.tsx').filter((l) => !naoETextoDeTela(l) && TEM_IA(l.texto))
    expect(achar("const a = 'Com o tutor de IA no canto da tela.'")).toHaveLength(1)
    expect(achar('const b = <h2>IA e voz</h2>')).toHaveLength(1)
    expect(achar('// a IA do Pensa\nconst c = 1')).toEqual([])
    expect(achar("console.warn('IA indisponível')")).toEqual([])
  })
})
