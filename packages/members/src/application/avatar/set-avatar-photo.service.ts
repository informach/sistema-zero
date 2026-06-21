import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'

/**
 * Define a URL do snapshot (a "foto" do avatar 3D), mostrada em todo o app kids. O BFF
 * (member-shell) sobe o PNG capturado do canvas p/ o R2 e chama esta rota com a URL
 * pública. A validação de formato (http(s)) é na borda (DTO); aqui só persiste (upsert —
 * a criança pode salvar a foto antes de equipar peças). Cosmético puro.
 */
export class SetAvatarPhotoService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    photoUrl: string,
  ): Promise<{ photoUrl: string }> {
    await this.avatar.setPhotoUrl(userId, accountId, audience, photoUrl, this.clock())
    return { photoUrl }
  }
}
