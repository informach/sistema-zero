import { describe, expect, test } from 'bun:test'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../src/lib/categories'

describe('enums espelhados do backend', () => {
  test('os 5 status de ticket, na ordem do ciclo de vida', () => {
    expect(TICKET_STATUSES).toEqual(['new', 'open', 'waiting', 'resolved', 'closed'])
  })

  test('as 5 categorias de ticket', () => {
    expect(TICKET_CATEGORIES).toEqual([
      'curso_acesso',
      'problema_tecnico',
      'pagamento_reembolso',
      'parceria_comercial',
      'outro',
    ])
  })

  test('as 3 prioridades de ticket', () => {
    expect(TICKET_PRIORITIES).toEqual(['baixa', 'normal', 'alta'])
  })
})

describe('completude dos mapas (nas duas direções)', () => {
  test('todo status tem rótulo e cor; nenhuma chave sobrando', () => {
    for (const status of TICKET_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy()
      expect(STATUS_COLORS[status]).toBeTruthy()
    }
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...TICKET_STATUSES].sort())
    expect(Object.keys(STATUS_COLORS).sort()).toEqual([...TICKET_STATUSES].sort())
  })

  test('toda categoria tem rótulo e cor; nenhuma chave sobrando', () => {
    for (const category of TICKET_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy()
      expect(CATEGORY_COLORS[category]).toBeTruthy()
    }
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...TICKET_CATEGORIES].sort())
    expect(Object.keys(CATEGORY_COLORS).sort()).toEqual([...TICKET_CATEGORIES].sort())
  })

  test('toda prioridade tem rótulo e cor; nenhuma chave sobrando', () => {
    for (const priority of TICKET_PRIORITIES) {
      expect(PRIORITY_LABELS[priority]).toBeTruthy()
      expect(PRIORITY_COLORS[priority]).toBeTruthy()
    }
    expect(Object.keys(PRIORITY_LABELS).sort()).toEqual([...TICKET_PRIORITIES].sort())
    expect(Object.keys(PRIORITY_COLORS).sort()).toEqual([...TICKET_PRIORITIES].sort())
  })
})

describe('rótulos canônicos', () => {
  test('status', () => {
    expect(STATUS_LABELS.new).toBe('Novo')
    expect(STATUS_LABELS.open).toBe('Aberto')
    expect(STATUS_LABELS.waiting).toBe('Aguardando resposta')
    expect(STATUS_LABELS.resolved).toBe('Resolvido')
    expect(STATUS_LABELS.closed).toBe('Fechado')
  })

  test('categorias', () => {
    expect(CATEGORY_LABELS.curso_acesso).toBe('Curso e acesso')
    expect(CATEGORY_LABELS.problema_tecnico).toBe('Problema técnico')
    expect(CATEGORY_LABELS.pagamento_reembolso).toBe('Pagamento e reembolso')
    expect(CATEGORY_LABELS.parceria_comercial).toBe('Parceria e comercial')
    expect(CATEGORY_LABELS.outro).toBe('Outro')
  })

  test('prioridades', () => {
    expect(PRIORITY_LABELS.baixa).toBe('Baixa')
    expect(PRIORITY_LABELS.normal).toBe('Normal')
    expect(PRIORITY_LABELS.alta).toBe('Alta')
  })
})
