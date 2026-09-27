import { afterEach, describe, expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import * as navigation from 'next/navigation'
import { HelpToolNotice } from '../src/components/kids/help/help-tool-notice'
import { HelpShortcut } from '../src/components/kids/help-shortcut'
import { backToSection, HELP_NAV, NAV_ITEMS } from '../src/components/kids/nav'

afterEach(cleanup)

let pathname = '/'
mock.module('next/navigation', () => ({
  ...navigation,
  usePathname: () => pathname,
}))

/**
 * O que a biblioteca de ajuda PROMETE e não pode regredir:
 * 1. o aviso da ferramenta é FACTUAL: sem "Comunidade dos Criadores", sem pedir para comprar,
 *    sem "peça para os seus pais"; liberada = atalho, não liberada = frase e só;
 * 2. o atalho é um só, fora das cinco seções, e a setinha de voltar deriva do mapa do menu;
 * 3. as páginas do `/como-fazer` NÃO tocam em progresso, conclusão nem matrícula.
 */
describe('HelpToolNotice: aviso factual, sem oferta', () => {
  it('ferramenta liberada mostra o atalho', () => {
    render(<HelpToolNotice tool="pinta" state="available" />)
    const link = screen.getByRole('link', { name: /Abrir o Pinta/ })
    expect(link.getAttribute('href')).toBe('/pinta')
  })

  it('não incluída no perfil: frase factual, sem link e sem pitch', () => {
    const { container } = render(<HelpToolNotice tool="pinta" state="not-included" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.textContent).toContain('ainda não está liberado neste perfil')
    expect(container.textContent).toContain('ler o passo a passo mesmo assim')
    for (const proibido of [
      /Comunidade dos Criadores/i,
      /assin/i,
      /compr/i,
      /pai|mãe|responsável/i,
    ]) {
      expect(container.textContent).not.toMatch(proibido)
    }
  })

  it('abre mais adiante na jornada: idem, com a frase da jornada', () => {
    const { container } = render(<HelpToolNotice tool="molda" state="career-locked" />)
    expect(container.textContent).toContain('abre mais adiante na sua jornada')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('consulta que falhou não diz nada (um soluço de rede não tira ferramenta)', () => {
    const { container } = render(<HelpToolNotice tool="pensa" state="unavailable" />)
    expect(container.textContent).toBe('')
    expect(render(<HelpToolNotice tool="pensa" state={null} />).container.textContent).toBe('')
  })
})

describe('HelpShortcut e a volta', () => {
  it('as duas roupas apontam para /como-fazer, com nome acessível e aria-current', () => {
    pathname = '/como-fazer/pinta-camada'
    render(<HelpShortcut variant="pill" />)
    const pill = screen.getByRole('link', { name: 'Como fazer' })
    expect(pill.getAttribute('href')).toBe('/como-fazer')
    expect(pill.getAttribute('aria-current')).toBe('page')
    cleanup()
    pathname = '/perfil'
    render(<HelpShortcut variant="icon" />)
    const icon = screen.getByRole('link', { name: 'Como fazer' })
    expect(icon.getAttribute('aria-current')).toBeNull()
  })

  it('fica FORA das cinco seções e ganha a setinha pelo mapa', () => {
    expect(NAV_ITEMS.some((item) => item.href === HELP_NAV.href)).toBe(false)
    expect(backToSection('/como-fazer')).toBeNull()
    expect(backToSection('/como-fazer/pinta-camada')).toEqual({
      href: '/como-fazer',
      label: 'Voltar ao Como fazer',
    })
    expect(backToSection('/como-fazer/colecao/pinta')?.href).toBe('/como-fazer')
    expect(backToSection('/como-fazerx')).toBeNull()
  })
})

describe('as páginas do Como fazer não tocam em progresso', () => {
  const raiz = join(import.meta.dir, '..', 'src', 'app', '(app)', 'como-fazer')
  const fontes = [
    'page.tsx',
    join('colecao', '[slug]', 'page.tsx'),
    join('[slug]', 'page.tsx'),
  ].map((f) => readFileSync(join(raiz, f), 'utf8'))

  it('nenhuma importa rota de conclusão, progresso, posição ou matrícula', () => {
    expect(fontes.length).toBe(3)
    for (const fonte of fontes) {
      for (const proibido of [
        'markLessonComplete',
        'saveVideoPosition',
        'learning-progress',
        'submitQuizAttempt',
        'LessonPlayerProvider',
        'COMUNIDADE_OFERTA_URL',
        'KidsLockedProduct',
      ]) {
        expect(fonte).not.toContain(proibido)
      }
    }
  })

  it('a página de detalhe não passa callback de servidor ao visualizador cliente', () => {
    const detalhe = fontes[2]
    expect(detalhe).not.toContain('renderRelated=')
    expect(detalhe).toContain('relatedItems={relatedItems}')
  })
})
