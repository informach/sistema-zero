// Copy da carta de resultado do quiz adulto do Desafio, v1 (21/10/2026, Canvas "Quiz do Desafio ·
// Kids e adulto", quadros PlanoAdulto e ResultadoAdulto). Cinco movimentos: o que a pessoa contou,
// por que acontece, o que muda (ainda sem o produto), onde isso acontece (o Desafio, a tela real do
// jogo e os fundadores, sem relato) e o que a pessoa disse que importa, com as condições ditas com
// honestidade. Fatos só da página adulta aprovada (`oferta/pagina.ts`).
//
// `[[...]]` marca a resposta da pessoa devolvida no texto (vira `<mark>`).
import type { Condition, DesafioAdultoProfile } from './engine'

export const m = (texto: string): string => `[[${texto}]]`

export const APPROXIMATE_NOTE =
  'Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu.'
export const ASSINATURA = 'Helena e Júlio, Sistema Zero'
export const WHERE_HEADING = 'Onde isso acontece'
export const CTA_UNMET_LABEL = 'Ver os requisitos e como funciona'
/** A linha abaixo do botão: pagamento único, sem planos. */
export const CTA_NOTA = 'O preço aparece na próxima página.'
export const ctaUnmetText = (itens: string[]): string => {
  const lista =
    itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '')
  return `Na próxima página, você vê como tudo funciona e confere, com calma, ${lista}.`
}

export const PROFILE_LABELS: Record<DesafioAdultoProfile, string> = {
  A: 'Horas livres',
  B: 'A ideia',
  D: 'Por dentro',
}

// ---------------------------------------------------------------------------------------------
// Abertura: "Você contou que <resposta que abre>, <tentativa> e <tempo livre>."
// ---------------------------------------------------------------------------------------------

/** A frase que parece com a pessoa (P), como volta na carta: começa pelo verbo. */
export const CENA: Record<DesafioAdultoProfile, string> = {
  A: 'joga há anos e nunca fez nada além de jogar',
  B: 'tem uma ideia de jogo há anos e nunca começou',
  D: 'joga e fica pensando em como fizeram aquilo',
}
/** A síntese (D), depois de "quer". */
export const SINTESE: Record<DesafioAdultoProfile, string> = {
  A: 'usar o seu tempo livre para fazer algo seu',
  B: 'tirar uma ideia de jogo do papel',
  D: 'entender como um jogo funciona por dentro',
}
/** A cena de daqui a um mês (N). */
export const DESEJO: Record<DesafioAdultoProfile, string> = {
  A: 'um jogo seu pronto, e não só horas jogando',
  B: 'a sua ideia funcionando na tela',
  D: 'entender o que faz um jogo funcionar',
}
/** O que aconteceu quando tentou (I), já com o "que" da lista. */
export const TENTATIVA: Record<string, string> = {
  vontade: `que ${m('nunca tentou, ficou só na vontade')}`,
  fechei: `que, quando tentou, ${m('abriu um programa e fechou no mesmo dia')}`,
  tutorial: `que ${m('seguiu um tutorial, mas não passou dali')}`,
  grande: `que ${m('começou um projeto grande e parou no meio')}`,
  terminei: `que ${m('já terminou um jogo pequeno')}`,
}
/** O tempo livre (S), já com o "que" da lista. */
export const TEMPO: Record<string, string> = {
  menos_1: `que sobra ${m('menos de 1 hora por semana')} para um projeto seu`,
  '1_3': `que sobram ${m('de 1 a 3 horas por semana')} para um projeto seu`,
  mais_3: `que sobram ${m('mais de 3 horas por semana')} para um projeto seu`,
  depende: `que o tempo para um projeto seu ${m('depende da semana')}`,
}
export const CLOSE: Record<DesafioAdultoProfile, string> = {
  A: 'A gente ouve essa história com frequência, e ela tem uma explicação simples.',
  B: 'A gente ouve essa história com frequência, e ela tem uma explicação simples.',
  D: 'A gente ouve essa curiosidade com frequência, e ela tem uma resposta simples.',
}

export const TITLES: Record<DesafioAdultoProfile, string> = {
  A: 'Você já jogou muito. O próximo passo é fazer um jogo seu',
  B: 'A sua ideia de jogo já existe. Falta um primeiro jogo pequeno para ela sair do papel',
  D: 'Você quer saber como os jogos funcionam. Montar um é o jeito mais direto de descobrir',
}

// ---------------------------------------------------------------------------------------------
// Por que acontece: o lado do perfil, o que aconteceu quando tentou e o fecho do perfil.
// ---------------------------------------------------------------------------------------------

