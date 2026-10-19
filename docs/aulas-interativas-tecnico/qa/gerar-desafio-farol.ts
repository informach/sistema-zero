/** Regenera os manifestos e o inventário do Desafio do farol. Não importa nem publica aulas. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FAROL_LAYOUT } from '../../../packages/studio/src/arte/farol-assets'
import {
  chaveRecolhida,
  coleta,
  coletaGuardada,
  farolEscolhido,
  movimento,
  movimentoSemBorda,
  portaCompleta,
  portaSemChave,
} from './desafio-farol-criterios'
import { montarProjetoFarol, montarProjetoFarolDaParte } from './desafio-farol-projeto'

import { farol } from './quizzes-cursos-curtos'

const DIR = resolve(import.meta.dir, '../../aulas-interativas/desafio-primeiro-jogo')
const CURSO = 'desafio-primeiro-jogo'
const EXEMPLOS = {
  inicio: 'fa000001-0000-4000-8000-000000000001',
  andar: 'fa000002-0000-4000-8000-000000000002',
  borda: 'fa000003-0000-4000-8000-000000000003',
  recolher: 'fa000004-0000-4000-8000-000000000004',
  guardar: 'fa000005-0000-4000-8000-000000000005',
  aviso: 'fa000006-0000-4000-8000-000000000006',
  semChave: 'fa000007-0000-4000-8000-000000000007',
  aceso: 'fa000008-0000-4000-8000-000000000008',
}

/**
 * Uma participação do avatar (AVATARES-NOS-VIDEOS.md): `depois` é o trecho literal da professora
 * logo antes do corte, e `retoma`, o começo literal da resposta dela depois da saída do avatar.
 * O ID termina em -D nas entradas da primeira aplicação e em -R nas da revisão de ritmo.
 */
interface Entrada {
  id: string
  depois: string
  fala: string
  retoma: string
}
/** As participações de um vídeo, NA ORDEM DE CORTE do roteiro (a geração confere essa ordem). */
interface Participacoes {
  nome: 'Debinha' | 'Dedé'
  entradas: Entrada[]
}
const entrada = (id: string, depois: string, fala: string, retoma: string): Entrada => ({
  id,
  depois,
  fala,
  retoma,
})

const roteiros = new Map<string, string>()
/** O trecho do vídeo no roteiro, com cada fala de vários parágrafos numa linha só. */
function trechoDoVideo(script: string, key: string) {
  let texto = roteiros.get(script)
  if (texto === undefined) {
    // No Windows, a cópia de trabalho pode vir com CRLF; o repositório guarda LF.
    texto = readFileSync(resolve(DIR, script), 'utf8').replaceAll('\r\n', '\n')
    roteiros.set(script, texto)
  }
  const titulo = texto.indexOf(`### Vídeo \`${key}\``)
  if (titulo < 0) throw new Error(`${script}: o vídeo ${key} não está no roteiro`)
  const corpo = texto.slice(texto.indexOf('\n', titulo))
  const fim = corpo.search(/^##+ /m)
  return (fim < 0 ? corpo : corpo.slice(0, fim)).replaceAll('\n>\n> ', ' ')
}

/**
 * Confere no roteiro a ordem de corte e cada trecho literal, para o plano de edição não divergir
 * da gravação: se uma entrada mudar de lugar ou uma âncora mudar de texto, a geração para.
 */
function conferirParticipacoes(script: string, key: string, { nome, entradas }: Participacoes) {
  const trecho = trechoDoVideo(script, key)
  const ordem = [...trecho.matchAll(/^\*\*Na tela:\*\* \*\*([A-Z0-9]+-[DR]\d{2})\*\*/gm)].map(
    (m) => m[1],
  )
  const esperada = entradas.map((e) => e.id)
  if (ordem.join() !== esperada.join())
    throw new Error(`${script}/${key}: ordem de corte ${ordem.join()} ≠ ${esperada.join()}`)
  if (
    (trecho.match(new RegExp(`\\*\\*${nome} \\(avatar\\):\\*\\*`, 'g')) ?? []).length !==
    ordem.length
  )
    throw new Error(`${script}/${key}: cada entrada precisa de uma fala de ${nome}`)
  for (const e of entradas)
    for (const literal of [e.depois, e.fala, e.retoma])
      if (!trecho.includes(literal))
        throw new Error(`${script}/${key}: ${e.id} cita um trecho ausente do roteiro: ${literal}`)
}

function textoParticipacoes({ nome, entradas }: Participacoes) {
  const lista = entradas.map(
    (e) =>
      `${e.id}, depois de "${e.depois}", ${nome} diz "${e.fala}"; a professora retoma "${e.retoma}".`,
  )
  const ritmo = entradas.some((e) => e.id.includes('-R'))
    ? ' As entradas -R vieram da revisão de ritmo de 10/10/2026: mostram uma consequência, fazem uma pergunta ou reagem ao teste, sem tirar passos da professora.'
    : ''
  return `Participações de ${nome}, na ordem de corte: ${lista.join(' ')}${ritmo} Quando a entrada vem depois de um gesto, concluir o gesto antes de ${nome} entrar e manter o resultado à vista; quando a entrada é uma pergunta antes do gesto, manter a cena parada. Marcar entrada e saída sem cobrir controles, e a resposta e o próximo gesto vêm depois da saída do avatar.`
}

/** O vídeo planejado: título, direção (com as participações, se houver) e o roteiro falado. */
const video = (
  key: string,
  title: string,
  script: string,
  direction: string,
  avatar?: Participacoes,
) => {
  if (avatar) conferirParticipacoes(script, key, avatar)
  const direcao = avatar ? `${direction} ${textoParticipacoes(avatar)}` : direction
  const vozes = avatar
    ? `A professora conduz; ${avatar.nome} entra, fala e sai nos pontos do roteiro. `
    : ''
  return {
    key,
    plannedVideo: `Título: ${title}\n\n${direcao}\n\nRoteiro falado: ${script}. Produção em 10/10/2026: roteiro com vozes identificadas, ainda sem confirmação de gravação ou edição desta versão. ${vozes}Zappy só fala na página, fora do vídeo; memes e interface mostram o mascote sem voz. Conferir a duração com ${avatar ? 'as participações e ' : ''}os gestos, sem acelerar. Ver AVATARES-NOS-VIDEOS.md. Gravar na plataforma atual; sem Pinta ou Estúdio completo. Falar como numa conversa contínua com a criança: frases ligadas, o porquê de cada resultado e um chamado para a tela (Olha aqui, Olha só, Repare, Tá vendo?) nos momentos que importam.`,
  }
}
const fala = (key: string, text: string) => ({
  key,
  content: { kind: 'dialogue', pose: 'speaking', text },
})
const secao = (
  key: string,
  title: string,
  intent: string,
  objective: string,
  blockKeys: string[],
  required: string[],
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
  completion: { version: 1, blockIds: required, ...(projectChecks ? { projectChecks } : {}) },
})
/**
 * Envio em dia (10/10/2026): a parte só fecha quando o último envio é igual ao projeto de agora.
 * Vai na ÚLTIMA parte que muda o jogo antes de publicar (ESPEC-MANIFESTO §6).
 */
