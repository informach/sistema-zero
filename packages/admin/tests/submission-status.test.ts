import { describe, expect, test } from 'bun:test'
import {
  isSubmissionPending,
  SUBMISSION_STATUS_LABEL,
  submissionStatus,
} from '../src/lib/submission-status'

// A fila do professor tinha dois estados e "fechada" queria dizer RESPONDI UM
// RECADO. Como a conversa só nasce quando a criança escreve algo no envio, a
// entrega sem recado ficava pendente para sempre. Agora há o carimbo "conferi".

describe('estado da entrega na fila do professor', () => {
  test('sem resposta e sem carimbo é PENDENTE', () => {
    expect(submissionStatus({ answered: false, reviewed: false })).toBe('pending')
    expect(isSubmissionPending({ answered: false, reviewed: false })).toBe(true)
  })

  test('⭐ só o carimbo já FECHA a entrega (o caso da entrega sem recado)', () => {
    expect(submissionStatus({ answered: false, reviewed: true })).toBe('reviewed')
    expect(isSubmissionPending({ answered: false, reviewed: true })).toBe(false)
  })

  test('responder fecha e VENCE o carimbo no rótulo', () => {
    expect(submissionStatus({ answered: true, reviewed: false })).toBe('answered')
    expect(submissionStatus({ answered: true, reviewed: true })).toBe('answered')
    expect(isSubmissionPending({ answered: true, reviewed: true })).toBe(false)
  })

  test('todo estado tem rótulo em português', () => {
    expect(SUBMISSION_STATUS_LABEL.pending).toBe('Pendente')
    expect(SUBMISSION_STATUS_LABEL.answered).toBe('Respondida')
    expect(SUBMISSION_STATUS_LABEL.reviewed).toBe('Conferida')
  })
})
