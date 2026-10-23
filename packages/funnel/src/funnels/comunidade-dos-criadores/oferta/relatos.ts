import type { Relato, RelatoId } from './types'

// Falas reais de alunos e responsáveis, com termo de autorização assinado. As cartelas AV são as
// do destaque Avaliações do Instagram; os trechos N saem dos mesmos vídeos, com segunda transcrição
// conferida (docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/
// trechos-novos.md, segundos de cada corte). Identificação igual à do Instagram: nome, Aluno/Aluna
// ou relação com a criança e o contexto, fora das aspas. Não acrescentar número, prazo ou resultado.
const SOBRE_O_DESAFIO = 'Relato sobre o Desafio do Primeiro Jogo'
const SOBRE_CRIAR = 'Relato sobre criar jogos'

export const RELATOS: Record<RelatoId, Relato> = {
  AV02: {
    fala: 'No fim eu peguei o link e mandei pro meu amigo jogar.',
    nome: 'Rafael',
    papel: 'Aluno',
    contexto: SOBRE_O_DESAFIO,
    retrato: 'depo-rafael.webp',
  },
  AV03: {
    fala: 'Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo.',
    nome: 'Débora',
    papel: 'Aluna',
    contexto: SOBRE_O_DESAFIO,
    retrato: 'depo-debora.webp',
  },
  AV04: {
    fala: 'Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior.',
    nome: 'André',
    papel: 'Aluno',
    contexto: SOBRE_O_DESAFIO,
    retrato: 'depo-andre.webp',
  },
  AV06: {
    fala: 'Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.',
    nome: 'Fernando',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-fernando.webp',
  },
  AV07: {
    fala: 'Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.',
    nome: 'Jeffrey',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-jeffrey.webp',
  },
  AV08: {
    fala: 'Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Organizar as ideias',
    retrato: 'relato-daniel.webp',
  },
  AV09: {
    fala: 'Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele.',
    nome: 'Harle',
    papel: 'Pai do Jeffrey',
    contexto: 'Mais responsabilidade',
    retrato: 'relato-harle.webp',
  },
  AV10: {
    fala: 'No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.',
    nome: 'Flávia',
    papel: 'Mãe do Fernando',
    contexto: 'Fazer por conta própria',
    retrato: 'relato-flavia.webp',
  },
  AV11: {
    fala: 'Vai criando, vai sendo mais criativo. ‘Eu quero mudar isso aqui no jogo.’',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Ter ideias para o jogo',
    retrato: 'relato-daniel.webp',
  },
  AV12: {
    fala: 'O Fernando passava muito tempo nas telas, mas ele mais assistia, não desenvolvia nada. O curso incentivou ele a desenvolver, a programar, não a jogar.',
    nome: 'Flávia',
    papel: 'Mãe do Fernando',
    contexto: 'Usar a tela para criar',
    retrato: 'relato-flavia.webp',
  },
  N1: {
    fala: 'Acabava uma aula, ele vinha contar: ‘Eu aprendi isso aqui’, e me mostrava no computador. ‘Olha, agora eu aprendi, agora a tela mexe, eu consigo jogar o bonequinho pra lá e pra cá.’ E ele ficava falando disso até quando ia pra casa dos avós.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Mostrar o que aprendeu',
    retrato: 'relato-daniel.webp',
  },
  N2: {
    fala: 'Surpreendentemente para nós, ele não ficou com maior tempo de tela. Ele ficou, às vezes, com o mesmo tempo, mas trocando a programação ao invés de só brincar.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'O mesmo tempo de tela',
    retrato: 'relato-daniel.webp',
  },
  N4: {
    fala: 'Ele é ativo, então ficar em frente ao computador num curso online era um receio que nós tínhamos muito, dele não conseguir prestar atenção. Mas a gente percebeu que o curso era super interativo, tem vários desafios, então o Rafa é uma criança que gosta de desafios, eu vi superando os desafios, então isso conseguiu concentrar ele no curso.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Prestar atenção online',
    retrato: 'relato-daniel.webp',
  },
  N5: {
    fala: 'Tem um pouco da teoria, ele aprende, ele pratica teoria na aula e cria o joguinho. São aulas curtas que chegam no objetivo através da prática.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Teoria na prática',
    retrato: 'relato-daniel.webp',
  },
  N6: {
    fala: 'A gente pensou aqui em casa que é como se fosse um investimento para crianças. Uma criança fazer uma natação, fazer inglês, isso ele está aprendendo um negócio agora, que é a programação.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Como uma atividade extra',
    retrato: 'relato-daniel.webp',
  },
  N7: {
    fala: 'A gente queria algum curso que o Rafa começasse, se interessasse e não quisesse parar, e foi o que aconteceu.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Querer continuar',
    retrato: 'relato-daniel.webp',
  },
  N8: {
    fala: 'No começo das aulas, eu e a Ana acompanhava muito de perto. Com o decorrer do tempo, ele já ficou um pouco mais independente. Hoje eu posso até estar do lado, eu já não entendo mais nada, ele segue sozinho.',
    nome: 'Daniel',
    papel: 'Pai do Rafael',
    contexto: 'Seguir sozinho',
    retrato: 'relato-daniel.webp',
  },
  N9: {
    fala: 'Ele é mais independente, porque meu tempo é bem apertado. No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento.',
    nome: 'Flávia',
    papel: 'Mãe do Fernando',
    contexto: 'Tempo apertado',
    retrato: 'relato-flavia.webp',
  },
  N11: {
    fala: 'O Fernando, no geral, ele tem desenvolvimento bem na escola, e o curso, acho que só ajuda, porque é mais um exercício de prática, de foco, dessas coisas.',
    nome: 'Flávia',
    papel: 'Mãe do Fernando',
    contexto: 'Prática e foco',
    retrato: 'relato-flavia.webp',
  },
  N12: {
    fala: 'Quando eu falei com ele que ele ia começar o curso, ele se envolveu bastante. Ele me cobrava quando dava algum problema aqui no computador, quando a gente tinha que sair, que não dava tempo dele fazer o curso.',
    nome: 'Harle',
    papel: 'Pai do Jeffrey',
    contexto: 'Ele mesmo cobrava',
    retrato: 'relato-harle.webp',
  },
  N13: {
    fala: 'Ele é que nem eu, até hoje eu jogo também. E o Jeff, ele segue a mesma coisa que eu, e ele continua jogando e criando os jogos deles.',
    nome: 'Harle',
    papel: 'Pai do Jeffrey',
    contexto: 'Jogar e criar',
    retrato: 'relato-harle.webp',
  },
  N14: {
    fala: 'Os cursos gratuitos eu até pesquisei, mas é pouquinha coisa, é uma aulazinha experimental, aí não dá pra você aprofundar mais. Agora ele aprofundou nesse daqui.',
    nome: 'Harle',
    papel: 'Pai do Jeffrey',
    contexto: 'Ir mais fundo',
    retrato: 'relato-harle.webp',
  },
  N15: {
    fala: 'Ele fica mais assim, olhando o curso dele, mexendo no curso dele, ele quase não me chama. Eu pergunto ele todo dia à tarde quando eu chego do serviço, ele me mostra os jogos que ele criou.',
    nome: 'Harle',
    papel: 'Pai do Jeffrey',
    contexto: 'Me mostra quando chego',
    retrato: 'relato-harle.webp',
  },
  N16: {
    fala: 'Foi bem divertido fazer os jogos que a professora me ensinou, me dando a habilidade de conseguir fazer os próprios jogos.',
    nome: 'Jeffrey',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-jeffrey.webp',
  },
  N17: {
    fala: 'O que eu mais gostei foi o processo de como desenvolver o jogo. Cada etapa é importante para garantir que o seu jogo funcione.',
    nome: 'Jeffrey',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-jeffrey.webp',
  },
  N18: {
    fala: 'Uma coisa que eu queria dizer era sobre um jogo que eu mesmo criei. Não é do curso, mas eu usei conforme o que eu aprendi com a professora Helena. Eu criei todos os personagens. E esse aqui é o meu personagem, que no caso sou eu mesmo. Ainda estou desenvolvendo, mas está ficando bom.',
    nome: 'Jeffrey',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-jeffrey.webp',
  },
  N19: {
    fala: 'Eu estava me dedicando muito nesse jogo, por causa que eu primeiro quero começar me dedicando a um só jogo, para depois eu me dedicar a mais jogos e fazer muitos jogos.',
    nome: 'Fernando',
    papel: 'Aluno',
    contexto: SOBRE_CRIAR,
    retrato: 'relato-fernando.webp',
  },
}

