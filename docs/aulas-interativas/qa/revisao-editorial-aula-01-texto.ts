import type { LearningManifest } from '../../../packages/core/src/learning'
import type { readOriginal } from './corre-dino-editorial'
import { lessonOneCuts } from './revisao-editorial-aula-01'

export function lessonOneMarkdown(
  manifest: LearningManifest,
  source: ReturnType<typeof readOriginal>,
) {
  const lines = [
    '# Aula 1 — Prepare o mundo e crie o Dino',
    '',
    'O jogo pronto aparece só como apresentação. O resultado desta aula é um palco com descrição e um Dino criado, ainda invisível. O desenho entra na aula 2.',
    '',
    '## Decisões didáticas',
    '',
    '- A primeira montagem exige apenas a área Ao iniciar vazia. A criança recebe uma confirmação cedo, sem precisar terminar toda a preparação.',
    '- Tela e borda ficam juntas: o vídeo original já mostra a borda revelando o palco. Uma segunda demonstração repetiria a explicação.',
    '- A leitura da descrição vem antes da escrita, para a criança entender quem usa a informação. É um leitor de tela real na captura; não afirmar que o bloco ativa voz sozinho.',
    '- Coordenadas vêm antes de preencher x e y. A demonstração move um marcador por eixo e termina em x 110/y 150. Sem arraste nem escolhas nessa seção.',
    '- Criar versus desenhar é experimentado depois da criação no projeto: a tela vazia produz a pergunta. O laboratório responde sem adiantar a montagem do desenho da aula 2.',
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
        lines.push(
          `**Reaproveitamento:** ${clip.sourceSection}.`,
          '',
          `**Montagem / imagem:** ${clip.edit}`,
          '',
          `**Fala original selecionada, antes dos cortes acima:** ${spoken.slice(start, end + clip.exit.length)}`,
          '',
        )
      }
      if (block && 'content' in block && block.content.kind === 'dialogue')
        lines.push(`**Orientação ao aluno:** “${block.content.text}”`, '')
      if (block && 'content' in block && block.content.kind === 'interactive')
        lines.push(
          '**Experimento separado do projeto:** crie o Dino nos bastidores, observe-o sem desenho e conecte o desenho à tela. Conclusão: o mesmo Dino existe antes de aparecer. Ajuda conduz ao mesmo objetivo; depois, continuar ou rever.',
          '',
        )
    }
    if (section.completion?.projectChecks?.length)
      lines.push(
        '**Critérios da construção:**',
        '',
        ...section.completion.projectChecks.map((check) => `- ${check.label}`),
        '',
        'Se faltar algo, mostrar o objetivo pendente, permitir rever o gesto e conferir de novo no mesmo Estúdio. O vídeo de montagem não precisa ser assistido até o fim para comprovar um projeto já correto.',
        '',
      )
    else if (section.intent !== 'exploration')
      lines.push(
        '**Aluno:** pode pausar e rever. Vídeos isolados concluem com 90% assistido; o quiz exige respostas corrigidas. Nenhuma demonstração oferece alterar parâmetros.',
        '',
      )
  }
  lines.push(
    '## Conferência do professor e da produção',
    '',
    'Conferir o retângulo 480 × 270, contraste da borda, descrição e Dino criado em x 110/y 150/tamanho 64. O Dino invisível é esperado. Não acrescentar Desenhar o sprite nesta aula.',
    '',
    'Produzir o complemento com leitor de tela real, legendas e descrição visível; produzir o marcador de coordenadas. Os demais trechos são recortes do vídeo existente, com as correções indicadas. Não há timecodes porque os arquivos gravados não foram fornecidos.',
    '',
    'A descrição do palco não torna sozinha o jogo inteiro acessível e não liga o leitor de tela. Ela fornece informação ao recurso que a pessoa utiliza. [Referência: nomes e descrições acessíveis, W3C](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).',
    '',
    `Fonte: ${source.file}; SHA-256 ${source.hash}. [Mapa de cortes](montagem.json).`,
    '',
  )
  return lines.join('\n')
}
