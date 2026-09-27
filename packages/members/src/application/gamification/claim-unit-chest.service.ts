import { ContentNotFoundError } from '../../domain/course/course.errors'
import { UnitNotCompletedError } from '../../domain/gamification/gamification.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { GamificationDeltaView } from '../mappers/views'
import type { AwardGamificationService } from './award-gamification.service'

/**
 * Abre o BAÚ de fim de unidade e paga o prêmio (XP + moedas).
 *
 * Até 09/2026 esse XP caía sozinho na conta ao concluir a última aula do módulo, e
 * o baú da trilha era só um desenho. Agora a criança clica, ele abre e AÍ ela ganha
 * — que é o pedido, e de quebra torna verdade a copy das missões, que já dizia
 * "Abra 1 baú de unidade" para uma coisa que ninguém abria.
 *
 * REVALIDA no servidor: o cliente nunca decide se a unidade fechou. A idempotência
 * é a do ledger (`xp_events` tem índice único por usuário+tipo+origem), então
 * clicar de novo, ou em outra aba, devolve `xpAwarded: 0` sem pagar duas vezes.
 */
export class ClaimUnitChestService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly gamification: AwardGamificationService,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    courseSlug: string,
    moduleId: string,
    privileged = false,
  ): Promise<GamificationDeltaView | null> {
    // Acesso pela CONTA (sessão de perfil); XP e moeda pelo userId (o perfil).
    const { course } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    // O módulo precisa ser DESTE curso: sem isto, um id de outro curso passaria pelo
    // portão de acesso deste e pagaria um baú que a criança não tem.
    const outline = await this.courses.findOutline(course.id, { publishedOnly: true })
    const unidade = outline.find((m) => m.id === moduleId)
    if (!unidade) throw new ContentNotFoundError('Unidade não encontrada neste curso')

    const lessonIds = unidade.lessons.map((l) => l.id)
    const completed = new Set(await this.progress.listCompletedLessonIds(userId, course.id))
    // Módulo sem aula publicada NUNCA paga: um baú impossível não pode virar prêmio
    // grátis só porque a autora ainda não montou a unidade.
    if (lessonIds.length === 0 || !lessonIds.every((id) => completed.has(id)))
      throw new UnitNotCompletedError()

    return this.gamification.awardUnitChest({
      userId,
      accountId: accountId ?? userId,
      moduleId,
      audience: course.audience,
      privileged,
    })
  }
}
