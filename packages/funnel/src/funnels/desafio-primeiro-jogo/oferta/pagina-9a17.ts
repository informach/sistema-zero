import { RELATOS } from '../../comunidade-dos-criadores/oferta/relatos'
import type { RelatoId } from '../../comunidade-dos-criadores/oferta/types'

// Página do Desafio do Primeiro Jogo para 9 a 17 anos (proposta revisada aprovada em 05/11/2026, Canvas
// "Desafio do Primeiro Jogo · três páginas", quadro Desafio917 com o review aplicado). A copy é a
// do desenho, palavra por palavra. Preço só por marcador ({{preco}}, {{preco_dia}}), preenchido
// pelo corpo a partir do catálogo; nada de valor escrito à mão.

/** Uma imagem da página. `src` é relativo a `/img/` (a página usa fotos de duas pastas). */
export interface ImagemDesafio {
  src: string
  width: number
  height: number
  alt: string
}

/** Uma fala de `RELATOS`, com um complemento opcional na legenda (o parentesco do André). */
export interface RelatoDesafio {
  id: RelatoId
  complemento?: string
}

/** Nome, papel e o contexto do relato, como no Instagram: "Rafael, aluno, relato sobre o Desafio…". */
export function legendaRelatoDesafio(r: RelatoDesafio): string {
  const { nome, papel, contexto } = RELATOS[r.id]
  const base = `${nome}, ${papel.charAt(0).toLowerCase()}${papel.slice(1)}`
  const meio = r.complemento ? `, ${r.complemento}` : ''
  return `${base}${meio}, ${contexto.charAt(0).toLowerCase()}${contexto.slice(1)}`
}

