import { describe, expect, it } from 'bun:test'
import { parseJS } from '../../../parsers/js'
import { GAME_UI_FONT_IDS } from '../../gameUiFonts/catalog'
import { gameKitBlocks } from '../blocks'
import { gameKitRuntime } from '../runtime'
import { loadRuntime } from './kitHarness'

/**
 * "Usar a fonte" no Jogo 2D Avançado.
 *
 * O bloco não TROCA nada em execução: quem resolve a escolha é quem monta o
 * documento, antes de o jogo existir (só a fonte escolhida é embutida). Então o
 * que precisa de rede aqui é (1) a escolha atravessar a Ponte sem se perder e
 * (2) o runtime avisar quando o que ele recebeu não é o que o bloco pediu.
 */

const IDS = GAME_UI_FONT_IDS

describe('“Usar a fonte” — o bloco', () => {
  it('oferece as cinco fontes do catálogo, com os mesmos ids', () => {
    const def = gameKitBlocks.find((b) => b.type === 'sz_gk_use_font')
    if (!def) throw new Error('bloco ausente: sz_gk_use_font')
    const campo = def.args0?.[0] as { type: string; options: [string, string][] } | undefined
    expect(campo?.type).toBe('field_dropdown')
    expect(campo?.options.map(([, valor]) => valor)).toEqual([...IDS])
  })
})

/**
 * ⚠️ A cadeia é fechada por construção (o parser lê o mesmo catálogo), mas
 * "fechado por construção" foi o que se disse do atirador alinhado antes dos
 * dois defeitos que ela achou jogando. Uma fonte que o parser recusasse cairia
 * em `rawJS`: o jogo seguiria rodando e a Ponte devolveria um bloco de "código
 * avançado" no lugar do bloco de fonte, verde em tudo.
 */
describe('toda fonte volta pela Ponte (código → blocos)', () => {
  for (const id of IDS) {
    it(`${id} sobrevive à volta`, () => {
      const ir = parseJS(`SZGameKit.useFont("${id}");`) as Array<{ type?: string; font?: string }>
      expect(ir[0]?.type).toBe('gk:useFont')
      expect(ir[0]?.font).toBe(id)
    })
  }

  it('⚠️ nome fora do catálogo NÃO vira bloco — o dropdown o trocaria pela 1ª opção', () => {
    const ir = parseJS('SZGameKit.useFont("comicSans");') as Array<{ type?: string }>
    expect(ir[0]?.type).not.toBe('gk:useFont')
  })
})

describe('“Usar a fonte” — o runtime só CONFERE', () => {
  /** Monta o runtime com (ou sem) uma fonte já instalada e anota os avisos. */
  function comFonteInstalada(id: string | null) {
    const avisos: string[] = []
    const real = console.warn
    console.warn = (...args: unknown[]) => {
      avisos.push(args.map(String).join(' '))
    }
    try {
      const harness = loadRuntime(
        id ? { SZGameUIFont: { id, family: '"Bungee", sans-serif' } } : {},
      )
      return { ...harness, avisos, restore: () => (console.warn = real) }
    } catch (erro) {
      console.warn = real
      throw erro
    }
  }

  const sobreFonte = (avisos: string[]) => avisos.filter((a) => a.includes('Usar a fonte'))

  it('a fonte que chegou é a que o bloco pediu: silêncio', () => {
    const h = comFonteInstalada('bungee')
    h.api.useFont('bungee')
    h.restore()
    expect(sobreFonte(h.avisos)).toEqual([])
  })

  it('⭐ a fonte que chegou é OUTRA: avisa, porque o documento veio com a padrão', () => {
    // Acontece quando a escolha não é estática — o bloco dentro de um "se", ou o
    // nome vindo de variável. Sem o aviso, a criança troca a fonte e não entende
    // por que nada mudou.
    const h = comFonteInstalada('baloo2')
    h.api.useFont('pressStart2P')
    expect(sobreFonte(h.avisos)).toHaveLength(1)

    // Uma vez só: o bloco costuma estar num caminho que repete.
    h.api.useFont('pressStart2P')
    h.restore()
    expect(sobreFonte(h.avisos)).toHaveLength(1)
  })

  it('sem fonte instalada (documento antigo) não avisa nada', () => {
    const h = comFonteInstalada(null)
    h.api.useFont('bungee')
    h.restore()
    expect(sobreFonte(h.avisos)).toEqual([])
  })
})

/**
 * ⭐ O defeito que este teste mata é MUDO: o setter de `ctx.font` do Canvas 2D não
 * resolve custom property, então `'bold 12px var(--sz-game-ui-font)'` é DESCARTADO
 * e o texto sai na fonte anterior. Nada quebra, nada avisa — dois sites do
 * `campaign.ts` viveram assim. O nome resolvido da família mora no `_szGameUIFont`.
 */
describe('nenhum texto de canvas pede a fonte por variável CSS', () => {
  /**
   * ⚠️ `.style.font` fica de FORA: ali a variável CSS resolve normalmente (é
   * elemento do DOM, não canvas), e o Mundo 3D usa esse caminho de propósito.
   */
  const porVariavelCss = (fonte: string) =>
    fonte
      .split(/\r?\n/)
      .map((linha, i) => ({ linha: linha.trim(), n: i + 1 }))
      .filter(
        ({ linha }) =>
          /\.font\s*=/.test(linha) && !/\.style\.font\s*=/.test(linha) && linha.includes('var(--'),
      )

  it('todo ctx.font do runtime usa a família resolvida', () => {
    expect(porVariavelCss(gameKitRuntime)).toEqual([])
  })

  it('e o detector MORDE — a linha que existia é encontrada', () => {
    // Sem esta metade o teste acima passaria mesmo com um detector quebrado.
    const antiga = "    ctx2d.font = 'bold 12px var(--sz-game-ui-font)';"
    expect(porVariavelCss(antiga)).toHaveLength(1)
    expect(porVariavelCss("    title.style.font = '800 17px var(--sz-game-ui-font)';")).toEqual([])
  })
})
