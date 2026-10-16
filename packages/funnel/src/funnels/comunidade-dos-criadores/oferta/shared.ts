import { RELATOS } from './relatos'
import type { ComunidadeFaqEntry, ComunidadeOffer, ComunidadeSection } from './types'

// Blocos comuns às seis páginas (proposta de 16/10/2026, aprovada pela dona):
// docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/blocos-comuns.md.
// A Chave do Farol é o curso de entrada que leva ao posto Construtor; a ordem atual dos projetos é
// Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino.

const FUNDADORES_ABERTURA = [
  'Somos Helena e Júlio, pais do André e da Débora. Nós dois somos formados em Sistemas de Informação e trabalhamos com programação.',
  'O André sempre gostou muito de jogar e de assistir a vídeos de jogos. Em vez de brigar com esse interesse, decidimos aproveitá-lo: passamos a usar uma parte do tempo que ele já ficava na tela para ensiná-lo a criar os próprios jogos.',
  'Para um jogo funcionar, ele precisava pensar no que vem primeiro, testar e ajustar quando algo dava errado. Foi nesse processo que vimos o André se interessar cada vez mais por aprender. Depois, ele chamava a gente para jogar e contava como tinha feito.',
]
const FUNDADORES_ESCOLA =
  'Nesse período, também percebemos mudanças na escola. Ele passou a se envolver mais nas aulas e a se concentrar melhor, e as notas melhoraram. Desde o segundo ano, tem ficado entre os cinco primeiros da turma, na maioria das vezes em primeiro lugar, e conquistou medalhas em olimpíadas de matemática. Contamos isso como pais, pelo que vimos no André.'
const FUNDADORES_FECHO =
  'Essa experiência nos deu vontade de ajudar outras famílias a usar uma parte do tempo de tela para aprender criando, e foi assim que nasceu a Comunidade dos Criadores. Hoje somos nós que preparamos as aulas, usando o que sabemos de programação para ensinar as crianças a fazer os próprios jogos.'

const fundadores = (paragraphs: string[], falas: ComunidadeSection['falas']) =>
  ({
    id: 'origem',
    title: 'Tudo começou com o tempo que nosso filho já passava jogando',
    eyebrow: 'Quem está por trás',
    layout: 'story',
    visuals: [],
    groups: [{ title: null, paragraphs }],
    falas,
    actions: [],
  }) satisfies ComunidadeSection

/** A história do Sobre nós do Instagram, com a fala do André no fim. */
const FOUNDER = fundadores([...FUNDADORES_ABERTURA, FUNDADORES_FECHO], ['AV04'])
/** Páginas em que a fala do André já está na faixa de relatos (B e E). */
export const FOUNDER_SEM_RELATO = fundadores([...FUNDADORES_ABERTURA, FUNDADORES_FECHO], [])
/** Página F: com as mudanças que os pais perceberam na escola, contadas como relato deles. */
export const FOUNDER_COM_ESCOLA = fundadores(
  [...FUNDADORES_ABERTURA, FUNDADORES_ESCOLA, FUNDADORES_FECHO],
  ['AV04'],
)

