import { expect, test } from 'bun:test'
import { ADULT_LESSON_COPY, COMMON_LESSON_COPY } from '../src/lib/lesson-copy'
import { KIDS_LESSON_COPY } from '../src/lib/lesson-copy-kids'

test('as duas comunidades usam o mesmo contrato de linguagem', () => {
  expect(ADULT_LESSON_COPY).toBe(COMMON_LESSON_COPY)
  expect(KIDS_LESSON_COPY).toBe(COMMON_LESSON_COPY)
  expect(COMMON_LESSON_COPY.secoes.proxima).toBe('Próxima parte')
  expect(COMMON_LESSON_COPY.verificacao.botao).toBe('Verificar projeto')
  expect(COMMON_LESSON_COPY.estudio.enviar).toBe('Enviar meu projeto')
  expect(COMMON_LESSON_COPY.certificado.eligibleBtn).toBe('Baixar meu certificado')
})

test('uma pendência de projeto desatualizado orienta o reenvio nas duas comunidades', () => {
  const item = { kind: 'submission-outdated', text: 'Projeto alterado' } as const
  const esperado = 'Você mudou o projeto depois de enviar. Clique em Enviar de novo'
  expect(ADULT_LESSON_COPY.itemPendente(item)).toBe(esperado)
  expect(KIDS_LESSON_COPY.itemPendente(item)).toBe(esperado)
})

test('a recusa de conclusão usa a mesma instrução e preserva o erro de suporte', () => {
  const erro = { code: 'SECTION_GATE_INCOMPLETE', message: 'Conclua as partes da aula' }
  expect(COMMON_LESSON_COPY.erroDoServidor(erro, 'Falhou')).toBe(
    'Termine todas as partes desta aula para concluir.',
  )
  expect(COMMON_LESSON_COPY.erroDoServidor(new TypeError('Failed to fetch'), 'Tente de novo')).toBe(
    'Tente de novo',
  )
  expect(COMMON_LESSON_COPY.erroDoServidor({ code: 'IMPERSONATION_READONLY' }, 'Falhou')).toContain(
    'Ative o modo de edição',
  )
})

test('a galeria só diz "não podem ser enviados" para o que de fato não tem como ir', () => {
  const esperado =
    'Os desenhos deste perfil não podem ser enviados pela galeria. Fale com a equipe.'
  // A leitura causal desligada para este perfil, ou uma recusa causal inesperada no envio.
  expect(
    COMMON_LESSON_COPY.erroDoServidor(
      { code: 'PINTA_CAUSAL_CONFLICT', message: 'account-deleting' },
      'Falhou',
    ),
  ).toBe(esperado)
  expect(
    COMMON_LESSON_COPY.erroDoServidor(
      { code: 'GALLERY_PINTA_CAUSAL_UNSUPPORTED', message: 'qualquer' },
      'Falhou',
    ),
  ).toBe(esperado)
})

test('a galeria de um perfil causal pede para escolher de novo ou abrir o Pinta, sem o código cru', () => {
  // O desenho mudou depois que a lista foi montada: a criança escolhe a versão nova.
  expect(
    COMMON_LESSON_COPY.erroDoServidor(
      { code: 'GALLERY_PINTA_DRAWING_CHANGED', message: 'qualquer' },
      'Falhou',
    ),
  ).toBe('Este desenho mudou. Escolha de novo para enviar a versão nova.')
  // Um desenho do escritor antigo ainda sem certificado: aparece, e o Pinta o adota ao abrir.
  const abra = 'Abra este desenho no Pinta uma vez para poder enviar.'
  expect(
    COMMON_LESSON_COPY.erroDoServidor(
      { code: 'GALLERY_PINTA_DRAWING_UNCERTIFIED', message: 'qualquer' },
      'Falhou',
    ),
  ).toBe(abra)
  expect(COMMON_LESSON_COPY.galeria.abrirNoPinta).toBe(abra)
})
