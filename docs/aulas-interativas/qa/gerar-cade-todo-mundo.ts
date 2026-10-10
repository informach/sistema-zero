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
  plannedVideo: `Título: ${title}\n\n${direction}\n\nRoteiro falado completo: ${CURSO}-${key.includes('cert') ? 'certificado' : key.includes('a2') ? 'aula-2' : 'aula-1'}.roteiro.md. Gravar no Estúdio atual, sem Pinta ou Estúdio completo. Falar como numa conversa contínua com a criança: frases ligadas, o porquê de cada resultado e um chamado para a tela (Olha aqui, Olha só, Repare, Tá vendo?) nos momentos que importam.`,
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
      'Dizer que a criança vai construir Cadê Todo Mundo? e apresentar a versão pronta. Demonstração na primeira pessoa com UM achado (Olha aqui: quando eu toco num esconderijo…), sem revelar os outros esconderijos. Antes de passar a vez, plantar a surpresa do final, sem dizer o que é (Ah, e tem mais uma coisa: no fim da aventura tem uma surpresa esperando por você. Ela vai deixar o seu jogo ainda mais seu.); só no fim passar a vez: jogar até encontrar os três e clicar em Próxima parte. Falar como numa conversa, ligando as frases e dizendo o porquê do que aparece (Achados mudou para 1 porque eu encontrei um personagem). Não explicar controles da plataforma. Pausa, replay, ampliação e reinício ficam no Como Fazer. Produção em 10/10/2026: vídeo-base da professora informado como gravado. Preservar o áudio e conferir as inserções no roteiro; edição e publicação ainda precisam ser conferidas. Debinha faz duas entradas: depois de "porque eu encontrei um personagem.", pergunta "E os outros dois?"; a professora retoma "Esses eu deixo para você descobrir.". Não repetir a pergunta na voz da professora. Depois de "Ela vai deixar o seu jogo ainda mais seu.", Debinha comemora "Uhu!"; a professora passa a vez. Em cada entrada, Debinha aparece, fala e sai antes de a professora continuar, sem sobrepor vozes ou cobrir controles. Zappy só tem voz na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Alvo anterior às inserções; medir a montagem final: 40 a 55 segundos.',
    ),
    dialogue(
      'ponte-a1-jogo',
      'Sua vez! Jogue a versão pronta e encontre os três personagens. Depois, clique em Próxima parte.',
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
      'Seu Mapa da Aventura',
      'Chamar a atenção para o caderno real, que a criança conhece como Mapa da Aventura (Olha aqui: este é o seu Mapa da Aventura!), e dizer que ele reúne os passos de montagem para consultar quando precisar. Oferecer as duas escolhas como convite: ler aqui mesmo ou clicar em Baixar para guardar o mapa e consultar onde quiser. Não dizer que não precisa baixar ou imprimir: soa como uma ordem para não fazer. Terminar com Próxima parte. Apontar Baixar sem demonstrar o download; controles do leitor e divisória ficam no Como Fazer. Conferir o PDF real anexado e visível na captura. Produção em 10/10/2026: vídeo-base da professora informado como gravado. Preservar o áudio e conferir as inserções no roteiro; edição e publicação ainda precisam ser conferidas. Depois de "é só voltar aqui e abrir o mapa.", Debinha diz "Entendi. Sempre que eu tiver dúvida, eu vou olhar no mapa.". A professora retoma "Se quiser, você pode ler aqui mesmo.". A consulta ao mapa continua opcional. Em cada entrada, Debinha aparece, fala e sai antes de a professora continuar, sem sobrepor vozes ou cobrir controles. Zappy só tem voz na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Alvo anterior às inserções; medir a montagem final: 25 a 35 segundos.',
    ),
    dialogue(
      'ponte-a1-caderno',
      'Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
    ),
    {
      key: 'caderno',
      content: {
        kind: 'materials',
        title: 'Mapa da Aventura: Cadê Todo Mundo?',
        bookPreview: true,
        items: [],
      },
    },
    video(
      'video-a1-toque',
      'Um toque pode chamar uma ação',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz, como numa conversa: tocar no arbusto (Tá vendo? Nada acontece, porque o jogo ainda não sabe o que fazer quando alguém toca no arbusto, e a gente precisa dizer isso para ele), dizer que toda ação tem uma reação, como cócegas e risada, e que no jogo o toque é a ação e a reação que a gente quer é o arbusto ficar invisível; para o jogo ter essa reação, a gente precisa ligar a reação ao toque. Clicar em Ligar a reação ao toque e tocar de novo (Olha só: agora sim o arbusto fica invisível e o coelho aparece) e dizer que essa é a reação ligada ao toque. Meme na comparação: na frase das cócegas, mostrar por 2 a 3 segundos o meme ilustrado nosso, o Zappy morrendo de rir com uma pena fazendo cócegas e a legenda "ação: cócega · reação: risada"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Terminar com Agora é a sua vez e Próxima parte. Sem palpite nem pergunta final. Produção em 10/10/2026: vídeo-base da professora informado como gravado. Preservar o áudio e conferir as inserções no roteiro; edição e publicação ainda precisam ser conferidas. Depois de "a gente precisa ligar a reação ao toque.", Debinha pergunta "E como eu faço essa ligação?". Manter a reação desligada durante a pergunta; a professora retoma "Por isso, eu clico em Ligar a reação ao toque e toco no arbusto de novo." e demonstra só depois da saída da Debinha. O meme do Zappy é silencioso. Em cada entrada, Debinha aparece, fala e sai antes de a professora continuar, sem sobrepor vozes ou cobrir controles. Zappy só tem voz na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Alvo anterior às inserções; medir a montagem final: 70 a 90 segundos.',
    ),
    dialogue(
      'ponte-a1-toque',
      'Sua vez! Faça os dois testes no mesmo arbusto e repare no que muda. Quando terminar, clique em Próxima parte.',
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
      'Começar pela retomada, antes de qualquer bloco, nesta ordem: primeiro tocar num esconderijo do próprio jogo e mostrar que nada acontece, porque o toque ainda não tem nenhuma reação ligada a ele; depois lembrar a experiência da parte anterior e convidar a fazer isso com os esconderijos do jogo. Antes de pedir para encontrar Quando acontecer, apresentar os comandos e os bloquinhos com a fala: "Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui aparecem como bloquinhos. Olha aqui: neste menu, chamado paleta de comandos, você escolhe os blocos que vai encaixar para montar as regras do seu jogo." Apontar a paleta no "Olha aqui: neste menu", sem pegar nenhum bloco ainda. Não repetir a explicação de ação e reação nem dizer que o jardim e os personagens estão preparados. Primeiro o destino: trazer à vista a área Quando acontecer (arrastando um espaço vazio entre os blocos se ela estiver fora da tela), mostrar o evento que já está nela (é ele que percebe o toque) e o significado de escolhido, e deixar à vista o espaço ao lado de fazer antes de abrir a paleta. Só então ensinar Jogo 2D > Sprites > Aparência, o bloco de visibilidade, o encaixe nesse espaço, escolhido e a troca de 50 para 0. Testar dois esconderijos com a prévia automática. Depois do teste, iniciar a conferência uma vez com a fala Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: e listar o encaixe, o sprite escolhido e o número 0. Depois de corrigir, testar de novo. Clicar em Verificar esta parte; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo cumprido!, esperar Salvo, usar Enviar meu projeto e confirmar em Enviar. Antes de Concluir fase, reconhecer a conquista depois do envio (Pronto, você já programou a primeira regra do seu jogo!), sem pedir que a criança olhe para o jogo novamente, e lembrar a surpresa uma vez só, sem mostrar nada dela (E lembra da surpresa que eu te contei lá no começo da aventura? Pois é, ela está quase chegando! Na próxima fase, você já vai descobrir o que é.). Terminar em Concluir fase. Sem tour de abas, olhinho, divisória ou expansão. Produção em 10/10/2026: vídeo-base da professora informado como gravado. Preservar o áudio e conferir as inserções no roteiro; edição e publicação ainda precisam ser conferidas. As duas entradas originais de Debinha são: depois de "Agora a gente vai fazer isso com os esconderijos do seu jogo!", pergunta "E como eu faço isso?"; a professora apresenta os comandos e os bloquinhos. Depois de "Depois, toque em outro esconderijo também.", Debinha diz "No meu não deu certo."; a professora mantém "Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim:" e a lista uma vez só. Não fabricar um defeito na demonstração bem-sucedida. Em cada entrada, Debinha aparece, fala e sai antes de a professora continuar, sem sobrepor vozes ou cobrir controles. Zappy só tem voz na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Alvo anterior às inserções; medir a montagem final: 3 a 4 minutos, incluindo gestos. Revisão de ritmo em 10/10/2026: Entrada A1P4-R01: após "Olha aqui: nessa área já tem o bloco Quando clicar ou tocar num sprite do grupo esconderijos, chamá-lo de escolhido. É ele que percebe quando alguém toca num esconderijo. Cada esconderijo é um sprite, que é um objeto do jogo. E escolhido é o nome que o jogo dá ao esconderijo que você tocar.", Debinha diz "Ah! Se eu tocar no arbusto, ele vira o escolhido!". Retomar a professora em "A reação vai ficar dentro desse bloco, no espaço vazio ao lado da palavra fazer. Então deixe esse espaço à vista.". Entrada A1P4-R02: após "Funcionou?", Debinha diz "Agora sim!". Retomar a professora em "Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente.". Preservar integralmente o áudio gravado. Na segunda entrada, a professora pergunta Funcionou? antes de Debinha responder Agora sim!; não repetir a pergunta depois. Mostrar o novo teste bem-sucedido antes da reação. Ver edicao-cade-aula-1-reacoes.md.',
    ),
    dialogue(
      'ponte-a1-programar',
      'Agora monte a regra do toque no seu jogo! Depois, teste nos esconderijos e clique em Verificar esta parte antes de enviar o seu projeto.',
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
      'Seu Mapa da Aventura',
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
      'Começar pela tarefa de fazer o jogo contar os personagens. Mostrar um toque revelando o personagem enquanto Achados fica em zero. Terminar em Próxima parte. Esta seção só tem vídeo; não pedir manipulação de um Estúdio que ainda não aparece. Produção em 10/10/2026: participação de Dedé aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada A2P1-D01: depois de "ele fica invisível e o personagem aparece.", Dedé pergunta "Ué, por que o número ficou no zero?". A professora retoma "É que o jogo ainda não conta quem você encontra." e mantém o convite para começar. A pergunta substitui a observação sobre o zero na voz da professora, sem repetir a explicação. Dedé entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 25 a 35 segundos.',
    ),
    dialogue(
      'ponte-a2-retomada',
      'Seus personagens já aparecem, mas Achados ainda fica em zero. Então vamos ensinar o jogo a contar: clique em Próxima parte para começar.',
    ),
    video(
      'video-a2-variavel',
      'Um número que acompanha a busca',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: Achados é uma variável, um lugar onde o jogo guarda um número que pode mudar. A comparação chega ao jogo: no placar de um jogo de futebol, a cada gol o placar soma um; aqui no jardim é parecido: cada personagem encontrado é como um gol, e o jogo soma um em Achados. Meme na comparação: na frase do placar, mostrar por 2 a 3 segundos o meme ilustrado nosso, um placar de futebol virando de 0 para 1 com o coelho comemorando e a legenda "+1"; desenho nosso, com o Zappy ou os personagens do jogo, sem foto de pessoa real nem meme da internet, sem cobrir a experiência, e a narração explica sozinha. Mostrar dois achados, o espaço vazio que não soma e Recomeçar a busca voltando a zero, nomeando cada resultado. Terminar com Agora é a sua vez e Próxima parte. Sem palpite nem pergunta final. Produção em 10/10/2026: participação de Dedé aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada A2P2-D01: depois de "ele soma de novo, e agora é 2.", Dedé pergunta "E se eu tocar num espaço vazio do jardim?". Essa pergunta passa para ele e sai da voz da professora. Ela retoma "Vamos ver. Olha aqui: eu toco num espaço vazio." e demonstra só depois da pergunta, sem antecipar o resultado. Manter Recomeçar a busca e a passagem da vez. O meme é visual, sem voz do Zappy. Dedé entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 75 a 95 segundos.',
    ),
    dialogue(
      'ponte-a2-variavel',
      'Sua vez! Procure no jardim e fique de olho no número Achados. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-achados',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'Quantos você já encontrou?',
        instructions:
          'Toque em um esconderijo e olhe Achados. Toque em outro. Depois toque num espaço vazio do jardim. Por último, clique em Recomeçar a busca.',
        hints: [],
        activity: { type: 'experimentation', scene: 'found-counter', cenario: 'jardim' },
      },
    },
    video(
      'video-a2-contagem',
      'Cada descoberta conta',
      'Começar pela retomada, antes de qualquer bloco, curta e nesta ordem: primeiro o problema no próprio jogo ("Aqui no seu jogo, toque num esconderijo. Tá vendo? O personagem aparece, mas Achados continua em zero, porque o seu jogo ainda não conta."), depois a lembrança ("Lembra da experiência da parte anterior? Cada personagem encontrado somava um em Achados.") e, por último, o anúncio uma vez só, colado ao primeiro passo ("Agora a gente vai fazer o seu jogo contar do mesmo jeito!"). Não repetir a explicação da experiência. Primeiro o destino: trazer à vista o evento Quando clicar/tocar num sprite do grupo esconderijos (arrastando um espaço vazio entre os blocos se for preciso) e deixar à vista o bloco de visibilidade que já está dentro dele antes de abrir a paleta. Só então ensinar Programação > Variáveis, Somar 1 em variável, o encaixe logo abaixo da visibilidade e a escolha de achados. Testar 1, 2, 3, a mensagem de vitória (ligada à contagem que a criança montou: aparece quando Achados chega a 3) e a contagem sem repetição. Não listar os blocos antes do teste: a lista entra uma vez, depois dele, com o gatilho genérico (Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: …). Clicar em Verificar esta parte; se faltar algo, corrigir os blocos e verificar novamente. Quando aparecer Objetivo cumprido!, esperar Salvo, usar Enviar meu projeto, confirmar em Enviar e seguir em Próxima parte. A verificação depende desse clique; o envio não a executa automaticamente. Não ensinar o layout da prévia nem compartilhamento. Produção em 10/10/2026: participação de Dedé aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada A2P3-D01: depois de mostrar "Deixar o sprite escolhido com 0% de visibilidade.", Dedé pergunta "E onde eu coloco o bloco que conta?". A professora responde "Ele vai entrar logo abaixo do bloco de visibilidade, dentro de Quando clicar ou tocar. Então deixe esse lugar à vista.". Mostrar o encaixe antes da paleta e manter todos os passos de montagem, campos e testes. Dedé entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 3 a 4 minutos, incluindo gestos. Revisão de ritmo em 10/10/2026: Entrada A2P3-D02: após "Agora vamos testar! Toque num esconderijo. Olha só: o personagem aparece, e Achados vira 1!", Dedé diz "Agora sim! Já está contando!". Retomar a professora em "Toque em outro, e o número vai para 2. Quando você tocar no último, ele chega a 3 e aparece a mensagem Você achou todo mundo! E quem faz essa mensagem aparecer é a contagem que você acabou de montar: a mensagem aparece quando Achados chega a 3.". Entrada A2P3-D03: após "Toque em outro, e o número vai para 2. Quando você tocar no último, ele chega a 3 e aparece a mensagem Você achou todo mundo! E quem faz essa mensagem aparecer é a contagem que você acabou de montar: a mensagem aparece quando Achados chega a 3.", Dedé diz "E se eu tocar aqui de novo?". Retomar a professora em "Vamos ver. Agora toque de novo no mesmo lugar. Repare: o número continua em 3. É que o esconderijo invisível não recebe outro toque, então o mesmo personagem não conta duas vezes.". Concluir o gesto antes da criança entrar; manter o resultado à vista e sair antes do próximo gesto. As novas falas mostram uma consequência, fazem uma pergunta ou reagem ao teste. Preservar a voz da professora e os passos completos. Conferir durações com as novas entradas, sem acelerar a demonstração.',
    ),
    dialogue(
      'ponte-a2-contagem',
      'Agora faça o seu jogo contar os achados! Depois, teste os três esconderijos e clique em Verificar esta parte antes de enviar o seu projeto.',
    ),
    studio(montarProjetoCadeTodoMundo(true), true),
    // Personalização antes de publicar (05/10/2026): todos os bichos e esconderijos têm a mesma
    // caixa, então trocar a imagem de um sprite não muda tamanho nem lugar. O campo da imagem
    // mostra o NOME (FieldAssetPicker) e, ao trocar, ajusta largura e altura à imagem nova
    // mantendo o canto de cima (applySuggestedSize): por isso a correção do outro tipo de imagem.
    video(
      'video-a2-personalizar',
      'Deixe o jogo com a sua cara',
      'Revelar a surpresa plantada na abertura da Aula 1: começar com A surpresa chegou! Olha quem mais pode brincar de se esconder! e mostrar a página A surpresa do final do Mapa da Aventura, com todos os bichos e esconderijos, como a turma nova da brincadeira; depois voltar ao Estúdio. Mexa e veja numa seção própria, com mudanças que ficam no jogo. Com o destino à vista, mostrar a área Ao iniciar e os blocos Criar sprite. No bloco não há desenho para clicar: no fim de um bloco que cria um bicho, depois de com imagem, clicar no nome da imagem (coelho) para abrir a lista com as imagens do jogo e escolher outro bicho (gato); dizer que, se não achar, é só rolar a lista. Fazer o mesmo num bloco que cria um esconderijo: clicar em arbusto e escolher toco. Dizer que todos os bichos deste jogo foram desenhados do mesmo tamanho, e todos os esconderijos também, por isso o desenho novo cabe certinho no lugar do antigo. Depois, em Enquanto estiver rodando, trocar o texto do bloco Escrever dentro do Se por uma frase curta. Antes do teste, dar a correção do erro provável: se algum bicho aparecer antes do toque, ou um desenho ficar grande demais, clicar de novo no nome da imagem e escolher um desenho do mesmo tipo (bicho no bloco do bicho, esconderijo no bloco do esconderijo). Testar encontrando todo mundo de novo; se a frase passar da tela, deixar mais curta. Fechar dizendo que é com essa cara que o jogo vai para o Mural e terminar em Próxima parte. As escolhas não viram critério. Produção em 10/10/2026: participação de Dedé aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada A2P4-D01: depois de "Agora você vai escolher os bichinhos e preparar os esconderijos da sua brincadeira.", Dedé diz "Eu quero escolher o gato!". A professora responde "Pode escolher! Os bichos e os esconderijos estão no seu Mapa da Aventura, com o nome de cada um." e continua a apresentação das escolhas. A galeria permanece visível durante a entrada. O gato é um exemplo e a escolha do Dedé, não uma escolha obrigatória para quem assiste. Dedé entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 2 a 3 minutos, incluindo gestos e teste. Revisão de ritmo em 10/10/2026: Entrada A2P4-D02: após "Olhe o fim de um bloco que cria um bicho. Depois de com imagem, está o nome da imagem, como coelho. Clique nesse nome, e vai abrir uma lista com as imagens do jogo. Aí é só clicar em outro bicho, como o gato. Se não achar, role a lista.", Dedé diz "Meu gato vai se esconder atrás de uma pedra!". Retomar a professora em "Com os esconderijos é do mesmo jeito: num bloco que cria um esconderijo, clique no nome da imagem, como arbusto, e escolha outro esconderijo, como o toco.". Entrada A2P4-D03: após "Olha só: o esconderijo novo ficou no mesmo lugar e do mesmo tamanho. Isso acontece porque todos os bichos deste jogo foram desenhados do mesmo tamanho, e todos os esconderijos também. Por isso, o desenho novo cabe certinho no lugar do antigo.", Dedé diz "Troquei os desenhos e não precisei arrumar tudo de novo!". Retomar a professora em "Agora vamos mudar a mensagem do final. Encontre a área Enquanto estiver rodando, arrastando um espaço vazio entre os blocos se precisar. Dentro de um bloco Se, está o bloco Escrever com a frase Você achou todo mundo! Clique nessa frase e escreva uma frase curta, do seu jeito.". Concluir o gesto antes da criança entrar; manter o resultado à vista e sair antes do próximo gesto. As novas falas mostram uma consequência, fazem uma pergunta ou reagem ao teste. Preservar a voz da professora e os passos completos. Conferir durações com as novas entradas, sem acelerar a demonstração.',
    ),
    dialogue(
      'ponte-a2-personalizar',
      'A surpresa chegou! Escolha os bichinhos e prepare os esconderijos da sua brincadeira: troque a imagem clicando no nome dela, no fim de cada bloco Criar sprite, e escreva a sua mensagem do final. Depois encontre todo mundo de novo e clique em Próxima parte.',
    ),
    video(
      'video-a2-fecho',
      'Publique seu jogo',
      'Pedir que a criança publique o jogo para a família e os amigos jogarem. No mesmo Estúdio da prática, após o envio ao professor, abrir Compartilhar e dizer que o resumo do projeto já vem preenchido e pode ficar como está; na aula a janela não mostra o campo Título, então a fala não o cita. Clicar em Gerar capa e conferir a imagem. Clicar em Publicar e comemorar com a criança na tela do Zappy (Seu jogo está no Mural!): agora a família e os amigos podem jogar. Clicar em Copiar link de jogar e convidar a mandar o link para a família e os amigos, com ajuda de um adulto se precisar. Clicar em Fechar e terminar em Concluir fase. Não antecipar certificado ou próxima aula, nem apresentar compartilhar como opcional. A publicação não vira bloqueio técnico de conclusão. A ajuda escrita apresenta o Como fazer e abre o tutorial direto, sem exigir leitura. Outra capa e upload ficam na biblioteca. Sem venda. Produção em 10/10/2026: participação de Dedé aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada A2P5-D01: depois de "Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.", Dedé pergunta "Como eu mostro o jogo para a minha família?". A professora retoma "Clique em Copiar link de jogar e mande esse link para eles." e mantém a orientação de ajuda de um adulto, Fechar e Concluir fase. Copiar o link só depois da pergunta e da saída do avatar. A comemoração do Zappy na interface é visual, sem voz do mascote no vídeo. Dedé entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 60 a 80 segundos, incluindo publicação, comemoração e cópia do link.',
    ),
    dialogue(
      'ponte-a2-publicar',
      'Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Depois clique em Fechar e em Concluir fase.',
    ),
    {
      key: 'ajuda-a2-publicar',
      content: {
        kind: 'rich_text',
        markdown:
          'Quer rever como publicar? Abra [o passo a passo do Como fazer](/como-fazer/plataforma-publicar-no-mural), a área de ajuda.',
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
      'Reconhecer o que veio pronto e as duas regras que a criança programou, e comemorar antes do encaminhamento. Pedir Pegar meu certificado e, após o download, terminar em Concluir fase, sem acrescentar falas depois da ação de saída. Sem tour do PDF ou de pastas; a ajuda fica no Como Fazer. Sem oferta comercial. Produção em 10/10/2026: participação de Debinha aplicada ao roteiro; gravação e edição desta versão ainda não confirmadas. Entrada CERTP2-D01, somente na celebração: depois de "Parabéns pelo seu jogo!", Debinha comemora "Eu consegui!". A professora retoma "Agora clique em Pegar meu certificado para guardar essa conquista.". A criança sai antes dos comandos de saída; terminar em Concluir fase, sem despedida posterior. Não mostrar certificado emitido antes do clique. A seção anterior, de quiz, continua sem vídeo ou avatar. Debinha entra, fala e sai antes da retomada da professora, sem sobrepor vozes ou cobrir controles. Zappy só fala na página, fora do vídeo. Ver AVATARES-NOS-VIDEOS.md. Referência de duração anterior à inserção; medir a versão final com falas e gestos: 20 a 30 segundos.',
    ),
    dialogue(
      'ponte-certificado',
      'Parabéns, você terminou o seu jogo! Agora clique em Pegar meu certificado para guardar essa conquista e, quando ele baixar, clique em Concluir fase.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou a aventura Cadê Todo Mundo?',
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