export const SHARED_COPY = {
  founder: FOUNDER,
  offer: {
    title: 'Tudo o que seu filho usa para criar entra numa assinatura só',
    paragraphs: [
      'Vocês assinam uma vez e seu filho tem os cursos da Comunidade, as ferramentas que a Jornada vai abrindo e um lugar para mostrar os jogos que fizer. Os cursos lançados enquanto a assinatura estiver ativa entram junto, sem compra separada.',
      'Os cursos publicados e os próximos. Cada curso é um jogo guiado do começo ao fim, de Cadê Todo Mundo e A Chave do Farol até os que ainda vão sair.',
      'As ferramentas, uma etapa de cada vez. Depois de A Chave do Farol, o Estúdio e o Pinta ficam livres para as ideias dele. No posto Inventor chegam o Pensa, para planejar um jogo, e a ajuda do Zappy no Estúdio. No Explorador de Mundos, o Molda, para criar em três dimensões.',
      'Dois filhos, uma assinatura. Os dois planos têm até dois perfis de criança, cada um com os próprios jogos, o próprio progresso e a própria Jornada.',
      'Um lugar para mostrar. O jogo publicado vai para o Mural com um link e um cartão com código QR para mandar à família, e o Clube e o desafio do mês dão motivo para a próxima versão.',
      'A sua área. Você vê o que cada filho fez, os temas que estudou, as entregas e em que ponto da Jornada ele está.',
      'As aulas são gravadas e funcionam no navegador do computador. O caminho de liberação é o mesmo nos dois planos; muda só a forma de pagar.',
    ],
    falas: ['N6'],
    monthly: {
      title: 'Plano mensal',
      paragraphs: [
        'Cobrança mensal com renovação automática no cartão. Você cancela a próxima renovação pela sua área quando quiser, e o acesso continua até o fim do mês já pago.',
      ],
      cta: 'Escolher o plano mensal',
    },
    annual: {
      title: 'Plano anual',
      paragraphs: [
        'Doze meses pelo equivalente a {{equivalente_mensal_anual}} por mês.',
        'Comparado a doze mensalidades, vocês economizam {{economia_anual}}.',
        'Pagamento anual: Pix à vista ou cartão com renovação anual. No Pix, uma nova contratação é necessária ao fim dos 12 meses; no cartão, a renovação é automática e pode ser cancelada pela sua área.',
      ],
      cta: 'Escolher o plano anual',
    },
    guarantee: {
      title: 'Sete dias para ver seu filho na primeira aula',
      paragraphs: [
        'Assinem, abram a primeira aula juntos e vejam como seu filho se sai: se ele entende o passo, se gosta de montar, se a atividade cabe na rotina de vocês. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        'Para pedir o reembolso integral, escreva para contato@sistemazero.com.br com o e-mail usado na compra, em até sete dias contados da compra. O prazo vale para a primeira contratação e para cada nova contratação anual via Pix; as renovações automáticas no cartão seguem os termos.',
        'Cancelar a próxima renovação é outra ação, feita na sua área, e mantém o acesso até o fim do período pago.',
      ],
    },
    checkout:
      'Ao escolher o plano, você preenche os dados do responsável, confere o valor e a renovação e só então paga. O perfil do seu filho é criado depois, já dentro da plataforma.',
  } satisfies ComunidadeOffer,
}

