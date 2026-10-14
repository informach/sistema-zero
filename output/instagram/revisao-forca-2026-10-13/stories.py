from edit import *

revisions = {
'ST01': [
'“Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior.” André, aluno.',
'“Eu mudaria essa parte.” Uma opinião sobre o jogo abre uma ideia para construir. O teste vai mostrar o efeito da mudança.',
'No Parque dos Brinquedos, do nosso Estúdio, a distância entre caixas decide se a explosão passa de uma para outra. Quem cria monta e testa essa regra.',
'Pergunte: “Se esse jogo fosse seu, o que você mudaria?” Escolham uma ideia da resposta para explorar.'],
'ST02': [
'“Nada funciona.” O projeto inteiro parece pedir conserto. Peça que ele mostre a parte que saiu diferente.',
'Uma descrição específica indica onde procurar. Qual destas frases mostra uma parte para investigar?',
'Neste salto, podemos comparar a força do pulo e a distância da plataforma. Mude uma coisa, mantenha a outra e teste. Exemplo do nosso Estúdio.',
'“O pulo não alcança a nuvem” mostra o que comparar. Antes de mexer nos blocos, peçam uma demonstração.'],
'ST03': [
'Ele acha qualquer vídeo em dois toques. No computador, pede ajuda para achar o próprio arquivo.',
'Encontrar um vídeo e organizar arquivos são usos diferentes. Nomear, guardar e localizar o trabalho também se aprende praticando.',
'Neste mundo do nosso Estúdio, espaço coloca um bloco e o clique quebra. Quem cria monta a ligação entre cada comando e sua reação.',
'No próximo arquivo, façam o caminho inteiro: nomear, guardar, fechar e abrir de novo. Observem qual passo ainda precisa de explicação.'],
'ST04': [
'Seu filho inventou uma ilha. Agora conte como alguém chegaria ao tesouro que ele escondeu lá.',
'Um desenho registra os lugares. Um jogo permite construir o caminho e as reações que a pessoa encontra ao explorar.',
'Nesta ilha do nosso Estúdio, Lia pede 15 moedas. Quem cria posiciona as moedas e liga a contagem à conquista Caçador de Moedas.',
'Peça que ele escolha o que um visitante encontra primeiro. Uma pista? Um personagem? Essa decisão já começa a organizar a aventura.'],
'ST05': [
'“Não funciona.” Você chega ao computador e ainda não sabe o que deveria acontecer.',
'Peça que ele mostre o que queria e o que apareceu. Comparar as duas coisas ajuda a formular a dúvida.',
'Na Guerra de Gorilas, do nosso Estúdio, o vento muda o caminho da banana. Quem cria pode testar a mesma força de lançamento com ventos diferentes.',
'Olhar e perguntar podem acontecer juntos. O objetivo é localizar a diferença antes de sair mudando os comandos.'],
'ST06': [
'18h40. Você responde o último e-mail. Ele aparece na porta: “Posso começar agora?”',
'Preparem juntos o acesso e a primeira ação. Na aula gravada, ele pode pausar e rever a explicação. Combinem onde buscar ajuda se precisar.',
'Depois, peçam uma regra para mostrar. Nesta corrida do nosso Estúdio, quem cria programa a ordem dos cinco pontos de controle e testa o percurso.',
'Escolham um momento para ele contar o que tentou, o que funcionou e onde ficou uma dúvida. A conversa pode partir de uma parte pequena.'],
'ST07': [
'“Está no computador” conta pouco. Ele pode estar assistindo, jogando, conversando ou criando.',
'Peça que mostre a atividade. Combinem também que pedidos de senha, dinheiro, fotos ou dados pessoais passam por você antes da resposta.',
'Na Vila das Vocações, do nosso Estúdio, a Guia tem uma pergunta com dois botões. Quem cria escreve as falas e programa a reação de cada escolha.',
'Hoje, peça que ele mostre uma parte da tela. Pergunte o que está fazendo, em qual aplicativo e com quem pode conversar ali.'],
'ST08': [
'Dragão, castelo, três mundos e um chefão. A aventura é grande. Escolha uma primeira cena para construir.',
'Se a cena começa com o herói atravessando o castelo, qual ação precisa funcionar primeiro?',
'Na Vila do Dragão, do nosso Estúdio, a conversa com o ferreiro entrega a chave que libera a porta. Quem cria monta e testa essa sequência.',
'Nesse começo, precisamos fazer o herói andar. Guardem as outras ideias numa lista e testem a primeira ação antes de acrescentar a próxima.'],
'ST09': [
'Jantar na mesa. Do quarto vem: “Só falta uma coisa.” Hoje ele está criando um jogo.',
'Criar também tem hora de parar. Combinem o horário antes e avisem quando estiver perto. A ideia ainda incompleta pode ficar anotada.',
'No boliche do nosso Estúdio, quem cria testa o aviso de strike com nove e dez pinos caídos. Se faltar uma tentativa, anote qual para a volta.',
'Ao encerrar, confiram o aviso de salvamento. O jogo não precisa ficar pronto hoje; guardar o trabalho prepara a próxima tentativa.'],
'ST10': [
'“Vai estudar.” O caderno continua fechado. Ele sabe qual é a primeira coisa a fazer?',
'Um pedido pode deixar a ação mais clara. Escolha abaixo o que indica um começo concreto.',
'Criar também ganha começo com uma tarefa específica: montar a regra que faz o bastão crescer ao segurar o mouse. Exemplo do nosso Estúdio.',
'“Abre a aula e faz a primeira parte” indica onde começar. Depois, a orientação dessa parte precisa mostrar a ação para executar.'],
'ST11': [
'A atividade começou há cinco minutos. Ele afasta o caderno e diz: “Sou ruim nisso.”',
'Escute o que aconteceu e peça que mostre a parte difícil. Uma dificuldade específica oferece algo para investigar juntos.',
'Na Defesa da Torre Profissional, cada torre espera, mira, atira e recarrega. Quem cria observa em qual dessas etapas a reação mudou. Exemplo do nosso Estúdio.',
'“Qual passo ficou difícil?” abre uma investigação. Se precisar de uma pausa ou de outra explicação, isso também pode fazer parte do próximo passo.'],
'ST12': [
'Quarenta minutos depois, a apresentação tem fundo roxo, letra bonita e nenhuma frase sobre o assunto.',
'Antes de escolher outra cor, anotem o que a apresentação precisa explicar. Três pontos no papel ajudam a organizar o conteúdo.',
'Na fazenda do nosso Estúdio, a semente depende do canteiro arado. Quem cria programa essa condição e testa as duas situações: terra preparada ou ainda intacta.',
'Neste jogo: enxada, semente, regador. Na apresentação, escrever os pontos principais antes de montar os slides ajuda a escolher o que entra em cada um.'],
'ST13': [
'Ele quer parar. Você quer incentivar. Antes de decidir, escute o motivo.',
'Pergunte o que ele está sentindo e o que gostaria de fazer. Pode ser cansaço, dificuldade ou outra vontade. Uma resposta curta não explica tudo.',
'Se quiser explorar uma ideia, escolham uma mudança. No mundo de neve do nosso Estúdio, o carrinho escorrega; quem cria testa como o cenário muda o movimento.',
'A resposta orienta a conversa. Vocês podem escolher uma pausa, buscar ajuda ou rever a atividade juntos.'],
'ST14': [
'“Ficou lindo, filho.” A conversa ainda pode continuar: peça que ele mostre uma escolha.',
'“Como você decidiu essa parte?” dá assunto sobre a construção. Ele pode explicar ou demonstrar o efeito.',
'Na Batalha de Monstrinhos, do nosso Estúdio, o fogo tem vantagem contra a planta. Qual efeito você imagina que escolhemos para essa vantagem?',
'Neste exemplo, o fogo tira o dobro da planta. Quem cria monta essa regra e testa a conta. No projeto dele, procurem uma escolha para experimentar.'],
'ST15': [
'Ele chamou para ajudar. Quando você percebe, está fazendo os cliques e ele só observa.',
'Peça que mostre a dúvida antes de assumir o mouse. Se precisar demonstrar um passo, depois dê espaço para ele fazer e testar.',
'Também há espaço para jogar juntos. Neste duelo do nosso Estúdio, o especial depende de energia cheia. Quem cria testa com a barra cheia e vazia.',
'Na próxima ajuda, combinem: ele mostra a tentativa, vocês procuram a explicação e ele experimenta o próximo passo.'],
'ST16': [
'Ele quer deixar o chefão mais difícil. Escolher “quanto” abre um trabalho de criação.',
'Curar mais ou atacar mais rápido muda a batalha de jeitos diferentes. Para comparar, altere uma regra de cada vez.',
'Neste exemplo do nosso Estúdio, o chefão muda de fase e recupera parte da vida. Quem cria escolhe os valores e confere o efeito na luta.',
'A escolha depende do desafio que ele quer construir. Pergunte o motivo, testem a mudança e comparem com a versão anterior.'],
'ST17': [
'Ontem ele fechou o projeto. Hoje abre e pergunta: “Onde eu tinha parado?”',
'O projeto guarda o que foi construído. Uma anotação pode guardar a próxima ação que ele tinha em mente.',
'Neste parkour do nosso Estúdio, o trampolim lança o herói. Uma anotação útil seria: “testar se o quique alcança a próxima plataforma”.',
'Antes de fechar, confiram o salvamento e escrevam a próxima ação. Na volta, o bilhete oferece um ponto de partida.'],
'ST18': [
'Ele pediu um modelo. Depois de entender como começa, mostre também onde pode mudar.',
'Uma orientação pode ter uma parte para seguir e outra para escolher. Deixe essa diferença clara com um exemplo.',
'No Cenário do meu desenho, do nosso Estúdio, o personagem anda com as setas. Quem cria pode colocar o próprio desenho como fundo e testar o movimento ali.',
'Na próxima atividade que permita escolhas, mostre uma delas: o lugar, a cor ou o caminho. Ele pode começar por essa decisão.'],
'ST19': [
'O vídeo está parado. Na outra parte da tela, ele está testando o que acabou de montar.',
'Peça que mostre a tentativa. O que esperava? O que apareceu? A pausa oferece espaço para construir e voltar à explicação.',
'Na Base da Lua, do nosso Estúdio, escolher o cenário lunar deixa a gravidade mais fraca. Quem cria testa o efeito no pulo.',
'O pulo fica mais leve e demora mais para voltar ao chão. Comparar com outro cenário mostra o efeito da escolha.'],
'ST20': [
'Ele gostou da primeira aula. Nos próximos encontros, descubra qual parte ele quer continuar.',
'Flávia, mãe do Fernando, contou: “No início eu acompanhei mais, agora eu acompanho menos.” Observe com seu filho onde ele já segue e onde pede apoio.',
'No Reunir o Rebanho, do nosso Estúdio, os animais seguem quem chega perto. Quem cria liga distância e comportamento e testa perto e longe.',
'Depois da atividade, escute o que ele gostou, que dúvida ficou e o que gostaria de fazer na próxima vez. As respostas ajudam a acompanhar a experiência.']
}
closing = {
'ST01':'A opinião sobre um jogo abre uma ideia para construir e testar.',
'ST02':'Uma descrição específica indica uma diferença para investigar.',
'ST03':'Praticar o caminho completo de um arquivo revela onde é necessária uma explicação.',
'ST04':'Escolher a primeira descoberta do visitante organiza a aventura.',
'ST05':'Comparar esperado e observado esclarece a dúvida antes de mudar comandos.',
'ST06':'Preparar o acesso e combinar um momento de conversa apoia a atividade num dia cheio.',
'ST07':'Ver a atividade e combinar cuidados oferece informação além do tempo de tela.',
'ST08':'Uma cena escolhida permite identificar a primeira ação a construir.',
'ST09':'Horário combinado, salvamento e anotação permitem parar com o projeto incompleto.',
'ST10':'Um começo concreto orienta a primeira tentativa.',
'ST11':'Localizar a parte difícil ajuda a escolher o apoio e a próxima tentativa.',
'ST12':'Identificar o que vem antes ajuda a organizar tanto conteúdo quanto regras de jogo.',
'ST13':'Escutar o motivo orienta a decisão de continuar, pausar ou rever a atividade.',
'ST14':'Uma pergunta sobre uma escolha acrescenta conversa ao elogio.',
'ST15':'Demonstrar quando necessário e devolver a tentativa à criança preserva participação.',
'ST16':'Uma escolha de dificuldade precisa de motivo e teste.',
'ST17':'Salvar o trabalho e anotar a próxima ação prepara a retomada.',
'ST18':'Modelo e escolhas próprias podem conviver na mesma atividade.',
'ST19':'Comparar previsão e resultado oferece assunto sobre o que foi construído.',
'ST20':'Escutar ao longo da experiência ajuda a acompanhar interesse e necessidade de apoio.'}
for ident, screens in revisions.items():
    for i,value in enumerate(screens,1): story(ident,i,value)
    chunks[ident]=re.sub(r'^\*\*Fechamento:\*\*[^\n]*',f'**Fechamento:** {closing[ident]}',chunks[ident],flags=re.M)

# As interações precisam corresponder à nova explicação, sem transformar preferência em diagnóstico.
rep('ST07','“Da porta, você sabe qual das quatro é?” · “Sei” / “Chuto”','“Você já pediu para ele mostrar a atividade?” · “Já conversamos” / “Vou experimentar”')
rep('ST08','“Qual é um bom primeiro passo?”','“Para atravessar o castelo, o que vem primeiro?”')
rep('ST13','“Na última vez que ele quis parar, era…” · “Parte travada” / “Outra vontade”','“Vocês já conversaram sobre o motivo?” · “Já conversamos” / “Vou escutar”')
rep('ST18','“Sempre pede” / “Prefere inventar”','“Pede às vezes” / “Prefere começar só”')
rep('ST20','**Figurinha:** teste · “Qual sinal diz mais sobre a atividade?” · “Empolgação do 1º dia” / “Voltar sem você lembrar” · certa: “Voltar sem você lembrar”.','**Figurinha:** caixinha · “Que parte ele gostaria de fazer de novo?”')
rep('ST20','**Visual:** a resposta certa do teste em destaque.','**Visual:** a pergunta “O que gostaria de fazer na próxima vez?” em destaque; não inventar respostas do público.')
