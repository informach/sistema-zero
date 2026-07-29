import { AvatarInvalidError } from '../../domain/avatar/avatar.errors'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'

/**
 * Define a URL do snapshot (a "foto" do avatar 3D), mostrada em todo o app kids. O BFF
 * (member-shell) sobe o PNG capturado do canvas p/ o R2 e chama esta rota com a URL
 * pública. Formato (http(s)) valida na borda (DTO); AQUI vale a ALLOWLIST de prefixos
 * (full review 24/07): a rota é alcançável por qualquer aluno via gateway e a URL vira
 * `<img>` p/ OUTRAS crianças — URL externa arbitrária seria pixel-rastreador + conteúdo
 * não moderado. Prefixos vazios (dev sem env) = comportamento antigo.
 */
export class SetAvatarPhotoService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly clock: () => Date,
    private readonly allowedPrefixes: readonly string[] = [],
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    photoUrl: string,
  ): Promise<{ photoUrl: string }> {
    if (
      this.allowedPrefixes.length > 0 &&
      !this.allowedPrefixes.some((prefix) => photoUrl.startsWith(prefix))
    ) {
      throw new AvatarInvalidError('A foto do avatar precisa vir do armazenamento da plataforma')
    }
    await this.avatar.setPhotoUrl(userId, accountId, audience, photoUrl, this.clock())
    return { photoUrl }
  }
}
