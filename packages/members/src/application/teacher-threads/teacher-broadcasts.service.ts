import { CourseCareerLockedError, CourseNotFoundError } from '../../domain/course/course.errors'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type {
  TeacherAudience,
  TeacherBroadcastRepository,
  TeacherRecipient,
  TeacherRecipientDirectory,
} from '../../domain/ports/teacher-broadcast-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { stableJson } from '../../domain/shared/stable-json'
import type { CheckAccessService } from '../access/check-access.service'

export class TeacherBroadcastsService {
  constructor(
    private readonly repo: TeacherBroadcastRepository,
    private readonly directory: TeacherRecipientDirectory,
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly access: CheckAccessService,
    private readonly now: () => Date,
  ) {}

  async search(q: string, offset = 0) {
    return this.directory.list({ q, offset, limit: 30 })
  }

  async prepare(input: {
    id: string
    authorId: string
    authorName: string
    audience: TeacherAudience
    title: string
    body: string
  }) {
    const title = input.title.trim()
    const body = input.body.trim()
    if (!title || title.length > 160 || !body || body.length > 8000)
      throw new ValidationError('Informe assunto e mensagem válidos.')
    const existing = await this.repo.find(input.id)
    if (existing) {
      if (
        existing.authorId !== input.authorId ||
        existing.body !== body ||
        existing.title !== title ||
        stableJson(existing.audience) !== stableJson(input.audience)
      ) {
        throw new ValidationError('Este envio já possui outro conteúdo. Prepare um novo recado.')
      }
      return existing
    }
    if (input.audience.kind === 'course') {
      const course = await this.courses.findCourseById(input.audience.courseId)
      if (course?.audience !== 'kids' || course.status === 'draft')
        throw new ValidationError('Selecione um curso disponível do Kids.')
    }
    const recipients = new Map<string, TeacherRecipient>()
    for (let offset = 0; ; offset += 200) {
      const page = await this.directory.list({ offset, limit: 200 })
      for (let start = 0; start < page.items.length; start += 20) {
        await Promise.all(
          page.items.slice(start, start + 20).map(async (recipient) => {
            if (
              input.audience.kind === 'student' &&
              input.audience.profileId !== recipient.profileId
            )
              return
            let eligible = false
            if (input.audience.kind === 'course') {
              try {
                await this.access.requireById(
                  recipient.accountId,
                  input.audience.courseId,
                  false,
                  recipient.profileId,
                )
                eligible = true
              } catch (error) {
                if (
                  !(
                    error instanceof AccessDeniedError ||
                    error instanceof CourseCareerLockedError ||
                    error instanceof CourseNotFoundError
                  )
                )
                  throw error
              }
            } else {
              const grants = await this.entitlements.listActiveByUser(
                recipient.accountId,
                this.now(),
              )
              eligible = grants.some((grant) => grant.accessType === 'all_kids_courses')
              if (!eligible) {
                const refs = grants.flatMap((grant) => (grant.courseRef ? [grant.courseRef] : []))
                eligible = (await this.courses.findAccessibleCoursesBySlugs(refs)).some(
                  (course) => course.audience === 'kids',
                )
              }
            }
            if (eligible) recipients.set(recipient.profileId, recipient)
          }),
        )
      }
      if (offset + 200 >= page.total) break
    }
    if (recipients.size === 0)
      throw new ValidationError('Nenhum aluno ativo com acesso a este público.')
    await this.repo.create({ ...input, title, body, createdAt: this.now() }, [
      ...recipients.values(),
    ])
    return this.repo.find(input.id)
  }

  async confirm(id: string, authorId: string) {
    if (!(await this.repo.confirm(id, authorId, this.now())))
      throw new ValidationError(
        'Prévia inexistente, expirada ou de outro professor. Prepare novamente.',
      )
    return this.repo.find(id)
  }

  list() {
    return this.repo.list()
  }
  async detail(id: string, offset = 0) {
    const broadcast = await this.repo.find(id)
    if (!broadcast) throw new ValidationError('Envio não encontrado.')
    return { ...broadcast, items: await this.repo.recipients(id, offset, 50) }
  }
  async retry(id: string) {
    await this.repo.retry(id)
    return this.repo.find(id)
  }
  runCycle() {
    return this.repo.deliverBatch(this.now(), 50)
  }
}