/** As respostas comuns às quatro páginas de perfil (e à base de E e F). */
export const FAQ = {
  programacao: {
    question: 'Meu filho precisa saber programar para começar?',
    paragraphs: [
      'Não. A programação começa do zero, em blocos: cada bloco é uma instrução que ele encaixa e testa. A aula mostra onde encontrar o bloco, como encaixar e o que observar quando o jogo roda, e ele pausa o vídeo para fazer cada passo.',
      'Nas primeiras aulas, os personagens já vêm prontos, então ele começa por uma ação concreta, como fazer o personagem andar. O que ele precisa é conseguir ler e usar mouse e teclado.',
    ],
  },
  desenho: {
    question: 'Meu filho precisa saber desenhar para criar os jogos?',
    paragraphs: [
      'Não. As primeiras aulas trazem personagens, objetos e cenários prontos, e a atenção dele fica nas regras: fazer o personagem andar, pular e responder a uma tecla.',
      'Depois de A Chave do Farol, o Pinta fica livre. Quem quiser desenha os próprios personagens e leva para o jogo, misturando com os prontos se preferir.',
    ],
  },
  pais: {
    question: 'Eu preciso saber programação para ajudar meu filho?',
    paragraphs: [
      'Não. Cada passo da montagem e o resultado esperado estão nas aulas. Nas primeiras vezes, abra a aula junto para conhecer os botões; depois, peça para ver o jogo e deixe que ele explique o bloco que mudou.',
    ],
  },
  'aulas-gravadas': {
    question: 'Como meu filho acompanha uma aula gravada?',
    paragraphs: [
      'O curso começa com o jogo pronto para ele experimentar, e as aulas mostram a montagem por partes, com o vídeo ao lado do editor. Ele assiste, pausa, faz e aperta para testar. Se perdeu onde um bloco foi colocado, volta àquele trecho. As falas do Zappy explicam o que fazer, e o botão Ouvir lê em voz alta. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta.',
      'Nas primeiras aulas, vale sentar junto para conhecer os controles. Com o uso, ele passa a seguir a orientação da tela, e você acompanha menos.',
      `O Daniel, pai do Rafael, tinha um receio parecido: “${RELATOS.N4.fala}”`,
    ],
  },
  'ao-vivo': {
    question: 'Tem aula ao vivo?',
    paragraphs: [
      'Não. As aulas são gravadas, e isso foi uma escolha: a explicação espera por ele. Seu filho pausa no passo, faz, volta ao trecho quantas vezes precisar e segue quando o jogo funcionar, no horário que vocês combinarem.',
    ],
  },
  equipamento: {
    question: 'De que equipamento ele precisa?',
    paragraphs: [
      'De um computador com internet, navegador, mouse e teclado. As atividades de criação são feitas para esse uso; celular e tablet não servem para acompanhar as aulas. Se tiver dúvida sobre o computador de casa, descreva o equipamento num e-mail para contato@sistemazero.com.br antes de assinar.',
    ],
  },
  nivel: {
    question: 'A Comunidade combina com uma criança que já programa?',
    paragraphs: [
      'Depende do que ele já sabe e do que quer construir. A entrada é em blocos, no Estúdio, e quem já usa esses conceitos vai achar o começo familiar.',
      'Vejam juntos a demonstração e a ordem dos projetos: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito, Corre, Dino e os próximos. Se houver ali algo que ele queira construir, o começo é o caminho mais curto até o Estúdio livre.',
    ],
  },
  telas: {
    question: 'A proposta é aumentar o tempo de tela do meu filho?',
    paragraphs: [
      'Não. A ideia é mudar o que ele faz numa parte do tempo que vocês já permitem. Vocês continuam decidindo os dias e a duração, e a aula gravada cabe nesse combinado porque pausa hoje e continua amanhã do mesmo ponto.',
      'O que muda é o papel dele naquele tempo. Em vez de escolher o próximo vídeo, ele decide quanto o personagem pula, testa e mostra para você.',
    ],
  },
  frequencia: {
    question: 'Ele precisa entrar todos os dias?',
    paragraphs: [
      'Não. Vocês decidem os dias. Missões, moedas, pontos e ligas registram a participação, e algumas contam a frequência, mas o projeto e o progresso continuam guardados se ele ficar uns dias sem entrar.',
      'Para viagens e férias, o modo férias registra a pausa e protege a sequência dele. A cobrança e o período do plano continuam correndo normalmente.',
    ],
  },
  salvamento: {
    question: 'Como ele guarda o projeto para continuar depois?',
    paragraphs: [
      'O projeto fica guardado na conta, e o aviso Guardado na sua conta confirma. No dia seguinte, ele abre o trabalho na galeria e continua de onde parou, inclusive em outro computador.',
      'A plataforma precisa de internet. Se a conexão cair no meio da criação, vale esperar o aviso Guardado na sua conta voltar antes de fechar. As ferramentas também exportam o trabalho nos formatos de cada uma, como a imagem de um desenho, para guardar uma cópia fora da plataforma.',
    ],
  },
  interesse: {
    question: 'E se ele já começou outras atividades e desistiu?',
    paragraphs: [
      'Vale descobrir o motivo: a atividade não interessou, a explicação ficou confusa, o nível não servia ou o horário não cabia. Cada um pede uma resposta diferente.',
      'Aqui, o curso começa com o jogo pronto, a explicação espera por ele e o horário é o de vocês, o que cuida dos motivos práticos. O interesse é dele: mostrem a demonstração e perguntem o que ele mudaria num jogo de que gosta. Se nos sete dias ele não se envolver, vocês pedem o reembolso.',
    ],
  },
  liberacao: {
    question: 'Todas as ferramentas ficam abertas no primeiro dia?',
    paragraphs: [
      'Não, e de propósito. No começo, cada aula traz os personagens e os recursos daquela atividade, para ele aprender um passo de cada vez. Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para as ideias dele.',
      'No Inventor chegam o Pensa e a ajuda do Zappy no Estúdio; no Explorador de Mundos, o Molda.',
    ],
  },
  catalogo: {
    question: 'Quais cursos entram na assinatura?',
    paragraphs: [
      'Todos os cursos publicados da Comunidade, inclusive A Chave do Farol, e os que forem lançados enquanto a assinatura estiver ativa, sem pagar à parte. Cada curso é um jogo guiado do começo ao fim.',
      'A ordem atual dos projetos é Cadê Todo Mundo, um curso extra que pode vir antes; A Chave do Farol, o curso de entrada da Jornada; Nave Contra Asteroides; O Jogo do Meu Jeito; e Corre, Dino. A Jornada mostra o que cada etapa libera.',
    ],
  },
  ia: {
    question: 'A inteligência artificial faz o projeto pela criança?',
    paragraphs: [
      'Não. O Pensa conversa sobre a ideia do jogo (o objetivo, os controles, quando a partida termina) e organiza as escolhas dele em tarefas; dois irmãos podem montar juntos o mesmo plano de jogo no Pensa. O Zappy, no Estúdio, olha os blocos e o erro e explica o que conferir, mas não mexe no projeto: quem ajusta e testa é a criança.',
      'A inteligência artificial também erra, e conferir a sugestão no jogo faz parte de aprender. O Pensa e a ajuda do Zappy no Estúdio abrem no posto Inventor e usam os créditos de inteligência artificial da família. As falas do Zappy que conduzem as aulas estão lá desde a primeira e não usam créditos.',
    ],
  },
  creditos: {
    question: 'O uso dos recursos de inteligência artificial é ilimitado?',
    paragraphs: [
      'Não. O Pensa e a ajuda do Zappy no Estúdio usam os créditos de inteligência artificial do mês, divididos entre os perfis da família, e você vê o saldo na sua área. As aulas, as pistas, a verificação e os tutoriais não usam créditos.',
    ],
  },
  avancado: {
    question: 'O que vem depois dos blocos?',
    paragraphs: [
      'A Jornada continua. No Explorador de Mundos chega o Molda, para criar modelos em três dimensões que entram nos jogos 3D do Estúdio. Lá na frente, no Gênio da Criação, o modo Ponte mostra os blocos lado a lado com o código escrito, e na Lenda ele programa em código.',
      'É uma iniciação por projetos, pensada para crianças de 9 a 14 anos; formar um programador profissional fica fora da proposta.',
    ],
  },
  certificado: {
    question: 'Os cursos têm certificado?',
    paragraphs: [
      'Sim, nos cursos que oferecem, depois de cumprir os requisitos de conclusão; cada curso informa isso. O certificado registra a etapa concluída, e o jogo mostra o que ele fez nela.',
    ],
  },
  irmaos: {
    question: 'Uma assinatura atende meus dois filhos?',
    paragraphs: [
      'Sim. Os dois planos têm até dois perfis de criança, cada um com os próprios jogos, o próprio progresso e a própria Jornada. Um pode estar no Pinta enquanto o outro monta uma regra, nos horários que vocês combinarem. Os créditos de inteligência artificial são da família, divididos entre os dois.',
    ],
  },
  perfil: {
    question: 'Quem vê o perfil e os jogos do meu filho?',
    paragraphs: [
      'O perfil começa escondido dos colegas, e só você liga essa opção, na sua área. Os jogos são outra coisa: quando ele publica, o link é público, e quem receber consegue jogar. Por isso vale combinar com ele quais jogos publicar e para quem mandar.',
    ],
  },
  convivencia: {
    question: 'Como a criança pede ajuda se uma conversa no Clube a incomodar?',
    paragraphs: [
      'O Clube tem combinados de convivência e um caminho para avisar a equipe sobre algo que precise de atenção. Conheçam esses combinados juntos e combinem também que ele procure você quando uma conversa o deixar desconfortável.',
    ],
  },
  'apoio-especifico': {
    question: 'Como avaliar se meu filho precisa de um apoio que a Comunidade não oferece?',
    paragraphs: [
      'Abram juntos uma primeira aula e observem como ele lê, usa os controles e faz a tarefa. Se ele precisa de acompanhamento especializado ou de adaptações individuais, escrevam para contato@sistemazero.com.br antes de assinar, para conferir o que dá para atender. Ver uma tarefa diz mais do que a idade sozinha.',
    ],
  },
  ajuda: {
    question: 'O que ele faz quando trava numa atividade?',
    paragraphs: [
      'Primeiro, usa o que está na tela: volta o vídeo ao trecho e, nas partes que têm verificação, aperta Verificar esta parte para ver o que já está certo e o que falta. Nos experimentos, Uma pista indica onde olhar. Para dúvidas de como usar uma ferramenta, o Como fazer tem tutoriais por assunto, e a partir do posto Inventor a ajuda do Zappy no Estúdio também examina os blocos.',
      'Se a dúvida continuar, o botão Preciso de ajuda, na própria aula, manda a pergunta para a nossa equipe. A resposta chega por escrito nos Recados, e ele pode consultá-la depois.',
    ],
  },
  custos: {
    question: 'Preciso comprar as ferramentas separadamente?',
    paragraphs: [
      'Não. As ferramentas fazem parte da assinatura; o que abre cada uma é a etapa da Jornada. O único limite de uso é o dos créditos de inteligência artificial, que você acompanha na sua área. Os dois planos seguem o mesmo caminho de liberação.',
    ],
  },
  cancelamento: {
    question: 'Como cancelo a próxima renovação?',
    paragraphs: [
      'Abra a área dos pais, entre em Conta e, em Minhas compras, clique em Cancelar assinatura. O acesso continua até o fim do período já pago. No plano anual por Pix, o acesso termina ao fim dos 12 meses e uma nova contratação é necessária para continuar.',
    ],
  },
  reembolso: {
    question: 'Como solicito o reembolso dentro da garantia?',
    paragraphs: [
      'Na primeira contratação, você tem sete dias, contados da compra, para pedir o reembolso integral: escreva para contato@sistemazero.com.br com o e-mail da compra. O prazo vale também para cada nova contratação anual via Pix; renovações automáticas no cartão seguem os termos. O pedido de reembolso é separado do cancelamento da próxima renovação.',
    ],
  },
  atendimento: {
    question: 'Como falo com a equipe ou recupero a senha?',
    paragraphs: [
      'Para assuntos da conta, use o atendimento na área dos pais; a conversa fica guardada. Para recuperar a senha, use a opção na tela de entrada e informe o e-mail da conta. Dúvidas do seu filho sobre uma aula seguem pelo Preciso de ajuda, na própria aula.',
    ],
  },
} satisfies Record<string, ComunidadeFaqEntry>

