import type { ContentType } from '../publication/publication'

/**
 * Templates de checklist por tipo de conteúdo — CONSTANTES VERSIONADAS em código
 * (decisão de design: equipe única, um workflow conhecido; builder de pipeline em
 * banco é complexidade sem consumidor). Os itens são COPIADOS para a tabela
 * `checklist_items` na criação do conteúdo; a equipe pode adicionar itens manuais.
 * Editar este arquivo NÃO altera conteúdos já criados (snapshot, como migrations).
 */
export const CHECKLIST_TEMPLATES: Record<ContentType, readonly string[]> = {
  reels: [
    'Roteiro fechado (gancho nos 3 primeiros segundos)',
    'Gravação concluída',
    'Edição concluída (cortes, legendas dinâmicas, trilha)',
    'Capa escolhida',
    'Legenda escrita (sem travessão, sem exclamação)',
    'Hashtags definidas',
    'Revisão final em aparelho de celular',
  ],
  video_long: [
    'Roteiro fechado',
    'Gravação concluída',
    'Edição concluída',
    'Thumbnail criada',
    'Título definido (até 100 caracteres)',
    'Descrição + capítulos escritos',
    'Tags definidas',
    'Revisão final do corte',
  ],
  carousel: [
    'Conteúdo dos slides fechado',
    'Artes de todos os slides prontas',
    'Ordem dos slides revisada',
    'Legenda escrita (sem travessão, sem exclamação)',
    'Hashtags definidas',
    'Revisão de acentuação e ortografia',
  ],
  static_post: [
    'Arte pronta',
    'Legenda escrita (sem travessão, sem exclamação)',
    'Hashtags definidas',
    'Revisão de acentuação e ortografia',
  ],
  story: [
    'Sequência dos stories planejada',
    'Artes/vídeos prontos',
    'Interações definidas (enquete, caixa de pergunta, link)',
    'Revisão final em aparelho de celular',
  ],
}
