import { describe, expect, test } from 'bun:test'
import {
  activeHref,
  canAccessSection,
  homeForRole,
  hrefForPlatform,
  NAV_GROUPS,
  pathIsPlatformScoped,
  pathIsRoleRestricted,
  sectionForPath,
  visibleGroups,
} from '../src/components/admin/nav'

describe('nav — grupos e helpers de seção', () => {
  test('estrutura: as 3 áreas da sala da equipe, na ordem turma → conteudo → negocio', () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(['turma', 'conteudo', 'negocio'])
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Turma', 'Conteúdo', 'Negócio'])
  })

  test('os nomes do menu são os das comunidades (23/10/2026)', () => {
    const labels = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toEqual([
      'Hoje',
      'Encontros',
      'Projetos',
      'Recados',
      'Moderação',
      'Alunos',
      'Cursos',
      'Oficinas',
      'Jornada',
      'Desafio do mês',
      'Como fazer',
      'Clube e Comunidade',
      'Visão geral',
      'Contas',
      'Vendas',
      'Notas fiscais',
      'Catálogo',
      'Campanhas',
      'Zappy e Pensa',
      'Atendimento',
      'Auditoria',
    ])
  })

  test('activeHref resolve por longest-prefix (Alunos com as abas × Cursos)', () => {
    // /admin/membros é prefixo de todos; o mais longo vence. Ranking e Análises são abas de
    // Alunos e acendem o item Alunos.
    expect(activeHref('/admin/membros')).toBe('/admin/membros')
    expect(activeHref('/admin/membros/u-123')).toBe('/admin/membros')
    expect(activeHref('/admin/membros/cursos')).toBe('/admin/membros/cursos')
    expect(activeHref('/admin/membros/cursos/c-1/aulas/a-1')).toBe('/admin/membros/cursos')
    expect(activeHref('/admin/membros/analises')).toBe('/admin/membros')
    expect(activeHref('/admin/membros/ranking')).toBe('/admin/membros')
  })

  test('a Jornada é um item só: as telas Kids e Adultos acendem o mesmo item', () => {
    expect(activeHref('/admin/professor/jornada-kids')).toBe('/admin/professor/jornada-kids')
    expect(activeHref('/admin/professor/jornada-adulta')).toBe('/admin/professor/jornada-kids')
    const items = NAV_GROUPS.flatMap((g) => g.items)
    const jornada = items.find((i) => i.label === 'Jornada')
    expect(jornada && hrefForPlatform(jornada, 'kids')).toBe('/admin/professor/jornada-kids')
    expect(jornada && hrefForPlatform(jornada, 'adult')).toBe('/admin/professor/jornada-adulta')
    const hoje = items.find((i) => i.label === 'Hoje')
    expect(hoje && hrefForPlatform(hoje, 'adult')).toBe('/admin/professor')
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

  test('sectionForPath: cursos é conteudo, a ficha do aluno é turma, a visão geral é negocio', () => {
    expect(sectionForPath('/admin/professor/entregas')).toBe('turma')
    expect(sectionForPath('/admin/professor/recados')).toBe('turma')
    expect(sectionForPath('/admin/membros/u-123')).toBe('turma')
    expect(sectionForPath('/admin/membros/analises')).toBe('turma')
    expect(sectionForPath('/admin/membros/ranking')).toBe('turma')
    expect(sectionForPath('/admin/comunidade/moderacao')).toBe('turma')
    expect(sectionForPath('/admin/membros/cursos/c-1')).toBe('conteudo')
    expect(sectionForPath('/admin/comunidade/servidores')).toBe('conteudo')
    expect(sectionForPath('/admin/professor/desafio')).toBe('conteudo')
    expect(sectionForPath('/admin/professor/jornada-adulta')).toBe('conteudo')
    expect(sectionForPath('/admin/oficinas')).toBe('conteudo')
    expect(sectionForPath('/admin')).toBe('negocio')
    expect(sectionForPath('/admin/pagamentos/transacoes')).toBe('negocio')
    expect(sectionForPath('/admin/auditoria')).toBe('negocio')
    expect(sectionForPath('/fora-da-nav')).toBeNull()
  })

  test('visibleGroups filtra por papel (staff não vê Auditoria; grupos seguem abertos)', () => {
    const staff = visibleGroups('staff')
    expect(staff.map((g) => g.id)).toEqual(['turma', 'conteudo', 'negocio'])
    const negocioStaff = staff.find((g) => g.id === 'negocio')
    expect(negocioStaff?.items.map((i) => i.label)).not.toContain('Auditoria')
    const admin = visibleGroups('admin')
    expect(admin.find((g) => g.id === 'negocio')?.items.map((i) => i.label)).toContain('Auditoria')
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

  test('homeForRole: 1º item visível do 1º grupo (Hoje, a entrada de todo mundo)', () => {
    expect(homeForRole('staff')).toBe('/admin/professor')
    expect(homeForRole('admin')).toBe('/admin/professor')
  })

  test('Hoje (/admin/professor) não rouba o ativo dos filhos (longest-prefix)', () => {
    expect(activeHref('/admin/professor')).toBe('/admin/professor')
    expect(activeHref('/admin/professor/entregas')).toBe('/admin/professor/entregas')
    expect(activeHref('/admin/professor/recados')).toBe('/admin/professor/recados')
  })

  test('pathIsPlatformScoped: ensino e negócio seguem a lente; infraestrutura e auditoria são compartilhadas', () => {
    // Escopadas pelo seletor Kids × Adultos.
    expect(pathIsPlatformScoped('/admin/professor')).toBe(true)
    expect(pathIsPlatformScoped('/admin/professor/entregas')).toBe(true)
    expect(pathIsPlatformScoped('/admin/professor/recados')).toBe(true)
    // Encontros lê a agenda sem plataforma: mostra as duas comunidades (e as salas também).
    expect(pathIsPlatformScoped('/admin/professor/ao-vivo')).toBe(false)
    expect(pathIsPlatformScoped('/admin/professor/ao-vivo/s-1')).toBe(false)
    expect(pathIsPlatformScoped('/admin/professor/ao-vivox')).toBe(true)
    expect(pathIsPlatformScoped('/admin/comunidade/moderacao')).toBe(true)
    expect(pathIsPlatformScoped('/admin/membros')).toBe(true)
    expect(pathIsPlatformScoped('/admin/membros/u-123')).toBe(true)
    expect(pathIsPlatformScoped('/admin/membros/crianca/p-1')).toBe(true)
    expect(pathIsPlatformScoped('/admin/membros/ranking')).toBe(true)
    // Editor de entidade fixa mostra a audiência REAL do curso e não muda de
    // conteúdo quando o seletor global troca.
    expect(pathIsPlatformScoped('/admin/membros/cursos/c-1')).toBe(false)
    expect(pathIsPlatformScoped('/admin/membros/cursos/c-1/aulas/a-1')).toBe(false)
    expect(pathIsPlatformScoped('/admin/membros/analises')).toBe(true)
    // As turmas dos cursos ao vivo seguem a plataforma do curso (14/10/2026).
    expect(pathIsPlatformScoped('/admin/oficinas')).toBe(true)
    // Como fazer segue a lente: cada comunidade tem a sua biblioteca (`audience=`).
    expect(pathIsPlatformScoped('/admin/como-fazer')).toBe(true)
    expect(pathIsPlatformScoped('/admin/como-fazer/t-1')).toBe(true)
    // Negócio segue a lente; infraestrutura e auditoria preservam escopo compartilhado.
    expect(pathIsPlatformScoped('/admin')).toBe(true)
    expect(pathIsPlatformScoped('/admin/usuarios')).toBe(false)
    expect(pathIsPlatformScoped('/admin/pagamentos/transacoes')).toBe(true)
    expect(pathIsPlatformScoped('/admin/catalogo/produtos')).toBe(true)
    expect(pathIsPlatformScoped('/admin/embaixadores')).toBe(true)
    expect(pathIsPlatformScoped('/admin/pagamentos/assinaturas')).toBe(true)
    expect(pathIsPlatformScoped('/admin/comunidade/servidores')).toBe(false)
    expect(pathIsPlatformScoped('/admin/auditoria')).toBe(false)
    // Prefixo por SEGMENTO (não string crua).
    expect(pathIsPlatformScoped('/admin/membrosxyz')).toBe(false)
  })

  test('badgeKey: só Projetos/Recados/Moderação têm chip de contagem', () => {
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

describe('nav — "Como fazer" (biblioteca de ajuda das comunidades)', () => {
  test('mora em Conteúdo, ao lado dos cursos, e o editor de um tutorial acende o item', () => {
    expect(sectionForPath('/admin/como-fazer')).toBe('conteudo')
    expect(sectionForPath('/admin/como-fazer/3d1c2f5e-7b8a-4c9d-8e0f-1a2b3c4d5e6f')).toBe(
      'conteudo',
    )
    expect(activeHref('/admin/como-fazer/3d1c2f5e-7b8a-4c9d-8e0f-1a2b3c4d5e6f')).toBe(
      '/admin/como-fazer',
    )
  })

  test('staff também vê (a equipe consulta; quem publica é o admin, e o gateway decide)', () => {
    const labels = visibleGroups('staff').flatMap((group) => group.items.map((item) => item.label))
    expect(labels).toContain('Como fazer')
  })
})
