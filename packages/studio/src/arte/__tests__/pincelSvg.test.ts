import { describe, expect, it } from 'bun:test'
import { FIGURAS, FUNDOS, NOMES_DE_FIGURA, NOMES_DE_FUNDO } from '../catalogo'
import type { Ambiente } from '../pincel'
import { PincelSvg, svgEmTexto } from '../pincelSvg'

const AMB: Ambiente = { t: 0, chao: 220 }

const texto = (montar: (p: PincelSvg) => void, prefixo = 'p') => {
  const p = new PincelSvg(prefixo)
  montar(p)
  return svgEmTexto(p.arvore())
}

describe('o pincel de SVG traduz o canvas sem reescrever a arte', () => {
  it('transformação vira grupo, e transformações seguidas entram no MESMO grupo', () => {
    const svg = texto((p) => {
      p.save()
      p.translate(10, 20)
      p.scale(2, 2)
      p.fillStyle = '#ff0000'
      p.fillRect(0, 0, 4, 4)
      p.restore()
      p.fillStyle = '#00ff00'
      p.fillRect(0, 0, 1, 1)
    })
    // Um grupo só com as duas transformações, e o que vem depois do restore fica FORA dele.
    expect(svg).toBe(
      '<g transform="translate(10 20) scale(2 2)"><rect x="0" y="0" width="4" height="4" fill="#ff0000"/></g>' +
        '<rect x="0" y="0" width="1" height="1" fill="#00ff00"/>',
    )
  })

  it('o restore fecha os grupos abertos desde o save', () => {
    const svg = texto((p) => {
      p.save()
      p.translate(5, 5)
      p.fillRect(0, 0, 1, 1)
      p.translate(5, 5)
      p.fillRect(0, 0, 1, 1)
      p.restore()
      p.fillRect(9, 9, 1, 1)
    })
    expect(svg.endsWith('<rect x="9" y="9" width="1" height="1" fill="#000000"/>')).toBe(true)
    // dois translates separados por um desenho = dois grupos ANINHADOS
    expect(svg.split('<g ').length - 1).toBe(2)
  })

  it('o estado volta ao que era no restore', () => {
    const svg = texto((p) => {
      p.fillStyle = '#111111'
      p.save()
      p.fillStyle = '#222222'
      p.globalAlpha = 0.5
      p.restore()
      p.fillRect(0, 0, 1, 1)
    })
    expect(svg).toBe('<rect x="0" y="0" width="1" height="1" fill="#111111"/>')
  })

  it('⚠️ arco de volta inteira sai em DOIS comandos A (um só não desenharia nada)', () => {
    const svg = texto((p) => {
      p.beginPath()
      p.arc(10, 10, 5, 0, Math.PI * 2)
      p.fill()
    })
    expect(svg.match(/A/g)?.length).toBe(2)
    expect(svg).toContain('M15 10')
  })

  it('o sentido do arco é preservado: horário e anti-horário dão varreduras opostas', () => {
    const horario = texto((p) => {
      p.beginPath()
      p.arc(0, 0, 4, 0, Math.PI, false)
      p.fill()
    })
    const antihorario = texto((p) => {
      p.beginPath()
      p.arc(0, 0, 4, 0, Math.PI, true)
      p.fill()
    })
    expect(horario).toContain('0 1 ')
    expect(antihorario).toContain('0 0 ')
    expect(horario).not.toBe(antihorario)
  })

  it('a elipse leva os dois raios e a rotação em graus', () => {
    const svg = texto((p) => {
      p.beginPath()
      p.ellipse(0, 0, 10, 4, Math.PI / 2, 0, Math.PI * 2)
      p.fill()
    })
    expect(svg).toContain('A10 4 90 ')
  })

  it('o degradê vai para defs e é referenciado por url', () => {
    const svg = texto((p) => {
      const g = p.createLinearGradient(0, 0, 0, 100)
      g.addColorStop(0, '#8fe7ff')
      g.addColorStop(1, '#fff0b3')
      p.fillStyle = g
      p.fillRect(0, 0, 50, 100)
    }, 'ceu')
    expect(svg).toContain('<linearGradient id="ceu-degrade-1" gradientUnits="userSpaceOnUse"')
    expect(svg).toContain('<stop offset="0" stop-color="#8fe7ff"/>')
    expect(svg).toContain('fill="url(#ceu-degrade-1)"')
  })

  it('o recorte vira clipPath e abre um grupo', () => {
    const svg = texto((p) => {
      p.beginPath()
      p.rect(0, 0, 10, 10)
      p.clip()
      p.fillRect(0, 0, 20, 20)
    }, 'c')
    expect(svg).toContain('<clipPath id="c-recorte-1">')
    expect(svg).toContain('<g clip-path="url(#c-recorte-1)">')
  })

  it('o brilho do tiro (shadowBlur) vira um filtro, e não some', () => {
    const svg = texto((p) => {
      p.fillStyle = '#9cff57'
      p.shadowColor = '#9cff57'
      p.shadowBlur = 14
      p.beginPath()
      p.arc(5, 5, 5, 0, Math.PI * 2)
      p.fill()
    }, 't')
    expect(svg).toContain('feDropShadow')
    expect(svg).toContain('stdDeviation="7"')
    expect(svg).toContain('filter="url(#t-sombra-1)"')
  })

  it('a transparência vira opacity', () => {
    const svg = texto((p) => {
      p.globalAlpha = 0.4
      p.fillRect(0, 0, 1, 1)
    })
    expect(svg).toContain('opacity="0.4"')
  })

  it('⭐ fill seguido de stroke no mesmo caminho vira UM elemento, não dois', () => {
    const svg = texto((p) => {
      p.fillStyle = '#24a05a'
      p.strokeStyle = '#157940'
      p.lineWidth = 2
      p.beginPath()
      p.rect(0, 0, 10, 10)
      p.fill()
      p.stroke()
    })
    expect(svg.match(/<path/g)?.length).toBe(1)
    expect(svg).toContain('fill="#24a05a"')
    expect(svg).toContain('stroke="#157940"')
  })

  it('stroke em caminho diferente do último fill sai em elemento próprio', () => {
    const svg = texto((p) => {
      p.beginPath()
      p.rect(0, 0, 10, 10)
      p.fill()
      p.beginPath()
      p.moveTo(0, 0)
      p.lineTo(5, 5)
      p.stroke()
    })
    expect(svg.match(/<path/g)?.length).toBe(2)
    expect(svg).toContain('fill="none"')
  })

  it('⚠️ os ids são por INSTÂNCIA: dois palcos na mesma página não colidem', () => {
    const a = texto((p) => {
      p.beginPath()
      p.rect(0, 0, 1, 1)
      p.clip()
    }, 'palcoA')
    const b = texto((p) => {
      p.beginPath()
      p.rect(0, 0, 1, 1)
      p.clip()
    }, 'palcoB')
    expect(a).toContain('palcoA-recorte-1')
    expect(b).toContain('palcoB-recorte-1')
    expect(a).not.toBe(b)
  })
})

