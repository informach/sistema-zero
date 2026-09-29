/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JARDIM_PARES, jardimSpriteRect } from '../../../packages/studio/src/arte/jardim-assets'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from './cade-todo-mundo-projeto'

const DIR = resolve(import.meta.dir, '../aulas')
const CURSO = 'cade-todo-mundo'
const video = (key: string, title: string, direction: string) => ({
  key,
  plannedVideo: `Título: ${title}\n\n${direction}\n\nRoteiro falado completo: ${CURSO}-${key.includes('cert') ? 'certificado' : key.includes('a2') ? 'aula-2' : 'aula-1'}.roteiro.md. Gravar no Estúdio atual, sem Pinta ou Estúdio completo.`,
})
const dialogue = (key: string, text: string) => ({
  key,
  content: { kind: 'dialogue', pose: 'speaking', text },
})
const section = (
  key: string,
  title: string,
  intent: string,
  objective: string,
  blockKeys: string[],
  requiredBlocks: string[],
  workspaceKey: string | null = null,
  projectChecks?: unknown[],
) => ({
  key,
  title,
  intent,
  objective,
  blockKeys,
  workspaceKey,
  externalTool: null,
  pendingMedia: [],
  completion: {
    version: 1,
    blockIds: requiredBlocks,
    ...(projectChecks ? { projectChecks } : {}),
  },
})
const { blocks: allowed } = JSON.parse(
  readFileSync(resolve(import.meta.dir, '../blocos-cade-todo-mundo.json'), 'utf8'),
) as { blocks: string[] }
const studio = (
  initialProject: ReturnType<typeof montarProjetoCadeTodoMundo>,
  publishOnMural = false,
) => ({
  key: 'projeto',
  content: {
    kind: 'studio',
    purpose: 'submission',
    chain: CURSO,
    level: 'iniciante-2d',
    allowedModes: ['blocks'],
    allowLevelReveal: false,
    allowBlocks: allowed,
    ...(publishOnMural
      ? {
          showcase: {
            enabled: true,
            title: 'Cadê Todo Mundo?',
            summary: 'Um jogo de encontrar personagens escondidos no jardim.',
          },
        }
      : {}),
    initialProject,
  },
})

