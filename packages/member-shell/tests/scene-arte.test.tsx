import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { FundoDoCenario, RelogioDaArteProvider } from '../src/components/scene-arte'
import { ActorFigure } from '../src/components/scene-figures'

/**
 * A ARTE DO JOGO no palco: o relógio, o enquadramento e o recorte.
 *
 * ⚠️⚠️ Este arquivo nasceu de um achado do full review: o parâmetro de tempo existia, a arte sabia
 * animar, e NENHUM palco ligava o relógio — a animação que ela pediu simplesmente não acontecia, e
 * tudo estava verde. Metade de uma feature ligada é pior que nenhuma, porque parece pronta.
 */

const desenhar = (no: React.ReactElement) => renderToStaticMarkup(no)

describe('o relógio da arte', () => {
  test('⭐⭐ sem relógio a arte fica PARADA: dois renders dão o mesmo desenho', () => {
    // É o que mantém o palco quieto enquanto a criança lê a pergunta, e é o que torna o
    // `renderToStaticMarkup` das outras 45 varreduras estável.
    const a = desenhar(<ActorFigure figure="dino" x={0} y={0} />)
    const b = desenhar(<ActorFigure figure="dino" x={0} y={0} />)
    expect(a).toBe(b)
  })

  test('⭐⭐ com o relógio andando, o desenho MUDA', () => {
    const parado = desenhar(
      <RelogioDaArteProvider value={0}>
        <ActorFigure figure="dino" x={0} y={0} />
      </RelogioDaArteProvider>,
    )
    const depois = desenhar(
      <RelogioDaArteProvider value={90}>
        <ActorFigure figure="dino" x={0} y={0} />
      </RelogioDaArteProvider>,
    )
    expect(depois).not.toBe(parado)
  })

  test('o relógio alcança o FUNDO também (os morros e as estrelas rolam)', () => {
    const num = (t: number) =>
      desenhar(
        <RelogioDaArteProvider value={t}>
          <svg aria-hidden="true">
            <FundoDoCenario cenario="corre-dino" w={560} h={300} chao={240} />
          </svg>
        </RelogioDaArteProvider>,
      )
    expect(num(400)).not.toBe(num(0))
  })

  test('⚠️ o `t` explícito VENCE o contexto (a galeria e a prévia congelam a arte)', () => {
    const comContexto = desenhar(
      <RelogioDaArteProvider value={900}>
        <ActorFigure figure="dino" x={0} y={0} t={0} />
      </RelogioDaArteProvider>,
    )
    expect(comContexto).toBe(desenhar(<ActorFigure figure="dino" x={0} y={0} />))
  })
})

describe('⚠️⚠️ quem MEXE a cena provê o relógio', () => {
  // Teste de FORMA, e é ele que fecha o buraco: a régua de comportamento acima passa com o
  // provider esquecido no player, que foi exatamente o estado em que este código chegou ao review.
  const fonte = (arquivo: string) =>
    readFileSync(join(import.meta.dir, '..', 'src', 'components', arquivo), 'utf8')

  for (const arquivo of ['scene-activity.tsx']) {
    test(`${arquivo} envolve o palco no RelogioDaArteProvider`, () => {
      const s = fonte(arquivo)
      expect(s).toContain('RelogioDaArteProvider')
      // O provider tem que estar ao redor do palco, não solto num canto do arquivo.
      const i = s.indexOf('<RelogioDaArteProvider')
      const j = s.indexOf('<ExplorationStage', i)
      const k = s.indexOf('</RelogioDaArteProvider>', i)
      expect({ abre: i >= 0, dentro: j > i && j < k }).toEqual({ abre: true, dentro: true })
    })

    test(`${arquivo} ADIANTA o relógio no tique do mundo`, () => {
      // Sem isto o provider existe e entrega zero para sempre — o defeito de novo, com um teste
      // de forma passando por cima dele.
      expect(fonte(arquivo)).toMatch(/setTempoDaArte\(\(v\) => v \+ \w+ \* 1000\)/)
    })
  }
})

describe('o enquadramento e o recorte', () => {
  test('⭐ a figura assenta no CHÃO: (x, y) é o meio do chão sob ela', () => {
    // O contrato que os 45 palcos usam. Se ele mudar, toda figura sobe ou desce de uma vez.
    const html = desenhar(<ActorFigure figure="dino" x={100} y={200} />)
    expect(html).toContain('translate(100 200)')
    // O corpo sobe para o `y` negativo: nenhuma coordenada do desenho passa muito de zero.
    const ys = [...html.matchAll(/[ML]-?[\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(ys.length).toBeGreaterThan(5)
    expect(Math.max(...ys)).toBeLessThanOrEqual(2)
  })

  test('⚠️⚠️ o fundo é RECORTADO na própria área', () => {
    // Os morros da floresta são mais largos que a tela de propósito. Sem o recorte eles vazavam
    // para fora da moldura do palco — visto na `coordinates`, que desenha a tela dentro de um quadro.
    const html = desenhar(
      <svg aria-hidden="true">
        <FundoDoCenario cenario="corre-dino" x={40} y={20} w={200} h={120} />
      </svg>,
    )
    expect(html).toContain('<clipPath')
    expect(html).toMatch(/clip-path="url\(#c[^"]+\)"/)
    expect(html).toContain('translate(40 20)')
  })

  test('cada cenário pinta o SEU mundo, e o marca no `data-fundo`', () => {
    for (const cenario of ['corre-dino', 'nave', 'gorilas', 'meu-jeito'] as const) {
      const html = desenhar(
        <svg aria-hidden="true">
          <FundoDoCenario cenario={cenario} w={300} h={200} />
        </svg>,
      )
      expect({ cenario, marcado: html.includes(`data-fundo="${cenario}"`) }).toEqual({
        cenario,
        marcado: true,
      })
    }
  })

  test('⚠️ o modo calmo desenha MENOS: é o que não compete com a régua da cena', () => {
    const tamanho = (detalhe: 'cheio' | 'calmo') =>
      desenhar(
        <svg aria-hidden="true">
          <FundoDoCenario cenario="nave" w={560} h={300} detalhe={detalhe} />
        </svg>,
      ).length
    expect(tamanho('calmo')).toBeLessThan(tamanho('cheio'))
  })

  test('⚠️⚠️ `semDetalhe` é em coordenadas do FUNDO, e tira o detalhe de lá', () => {
    const zona = { x: 0, y: 0, w: 300, h: 100 }
    const com = desenhar(
      <svg aria-hidden="true">
        <FundoDoCenario cenario="nave" w={300} h={200} semDetalhe={[zona]} />
      </svg>,
    )
    const sem = desenhar(
      <svg aria-hidden="true">
        <FundoDoCenario cenario="nave" w={300} h={200} />
      </svg>,
    )
    expect(com.length).toBeLessThan(sem.length)
  })

  test('⚠️ os ids são por INSTÂNCIA: duas artes na mesma página não colidem', () => {
    const html = desenhar(
      <svg aria-hidden="true">
        <FundoDoCenario cenario="nave" w={200} h={100} />
        <FundoDoCenario cenario="nave" w={200} h={100} />
      </svg>,
    )
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
    expect(ids.length).toBeGreaterThan(1)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
