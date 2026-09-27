import { describe, expect, it } from 'bun:test'
import { editedAgo, timeAgo } from './relativeTime'

const NOW = Date.parse('2026-09-11T15:00:00.000Z')
const minutes = (n: number) => new Date(NOW - n * 60_000).toISOString()
const hours = (n: number) => minutes(n * 60)
const days = (n: number) => hours(n * 24)

describe('"Editado há…" do cartão do plano', () => {
  it('diz "agora" no primeiro minuto e "ontem" para um dia, como uma pessoa diria', () => {
    expect(editedAgo(minutes(0), NOW)).toBe('Editado agora')
    expect(editedAgo(new Date(NOW - 59_000).toISOString(), NOW)).toBe('Editado agora')
    expect(editedAgo(days(1), NOW)).toBe('Editado ontem')
    expect(editedAgo(days(2), NOW)).toBe('Editado há 2 dias')
    // Nada de "anteontem", "semana passada" ou "mês passado" depois do "Editado".
    expect(editedAgo(hours(47), NOW)).toBe('Editado ontem')
  })

  it('sobe de degrau: minutos, horas, dias, semanas, meses e anos', () => {
    expect(timeAgo(minutes(1), NOW)).toBe('há 1 minuto')
    expect(timeAgo(minutes(59), NOW)).toBe('há 59 minutos')
    expect(timeAgo(hours(1), NOW)).toBe('há 1 hora')
    expect(timeAgo(hours(23), NOW)).toBe('há 23 horas')
    expect(timeAgo(days(6), NOW)).toBe('há 6 dias')
    expect(timeAgo(days(7), NOW)).toBe('há 1 semana')
    expect(timeAgo(days(14), NOW)).toBe('há 2 semanas')
    expect(timeAgo(days(45), NOW)).toBe('há 1 mês')
    expect(timeAgo(days(90), NOW)).toBe('há 3 meses')
    expect(timeAgo(days(800), NOW)).toBe('há 2 anos')
  })

  it('data no futuro (relógio atrasado) ou inválida vira "agora", nunca "daqui a…"', () => {
    expect(timeAgo(new Date(NOW + 5 * 60_000).toISOString(), NOW)).toBe('agora')
    expect(timeAgo('não é data', NOW)).toBe('agora')
  })
})