const aula1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-1',
  title: 'O primeiro achado',
  blocks: [
    video(
      'video-a1-abertura',
      'Vamos procurar!',
      'Dizer que a criança vai construir Cadê Todo Mundo? e pedir que jogue a versão pronta desta seção. Apontar a área jogável, pedir que toque nos esconderijos até encontrar os três personagens e termine em Próxima seção. Não revelar os esconderijos nem explicar controles da plataforma. Pausa, replay, ampliação e reinício ficam no Como Fazer. Regravar a fala. Alvo: 25 a 35 segundos.',
    ),
    dialogue(
      'ponte-a1-jogo',
      'Jogue a versão pronta. Encontre os três personagens e clique em Próxima seção.',
    ),
    {
      key: 'jogo-pronto',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Experimente o jogo pronto',
        instructions: 'Tem três personagens escondidos no jardim. Procure todos eles!',
        hints: [],
        activity: {
          type: 'project-play',
          project: montarProjetoCadeTodoMundoCompleto(),
          stage: { width: 640, height: 360 },
          targets: JARDIM_PARES.map(({ esconderijo, centroX }) => {
            const { x, y, w, h } = jardimSpriteRect(esconderijo, centroX)
            return {
              id: esconderijo,
              label: esconderijo === 'arbusto' ? 'no arbusto' : `nas ${esconderijo}`,
              x,
              y,
              width: w,
              height: h,
            }
          }),
        },
      },
    },
    video(
      'video-a1-caderno',
      'Seu Caderno do Aluno',
      'Mostrar o caderno real e dizer que ele reúne os passos de montagem para consultar quando precisar. Leitura, download e impressão são opcionais. Terminar com Próxima seção. Não ensinar controles do leitor, download ou divisória; esses tutoriais ficam no Como Fazer. Anexar o PDF antes de gravar. Regravar a fala. Alvo: 20 a 30 segundos.',
    ),
    {
      key: 'caderno',
      content: {
        kind: 'materials',
        title: 'Caderno do Aluno: Cadê Todo Mundo?',
        bookPreview: true,
        items: [],
      },
    },
    video(
      'video-a1-toque',
      'Um toque pode chamar uma ação',
      'Apresentar a experiência com o jardim do jogo e apontar para ela ao dizer aqui. Em seguida, pedir: tocar no arbusto, clicar em Ligar a reação ao toque, tocar novamente e comparar. Explicar toque e reação em uma frase ligada ao jogo. Apontar os alvos sem executar os testes ou antecipar o resultado. Terminar em Próxima seção após os dois testes. Não fazer tour de interface nem analogia da campainha. Regravar a fala. Alvo: 30 a 40 segundos.',
    ),
    dialogue('ponte-a1-toque', 'Teste o mesmo toque com a reação desligada e ligada.'),
    {
      key: 'experiencia-toque',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'O toque faz o jogo responder',
        instructions: 'O que muda quando você toca no arbusto com a reação desligada e ligada?',
        hints: [],
        activity: { type: 'experimentation', scene: 'touch-response', cenario: 'jardim' },
      },
    },
    video(
      'video-a1-programar',
      'Faça o primeiro personagem aparecer',
      'Começar pedindo que a criança faça um personagem aparecer ao tocar num esconderijo. Mostrar Quando acontecer, o evento preparado e o significado de escolhido. Ensinar Jogo 2D > Sprites > Aparência, o bloco de visibilidade, o encaixe dentro do evento, escolhido e a troca de 50 para 0. Testar dois esconderijos com a prévia automática e conferir campos e encaixe se não funcionar. Clicar em Verificar esta etapa; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo da etapa cumprido!, esperar Salvo, usar Enviar para o professor, confirmar em Enviar e terminar em Concluir aula. Sem tour de abas, olhinho, divisória ou expansão. Regravar a fala. Alvo: 3 a 4 minutos, incluindo gestos.',
    ),
    dialogue(
      'ponte-a1-programar',
      'Monte a regra do toque, teste nos esconderijos e clique em Verificar esta etapa antes de enviar seu jogo para o professor.',
    ),
    studio(montarProjetoCadeTodoMundo()),
  ],
  sections: [
    section(
      'apresentacao',
      'Bem-vindo ao jardim',
      'presentation',
      'Jogar a versão pronta e encontrar os três personagens antes de construir o próprio jogo.',
      ['video-a1-abertura', 'ponte-a1-jogo', 'jogo-pronto'],
      ['video-a1-abertura', 'jogo-pronto'],
    ),
    section(
      'seu-caderno-do-aluno',
      'Seu Caderno do Aluno',
      'material',
      'Conhecer o caderno e saber onde consultá-lo durante a construção do jogo.',
      ['video-a1-caderno', 'caderno'],
      ['video-a1-caderno'],
    ),
    section(
      'toque-e-resposta',
      'O que um toque faz?',
      'exploration',
      'Comparar o mesmo toque antes e depois de ligar uma ação, sem palpite obrigatório.',
      ['video-a1-toque', 'ponte-a1-toque', 'experiencia-toque'],
      ['video-a1-toque', 'experiencia-toque'],
    ),
    section(
      'primeiro-achado',
      'Faça alguém aparecer',
      'delivery',
      'Encaixar a reação no evento preparado e tocar num esconderijo do próprio jogo.',
      ['video-a1-programar', 'ponte-a1-programar', 'projeto'],
      ['video-a1-programar', 'projeto'],
      'projeto',
      [
        {
          id: 'revelar-ao-toque',
          label: 'Revele o personagem tocado deixando o esconderijo escolhido invisível.',
          rule: {
            type: 'usesBlock',
            blockType: 'sz_g2d_set_opacity',
            area: 'events',
            withinBlock: 'sz_g2d_on_group_click',
            fields: { SPRITE: 'escolhido' },
            inputs: { PERCENT: 0 },
          },
        },
      ],
    ),
  ],
}

