/**
 * A fonte editorial da missão do Construtor, "A Estação de Reciclagem": as falas gravadas (com as
 * marcas do ElevenLabs), as notas de tela, as falas do Zappy na página e o Passo a passo das duas
 * dimensões. O gerador (`gerar-estacao-reciclagem.ts`, com o gerador comum `poder-gerador.ts`) monta
 * manifestos, roteiros e caderno a partir daqui.
 *
 * Missão do posto, no molde do Jardim Secreto (a missão do Faísca): a Estação não ensina o passo a
 * passo, porque montar o jogo é o desafio para subir de posto, e tudo já foi ensinado nos cursos
 * base (a Nave Contra Asteroides, em 2D, e a Patrulha Espacial, em 3D), com outro tema. Cada aula tem
 * a abertura com o jogo pronto, quatro etapas e o fim:
 * - cada etapa mostra o que o jogo precisa fazer (o jogo do começo da etapa e as animações da edição)
 *   e diz em que aula do curso base aquilo foi ensinado; nenhum bloco é montado no vídeo, e o
 *   Verificar projeto confere pelo que o jogo faz (e, no que o tempo do teste não alcança, pelos
 *   blocos, sem pedir nomes novos);
 * - a última etapa é o pedido da equipe (a meta nova) e envia o projeto; depois do envio, o fim da
 *   Aula 1 entrega o Passo a passo do projeto (o caderno, com as duas aulas), e o fim da Aula 2 é só a
 *   comemoração;
 * - sem dicas e sem quiz: quem tiver dúvida volta na aula do curso base;
 * - a Debinha (Aula 1) e o Dedé (Aula 2) fazem as perguntas marcadas em `kids`.
 *
 * O jogo (`estacao-projeto.ts`): três esteiras, com as recicláveis nas duas das bordas e as pilhas e
 * lâmpadas na do meio. O coletor começa no meio, embaixo das proibidas; segurar uma seta o leva até a
 * borda, embaixo de uma esteira de recicláveis. No 2D (800 × 480) o coletor anda 360 pixels por
 * segundo e chega à borda em cerca de 1 s; no 3D, 7 unidades por segundo, cerca de 0,8 s. Os tempos
 * das setas no Na tela são estimativas: acertar no Verificar plano.
 */
import { ESTACAO_REGRAS, type EstacaoDimensao, type EstacaoEtapa } from './estacao-projeto'
import type { PoderTrecho } from './poder-gerador'

export type EstacaoTrecho = PoderTrecho<EstacaoEtapa>

const R2 = ESTACAO_REGRAS['2d']
const R3 = ESTACAO_REGRAS['3d']
const num = (n: number) => String(n).replace('.', ',')

// ── Os pontos do 2D (800 × 480) ─────────────────────────────────────────────
const COLETOR_2D = '[apontar prévia 400 430]'
const ESTEIRA_ESQUERDA_2D = '[apontar prévia 112 200]'
const ESTEIRA_DO_MEIO_2D = '[apontar prévia 400 200]'
const PLACAR_2D = '[apontar prévia 70 32]'
const META_2D = '[apontar prévia 720 32]'
const VIDAS_2D = '[apontar prévia 50 52]'
// ── Os pontos do 3D (a prévia do Estúdio, 640 × 360) ────────────────────────
const COLETOR_3D = '[apontar prévia 320 290]'
const FUNDO_3D = '[apontar prévia 320 150]'
const PLACAR_3D = '[apontar prévia 590 16]'

