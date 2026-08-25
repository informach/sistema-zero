import { DomainError } from '../shared/errors'

export class CourseNotFoundError extends DomainError {
  readonly code = 'COURSE_NOT_FOUND'
  constructor(message = 'Curso não encontrado') {
    super(message)
  }
}

export class LessonNotFoundError extends DomainError {
  readonly code = 'LESSON_NOT_FOUND'
  constructor(message = 'Aula não encontrada') {
    super(message)
  }
}

/**
 * Aula travada pela trava sequencial: o aluno tentou abrir uma aula cujas aulas
 * publicadas anteriores ainda não foram todas concluídas (e o curso tem a trava
 * ligada). → 423 Locked. Equipe interna (privileged) não cai aqui.
 */
export class LessonLockedError extends DomainError {
  readonly code = 'LESSON_LOCKED'
  constructor(message = 'Conclua a aula anterior para liberar esta aula') {
    super(message)
  }
}

const CAREER_LOCK_MESSAGES = {
  'foundation-first': 'Conclua e publique o curso-base desta etapa para liberar este curso',
  'tier-reward': 'Este curso é uma recompensa: complete os cursos da etapa para liberar',
  'future-tier': 'Continue sua carreira para liberar este curso',
} as const

/** Curso futuro na carreira, aguardando o curso-base, ou bônus-recompensa da etapa. → 423. */
export class CourseCareerLockedError extends DomainError {
  readonly code = 'COURSE_CAREER_LOCKED'
  constructor(
    readonly reason: keyof typeof CAREER_LOCK_MESSAGES,
    readonly requiredLevel?: string,
  ) {
    super(CAREER_LOCK_MESSAGES[reason])
  }
}

/** Anexo inexistente na aula (rota de download do aluno). → 404. */
export class AttachmentNotFoundError extends DomainError {
  readonly code = 'ATTACHMENT_NOT_FOUND'
  constructor(message = 'Material não encontrado') {
    super(message)
  }
}

/** Bloco e-book inexistente na aula (ou o bloco não é um e-book). → 404. */
export class EbookBlockNotFoundError extends DomainError {
  readonly code = 'EBOOK_BLOCK_NOT_FOUND'
  constructor(message = 'E-book não encontrado') {
    super(message)
  }
}

/** Módulo/bloco/anexo não encontrado (autoria). → 404. */
export class ContentNotFoundError extends DomainError {
  readonly code = 'CONTENT_NOT_FOUND'
  constructor(message = 'Conteúdo não encontrado') {
    super(message)
  }
}

/** Slug em uso (curso global, ou aula dentro do curso). → 409. */
export class DuplicateSlugError extends DomainError {
  readonly code = 'DUPLICATE_SLUG'
  constructor(message = 'Slug já está em uso') {
    super(message)
  }
}

/** O fluxo de clone é exclusivamente entre plataformas distintas. → 409. */
export class CloneSameAudienceError extends DomainError {
  readonly code = 'CLONE_SAME_AUDIENCE'
  constructor(message = 'O curso só pode ser clonado para a outra plataforma') {
    super(message)
  }
}

/** Já existe outro curso no mesmo slot da etapa da carreira. → 409. */
export class CareerSlotConflictError extends DomainError {
  readonly code = 'CAREER_SLOT_CONFLICT'
  constructor(message = 'Já existe um curso nesta posição da carreira') {
    super(message)
  }
}

/** Comando de autoria inválido (ex.: reordenar com ids que não batem). → 400. */
export class InvalidContentCommandError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
}

/** Publicar curso sem nenhuma aula publicada. → 409. */
export class NoPublishedLessonError extends DomainError {
  readonly code = 'NO_PUBLISHED_LESSON'
  constructor(message = 'Publique ao menos uma aula antes de publicar o curso') {
    super(message)
  }
}

/** Edição de curso perdeu a corrida (version mudou no banco). → 409. */
export class CourseConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Curso alterado por outra operação') {
    super(message)
  }
}

/**
 * Curso-base kids (careerSlot=1) publicado SEM aula publicada com bloco de Estúdio de
 * vitrine (`showcase.enabled`) — o aluno nunca qualificaria o slot e a etapa da carreira
 * travaria (armadilha do fail-open, full review 24/07). → 409. Guard SÓ na transição.
 */
export class NoShowcaseBlockError extends DomainError {
  readonly code = 'NO_SHOWCASE_BLOCK'
  constructor(
    message = 'Publique uma aula com bloco de Estúdio com vitrine (Publicar no Mural) antes de publicar o curso-base',
  ) {
    super(message)
  }
}

/** Bloco de quiz inexistente (ou o bloco não é um quiz). → 404. */
export class QuizBlockNotFoundError extends DomainError {
  readonly code = 'QUIZ_BLOCK_NOT_FOUND'
  constructor(message = 'Quiz não encontrado') {
    super(message)
  }
}

/** Retry do quiz dentro do cooldown após reprovar. → 429. */
export class QuizCooldownError extends DomainError {
  readonly code = 'QUIZ_COOLDOWN'
  constructor(readonly retryAvailableAt: Date) {
    super(`Aguarde para refazer o quiz (disponível em ${retryAvailableAt.toISOString()})`)
  }
}

