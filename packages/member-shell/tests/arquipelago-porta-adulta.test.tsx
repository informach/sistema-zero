import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AVISOS_DA_PORTA_ADULTA,
  AvisoAdultoDaFerramenta,
  PortaAdultaDoArquipelago,
  TEXTOS_DA_PORTA_ADULTA,
} from '../src/components/arquipelago-porta-adulta'

const ESTADOS = ['carregando', 'indisponivel', 'erro'] as const
const porta = (estado: (typeof ESTADOS)[number]) =>
  renderToStaticMarkup(<PortaAdultaDoArquipelago estado={estado} voltarPara="/" />)
const texto = (html: string) =>
  html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')

describe('a porta do Arquipélago na comunidade adulta', () => {
  test('veste o Estúdio à noite: palco, sobretítulo em pixel e a ação amarela', () => {
    const html = porta('indisponivel')
    expect(html).toContain('sz-palco')
    expect(html).toContain('sz-kicker')
    expect(html).toContain('class="sz-btn"')
    expect(html).not.toContain('sz-btn-gradient')
    expect(porta('erro')).toContain('sz-btn-outline')
  })

  test('sem mascote e com a voz do community', () => {
    for (const estado of ESTADOS) {
      const html = porta(estado)
      expect(html).not.toContain('/zappy/')
      expect(html).toContain('aria-live="polite"')
    }
    expect(texto(porta('carregando'))).toContain('Preparando a sua ilha.')
    expect(texto(porta('erro'))).toContain('Voltar para a comunidade')
    expect(porta('carregando')).not.toContain('href="/"')
  })

  test('o aviso da ferramenta diz qual abre e devolve ao jogo na falha', () => {
    const abrindo = renderToStaticMarkup(
      <AvisoAdultoDaFerramenta ferramenta="pinta" falhou={false} />,
    )
    expect(texto(abrindo)).toContain('Abrindo o Pinta')
    expect(abrindo).not.toContain('<button')
    const falhou = renderToStaticMarkup(
      <AvisoAdultoDaFerramenta ferramenta="molda" falhou onVoltar={() => {}} />,
    )
    expect(texto(falhou)).toContain('O Molda não abriu agora')
    expect(falhou).toContain('role="alert"')
    expect(texto(falhou)).toContain('Voltar ao jogo')
  })

  test('os textos seguem a régua do adulto', () => {
    const todos = [
      ...Object.values(TEXTOS_DA_PORTA_ADULTA).flatMap((t) => [t.titulo, t.texto]),
      ...Object.values(AVISOS_DA_PORTA_ADULTA).flatMap((t) =>
        typeof t === 'string' ? [t] : [t('o Estúdio')],
      ),
      ...ESTADOS.map((e) => texto(porta(e))),
    ]
    for (const t of todos) {
      expect(t).not.toMatch(/[!—…]/)
      expect(t.trim().split(/[.\n]/)[0]).not.toContain('?')
      // Vocabulário do community: o recurso tem nome, sem "IA" solta; nada de criança ou Zappy.
      expect(t).not.toMatch(/\bIA\b|intelig[eê]ncia artificial|criança|Zappy|internet/i)
    }
  })
})

describe('a entrada adulta não chega ao Kids', () => {
  const ler = (caminho: string) => readFileSync(resolve(import.meta.dirname, caminho), 'utf8')

  test('o host e a porta do Kids não importam a tela adulta', () => {
    for (const arquivo of [
      '../src/components/arquipelago-host.tsx',
      '../src/components/arquipelago-porta.tsx',
      '../../community-kids/src/app/arquipelago/page.tsx',
    ]) {
      // Só o import conta (um comentário pode citar a entrada adulta).
      const importa = /(?:from|import\()\s*['"][^'"]*(?:porta-adulta|host-adulto)['"]/.test(
        ler(arquivo),
      )
      expect(importa, arquivo).toBe(false)
    }
  })

  test('a comunidade adulta entra pela entrada própria', () => {
    const pagina = ler('../../community/src/app/arquipelago/page.tsx')
    expect(pagina).toContain("'@sistemazero/member-shell/components/arquipelago-host-adulto'")
    expect(pagina).not.toContain("components/arquipelago-host'")
    expect(ler('../src/components/arquipelago-host-adulto.tsx')).toContain('publico="adulto"')
  })
})