/** Respostas que só algumas páginas usam (B: Roblox e Desafio; C: desenho). */
export const FAQ_EXTRA = {
  roblox: {
    question: 'As aulas ensinam a criar no Roblox Studio?',
    paragraphs: [
      'Não. Seu filho cria no Estúdio da Comunidade, montando as regras com blocos. Se ele gosta de Roblox, as ideias que traz de lá (obstáculos, fases, pontos, um personagem que coleta coisas) cabem nos projetos do Estúdio.',
      'Se o objetivo é aprender a ferramenta Roblox Studio em si, esta não é a escolha certa. Mostre a demonstração para ele e vejam juntos se é este jeito de criar que ele quer.',
    ],
  },
  desafio: {
    question: 'Ele já começou pelo Desafio. Precisa repetir o que fez?',
    paragraphs: [
      'Não. Assinando com o mesmo e-mail do responsável, ele continua no mesmo perfil, com o que já concluiu e os jogos que guardou. Se ainda faltar terminar uma etapa ou publicar o projeto, a Jornada mostra o que falta.',
    ],
  },
  'so-desenho': {
    question: 'A Comunidade serve para quem quer apenas desenhar?',
    paragraphs: [
      'Não exatamente: aqui o desenho serve a um jogo, para quem quer desenhar e ver o desenho fazer alguma coisa. O desenho digital e a programação andam juntos: seu filho cria o personagem no Pinta e monta, no Estúdio, as regras que fazem ele andar, pular e responder ao jogador. Nas primeiras aulas, ele programa com personagens prontos, e o Pinta fica livre depois de A Chave do Farol.',
      'Se ele quer aulas de desenho, com traço e técnica, uma aula de desenho atende melhor. Mostre a demonstração e vejam juntos se a parte de programar também desperta a curiosidade dele.',
    ],
  },
  papel: {
    question: 'Ele pode aproveitar um personagem que desenhou no papel?',
    paragraphs: [
      'Sim, como modelo. Com o desenho do caderno ao lado, ele refaz o personagem no Pinta: copia o formato, escolhe as cores e acerta os detalhes enquanto conhece as ferramentas. Depois leva essa versão digital para o Estúdio.',
      'Fotografar o desenho, sozinho, não faz um jogo, porque o personagem ainda precisa das regras de como anda e do que acontece quando encontra um objeto. Essa parte ele monta com blocos, e é justamente a graça da proposta.',
    ],
  },
} satisfies Record<string, ComunidadeFaqEntry>