/** Aula tem quiz com nota de corte ainda não aprovado — conclusão bloqueada. → 409. */
export class QuizGateNotPassedError extends DomainError {
  readonly code = 'QUIZ_GATE_NOT_PASSED'
  constructor(message = 'Conclua o quiz da aula com a nota mínima para finalizá-la') {
    super(message)
  }
}

/** Bloco de estúdio inexistente na aula (ou o bloco não é um estúdio). → 404. */
export class StudioBlockNotFoundError extends DomainError {
  readonly code = 'STUDIO_BLOCK_NOT_FOUND'
  constructor(message = 'Atividade do Estúdio não encontrada') {
    super(message)
  }
}

/** Aula tem bloco de estúdio cujo projeto ainda não foi enviado — conclusão bloqueada. → 409. */
export class StudioGateNotSubmittedError extends DomainError {
  readonly code = 'STUDIO_GATE_NOT_SUBMITTED'
  constructor(message = 'Envie o projeto do Estúdio para poder concluir a aula') {
    super(message)
  }
}

/**
 * Bloco de Pinta inexistente na aula (ou o bloco não é um Pinta). → 404.
 *
 * Erro PRÓPRIO, e não o do Estúdio, porque a copy nomeia a ferramenta: a criança lê "atividade
 * do Estúdio não encontrada" numa aula de desenho e não entende do que se trata.
 */
export class PintaBlockNotFoundError extends DomainError {
  readonly code = 'PINTA_BLOCK_NOT_FOUND'
  constructor(message = 'Atividade do Pinta não encontrada') {
    super(message)
  }
}

/** Aula tem bloco de Pinta cujo desenho ainda não foi enviado — conclusão bloqueada. → 409. */
export class PintaGateNotSubmittedError extends DomainError {
  readonly code = 'PINTA_GATE_NOT_SUBMITTED'
  constructor(message = 'Envie o seu desenho para o professor para poder concluir a aula') {
    super(message)
  }
}

/**
 * Dois blocos de Pinta da MESMA cadeia (`chain`), no mesmo curso, com TIPOS de desenho
 * diferentes. → 409, na AUTORIA (nunca na criança).
 *
 * ⚠️⚠️ A armadilha que o Estúdio não tem: um projeto do Estúdio é um projeto, mas aqui o tipo é
 * LOAD-BEARING. Se a aula 1 é `pixel-sprite` 32×32 e a aula 2 da mesma cadeia é
 * `vector-background` 480×360, o desenho carregado pelo carryover não é o que o bloco 2 descreve
 * — e como o carryover VENCE o `initialAsset`, o bloco 2 abriria calado com outra coisa. Recusar
 * ao salvar é o único ponto em que dá para nomear a aula culpada; depois de salvo, o estado
 * quebrado só apareceria para a criança.
 */
export class PintaChainTypeMismatchError extends DomainError {
  readonly code = 'PINTA_CHAIN_TYPE_MISMATCH'
  // Sem `message` default de propósito: a mensagem é o valor do erro (nomeia a aula e o tipo),
  // então quem lança PRECISA montá-la. Herda o construtor do DomainError.
}

/** Aula tem atividade do Estúdio com nota de corte ainda não atingida — conclusão bloqueada. → 409. */
export class StudioGateNotPassedError extends DomainError {
  readonly code = 'STUDIO_GATE_NOT_PASSED'
  constructor(message = 'Atinja a nota mínima da atividade do Estúdio para concluir a aula') {
    super(message)
  }
}

/** Bloco de certificado inexistente na aula (ou o bloco não é um certificado). → 404. */
export class CertificateBlockNotFoundError extends DomainError {
  readonly code = 'CERTIFICATE_BLOCK_NOT_FOUND'
  constructor(message = 'Certificado não encontrado') {
    super(message)
  }
}

/** Emissão de certificado pedida antes de concluir as aulas anteriores ao bloco. → 409. */
export class CertificateNotEligibleError extends DomainError {
  readonly code = 'CERTIFICATE_NOT_ELIGIBLE'
  constructor(message = 'Conclua as aulas anteriores ao certificado para emitir') {
    super(message)
  }
}

/**
 * A aula tem um bloco "em breve" — ainda está sendo montada, então não conclui.
 * Some sozinho quando a autoria tira o bloco. → 409.
 */
export class LessonComingSoonError extends DomainError {
  readonly code = 'LESSON_COMING_SOON'
  constructor(message = 'Esta aula ainda está sendo preparada') {
    super(message)
  }
}

/** Aula de certificado só pode ser concluída pela emissão do certificado. → 409. */
export class CertificateGateNotIssuedError extends DomainError {
  readonly code = 'CERTIFICATE_GATE_NOT_ISSUED'
  constructor(message = 'Emita o certificado para concluir esta aula') {
    super(message)
  }
}

/** Certificado emitido foi revogado pelo admin e não pode mais ser baixado. → 410. */
export class CertificateRevokedError extends DomainError {
  readonly code = 'CERTIFICATE_REVOKED'
  constructor(message = 'Certificado revogado') {
    super(message)
  }
}
