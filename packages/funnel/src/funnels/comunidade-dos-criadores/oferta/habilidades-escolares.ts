import { FAQ_ESCOLA, FAQ_ESCOLA_VISUALS } from './habilidades-escolares-faq'
import { FAQ, FOUNDER_COM_ESCOLA } from './shared'
import type { ComunidadePage } from './types'
import { FAQ_VISUALS } from './visuals'

/**
 * Página F: habilidades escolares. Proposta aprovada em 16/10/2026:
 * docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/f-habilidades-escolares.md.
 * Atividade complementar à escola: sem promessa de nota, sem série, sem reforço.
 */
export const PAGE_F = {
  id: 'habilidades-escolares',
  label: 'Habilidades da escola',
  seoTitle:
    'Criar jogos e praticar o que se aprende na escola | Comunidade dos Criadores | Sistema Zero',
  description:
    'No jogo que seu filho programa, números, leitura e lógica têm um efeito que ele vê e testa. Atividade complementar à escola, para crianças de 9 a 14 anos.',
  emphasis: 'cinco é a distância que o personagem anda',
  heroVisual: 'estudio',
  heroChip: 'Habilidades da escola',
  hero: {
    title:
      'No caderno, cinco é só um número. No jogo do seu filho, cinco é a distância que o personagem anda',
    description:
      'Muita criança aprende a repetir o passo do exemplo sem saber o que os números representam, e trava quando a pergunta muda. Criando um jogo, ela troca o valor de um comando de cinco para dez e vê o personagem andar o dobro. A aula liga o que ela viu ao que o número significa.',
    benefits: [
      'Números, leitura e lógica com um efeito que ele vê e testa na hora.',
      'Tamanho, posição e cor dos personagens viram escolhas que ele confere no cenário.',
      'Ele explica a conta pelo que acontece no jogo, e você entende o raciocínio dele.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos que leem com autonomia. No navegador do computador, com internet, mouse e teclado. Uma atividade de criação, complementar à escola.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Ver como isso aparece no jogo',
      href: '#experiencia',
    },
  },
  tourAfterSection: 'f01',
  sections: [
    {
      id: 'f01',
      title: 'Ele acompanha o exemplo, mas trava quando a pergunta muda',
      eyebrow: 'Entender a dificuldade',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Talvez você reconheça a cena: seu filho olha a conta resolvida no caderno e faz outra igual. Quando a pergunta muda um pouco, ele já não sabe por onde começar. Você explica de novo, faz mais um exemplo e tenta descobrir onde ele se perdeu.',
            'Muitas vezes ele aprendeu a repetir os passos e ainda não sabe o que aqueles números representam. Isso acontece porque, no exercício do caderno, o número não aparece fazendo nada: entra na conta, sai um resultado, e só a correção diz se deu certo. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade: muitas vezes, o que faltou foi ver o que o número faz.',
            'No jogo, o número faz. Um comando manda o personagem andar cinco passos. Seu filho troca para dez, aperta para testar e vê o personagem ir duas vezes mais longe. Então volta para cinco e compara. Agora o número é uma distância que ele enxerga, e a aula liga o que ele viu ao que o comando significa.',
            'Essa ligação entre o número e o que ele faz na tela aparece a cada projeto, dentro de uma coisa que seu filho quer ver funcionando.',
          ],
        },
      ],
      actions: [],
    },
    {
      // Segunda seção: o template põe aqui a âncora `#experiencia` do botão do herói.
      id: 'f02',
      title: 'No jogo do jardim, cada personagem encontrado soma um no contador',
      eyebrow: 'Um projeto por dentro',
      layout: 'story',
      visuals: ['jogo-pronto', 'aula-estudio', 'contador', 'salvamento'],
      groups: [
        {
          title: 'Primeiro ele joga',
          paragraphs: [
            'Toca nos esconderijos do jardim e vai achando os personagens escondidos, enquanto o contador sobe. Agora ele sabe aonde vai chegar.',
          ],
        },
        {
          title: 'Depois monta a regra',
          paragraphs: [
            'Quando tocar no esconderijo, o personagem aparece e o contador soma um. O vídeo mostra cada passo ao lado do editor, e as falas do Zappy têm o botão Ouvir, que lê a instrução em voz alta.',
          ],
        },
        {
          title: 'Então testa',
          paragraphs: [
            'Aperta para jogar e confere se o número mudou na hora certa. Se ele sobe quando o toque cai num espaço vazio, algo na regra está trocado, e é ali que ele vai procurar. No experimento, Uma pista indica onde olhar.',
          ],
        },
        {
          title: 'E guarda para amanhã',
          paragraphs: [
            'O aviso Guardado na sua conta confirma que o projeto ficou salvo, e a faixa O que falta para seguir mostra o próximo passo.',
          ],
        },
        {
          title: null,
          paragraphs: [
            'Nessa regra cabem leitura (entender o pedido), contagem (o número que sobe) e lógica (só soma quando encontra). Peça que ele mostre o que faz o número mudar: a explicação dele diz o que entendeu.',
          ],
        },
      ],
      falas: ['N5'],
      actions: [],
    },
    {
      id: 'f09',
      title: 'O que pais e alunos percebem quando a criança explica o próprio jogo',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: [],
      groups: [
        {
          title: null,
          paragraphs: ['Alunos e pais contam, com as palavras deles, como foram as aulas.'],
        },
      ],
      falas: ['AV08', 'N11', 'AV09', 'AV03'],
      actions: [],
    },
    {
      id: 'f03',
      title: 'Leitura, conta e investigação ganham uma tarefa dentro do jogo',
      eyebrow: 'A escola dentro do jogo',
      layout: 'cards',
      visuals: [],
      groups: [
        {
          title: 'Leitura: entender o que está sendo pedido',
          paragraphs: [
            'A instrução pede que o personagem apareça depois de um toque. Para montar, ele precisa descobrir o que fazer e quando, como num enunciado. Se não entendeu, volta ao trecho e lê de novo.',
          ],
        },
        {
          title: 'Matemática: prever antes de conferir',
          paragraphs: [
            'O placar soma pontos, as vidas diminuem, o personagem anda um número de passos. Antes de mudar um valor, ele diz o que vai acontecer; depois joga e confere se acertou.',
          ],
        },
        {
          title: 'Ciências: mudar uma coisa por vez',
          paragraphs: [
            'No experimento do jardim, ele liga e desliga a reação e compara as duas versões. Mudar uma coisa e observar o efeito é o jeito de investigar que as aulas de ciências pedem.',
          ],
        },
        {
          title: 'Resolver problemas: começar por uma parte',
          paragraphs: [
            'Um jogo tem personagem, obstáculos e pontos. Ele faz o personagem andar, testa e só então acrescenta a próxima parte. É a mesma organização que um trabalho escolar de várias etapas pede.',
          ],
        },
      ],
      actions: [
        {
          label: 'Ver os planos para meu filho',
          href: '#planos',
        },
      ],
    },
    {
      id: 'f05',
      title: 'O personagem ficou parado, e agora ele tem um problema para investigar',
      eyebrow: 'Quando não funciona',
      layout: 'story',
      visuals: ['pausa'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho montou a regra, apertou para jogar e o personagem não saiu do lugar. Na conta do caderno, o erro só aparece na correção. No jogo, ele aparece na hora, na regra que ele acabou de montar.',
            'Então ele investiga: volta ao trecho do vídeo, compara com a montagem e muda uma parte por vez. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta, e cada novo teste diz se a mudança resolveu.',
            'Reler o pedido, conferir uma etapa e tentar de novo também são o que um problema de matemática pede. No jogo, ele pratica isso toda vez que o personagem não obedece, e sem ninguém dando a resposta pronta.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f06',
      title: 'Você não precisa saber programar para entender o que ele fez',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A programação está nas aulas. O seu papel é outro: combinar o horário, abrir a primeira aula junto e, depois, pedir para ver o jogo.',
            'Na sua área, cada filho tem um painel com os cursos, as atividades, as entregas, os temas que estudou e o ponto da Jornada. Dali você escolhe um projeto e faz a pergunta que abre a conversa: “Me mostra o que você mudou.” Ele aponta o bloco, joga e explica. Você entende o que ele aprendeu pelo que ele mostra, e passa a fazer parte de um assunto que antes era só dele.',
            'Uma etapa concluída diz que ele cumpriu o pedido da aula; a explicação dele diz o que entendeu. Os dois juntos contam muito mais do que o tempo que ele passou conectado.',
            'Dá para aproximar o jogo da matéria da semana. Se a escola está em multiplicação e, numa atividade, ele define quantos pontos vale cada estrela, pergunte quantos pontos ele faz com quatro estrelas e joguem para conferir. Se a dificuldade é começar uma tarefa, lembre com ele por qual parte o jogo começou.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f08',
      title:
        'O aplicativo de exercício dá ponto por acerto; no jogo que ele cria, é ele quem decide quanto vale o ponto',
      eyebrow: 'Antes de escolher',
      layout: 'cards',
      visuals: [],
      groups: [
        {
          title: 'Reforço escolar',
          paragraphs: [
            'Quando há matéria atrasada, um professor de reforço retoma o conteúdo da série, e para isso ele é a escolha certa. A Comunidade não segue a série e não substitui esse trabalho.',
          ],
        },
        {
          title: 'Aplicativo de exercício',
          paragraphs: [
            'Transforma a lista em desafio, com pontos e fases, e a criança responde ao que o aplicativo pergunta. Criando o jogo, ela escreve a regra que dá os pontos, e por isso precisa entender a conta por dentro.',
          ],
        },
        {
          title: 'Explicar de novo em casa',
          paragraphs: [
            'Funciona quando você tem tempo e jeito para aquela matéria. Aqui a explicação fica gravada ao lado do editor, e você entra na conversa pelo jogo que ele mostra, e a explicação fica por conta da aula.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'f07',
      title: 'Um jogo puxa o próximo, e os postos da Jornada abrem ferramentas novas',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['pensa'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Os cursos são projetos de jogo em sequência: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito, Corre, Dino e os próximos. Quando conclui A Chave do Farol e publica o projeto, seu filho chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para ele voltar a um jogo, mudar uma regra e testar outra conta.',
            'No posto Inventor chegam o Pensa, que ajuda a dividir uma ideia de jogo em tarefas, e a ajuda do Zappy no Estúdio, que examina os blocos sem mexer no projeto. Os dois usam os créditos de inteligência artificial da família.',
          ],
        },
      ],
      actions: [],
    },
  ],
  founder: FOUNDER_COM_ESCOLA,
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Aprendizagem e escola',
      questions: ['escola', 'notas', 'serie', 'aprendizagem', 'interesse'],
    },
    {
      title: 'Para começar',
      questions: [
        'matematica',
        'leitura',
        'programacao',
        'desenho',
        'pais',
        'aulas-gravadas',
        'ao-vivo',
        'equipamento',
        'nivel',
      ],
    },
    {
      title: 'Rotina e tela',
      questions: ['telas', 'frequencia', 'salvamento'],
    },
    {
      title: 'Ferramentas e inteligência artificial',
      questions: ['liberacao', 'catalogo', 'ia', 'creditos', 'avancado', 'certificado'],
    },
    {
      title: 'Família e segurança',
      questions: ['irmaos', 'perfil', 'convivencia', 'apoio-especifico'],
    },
    {
      title: 'Assinatura',
      questions: ['ajuda', 'custos', 'cancelamento', 'reembolso', 'atendimento'],
    },
  ],
  closing: {
    id: 'convite',
    title:
      'Na próxima vez que ele chamar você para jogar, peça para ver a conta por trás do placar',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Abram juntos a primeira aula num dia combinado. Ele joga, monta a primeira regra e mostra para você o número mudando na hora certa.',
          'Daí para a frente, os jogos trazem contas, instruções e ideias para ele explicar, e você ganha um assunto de escola que começa pelo que ele quer fazer. Se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para meu filho',
        href: '#planos',
      },
    ],
  },
  faq: { ...FAQ, ...FAQ_ESCOLA },
  faqVisuals: {
    ...Object.fromEntries(Object.keys(FAQ).map((id) => [id, FAQ_VISUALS[id] ?? []])),
    ...FAQ_ESCOLA_VISUALS,
  },
} satisfies ComunidadePage
