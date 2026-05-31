import { describe, expect, test } from 'bun:test'
import type { UpstreamTarget } from '../../src/domain/load-balancing/load-balancer.port'
import { LeastConnectionsLoadBalancer } from '../../src/infrastructure/load-balancing/least-connections.lb'
import { createLoadBalancer } from '../../src/infrastructure/load-balancing/load-balancer.factory'
import { RoundRobinLoadBalancer } from '../../src/infrastructure/load-balancing/round-robin.lb'
import { StickyLoadBalancer } from '../../src/infrastructure/load-balancing/sticky.decorator'
import { UpstreamStats } from '../../src/infrastructure/load-balancing/upstream-stats'
import { WeightedLoadBalancer } from '../../src/infrastructure/load-balancing/weighted.lb'

const targets: UpstreamTarget[] = [
  { id: 'a', baseUrl: 'http://a', weight: 1 },
  { id: 'b', baseUrl: 'http://b', weight: 1 },
]

describe('load balancers', () => {
  test('round-robin alterna', () => {
    const lb = new RoundRobinLoadBalancer()
    const stats = new UpstreamStats()
    const picks = [0, 1, 2, 3].map(() => lb.pick({ healthy: targets, stats })?.id)
    expect(picks).toEqual(['a', 'b', 'a', 'b'])
  })

  test('least-connections evita o mais carregado', () => {
    const stats = new UpstreamStats()
    stats.begin('a')
    stats.begin('a')
    const lb = new LeastConnectionsLoadBalancer()
    expect(lb.pick({ healthy: targets, stats })?.id).toBe('b')
  })

  test('weighted respeita os pesos (3:1)', () => {
    const weighted: UpstreamTarget[] = [
      { id: 'a', baseUrl: 'http://a', weight: 3 },
      { id: 'b', baseUrl: 'http://b', weight: 1 },
    ]
    const lb = new WeightedLoadBalancer()
    const stats = new UpstreamStats()
    const counts: Record<string, number> = {}
    for (let i = 0; i < 4; i++) {
      const id = lb.pick({ healthy: weighted, stats })?.id ?? '?'
      counts[id] = (counts[id] ?? 0) + 1
    }
    expect(counts.a).toBe(3)
    expect(counts.b).toBe(1)
  })

  test('sticky é determinístico por chave', () => {
    const lb = new StickyLoadBalancer(new RoundRobinLoadBalancer())
    const stats = new UpstreamStats()
    const p1 = lb.pick({ healthy: targets, stickyKey: 'user-1', stats })?.id
    const p2 = lb.pick({ healthy: targets, stickyKey: 'user-1', stats })?.id
    expect(p1).toBe(p2)
  })

  test('sticky (HRW): remover um alvo só remapeia as sessões que estavam nele', () => {
    const lb = new StickyLoadBalancer(new RoundRobinLoadBalancer())
    const stats = new UpstreamStats()
    const all: UpstreamTarget[] = ['a', 'b', 'c', 'd'].map((id) => ({
      id,
      baseUrl: `http://${id}`,
      weight: 1,
    }))
    const keys = Array.from({ length: 400 }, (_, i) => `user-${i}`)
    const before = new Map(keys.map((k) => [k, lb.pick({ healthy: all, stickyKey: k, stats })?.id]))

    const without = all.filter((t) => t.id !== 'c')
    let movedFromC = 0
    let movedOthers = 0
    for (const k of keys) {
      const after = lb.pick({ healthy: without, stickyKey: k, stats })?.id
      if (before.get(k) === 'c') movedFromC++
      else if (after !== before.get(k)) movedOthers++
    }
    // HRW: nenhuma sessão que NÃO estava em 'c' migra (modulo-rehash migraria ~todas).
    expect(movedOthers).toBe(0)
    expect(movedFromC).toBeGreaterThan(0)
  })

  test('sticky (HRW): distribui as chaves por todos os alvos', () => {
    const lb = new StickyLoadBalancer(new RoundRobinLoadBalancer())
    const stats = new UpstreamStats()
    const three: UpstreamTarget[] = ['a', 'b', 'c'].map((id) => ({
      id,
      baseUrl: `http://${id}`,
      weight: 1,
    }))
    const counts = new Map<string, number>()
    for (let i = 0; i < 300; i++) {
      const id = lb.pick({ healthy: three, stickyKey: `k-${i}`, stats })?.id
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(counts.size).toBe(3)
    for (const id of ['a', 'b', 'c']) expect(counts.get(id) ?? 0).toBeGreaterThan(0)
  })

  test('factory + pool vazio → undefined', () => {
    const lb = createLoadBalancer('round-robin')
    const stats = new UpstreamStats()
    expect(lb.pick({ healthy: [], stats })).toBeUndefined()
  })
})