const aula2 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-2',
  retireBlockKeys: ['caderno'],
  title: 'Complete a busca',
  blocks: [
    video(
      'video-a2-retomada',
      'Quem você já encontrou?',
      'Começar pela tarefa de fazer o jogo contar os personagens. Mostrar um toque revelando o personagem enquanto Achados fica em zero. Terminar em Próxima seção. Esta seção só tem vídeo; não pedir manipulação de um Estúdio que ainda não aparece. Regravar a fala. Alvo: 15 a 25 segundos.',
    ),
    video(
      'video-a2-variavel',
      'Um número que acompanha a busca',
      'Apresentar a experiência com o jardim do jogo e apontar para ela ao dizer aqui. Pedir que a criança procure os personagens e acompanhe Achados. Explicar variável em uma frase: onde o jogo guarda um valor que pode mudar. Orientar os quatro testes: um esconderijo, outro esconderijo, um espaço vazio e Recomeçar a busca. Apontar sem realizar os testes nem antecipar os resultados. Terminar em Próxima seção. Sem analogia das marquinhas ou tour. Regravar a fala. Alvo: 40 a 55 segundos.',
    ),
    dialogue('ponte-a2-variavel', 'Procure no jardim e acompanhe o número Achados.'),
    {
      key: 'experiencia-achados',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'Quantos já encontramos?',
        instructions:
          'O que acontece com Achados quando você encontra alguém, procura sem achar e começa outra busca?',
        hints: [],
        activity: { type: 'experimentation', scene: 'found-counter', cenario: 'jardim' },
      },
    },
    video(
      'video-a2-contagem',
      'Cada descoberta conta',
      'Começar pedindo que cada personagem encontrado some um em Achados. Ensinar Programação > Variáveis, Somar 1 em variável, o encaixe dentro do evento abaixo da visibilidade e a escolha de achados. Testar 1, 2, 3, a vitória já preparada e a contagem sem repetição; dar correção curta. Clicar em Verificar esta etapa; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo da etapa cumprido!, esperar Salvo, usar Enviar para o professor, confirmar em Enviar e seguir em Próxima seção. A verificação depende desse clique; o envio não a executa automaticamente. Não ensinar o layout da prévia nem compartilhamento. Regravar a fala. Alvo: 3 a 4 minutos, incluindo gestos.',
    ),
    dialogue(
      'ponte-a2-contagem',
      'Faça o jogo contar os achados. Teste os três esconderijos e clique em Verificar esta etapa antes de enviar para o professor.',
    ),
    studio(montarProjetoCadeTodoMundo(true), true),
    video(
      'video-a2-fecho',
      'Publique seu jogo',
      'Pedir que a criança publique o jogo para outras pessoas jogarem. No mesmo Estúdio da prática, após o envio ao professor, abrir Compartilhar, manter título e resumo preenchidos, clicar em Gerar capa e conferir a imagem. Clicar em Publicar e esperar Seu jogo está no Mural! Clicar em Fechar e terminar em Concluir aula. Não antecipar certificado ou próxima aula, nem apresentar compartilhar como opcional. A publicação não vira bloqueio técnico de conclusão. A ajuda escrita apresenta o Como fazer e abre o tutorial direto, sem exigir leitura. Personalização, upload e cópia do link ficam na biblioteca. Sem venda. Regravar a fala. Alvo: 45 a 60 segundos, incluindo publicação e confirmação.',
    ),
    {
      key: 'ajuda-a2-publicar',
      content: {
        kind: 'rich_text',
        markdown:
          'Quer rever como publicar? Abra [o passo a passo do Como fazer](/como-fazer/plataforma-publicar-no-mural), nossa área de ajuda.',
      },
    },
  ],
  sections: [
    section(
      'retomada',
      'Volte ao seu jardim',
      'presentation',
      'Retomar o projeto salvo e perceber que revelar não está contando os achados ainda.',
      ['video-a2-retomada'],
      ['video-a2-retomada'],
    ),
    section(
      'variavel-achados',
      'Um número que acompanha a busca',
      'exploration',
      'Observar quando o valor atual de Achados muda e quando continua igual durante uma busca.',
      ['video-a2-variavel', 'ponte-a2-variavel', 'experiencia-achados'],
      ['video-a2-variavel', 'experiencia-achados'],
    ),
    section(
      'contar-achados',
      'Cada personagem vale um achado',
      'delivery',
      'Somar um no contador no mesmo evento do toque e testar até a mensagem de vitória.',
      ['video-a2-contagem', 'ponte-a2-contagem', 'projeto'],
      ['video-a2-contagem', 'projeto'],
      'projeto',
      [
        {
          id: 'somar-achado',
          label: 'Conte um achado depois de revelar o personagem.',
          rule: {
            type: 'usesBlock',
            blockType: 'sz_js_var_increment',
            area: 'events',
            withinBlock: 'sz_g2d_on_group_click',
            fields: { NAME: 'achados', DELTA: 1 },
          },
        },
      ],
    ),
    section(
      'conclusao',
      'Publique seu jogo',
      'closing',
      'Publicar o jogo com título e resumo prontos e capa gerada; fechar a confirmação e concluir a aula.',
      ['video-a2-fecho', 'ajuda-a2-publicar'],
      ['video-a2-fecho'],
      'projeto',
    ),
  ],
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado',
  blocks: [
    video(
      'video-certificado',
      'Você criou seu primeiro jogo!',
      'Reconhecer as duas regras que a criança programou e comemorar antes do encaminhamento. Pedir Pegar meu certificado e, após o download, terminar em Concluir aula, sem acrescentar falas depois da ação de saída. Sem tour do PDF ou de pastas; a ajuda fica no Como Fazer. Sem oferta comercial. Regravar a fala. Alvo: 15 a 25 segundos.',
    ),
    dialogue(
      'ponte-certificado',
      'Clique em Pegar meu certificado. Quando o certificado baixar, clique em Concluir aula.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        introLine: 'Certificamos que',
        coursePhrase: 'concluiu Cadê Todo Mundo?',
        bodyText: 'Criou um jogo de procurar personagens com toque, reação e contagem de achados.',
      },
    },
  ],
  sections: [
    section(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Assistir à mensagem final e emitir o certificado do primeiro jogo criado.',
      ['video-certificado', 'ponte-certificado', 'certificado'],
      ['video-certificado', 'certificado'],
    ),
  ],
}

// O bloco de Estúdio mora fora de blockKeys e entra pela workspaceKey, como nos manifestos v5.
const generatedFiles: string[] = []
for (const [name, manifest] of [
  ['cade-todo-mundo-aula-1', aula1],
  ['cade-todo-mundo-aula-2', aula2],
  ['cade-todo-mundo-certificado', certificado],
] as const) {
  const target = resolve(DIR, `${name}.manifesto.json`)
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
  generatedFiles.push(target)
}

const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...generatedFiles],
  cwd: resolve(import.meta.dir, '../../..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar os manifestos: ${formatted.stderr.toString()}`)
}
