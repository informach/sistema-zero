import { describe, expect, test } from 'bun:test'
import { BADGE_SLUGS } from '../../members/src/domain/gamification/badges'
import { BADGE_INFO } from '../src/components/kids/badges'

/**
 * Conformância de badges kids × members: o members CONCEDE a badge (catálogo em código
 * `BADGE_SLUGS`) e o kids a EXIBE (`BADGE_INFO`, título/copy/ícone). Slug sem entrada no
 * kids = badge INVISÍVEL (a criança ganha XP e não vê nada); entrada órfã no kids = dead.
 * `badgeInfo()` cai em `null` p/ slug desconhecido, então o TYPECHECK não pega o drift
 * (`BADGE_INFO` é `Record<BadgeSlug,…>` sobre o union ESPELHADO no member-shell, que pode
 * ficar defasado — foi assim que `challenge-first` ficou invisível). Este teste torna o
 * invariante executável.
 *
 * O kids NÃO depende do members (package.json), mas `BADGE_SLUGS` é um módulo PURO (só um
 * array `as const`) — alcançamos por caminho relativo, espelhando o `catalog-conformance`
 * do members (que faz o inverso com os catálogos puros de quarto/avatar/preço). O caminho
 * inverso não serve aqui: `BADGE_INFO` importa lucide + o alias `@/lib/types`, e o `tsc` do
 * members não conhece o `@/*` do kids.
 */
describe('badges (kids) — conformância com o members', () => {
  test('catálogo do members = apresentação do kids (mesmo conjunto de slugs)', () => {
    const members = [...BADGE_SLUGS].sort()
    const kids = Object.keys(BADGE_INFO).sort()
    expect(kids).toEqual(members)
  })
})
