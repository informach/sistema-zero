import type { LearningManifest } from '../../../packages/core/src/learning'
import { type CenaAnterior, cenaAnteriorMarkdown, cenaMarkdown, eCena } from './cenas-editorial'
import type { readOriginal } from './corre-dino-editorial'
import { studioGuideMarkdown } from './jogo-2d-edicao-atual'
import { lessonOneCuts } from './revisao-editorial-aula-01'

export function lessonOneMarkdown(
  manifest: LearningManifest,
  source: ReturnType<typeof readOriginal>,
  montage: { clips: Array<{ key: string; cenaAnterior?: CenaAnterior }> },
) {
  const lines = [
    '# Aula 1 — Prepare o mundo e crie o Dino',
    '',
    'O jogo pronto aparece só como apresentação. O resultado desta aula é uma tela com borda e um Dino criado, ainda invisível. O desenho entra na aula 2.',
    '',
    '## Decisões didáticas',
    '',
    '- A primeira montagem exige apenas a área Ao iniciar vazia. A criança recebe uma confirmação cedo, sem precisar terminar toda a preparação.',
    '- Primeiro, a criança descobre o limite da tela em uma experiência separada. Só depois o vídeo e o Estúdio mostram como preparar 480 por 270 e colocar a borda no próprio projeto.',
    '- Coordenadas vêm antes de preencher x e y. O clipe abre o assunto e a cena coordinates entrega os controles: mexer só no x, depois só no y, e levar o Dino até 0, 0. A cena abre em x 110 e y 150, os mesmos números do bloco.',
    '- Criar versus desenhar é experimentado depois da criação no projeto: a tela vazia produz a pergunta. Na cena world, criar o Dino e ligar o desenho são dois controles separados, na ordem que a criança quiser. A cena responde sem adiantar a montagem do desenho da aula 2.',
    '- Na trilha guiada, o identificador é dino. A cor pode ser escolhida; padronizar o nome evita erros de seleção nas próximas aulas. O título visível do jogo poderá ser escolhido na aula 8.',
    '',
    '## Percurso e roteiro',
    '',
  ]
  for (const [index, section] of manifest.sections.entries()) {
    lines.push(
      `### ${index + 1}. ${section.title}`,
      '',
      `**Tipo:** ${section.intent}. **Objetivo:** ${section.objective}`,
      '',
    )
    for (const key of section.blockKeys) {
      const clip = lessonOneCuts.clips.find((clip) => clip.key === key)
      const block = manifest.blocks.find((block) => block.key === key)
      if (clip) {
        const part = source.parts.find((part) => part.heading === clip.sourceSection)!
        const spoken = part.narration.replaceAll('**', '').replace(/\s+/g, ' ').trim()
        const start = spoken.indexOf(clip.entry)
        const end = spoken.indexOf(clip.exit, start)
        if (start < 0 || end < 0) throw new Error(`Âncora ausente: ${key}`)
        const marca = montage.clips.find((c) => c.key === key)?.cenaAnterior
        lines.push(
          `**Reaproveitamento:** ${clip.sourceSection}.`,
          '',
          `**Montagem / imagem:** ${clip.edit}`,
          '',
          ...(marca ? [cenaAnteriorMarkdown(marca), ''] : []),
          `**Fala original selecionada, antes dos cortes acima:** ${spoken.slice(start, end + clip.exit.length)}`,
          '',
        )
      }
      if (block && 'content' in block && block.content.kind === 'dialogue')
        lines.push(`**Orientação ao aluno:** “${block.content.text}”`, '')
      if (block && eCena(block))
        lines.push('#### A cena da seção', '', ...cenaMarkdown(block.content))
    }
    if (section.completion?.projectChecks?.length)
      lines.push(
        '**Critérios da construção:**',
        '',
        ...section.completion.projectChecks.map((check) => `- ${check.label}`),
        '',
        section.completion.blockIds.length
          ? 'A seção também pede a cena concluída. Se faltar algo, mostrar o objetivo pendente, permitir rever o gesto e conferir de novo no mesmo Estúdio. O vídeo de montagem não precisa ser assistido até o fim para comprovar um projeto já correto.'
          : 'Se faltar algo, mostrar o objetivo pendente, permitir rever o gesto e conferir de novo no mesmo Estúdio. O vídeo de montagem não precisa ser assistido até o fim para comprovar um projeto já correto.',
        '',
      )
    else if (section.intent !== 'exploration')
      lines.push(
        '**Aluno:** pode pausar e rever. Vídeos isolados concluem com 90% assistido; o quiz exige respostas corrigidas.',
        '',
      )
  }
  lines.push(
    '## Conferência do professor e da produção',
    '',
    'Conferir o retângulo 480 × 270, contraste da borda e Dino criado em x 110/y 150/tamanho 64. O Dino invisível é esperado. Não acrescentar Desenhar o sprite nesta aula.',
    '',
    'O marcador de coordenadas não precisa mais ser produzido: a cena coordinates faz esse papel, com a criança no controle. Os demais trechos são recortes do vídeo existente, com as correções indicadas. Não há timecodes porque os arquivos gravados não foram fornecidos.',
    '',
    `Fonte: ${source.file}; SHA-256 ${source.hash}. [Mapa de cortes](montagem.json).`,
    '',
  )
  return lines.join('\n') + studioGuideMarkdown(manifest)
}
