import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { listarFontes, literaisVisiveis, naoETextoDeTela } from './helpers/copy-scan'

/**
 * A tela nomeia o recurso, não a tecnologia (pedido da dona, 20/10/2026): o Zappy, o Pensa e os
 * créditos que pagam os dois, nunca "IA" solta ("Ajuda da IA", "uso de IA", "IA do Estúdio").
 *
 * O guarda lê o texto de TELA pelo parser (a mesma régua do `copy-vocabulario`: comentário,
 * identificador, `import`, log e erro que fica no servidor não contam) e reprova "IA", "IAs" ou
 * "inteligência artificial". Sobram só os avisos de transparência, cada um com motivo escrito,
 * pelo trecho EXATO e uma vez por arquivo: um "IA" novo no mesmo arquivo reprova.
 *
 * Alcance: o `src/` do Kids (a área dos pais inclusive: o pedido vale para a família) e o
 * member-shell que roda aqui. O Estúdio (`packages/studio`) e o core têm texto com "IA" que
 * também aparece no Kids (painel do Pro, resumo do Mural); ficam fora porque têm dono próprio.
 */

const PACOTES = join(import.meta.dir, '..', '..')

const RAIZES = [
  'community-kids/src',
  'member-shell/src/components',
  'member-shell/src/lib',
  'member-shell/src/routes',
  'member-shell/src/server',
]

const TEM_IA = (texto: string) =>
  /\bIAs?\b/.test(texto) || /intelig[êe]ncia artificial/i.test(texto)

const PERMITIDOS: readonly { arquivo: string; trecho: string; motivo: string }[] = [
  {
    arquivo: 'community-kids/src/app/pais/_components/ai-credits-card.tsx',
    trecho:
      'A ajuda do Zappy no Estúdio e o Pensa são assistentes virtuais, feitos com inteligência artificial. As falas do Zappy nas aulas são escritas pela nossa equipe, e nos Recados quem responde é a equipe.',
    motivo:
      'transparência aos pais: o que é assistente virtual e o que é da equipe (falas das aulas, Recados)',
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

describe('copy do Kids: o recurso tem nome, sem "IA" solta', () => {
  test('nenhum "IA" no texto de tela fora dos avisos de transparência', () => {
    const resultado = RAIZES.map(achadosEm)
    // Guarda que não lê nada aprova tudo, em silêncio.
    expect(resultado[0]?.fontes).toBeGreaterThan(100)
    expect(resultado.reduce((n, r) => n + r.fontes, 0)).toBeGreaterThan(300)
    expect(resultado.flatMap((r) => r.achados)).toEqual([])
  })

  test('cada aviso permitido ainda existe (entrada que não esconde nada reprova)', () => {
    for (const { arquivo, trecho } of PERMITIDOS) {
      const fonte = readFileSync(join(PACOTES, arquivo), 'utf8')
      const textos = literaisVisiveis(fonte, arquivo).map((l) =>
        l.texto.replace(/\s+/g, ' ').trim(),
      )
      expect({ arquivo, presente: textos.includes(trecho) }).toEqual({ arquivo, presente: true })
    }
  })

  test('o detector pega "IA" de tela e deixa passar código e palavras parecidas', () => {
    const achar = (fonte: string) =>
      literaisVisiveis(fonte, 'x.tsx').filter((l) => !naoETextoDeTela(l) && TEM_IA(l.texto))
    expect(achar('const a = "Ajuda da IA neste mês"')).toHaveLength(1)
    expect(achar('const b = <h2>Uso de IA do Estúdio</h2>')).toHaveLength(1)
    expect(achar('const c = "Feito com inteligência artificial."')).toHaveLength(1)
    expect(achar('// a IA do Estúdio\nconst d = 1')).toEqual([])
    expect(achar('const e = "Ele ia para a aula seguinte, sem IAra"')).toEqual([])
    expect(achar("console.log('IA indisponível')")).toEqual([])
  })
})
