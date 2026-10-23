import type { ComunidadeFrame, ComunidadeVisual } from './types'

// Todas as imagens são capturas REAIS do kids em staging (perfil de teste), feitas por
// `scripts/captura-telas-kids.ts`. Não há mais prévia desenhada: o que não tem tela real fica em
// `PENDING_VISUALS` e simplesmente não aparece na página.
const tela = (
  nome: string,
  label: string,
  alt: string,
  width = 1280,
  height = 800,
): ComunidadeFrame => ({
  file: `tela-${nome}.webp`,
  retina: `tela-${nome}@2x.webp`,
  alt,
  label,
  width,
  height,
})

export const COMUNIDADE_VISUALS: Record<string, ComunidadeVisual> = {
  'como-fazer': {
    frames: [
      tela(
        'como-fazer',
        'Como fazer',
        'Biblioteca de ajuda Como fazer, com os tutoriais por assunto.',
      ),
    ],
    caption: 'Os tutoriais ficam disponíveis para consultar o uso das ferramentas.',
  },
  'jogo-pronto': {
    frames: [
      tela(
        'jogo-pronto',
        'Conheça o jogo',
        'Início do curso Cadê Todo Mundo? com o vídeo de apresentação e o jogo pronto para encontrar os personagens no jardim.',
      ),
    ],
    caption: 'A criança começa jogando o projeto que o curso vai ajudar a construir.',
  },
  aula: {
    frames: [
      tela(
        'aula',
        'Aula',
        'Aula do curso Cadê Todo Mundo? com vídeo, fala do Zappy, experimento do jardim e botão Preciso de ajuda.',
      ),
    ],
    caption: 'A orientação e o experimento ficam juntos durante a atividade.',
  },
  'aula-estudio': {
    frames: [
      tela(
        'aula-estudio',
        'Aula',
        'Aula com o vídeo e a fala do Zappy à esquerda e a atividade no Estúdio à direita.',
      ),
    ],
    caption:
      'A explicação acompanha a construção: ver o passo, fazer a ação e conferir o resultado.',
  },
  contador: {
    frames: [
      tela(
        'contador',
        'Experimento',
        'Experimento do contador de achados: o número muda quando um personagem é encontrado.',
      ),
    ],
    caption: 'O contador muda quando um personagem é encontrado.',
  },
  preparados: {
    frames: [
      tela(
        'materiais',
        'Materiais do jogo',
        'Materiais do jogo no Estúdio com personagens e cenário prontos para usar no projeto.',
        680,
        425,
      ),
    ],
    caption: 'Um personagem preparado permite começar pelas regras do jogo.',
  },
  // `tela-pinta-vetor`, `tela-pinta` e `tela-animacao` mostram a caixa do editor de vetor de
  // ANTES de 10/10/2026 (os seis botões de espessura no alto; hoje a espessura mora em
  // Aparência). Decisão da dona (11/10/2026): ficam, porque os desenhos do Lipe são os mais
  // bonitos para a página pública e o detalhe não justifica trocá-los. Se refizer, que seja
  // com os mesmos desenhos (roteiro `pinta` no perfil do Lipe).
  'pinta-vetor': {
    frames: [
      tela(
        'pinta-vetor',
        'Pinta',
        'Editor de vetor do Pinta com um cenário de macieira, nuvens e um personagem, e as camadas do desenho.',
      ),
    ],
    // A tela mostra um CENÁRIO (e não um personagem): a legenda diz o que a copy já afirma do Pinta.
    caption: 'Personagens, cenários e peças do jogo podem ser desenhados no Pinta.',
  },
  pausa: {
    frames: [
      tela(
        'pausa',
        'Aula',
        'Vídeo da aula pausado ao lado do experimento, com o percentual já assistido.',
      ),
    ],
    caption: 'A explicação pode ser pausada e revista enquanto a criança realiza a tarefa.',
  },
  estudio: {
    frames: [
      tela(
        'estudio',
        'Estúdio',
        'Estúdio com os blocos do jogo Cadê Todo Mundo? à esquerda e o jogo em execução à direita.',
      ),
    ],
    caption: 'O comando que a criança monta tem um efeito para conferir no jogo.',
  },
  regra: {
    mode: 'steps',
    frames: [
      tela(
        'regra-desligada',
        'Reação desligada',
        'Experimento com a reação ao toque desligada: o arbusto continua visível e nada acontece.',
      ),
      tela(
        'regra-ligada',
        'Reação ligada',
        'O mesmo experimento com a reação ao toque ligada: o arbusto some e o coelho aparece.',
      ),
    ],
    caption: 'Alterar uma regra permite comparar o resultado e explicar a escolha.',
  },
  pinta: {
    frames: [
      tela(
        'pinta',
        'Pinta',
        'Editor do Pinta com um personagem de cavaleiro: capacete, escudo, espada, ferramentas e paleta de cores.',
      ),
    ],
    caption: 'Cores, formas e detalhes podem ser trabalhados na aparência do personagem.',
  },
  integracao: {
    mode: 'steps',
    frames: [
      tela('pinta', 'Pinta', 'Personagem de cavaleiro desenhado no editor do Pinta.'),
      tela(
        'trazer-do-pinta',
        'Trazer do Pinta',
        'Janela Trazer do Pinta, dentro do Estúdio, com os desenhos da galeria e o cavaleiro marcado como no projeto.',
        800,
        500,
      ),
      tela(
        'materiais',
        'Materiais do jogo',
        'Materiais do jogo no Estúdio, com o cavaleiro do Pinta entre as imagens do projeto.',
        680,
        425,
      ),
    ],
    caption: 'A arte criada no Pinta pode participar de um projeto no Estúdio.',
  },
  animacao: {
    frames: [
      tela(
        'animacao',
        'Pinta',
        'Pinta com a animação de um personagem em cinco quadros e o fantasma do quadro anterior.',
      ),
    ],
    caption: 'Os quadros trabalham o movimento visual; as regras definem a interação no jogo.',
  },
  recados: {
    mode: 'steps',
    frames: [
      tela(
        'ajuda',
        'Preciso de ajuda',
        'Campo Preciso de ajuda aberto na seção da aula, com uma dúvida escrita.',
      ),
      tela(
        'recados-conversa',
        'Recados',
        'Conversa nos Recados com a dúvida enviada e o atalho para voltar à seção da aula.',
      ),
    ],
    caption: 'O pedido de ajuda parte da atividade, e a conversa continua nos Recados.',
  },
  aprendizagem: {
    frames: [
      tela(
        'aprendizagem',
        'Experimento',
        'Experimento ampliado com as descobertas registradas e a explicação do que aconteceu.',
        1280,
        920,
      ),
    ],
    caption: 'A criança pode mostrar uma escolha e conferir seu efeito no projeto.',
  },
  // 16/10/2026 (decisão da dona: a venda não mostra "em construção"): as capturas da Jornada
  // trazem o cartão "Mais 6 postos estão sendo construídos". Aqui entra só o RECORTE da tela
  // Minha jornada, com o título e os postos Faísca e Construtor (`tela-jornada-meus-postos`,
  // recortado de `tela-jornada-postos` na caixa 600,30–2500,804 do @2x). O mapa (`tela-jornada`)
  // saiu: a mensagem fica no meio dele. Recapturou? Refaça o recorte.
  jornada: {
    frames: [
      tela(
        'jornada-meus-postos',
        'Minha jornada',
        'Minha jornada no perfil: o posto Faísca concluído e o posto atual, Construtor, com o que cada um liberou.',
        950,
        387,
      ),
    ],
    caption: 'A Jornada mostra em que posto a criança está e o que cada posto liberou.',
  },
  // A captura inteira (`tela-catalogo`) traz no alto o fim do mapa, com "Mais 6 postos estão
  // sendo construídos": entra só o RECORTE da lista de aventuras (`tela-catalogo-trilha`, caixa
  // 600,330–2560,1600 do @2x). Recapturou? Refaça o recorte.
  catalogo: {
    frames: [
      tela(
        'catalogo-trilha',
        'Aventuras da trilha',
        'Aventuras da trilha Construtor: os cursos publicados, com aulas e progresso de cada um.',
        980,
        635,
      ),
    ],
    caption: 'As aventuras da trilha mostram os cursos e o progresso em cada um.',
  },
  pensa: {
    mode: 'steps',
    frames: [
      tela(
        'pensa-conversa',
        'Conversa com o Zappy',
        'Pensa na etapa Zerar a Bagunça: conversa sobre a ideia do jogo e a Carta da Ideia aprovada.',
      ),
      tela(
        'pensa',
        'Cartões de Criação',
        'Pensa na etapa Roteirizar a Criação: cartões de tarefa que abrem no Pinta e no Estúdio.',
      ),
    ],
    caption: 'O Pensa ajuda a organizar as escolhas sobre o jogo em um plano de criação.',
  },
  zappy: {
    frames: [
      tela(
        'zappy',
        'Zappy',
        'Zappy do Studio respondendo a uma dúvida ao lado dos blocos do projeto.',
      ),
    ],
    caption: 'O Zappy oferece orientação; a criança faz o ajuste e testa o resultado.',
  },
  molda: {
    frames: [
      tela(
        'molda',
        'Molda',
        'Molda com um personagem de blocos em três dimensões, ferramentas de modelar e a lista de peças.',
      ),
    ],
    caption:
      'O Molda abre no posto Explorador de Mundos, para criar personagens em três dimensões.',
  },
  codigo: {
    frames: [
      tela(
        'codigo',
        'Ponte',
        'Estúdio no modo Ponte: os blocos, o código gerado e o jogo lado a lado.',
      ),
    ],
    caption: 'No posto Gênio da Criação, o modo Ponte mostra os blocos ao lado do código.',
  },
  mural: {
    frames: [
      tela(
        'mural',
        'Mural',
        'Mural dos Criadores com cartões de jogos e botões para jogar, copiar o link e fazer uma versão.',
      ),
    ],
    caption: 'Um projeto publicado pode ser apresentado no Mural dos Criadores.',
  },
  clube: {
    frames: [
      tela(
        'clube',
        'Combinados do Clube',
        'Os combinados do Clube: gentileza, cuidado com dados pessoais e o caminho Avisar professor.',
        600,
        590,
      ),
    ],
    caption: 'Os combinados e o aviso à equipe apoiam a participação nas conversas.',
  },
  missoes: {
    mode: 'set',
    frames: [
      tela(
        'missoes',
        'Missões',
        'Missões de hoje e da semana na página inicial, com o progresso de cada uma.',
      ),
      tela(
        'conquistas',
        'Minhas conquistas',
        'Minhas conquistas no perfil, com os marcos já alcançados e os que faltam.',
      ),
    ],
    caption: 'Pontos registram participação; os projetos permitem conhecer o trabalho.',
  },
  publicacao: {
    mode: 'steps',
    frames: [
      tela(
        'jogo-publicado',
        'Link do jogo',
        'Página pública de um jogo publicado, aberta pelo link, com a partida em andamento.',
      ),
      tela(
        'cartao-jogo',
        'Cartão do jogo',
        'Cartão do jogo com a capa, o título e o começo do código para apontar a câmera.',
        384,
        436,
      ),
    ],
    caption: 'Um jogo publicado por link tem visibilidade pública própria.',
  },
  salvamento: {
    mode: 'set',
    frames: [
      tela(
        'pinta-galeria',
        'Meus desenhos',
        'Galeria do Pinta com personagens desenhados e o aviso Guardado na sua conta.',
      ),
      tela(
        'estudio-lista',
        'Meus Jogos',
        'Meus Jogos no Estúdio: os projetos guardados, com capa e data da última alteração.',
      ),
    ],
    caption: 'A galeria organiza as criações, e o aviso informa o estado do salvamento.',
  },
  exportacao: {
    mode: 'set',
    frames: [
      tela(
        'exportacao',
        'Baixar',
        'Opções de Baixar no Pinta: desenho editável, folha de animações em PNG e SVG, receita para o Estúdio e GIF.',
      ),
      tela(
        'estudio-levar',
        'Levar o jogo',
        'Menu do Estúdio com Levar o jogo: baixar o projeto, o código ou o pacote para publicar.',
      ),
    ],
    caption: 'O formato da cópia define como ela pode ser usada fora da ferramenta.',
  },
  ferias: {
    frames: [
      tela(
        'ferias',
        'Meu perfil',
        'Proteja sua sequência no perfil: protetores e o botão de ativar o modo férias.',
      ),
    ],
    caption: 'O modo férias protege a sequência de participação, sem suspender o plano.',
  },
  certificado: {
    mode: 'steps',
    frames: [
      tela(
        'certificado',
        'Certificado',
        'Aula final de um curso concluído: o Zappy avisa que o jogo terminou e o Certificado de Conclusão aparece pronto para baixar em PDF.',
      ),
      tela(
        'certificado-modelo',
        'O certificado',
        'Certificado do curso Cadê Todo Mundo? com o nome da criança, a data de conclusão e o código para validar.',
        760,
        538,
      ),
    ],
    caption: 'O certificado, quando oferecido pelo curso, registra a conclusão.',
  },
  senha: {
    frames: [
      tela('senha', 'Entrada', 'Tela de recuperação de senha, acessada a partir da entrada.'),
    ],
    caption: 'A recuperação de senha começa na tela de entrada.',
  },
  // Área dos pais (entra com a senha da conta). As legendas são as do plano de provas visuais.
  responsavel: {
    mode: 'set',
    frames: [
      tela(
        'pais-painel',
        'Acompanhamento',
        'Acompanhamento na Área dos pais: a escolha da criança, o que ela fez nesta semana, o jogo publicado no Mural e os números no total, como pontos, medalhas, cursos e entregas.',
        1152,
        640,
      ),
      tela(
        'pais-conversa',
        'Para conversar sobre uma criação',
        'Perguntas para conversar sobre uma criação e o interruptor Receber o resumo da semana por e-mail, no Acompanhamento da Área dos pais.',
        392,
        346,
      ),
    ],
    caption: 'Você localiza uma criação para conhecer e conversar com seu filho.',
  },
  privacidade: {
    frames: [
      tela(
        'pais-perfil',
        'Editar perfil',
        'Editar o perfil de uma criança na Área dos pais, com o nome, a data de nascimento (embaçada aqui) e a opção Perfil público na comunidade kids.',
        542,
        470,
      ),
    ],
    caption: 'O responsável administra a visibilidade do perfil para os colegas.',
  },
  conta: {
    mode: 'steps',
    frames: [
      tela(
        'pais-atendimento',
        'Atendimento',
        'Atendimento, na Ajuda da Área dos pais, com os botões Atualizar e Abrir chamado.',
        835,
        355,
      ),
      tela(
        'pais-chamado',
        'Abrir chamado',
        'Formulário Abrir chamado, com assunto, categoria e o campo para contar o que aconteceu.',
        634,
        418,
      ),
    ],
    caption: 'O atendimento da família reúne dúvidas sobre conta e assinatura.',
  },
  // As telas da Área dos pais são capturas do staging de 11/10/2026 (páginas próprias), menos
  // "Minhas compras": ela vem de uma captura da própria dona na conta dela (02/10/2026), com os
  // dígitos do cartão embaçados, porque o staging não tem assinatura ativa para mostrar. O @2x
  // dela é ampliado: não há captura em escala 2.
  // ⚠️ `creditos`: a captura ainda mostra o título antigo "Ajuda da IA neste mês". A tela passou a
  // se chamar "Créditos do Zappy e do Pensa neste mês" (20/10/2026): refaça a captura antes de usar.
  creditos: {
    frames: [
      tela(
        'pais-creditos',
        'Créditos do Zappy e do Pensa',
        'Quadro dos créditos do mês na Conta da Área dos pais, usados pelo Pensa e pela ajuda do Zappy: 0 de 500 no mês, renovação em 1º de novembro, 0 de 50 no dia e o aviso de que as crianças da família dividem o mesmo total.',
        384,
        239,
      ),
    ],
    caption:
      'Os créditos do Pensa e da ajuda do Zappy têm limite por dia e por mês, num só total para a família, que aparece na Área dos pais.',
  },
  compras: {
    frames: [
      tela(
        'pais-compras',
        'Minhas compras',
        'Minhas compras, na Conta da Área dos pais: a assinatura da Comunidade dos Criadores ativa, com o valor, a data da próxima cobrança e o botão Cancelar, e as compras pagas logo abaixo.',
        592,
        572,
      ),
    ],
    caption:
      'Em Conta, na parte Minhas compras, ficam a assinatura, a data da próxima cobrança e a opção de cancelar.',
  },
  perfis: {
    frames: [
      tela(
        'pais-perfis',
        'Família',
        'Suas crianças, na Família da Área dos pais: o cartão de cada criança com o acesso Liberado, os números da jornada, o que fez na semana e os botões Acesso nos aparelhos e Ver progresso.',
        1144,
        550,
      ),
    ],
    caption:
      'Cada criança tem o próprio cartão na Área dos pais, com o acesso nos aparelhos e o progresso.',
  },
}

/**
 * Demonstrações citadas pela copy que ainda NÃO têm tela real. Não renderizam nada: a seção ou a
 * resposta segue só com o texto. Para ligar uma delas, capture a tela e mova a chave para
 * `COMUNIDADE_VISUALS`.
 */
export const PENDING_VISUALS: Record<string, string> = {
  conexao: 'Aviso de sem conexão: o editor não mostra um estado próprio para fotografar.',
}

export const visualDe = (id: string): ComunidadeVisual | null => COMUNIDADE_VISUALS[id] ?? null