export const WHY_HEADING: Record<DesafioAdultoProfile, string> = {
  A: 'Por que tanto tempo de jogo não vira um jogo seu',
  B: 'Por que a ideia continua na gaveta',
  D: 'Por que a curiosidade fica sem resposta',
}
export const WHY_LEAD: Record<DesafioAdultoProfile, string> = {
  A: 'Num jogo pronto, alguém já decidiu tudo: o que o personagem faz, onde fica a chave, quando a fase acaba. Você joga muito bem o que outra pessoa decidiu, mas não chega a decidir nada.',
  B: 'A ideia costuma ser grande, com mundo, história e muitas fases.',
  D: 'Por fora, ninguém vê as decisões de um jogo: o que o personagem faz, onde fica a chave, quando a fase acaba. Elas são regras, e regras dá para montar, testar e mudar.',
}
export const WHY_TENTATIVA: Record<string, string> = {
  vontade: 'E, sem um caminho claro, o primeiro passo nunca chega.',
  fechei:
    'E o programa que você abriu foi feito para estúdios: dezenas de janelas e nenhum próximo passo claro.',
  tutorial:
    'E o tutorial mostra como fazer uma parte, mas não leva até um jogo pronto: quando ele acaba, falta saber o que vem depois.',
  grande:
    'E um projeto grande pede mais do que cabe num primeiro jogo: cada parte nova abre outras, e o fim não aparece.',
  terminei:
    'Você já terminou um jogo pequeno, então sabe que dá. O difícil é ter o próximo projeto com começo, meio e fim.',
}
export const WHY_TAIL: Record<DesafioAdultoProfile, string> = {
  A: 'Por isso o tempo passa e, no fim da semana, não sobra nada que você tenha feito.',
  B: 'Com o trabalho e o cansaço da noite, o projeto fica para depois, e a ideia volta para onde estava.',
  D: 'Sem montar um jogo, a curiosidade fica sem resposta.',
}

// ---------------------------------------------------------------------------------------------
// O que muda: um primeiro jogo pequeno de propósito, ainda sem o produto.
// ---------------------------------------------------------------------------------------------

export const CHANGE_HEADING: Record<DesafioAdultoProfile, string> = {
  A: 'O que muda quando você decide as regras',
  B: 'O que muda quando o primeiro jogo é pequeno',
  D: 'O que muda quando você monta um jogo por dentro',
}
export const CHANGE: Record<DesafioAdultoProfile, string> = {
  A: 'Fazer um jogo é decidir as regras: quando o personagem encostar na chave, ela some e o jogo guarda que você pegou. Num primeiro jogo pequeno de propósito, você monta essas regras em blocos, testa cada uma e termina. O tempo na tela continua, mas agora sai dele um jogo seu.',
  B: 'Fazer um jogo é escrever as regras da ideia: quando o personagem encostar na chave, ela some e o jogo guarda que você pegou. Num primeiro jogo pequeno de propósito, você monta essas regras em blocos, testa cada uma e termina.',
  D: 'Fazer um jogo é montar as regras uma a uma: quando o personagem encostar na chave, ela some e o jogo guarda que você pegou. Num primeiro jogo pequeno de propósito, você monta cada regra em blocos, testa e vê o que mudou. Cada bloco é uma decisão que você vê funcionar.',
}
export const PROGRAMACAO: Record<string, string> = {
  nunca: `Como você ${m('nunca programou')}, os blocos tiram a digitação do caminho, e a lógica é a mesma do código.`,
  um_pouco: `Como você ${m('já programou um pouco, por conta própria')}, vai reconhecer a lógica: os blocos só tiram a digitação do caminho.`,
  estudei: `Como você ${m('estudou ou trabalha com programação')}, a lógica é a mesma do código: os blocos só tiram a digitação do caminho e deixam o foco no jogo.`,
}
/** A cena de daqui a um mês volta no fim do "o que muda" (quando ela não abriu a carta). */
export const WISH: Record<DesafioAdultoProfile, string> = {
  A: `A cena que você quer, ${m(DESEJO.A)}, é onde isso termina: um jogo pequeno, do começo ao fim.`,
  B: `A cena que você quer, ${m(DESEJO.B)}, começa assim: depois de um jogo pronto, a próxima ideia já cabe no tamanho certo.`,
  D: `O que você quer, ${m(DESEJO.D)}, vem de montar cada regra e testar.`,
}

// ---------------------------------------------------------------------------------------------
// Onde isso acontece: o Desafio, a tela real do jogo e os fundadores (igual à página adulta).
// ---------------------------------------------------------------------------------------------

export const WHERE =
  'No Desafio do Primeiro Jogo, você faz A Chave do Farol em 3 fases: o personagem anda, a chave muda o jogo, o farol acende. São 30 dias para fazer no seu ritmo. No fim, você escolhe o personagem, o cenário e onde a chave fica escondida. Depois publica e manda o link para os amigos jogarem.'