const comEnvioEmDia = <S extends { completion: object }>(s: S) => ({
  ...s,
  completion: { ...s.completion, submissionUpToDate: true as const },
})

const studioBlocks = [
  'sz_frame_start',
  'sz_frame_events',
  'sz_frame_loops',
  'sz_g2d_setup_stage',
  'sz_g2d_create_image_sprite',
  'sz_g2d_create_sprite',
  'sz_g2d_clear',
  'sz_g2d_draw_backdrop',
  'sz_g2d_draw_sprite',
  'sz_g2d_draw_label',
  'sz_g2d_update_each_frame',
  'sz_g2d_enable_classic_controls',
  'sz_g2d_top_down',
  'sz_g2d_clamp_to_screen',
  'sz_g2d_on_overlap',
  'sz_g2d_destroy_sprite',
  'sz_g2d_set_image',
  'sz_g2d_sprite_x',
  'sz_g2d_set_velocity',
  'sz_g2d_apply_velocity',
  'sz_js_var_create',
  'sz_js_var_assign',
  'sz_js_if_else',
  'sz_val_bool',
  'sz_val_compare',
  'sz_val_number',
  'sz_val_text',
  'sz_val_variable',
]
const projeto = (etapa: 'dia-1' | 'dia-2' | 'dia-3') => ({
  key: 'projeto',
  content: {
    kind: 'studio',
    purpose: 'submission',
    chain: CURSO,
    level: 'iniciante-2d',
    allowedModes: ['blocks'],
    allowLevelReveal: false,
    allowBlocks: studioBlocks,
    ...(etapa === 'dia-3'
      ? {
          showcase: {
            enabled: true,
            title: 'A Chave do Farol',
            summary: 'Uma aventura para encontrar a chave e acender o farol para um barco chegar.',
          },
        }
      : {}),
    initialProject: montarProjetoFarol(etapa),
    projectExamples:
      etapa === 'dia-1'
        ? {
            version: 1,
            examples: {
              [EXEMPLOS.inicio]: montarProjetoFarol('dia-1'),
              [EXEMPLOS.andar]: montarProjetoFarolDaParte('andar'),
              [EXEMPLOS.borda]: montarProjetoFarolDaParte('borda'),
            },
            sections: {
              andar: { entryExampleId: EXEMPLOS.inicio, solutionExampleId: EXEMPLOS.andar },
              borda: { entryExampleId: EXEMPLOS.andar, solutionExampleId: EXEMPLOS.borda },
            },
          }
        : etapa === 'dia-2'
          ? {
              version: 1,
              examples: {
                [EXEMPLOS.borda]: montarProjetoFarolDaParte('borda'),
                [EXEMPLOS.recolher]: montarProjetoFarolDaParte('recolher'),
                [EXEMPLOS.guardar]: montarProjetoFarolDaParte('guardar'),
                [EXEMPLOS.aviso]: montarProjetoFarolDaParte('programar-chave'),
              },
              sections: {
                recolher: { entryExampleId: EXEMPLOS.borda, solutionExampleId: EXEMPLOS.recolher },
                guardar: { entryExampleId: EXEMPLOS.recolher, solutionExampleId: EXEMPLOS.guardar },
                'programar-chave': {
                  entryExampleId: EXEMPLOS.guardar,
                  solutionExampleId: EXEMPLOS.aviso,
                },
              },
            }
          : {
              version: 1,
              examples: {
                [EXEMPLOS.aviso]: montarProjetoFarolDaParte('programar-chave'),
                [EXEMPLOS.semChave]: montarProjetoFarolDaParte('sem-chave'),
                [EXEMPLOS.aceso]: montarProjetoFarolDaParte('decisao'),
              },
              sections: {
                'sem-chave': {
                  entryExampleId: EXEMPLOS.aviso,
                  solutionExampleId: EXEMPLOS.semChave,
                },
                decisao: { entryExampleId: EXEMPLOS.semChave, solutionExampleId: EXEMPLOS.aceso },
                personalizar: { entryExampleId: EXEMPLOS.aceso, solutionExampleId: EXEMPLOS.aceso },
              },
            },
  },
})
// O Dia 1 começa pela versão pronta e pelo caderno, como a Aula 1 do Cadê Todo Mundo?.
// Até 05/10/2026 essas duas seções formavam a aula separada `boas-vindas`; toda aula agora
// termina numa construção. A aula antiga sai do curso no Admin, sem apagar progresso.
const aberturaBlocks = [
  video(
    'video-intro-farol',
    'Seu primeiro jogo: A Chave do Farol',
    'desafio-dia-1.roteiro.md',
    'Anunciar o jogo que será programado e o contexto do barco e do farol apagado. Demonstração na primeira pessoa com um gesto só (Olha aqui: quando eu seguro a seta da tela para a direita…), sem resolver o percurso, e o aviso no alto do jogo apontado como o lugar que diz o que fazer na partida. Antes de passar a vez, plantar a surpresa do final, sem dizer o que é (E tem uma coisa esperando por você lá no fim desta aventura: uma surpresa para deixar o jogo do seu jeito.); só no fim passar a vez: jogar até o farol acender e o barco chegar. Não fazer tour de interface. A participação permite avançar; vencer não é requisito.',
    {
      nome: 'Debinha',
      entradas: [
        entrada(
          'F1P1-D01',
          'o personagem precisa pegar a chave e levar até lá.',
          'E como eu levo o personagem até a chave?',
          'Olha aqui: quando eu seguro a seta da tela para a direita',
        ),
      ],
    },
  ),
  fala(
    'ponte-intro-farol',
    'Sua vez! Jogue a versão pronta: pegue a chave e leve o personagem até o farol. Depois, clique em Próxima parte.',
  ),
  {
    key: 'jogo-pronto',
    content: {
      kind: 'interactive',
      required: true,
      title: 'Jogue A Chave do Farol',
      instructions:
        'Segure as setas da tela ou, no computador, clique no jogo e use as setas do teclado. Pegue a chave e leve o personagem até o farol. Você pode seguir mesmo sem terminar a partida.',
      hints: [],
      activity: {
        type: 'project-play',
        project: montarProjetoFarol('concluido'),
        stage: { width: FAROL_LAYOUT.palco.w, height: FAROL_LAYOUT.palco.h },
        completion: 'participation',
        targets: [],
      },
    },
  },
  video(
    'video-intro-caderno',
    'Seu Mapa da Aventura',
    'desafio-dia-1.roteiro.md',
    'Chamar a atenção para o caderno, que a criança conhece como Mapa da Aventura (Olha aqui: este é o seu Mapa da Aventura!), a consulta que acompanha as seções do curso: montagem, testes, publicação e certificado. Oferecer as duas escolhas como convite: ler aqui mesmo ou clicar em Baixar para guardar o mapa e consultar onde quiser. Não dizer que não precisa baixar ou imprimir: soa como uma ordem para não fazer. Apontar Baixar sem demonstrar o download. Não inventar material de mapa nem ensinar o leitor. A professora conduz este vídeo sem participação do avatar para manter a explicação direta.',
  ),
  fala(
    'ponte-intro-caderno',
    'Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
  ),
  // UM bloco de materiais por fase (07/10/2026, decisão da dona): o Mapa da Aventura e, logo
  // abaixo, a ajuda do Como Fazer, sob o selo "Consulte". O PDF do Mapa é anexado no Admin e a
  // importação o mantém à frente dos itens do manifesto. Consultar a ajuda é opcional: o jogo e a
  // tarefa vêm antes dos tutoriais de interface.
  {
    key: 'materiais-farol',
    content: {
      kind: 'materials',
      title: 'Mapa da Aventura: A Chave do Farol',
      bookPreview: true,
      items: [
        {
          id: 'texto-ajuda',
          kind: 'text',
          markdown:
            'Precisa de ajuda com a plataforma? Abra um destes passo a passo do Como fazer.',
        },
        // Rótulo = título EXATO do tutorial em docs/como-fazer/como-fazer.json (full review 06/10/2026).
        ...linksComoFazer([
          ['plataforma-baixar-materiais', 'Como abrir o Mapa da Aventura e os materiais'],
          ['plataforma-abrir-uma-aula', 'Como abrir uma fase e trocar de parte'],
          ['plataforma-ampliar-a-atividade', 'Como dar mais espaço ao jogo e à experiência'],
          ['plataforma-mostrar-o-menu', 'Como mostrar o menu e a lista de fases'],
          ['plataforma-voltar-para-a-aula', 'Como continuar uma fase'],
          ['plataforma-pedir-ajuda', 'Como pedir ajuda à equipe'],
        ]),
      ],
    },
  },
]
const aberturaSections = [
  secao(
    'apresentacao',
    'A Chave do Farol',
    'presentation',
    'Experimentar a aventura pronta antes de construir suas regras, sem exigir vitória.',
    ['video-intro-farol', 'ponte-intro-farol', 'jogo-pronto'],
    ['video-intro-farol', 'jogo-pronto'],
  ),
  secao(
    'caderno',
    'Seu Mapa da Aventura',
    'material',
    'Conhecer o caderno opcional que acompanha o conteúdo das aulas e a ajuda disponível.',
    ['video-intro-caderno', 'ponte-intro-caderno', 'materiais-farol'],
    ['video-intro-caderno'],
  ),
]

