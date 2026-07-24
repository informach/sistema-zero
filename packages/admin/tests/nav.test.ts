import { describe, expect, test } from 'bun:test'
import {
  activeHref,
  canAccessSection,
  homeForRole,
  NAV_GROUPS,
  pathIsRoleRestricted,
  sectionForPath,
  visibleGroups,
} from '../src/components/admin/nav'

describe('nav — grupos e helpers de seção', () => {
  test('estrutura: 3 grupos na ordem professor → gestao → config', () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(['professor', 'gestao', 'config'])
  })

  test('activeHref resolve por longest-prefix (membros × cursos × analises)', () => {
    // /admin/membros é prefixo de todos — o mais longo vence.
    expect(activeHref('/admin/membros')).toBe('/admin/membros')
    expect(activeHref('/admin/membros/u-123')).toBe('/admin/membros')
    expect(activeHref('/admin/membros/cursos')).toBe('/admin/membros/cursos')
    expect(activeHref('/admin/membros/cursos/c-1/aulas/a-1')).toBe('/admin/membros/cursos')
    expect(activeHref('/admin/membros/analises')).toBe('/admin/membros/analises')
  })

  test('activeHref: comunidade — moderação (item próprio) vence o match do grupo', () => {
    expect(activeHref('/admin/comunidade/moderacao')).toBe('/admin/comunidade/moderacao')
    expect(activeHref('/admin/comunidade/servidores')).toBe('/admin/comunidade/servidores')
    expect(activeHref('/admin/comunidade/servidores/s-1')).toBe('/admin/comunidade/servidores')
  })

  test('activeHref: /admin só casa exato; match de pagamentos/catálogo cobre as abas', () => {
    expect(activeHref('/admin')).toBe('/admin')
    expect(activeHref('/admin/pagamentos/assinaturas')).toBe('/admin/pagamentos/transacoes')
    expect(activeHref('/admin/catalogo/cupons')).toBe('/admin/catalogo/produtos')
    // Prefixo por SEGMENTO: /admin/membrosxyz não casa /admin/membros.
    expect(activeHref('/admin/membrosxyz')).toBeNull()
  })

  test('sectionForPath: autoria é config, ficha do aluno é professor, painel é gestao', () => {
    expect(sectionForPath('/admin/professor/entregas')).toBe('professor')
    expect(sectionForPath('/admin/professor/recados')).toBe('professor')
    expect(sectionForPath('/admin/membros/u-123')).toBe('professor')
    expect(sectionForPath('/admin/membros/analises')).toBe('professor')
    expect(sectionForPath('/admin/comunidade/moderacao')).toBe('professor')
    expect(sectionForPath('/admin/membros/cursos/c-1')).toBe('config')
    expect(sectionForPath('/admin/comunidade/servidores')).toBe('config')
    expect(sectionForPath('/admin')).toBe('gestao')
    expect(sectionForPath('/admin/pagamentos/transacoes')).toBe('gestao')
    expect(sectionForPath('/fora-da-nav')).toBeNull()
  })

  test('visibleGroups filtra por papel (staff não vê Auditoria; grupos seguem abertos)', () => {
    const staff = visibleGroups('staff')
    expect(staff.map((g) => g.id)).toEqual(['professor', 'gestao', 'config'])
    const configStaff = staff.find((g) => g.id === 'config')
    expect(configStaff?.items.map((i) => i.label)).not.toContain('Auditoria')
    const admin = visibleGroups('admin')
    expect(admin.find((g) => g.id === 'config')?.items.map((i) => i.label)).toContain('Auditoria')
  })

  test('canAccessSection + pathIsRoleRestricted: hoje só Auditoria restringe', () => {
    expect(pathIsRoleRestricted('/admin/auditoria')).toBe(true)
    expect(pathIsRoleRestricted('/admin/membros')).toBe(false)
    expect(pathIsRoleRestricted('/admin/professor/entregas')).toBe(false)
    expect(canAccessSection('staff', '/admin/auditoria')).toBe(false)
    expect(canAccessSection('admin', '/admin/auditoria')).toBe(true)
    expect(canAccessSection('staff', '/admin/pagamentos/transacoes')).toBe(true)
    // Path fora da nav é liberado (o gate binário do layout cobre).
    expect(canAccessSection('staff', '/admin/qualquer-coisa')).toBe(true)
  })

  test('homeForRole: 1º item visível do 1º grupo (a Home do Professor, 24/07)', () => {
    expect(homeForRole('staff')).toBe('/admin/professor')
    expect(homeForRole('admin')).toBe('/admin/professor')
  })

  test('Início (/admin/professor) não rouba o ativo dos filhos (longest-prefix)', () => {
    expect(activeHref('/admin/professor')).toBe('/admin/professor')
    expect(activeHref('/admin/professor/entregas')).toBe('/admin/professor/entregas')
    expect(activeHref('/admin/professor/recados')).toBe('/admin/professor/recados')
  })

  test('badgeKey: só Entregas/Recados/Moderação têm chip de contagem', () => {
    const withBadge = NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.badgeKey)
      .map((i) => [i.href, i.badgeKey])
    expect(withBadge).toEqual([
      ['/admin/professor/entregas', 'entregas'],
      ['/admin/professor/recados', 'recados'],
      ['/admin/comunidade/moderacao', 'moderacao'],
    ])
  })
})
