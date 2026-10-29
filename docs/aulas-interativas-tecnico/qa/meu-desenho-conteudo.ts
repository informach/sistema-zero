/**
 * A fonte editorial do extra "Meu primeiro desenho no Pinta" (Faísca): as falas gravadas (com as
 * marcas do ElevenLabs), as notas de tela, as falas do Zappy na página e o Passo a passo do
 * projeto. O gerador (`gerar-meu-desenho.ts`) monta manifesto, roteiro e caderno a partir daqui.
 *
 * Uma aula curta, depois do par do posto. Não há conceito novo de lógica: é exploração de
 * ferramenta (desenhar formas no Pinta) e a troca de uma imagem num jogo que a criança já fez.
 * Por isso não há experiência nem quiz (DIRETRIZES, seção 2: operação de interface não ganha cena;
 * o quiz retoma raciocínio, e aqui não há raciocínio novo para retomar).
 *
 * A ordem das partes segue a régua das entregas: o desenho é entregue numa parte de Entrega e o
 * jogo no Fechamento, a última parte. Assim a criança envia o desenho ANTES de abrir o jogo, e a
 * vaga de arte `minha-chave` já chega preenchida aos materiais do jogo.
 */
export type MeuDesenhoTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'draw' | 'swap'
  /** Fala do Zappy na página, logo depois do vídeo. Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. */
  text: string
  screen: string
}

export const meuDesenhoAula = {
  slug: 'aula-1',
  title: 'A minha chave no Farol',
  trechos: [
    {
      key: 'abertura',
      title: 'Uma chave desenhada por você',
      kind: 'intro',
      screen:
        'Jogo pronto: a Chave do Farol com uma chave rosa desenhada no lugar da chave dourada. Mostrar o personagem indo até a chave, a chave sumindo e o farol acendendo. Não mostrar os blocos nem o Pinta.',
      ponte:
        'Sua vez! Clique no jogo e use as setas do teclado. Pegue a chave desenhada e leve o personagem até o farol. Depois clique em Próxima parte.',
      text: '[upbeat, welcoming voice] Lembra do seu jogo da Chave do Farol? Hoje ele vai ganhar uma coisa que ninguém mais tem: uma chave desenhada por você! [interested, animated voice] Olha este jogo aqui: a chave não é mais a dourada de antes. Ela foi desenhada no Pinta, o programa de desenhar da plataforma. O personagem pega a chave, vai até o farol, e o farol acende, igualzinho ao seu jogo. [engaging, energetic, conversational voice] Nesta aula, você vai desenhar a sua chave no Pinta, aqui mesmo na página, e depois colocar o seu desenho no jogo. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo e use as setas do teclado. Pegue a chave e leve o personagem até o farol. Depois clique em Próxima parte.',
    },
    {
      key: 'material',
      title: 'O seu Passo a passo do projeto',
      kind: 'material',
      screen:
        'Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte do desenho, a parte da troca no jogo e o botão Baixar.',
      ponte:
        'Este é o seu Passo a passo do projeto. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele mostra cada ferramenta do Pinta que você vai usar, o jeito de desenhar a chave e como colocar o desenho no jogo. [reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.',
    },
    {
      key: 'desenhar',
      title: 'Desenhe a sua chave',
      kind: 'draw',
      screen:
        'Bloco do Pinta da aula com o quadro quadrado vazio. Mostrar a caixa de ferramentas à esquerda, os dois quadrados de Preenchimento e Contorno no pé da caixa e o painel Cores. Desenhar junto: a argola com Círculo, a haste e os dois dentes com Retângulo, arrumar com Selecionar, um brilho com Pincel. Mostrar Enviar meu desenho, a confirmação Enviar e Desenho enviado!. Não preencher o recado.',
      ponte:
        'Agora desenhe a sua chave: um Círculo para a argola, um Retângulo para a haste e dois Retângulos pequenos para os dentes. Use o quadro inteiro. Quando gostar, clique em Enviar meu desenho, confirme em Enviar e depois clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Este é o Pinta, aqui dentro da aula. O quadrado branco no meio é o seu quadro: tudo o que você desenhar ali vai virar a chave do jogo. Na esquerda fica a caixa de ferramentas. [confident, clear, unhurried voice] Embaixo da caixa tem dois quadradinhos. O cheio é o Preenchimento, a cor de dentro da forma. O vazado é o Contorno, a cor da borda. Clique no Preenchimento e depois escolha uma cor no painel Cores, à direita. Eu vou escolher um rosa. O Contorno já vem preto, e pode ficar assim. [confident, clear, unhurried voice] Agora a argola, a parte redonda da chave. Pegue a ferramenta Círculo, na caixa. No lado esquerdo do quadro, aperte o botão do mouse e arraste na diagonal, até a bolinha ficar grande e redonda. Solte. [confident, clear, unhurried voice] Agora a haste, a parte comprida. Pegue a ferramenta Retângulo. Começando no meio da argola, aperte e arraste para a direita, até perto da borda do quadro, num retângulo baixinho. Solte. [confident, clear, unhurried voice] Por último, os dentes. Ainda com o Retângulo, desenhe um retângulo pequeno embaixo da ponta da haste, saindo para baixo. Do lado dele, desenhe outro. [interested, animated voice] Ficou torto? Sem problema. Pegue a ferramenta Selecionar, clique na forma e arraste para o lugar certo. Para mudar o tamanho, puxe um dos quadradinhos da borda da seleção. [upbeat, encouraging voice] Se quiser, pegue o Pincel e faça um brilho na argola. Capriche: use o quadro inteiro, porque no jogo a chave fica pequena. [confident, clear, unhurried voice] Quando gostar da sua chave, clique em Enviar meu desenho, aqui em cima do Pinta, e confirme em Enviar. Quando aparecer Desenho enviado!, clique em Próxima parte.',
    },
    {
      key: 'trocar',
      title: 'A sua chave no jogo',
      kind: 'swap',
      screen:
        'Estúdio com o jogo pronto da Chave do Farol. Abrir o menu ⋯, Imagens, e mostrar minha-chave com o selo Seu desenho da aula; fechar. Em Ao iniciar, achar Criar sprite chave, clicar em chave-dourada e escolher minha-chave. Testar o jogo, Verificar projeto, Enviar meu projeto, confirmação Enviar, Projeto enviado! e Concluir aula. Não preencher o recado.',
      ponte:
        'Agora coloque o seu desenho no jogo: em Ao iniciar, no bloco Criar sprite chave, troque chave-dourada por minha-chave. Teste, clique em Verificar projeto, depois em Enviar meu projeto, confirme em Enviar e clique em Concluir aula.',
      text: `[upbeat, welcoming voice] Olha só: este é o jogo da Chave do Farol, pronto, e o seu desenho já chegou aqui! [engaging, energetic, conversational voice] Abra o menu de três pontinhos, lá em cima, e depois Imagens. Tá vendo? A sua chave está aqui, com o nome minha-chave e o selo Seu desenho da aula. Feche essa janela. [confident, clear, unhurried voice] A chave do jogo nasce num bloco da área Ao iniciar. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Procure o bloco Criar sprite chave. No fim dele está escrito com imagem chave-dourada. Clique em chave-dourada e, na lista, escolha minha-chave. [interested, animated voice] Pronto: só a aparência mudou. O nome do sprite continua chave, então as regras que você programou continuam funcionando com o seu desenho. [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até a sua chave: ela some e o aviso muda. Depois leve o personagem até o farol: ele acende! [reassuring, encouraging voice] Se a chave dourada continuar aparecendo, confira se você trocou a imagem no bloco Criar sprite chave, e não em outro. [confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija e clique novamente. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. [pleased, lively voice] E tem mais: se quiser outra chave, volte à parte anterior, mude o desenho e clique em Enviar de novo. Na próxima vez que você abrir esta aula, o jogo já vem com a chave nova.`,
    },
  ] satisfies MeuDesenhoTrecho[],
}