/**
 * Uma experiência da cena `lighthouse-walk`, configurada pelas metas do caso. A mesma cena mostra
 * os dois conceitos do Dia 1: andar a cada quadro e o limite da tela.
 */
const experienciaAndar = (
  key: string,
  title: string,
  instructions: string,
  goals: string[],
  // As descobertas da cena dizem "o sprite" (a palavra dos blocos); antes da parte 4, que explica
  // a palavra, a experiência do quadro troca o rótulo por "personagem" (revisão de 13/10/2026).
  goalCopy?: Record<string, { label: string }>,
) => ({
  key,
  content: {
    kind: 'interactive',
    required: true,
    title,
    semPerguntaFinal: true,
    instructions,
    hints: [],
    activity: {
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'farol',
      setup: { goals, ...(goalCopy ? { goalCopy } : {}) },
    },
  },
})

// Uma ideia por seção (05/10/2026): cada conceito ganha uma experiência e, logo depois, a montagem
// que o aplica. As etapas intermediárias verificam sem envio; o envio do dia fica em `borda`.
const dia1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-1',
  title: 'O personagem ganha movimento',
  retireBlockKeys: [
    'video-d1-chegada',
    'video-d1-movimento',
    'video-d1-tanto',
    'ponte-d1-tanto',
    'experiencia-velocidade',
    'video-d1-velocidade',
    'ponte-d1-velocidade',
    // 07/10/2026: a ajuda do Como Fazer entrou no bloco do Mapa (um bloco de materiais por fase).
    'ajuda-como-fazer-intro',
    'ajuda-d1',
  ],
  blocks: [
    ...aberturaBlocks,
    video(
      'video-d1-quadro',
      'Como o personagem anda',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: o jogo é como um desenho animado, quadro a quadro. Fazer cada gesto no ritmo da fala, sem a seta (o quadro passa de 0 para 1 e o x fica igual) e com a seta (o x sobe 3 a cada quadro, como mostra o +3 embaixo do personagem), depois Rodar, nomeando o que aconteceu e por quê. Terminar com Agora é a sua vez e Próxima parte.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F1P3-D01',
            'Por isso, ele acontece de novo em todo quadro.',
            'E se eu clicar em Rodar?',
            'Vamos ver. Quando eu clico em Rodar,',
          ),
        ],
      },
    ),
    fala(
      'ponte-d1-quadro',
      'Sua vez! Teste sem a seta e com a seta e repare no que acontece com o x. Quando terminar, clique em Próxima parte.',
    ),
    experienciaAndar(
      'experiencia-quadro',
      'Como o personagem anda',
      'Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue Segurar a seta para a direita e clique em Avançar 1 quadro algumas vezes. Por último, clique em Rodar.',
      ['still-without-arrow', 'moves-each-frame'],
      {
        'still-without-arrow': { label: 'Sem a seta, o personagem ficou parado' },
        'moves-each-frame': { label: 'Com a seta, o personagem andou a cada quadro' },
      },
    ),
    video(
      'video-d1-andar',
      'Faça o personagem andar',
      'desafio-dia-1.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (a criança procura as setas na tela ou usa as do teclado: não há setas e o personagem não sai do lugar), a lembrança da experiência (com a seta segurada, ele andava a cada quadro) e o anúncio da montagem. Antes de pedir para encontrar Ao iniciar, apresentar os comandos e os bloquinhos com a fala: "Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui aparecem como bloquinhos. Olha aqui: neste menu, chamado paleta de comandos, você escolhe os blocos que vai encaixar para montar as regras do seu jogo." Apontar a paleta no "Olha aqui: neste menu", sem pegar nenhum bloco ainda. No projeto inicial, guiar com o destino à vista: controles com só as quatro direções no fim de Ao iniciar (o bloco chega com automáticos no celular: clicar nesse nome e trocar) e o movimento dentro de A cada quadro do jogo, logo abaixo de Desenhar o cenário praia-tropical, com velocidade 3 (o bloco chega com heroi: clicar em heroi e escolher personagem). Procurar primeiro a área Enquanto estiver rodando, com o socorro de arrastar um espaço vazio, e depois o bloco dentro dela. Testar as setas, explicar que o Estúdio guarda o jogo automaticamente (mostrar o selo Guardado na sua conta só quando ele aparecer de verdade) e que o envio fica no fim da fase, Verificar esta parte, Objetivo cumprido! e Próxima parte, sem envio.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F1P4-R01',
            'Para fazer isso, a gente precisa dizer ao jogo o que ele deve fazer. É para isso que servem os comandos, que aqui aparecem como bloquinhos. Olha aqui: neste menu, chamado paleta de comandos, você escolhe os blocos que vai encaixar para montar as regras do seu jogo.',
            'Primeiro eu preciso pôr as setas na tela!',
            'As setas entram quando o jogo começa, na área Ao iniciar. Encontre essa área e deixe à vista o fim dela, depois dos blocos que já estão lá. Se ela não estiver aparecendo, é só arrastar um espaço vazio entre os blocos até ela aparecer.',
          ),
          entrada(
            'F1P4-D01',
            'Segure uma delas.',
            'As setas apareceram, mas ele ainda não anda!',
            'É que as setas sozinhas ainda não movem ninguém.',
          ),
          entrada(
            'F1P4-R02',
            'Agora vamos testar! Segure uma seta da tela, ou, no computador, clique dentro do jogo e use as setas do teclado. Olha só: o personagem anda na direção da seta!',
            'Foi! Agora ele anda!',
            'Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Ativar controles clássicos, com só as quatro direções, está no fim de Ao iniciar. E o bloco de movimento, com o sprite personagem, está dentro de A cada quadro do jogo. Depois de corrigir, teste de novo.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d1-andar',
      'Hora de fazer o seu personagem andar! Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Depois teste e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d1-limite',
      'Até onde ele pode ir?',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: a tela é uma janela, e o limite, uma parede invisível. Apontar a faixa fora da tela, onde a experiência ainda mostra, clarinho, o que saiu. Rodar sem o limite até o personagem sair e depois com Manter dentro da tela ligado; no fim, apontar na regra o bloco Manter o sprite personagem dentro da tela, logo abaixo do bloco que move. Terminar com Agora é a sua vez e Próxima parte.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F1P5-D01',
            'porque nada segura ele dentro da janela.',
            'Como eu faço ele parar na borda?',
            'Agora eu clico em Recomeçar,',
          ),
        ],
      },
    ),
    fala(
      'ponte-d1-limite',
      'Sua vez! Teste sem o limite e com ele e repare no que acontece na borda. Quando terminar, clique em Próxima parte.',
    ),
    experienciaAndar(
      'experiencia-limite',
      'Até onde ele pode ir?',
      'Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Veja o que acontece na borda. Depois clique em Recomeçar, ligue Manter dentro da tela e clique em Rodar de novo.',
      ['left-the-screen', 'stayed-inside'],
    ),
    video(
      'video-d1-borda',
      'Mantenha o personagem na tela',
      'desafio-dia-1.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem sai pela beirada, porque ainda não há limite), a lembrança da experiência (com Manter dentro da tela ligado, ele parava na borda) e o anúncio; depois da pergunta da Debinha, o primeiro passo. Depois deixar à vista o bloco de movimento e encaixar Manter o sprite dentro da tela logo abaixo (o bloco chega com heroi: clicar em heroi e escolher personagem). Testar as beiradas, Verificar esta parte, Objetivo cumprido!, envio com confirmação, a comemoração do que a criança programou e Concluir fase. Gravar o envio numa sessão sem envio anterior nesta fase.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F1P6-D01',
            'Agora a gente vai pôr esse limite no seu jogo!',
            'E onde eu coloco esse limite?',
            'O limite vai logo abaixo do bloco de movimento,',
          ),
          entrada(
            'F1P6-R01',
            'Agora teste as quatro direções até chegar às beiradas. Olha só: ele para em cada beirada e não sai mais da tela!',
            'Agora posso segurar a seta que ele não vai embora!',
            'Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de A cada quadro do jogo, o bloco que move o personagem vem antes, e logo abaixo dele está Manter o sprite personagem dentro da tela. Depois de corrigir, teste de novo.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d1-borda',
      'Agora mantenha o personagem na tela! Coloque o limite logo abaixo do movimento, teste as quatro beiradas e clique em Verificar esta parte. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir fase.',
    ),
    projeto('dia-1'),
  ],
  sections: [
    ...aberturaSections,
    secao(
      'quadro',
      'Como o personagem anda',
      'exploration',
      'Ver que o jogo repete a cada quadro e que, com a seta, o personagem anda um pouco em cada repetição.',
      ['video-d1-quadro', 'ponte-d1-quadro', 'experiencia-quadro'],
      ['video-d1-quadro', 'experiencia-quadro'],
    ),
    secao(
      'andar',
      'Faça o personagem andar',
      'application',
      'Ativar as quatro setas e mover o personagem dentro de A cada quadro do jogo.',
      ['video-d1-andar', 'ponte-d1-andar'],
      ['video-d1-andar'],
      'projeto',
      movimentoSemBorda,
    ),
    secao(
      'limite',
      'Até onde ele pode ir?',
      'exploration',
      'Ver o personagem sair da tela sem limite e ficar inteiro com o limite ligado.',
      ['video-d1-limite', 'ponte-d1-limite', 'experiencia-limite'],
      ['video-d1-limite', 'experiencia-limite'],
    ),
    secao(
      'borda',
      'Mantenha o personagem na tela',
      'delivery',
      'Manter o personagem dentro da tela, depois do movimento, e enviar a atividade.',
      ['video-d1-borda', 'ponte-d1-borda', 'projeto'],
      ['video-d1-borda', 'projeto'],
      'projeto',
      movimento,
    ),
  ],
}

