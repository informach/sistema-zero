import { describe, expect, it } from 'bun:test'
import { resolveHelpReturn } from '../src/lib/help-return'

/**
 * O `?voltar=` do tutorial vem da URL, então é ALLOWLIST: só um caminho de AULA vira o botão
 * "Voltar para a aula". Qualquer outra coisa cai em `null` (a página mostra só a volta para a
 * biblioteca), nunca um redirect aberto.
 */
describe('resolveHelpReturn', () => {
  it('aceita o caminho de aula das duas comunidades, com hash de seção', () => {
    expect(resolveHelpReturn('/cursos/corre-dino/aulas/abc-123')).toEqual({
      href: '/cursos/corre-dino/aulas/abc-123',
      label: 'Voltar para a aula',
    })
    expect(resolveHelpReturn('%2Fcursos%2Fcorre-dino%2Faulas%2Fabc')?.href).toBe(
      '/cursos/corre-dino/aulas/abc',
    )
    expect(resolveHelpReturn('/cursos/x/aulas/y#section=s1')?.href).toBe(
      '/cursos/x/aulas/y#section=s1',
    )
  })

  it('recusa tudo que não é aula: outra rota, outro host, protocolo, vazio', () => {
    for (const value of [
      undefined,
      null,
      '',
      '/perfil',
      '/cursos/x',
      '/cursos/x/aulas',
      '//evil.com/cursos/x/aulas/y',
      'https://evil.com/cursos/x/aulas/y',
      'javascript:alert(1)',
      '/cursos/x/aulas/y/extra',
      '/cursos/x/aulas/y?q=1',
      '%E0%A4%A',
    ]) {
      expect(resolveHelpReturn(value)).toBeNull()
    }
  })

  it('hash fora do formato é descartado sem perder a volta', () => {
    expect(resolveHelpReturn('/cursos/x/aulas/y#"onload=1')?.href).toBe('/cursos/x/aulas/y')
  })
})