export const PAGINA_DESAFIO_9A17 = {
  seoTitle: 'Desafio do Primeiro Jogo: habilidades para a vida | Sistema Zero',
  description:
    'Ajude seu filho a praticar planejamento, resolução de problemas e comunicação para a escola e a vida. Treinamento guiado com criação de jogos e programação em blocos. 9 a 17 anos.',
  capa: 'desafio-primeiro-jogo/farol-capa.webp',
  cta: 'Quero começar por {{preco}}',
  condicoes: 'Pagamento único · 30 dias de acesso · 7 dias de garantia',
  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      src: 'comunidade-dos-criadores/logo-kids-claro.svg',
      width: 287,
      height: 22,
      alt: 'Sistema Zero Kids',
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      {
        href: '#habilidades',
        label: 'As habilidades',
      },
      {
        href: '#responsavel',
        label: 'Como acompanhar',
      },
    ],
    cta: 'Conhecer o treinamento',
  },
  hero: {
    selo: 'Habilidades para a vida · 9 a 17 anos',
    titulo: 'Ajude seu filho a resolver problemas e fazer escolhas ',
    destaque: 'com mais autonomia, na escola e na vida.',
    texto:
      'Desenvolver habilidades fica mais significativo quando seu filho pode praticá-las em algo que desperta seu interesse. No Desafio do Primeiro Jogo, ele exercita planejamento, raciocínio e persistência de forma lúdica, criando uma aventura com escolhas próprias e orientação.',
    beneficios: [
      'Dividir uma tarefa em passos que consegue executar',
      'Investigar o que falhou e explicar onde precisa de ajuda',
      'Mostrar o que criou e reconhecer o caminho que percorreu',
    ],
    linkSecundario: 'Ver como as habilidades são praticadas',
    imagem: {
      src: 'desafio-primeiro-jogo/farol-jogo.png',
      width: 1280,
      height: 960,
      alt: 'A Chave do Farol: o personagem na trilha, a chave dourada e o farol listrado na ilha',
    },
    legenda: 'A Chave do Farol: a aventura usada neste treinamento',
    faixa: '30 dias de acesso',
  },
  jeitos: {
    titulo: 'Você quer que ele encontre um caminho quando a resposta ainda não está pronta.',
    texto:
      'Começar a lição, organizar um trabalho da escola, explicar uma dúvida ou lidar com uma mudança de plano. Nessas situações, seu filho precisa pensar no que quer fazer, escolher um primeiro passo e reconhecer quando precisa de ajuda. O objetivo do Sistema Zero é oferecer oportunidades de praticar essas habilidades com orientação, num projeto que dê vontade de explorar.',
    so: {
      titulo: 'Um motivo para se envolver',
      texto:
        'Na aventura, um barco precisa da luz do farol para chegar à costa. A criança tem uma missão para compreender e escolhas que fazem parte da solução.',
      imagem: {
        src: 'kids-aprender-criando/planejar-caminho.webp',
        width: 1536,
        height: 1024,
        alt: 'Debinha, Dedé e Zappy planejam um caminho até o farol; ilustração sobre pensar antes de agir.',
      },
    },
    fazer: {
      titulo: 'Um resultado para observar',
      texto:
        'Ela muda uma instrução e vê o que acontece. Pode comparar o que imaginou com o resultado, investigar uma diferença e testar outra ideia.',
      imagem: {
        src: 'kids-aprender-criando/testar-com-apoio.webp',
        width: 1536,
        height: 1024,
        alt: 'Debinha testa uma ideia no computador com a companhia de Dedé e Zappy; ilustração sobre experimentar com apoio.',
      },
    },
    frase:
      'É por isso que usamos a programação de jogos: ela transforma uma ideia em instruções que a criança pode testar. O interesse dá uma razão para começar; o resultado visível ajuda a escolher o próximo passo; a orientação organiza o percurso. A curiosidade pode vir da história, dos personagens ou da criação. Ter o hábito de jogar não é requisito.',
  },
  farol: {
    tag: 'O jogo é a ferramenta do treinamento',
    titulo: 'Esse treinamento ganha forma numa aventura construída uma parte de cada vez.',
    etapas: [
      {
        rotulo: 'Etapa 1',
        titulo: 'Entender e experimentar',
        texto:
          'Ele investiga o movimento e faz o personagem andar sem sair da tela. Uma parte funciona, e ele tem uma base para a próxima.',
      },
      {
        rotulo: 'Etapa 2',
        titulo: 'Investigar o que mudou',
        texto:
          'A chave sumiu da tela. O jogo guardou que ela foi pega? Ele compara situações e descobre como uma informação muda o que acontece depois.',
      },
      {
        rotulo: 'Etapa 3',
        titulo: 'Decidir, testar e concluir',
        texto:
          'Ele cria a regra de acender o farol com a chave, testa o percurso e escolhe a aparência e os avisos da sua aventura.',
      },
      {
        rotulo: 'Ao concluir',
        titulo: 'Ter uma conquista para contar',
        texto:
          'Ele pode mostrar o projeto e explicar uma escolha ou uma dificuldade que resolveu. Há certificado ao cumprir as atividades de conclusão.',
      },
    ],
    blocos: {
      imagem: {
        src: 'desafio-primeiro-jogo/farol-blocos-reais.webp',
        width: 1100,
        height: 1029,
        alt: 'Captura real do Estúdio com os blocos da Chave do Farol: pegar a chave e decidir se o farol pode acender.',
      },
      titulo: 'Programar é organizar as instruções para realizar uma ideia.',
      paragrafos: [
        'Aqui, as instruções são montadas com blocos de encaixar. Por exemplo: quando o personagem chega ao farol, o jogo confere se ele pegou a chave antes de acender a luz. Seu filho monta essa regra, testa e observa se aconteceu o que esperava. O raciocínio ganha uma forma que ele pode ver e revisar.',
        'Ele recebe um projeto inicial e orientações para construir cada parte. Também faz escolhas: personagem, cenário, avisos e posição da chave. Ao mudar o lugar da chave, muda o percurso de quem joga e pode conferir o efeito da própria decisão.',
      ],
    },
  },
  aula: {
    tag: 'Aprender envolve fazer',
    titulo: 'A orientação acompanha o fazer, e cada tentativa ajuda a escolher o próximo passo.',
    passos: [
      {
        titulo: '1. Entender o objetivo',
        texto: 'Explora uma situação do jogo e observa o que precisa compreender.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-experiencia-real.webp',
          width: 2061,
          height: 1290,
          alt: 'Experiência interativa real da Chave do Farol: escolher a posição da chave.',
        },
      },
      {
        titulo: '2. Fazer uma parte',
        texto: 'Assiste à orientação e pausa para montar os blocos no Estúdio integrado à aula.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-estudio-real.webp',
          width: 2400,
          height: 1500,
          alt: 'Estúdio real com os blocos de programação e a prévia da Chave do Farol.',
        },
      },
      {
        titulo: '3. Observar e ajustar',
        texto: 'Testa no jogo. A verificação do projeto mostra o que falta conferir para seguir.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-objetivos-reais.webp',
          width: 1092,
          height: 530,
          alt: 'Objetivos reais da aula da Chave do Farol e o botão Verificar projeto.',
        },
      },
      {
        titulo: '4. Mostrar e explicar',
        texto: 'Publica seu projeto e tem algo concreto para mostrar à família e contar como fez.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-jogo-real.webp',
          width: 1440,
          height: 1080,
          alt: 'Projeto final da Chave do Farol em execução no Estúdio.',
        },
      },
    ],
    nota: 'Capturas reais da Chave do Farol: experiência interativa, Estúdio, objetivos do projeto e jogo em execução. Toque nas imagens para ampliar.',
  },
  treina: {
    tag: 'Do treinamento para outras situações',
    titulo:
      'Enquanto constrói o jogo, ele pratica maneiras de pensar que você pode retomar fora da tela.',
    habilidades: [
      {
        titulo: 'Planejar antes de agir',
        texto:
          'Acender o farol pede várias partes: movimento, chave e uma regra. Ele acompanha essa sequência e confere cada parte. Ao organizar a mochila ou dividir um trabalho escolar em tarefas, você pode retomar a pergunta: “O que precisamos preparar primeiro?”.',
        imagem: {
          src: 'kids-aprender-criando/organizar-mochila.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha organiza a mochila, enquanto Dedé aponta os materiais que ainda estão sobre a mesa e Zappy acompanha.',
        },
        legenda: 'Na rotina: separar, organizar e conferir.',
        ampliar: false,
      },
      {
        titulo: 'Investigar uma hipótese',
        texto:
          'Ver a chave desaparecer não basta para saber se o jogo guardou a informação. Ele precisa testar e comparar. É uma oportunidade de praticar a diferença entre achar que funcionou e conferir o resultado.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-memoria-cena.webp',
          width: 854,
          height: 852,
          alt: 'Experiência real: a chave saiu da tela, mas a coleta não foi guardada.',
        },
        legenda:
          'Na aula: o aviso diz que a chave foi pega, mas a informação continua falsa. Toque para ampliar.',
        ampliar: true,
      },
      {
        titulo: 'Rever uma tentativa',
        texto:
          'O personagem saiu da tela. A criança observa onde isso aconteceu, confere a regra do limite e testa outra vez, com apoio. Diante de uma peça que não encaixa ou de outra dificuldade na rotina, vocês podem retomar essa experiência de olhar uma parte e experimentar uma mudança.',
        imagem: {
          src: 'kids-aprender-criando/experimentar-outra-possibilidade.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha gira uma peça de quebra-cabeça para experimentar outro encaixe, com Dedé e Zappy por perto.',
        },
        legenda: 'Na rotina: observar a peça e testar outra possibilidade.',
        ampliar: false,
      },
      {
        titulo: 'Explicar e pedir ajuda',
        texto:
          '“Eu peguei a chave, mas o farol não acende” mostra onde a tentativa parou. Organizar essa explicação ajuda quem escuta a compreender a dúvida, como numa conversa com o professor ou com você.',
        imagem: {
          src: 'kids-aprender-criando/mostrar-uma-duvida.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha aponta uma parte do desenho para comunicar sua dúvida a Dedé, com Zappy acompanhando.',
        },
        legenda: 'Na rotina: apontar também pode ajudar a explicar.',
        ampliar: false,
      },
    ],
    faixa: {
      titulo: 'Na escola e na rotina, essas experiências dão assunto para uma conversa concreta.',
      itens: [
        {
          titulo: 'Matemática com um propósito',
          texto:
            'Dois números, x e y, indicam o lugar da chave. Mudar x de 160 para 280 a desloca 120 unidades para a direita. A diferença entre dois números passa a corresponder a uma distância que a criança vê.',
        },
        {
          titulo: 'Escrever para alguém entender',
          texto:
            'Seu filho escolhe os avisos do jogo. Uma mensagem como “Falta a chave” precisa orientar quem joga. Ele pode ler o que escreveu e conferir se o leitor entende o próximo passo.',
        },
        {
          titulo: 'Organizar o que vem primeiro',
          texto:
            'Buscar a chave vem antes de acender o farol. Ao preparar a mochila ou começar uma tarefa em casa, você pode retomar a ideia: “O que precisamos separar antes? E o que vamos conferir no final?”.',
        },
      ],
    },
  },
  responsavel: {
    tag: 'O apoio faz parte da aprendizagem',
    titulo: 'Seu apoio ajuda a ligar o que ele viveu no projeto ao que acontece no dia a dia.',
    itens: [
      '“O que você queria que acontecesse?” Dê espaço para ele explicar, apontar ou mostrar.',
      '“Qual parte podemos olhar juntos?” Ajudem a localizar a dificuldade antes de tentar uma solução.',
      '“Quer fazer uma pausa ou testar uma parte comigo?” Combine uma forma possível de continuar.',
      'Depois, peça que mostre o que mudou. Reconheça uma escolha, uma tentativa ou a ajuda que conseguiu pedir.',
    ],
  },
  oferta: {
    titulo:
      'Comece por um treinamento guiado, com um projeto que seu filho pode construir e mostrar.',
    selo: 'Desafio do Primeiro Jogo',
    sufixo: 'pagamento único',
    porDia: '30 dias de acesso a partir da aprovação do pagamento.',
    inclui: [
      'A Chave do Farol, com 3 etapas guiadas de criação',
      'Vídeos e atividades para planejar, testar e rever',
      'Estúdio integrado à aula, com blocos de programação',
      'Caderno do Aluno e orientação por mensagens',
      'Publicação do projeto para compartilhar com a família',
      'Certificado ao cumprir as atividades de conclusão',
    ],
    incluiLabel: 'Como o treinamento acontece',
    garantia:
      '7 dias de garantia para solicitar reembolso. Pagamento único, sem renovação automática.',
    depoisTitulo: 'Para começar em casa',
    depois: [
      'Receba as orientações de acesso por e-mail e WhatsApp.',
      'Crie ou abra o perfil do seu filho na Área dos pais.',
      'Separe um computador com mouse, teclado e internet. Acompanhe o primeiro acesso.',
    ],
    jaTem: 'Já tem acesso ao Desafio ou à Comunidade?',
    jaTemLink: 'Entre na sua conta para continuar.',
  },
  continuidade: {
    tag: 'Um olhar para o processo',
    titulo: 'Ao acompanhar, olhe também para o caminho que ele percorreu.',
    passos: [
      {
        titulo: 'Antes de começar',
        texto: 'Observe o que despertou interesse e como ele escolheu o primeiro passo.',
      },
      {
        titulo: 'Durante a tentativa',
        texto: 'Repare se identifica uma parte difícil, pede ajuda ou experimenta uma mudança.',
      },
      {
        titulo: 'Depois de criar',
        texto: 'Peça que mostre algo que decidiu e conte, do jeito dele, o que conseguiu fazer.',
      },
    ],
    texto:
      'Uma criança pode mostrar o que fez apontando; outra pode contar cada detalhe. O importante é observar a participação do seu filho e o apoio que o ajudou a avançar. O Desafio oferece uma primeira experiência desse processo. Para continuar com novos projetos, existe a Comunidade dos Criadores, contratada por uma assinatura separada.',
    link: 'Conhecer as possibilidades de continuidade',
  },
  faqTitulo: 'Para escolher e começar com clareza',
  faq: [
    {
      pergunta: 'Por que usar a programação de jogos para esse treinamento?',
      resposta:
        'Porque a criança pode colocar uma intenção em prática e observar a consequência. Ela organiza instruções, testa uma hipótese e revê o que não funcionou. A aventura oferece um objetivo; os blocos permitem construir as regras; as orientações ajudam a fazer uma parte de cada vez. Planejamento, raciocínio e comunicação são praticados durante esse percurso.',
    },
    {
      pergunta: 'Como isso se conecta à escola?',
      resposta:
        'A posição da chave usa coordenadas; os avisos precisam ser escritos para alguém entender; as regras precisam ser testadas. Esses exemplos dão um contexto para números, leitura, escrita e investigação. Em um trabalho escolar, você também pode retomar a organização por partes. A ligação com outras situações se constrói com conversa e novas oportunidades de praticar.',
    },
    {
      pergunta: 'Para qual idade foi pensado?',
      resposta:
        'Para que crianças e adolescentes de 9 a 17 anos consigam realizar as atividades com mais autonomia, conforme seu momento e familiaridade com o computador. Menores de 9 anos também podem participar, com um responsável acompanhando as atividades.',
      link: {
        href: '/kids/desafio-primeiro-jogo/oferta/criar-junto',
        texto: 'Conhecer a proposta para criar junto.',
      },
    },
    {
      pergunta: 'Meu filho é autista. Como podemos avaliar a participação?',
      resposta:
        'Comecem juntos e observem como ele compreende uma orientação, usa os controles e comunica o que precisa. As aulas são gravadas e permitem pausar e rever; as falas do Zappy têm botão Ouvir. Ele pode explicar uma escolha falando, apontando ou mostrando. O acompanhamento deve considerar o ritmo e as necessidades de apoio dele, inclusive dos 9 aos 17 anos.',
    },
    {
      pergunta: 'Precisa saber programar? Quanto devo acompanhar?',
      resposta:
        'O treinamento começa com orientação para os blocos usados no projeto e não exige conhecimento prévio. Acompanhe o primeiro acesso e ajuste sua presença ao apoio de que seu filho precisa. Alguns seguem partes com mais autonomia; outros precisam de companhia durante as atividades. Há Caderno do Aluno e orientação por mensagens na plataforma; as respostas podem levar um tempo.',
    },
    {
      pergunta: 'E se ele se frustrar ou quiser parar?',
      resposta:
        'Acolha o desconforto e procure entender qual parte ficou difícil. Vocês podem pausar, rever uma instrução ou escolher uma tentativa menor. O objetivo é oferecer condições para aprender com o desafio, respeitando o ritmo da criança. A compra tem 7 dias de garantia para solicitar reembolso.',
    },
    {
      pergunta: 'Como são as atividades e o prazo?',
      resposta:
        'São 3 etapas guiadas da Chave do Farol, com aulas gravadas, para fazer dentro dos 30 dias de acesso. Vocês escolhem os momentos; não há turma com horário marcado nem obrigação de concluir em 3 dias. O prazo começa na aprovação do pagamento.',
    },
    {
      pergunta: 'Qual equipamento precisamos?',
      resposta:
        'Computador ou notebook com internet, mouse e teclado para as atividades de criação. A compra e o cadastro podem ser feitos pelo celular. Depois de publicado, o jogo pode ser aberto pelo link no celular.',
    },
    {
      pergunta: 'É assinatura? O que acontece ao terminar o acesso?',
      resposta:
        'É um pagamento único de {{preco}}, sem renovação automática. Depois dos 30 dias, o acesso às aulas termina; os projetos ficam guardados na conta. O link do jogo publicado continua acessível enquanto a publicação estiver disponível. A conta pode ver e jogar no Mural; novas publicações, comentários e reações dependem de um acesso ativo.',
    },
    {
      pergunta: 'É o mesmo presente Cadê Todo Mundo?',
      resposta:
        'São experiências diferentes. O presente usa o Cadê Todo Mundo, com 7 dias desde o resgate. Este treinamento usa A Chave do Farol, com compra separada e 30 dias de acesso. A Comunidade reúne outros projetos por assinatura. Comprar o Desafio não reinicia o presente nem contrata a Comunidade.',
    },
  ],
  fim: {
    titulo: 'Dê ao seu filho espaço para pensar, tentar e descobrir do que é capaz.',
    texto:
      'Desafio do Primeiro Jogo · {{preco}}, pagamento único · 30 dias de acesso · 7 dias de garantia',
    cta: 'Quero começar com meu filho',
  },
  barra: {
    sufixo: 'pagamento único',
    cta: 'Começar o treinamento',
  },
  pratica: {
    metodologia:
      'Nossa metodologia é aprender fazendo: entender um objetivo, montar uma parte, testar, ajustar e compartilhar. A Chave do Farol dá forma a esse percurso. Cada etapa combina orientação, experiências para investigar e criação no Estúdio.',
    familia: [
      'Somos Helena e Júlio, pais do André e da Débora e formados em Sistemas de Informação. Nossa história começou com o interesse do André por jogos e com um convite: criar os próprios projetos juntos.',
      'Criar dava assunto para pensar em uma ideia, enfrentar uma parte difícil e mostrar uma descoberta. Foi acompanhando nossos filhos nesse percurso que nasceu a vontade de compartilhar essa experiência com outras famílias.',
      'Hoje, o Sistema Zero organiza esse caminho em projetos guiados. Nosso propósito é oferecer oportunidades para a criança pensar, escolher, experimentar e comunicar o que criou, usando a programação de jogos como ferramenta e respeitando o apoio de que cada uma precisa.',
    ],
    paraComecar: [
      'Vocês usam um computador ou notebook com internet, mouse e teclado. A aula e o Estúdio de criação ficam juntos no navegador. Na Área dos pais, você cria ou abre o perfil do seu filho e acompanha o primeiro acesso.',
      'As aulas são gravadas. Ele pode pausar, rever uma parte e continuar em outro momento. São três etapas para realizar dentro dos 30 dias de acesso, contados da aprovação do pagamento; não é preciso concluir em três dias.',
      'Você não precisa saber programar. A orientação mostra como montar cada parte, e sua presença acompanha a necessidade de apoio dele. O Caderno do Aluno ajuda a conferir os testes; dúvidas também podem ser enviadas por mensagens na plataforma. As respostas podem levar um tempo.',
    ],
    areaDosPais: [
      'Na Área dos pais, você acompanha aulas concluídas, entregas e jogos publicados de cada filho. O painel também sugere perguntas para conversar sobre uma criação.',
      'Isso ajuda a sair de uma pergunta muito ampla, como “Foi tudo bem?”, para olhar uma escolha concreta: “O que você mudou para funcionar?”. Você conhece melhor o que despertou interesse, onde ele precisou de ajuda e o que conseguiu mostrar.',
    ],
    matematica: {
      titulo: 'Um número muda. A chave muda de lugar.',
      texto:
        'Nesta experiência real da aula, x indica a posição para os lados. Ao passar de 160 para 280, a chave anda 120 unidades para a direita; y continua em 160. A criança vê o que a diferença entre os números faz no jogo.',
      imagens: [
        {
          imagem: {
            src: 'desafio-primeiro-jogo/farol-posicao-x160.webp',
            width: 800,
            height: 606,
            alt: 'Chave na posição x 160 e y 160.',
          },
          legenda: 'Antes: x = 160 · y = 160',
        },
        {
          imagem: {
            src: 'desafio-primeiro-jogo/farol-posicao-x280.webp',
            width: 800,
            height: 606,
            alt: 'Chave na posição x 280 e y 160, mais à direita.',
          },
          legenda: 'Depois: x = 280 · y = 160',
        },
      ],
      nota: null,
    },
    paisTitulo: 'Você também ganha um ponto de partida para acompanhar e conversar.',
    paisImagem: {
      src: 'kids-aprender-criando/area-dos-pais-conversa.webp',
      width: 1092,
      height: 288,
      alt: 'Área dos pais com três sugestões de perguntas sobre uma criação.',
    },
    paisLegenda: 'Na Área dos pais: sugestões para conversar sobre uma criação.',
    preparoTitulo: 'Para começar em casa, separem um computador e um primeiro momento juntos.',
    caderno: {
      src: 'desafio-primeiro-jogo/farol-caderno.png',
      width: 1334,
      height: 1888,
      alt: 'Página do Caderno do Aluno da Chave do Farol com orientações para testar o jogo com e sem a chave.',
    },
    cadernoLegenda:
      'Página real do Caderno do Aluno: testes para conferir o próprio projeto. Toque para ampliar.',
    familiaTitulo: 'Esse caminho começou na nossa família.',
    compartilhar: {
      titulo: 'Quando ele mostra o projeto, também tem uma história para contar.',
      texto:
        'O link permite que outra pessoa jogue o que ele criou. Seu filho pode mostrar uma escolha, apontar uma parte de que gostou ou contar uma tentativa. A criação dá um assunto concreto para essa troca.',
    },
    familiaImagem: {
      src: 'comunidade-dos-criadores/fundadores-casa.webp',
      width: 1280,
      height: 832,
      alt: 'Helena e Júlio, fundadores, em casa diante do notebook',
    },
  },
} as const

export const RELATOS_DESAFIO_9A17: readonly RelatoId[] = ['AV02', 'AV03', 'AV04']
