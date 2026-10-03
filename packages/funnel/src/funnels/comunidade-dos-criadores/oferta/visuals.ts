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
  reunida: {
    mode: 'set',
    frames: [
      tela(
        'aula-estudio',
        'Aula',
        'Aula com o vídeo e a fala do Zappy à esquerda e a atividade no Estúdio à direita.',
      ),
      tela('recados', 'Recados', 'Recados do professor com a dúvida enviada a partir da aula.'),
      tela(
        'mural',
        'Mural',
        'Mural dos Criadores com cartões de jogos e botões para jogar e copiar o link.',
      ),
    ],
    caption: 'Aulas e ferramentas de criação reunidas na mesma plataforma.',
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
  jornada: {
    mode: 'set',
    frames: [
      tela(
        'jornada-postos',
        'Minha jornada',
        'Minha jornada no perfil: cada posto com o que já foi liberado e os postos em construção.',
      ),
      tela(
        'jornada',
        'Jornada',
        'Mapa da Jornada do Criador com o posto atual e as aventuras da trilha.',
      ),
    ],
    caption: 'A Jornada mostra o próximo passo e os requisitos para liberar uma ferramenta.',
  },
  catalogo: {
    frames: [
      tela(
        'catalogo',
        'Aventuras da trilha',
        'Aventuras da trilha Construtor: os cursos publicados, com aulas e progresso de cada um.',
      ),
    ],
    caption: 'O catálogo disponível permite conhecer as atividades que podem ser iniciadas.',
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
  planejamento: {
    frames: [
      tela(
        'planejamento',
        'Equipe do plano',
        'Equipe do plano no Pensa: código do plano, lugares e quem já entrou.',
      ),
    ],
    caption: 'As crianças podem compartilhar o plano e construir nas próprias ferramentas.',
  },
  molda: {
    frames: [
      tela(
        'molda',
        'Molda',
        'Molda com um personagem de blocos em três dimensões, ferramentas de modelar e a lista de peças.',
      ),
    ],
    caption: 'As ferramentas posteriores têm requisitos próprios na Jornada.',
  },
  codigo: {
    frames: [
      tela(
        'codigo',
        'Ponte',
        'Estúdio no modo Ponte: os blocos, o código gerado e o jogo lado a lado.',
      ),
    ],
    caption: 'O percurso prevê recursos que aproximam blocos e código.',
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
  espaco: {
    mode: 'set',
    frames: [
      tela(
        'avatar',
        'Meu avatar',
        'Meu avatar: personagem em 3D com opções de rosto, cabelo e roupas.',
      ),
      tela('quarto', 'Meu quarto', 'Meu quarto com cama, mesa e cadeira posicionadas no espaço.'),
      tela(
        'conquistas',
        'Minhas conquistas',
        'Minhas conquistas no perfil, com os marcos já alcançados e os que faltam.',
      ),
    ],
    caption: 'A criança tem um espaço para seu avatar e seu percurso.',
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
        'Área dos responsáveis',
        'Área dos responsáveis com o progresso de cada criança: pontos, medalhas, entregas, cursos e o posto na Jornada do Criador.',
        948,
        592,
      ),
      tela(
        'pais-conversa',
        'Para conversar sobre uma criação',
        'Área dos responsáveis com o resumo da semana por e-mail, perguntas para conversar sobre uma criação e o atendimento.',
        704,
        440,
      ),
    ],
    caption: 'Você localiza uma criação para conhecer e conversar com seu filho.',
  },
  privacidade: {
    frames: [
      tela(
        'pais-perfil',
        'Editar perfil',
        'Editar perfil na Área dos pais, com a opção Perfil público na comunidade kids desmarcada.',
        480,
        536,
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
        'Atendimento na Área dos pais, com o botão Abrir chamado.',
        960,
        600,
      ),
      tela(
        'pais-chamado',
        'Abrir chamado',
        'Formulário Abrir chamado, com assunto, categoria e o campo para contar o que aconteceu.',
        960,
        600,
      ),
    ],
    caption: 'O atendimento da família reúne dúvidas sobre conta e assinatura.',
  },
  indicacao: {
    frames: [
      tela(
        'pais-indicacao',
        'Seja um embaixador',
        'Cartão Seja um embaixador do Sistema Zero na Área dos pais, com as condições do programa de indicações.',
        704,
        268,
      ),
    ],
    caption: 'O convite segue as condições apresentadas no programa de indicações.',
  },
  // As três abaixo vêm de capturas da própria dona na conta dela (02/10/2026), recortadas e com
  // o sobrenome da criança e os dígitos do cartão embaçados. O @2x é ampliado: não há captura
  // em escala 2 dessas telas.
  creditos: {
    frames: [
      tela(
        'pais-creditos',
        'Ajuda da IA neste mês',
        'Quadro Ajuda da IA neste mês na Área dos pais: 0 de 500 no mês, renovação em 1º de novembro, 0 de 50 no dia e o aviso de que as crianças da família dividem o mesmo total.',
        720,
        193,
      ),
    ],
    caption: 'O saldo de ajuda da IA do mês é um só para a família e aparece na Área dos pais.',
  },
  compras: {
    frames: [
      tela(
        'pais-compras',
        'Minhas compras',
        'Minhas compras na Área dos pais: a assinatura da Comunidade dos Criadores ativa, com o valor, a data da próxima cobrança e o botão Cancelar, e as compras pagas logo abaixo.',
        592,
        572,
      ),
    ],
    caption:
      'Em Minhas compras ficam a assinatura, a data da próxima cobrança e a opção de cancelar.',
  },
  perfis: {
    frames: [
      tela(
        'pais-perfis',
        'Gerenciar perfis',
        'Gerenciar perfis na Área dos pais, com o perfil de uma criança, o botão Adicionar e a indicação 1 de 2 perfis do seu plano.',
        640,
        400,
      ),
    ],
    caption:
      'Cada criança tem o próprio perfil. A Área dos pais mostra quantos perfis cabem no plano.',
  },
}