/** O Passo a passo do projeto: as duas montagens completas, para consultar quando quiser. */
export const meuDesenhoAjuda: {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] = [
  {
    key: 'desenhar',
    title: 'Desenhe a sua chave',
    idea: 'O quadro do Pinta é quadrado, como a chave do jogo. O que você desenha nele vira a imagem minha-chave, que vai para o jogo quando você envia o desenho.',
    steps: [
      'Embaixo da caixa de ferramentas, clique no quadradinho cheio, o Preenchimento. No painel Cores, à direita, escolha a cor da chave. O Contorno, o quadradinho vazado, já vem preto.',
      'Pegue a ferramenta Círculo. No lado esquerdo do quadro, aperte o botão do mouse e arraste na diagonal até a argola ficar grande e redonda. Solte.',
      'Pegue a ferramenta Retângulo. Começando no meio da argola, arraste para a direita até perto da borda do quadro, num retângulo baixinho: é a haste.',
      'Ainda com o Retângulo, desenhe um retângulo pequeno embaixo da ponta da haste, saindo para baixo. Do lado dele, desenhe outro: são os dentes.',
      'Para arrumar, pegue a ferramenta Selecionar, clique numa forma e arraste. Para mudar o tamanho, puxe um dos quadradinhos da borda da seleção.',
      'Se quiser, pegue o Pincel e faça um brilho na argola. Use o quadro inteiro: no jogo a chave fica pequena.',
      'Clique em Enviar meu desenho, em cima do Pinta, e confirme em Enviar.',
    ],
    test: 'A sua chave ocupa quase todo o quadro, e aparece a mensagem Desenho enviado!',
    correction:
      'Se uma forma sumiu ou ficou errada, use Desfazer, no alto do Pinta. Se o envio não foi, clique em Enviar meu desenho de novo.',
  },
  {
    key: 'trocar',
    title: 'A sua chave no jogo',
    idea: 'O desenho chega aos materiais do jogo com o nome minha-chave. Trocar a imagem do sprite chave muda só a aparência: o nome do sprite continua chave, e as regras do jogo continuam valendo.',
    steps: [
      'Se quiser ver o desenho, abra o menu de três pontinhos e depois Imagens: a minha-chave tem o selo Seu desenho da aula. Feche a janela.',
      'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.',
      'Procure o bloco Criar sprite chave. No fim dele, clique em chave-dourada e escolha minha-chave.',
    ],
    test: 'Clique no jogo e leve o personagem até a chave: ela some e o aviso muda. Depois vá até o farol: ele acende.',
    correction:
      'Se a chave dourada continuar aparecendo, confira se a troca foi no bloco Criar sprite chave. Se minha-chave não estiver na lista, volte à parte anterior, clique em Enviar meu desenho e abra a aula de novo.',
  },
]