export const IMAGEM_FAROL = {
  src: '/img/desafio-primeiro-jogo/farol-jogo.png',
  largura: 1280,
  altura: 960,
  legenda: 'A Chave do Farol, o jogo que você monta nas 3 fases',
}
export const FOUNDERS =
  'Quem prepara as aulas somos nós, Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres. O Sistema Zero começou com os jogos que fizemos com os nossos filhos.'

// ---------------------------------------------------------------------------------------------
// O que a pessoa disse que importa: o título conta as frases ("Duas coisas…", "Três coisas…").
// ---------------------------------------------------------------------------------------------

const QUANTAS = ['Duas', 'Três', 'Quatro'] as const
export const needsHeading = (frases: number): string =>
  `${QUANTAS[Math.min(Math.max(frases, 2), 4) - 2]} coisas que você disse e que importam`
export const NEED: Record<string, string> = {
  zero: `Você quer ${m('começar do zero, sem saber programar')}. Você encaixa blocos com as palavras escritas, e o vídeo mostra cada passo.`,
  pouco_tempo: `Você precisa que ${m('caiba em pouco tempo por dia')}. As aulas são divididas em seções, e o projeto fica salvo na sua conta: dez minutos num dia, uma hora no outro.`,
  terminar: `Você precisa de ${m('um projeto que consiga terminar')}. O Desafio é um jogo só, do começo ao fim, com o certificado no final.`,
  nao_infantil: `Você quer que ${m('não seja curso de criança')}. A área adulta tem aparência e linguagem próprias, e o jogo é A Chave do Farol nas duas versões, porque é um bom primeiro jogo para qualquer idade.`,
  ao_vivo: `Você disse que precisa de ${m('professor ao vivo')}. As aulas são em vídeo, do lado dos blocos, e não há professor ao vivo. Vale conferir na próxima página como é uma aula e se esse formato serve para você.`,
  trabalho: `Você quer ${m('aprender para trabalhar com jogos')}. O Desafio ensina a fazer um primeiro jogo e não prepara para trabalhar com jogos. Vale conferir na próxima página se é isso que você procura.`,
}
/** O tempo livre volta com o que ele significa no Desafio. */
export const TEMPO_NEED: Record<string, string> = {
  menos_1: `E sobra ${m('menos de 1 hora por semana')}: as aulas são divididas em seções, e o projeto fica salvo na sua conta, então você para hoje e continua outro dia do mesmo ponto.`,
  '1_3': `E você tem ${m('de 1 a 3 horas por semana')}: as aulas são divididas em seções, e o projeto fica salvo na sua conta, então você para hoje e continua outro dia do mesmo ponto.`,
  mais_3: `E você tem ${m('mais de 3 horas por semana')}: são 30 dias para fazer no seu ritmo, e o projeto fica salvo na sua conta de um dia para o outro.`,
  depende: `E o seu tempo ${m('depende da semana')}: as aulas são divididas em seções, e o projeto fica salvo na sua conta, então você para numa semana e continua na outra do mesmo ponto.`,
}
/** Quando a garantia já falou das seções e do projeto salvo, o tempo volta curto. */
export const TEMPO_CURTO: Record<string, string> = {
  menos_1: `E sobra ${m('menos de 1 hora por semana')}: são 30 dias para fazer no seu ritmo.`,
  '1_3': `E você tem ${m('de 1 a 3 horas por semana')}: são 30 dias para fazer no seu ritmo.`,
  mais_3: `E você tem ${m('mais de 3 horas por semana')}: são 30 dias para fazer no seu ritmo.`,
  depende: `E o seu tempo ${m('depende da semana')}: são 30 dias para fazer no seu ritmo.`,
}
export const COMPUTADOR: Record<string, string> = {
  meu: '',
  compartilhado: `O computador ${m('é compartilhado')}: o projeto fica salvo na sua conta, então você continua de onde parou quando ele estiver livre.`,
  celular_tablet: `Você disse que ${m('só tem celular ou tablet')}. Para montar o jogo, precisa de computador com mouse e teclado; depois de publicado, o jogo abre no celular.`,
  verificar: `E você ${m('ainda vai ver o computador')}: para montar, precisa de um com mouse e teclado.`,
}
export const STILL_LOOKING = `Você disse que ${m('ainda está conhecendo')}. A próxima página mostra o jogo, as fases e as condições, para você decidir com calma.`

export const CTA_TEXT =
  'Na próxima página, você vê o jogo por dentro, as 3 fases, o que acontece depois dos 30 dias e a resposta para quem tem receio de ser curso de criança.'
export const CTA_LABEL: Record<DesafioAdultoProfile, string> = {
  A: 'Ver como é o primeiro jogo',
  B: 'Ver como a ideia sai do papel',
  D: 'Ver o jogo por dentro',
}
export const UNMET: Record<Condition, string> = {
  computador: 'o computador de que você precisa',
  formato: 'o formato das aulas',
  trabalho: 'o que o Desafio ensina',
}
