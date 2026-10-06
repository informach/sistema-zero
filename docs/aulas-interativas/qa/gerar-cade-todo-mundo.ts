/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JARDIM_PARES, jardimSpriteRect } from '../../../packages/studio/src/arte/jardim-assets'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from './cade-todo-mundo-projeto'

import { cadeTodoMundo } from './quizzes-cursos-curtos'

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
      'Dizer que a criança vai construir Cadê Todo Mundo? e apresentar a versão pronta. Demonstração na primeira pessoa com UM achado (Olha aqui: quando eu toco num esconderijo…), sem revelar os outros esconderijos; só no fim passar a vez: jogar até encontrar os três e clicar em Próxima seção. Não explicar controles da plataforma. Pausa, replay, ampliação e reinício ficam no Como Fazer. Regravar a fala. Alvo: 30 a 40 segundos.',
    ),
    dialogue(
      'ponte-a1-jogo',
      'Sua vez! Jogue a versão pronta e encontre os três personagens. Depois, clique em Próxima seção.',
    ),
    {
      key: 'jogo-pronto',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Experimente o jogo pronto',
        instructions: 'Toque nos esconderijos até encontrar os três personagens.',
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
      'Chamar a atenção para o caderno real (Olha aqui: este é o seu Caderno do Aluno!) e dizer que ele reúne os passos de montagem para consultar quando precisar. Oferecer as duas escolhas como convite: ler aqui mesmo, na aula, ou clicar em Baixar para guardar o caderno e consultar onde quiser. Não dizer que não precisa baixar ou imprimir: soa como uma ordem para não fazer. Terminar com Próxima seção. Apontar Baixar sem demonstrar o download; controles do leitor e divisória ficam no Como Fazer. Anexar o PDF antes de gravar. Regravar a fala. Alvo: 20 a 30 segundos.',
    ),
    dialogue(
      'ponte-a1-caderno',
      'Este é o seu caderno! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima seção.',
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
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: tocar no arbusto (nada acontece, porque o jogo ainda não sabe o que fazer com o toque), dizer que toda ação tem uma reação, como cócegas e risada, dizer que no jogo a gente precisa ligar uma reação a essa ação, clicar em Ligar a reação ao toque e tocar de novo (o arbusto some e o coelho aparece). Meme na comparação: na frase das cócegas, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy morrendo de rir com uma pena fazendo cócegas e a legenda "ação: cócega · reação: risada"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar com Agora é a sua vez e Próxima seção. Sem palpite nem pergunta final. Regravar a fala. Alvo: 50 a 70 segundos.',
    ),
    dialogue(
      'ponte-a1-toque',
      'Sua vez! Faça os dois testes no mesmo arbusto e repare no que muda.',
    ),
    {
      key: 'experiencia-toque',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'O toque faz o jogo responder',
        instructions:
          'Toque no arbusto. Depois clique em Ligar a reação ao toque e toque no arbusto de novo. Compare as duas vezes.',
        hints: [],
        activity: { type: 'experimentation', scene: 'touch-response', cenario: 'jardim' },
      },
    },
    video(
      'video-a1-programar',
      'Faça o primeiro personagem aparecer',
      'Começar pela retomada animada da experiência, antes de qualquer bloco: "Na experiência da seção anterior, o arbusto só desapareceu depois que você ligou a reação ao toque. Agora vamos programar isso no seu jogo!" Depois tocar num esconderijo do próprio jogo e ver que nada acontece, porque o toque ainda não tem uma reação. Então pedir que a criança faça essa ligação. Primeiro o destino: trazer à vista a área Quando acontecer (arrastando um espaço vazio entre os blocos se ela estiver fora da tela), mostrar o evento preparado e o significado de escolhido, e deixar à vista o espaço ao lado de fazer antes de abrir a paleta. Só então ensinar Jogo 2D > Sprites > Aparência, o bloco de visibilidade, o encaixe nesse espaço, escolhido e a troca de 50 para 0. Testar dois esconderijos com a prévia automática e conferir campos e encaixe se não funcionar. Clicar em Verificar esta etapa; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo da etapa cumprido!, esperar Salvo, usar Enviar para o professor, confirmar em Enviar e terminar em Concluir aula. Sem tour de abas, olhinho, divisória ou expansão. Regravar a fala. Alvo: 3 a 4 minutos, incluindo gestos.',
    ),
    dialogue(
      'ponte-a1-programar',
      'Agora monte a regra do toque no seu jogo! Teste nos esconderijos e clique em Verificar esta etapa antes de enviar para o professor.',
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
      ['video-a1-caderno', 'ponte-a1-caderno', 'caderno'],
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
    dialogue(
      'ponte-a2-retomada',
      'Seus personagens já aparecem, mas Achados ainda fica em zero. Vamos fazer o jogo contar! Clique em Próxima seção para começar.',
    ),
    video(
      'video-a2-variavel',
      'Um número que acompanha a busca',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: Achados é uma variável, um lugar onde o jogo guarda um número que pode mudar. A comparação chega ao jogo: no placar de um jogo de futebol, a cada gol o placar soma um; no nosso jogo, cada personagem encontrado é como um gol, e o jogo soma um em Achados. Meme na comparação: na frase do placar, mostrar por 2 a 3 segundos o meme ilustrado nosso, um placar de futebol virando de 0 para 1 com o coelho comemorando e a legenda "+1"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Mostrar dois achados, o espaço vazio que não soma e Recomeçar a busca voltando a zero, nomeando cada resultado. Terminar com Agora é a sua vez e Próxima seção. Sem palpite nem pergunta final. Regravar a fala. Alvo: 65 a 85 segundos.',
    ),
    dialogue('ponte-a2-variavel', 'Sua vez! Procure no jardim e fique de olho no número Achados.'),
    {
      key: 'experiencia-achados',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'Quantos já encontramos?',
        instructions:
          'Toque em um esconderijo e olhe Achados. Toque em outro. Depois toque num espaço vazio do jardim. Por último, clique em Recomeçar a busca.',
        hints: [],
        activity: { type: 'experimentation', scene: 'found-counter', cenario: 'jardim' },
      },
    },
    video(
      'video-a2-contagem',
      'Cada descoberta conta',
      'Começar pela retomada animada da experiência, antes de qualquer bloco: "Na experiência da seção anterior, cada personagem encontrado somava um em Achados. Agora vamos programar essa contagem no seu jogo!" Depois tocar num esconderijo do próprio jogo; o personagem aparece, mas Achados continua em zero, porque o jogo ainda não conta. Então pedir que cada personagem encontrado some um em Achados. Primeiro o destino: trazer à vista o evento Quando clicar/tocar num sprite do grupo esconderijos (arrastando um espaço vazio entre os blocos se for preciso) e deixar à vista o bloco de visibilidade que já está dentro dele antes de abrir a paleta. Só então ensinar Programação > Variáveis, Somar 1 em variável, o encaixe logo abaixo da visibilidade e a escolha de achados. Testar 1, 2, 3, a vitória já preparada e a contagem sem repetição; dar correção curta. Clicar em Verificar esta etapa; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo da etapa cumprido!, esperar Salvo, usar Enviar para o professor, confirmar em Enviar e seguir em Próxima seção. A verificação depende desse clique; o envio não a executa automaticamente. Não ensinar o layout da prévia nem compartilhamento. Regravar a fala. Alvo: 3 a 4 minutos, incluindo gestos.',
    ),
    dialogue(
      'ponte-a2-contagem',
      'Agora faça o seu jogo contar os achados! Teste os três esconderijos e clique em Verificar esta etapa antes de enviar para o professor.',
    ),
    studio(montarProjetoCadeTodoMundo(true), true),
    // Personalização antes de publicar (05/10/2026): todos os bichos e esconderijos têm a mesma
    // caixa, então trocar a imagem de um sprite não muda tamanho nem lugar. O campo da imagem
    // mostra o NOME (FieldAssetPicker) e, ao trocar, ajusta largura e altura à imagem nova
    // mantendo o canto de cima (applySuggestedSize): por isso a correção do outro tipo de imagem.
    video(
      'video-a2-personalizar',
      'Deixe o jogo com a sua cara',
      'Mexa e veja numa seção própria, com mudanças que ficam no jogo. Com o destino à vista, mostrar a área Ao iniciar e os blocos Criar sprite. No bloco não há desenho para clicar: no fim de um bloco que cria um bicho, depois de com imagem, clicar no nome da imagem (coelho) para abrir a lista com as imagens do jogo e escolher outro bicho (gato); dizer que, se não achar, é só rolar a lista. Fazer o mesmo num bloco que cria um esconderijo: clicar em arbusto e escolher toco. Dizer que todos os bichos têm o mesmo tamanho, e todos os esconderijos também, então ninguém sai do lugar. Depois, em Enquanto estiver rodando, trocar o texto do bloco Escrever dentro do Se por uma frase curta. Antes do teste, dar a correção do erro provável: se algum bicho aparecer antes do toque, ou um desenho ficar grande demais, clicar de novo no nome da imagem e escolher um desenho do mesmo tipo (bicho no bloco do bicho, esconderijo no bloco do esconderijo). Testar encontrando todo mundo de novo; se a frase passar da tela, deixar mais curta. Terminar em Próxima seção. As escolhas não viram critério. Regravar a fala. Alvo: 2 a 3 minutos, incluindo gestos e teste.',
    ),
    dialogue(
      'ponte-a2-personalizar',
      'Hora de deixar o jogo com a sua cara! Troque bichos e esconderijos clicando no nome da imagem, no fim de cada bloco Criar sprite, e escreva a sua mensagem do final. Depois encontre todo mundo de novo e clique em Próxima seção.',
    ),
    video(
      'video-a2-fecho',
      'Publique seu jogo',
      'Pedir que a criança publique o jogo para a família e os amigos jogarem. No mesmo Estúdio da prática, após o envio ao professor, abrir Compartilhar e dizer que o resumo do projeto já vem preenchido e pode ficar como está; na aula a janela não mostra o campo Título, então a fala não o cita. Clicar em Gerar capa e conferir a imagem. Clicar em Publicar e comemorar com a criança na tela do Zappy (Seu jogo está no Mural!): agora a família e os amigos podem jogar. Clicar em Copiar link de jogar e convidar a mandar o link para a família e os amigos, com ajuda de um adulto se precisar. Clicar em Fechar e terminar em Concluir aula. Não antecipar certificado ou próxima aula, nem apresentar compartilhar como opcional. A publicação não vira bloqueio técnico de conclusão. A ajuda escrita apresenta o Como fazer e abre o tutorial direto, sem exigir leitura. Outra capa e upload ficam na biblioteca. Sem venda. Regravar a fala. Alvo: 60 a 80 segundos, incluindo publicação, comemoração e cópia do link.',
    ),
    dialogue(
      'ponte-a2-publicar',
      'Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e seus amigos. Depois clique em Fechar e em Concluir aula.',
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
      'Ver que o jogo já revela os personagens, mas ainda não conta os achados.',
      ['video-a2-retomada', 'ponte-a2-retomada'],
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
        // A entrega conserva a regra da Aula 1, como no Farol: sem ela, contaria o mesmo personagem.
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
      'personalizar',
      'Deixe o jogo com a sua cara',
      // Mexa e veja numa seção própria (05/10/2026). Fechamento: depois da entrega, só seções de
      // fechamento (o projeto já foi enviado).
      'closing',
      'Trocar bichos, esconderijos e a mensagem do final do próprio jogo e testar.',
      ['video-a2-personalizar', 'ponte-a2-personalizar'],
      ['video-a2-personalizar'],
      'projeto',
    ),
    section(
      'conclusao',
      'Publique seu jogo',
      'closing',
      'Publicar o jogo com o resumo pronto e a capa gerada; fechar a confirmação e concluir a aula.',
      ['video-a2-fecho', 'ponte-a2-publicar', 'ajuda-a2-publicar'],
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
    dialogue('fala-revisao-final', cadeTodoMundo.intro),
    { key: 'quiz-revisao-final', content: cadeTodoMundo.content },
    video(
      'video-certificado',
      'Comemore sua criação',
      'Reconhecer o que veio pronto e as duas regras que a criança programou, e comemorar antes do encaminhamento. Pedir Pegar meu certificado e, após o download, terminar em Concluir aula, sem acrescentar falas depois da ação de saída. Sem tour do PDF ou de pastas; a ajuda fica no Como Fazer. Sem oferta comercial. Regravar a fala. Alvo: 15 a 25 segundos.',
    ),
    dialogue(
      'ponte-certificado',
      'Parabéns, você terminou o seu jogo! Clique em Pegar meu certificado para guardar essa conquista. Quando o certificado baixar, clique em Concluir aula.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        introLine: 'Certificamos que',
        coursePhrase: 'concluiu Cadê Todo Mundo?',
        bodyText: 'Programou o toque que revela os personagens e a contagem dos achados.',
      },
    },
  ],
  sections: [
    section(
      'revisao-final',
      cadeTodoMundo.title,
      'explanation',
      'Conferir as regras do próprio jogo e corrigir dúvidas antes do certificado.',
      ['fala-revisao-final', 'quiz-revisao-final'],
      ['quiz-revisao-final'],
    ),
    section(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Assistir à mensagem final e emitir o certificado do curso.',
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