describe('toda a arte do catálogo atravessa o pincel de SVG', () => {
  for (const nome of NOMES_DE_FIGURA) {
    it(`${nome}: desenha, e o markup é ESTÁVEL entre execuções`, () => {
      const desenhar = (prefixo: string) => {
        const p = new PincelSvg(prefixo)
        const { w, h } = FIGURAS[nome].caixa
        FIGURAS[nome].desenhar(p, { x: 0, y: 0, w, h }, AMB)
        return svgEmTexto(p.arvore())
      }
      const svg = desenhar('a')
      expect(svg.length).toBeGreaterThan(40)
      // Sem isso, um sorteio escondido dentro de um desenho passaria despercebido — e o palco
      // re-renderiza a cada gesto da criança, então o desenho piscaria na tela dela.
      expect(desenhar('a')).toBe(svg)
    })
  }

  for (const nome of NOMES_DE_FUNDO) {
    it(`fundo ${nome}: desenha nos dois detalhes, e o markup é ESTÁVEL`, () => {
      const desenhar = (detalhe: 'cheio' | 'calmo') => {
        const p = new PincelSvg('f')
        FUNDOS[nome](p, { w: 560, h: 300, chao: 240 }, { ...AMB, velocidade: 4, detalhe })
        return svgEmTexto(p.arvore())
      }
      const cheio = desenhar('cheio')
      const calmo = desenhar('calmo')
      expect(cheio.length).toBeGreaterThan(100)
      expect(desenhar('cheio')).toBe(cheio)
      // O modo calmo existe para não competir com as marcas que a cena ensina: ele desenha MENOS.
      expect(calmo.length).toBeLessThan(cheio.length)
    })
  }
})