/**
 * Demonstrações citadas pela copy que ainda NÃO têm tela real. Não renderizam nada: a seção ou a
 * resposta segue só com o texto. Para ligar uma delas, capture a tela e mova a chave para
 * `COMUNIDADE_VISUALS` (os vínculos com as quatro páginas e com as dúvidas já existem).
 */
export const PENDING_VISUALS: Record<string, string> = {
  conexao: 'Aviso de sem conexão: o editor não mostra um estado próprio para fotografar.',
}

export const visualDe = (id: string): ComunidadeVisual | null => COMUNIDADE_VISUALS[id] ?? null

export const FAQ_VISUALS: Record<string, readonly string[]> = {
  programacao: ['aula', 'estudio'],
  desenho: ['estudio', 'pinta'],
  'aulas-gravadas': ['pausa'],
  ajuda: ['recados'],
  pais: ['responsavel'],
  aprendizagem: ['aprendizagem', 'responsavel'],
  interesse: ['aula'],
  'so-desenho': ['integracao'],
  papel: ['pinta', 'integracao'],
  equipamento: ['aula'],
  internet: ['salvamento'],
  liberacao: ['jornada'],
  catalogo: ['catalogo'],
  ia: ['pensa', 'zappy'],
  pensa: ['pensa'],
  zappy: ['zappy'],
  creditos: ['creditos'],
  planejamento: ['planejamento'],
  salvamento: ['salvamento'],
  exportacao: ['exportacao'],
  ferias: ['ferias'],
  pontos: ['missoes'],
  certificado: ['certificado'],
  'apoio-especifico': ['aula'],
  desafio: ['jornada'],
  nivel: ['catalogo', 'estudio'],
  roblox: ['estudio'],
  '3d': ['molda'],
  codigo: ['codigo'],
  atendimento: ['conta'],
  senha: ['senha'],
  indicacao: ['indicacao'],
  cancelamento: ['compras'],
  reembolso: [],
  irmaos: ['perfis'],
  perfil: ['privacidade'],
  'jogos-publicos': ['publicacao'],
  convivencia: ['clube'],
  custos: ['jornada', 'creditos'],
  telas: ['pausa'],
}

/**
 * A faixa "Por dentro da Comunidade": uma tela de cada área, com o nome que a plataforma dá a ela
 * e UMA linha PESSOAL sobre a função: o filho fazendo algo ali ("Onde seu filho monta e testa os
 * jogos"), nunca a descrição da ferramenta. Só o que a copy das páginas já afirma de cada área,
 * sem condição de acesso (a faixa mostra o que existe; a liberação está no capítulo da Jornada).
 */
export interface ComunidadeTourItem extends ComunidadeFrame {
  resumo: string
}

const area = (frame: ComunidadeFrame, resumo: string): ComunidadeTourItem => ({ ...frame, resumo })

export const TOUR: readonly ComunidadeTourItem[] = [
  area(
    tela(
      'jogo-pronto',
      'Aulas',
      'Aula com vídeo, fala do Zappy e o jogo pronto para experimentar.',
    ),
    'Onde seu filho vê a explicação e faz o passo.',
  ),
  area(
    tela('estudio', 'Estúdio', 'Estúdio com os blocos do jogo e a partida em execução.'),
    'Onde seu filho monta e testa os jogos.',
  ),
  area(
    tela('pinta', 'Pinta', 'Editor do Pinta com um personagem de cavaleiro.'),
    'Onde ele desenha personagens e cenários.',
  ),
  area(
    tela('pensa', 'Pensa', 'Plano de criação no Pensa, com as etapas e os cartões de tarefa.'),
    'Onde ele transforma uma ideia em plano.',
  ),
  area(
    tela('molda', 'Molda', 'Molda com um personagem de blocos em três dimensões.'),
    'Onde ele cria em três dimensões.',
  ),
  area(
    tela('catalogo', 'Jornada', 'Aventuras da trilha na Jornada do Criador.'),
    'Onde ele vê o próximo passo.',
  ),
  area(
    tela('mural', 'Mural', 'Mural dos Criadores com os jogos publicados.'),
    'Onde ele apresenta o jogo que publicou.',
  ),
  area(
    tela('recados', 'Recados', 'Recados do professor com uma dúvida de aula.'),
    'Onde ele acompanha a ajuda que pediu.',
  ),
  area(
    tela('quarto', 'Meu quarto', 'Meu quarto com cama, mesa e cadeira posicionadas no espaço.'),
    'Onde ele monta um espaço do jeito dele.',
  ),
  area(
    tela(
      'como-fazer',
      'Como fazer',
      'Biblioteca de ajuda Como fazer, com os tutoriais por assunto.',
    ),
    'Onde ele consulta como fazer uma ação.',
  ),
]