const dia2 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-2',
  title: 'A chave muda a aventura',
  retireBlockKeys: ['video-d2-teste'],
  blocks: [
    video(
      'video-d2-contexto',
      'O jogo guardou a chave?',
      'desafio-dia-2.roteiro.md',
      'Situar a coleta que falta já dentro da experiência, aberta direto na cena com a chave no chão (o teste no projeto da pessoa fica para a retomada da parte 2). Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: temChave é um lugar com nome onde o jogo guarda uma informação, e o nome é uma pergunta de sim ou não; encostar na chave é um evento; temChave é o bloquinho, e anotar é mudar temChave para verdadeiro. Mostrar a coleta sem memória, apontar na regra da coleta a linha Alterar temChave para verdadeiro desligada, recomeçar a partida antes de ligar Guardar a coleta, repetir a coleta com o mesmo sumiço e o mesmo aviso, afastar e recomeçar, nomeando temChave em cada um. Terminar com Agora é a sua vez e Próxima parte.',
      {
        nome: 'Dedé',
        entradas: [
          entrada(
            'F2P1-D01',
            'temChave continua falso.',
            'Mas a chave sumiu. Por que ainda está falso?',
            'É que tirar a chave do chão não guarda essa informação.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d2-contexto',
      'Sua vez! Faça os testes e fique de olho em temChave: compare o que some da tela com o que fica guardado. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-memoria',
      content: {
        kind: 'interactive',
        required: true,
        title: 'O jogo guardou a chave?',
        semPerguntaFinal: true,
        instructions:
          'Deixe Guardar a coleta desligado e clique em Encostar na chave. Olhe a chave, o aviso e temChave. Clique em Recomeçar a partida, ligue Guardar a coleta e clique em Encostar na chave de novo. Depois clique em Afastar e, por último, em Recomeçar a partida. Acompanhe temChave em cada teste.',
        hints: [],
        activity: { type: 'experimentation', scene: 'collect-and-remember', cenario: 'farol' },
      },
    },
    video(
      'video-d2-recolher',
      'Recolha a chave',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem passa por cima da chave e ela continua no chão, porque o jogo ainda não sabe o que fazer quando os dois se encostam), a lembrança da experiência (ao encostar, a chave saía do chão) e o anúncio colado ao primeiro passo. No projeto enviado no Dia 1, que ainda não tem a área Quando acontecer: criá-la por Áreas do projeto e, com o destino à vista, montar dentro dela o encontro (o bloco chega com jogador e inimigo: clicar em cada nome e escolher personagem e chave) e, no espaço vazio ao lado da palavra fazer, Destruir o sprite (chega com resposta: clicar e escolher chave). Testar a chave sumindo e voltando com Atualizar. Verificar esta parte, Objetivo cumprido! e Próxima parte, sem envio.',
      {
        nome: 'Dedé',
        entradas: [
          entrada(
            'F2P2-R01',
            'Repare que o bloco chega com dois nomes, jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha chave. Assim, tudo o que você colocar dentro desse bloco vai acontecer quando o personagem encostar na chave.',
            'Só pega se o personagem encostar mesmo na chave!',
            'Agora vem a ação: tirar a chave do chão. Essa ação vai dentro do encontro, no espaço vazio ao lado da palavra fazer. Deixe esse espaço à vista.',
          ),
          entrada(
            'F2P2-D01',
            'O bloco chega com o nome resposta: clique em resposta e escolha chave.',
            'A chave some para sempre?',
            'Aqui, destruir só tira a chave desta partida.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d2-recolher',
      'Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d2-guardar',
      'Guarde que a chave foi encontrada',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta: como o efeito não aparece no jogo, só a lembrança (com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso; o jogo está assim) e o anúncio colado ao primeiro passo. Criar temChave começando em falso no fim de Ao iniciar, junto das variáveis que já estão ali (o bloco chega com contador e 0: clicar em contador, escrever temChave e trocar o 0 por falso). Depois encontrar a área Quando acontecer e mudar temChave para verdadeiro dentro do encontro, logo abaixo de Destruir o sprite (o Alterar chega com contador: clicar e escolher temChave). Verificar esta parte, Objetivo cumprido! e Próxima parte, sem envio.',
      {
        nome: 'Dedé',
        entradas: [
          entrada(
            'F2P3-R01',
            'Confira se ficou assim: no fim de Ao iniciar, está Criar variável temChave com valor falso.',
            'Ah! Na partida nova eu tenho que buscar a chave outra vez!',
            'Agora que temChave existe, o jogo precisa mudar essa informação quando o personagem encostar na chave. Por isso, o próximo bloco vai logo abaixo de Destruir o sprite, dentro do encontro. Encontre a área Quando acontecer, arrastando um espaço vazio entre os blocos se precisar, e deixe esse lugar à vista.',
          ),
          entrada(
            'F2P3-D01',
            'Alterar temChave para verdadeiro.',
            'Como eu vejo se o jogo guardou a chave?',
            'No jogo, você ainda não consegue ver temChave,',
          ),
        ],
      },
    ),
    fala(
      'ponte-d2-guardar',
      'Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d2-programar',
      'Avise quem está jogando',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (a chave some, mas o aviso continua dizendo Encontre a chave e vá ao farol, porque nenhum bloco muda o aviso), a lembrança da experiência (o aviso mudava) e o anúncio colado ao primeiro passo. Mudar o aviso dentro do encontro, logo abaixo de temChave (o Alterar chega com contador: clicar e escolher aviso), com o texto de coleta no lugar de Olá. Testar, clicar em Atualizar e mostrar a chave e o aviso inicial de volta, verificar inclusive o movimento anterior, envio confirmado. Antes de Concluir fase, reconhecer a conquista com Pronto, você programou a coleta da chave: ela sai do chão, o jogo guarda em temChave que ela foi pega, e o aviso muda! e lembrar a surpresa uma vez só, sem mostrar nada dela (E lembra da surpresa que eu te contei quando a aventura começou? Ela está quase aqui! Na próxima fase você vai descobrir o que é.). Terminar em Concluir fase.',
      {
        nome: 'Dedé',
        entradas: [
          entrada(
            'F2P4-D01',
            'Você pegou a chave! Agora vá ao farol.',
            'Agora quem joga vai saber para onde ir!',
            'Vamos conferir no jogo! Leve o personagem até a chave.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d2-programar',
      'Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar esta parte. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir fase.',
    ),
    projeto('dia-2'),
  ],
  sections: [
    secao(
      'contexto',
      'O jogo guardou a chave?',
      'exploration',
      'Distinguir retirada, aviso e memória; observar a informação ao afastar e ao recomeçar.',
      ['video-d2-contexto', 'ponte-d2-contexto', 'experiencia-memoria'],
      ['video-d2-contexto', 'experiencia-memoria'],
    ),
    secao(
      'recolher',
      'Recolha a chave',
      'application',
      'Programar o encontro entre personagem e chave e tirar a chave da partida.',
      ['video-d2-recolher', 'ponte-d2-recolher'],
      ['video-d2-recolher'],
      'projeto',
      chaveRecolhida,
    ),
    secao(
      'guardar',
      'Guarde que a chave foi encontrada',
      'application',
      'Criar temChave em falso e guardar verdadeiro no encontro com a chave.',
      ['video-d2-guardar', 'ponte-d2-guardar'],
      ['video-d2-guardar'],
      'projeto',
      coletaGuardada,
    ),
    secao(
      'programar-chave',
      'Avise quem está jogando',
      'delivery',
      'Mostrar o aviso da coleta, testar a coleta inteira e enviar a atividade.',
      ['video-d2-programar', 'ponte-d2-programar', 'projeto'],
      ['video-d2-programar', 'projeto'],
      'projeto',
      coleta,
    ),
  ],
}

const dia3 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-3',
  title: 'A luz do farol',
  blocks: [
    video(
      'video-d3-condicao',
      'Quando a porta pode abrir?',
      'desafio-dia-3.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz e mostrando antes de definir: testar a porta sem a chave, ver que ela não abre e só então dizer a pergunta que ela faz (temChave é verdadeiro? Ou seja, o personagem está com a chave?), que se chama condição, como a porta de casa que só abre com a chave. Sem a chave a resposta é não e a porta escolhe o senão; com a chave a resposta é sim e ela escolhe o então, apontando a resposta escolhida no painel A regra da porta. Terminar com Agora é a sua vez e Próxima parte.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P1-D01',
            'ela só abre se você tiver a chave.',
            'E se eu trouxer a chave agora?',
            'Vamos ver. Agora eu clico em Levar a chave',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-condicao',
      'Sua vez! Teste a mesma porta sem a chave e com a chave e repare em qual resposta a porta escolhe. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        semPerguntaFinal: true,
        instructions:
          'Sem levar a chave, clique em Testar a porta. Depois clique em Levar a chave e em Testar a porta de novo. Compare temChave e a resposta escolhida nas duas vezes.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-key',
          cenario: 'farol',
        },
      },
    },
    video(
      'video-d3-sem-chave',
      'Avise quando faltar a chave',
      'desafio-dia-3.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem chega à porta do farol, na base da torre, e nada acontece), a lembrança da experiência (a porta conferia temChave) e o anúncio colado ao primeiro passo. No projeto enviado no Dia 2, guiar evento separado personagem/farol (o bloco chega com jogador e inimigo), Se consultando temChave (a pergunta x > 0 vai para a lixeira e o valor da variável chega com x) e aviso no senão, aberto pelo segundo sinal de mais, antes da palavra senão. Explicitar o então ainda vazio. Testar sem chave, Verificar esta parte, corrigir pendências e, depois de Objetivo cumprido!, Próxima parte. Não enviar nesta etapa intermediária.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P2-R01',
            'Clique em jogador e escolha personagem. Depois clique em inimigo e escolha farol.',
            'Agora o jogo vai perceber quando eu chegar ao farol!',
            'Dentro desse encontro, o farol vai fazer a mesma pergunta da porta. Por isso, deixe à vista o espaço vazio ao lado da palavra fazer, dentro do encontro com o farol.',
          ),
          entrada(
            'F3P2-D01',
            'o jogo confere se temChave é verdadeiro.',
            'E onde eu escrevo que falta a chave?',
            'Esse aviso vai no espaço do senão.',
          ),
          entrada(
            'F3P2-R02',
            'Vá até a porta do farol sem passar pela chave. Repare: a luz continua apagada, e o aviso diz que falta a chave. É a resposta do senão funcionando!',
            'Não adiantou correr direto para o farol. Preciso da chave!',
            'Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro de Quando acontecer está o encontro entre personagem e farol, dentro dele está o Se com temChave, e dentro do senão está o aviso de que falta a chave. Depois de corrigir, teste de novo.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-sem-chave',
      'Agora ensine o farol a avisar quando falta a chave! Monte o encontro com o farol, o Se e o aviso no senão. Depois vá até a porta do farol sem pegar a chave e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d3-decisao',
      'Acenda o farol com a chave',
      'desafio-dia-3.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (com a chave, a luz não acende, porque o espaço do então está vazio), a lembrança da experiência (com temChave verdadeiro, a porta acendia o farol) e o anúncio colado ao primeiro passo. Continuar no mesmo Se e projeto da seção anterior. Dizer de saída que a resposta com a chave tem três blocos e completar o então com ganhou, imagem (o Trocar imagem chega com heroi nos dois nomes) e aviso. Testar sem chave, buscar e voltar até a porta do farol na mesma partida (o barco entra em cerca de 1 segundo), depois reiniciar e conferir sem chave. Verificação cumulativa e Próxima parte, sem envio. O jogo é salvo automaticamente e o único envio fica no fim de Escolha onde fica a chave.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P3-D01',
            'Tá vendo? A luz não acende.',
            'Mas eu trouxe a chave!',
            'É que o espaço do então está vazio.',
          ),
          entrada(
            'F3P3-R01',
            'Repare que esse bloco chega com heroi nos dois nomes. Clique no primeiro heroi e escolha farol. Depois clique no segundo e escolha a imagem farol listrado aceso. Se não achar, role a lista.',
            'E quem está jogando vai saber que deu certo?',
            'Vai, sim! É para isso que serve o último bloco: o aviso. Ele vai logo abaixo da troca de imagem, ainda dentro do então. Deixe esse lugar à vista.',
          ),
          entrada(
            'F3P3-D02',
            'Olha só: a luz acende, o aviso muda, e o barco já chegou perto do farol!',
            'Acendeu! E se eu quiser jogar de novo?',
            'Clique em Atualizar de novo.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-decisao',
      'Agora acenda o farol! Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d3-personalizar',
      'Deixe o jogo com a sua cara',
      'desafio-dia-3.roteiro.md',
      'Revelar a surpresa plantada na abertura do Dia 1: começar com Sua missão deu certo! E a surpresa chegou: olha quantas versões essa aventura pode ter, mostrar duas versões completas já montadas, em dois trechos curtos gravados em dois perfis de teste com o farol acendendo e o barco entrando (robo, lancha, chave-prateada, farol-colorido e ilha-nevada; mergulhador, veleiro, chave-dourada, farol-de-madeira e costa-rochosa), perguntar Que combinação você vai criar? e só então mostrar as galerias do Mapa da Aventura (A surpresa do final); depois voltar ao Estúdio, no mesmo projeto verificado. Uma ideia só: trocar cada imagem por outra do mesmo tipo, pelos nomes da galeria do Mapa. No mesmo projeto, em Ao iniciar, trocar a imagem de Criar sprite personagem, barco e chave; o farol em par, o modelo apagado no Criar sprite farol e o mesmo modelo aceso no Trocar imagem do sprite farol, dentro de então; o cenário em Desenhar o cenário, dentro de A cada quadro do jogo. Demonstrar pirata, barco-pirata, chave-de-estrela, farol-de-pedra e noite-na-ilha como exemplo, dizendo que a pessoa troca o que quiser e o que ela gostou pode ficar como está; clicar no nome da imagem (como aventureiro), mostrar logo depois da primeira troca que o pirata fica no mesmo lugar e do mesmo tamanho e avisar que o barco novo só aparece no teste; mantendo nomes dos sprites, posição, largura e altura. Testar sem a chave e com a chave na mesma partida, levando o personagem até a porta do farol, e dizer que é com essa cara que o jogo vai para o Mural; conferir uma vez só, depois do teste. Verificar esta parte, Objetivo cumprido! e Próxima parte. As escolhas ficam no jogo e não viram critério.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P4-D01',
            'E o que você escolher fica no jogo.',
            'Quero fazer uma aventura de pirata!',
            'Boa ideia! Eu vou mostrar com o pirata, e você troca o que quiser: o que você gostou pode ficar como está.',
          ),
          entrada(
            'F3P4-R01',
            'Agora encontre Quando acontecer e o encontro do personagem com o farol. Dentro do então do Se está Trocar imagem do sprite farol para. Clique no nome da imagem, como farol listrado aceso, e escolha o mesmo modelo, aceso: farol de pedra aceso. Repare: de pedra nos dois lugares, apagado no começo e aceso na resposta com chave.',
            'Se eu misturar os modelos, o farol muda de tipo quando acende!',
            'Isso mesmo! Agora falta o lugar onde a história acontece. Em Enquanto estiver rodando, dentro de A cada quadro do jogo, clique no nome do cenário, como praia tropical, no bloco Desenhar o cenário. Eu vou usar noite na ilha. Olha só: a ponte e o mar continuam no mesmo lugar, e o caminho até o farol não muda.',
          ),
          entrada(
            'F3P4-R02',
            'Agora teste a sua combinação! Clique em Atualizar e vá até a porta do farol sem a chave: ele continua apagado. Depois busque a chave e volte até a porta na mesma partida. Olha só: o farol de pedra acende, e o barco pirata vem chegando!',
            'Uhu! Minha aventura de pirata está funcionando!',
            'Agora o jogo tem a sua cara, e é com essa cara que ele vai para o Mural.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-personalizar',
      'A surpresa chegou! Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Se trocar o farol, use o mesmo modelo apagado e aceso. Teste a combinação e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video(
      'video-d3-farol-mensagens',
      'Escreva seus avisos',
      'desafio-dia-3.roteiro.md',
      'Duração alvo: 120 a 150 segundos. Uma ideia só: os avisos do jogo com as palavras da pessoa, que ficam no jogo. Mudar só o texto dos quatro avisos: o de Ao iniciar, o do encontro com a chave e os do senão e do então no encontro com o farol, com frases curtas. Narrar as quatro edições, cada uma com o lugar e a frase de exemplo, sem digitação calada; se Quando acontecer começar fora da tela, arrastar um espaço vazio entre os blocos. Testar os quatro na mesma partida, levando o personagem até a porta do farol, na base da torre; conferir uma vez só, depois do teste, inclusive o aviso que não mudou. O jogo é salvo automaticamente; terminar em Próxima parte. As frases ficam livres. A professora conduz este vídeo sem participação do avatar para manter a explicação direta.',
    ),
    fala(
      'ponte-d3-farol-mensagens',
      'Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.',
    ),
    video(
      'video-d3-posicao',
      'Como escolher um lugar para a chave',
      'desafio-dia-3.roteiro.md',
      'Demonstrar na primeira pessoa a experiência lighthouse-position: observar x211/y53, mudar só Posição horizontal x para 160, depois só Posição vertical y para 250. Cada número pelo campo de digitar: clicar no número, apagar, escrever e clicar fora do campo (a chave só se move depois desse clique); não usar os botões − e +, que andam de 20 em 20 e não chegam a 160 nem a 250. Explicar enquanto faz: x leva para os lados, y para cima e para baixo; números maiores levam à direita e para baixo, porque na tela do jogo a contagem do y começa no 0, lá em cima. Nomear o quadrado pontilhado que marca o lugar anterior. Manter o outro valor visível, mostrar que tamanho e desenho não mudam. Só no fim passar a vez, sem repetir os passos; terminar em Próxima parte.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P6-D01',
            'um número menor leva para a esquerda, e um maior leva para a direita.',
            'E para subir ou descer?',
            'A gente muda o y. Agora eu deixo o x em 160',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-posicao',
      'Sua vez! Mude um número de cada vez e repare para onde a chave vai. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-posicao',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Como escolher um lugar para a chave',
        semPerguntaFinal: true,
        instructions:
          'Clique no número de Posição horizontal x, apague o 211, escreva 160 e clique fora do campo. Observe para onde a chave foi. Depois, sem mexer no x, faça o mesmo em Posição vertical y: troque 53 por 250 e clique fora do campo. Compare as duas mudanças. Se quiser repetir, clique em Recomeçar.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-position',
          cenario: 'farol',
          setup: { goals: ['mover-horizontal', 'mover-vertical'] },
        },
      },
    },
    video(
      'video-d3-posicionar-chave',
      'Escolha onde fica a chave',
      'desafio-dia-3.roteiro.md',
      'Retomar a experiência de x/y e mostrar a chave no jogo. Em Ao iniciar, no Criar sprite chave, trocar só x/y, mantendo nome, imagem, largura e altura. Oferecer pontos do Mapa, mostrados no PDF do Mapa da Aventura (ele fica no Dia 1): perto da trilha 211/53, na parte de baixo 160/250 e perto da ponte 280/160. Dar o número como exemplo ("pelo x do lugar que você escolheu, como 160"), não como ordem. Conferir se a chave aparece inteira: atrás do farol ou da faixa do aviso ela some, e em cima do personagem ele já começa com ela; nesses casos, escolher um ponto sugerido. Testar a coleta no lugar novo, a chegada à porta do farol, na base da torre, o barco e o reinício, sem repetir a ida ao farol sem a chave (a posição não muda a resposta do senão). As escolhas não viram critério; esta é a única entrega do dia, depois das imagens, avisos e posição. Clicar em Enviar meu projeto, confirmar em Enviar sem preencher o Recado (opcional) e aguardar Projeto enviado! antes de Próxima parte. Exigir vídeo, envio e envio em dia; uma edição posterior ao envio pede atualização da mesma entrega (Enviar de novo, confirmado em Reenviar). Gravar numa sessão sem envio anterior nesta fase; para repetir a tomada, usar outro perfil de ensaio.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P7-D01',
            'ou perto da ponte, com x 280 e y 160.',
            'Eu tenho que escolher um desses três lugares?',
            'Você pode escolher um deles ou experimentar outro.',
          ),
          entrada(
            'F3P7-R01',
            'Agora teste o novo caminho. Clique em Atualizar, busque a chave no lugar escolhido e leve até a porta do farol. A luz deve acender, e o barco deve chegar.',
            'Mudei o caminho, mas a missão continua a mesma!',
            'Clique em Atualizar mais uma vez: a chave deve voltar ao lugar que você escolheu. Agora o jogo está do seu jeito! Clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-posicionar-chave',
      'Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave, como x 160 e y 250 para a parte de baixo. Teste o caminho até a chave e até a porta do farol. Depois clique em Enviar meu projeto e confirme em Enviar. Se mudar alguma coisa depois de enviar, clique em Enviar de novo e confirme em Reenviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
    ),
    video(
      'video-d3-fecho',
      'Publique seu jogo',
      'desafio-dia-3.roteiro.md',
      'Usar o mesmo projeto da seção anterior. Compartilhar, manter o resumo (na aula o título vem do curso e não aparece), Gerar capa, conferir, Publicar e comemorar com a criança (Seu jogo está no Mural! Agora a família e os amigos podem jogar), Copiar link de jogar e convidar a mandar para os amigos e a família, com ajuda de um adulto se precisar, Fechar e Concluir fase. Outra capa fica no Como Fazer. Depois de publicar, Compartilhar fica travado neste navegador; para repetir a tomada, usar outro perfil de ensaio com o projeto já enviado e acesso ao Mural. O aviso amarelo de que a versão do Mural é uma cópia não precisa ser lido.',
      {
        nome: 'Debinha',
        entradas: [
          entrada(
            'F3P8-D01',
            'Agora você, a sua família e os seus amigos podem jogar o jogo que você criou.',
            'Quero mandar o jogo para os meus amigos!',
            'Para isso, clique em Copiar link de jogar',
          ),
        ],
      },
    ),
    fala(
      'ponte-d3-publicar',
      'Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Depois clique em Fechar e em Concluir fase.',
    ),
    projeto('dia-3'),
    ajudaComoFazer('ajuda-publicar', 'Para consultar ao publicar', [
      ['plataforma-publicar-no-mural', 'Como publicar seu jogo no Mural'],
    ]),
  ],
  sections: [
    secao(
      'condicao',
      'O que a porta precisa?',
      'exploration',
      'Experimentar a mesma porta sem e com chave antes de programar a condição.',
      ['video-d3-condicao', 'ponte-d3-condicao', 'experiencia-porta'],
      ['video-d3-condicao', 'experiencia-porta'],
    ),
    secao(
      'sem-chave',
      'Avise quando faltar a chave',
      'application',
      'Programar o encontro com o farol e a resposta sem chave, mantendo então vazio por enquanto.',
      ['video-d3-sem-chave', 'ponte-d3-sem-chave'],
      ['video-d3-sem-chave'],
      'projeto',
      portaSemChave,
    ),
    secao(
      'decisao',
      'Acenda o farol com a chave',
      'application',
      'Completar então, testar os dois caminhos e o reinício e verificar as regras antes de personalizar.',
      ['video-d3-decisao', 'ponte-d3-decisao'],
      ['video-d3-decisao'],
      'projeto',
      portaCompleta,
    ),
    secao(
      'personalizar',
      'Deixe o jogo com a sua cara',
      // Personalização antes do envio e da publicação, no mesmo projeto. Uma ideia só
      // (decisão da dona, 06/10/2026): trocar imagens pelas do mesmo tipo, o farol em par. A
      // verificação confere só que o farol continua acendendo, com qualquer modelo.
      'application',
      'Escolher personagem, barco, chave, o par do farol e cenário com imagens do mesmo tipo e testar.',
      ['video-d3-personalizar', 'ponte-d3-personalizar'],
      ['video-d3-personalizar'],
      'projeto',
      farolEscolhido,
    ),
    secao(
      // A chave fica a mesma desde 06/10/2026: a parte só perdeu o farol, que foi para
      // `personalizar`, e manter a chave preserva o id da seção e dos blocos no Admin.
      'farol-mensagens',
      'Escreva seus avisos',
      // Avisos livres no projeto já verificado: fechamento sem novo critério de texto.
      'closing',
      'Escrever os quatro avisos do jogo com as próprias palavras e testar.',
      ['video-d3-farol-mensagens', 'ponte-d3-farol-mensagens'],
      ['video-d3-farol-mensagens'],
      'projeto',
    ),
    secao(
      'posicao',
      'Como escolher um lugar para a chave',
      'exploration',
      'Experimentar a posição horizontal e vertical antes de escolher onde a chave fica no jogo.',
      ['video-d3-posicao', 'ponte-d3-posicao', 'experiencia-posicao'],
      ['video-d3-posicao', 'experiencia-posicao'],
    ),
    // Envio único (11/10/2026): só depois das imagens, avisos e posição da chave. O envio em dia
    // impede avançar com uma versão antiga se a criança editar novamente após enviar aqui.
    comEnvioEmDia(
      secao(
        'posicionar-chave',
        'Escolha onde fica a chave',
        'delivery',
        'Escolher uma posição visível e alcançável para a chave, testar o percurso completo e enviar o jogo.',
        ['video-d3-posicionar-chave', 'ponte-d3-posicionar-chave', 'projeto'],
        ['video-d3-posicionar-chave', 'projeto'],
        'projeto',
      ),
    ),
    secao(
      'fecho',
      'Publique seu jogo',
      'closing',
      'Publicar o projeto construído no Mural e concluir a aula.',
      ['video-d3-fecho', 'ponte-d3-publicar', 'ajuda-publicar'],
      ['video-d3-fecho'],
      'projeto',
    ),
  ],
}

/** Links do Como Fazer: abrem na mesma aba, com retorno à fase preservado pelo member-shell. */
function linksComoFazer(links: Array<[slug: string, label: string]>) {
  return links.map(([slug, label]) => ({
    id: `link-${slug}`,
    kind: 'link' as const,
    url: `/como-fazer/${slug}`,
    label,
  }))
}

/** Ajuda opcional numa fase sem Mapa: o único bloco de materiais dela. */
function ajudaComoFazer(key: string, title: string, links: Array<[slug: string, label: string]>) {
  return {
    key,
    content: { kind: 'materials' as const, title, items: linksComoFazer(links) },
  }
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado',
  retireBlockKeys: ['video-pitch', 'fala-pitch', 'video-pitch-farol', 'link-comunidade'],
  blocks: [
    fala('fala-revisao-final', farol.intro),
    { key: 'quiz-revisao-final', content: farol.content },
    video(
      'video-certificado-farol',
      'Comemore sua criação',
      'desafio-certificado.roteiro.md',
      'Comemorar o jogo do jeito que a criança escolheu e as regras que ela programou (o personagem que anda, a coleta da chave e o farol que confere a chave) com a fala: "Você terminou A Chave do Farol! Olha só o seu jogo, do jeito que você escolheu, e o que você programou: o personagem que anda, o jogo que guarda a chave e o farol que confere se ela foi encontrada. São essas regras que fazem o seu jogo funcionar, e quem montou foi você!". Esta parte não tem Estúdio: no "Olha só", mostrar o jogo da demonstração do Dia 3 (pirata, barco pirata, chave de estrela, farol de pedra, noite na ilha), gravado antes na conta de ensaio, com o farol aceso e o barco chegando. O preparo do cenário, dos desenhos e do barco é informação interna da equipe, sem ressalva na comemoração. Mostrar Pegar meu certificado numa conta com os Dias 1 a 3 concluídos, a revisão aprovada e nenhum certificado emitido; esperar o certificado baixar e encerrar em Concluir fase. Não incluir pitch comercial.',
      {
        nome: 'Dedé',
        entradas: [
          entrada(
            'FCP2-D01',
            'São essas regras que fazem o seu jogo funcionar, e quem montou foi você!',
            'Eu fiz o jogo funcionar!',
            'Parabéns pelo seu jogo! Agora clique em Pegar meu certificado',
          ),
        ],
      },
    ),
    fala(
      'fala-certificado',
      'Parabéns! Você programou o personagem que anda, a coleta da chave e o farol que confere se você tem a chave. Agora clique em Pegar meu certificado para guardar essa conquista e, quando ele baixar, clique em Concluir fase.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou o Desafio do Primeiro Jogo',
        bodyText:
          'Criou A Chave do Farol: o personagem que anda, a coleta da chave e o farol que acende com a chave.',
      },
    },
  ],
  sections: [
    secao(
      'revisao-final',
      farol.title,
      'explanation',
      'Conferir as regras do próprio jogo e corrigir dúvidas antes do certificado.',
      ['fala-revisao-final', 'quiz-revisao-final'],
      ['quiz-revisao-final'],
    ),
    secao(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Emitir e guardar o certificado da aventura concluída.',
      ['video-certificado-farol', 'fala-certificado', 'certificado'],
      ['video-certificado-farol', 'certificado'],
    ),
  ],
}

const generatedFiles: string[] = []
for (const [name, manifest] of [
  ['desafio-dia-1', dia1],
  ['desafio-dia-2', dia2],
  ['desafio-dia-3', dia3],
  ['desafio-certificado', certificado],
] as const) {
  const target = resolve(DIR, `${name}.manifesto.json`)
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
  generatedFiles.push(target)
}

// O inventário atual não pode continuar descrevendo o antigo jogo de nave.
const inventory = resolve(DIR, 'blocos.json')
writeFileSync(inventory, `${JSON.stringify({ blocks: [...studioBlocks].sort() }, null, 2)}\n`)
generatedFiles.push(inventory)

const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...generatedFiles],
  cwd: resolve(import.meta.dir, '../../..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar os manifestos: ${formatted.stderr.toString()}`)
}
