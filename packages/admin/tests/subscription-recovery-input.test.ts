import { expect, test } from 'bun:test'
import { recoveryPolicyInput } from '../src/lib/subscription-recovery'

test('preserva versão/política explícitas e aceita ausência intencional de lembretes', () => {
  expect(recoveryPolicyInput({ version: 3, days: '7', reminders: '3, 6', enabled: true })).toEqual({
    expectedVersion: 3,
    windowDays: 7,
    reminderDays: [3, 6],
    enabled: true,
  })
  expect(
    recoveryPolicyInput({ version: 3, days: '1', reminders: '', enabled: false })?.reminderDays,
  ).toEqual([])
})
test('não interpreta decimal, negativo, duplicação ou lembrete depois do encerramento', () => {
  for (const [days, reminders] of [
    ['7.2', '3'],
    ['-7', '3'],
    ['0', ''],
    ['31', '3'],
    ['7', '6,3'],
    ['7', '3,3'],
    ['7', '7'],
    ['7', '2,3,4,5'],
    ['7', '3x'],
  ])
    expect(
      recoveryPolicyInput({ version: 1, days: days!, reminders: reminders!, enabled: true }),
    ).toBeNull()
})
