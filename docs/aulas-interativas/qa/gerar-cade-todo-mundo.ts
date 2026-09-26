/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { montarProjetoCadeTodoMundo } from './cade-todo-mundo-projeto'

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
      'Demonstrar o jogo pronto: revelar os três personagens, mostrar Achados aumentando e a comemoração. Distinguir a missão de hoje, fazer o primeiro personagem aparecer, da busca que será completada depois; cenário e personagens já vêm preparados. Apresentar as seções como pequenas partes da aula, cada uma com um vídeo. Demonstrar pausa, replay e Próxima seção, com ritmo acolhedor. Não mostrar a experiência, o Estúdio, o caderno ou outros controles nesta abertura. Alvo: 1–1,5 minuto.',
    ),
    video(
      'video-a1-caderno',
      'Seu Caderno do Aluno',
      'Na segunda seção, mostrar o PDF real no leitor da seção: capa e página de orientação O que você vai fazer. Não abrir agora as páginas de passos, que antecipariam a descoberta da experiência. Explicar que o Caderno do Aluno reúne todos os passos para construir o jogo e pode ser consultado quando houver dúvida. Mostrar o download abaixo do vídeo e o livro 3D na outra coluna quando houver largura; em tela estreita, o livro fica depois do vídeo. Baixar, ler e imprimir são opcionais. Anexar o PDF uma vez nesta aula antes de gravar. Alvo: 45–60 segundos.',
    ),
    {
      key: 'caderno',
      content: {
        kind: 'materials',
        title: 'Caderno do Aluno — Cadê Todo Mundo?',
        bookPreview: true,
        items: [],
      },
    },
    video(
      'video-a1-toque',
      'Um toque pode chamar uma ação',
      'Ao chegar à terceira seção, mostrar Anterior e assegurar que a criança pode rever sem perder o que fez. Explicar acontecimento e ação com a analogia da campainha e conectar ao jardim. Mostrar que vídeo e atividade ficam na mesma seção, onde está o pedido da atividade, a divisória em tela larga, Ampliar experiência e Voltar à aula. Em tela estreita, mostrar a experiência abaixo do vídeo. Não executar o teste nem revelar o resultado: a criança descobre na atividade. Alvo: 1,5–2 minutos.',
    ),
    dialogue(
      'ponte-a1-toque',
      'Agora é sua vez de descobrir o que faz o esconderijo responder ao toque.',
    ),
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
      'Apresentar o Estúdio dentro da aula como a ferramenta onde blocos viram instruções do jogo; não é preciso abrir outra página. Demonstrar a divisória em tela larga e Expandir/Reduzir ao chegar à prática, sem tour separado. Ensinar onde ver o jogo: no Estúdio estreito, alternar entre as abas Blocos e Pré-visualização; com largura suficiente, mostrar a área do jogo à direita e o olhinho que a exibe ou esconde. Depois mostrar a paleta, a área Quando acontecer já preparada, o bloco Deixar o sprite com 0% de visibilidade e o nome escolhido. Para testar, aguardar a atualização automática da Pré-visualização e tocar num esconderijo, sem exigir Reproduzir ou Atualizar. Repetir cada passo na narração; não presumir familiaridade com blocos. O caderno opcional já foi apresentado na segunda seção e continua disponível para consulta. Alvo: 4–5 minutos.',
    ),
    dialogue(
      'ponte-a1-programar',
      'O jardim já está montado. Agora você vai criar a reação que faz aparecer o primeiro personagem.',
    ),
    studio(montarProjetoCadeTodoMundo()),
  ],
  sections: [
    section(
      'apresentacao',
      'Bem-vindo ao jardim',
      'presentation',
      'Conhecer o jogo e a missão de hoje, aprender a pausar/rever o vídeo e avançar à próxima seção.',
      ['video-a1-abertura'],
      ['video-a1-abertura'],
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
      'Mostrar o jardim com a reação da Aula 1 pronta, vindo do projeto salvo ou da cópia de retomada. Um toque revela um personagem, mas Achados continua em zero. Apresentar a missão de contar as descobertas sem ensinar o bloco ainda. Alvo: 35–45 segundos.',
    ),
    video(
      'video-a2-variavel',
      'Um número que acompanha a busca',
      'Explicar Achados com marquinhas de personagens encontrados numa folha: contador é o número que acompanha a busca, variável é o lugar que guarda um valor atual que pode mudar. Não executar a experiência nem mostrar o bloco de somar; deixar a criança testar descoberta, busca sem achado e recomeço. Alvo: 45–60 segundos.',
    ),
    dialogue('ponte-a2-variavel', 'Agora teste no jardim quando Achados muda e quando fica igual.'),
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
      'Retomar a descoberta da experiência e ensinar a regra no projeto real. No Estúdio incorporado, mostrar Programação > Variáveis, encaixar Somar 1 em variável achados dentro do evento, abaixo da reação, e conferir os campos. Mostrar onde fica a Pré-visualização em larguras estreita e larga, aguardar sua atualização automática e tocar nos três esconderijos, sem mandar iniciar o jogo. A mensagem de vitória já estava preparada. Esperar Salvo, clicar em Enviar para o professor e encerrar a prática aí. Se houver dúvida, lembrar que o Caderno do Aluno com os passos está na seção Seu Caderno do Aluno da Aula 1; não dizer que o PDF aparece nesta aula. Não demonstrar Compartilhar nesta seção. Alvo: 4–5 minutos.',
    ),
    dialogue(
      'ponte-a2-contagem',
      'Você já testou a contagem. Agora ensine o seu jogo a somar cada personagem encontrado.',
    ),
    studio(montarProjetoCadeTodoMundo(true), true),
    video(
      'video-a2-fecho',
      'Sua busca está completa',
      'Começar celebrando o jardim completo, o contador em 3 e as duas regras que a criança acrescentou; reconhecer que cenário, personagens e comemoração já estavam preparados. Com o mesmo Estúdio da seção prática visível ao lado, ensinar o compartilhamento opcional depois do envio: Compartilhar, resumo pronto, Gerar capa, Publicar e Copiar link de jogar. Distinguir entrega da aula e cópia pública; não mandar abrir o Mural nem prometer acesso permanente a ele. Dizer que a criança pode seguir ao certificado sem publicar ou repetir a publicação. Sem venda. Alvo: 80–100 segundos.',
    ),
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
      'Sua busca está completa',
      'closing',
      'Conferir que os três personagens aparecem, o contador chega a três e a vitória aparece.',
      ['video-a2-fecho'],
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
      'Celebrar a autoria da criança: toque, reação e contagem. Mostrar como emitir e guardar o certificado. Sem oferta, pitch, chamada para compra ou convite à criança para vender a um responsável. Alvo: 40–55 segundos.',
    ),
    dialogue(
      'ponte-certificado',
      'Você fez o jogo responder aos seus toques. Seu certificado está pronto!',
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
for (const [name, manifest] of [
  ['cade-todo-mundo-aula-1', aula1],
  ['cade-todo-mundo-aula-2', aula2],
  ['cade-todo-mundo-certificado', certificado],
] as const) {
  writeFileSync(resolve(DIR, `${name}.manifesto.json`), `${JSON.stringify(manifest, null, 2)}\n`)
}