// ── A missão: o vídeo mostra o que o jogo precisa fazer e nunca monta os blocos ──
/** O fim de uma etapa: a criança programa e verifica sozinha. */
const SUA_VEZ = (teste: string) =>
  `[upbeat, encouraging voice] Agora é com você! ${teste} [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** O fim da última etapa, que envia o projeto. */
const ENVIE =
  '[upbeat, encouraging voice] Agora é com você! [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. [engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Próxima parte.'
const FIM_DA_ETAPA =
  'Nada de abrir a paleta nem mexer nos blocos: a montagem é da criança, e o vídeo termina com o Estúdio aberto.'
const FIM_DO_ENVIO =
  'Nada de abrir a paleta, mexer nos blocos nem enviar: a montagem e o envio são da criança, e o vídeo termina com o Estúdio aberto.'
const VERIFICAR_E_FALTA =
  '[engaging, energetic, conversational voice] Para saber se deu certo, clique em Verificar projeto. Olha: ele mostra o que ainda falta no seu jogo.'
const TELA_VERIFICAR_E_FALTA =
  'No "Para saber se deu certo, clique em Verificar projeto", verificar [verificar projeto]. No "ele mostra o que ainda falta", apontar os objetivos [apontar "Objetivos do projeto"].'
/** O Passo a passo chega no fim da aula, depois do envio: para conferir e entender, não para copiar. */
const FALA_DO_CADERNO =
  '[engaging, energetic, conversational voice] Aqui está o Passo a passo do projeto. Nele está um jeito de montar cada etapa da missão, bloco por bloco, em duas dimensões e em três. [engaging, energetic, conversational voice] Use para conferir o seu jogo e entender cada escolha. O seu jeito pode ser diferente e estar certo também, porque o Verificar projeto confere o que o jogo faz. [upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material.'
const TELA_DO_CADERNO =
  'No "Aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele está um jeito de montar", colocar o livro em tela cheia [livro tela cheia]. No "cada etapa da missão", passar da capa para a página seguinte [livro próxima]. No "em duas dimensões e em três", passar mais uma página [livro próxima]. No "Use para conferir o seu jogo", passar mais uma página [livro próxima]. No "O seu jeito pode ser diferente", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em Concluir aula", clicar em **Concluir aula** [concluir aula]. Não demonstrar a impressão nem os controles do leitor.'

export const estacaoAulas: {
  slug: string
  title: string
  dimension: EstacaoDimensao
  trechos: EstacaoTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Monte a Estação de Reciclagem em 2D',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'Conheça sua missão',
        kind: 'intro',
        kids: ['E se o coletor pegar uma pilha?'],
        screen:
          'Do "Oi" até o "A Estação de Reciclagem", a tela mostra o título A Estação de Reciclagem sobre a abertura do jogo pronto [na edição: título A Estação de Reciclagem]. No "Para começar, aperte Enter", ampliar o jogo pronto [ampliar jogo] e começar a partida [tecla Enter]. No "as peças descem pelas esteiras", apontar a esteira da esquerda [apontar jogo 112 200]. No "As do aro verde são recicláveis", a edição destaca uma peça de aro verde [na edição: círculo verde em volta de uma garrafa da esteira da esquerda]. No "As do aro vermelho", a edição destaca uma pilha [na edição: círculo vermelho em volta de uma pilha da esteira do meio]. No "Olha: eu seguro a seta da esquerda", levar o coletor até a borda [segurar tecla ArrowLeft por 1,2 s]. No "o placar sobe", apontar o placar [apontar jogo 70 32]. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar até o fim: o resultado é da criança.',
        ponte:
          'Sua vez! Jogue a versão pronta: aperte Enter, use as setas para mover o coletor, recolha as peças do aro verde e desvie das pilhas e lâmpadas, as do aro vermelho. Quando terminar, clique em Próxima parte.',
        text: `[upbeat, welcoming voice] Oi! Você já criou a Nave Contra Asteroides e a Patrulha Espacial. Agora chegou a sua missão do Construtor: montar A Estação de Reciclagem! [engaging, energetic, conversational voice] Na estação, três esteiras trazem peças até o depósito, e você controla o coletor, aqui embaixo. Para começar, aperte Enter. [interested, animated voice] Olha: as peças descem pelas esteiras. As do aro verde são recicláveis: cada uma que o coletor pega vale um ponto. As do aro vermelho são pilhas e lâmpadas, que não podem ir para a reciclagem comum. [interested, animated voice] Olha: eu seguro a seta da esquerda, o coletor vai até a esteira de lá, pega uma garrafa, e o placar sobe. [curious] E se o coletor pegar uma pilha? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. Junte ${R2.meta} peças para cumprir a meta, e cuide das três vidas. [confident, clear, unhurried voice] Esta missão é diferente das aulas que você já fez: agora, quem programa o jogo é você, sem eu montar os blocos junto. Em cada parte, eu mostro o que o jogo precisa fazer, e você programa no Estúdio. [reassuring, encouraging voice] As telas, o Enter, o coletor e o recomeço já vêm prontos. As regras da partida são suas, e você já sabe tudo o que precisa, porque aprendeu na Nave Contra Asteroides. Se esquecer como se faz alguma coisa, eu digo em qual aula você aprendeu, e é só voltar lá. [engaging, energetic, conversational voice] Nesta aula, a estação é numa tela plana, em duas dimensões. Na próxima, ela vira um galpão de verdade, em três dimensões. [upbeat, encouraging voice] Agora é a sua vez: jogue uma partida. Quando terminar, clique em Próxima parte.`,
      },
      {
        key: 'esteira',
        title: 'As peças chegam pelas esteiras',
        kind: 'build',
        etapa: 'esteira',
        screen: `A parte começa com o Estúdio expandido e o projeto do começo da aula [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e aperte Enter", começar a partida [tecla Enter]. No "O coletor anda", levar o coletor um pouco para a esquerda [segurar tecla ArrowLeft por 0,5 s]. No "mas as esteiras continuam vazias", apontar a esteira da esquerda ${ESTEIRA_ESQUERDA_2D}. No "Primeira: a cada ${num(R2.intervaloReciclavel)} segundo", a edição mostra o jogo pronto [na edição: animação de duas garrafas nascendo juntas no alto, uma em cada esteira da borda, a cada ${num(R2.intervaloReciclavel)} s]. No "Segunda: a cada ${num(R2.intervaloProibido)} segundos", a edição mostra a esteira do meio [na edição: animação de uma pilha nascendo no alto da esteira do meio, a cada ${num(R2.intervaloProibido)} s]. No "Terceira: as peças descem", a edição mostra as peças andando [na edição: animação das peças descendo e sumindo do grupo ao passar da borda de baixo]. No "Quarta: nada disso acontece antes do Enter", a edição mostra a abertura parada [na edição: animação da tela de abertura, sem nenhuma peça nascer]. No "aprendeu na Nave Contra Asteroides, Aula 4", a edição mostra de onde vem [na edição: capa da Nave Contra Asteroides, Aula 4, com as partes Prepare o grupo e o relógio, Crie os asteroides caindo e Retire os asteroides que escapam]. No "e na Aula 8", a edição mostra a guarda [na edição: capa da Nave Contra Asteroides, Aula 8, com a parte Investigue: e se o laser não esperasse a partida?]. ${TELA_VERIFICAR_E_FALTA} No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte: `Sua vez de programar! A cada ${num(R2.intervaloReciclavel)} s nascem duas recicláveis (uma em cada esteira da borda) e a cada ${num(R2.intervaloProibido)} s nasce uma pilha na esteira do meio. As peças descem e saem do grupo quando passam da tela, e nada nasce antes do Enter. Esqueceu como faz? Volte na Nave Contra Asteroides, Aulas 4 e 8. Quando aparecer Objetivo cumprido!, clique em Próxima parte.`,
        text: `[engaging, energetic, conversational voice] Primeira etapa da missão: as peças chegam pelas esteiras. [engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e aperte Enter. [interested, animated voice] Tá vendo? O coletor anda, mas as esteiras continuam vazias. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer quatro coisas. [engaging, energetic, conversational voice] Primeira: a cada ${num(R2.intervaloReciclavel)} segundo, nascem duas peças recicláveis no alto, uma em cada esteira da borda, no grupo das recicláveis. [engaging, energetic, conversational voice] Segunda: a cada ${num(R2.intervaloProibido)} segundos, nasce uma pilha no alto da esteira do meio, no grupo das proibidas. O lugar de cada esteira está no pedido, e a imagem de cada peça já está nos materiais. [engaging, energetic, conversational voice] Terceira: as peças descem pela esteira, e quem passa da borda de baixo sai do grupo. [engaging, energetic, conversational voice] Quarta: nada disso acontece antes do Enter. Na tela de abertura, nenhuma peça nasce. [reassuring, encouraging voice] Você já sabe fazer tudo isso: aprendeu na Nave Contra Asteroides, Aula 4, quando fez os asteroides cair, e na Aula 8, quando o laser passou a esperar a partida. Se esquecer como faz, volte lá. ${VERIFICAR_E_FALTA} ${SUA_VEZ('Programe no Estúdio e teste antes e depois do Enter.')}`,
      },
      {
        key: 'coleta',
        title: 'Ponto pela reciclável, vida pela pilha',
        kind: 'build',
        etapa: 'coleta',
        kids: ['E se a mesma garrafa encostar no coletor por um tempão?'],
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "aperte Enter", começar a partida [tecla Enter]. No "e leve o coletor até uma esteira da borda", levar o coletor à esquerda [segurar tecla ArrowLeft por 1,2 s]. No "A garrafa passa pelo coletor", apontar o coletor ${COLETOR_2D}. No "e o placar continua no zero", apontar o placar ${PLACAR_2D}. No "Primeira: quando o coletor encosta numa reciclável", a edição mostra o jogo pronto [na edição: animação do coletor encostando numa garrafa, a garrafa sumindo e o placar subindo de 0 para 1]. No "E se a mesma garrafa", manter a prévia parada. No "Por isso, no mesmo encontro", a edição mostra a peça saindo [na edição: animação da garrafa saindo do grupo no mesmo instante em que o placar sobe um]. No "Segunda: quando o coletor encosta numa pilha", a edição mostra a esteira do meio [na edição: animação do coletor encostando numa pilha, a pilha sumindo e um coração apagando]. No "uma vida", apontar as vidas ${VIDAS_2D}. No "na Nave Contra Asteroides, Aula 7", a edição mostra de onde vem [na edição: capa da Nave Contra Asteroides, Aula 7, com as partes Encontre a pedra que bateu na nave e Tire uma vida e dê um respiro]. No "a somar no placar, na Aula 6", a edição mostra a contagem [na edição: capa da Nave Contra Asteroides, Aula 6, com a parte Some no lugar do acerto]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte:
          'Agora os encontros! Quando o coletor encosta numa reciclável, a peça sai do grupo e o placar sobe um. Quando encosta numa pilha ou lâmpada, a peça sai do grupo e o coletor perde uma vida. Esqueceu como faz? Volte na Nave Contra Asteroides, Aulas 6 e 7. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Segunda etapa: os encontros do coletor. [engaging, energetic, conversational voice] Clique em Rodar de novo, aperte Enter e leve o coletor até uma esteira da borda. [interested, animated voice] Tá vendo? A garrafa passa pelo coletor, e o placar continua no zero. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: quando o coletor encosta numa reciclável, o placar sobe um ponto. [curious] E se a mesma garrafa encostar no coletor por um tempão? [engaging, energetic, conversational voice] O jogo confere os encontros a cada quadro: se a peça continuar ali, ela conta de novo e de novo. Por isso, no mesmo encontro, a peça sai do grupo. Assim cada peça vale um ponto só. [engaging, energetic, conversational voice] Segunda: quando o coletor encosta numa pilha ou lâmpada, a peça sai do grupo e o coletor perde uma vida. [reassuring, encouraging voice] Você aprendeu o encontro de um sprite com um grupo e a perda de vida na Nave Contra Asteroides, Aula 7, e a somar no placar, na Aula 6. Se esquecer como faz, volte lá. ${SUA_VEZ('Programe no Estúdio e teste nas duas esteiras: na da borda e na do meio.')}`,
      },
      {
        key: 'resultado',
        title: 'A partida termina',
        kind: 'build',
        etapa: 'resultado',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "aperte Enter", começar a partida [tecla Enter]. No "deixe o coletor no meio", manter o coletor parado embaixo da esteira do meio ${ESTEIRA_DO_MEIO_2D}. No "As vidas acabam", apontar as vidas, já sem nenhum coração [apontar prévia 50 52]. No "e as pilhas continuam chegando", apontar a esteira do meio ${ESTEIRA_DO_MEIO_2D}. No "Primeira: quando as vidas do coletor acabam", a edição mostra o jogo pronto [na edição: animação do último coração apagando e a tela Vamos tentar outra vez? aparecendo]. No "Segunda: quando o placar chega à meta", a edição mostra a vitória [na edição: animação do placar chegando a ${R2.meta}, igual à meta no canto direito, e a tela Meta cumprida! aparecendo]. No "A meta já está no jogo", apontar a meta ${META_2D}. No "na Nave Contra Asteroides, Aula 9", a edição mostra de onde vem [na edição: capa da Nave Contra Asteroides, Aula 9, com as partes Chame a vitória ao completar a meta e Escolha um único resultado]. No "O Enter da tela final", a edição mostra o recomeço [na edição: animação do Enter na tela final voltando à abertura, com placar zero, três corações e as esteiras vazias]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte:
          'Agora o fim da partida! Quando as vidas do coletor acabam, o jogo vai para a derrota; quando o placar chega à meta, vai para a vitória. Pergunte primeiro pelas vidas. Esqueceu como faz? Volte na Nave Contra Asteroides, Aula 9. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Terceira etapa: a partida termina. [engaging, energetic, conversational voice] Clique em Rodar de novo, aperte Enter e deixe o coletor no meio, embaixo das pilhas. [interested, animated voice] Tá vendo? As vidas acabam, e as pilhas continuam chegando. A partida nunca termina. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: quando as vidas do coletor acabam, o jogo vai para a derrota. [engaging, energetic, conversational voice] Segunda: quando o placar chega à meta, o jogo vai para a vitória. A meta já está no jogo: é a variável meta, que aparece aqui no canto. [reassuring, encouraging voice] Você aprendeu os dois resultados na Nave Contra Asteroides, Aula 9: lá, a pergunta das vidas vem primeiro, para a partida terminar de um jeito só. Se esquecer como faz, volte lá. [engaging, energetic, conversational voice] O Enter da tela final já está pronto: ele volta à abertura com o placar zerado, três vidas e as esteiras vazias. ${SUA_VEZ('Programe no Estúdio e teste os dois finais: perdendo as vidas e completando a meta.')}`,
      },
      {
        key: 'meta-nova',
        title: 'A equipe pediu uma meta nova',
        kind: 'delivery',
        etapa: 'meta-nova',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "a equipe da estação mandou um pedido", a edição mostra o recado [na edição: um bilhete da equipe com o texto Nova meta: ${R2.metaNova} peças]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "a meta ainda é ${R2.meta}", apontar a meta ${META_2D}. No "Primeira: o jogo começa com a meta ${R2.metaNova}", a edição mostra a meta nova [na edição: animação do número da meta, no canto direito, trocando de ${R2.meta} para ${R2.metaNova}]. No "Segunda: a vitória acompanha", a edição mostra os dois testes [na edição: animação do placar passando de ${R2.meta} sem vitória e a tela Meta cumprida! aparecendo só no ${R2.metaNova}]. No "na Nave Contra Asteroides, Aula 9", a edição mostra de onde vem [na edição: capa da Nave Contra Asteroides, Aula 9, com a parte Prepare a meta e mostre o progresso]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. No "clique em Enviar meu projeto", apontar o botão, sem clicar [apontar "Enviar meu projeto"]. ${FIM_DO_ENVIO}`,
        ponte: `Última etapa! A equipe pediu meta ${R2.metaNova}. Mude a meta e descubra qual condição precisa acompanhar essa mudança, para a vitória chegar no ${R2.metaNova} e não antes. Esqueceu como faz? Volte na Nave Contra Asteroides, Aula 9. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.`,
        text: `[engaging, energetic, conversational voice] Última etapa da missão: a equipe da estação mandou um pedido. A meta agora é ${R2.metaNova} peças. [engaging, energetic, conversational voice] Clique em Rodar de novo e repare: a meta ainda é ${R2.meta}. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: o jogo começa com a meta ${R2.metaNova}, e o canto da tela mostra o número novo. [engaging, energetic, conversational voice] Segunda: a vitória acompanha a meta nova. Com ${R2.meta} peças a partida continua, e só no ${R2.metaNova} vem a vitória. [thoughtful] Pense: qual condição do seu jogo precisa acompanhar essa mudança? Ache onde a meta é criada e onde a vitória confere o placar. [reassuring, encouraging voice] Você aprendeu a guardar a meta e a comparar o placar com ela na Nave Contra Asteroides, Aula 9, na parte Prepare a meta e mostre o progresso. Se esquecer como faz, volte lá. ${ENVIE}`,
      },
      {
        key: 'missao-cumprida',
        title: 'Sua estação 2D está pronta',
        kind: 'material',
        screen: `No "Pronto, a sua estação", a edição mostra o jogo pronto [na edição: a estação 2D com a tela Meta cumprida!]. ${TELA_DO_CADERNO}`,
        ponte:
          'Sua estação 2D está pronta! O Passo a passo do projeto mostra um jeito de montar cada etapa, nas duas dimensões. Use para conferir e entender: o seu jeito pode ser diferente e estar certo. Depois clique em Concluir aula.',
        text: `[excited] Pronto, a sua estação em duas dimensões está funcionando: as peças chegam, o coletor recolhe, e a partida termina com vitória ou derrota. ${FALA_DO_CADERNO} [upbeat, encouraging voice] Na próxima aula, você leva a mesma partida para um galpão em três dimensões. Agora clique em Concluir aula.`,
      },
    ],
  },
  {
    slug: 'aula-2',
    title: 'Leve a estação para o galpão 3D',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'A mesma partida, no galpão',
        kind: 'intro',
        kids: ['Será que no galpão as peças também vêm pelo alto?'],
        screen:
          'Do "Oi" até o "um galpão de verdade", a tela mostra o título A Estação de Reciclagem sobre o galpão do jogo pronto [na edição: título A Estação de Reciclagem, Aula 2]. No "Será que no galpão", manter o jogo pronto parado. No "Para começar, aperte Enter", ampliar o jogo pronto [ampliar jogo] e começar a partida [tecla Enter]. No "as peças saem das bocas", apontar o fundo do galpão [apontar jogo 480 250]. No "Olha: eu seguro a seta da direita", levar o coletor à esteira da direita [segurar tecla ArrowRight por 1 s]. No "o placar sobe", apontar o placar [apontar jogo 880 24]. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar até o fim: o resultado é da criança.',
        ponte:
          'Sua vez! Jogue a versão 3D: aperte Enter, use as setas para mover o coletor, recolha as peças do aro verde e desvie das pilhas e lâmpadas. Quando terminar, clique em Próxima parte.',
        text: `[upbeat, welcoming voice] Oi! A sua estação em duas dimensões ficou pronta. Agora a mesma partida vai para um galpão de verdade, em três dimensões. [curious] Será que no galpão as peças também vêm pelo alto? [engaging, energetic, conversational voice] No galpão, as esteiras vêm do fundo até você. Para começar, aperte Enter. [interested, animated voice] Olha: as peças saem das bocas lá no fundo e vêm pelas esteiras até o coletor. As regras são as mesmas: aro verde vale ponto, aro vermelho tira vida. [interested, animated voice] Olha: eu seguro a seta da direita, o coletor vai para a esteira de lá, e o placar sobe. [confident, clear, unhurried voice] Como na primeira aula, quem programa as regras é você. O galpão, a câmera, o coletor andando para os lados e as esteiras levando as peças até você já vêm prontos. [reassuring, encouraging voice] Você já sabe tudo o que precisa, porque aprendeu na Patrulha Espacial. Se esquecer como se faz alguma coisa, eu digo em qual aula você aprendeu. [upbeat, encouraging voice] Agora é a sua vez: jogue uma partida no galpão. Quando terminar, clique em Próxima parte.`,
      },
      {
        key: 'esteira',
        title: 'As bocas soltam as peças',
        kind: 'build',
        etapa: 'esteira',
        screen: `A parte começa com o Estúdio expandido e o projeto do começo da aula [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e aperte Enter", começar a partida [tecla Enter]. No "O coletor anda", levar o coletor um pouco para a direita [segurar tecla ArrowRight por 0,4 s]. No "mas nenhuma peça sai das bocas", apontar o fundo do galpão ${FUNDO_3D}. No "Primeira: a cada ${num(R3.intervaloReciclavel)} segundo", a edição mostra o jogo pronto [na edição: animação de duas garrafas saindo juntas das bocas da esquerda e da direita, a cada ${num(R3.intervaloReciclavel)} s]. No "Segunda: a cada ${num(R3.intervaloProibido)} segundos", a edição mostra a boca do meio [na edição: animação de uma pilha saindo da boca do meio, a cada ${num(R3.intervaloProibido)} s]. No "x menos ${Math.abs(R3.faixas.esquerda)}, zero e ${R3.faixas.direita}", a edição mostra as três posições [na edição: as três esteiras com os números x −${Math.abs(R3.faixas.esquerda)}, 0 e ${R3.faixas.direita} e a boca no z ${R3.nasceZ}]. No "Terceira: nada disso acontece antes do Enter", a edição mostra a abertura parada [na edição: animação da abertura sem nenhuma peça sair]. No "na Patrulha Espacial, Aula 2", a edição mostra de onde vem [na edição: capa da Patrulha Espacial, Aula 2, com as partes Um asteroide a cada intervalo e Uma faixa para as entradas]. ${TELA_VERIFICAR_E_FALTA} No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte: `Sua vez de programar! A cada ${num(R3.intervaloReciclavel)} s saem duas cópias da reciclável (x −${Math.abs(R3.faixas.esquerda)} e x ${R3.faixas.direita}) e a cada ${num(R3.intervaloProibido)} s sai uma cópia da proibida (x 0), todas em y ${num(R3.alturaPeca)} e z ${R3.nasceZ}, cada uma no seu grupo, e só durante a partida. Esqueceu como faz? Volte na Patrulha Espacial, Aula 2. Quando aparecer Objetivo cumprido!, clique em Próxima parte.`,
        text: `[engaging, energetic, conversational voice] Primeira etapa no galpão: as bocas soltam as peças. [engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo e aperte Enter. [interested, animated voice] Tá vendo? O coletor anda, mas nenhuma peça sai das bocas. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer três coisas. [engaging, energetic, conversational voice] Primeira: a cada ${num(R3.intervaloReciclavel)} segundo, saem duas cópias da peça reciclável, uma em cada boca da borda, no grupo das recicláveis. [engaging, energetic, conversational voice] Segunda: a cada ${num(R3.intervaloProibido)} segundos, sai uma cópia da pilha pela boca do meio, no grupo das proibidas. As bocas ficam em x menos ${Math.abs(R3.faixas.esquerda)}, zero e ${R3.faixas.direita}, todas lá no fundo, em z menos ${Math.abs(R3.nasceZ)}. As esteiras já levam as peças até você. [engaging, energetic, conversational voice] Terceira: nada disso acontece antes do Enter. [reassuring, encouraging voice] Você aprendeu a criar cópias pelo relógio e o lugar de cada entrada na Patrulha Espacial, Aula 2. Se esquecer como faz, volte lá. ${VERIFICAR_E_FALTA} ${SUA_VEZ('Programe no Estúdio e teste antes e depois do Enter.')}`,
      },
      {
        key: 'coleta',
        title: 'Os encontros no galpão',
        kind: 'build',
        etapa: 'coleta',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "aperte Enter", começar a partida [tecla Enter]. No "e leve o coletor até uma esteira da borda", levar o coletor à direita [segurar tecla ArrowRight por 1 s]. No "A garrafa passa pelo coletor", apontar o coletor ${COLETOR_3D}. No "e o placar não muda", apontar o placar ${PLACAR_3D}. No "Primeira: quando o coletor encosta numa reciclável", a edição mostra o jogo pronto [na edição: animação do coletor encostando numa garrafa, a garrafa sumindo e o placar no alto mudando de Peças: 0 / ${R3.meta} para Peças: 1 / ${R3.meta}]. No "Segunda: quando encosta numa pilha", a edição mostra a esteira do meio [na edição: animação do coletor encostando numa pilha, a pilha sumindo e um coração apagando]. No "Terceira: os dois encontros só valem durante a partida", a edição mostra a guarda [na edição: o encontro acontecendo só com o jogo na partida]. No "na Patrulha Espacial, Aula 4", a edição mostra de onde vem [na edição: capa da Patrulha Espacial, Aula 4, com as partes A batida tira uma vida e Só a pedra da batida sai]. No "e o placar, na Aula 3", a edição mostra a contagem [na edição: capa da Patrulha Espacial, Aula 3, com as partes Cada acerto soma um e Veja a contagem na tela]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte: `Agora os encontros no galpão! Com uma reciclável: a peça sai do grupo, o placar soma um e o texto Peças mostra a conta. Com uma pilha ou lâmpada: a peça sai do grupo e o coletor perde uma vida. Os dois só valem durante a partida. Esqueceu como faz? Volte na Patrulha Espacial, Aulas 3 e 4. Quando aparecer Objetivo cumprido!, clique em Próxima parte.`,
        text: `[engaging, energetic, conversational voice] Segunda etapa: os encontros no galpão. [engaging, energetic, conversational voice] Clique em Rodar de novo, aperte Enter e leve o coletor até uma esteira da borda. [interested, animated voice] Tá vendo? A garrafa passa pelo coletor, e o placar não muda. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer três coisas. [engaging, energetic, conversational voice] Primeira: quando o coletor encosta numa reciclável, a peça sai do grupo, o placar soma um, e o texto no alto mostra a conta nova, com a meta junto. [engaging, energetic, conversational voice] Segunda: quando encosta numa pilha ou lâmpada, a peça sai do grupo e o coletor perde uma vida. [engaging, energetic, conversational voice] Terceira: os dois encontros só valem durante a partida, como as outras regras do galpão. [reassuring, encouraging voice] Você aprendeu o encontro com um grupo e a vida que cai na Patrulha Espacial, Aula 4, e o placar, na Aula 3. Se esquecer como faz, volte lá. ${SUA_VEZ('Programe no Estúdio e teste nas duas esteiras: na da borda e na do meio.')}`,
      },
      {
        key: 'resultado',
        title: 'O galpão também termina a partida',
        kind: 'build',
        etapa: 'resultado',
        kids: ['E quando acaba, como começa outra partida?'],
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "aperte Enter", começar a partida [tecla Enter]. No "deixe o coletor no meio", manter o coletor parado no meio ${COLETOR_3D}. No "As vidas acabam", apontar as vidas, no canto de cima [apontar prévia 40 16]. No "e o jogo continua", apontar a boca do meio ${FUNDO_3D}. No "Primeira: quando a vida do coletor chega a zero", a edição mostra o jogo pronto [na edição: animação do último coração apagando e a tela Vamos tentar outra vez? aparecendo]. No "Segunda: quando o placar chega à meta", a edição mostra a vitória [na edição: animação do placar chegando a Peças: ${R3.meta} / ${R3.meta} e a tela Meta cumprida! aparecendo]. No "na Patrulha Espacial, Aula 5", a edição mostra de onde vem [na edição: capa da Patrulha Espacial, Aula 5, com as partes Quando as vidas acabam e Vinte acertos abrem a rota]. No "E quando acaba", manter a prévia parada. No "o botão Voltar ao início", a edição mostra o botão da tela final [na edição: o botão Voltar ao início, levando à abertura com zero peças, três vidas e as esteiras vazias]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte:
          'Agora os finais no galpão! Vida zero: o estado vira derrota e vem o Fim de jogo perdeu. Placar na meta: o estado vira vitória e vem o Fim de jogo ganhou. Pergunte primeiro pela vida. Esqueceu como faz? Volte na Patrulha Espacial, Aula 5. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Terceira etapa: o galpão também termina a partida. [engaging, energetic, conversational voice] Clique em Rodar de novo, aperte Enter e deixe o coletor no meio. [interested, animated voice] Tá vendo? As vidas acabam, e o jogo continua. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: quando a vida do coletor chega a zero, o estado vira derrota, e o jogo mostra o fim de jogo de quem perdeu. [engaging, energetic, conversational voice] Segunda: quando o placar chega à meta, o estado vira vitória, e o jogo mostra o fim de jogo de quem ganhou. A meta é a variável meta, como na primeira aula. [reassuring, encouraging voice] Você aprendeu os dois finais na Patrulha Espacial, Aula 5: a vida primeiro, e a vitória no senão. Se esquecer como faz, volte lá. [curious] E quando acaba, como começa outra partida? [engaging, energetic, conversational voice] Isso já vem pronto: o botão Voltar ao início, na tela final, prepara uma partida nova, com zero peças e três vidas. ${SUA_VEZ('Programe no Estúdio e teste os dois finais.')}`,
      },
      {
        key: 'meta-nova',
        title: 'Uma meta nova para o galpão',
        kind: 'delivery',
        etapa: 'meta-nova',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "a equipe do galpão mandou outro pedido", a edição mostra o recado [na edição: um bilhete da equipe com o texto Nova meta: ${R3.metaNova} peças]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "o placar ainda conta até ${R3.meta}", apontar o placar ${PLACAR_3D}. No "Primeira: o jogo começa com a meta ${R3.metaNova}", a edição mostra a meta nova [na edição: o texto Peças: 0 / ${R3.metaNova} no alto]. No "Segunda: a vitória acompanha", a edição mostra os dois testes [na edição: animação do placar passando de ${R3.meta} sem fim de jogo e a vitória só no ${R3.metaNova}]. No "na Patrulha Espacial, Aula 5", a edição mostra de onde vem [na edição: capa da Patrulha Espacial, Aula 5, com a parte Vinte acertos abrem a rota]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. No "clique em Enviar meu projeto", apontar o botão, sem clicar [apontar "Enviar meu projeto"]. ${FIM_DO_ENVIO}`,
        ponte: `Última etapa! A equipe do galpão pediu meta ${R3.metaNova}. Mude a meta e confira qual condição precisa acompanhar essa mudança: a vitória chega no ${R3.metaNova}, e o placar mostra a meta nova. Esqueceu como faz? Volte na Patrulha Espacial, Aula 5. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.`,
        text: `[engaging, energetic, conversational voice] Última etapa: a equipe do galpão mandou outro pedido. A meta agora é ${R3.metaNova} peças. [engaging, energetic, conversational voice] Clique em Rodar de novo e repare: o placar ainda conta até ${R3.meta}. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: o jogo começa com a meta ${R3.metaNova}, e o texto no alto mostra a meta nova. [engaging, energetic, conversational voice] Segunda: a vitória acompanha. Com ${R3.meta} peças a partida continua, e só no ${R3.metaNova} vem o fim de jogo de quem ganhou. [thoughtful] Pense de novo: qual condição precisa acompanhar essa mudança? [reassuring, encouraging voice] Você aprendeu a condição de vitória na Patrulha Espacial, Aula 5, na parte Vinte acertos abrem a rota. Se esquecer como faz, volte lá. ${ENVIE}`,
      },
      {
        key: 'missao-cumprida',
        title: 'Missão cumprida!',
        kind: 'fecho',
        screen:
          'Do "Missão cumprida" até o fim, a edição mostra o galpão do jogo pronto com a tela Meta cumprida! [na edição: o galpão 3D com a tela de vitória]. No "duas dimensões", a edição mostra a estação 2D [na edição: a estação 2D ao lado do galpão 3D]. No "Agora clique em Concluir aula", clicar em **Concluir aula** [concluir aula].',
        ponte:
          'Missão cumprida! A sua Estação de Reciclagem funciona em 2D e no galpão 3D, com as regras que você programou. Clique em Concluir aula.',
        text: '[excited] Missão cumprida! A sua Estação de Reciclagem funciona em duas dimensões e no galpão em três. [warmly] Você programou os relógios, os encontros, o placar, as vidas e os dois finais, e ainda acompanhou o pedido da equipe nas duas versões. Isso é coisa de construtora e de construtor de verdade. [upbeat, encouraging voice] Agora clique em Concluir aula.',
      },
    ],
  },
]

/** O Passo a passo de cada etapa, nas duas dimensões (o caderno e o `passo-a-passo.md`). */
export function estacaoAjuda(d: EstacaoDimensao) {
  const r = ESTACAO_REGRAS[d]
  if (d === '2d') {
    const f = ESTACAO_REGRAS['2d'].faixas
    return [
      {
        key: 'esteira',
        title: 'As peças chegam pelas esteiras',
        idea: 'Dois relógios criam as peças só durante a partida; o quadro do jogo as move e tira do grupo quem sai da tela.',
        steps: [
          `Em ⚡ Quando acontecer, coloque um bloco A cada ${num(r.intervaloReciclavel)} segundos. Dentro dele, um Se o estado do jogo é jogando.`,
          `No então, use duas vezes o No grupo reciclaveis criar um sprite: um em x ${f.esquerda} e outro em x ${f.direita}, os dois em y ${ESTACAO_REGRAS['2d'].nasceY}, largura e altura ${ESTACAO_REGRAS['2d'].peca}, com a imagem da reciclável, vx 0 e vy ${ESTACAO_REGRAS['2d'].velocidade}.`,
          `Coloque outro A cada ${num(r.intervaloProibido)} segundos com o mesmo Se. No então, No grupo proibidos criar um sprite em x ${f.meio}, com a imagem da pilha e as mesmas medidas.`,
          'No A cada quadro do jogo, dentro do Se jogando que já existe, coloque Mover os sprites do grupo reciclaveis usando suas velocidades e o mesmo para proibidos.',
          'Logo depois, Tirar do grupo reciclaveis quem sair da tela e o mesmo para proibidos.',
        ],
        test: 'Rode e espere sem apertar Enter: nada nasce. Aperte Enter: as peças nascem e descem.',
        correction:
          'Se nascerem peças na abertura, falta o Se jogando dentro do A cada. Se as peças ficarem paradas, confira o Mover os sprites do grupo.',
      },
      {
        key: 'coleta',
        title: 'Ponto pela reciclável, vida pela pilha',
        idea: 'Cada encontro do coletor com um grupo tira a peça do grupo e muda uma conta uma vez só.',
        steps: [
          'No A cada quadro do jogo, dentro do Se jogando, coloque Para cada sprite do grupo reciclaveis que colidir com o sprite coletor.',
          'Dentro dele, Tirar o sprite (a peça do encontro) do grupo reciclaveis e Somar 1 em variável pontos.',
          'Coloque outro Para cada sprite do grupo proibidos que colidir com o sprite coletor.',
          'Dentro dele, Tirar o sprite do grupo proibidos e Machucar o sprite coletor em 1, invencível por 60 quadros.',
        ],
        test: 'Leve o coletor até uma esteira da borda: cada garrafa soma um ponto. Fique no meio: cada pilha apaga um coração.',
        correction:
          'Se o placar disparar, a peça não está saindo do grupo no encontro. Se a vida não cair, confira o Machucar dentro do encontro com proibidos.',
      },
      {
        key: 'resultado',
        title: 'A partida termina',
        idea: 'A cada quadro, primeiro a pergunta das vidas; no senão, a pergunta da meta.',
        steps: [
          'No A cada quadro do jogo, dentro do Se jogando, depois dos encontros, coloque um Se as vidas do sprite coletor acabaram?',
          'No então, Mudar o estado do jogo para derrota.',
          'No senão, outro Se pontos ≥ meta, com Mudar o estado do jogo para vitoria no então.',
        ],
        test: 'Fique no meio até as vidas acabarem: aparece a derrota. Recolha as peças até a meta: aparece a vitória. O Enter da tela final volta à abertura.',
        correction:
          'Se as duas telas brigarem, confira se a pergunta da meta está no senão da pergunta das vidas.',
      },
      {
        key: 'meta-nova',
        title: 'A equipe pediu uma meta nova',
        idea: 'A vitória compara o placar com a variável meta: mudar a meta muda a vitória e o número no canto.',
        steps: [
          `Em Ao iniciar, troque o valor de Criar variável meta para ${r.metaNova}.`,
          'Confira a vitória: ela compara pontos com a variável meta, não com um número escrito.',
        ],
        test: `Jogue: com ${r.meta} peças a partida continua, e a vitória vem no ${r.metaNova}.`,
        correction: `Se a vitória chegar no ${r.meta}, a condição está com o número escrito. Troque o número pela variável meta.`,
      },
    ]
  }
  const f = ESTACAO_REGRAS['3d'].faixas
  return [
    {
      key: 'esteira-3d',
      title: 'As bocas soltam as peças',
      idea: 'Dois relógios criam cópias das peças nas bocas do fundo, só durante a partida. As esteiras já levam as peças.',
      steps: [
        `Coloque um A cada ${num(r.intervaloReciclavel)} segundos. Dentro dele, um Se estado = jogando.`,
        `No então, use duas vezes o Criar uma cópia de moldeReciclavel no grupo reciclaveis: em x ${f.esquerda} e em x ${f.direita}, os dois em y ${num(R3.alturaPeca)} e z ${R3.nasceZ}.`,
        `Coloque outro A cada ${num(r.intervaloProibido)} segundos com o mesmo Se, criando uma cópia de moldeProibido no grupo proibidos em x ${f.meio}, y ${num(R3.alturaPeca)} e z ${R3.nasceZ}.`,
      ],
      test: 'Rode e espere sem apertar Enter: nada sai das bocas. Aperte Enter: as peças saem e vêm até você.',
      correction: 'Se sair peça na abertura, falta o Se estado = jogando dentro do A cada.',
    },
    {
      key: 'coleta-3d',
      title: 'Os encontros no galpão',
      idea: 'Os encontros do coletor com cada grupo, com a guarda da partida.',
      steps: [
        'Coloque Quando coletor encostar em algum do grupo reciclaveis, chamando de pecaReciclavel. Dentro, um Se estado = jogando.',
        'No então: Tirar o objeto pecaReciclavel do grupo reciclaveis, Somar 1 em variável pontos e Escrever na tela no alto à direita o texto "Peças: " + pontos + " / " + meta.',
        'Coloque Quando coletor encostar em algum do grupo proibidos, chamando de pecaProibida, com o mesmo Se.',
        'No então: Tirar o objeto pecaProibida do grupo proibidos e Machucar coletor tirando 1 de vida.',
      ],
      test: 'Na esteira da borda, o placar sobe a cada garrafa. No meio, cada pilha tira uma vida.',
      correction:
        'Se a peça atravessar o coletor, confira o Tirar o objeto do grupo dentro do encontro.',
    },
    {
      key: 'resultado-3d',
      title: 'O galpão também termina a partida',
      idea: 'A cada quadro, durante a partida, primeiro a vida; no senão, a meta.',
      steps: [
        'Dentro de A cada quadro, no começo, coloque um Se estado = jogando.',
        'Nele, Se a vida de coletor ≤ 0: estado recebe "derrota", Escrever na tela embaixo um texto vazio e Fim de jogo: perdeu.',
        'No senão, Se pontos ≥ meta: estado recebe "vitoria", Escrever na tela embaixo um texto vazio e Fim de jogo: ganhou.',
      ],
      test: 'Fique no meio até a vida acabar: vem a tela de quem perdeu. Recolha até a meta: vem a de quem ganhou.',
      correction:
        'Se o fim de jogo se repetir, confira o Se estado = jogando em volta das perguntas.',
    },
    {
      key: 'meta-nova-3d',
      title: 'Uma meta nova para o galpão',
      idea: 'A vitória e o texto do placar leem a variável meta.',
      steps: [`Em Ao iniciar, troque o valor de Criar variável meta para ${r.metaNova}.`],
      test: `Com ${r.meta} peças a partida continua; no ${r.metaNova}, vem a vitória, e o placar mostra / ${r.metaNova}.`,
      correction: `Se a vitória chegar no ${r.meta}, troque o número escrito na condição pela variável meta.`,
    },
  ]
}
