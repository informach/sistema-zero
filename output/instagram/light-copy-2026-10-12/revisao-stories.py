stories=[]
def S(pid,title,*screens): stories.append([f'ST{len(stories)+1:02d}',pid,title,list(screens)])
S('P01','A tarefa que acaba na mão do adulto',
('Seu filho pediu ajuda. Você já está fazendo por ele.','Antes de pegar no material, peça: “Me mostra onde deu errado”.','Criança mostra ponte de papel caída; adulto observa sem tocar.'),
('A folha escorregou do apoio. Agora há um problema para olhar.','Ele pode aproximar os apoios e tentar de novo. Deixe uma escolha com ele e ajude no que ainda estiver difícil.','Dois apoios sendo aproximados pela criança sob as pontas do papel.'),
('No jogo que ele cria, uma tentativa também mostra o que mudar.','O personagem foi para o lado errado. Seu filho muda a direção e testa. A próxima tentativa tem um motivo.','Diagrama editorial de direção errada e corrigida; sem interface fabricada.'))
S('P03','A história por trás do desenho',
('Você viu um desenho pronto. Ele lembra de tudo o que tentou.','A parte que apagou, a cor que escolheu, o detalhe que inventou no meio.','Desenho e rascunhos sobre a mesma mesa.'),
('Depois do elogio, tem uma história para ouvir.','“Qual parte você mais gostou de fazer?” A resposta pode mostrar algo que você nem tinha reparado.','Filho aponta detalhe ao responsável.'),
('Um jogo criado por ele também guarda essas escolhas.','Você pode conhecer a regra que deu trabalho e a ideia que mudou durante a criação. A partida pronta é só uma parte da história.','Criança mostra uma criação digital, foco no gesto de explicar.'))
S('P04','As tarefas dentro da mochila',
('“Arrume a mochila” parece uma tarefa. Esconde várias.','Seu filho precisa saber o que levar antes de começar a guardar.','Agenda, cadernos e mochila aberta.'),
('Uma ordem para experimentar.','Olhar as aulas de amanhã. Separar os cadernos. Conferir o estojo. Vocês conseguem ver onde falta ajuda.','Três cenas correspondentes à lista, com objetos grandes.'),
('Na criação de jogos, a ordem também tem efeito.','A chave vem antes da porta aberta. Montar essa regra dá uma situação concreta para pensar no que precisa acontecer primeiro.','Diagrama próprio de chave antes da porta; sem catálogo ou oferta.'))
S('P06','Você pode ser quem experimenta',
('“Não sei fazer isso, filho.” Ainda dá para participar.','Se ele desenhou um labirinto, você consegue tentar achar a saída.','Adulto olha labirinto original desenhado pela criança.'),
('Você ficou preso num canto. Mostre onde.','“Achei que passava por aqui.” Essa dúvida ajuda seu filho a olhar para o caminho com os olhos de outra pessoa.','Dedo do adulto indica beco do labirinto.'),
('Quando ele cria um jogo, você pode ser o primeiro a jogar.','Conte onde se perdeu e o que tentou. Para participar dessa conversa, você não precisa conhecer os comandos.','Adulto testa criação e criança observa, sem assumir controle.'))
S('P07','O sim que não mostra o começo',
('Ele disse “entendi”. Na hora de começar, ficou parado.','A resposta não mostrou qual passo ele sabia fazer.','Criança diante de quebra-cabeça ainda espalhado.'),
('“Me mostra como você vai começar.”','Se ele separar as peças da borda, você vê uma estratégia. Se não souber, vocês encontram onde ajudar.','Criança separa peças de borda de um quebra-cabeça.'),
('Criar jogos também permite mostrar o que entendeu.','Montar uma ação e jogar para conferir dá mais informação do que responder apenas “sim”.','Ação real montada e testada, sem avaliação pública da criança.'))
S('P09','O tutorial e a primeira tentativa',
('O tutorial acabou. A folha continua aberta.','Durante o vídeo, o avião de papel parecia fácil. Agora seu filho não lembra a primeira dobra.','Folha aberta e vídeo genérico encerrado, sem marca concorrente.'),
('Experimentem pausar depois da primeira dobra.','Ele faz, confere e volta ao trecho que ficou confuso. A tentativa mostra qual explicação procurar.','Mãos alinham as pontas com vídeo pausado.'),
('Na criação de jogos, pausar também dá tempo para aprender.','Seu filho monta o comando e testa. O vídeo parado pode significar que ele está colocando a explicação em prática.','Aula real pausada e atividade digital em uso.'))
S('P10','Uma regra com uma ideia por trás',
('Seu filho quer mudar os pontos da brincadeira. Tem uma ideia aí.','“O alvo de longe podia valer mais.” Ele percebeu uma diferença e propôs uma regra.','Dois alvos de papel a distâncias diferentes.'),
('Agora quem joga tem uma escolha.','O alvo perto vale um. O de longe vale dois. Arriscar a distância ou escolher o mais fácil?','Pessoa segura bolinha de papel diante das duas opções.'),
('Programar permite colocar regras assim num jogo.','A criança decide o que vale ponto e confere se a contagem funciona. A criatividade aparece no que a escolha muda na partida.','Diagrama editorial de regras de pontuação, visualmente distinto da plataforma.'))
S('P12','Ideias que encontram uma forma',
('Seu filho tem ideias que você ainda não conhece.','Elas podem aparecer num desenho, numa história ou numa brincadeira que ele inventou.','Desenho original imaginativo, sem fingir autoria de aluno real.'),
('Jeffrey encontrou um jeito de mostrar as dele.','“Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias.”\nJeffrey · Aluno','Retrato real do Jeffrey, fala literal com aspas equivalentes.'),
('Ao criar, ele escolhe o que vai existir naquele mundo.','A programação transforma algumas dessas escolhas em ações que outra pessoa pode experimentar.','Diagrama conceitual de ideia desenhada ganhando uma ação. Não atribuir jogo específico ao Jeffrey.'))
S('P13','O que faltou explicar',
('“É só passar por aqui.” Mas você ainda não sabe por onde.','Seu filho já imaginou a brincadeira inteira. Você acabou de chegar.','Criança mostra mapa com árvore e ponte.'),
('Mostre o ponto da dúvida.','“Vou para a árvore ou para a ponte?” Agora existe uma informação clara para ele acrescentar.','Adulto aponta bifurcação do mesmo mapa.'),
('Criar um jogo também pede esse cuidado com quem chega.','Um aviso sobre buscar a chave ajuda o jogador a seguir. A criança aprende a pensar no que o outro ainda não sabe.','Aviso de exemplo num diagrama próprio ou captura real conferida.'))
S('P15','Uma opinião que vai além do sim',
('Seu filho pediu opinião. Você ficou no “gostei”.','Para conversar sobre a criação, escolham uma parte para você olhar.','Criança mostra história em três desenhos.'),
('“Deu para entender por que ele saiu de casa?”','Conte o que você entendeu da história. Seu filho compara com o que queria mostrar.','Adulto indica o personagem saindo de casa no desenho.'),
('Ver outra pessoa jogar dá esse retorno a quem cria.','Uma dúvida mostra onde falta uma pista. A criança usa essa informação para decidir o que quer mudar.','Primeira tentativa de um adulto num jogo próprio; criança acompanha.'))
S('P16','Uma nova tentativa precisa de uma mudança',
('Ele montou de novo. A torre caiu do mesmo lado.','Só repetir a montagem pode repetir o problema.','Torre de peças largas inclinada para o mesmo lado em duas tentativas.'),
('Na próxima tentativa, escolham o que vai mudar.','A base está estreita? Experimentem alargar e comparem. Se a frustração apertou, façam uma pausa antes.','Comparação de duas bases; não prometer resultado predeterminado.'),
('Programar também envolve investigar o erro.','Se um acerto soma dois pontos, a criança procura a regra da contagem. Depois de mudar, testa se resolveu.','Esquema próprio de um acerto com contagem duplicada e depois única; não representar bug real do curso.'))
S('P18','Preparar antes de sentar',
('Ele sentou para estudar e levantou para buscar tudo.','Lápis, borracha, caderno. A primeira tarefa ainda nem começou.','Mesa com objetos faltantes e busca em estante.'),
('Leiam o pedido e separem o necessário.','Façam isso juntos. A criança participa da preparação e encontra o material quando começar.','Mesa de casa simples com poucos materiais.'),
('Para criar no computador, preparem também o acesso.','Confiram internet, som, mouse e o horário de uso do aparelho. O momento da atividade fica disponível para montar e testar.','Computador compartilhado pronto para uso, sem dados pessoais.'))
S('P19','Um bilhete para amanhã',
('Hora de parar. Deixem uma pista para amanhã.','Um bilhete pode guardar o começo da próxima tentativa.','Maquete em andamento com espaço para bilhete.'),
('“A base está pronta. Falta prender a ponte.”','Duas frases mostram o que já existe e o que vem depois.','Bilhete literal junto da base e peças da ponte.'),
('Num projeto digital, guardem o trabalho e a ideia.','Salvem na ferramenta e anotem o próximo teste. O bilhete lembra o plano, mas não substitui o salvamento.','Projeto no computador e anotação ao lado.'))
S('P21','Hoje o filho ensina',
('Seu filho também tem coisas para ensinar a você.','Pode ser uma dobradura, uma brincadeira ou algo que ele inventou.','Criança mostra dobradura ao adulto.'),
('Hoje você pode ser quem pergunta.','“Me mostra como funciona.” Tente seguir de verdade e conte onde ficou com dúvida.','Adulto faz uma dobra orientado pelo filho.'),
('Num jogo criado por ele, essa troca tem um motivo especial.','Você vai experimentar uma regra ou uma ideia que seu filho ajudou a construir.','Criança observa adulto jogando sua criação, sem métricas de resultado.'))
S('P22','Do exemplo à escolha própria',
('Ele seguiu o modelo. Agora quer mudar a asa do avião.','O exemplo ensinou um começo. A próxima escolha pode ser dele.','Dois aviões de papel com uma diferença visível.'),
('“Se eu dobrar essa ponta, ele voa diferente?”','A criança testa e compara. Uma ideia própria apareceu depois de aprender a primeira versão.','Ponta de asa dobrada; captar trajetória real se usar vídeo.'),
('Um exemplo de programação também pode abrir esse caminho.','Depois de entender uma ação, ela muda uma regra e vê como o jogo responde. Criar pode começar com uma referência.','Comando real seguido de variação possível e conferida.'))
S('P24','Uma história em três quadros',
('A ideia veio toda de uma vez. Desenhem para colocar em ordem.','Dividam uma folha em três quadros. O desenho pode ser simples.','Folha em três quadros com traços de lápis.'),
('Quem quer algo. O que atrapalha. Como termina.','Um cachorro quer sair. O portão está fechado. Ele encontra uma passagem na cerca. Agora inventem outra história.','Tira com essas três cenas do mesmo cachorro.'),
('Ao criar jogos, essa sequência ajuda a pensar no objetivo.','O que o jogador quer conseguir? O que precisa fazer no caminho? O desenho dá um começo para a criação.','Esboço próprio de objetivo e caminho, sem interface de produto.'))
S('P25','O interesse por trás do jogo',
('Ele joga o mesmo jogo que o amigo. Pode gostar de outra parte.','Um quer vencer desafios. O outro prefere construir casas. “Gosta de jogar” ainda conta pouco.','Duas situações desenhadas, sem marca de jogo externo.'),
('Peça que mostre a parte preferida.','Ouça o motivo. Depois, vocês podem imaginar uma história, um lugar ou uma regra criada por ele.','Adulto ouve enquanto criança desenha um lugar.'),
('Vale descobrir se ele gosta de construir também.','Programar jogos permite levar ideias para a tela. Esse convite pode ocupar uma parte do tempo, junto da brincadeira e do descanso.','Desenho e ação digital autoral correspondente.'))
S('P27','Além do trabalho pronto',
('Dois trabalhos iguais podem ter dado trabalhos diferentes.','Um precisou de ajuda em cada passo. No outro, a criança já tomou algumas decisões.','Duas maquetes parecidas com rascunhos diferentes.'),
('“Qual parte você conseguiu fazer sozinho desta vez?”','Ele pode apontar, explicar ou mostrar. Ouçam também onde ainda precisou de apoio.','Criança aponta uma etapa e adulto acompanha.'),
('Num jogo criado por ele, dá para experimentar as escolhas.','Seu filho mostra uma regra e conta o que mudou. Você conhece um pouco do caminho, além de ver o resultado.','Demonstração de uma regra real, sem aplicar prova.'))
S('P28','A vontade de ver a própria ideia funcionar',
('Ele ainda está criando e já quer ver o resultado.','Uma escolha dele está ganhando forma.','Desenho em andamento, pessoa trabalhando; não atribuir a aluno real.'),
('Fernando conta essa vontade.','“Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar.”\nFernando · Aluno','Fotograma real de Fernando; aspas equivalentes e fala intacta.'),
('Quando cria um jogo, ele tem algo seu para experimentar.','O caminho, a regra e os personagens podem carregar escolhas de quem criou. Há uma história para compartilhar com a família.','Diagrama autoral de criação e experimentação, sem inventar projeto do Fernando.'))
S('P30','Do botão pronto a quem decide sua função',
('Seu filho sabe tocar em cada botão. Alguém decidiu o que eles fazem.','Por trás da tela pronta, existem escolhas de quem criou.','Detalhe de aplicativo genérico com botão neutro e mão de criança.'),
('Criar coloca outras perguntas na conversa.','O que esse botão faz? Quando a porta abre? Como o jogador descobre o caminho?','Rascunho de decisões com desenhos de botão, porta e caminho.'),
('Programar jogos é uma forma de começar a construir essas respostas.','A criança organiza instruções, testa e corrige. Conhece a tecnologia também pelo lado de quem cria.','Comando real e reação no jogo, sem promessa de profissão ou notas.'))
(w/'final-stories.json').write_text(json.dumps(stories,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