/**
 * Falas autorizadas que ficaram sem lugar nas páginas e nas cartas de 20/10/2026 (9 a 17, criar
 * junto, continuidade e resultados do quiz; a continuidade foi redesenhada no mesmo dia). Ficam guardadas para anúncios, e-mails e próximas
 * versões; o teste de copy exige que toda fala esteja numa página ou aqui, com o motivo.
 */
export const RELATOS_RESERVA: Partial<Record<RelatoId, string>> = {
  AV02: 'O Rafael mandando o link para o amigo: saiu com a continuidade antiga; a nova usa falas sobre seguir criando.',
  N4: 'O receio do Daniel com o curso online: estava numa resposta da continuidade antiga; guardada para dúvidas sobre aula gravada.',
  N6: 'A assinatura como investimento, pelo Daniel: a continuidade antiga a punha antes dos planos; a nova não tem fala ali.',
  N7: 'O Rafa que começou e não quis parar: saiu com a continuidade antiga; a página de 9 a 17 diz a ideia na chamada do caso.',
  N19: 'O Fernando focado num jogo antes do próximo: saiu com a continuidade antiga; guardada para a próxima versão dela.',
  AV06: 'A alegria do Fernando ao criar: as páginas novas usam falas de responsáveis nesse ponto.',
  AV07: 'O Jeffrey sobre expressar as ideias: a carta do perfil C usa a fala dele sobre os personagens.',
  N1: 'O Rafael contando o que aprendeu: a página de 9 a 17 usa o Daniel em outros trechos.',
  N5: 'Teoria na prática: a carta do perfil D usa a fala do Jeffrey sobre as etapas do jogo.',
  N9: 'A independência do Fernando: a página de 9 a 17 cita a Flávia na dúvida sobre fazer sozinho.',
  N11: 'Prática e foco na escola: a carta do perfil F usa a fala do Daniel sobre lógica e matemática.',
  N12: 'O Jeffrey cobrando o horário do curso: guardada para anúncios sobre motivação.',
  N13: 'Pai e filho que jogam e criam: guardada para a comunicação com pais que também jogam.',
  N14: 'A comparação com cursos gratuitos: guardada para anúncios e para a página adulta futura.',
  N16: 'O Jeffrey sobre fazer os próprios jogos: a página de 9 a 17 usa a fala mais completa dele.',
}
