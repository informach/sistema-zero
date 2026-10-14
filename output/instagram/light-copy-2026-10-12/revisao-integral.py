from pathlib import Path
import json, shutil

w=Path(__file__).parent
posts=json.loads((w/'final-posts.json').read_text(encoding='utf-8'))
by={p['id']:p for p in posts}
backup=w/'antes-revisao-de-clareza'
backup.mkdir(exist_ok=True)
for f in ['final-posts.json','final-stories.json']:
    if not (backup/f).exists(): shutil.copy2(w/f,backup/f)

def change(pid,delivery,title,caption,**data):
    p=by[pid]
    p.update(title=title,delivery=delivery,caption=caption,**data)
    if p['format']=='Reel': p['cover']=title
    return p

def C(pid,delivery,slides,caption,**kw):
    return change(pid,delivery,slides[0][0],caption,slides=slides,**kw)
def I(pid,delivery,text,visual,caption,**kw):
    return change(pid,delivery,text[0],caption,text=text,visual=visual,**kw)
def R(pid,delivery,title,scenes,caption,**kw):
    timed=[]
    for i,(visual,overlay,speech) in enumerate(scenes): timed.append([i*9,(i+1)*9,visual,overlay,speech])
    return change(pid,delivery,title,caption,scenes=timed,visual=' '.join(s[0] for s in scenes),**kw)

C('P01','Dica com exemplo',[
('A tarefa é do seu filho. Mas é você que acaba fazendo.','Ele diz “não consigo”. Você mostra como faz e, quando percebe, terminou por ele.','Mãe e filho de cerca de 11 anos diante de uma ponte de papel que caiu entre dois apoios. Ele pede ajuda; ela escuta. Expressões naturais, sem repreensão.'),
('A ponte de papel caiu. Ele chamou você.','Dá vontade de pegar o papel e resolver. Mas ainda falta descobrir: a folha amassou ou escorregou do apoio?','Dois desenhos grandes da mesma ponte: no primeiro, papel amassado; no segundo, ponta da folha fora do apoio. Rótulos literais: Amassou / Escorregou.'),
('“Me mostra onde ela cai.”','Ele tenta de novo e vocês veem: uma ponta da folha fica sem apoio. Agora vocês sabem o que precisa mudar.','Filho aponta a ponta da folha caída entre dois apoios. A mãe observa o lugar indicado, sem pegar o material.'),
('Deixe uma escolha com ele.','“O que dá para mudar para a folha ficar apoiada?” Ele pode aproximar os apoios e tentar de novo. Você ajuda no que ainda estiver difícil.','Duas etapas da mesma montagem: apoios afastados e depois aproximados sob as pontas da folha. Mãos da criança fazem o ajuste; mãe acompanha.'),
('Essa investigação também cabe na tela.','No jogo que está criando, o personagem foi para o lado errado. Ele muda a direção do movimento e testa de novo para ver se resolveu.','Diagrama editorial de personagem genérico, sem interface: seta para a esquerda com destino à direita; depois seta corrigida para a direita. Não atribuir a captura a um aluno nem simular um bloco do Estúdio.'),
('A próxima tentativa pode ser dele.','Você continua por perto. Mas, em vez de receber tudo resolvido, seu filho participa da solução: encontra o problema, escolhe uma mudança e confere o resultado.','Retomar mãe e filho com a ponte de papel. A criança mantém as mãos no projeto. Faixa de síntese: Encontrar o problema / Escolher uma mudança / Conferir.')
], 'A gente quer ajudar e, às vezes, acaba com a tarefa do filho nas mãos. Ele chamou porque travou; nós já enxergamos a solução e fazemos por ele.\n\nAntes de pegar no material, peça: “Me mostra onde deu errado”. No exemplo da ponte, ver a folha escorregar dá uma informação que o “não consigo” sozinho não dava.\n\nCom o problema à vista, fica mais fácil deixar uma decisão com a criança. Aproximar os apoios é uma tentativa que ela consegue fazer e conferir. Se ainda precisar, vocês fazem juntos.\n\nCriar jogos traz situações desse tipo: o personagem faz algo diferente do esperado, e a criança precisa descobrir qual comando mudar. Ela tem uma razão para investigar, porque quer ver a própria ideia funcionar.\n\nAs cenas são ilustrações de uma situação inventada para explicar a ideia.',cta='Pedir que o filho mostre a tentativa antes de assumir a tarefa.')
by['P01']['dm']['cta']='Comente PASSO para receber pelo direct três perguntas para ajudar seu filho quando ele trava numa tarefa.'

R('P02','Reflexão','Ele lembra cada regra do jogo. Na tarefa, diz “não sei”.',[
('Helena imita uma conversa cotidiana; criança explica animadamente uma brincadeira, sem tela de produto.','Ele tem muito para contar.','Seu filho lembra as regras, os nomes e os caminhos de uma brincadeira. Aí você pergunta sobre a tarefa da escola e ouve: “Não sei”.'),
('Detalhes encenados: criança acompanha uma partida, conversa com amigo e tenta outra vez.','Ali, ele viu, tentou e repetiu.','Vale olhar para o caminho até essa explicação: ele participou, errou, repetiu e conversou sobre aquilo. Na tarefa nova, talvez ainda esteja no primeiro contato.'),
('Voltar à conversa, com adulto ouvindo em vez de apontar caderno como cobrança.','“Então você sabe. Só falta querer.”','Usar o jogo como cobrança deixa essa diferença de fora. Conhecer bem uma atividade não significa saber começar qualquer outra.'),
('Entrar só agora com criação digital real e pequeno teste.','Um interesse pode abrir outra aprendizagem.','Criar jogos aproveita esse assunto que já interessa a ele. Para fazer uma ideia funcionar, vai precisar aprender a organizar comandos, testar e corrigir. O interesse dá um motivo para começar.')
], '“Se lembra tudo do jogo, por que não lembra da matéria?” É uma comparação fácil de fazer.\n\nMas compare também a experiência: quantas vezes ele viu, tentou e explicou aquele jogo? O assunto da escola pode ser novo, ter outra dificuldade ou pedir outro tipo de ajuda. Gostar de uma coisa não torna todas as outras fáceis.\n\nO interesse pelos jogos pode servir de ponto de partida para uma aprendizagem nova. Ao criar, ele precisa descobrir como transformar uma ideia em algo que funciona. É aí que a programação entra.\n\nA proposta é aproveitar um interesse, sem usá-lo como medida para cobrar todo o restante.',cta='Perceber a experiência por trás de uma habilidade que o filho já mostra.')

I('P03','Reflexão','Depois do “ficou bonito”, ainda tem uma história para ouvir.'.split('\n')+['“Qual parte você mais gostou de fazer?”'],'Filho mostra desenho com rascunhos visíveis ao lado; mãe se aproxima do detalhe que ele aponta. Composição com objeto grande e gesto de conversa.',
'Você vê um desenho pronto. Seu filho lembra da parte que apagou três vezes, da cor que inventou e do detalhe que quase desistiu de fazer.\n\n“Ficou bonito” é um carinho. A conversa pode continuar: “Qual parte você mais gostou de fazer?”. Talvez ele mostre algo que você nem tinha reparado.\n\nNum jogo criado por ele, também existe uma história por trás da tela: uma regra que deu trabalho, um personagem escolhido, uma ideia que mudou no meio. Pedir que ele conte é uma forma de conhecer essas escolhas.\n\nVocê não precisa entender de programação para se interessar pelo que ele criou.',cta='Ouvir a história de uma escolha que não aparece no resultado pronto.')

C('P04','Dica com exemplo',[
('“Arrume a mochila” parece uma tarefa. Esconde várias.','Para quem já sabe a rotina, é simples. Para quem ainda está aprendendo, falta descobrir por onde começar.','Mochila aberta e três objetos fora dela: agenda, caderno e estojo. Criança olha para a agenda.'),
('Primeiro, ele precisa saber o que levar.','Colocar todos os cadernos na mochila resolve a pressa. Conferir quais aulas terá amanhã ajuda a escolher os certos.','Dois desenhos: pilha de todos os cadernos e grade de aulas indicando apenas dois. Sem carga exagerada nas costas.'),
('Uma ordem para vocês experimentarem.','1. Olhar as aulas de amanhã.\n2. Separar os cadernos dessas aulas.\n3. Conferir se o estojo está junto.','Três cenas grandes correspondentes a cada ação. Não acrescentar instruções na imagem que não estejam no texto.'),
('Agora dá para saber onde ele precisa de ajuda.','Se não encontra a grade de aulas, vocês começam por aí. Se separou os cadernos, falta conferir o estojo. O pedido ficou mais claro.','Adulto aponta a grade junto da criança; as duas etapas seguintes permanecem visíveis.'),
('Pensar nessa ordem é usar raciocínio lógico.','Ao criar um jogo, a criança também organiza o que acontece antes e depois. A porta só abre depois que o personagem pega a chave.','Sequência própria: buscar chave, chegar à porta, abrir. Usar captura real apenas se mostrar essa regra na versão usada.'),
('“Se organize” fica mais fácil de entender quando vira uma ação.','Olhar, separar e conferir são coisas que seu filho consegue fazer e acompanhar. Vocês podem deixar a lista perto da mochila.','Lista curta junto da mochila, criança conferindo o estojo. Fechamento no cotidiano, não na interface.')
], '“Se organize” diz o resultado que a gente espera. A criança ainda pode precisar aprender as ações que levam até ele.\n\nNa mochila, uma lista curta mostra o caminho: olhar as aulas, separar os cadernos e conferir o estojo. Depois de usar algumas vezes, observem o que ela já consegue fazer e onde ainda pede ajuda.\n\nAo programar um jogo, a ordem também tem efeito: buscar uma chave antes de tentar abrir uma porta, por exemplo. Pensar na sequência deixa de ser uma ideia abstrata. Dá para ver o que acontece quando um passo falta.',cta='Montar uma lista de três ações para preparar a mochila.')

R('P05','História e reflexão','Seu filho vive inventando outro jeito de fazer.',[
('Criança redesenha um caminho num papel; adulto faz pausa para ouvir.','“Eu faria diferente.”','Seu filho olha uma brincadeira pronta e já quer mudar uma regra. Dá para ouvir isso como uma ideia que merece ser experimentada.'),
('Daniel no registro original. Identificação: Daniel · Pai do Rafael.','Uma ideia do Rafael.','[ÁUDIO ORIGINAL] Vai criando, vai sendo mais criativo. “Eu quero mudar isso aqui no jogo.”'),
('Helena desenha dois caminhos, um curto demais e outro com uma escolha no meio.','A mudança precisa fazer alguma diferença.','Daniel percebeu essa vontade no Rafael. Quando a criança cria, ela pode ir além de sugerir: faz a mudança e descobre se a brincadeira ficou como imaginou.'),
('Duas versões próprias do mesmo percurso, comparadas por alguém jogando.','Inventar inclui conferir se a ideia funciona.','É uma maneira concreta de falar de inovação com uma criança: tentar um jeito diferente e ver o que ele melhora. Uma boa ideia também precisa passar por esse teste.')
], 'Às vezes, a vontade de mudar aparece antes de a criança saber explicar como faria.\n\nDaniel conta que começou a ouvir do Rafael: “Eu quero mudar isso aqui no jogo”. A criação deu um lugar para experimentar essa vontade.\n\nUma mudança pode tornar o caminho mais interessante, deixar uma regra mais clara ou criar uma escolha para quem joga. Ao programar, a criança consegue construir e comparar essas versões.\n\nInovar começa a ganhar um significado concreto: perceber algo que gostaria de mudar, fazer uma tentativa e conferir se ajudou. O relato é da experiência do Daniel com o Rafael.',cta='Ouvir o motivo de uma mudança proposta pelo filho.')

C('P06','Reflexão com exemplo',[
('“Não sei fazer isso, filho.” A ajuda pode começar aí.','Você não entende a atividade. Mas consegue contar o que viu, ouvir a ideia e procurar uma orientação com ele.','Responsável senta junto da criança que mostra um desenho de labirinto. Adulto curioso, sem expressão de incapacidade.'),
('Imagine que ele desenhou um labirinto.','Você tenta seguir o caminho e fica preso num canto. Consegue mostrar onde parou, mesmo sem saber desenhar um labirinto.','Labirinto original pequeno com entrada, corredor e saída. Dedo do adulto chega a um beco sem saída.'),
('O seu olhar mostra uma coisa que ele ainda não tinha visto.','“Achei que passava por aqui, mas o caminho acabou.” Ele pode explicar outra saída ou perceber que falta abrir uma passagem.','Criança olha o beco e considera outra rota. Não preencher a solução automaticamente.'),
('Isso também acontece quando ele cria um jogo.','Você pode ser a primeira pessoa a jogar. Se não entender onde ir ou o que fazer, conte a ele. A dúvida de quem joga ajuda a melhorar a criação.','Adulto testa jogo próprio; criança acompanha. Apresentar interface real apenas aqui.'),
('Você pode participar como alguém que quer entender.','Se a dificuldade for técnica, vocês buscam a explicação. Seu papel na conversa começa antes de saber todos os comandos.','Adulto e criança localizam juntos um trecho da explicação. Mãos da criança permanecem no mouse.')
], '“Eu não entendo nada disso” pode dar a impressão de que você não tem como participar.\n\nPense num labirinto desenhado pelo seu filho. Você sabe dizer onde ficou perdido, qual caminho tentou e o que não entendeu. Esse retorno já serve para ele olhar de novo para a própria criação.\n\nNum jogo feito por ele, acontece algo parecido. Jogar uma primeira vez e contar suas dúvidas ajuda a criança a pensar em quem vai usar aquilo.\n\nQuando faltar uma resposta técnica, vocês podem procurar a orientação juntos. Participar também é escutar, experimentar e mostrar o que ainda não ficou claro.',cta='Experimentar uma criação do filho e contar onde ficou com dúvida.')
by['P06']['dm']['cta']='Comente APOIO para receber pelo direct três formas de participar quando você não sabe a resposta.'

I('P07','Dica',['Ele respondeu “entendi”. Na hora de fazer, travou.','Troque “entendeu?” por “me mostra como você vai começar”.'],'Duas cenas com a mesma criança: concorda com explicação sobre montar um quebra-cabeça e, depois, aponta a primeira peça que vai procurar.',
'“Entendeu?” cabe numa resposta de uma palavra. Pedir que a criança mostre o começo revela mais.\n\nSe a tarefa é montar um quebra-cabeça, por exemplo, ela pode separar as peças da borda. Se não souber por onde começar, vocês encontram a dúvida antes de ela ficar sozinha diante de todas as peças.\n\nAo criar um jogo, vale a mesma conversa: “Me mostra qual ação você vai montar primeiro”. A criança aponta, tenta e vê o resultado.\n\nA intenção é descobrir onde ajudar, sem exigir uma explicação decorada.',cta='Pedir uma demonstração do primeiro passo.')

R('P08','Dica com humor','Ele inventou cinco personagens. A história ainda nem começou.',[
('Criança espalha desenhos; cada ideia acrescenta mais uma folha à mesa. Humor no volume de papel.','Uma ideia chama outras dez.','A história tinha um cachorro. Agora tem dragão, nave, castelo e cinco personagens. Seu filho está cheio de ideias, mas ainda não conseguiu começar.'),
('Adulto divide uma folha em Agora e Depois e convida criança a escolher.','As ideias podem esperar no papel.','Façam duas colunas: Agora e Depois. Para começar, ele escolhe um personagem e um problema. As outras ideias ficam guardadas, sem ter que caber todas nessa primeira história.'),
('Desenhar cachorro e portão fechado; a criança conta uma solução em voz própria na captação, sem depoimento inventado.','Um cachorro precisa sair do quintal.','Por exemplo: o cachorro quer sair, mas o portão está fechado. Já existe algo para contar. Depois, seu filho decide se um dragão realmente precisa entrar nessa história.'),
('Somente agora esboço de jogo próprio com um personagem e um objetivo.','Uma primeira versão tem um tamanho que dá para fazer.','Ao criar jogos, também dá para começar com um personagem e um objetivo. Fazer essa versão ajuda a escolher qual ideia acrescentar depois.')
], 'Ter muitas ideias e conseguir terminar uma delas são desafios diferentes.\n\nA folha Agora e Depois ajuda a guardar as ideias sem colocar todas na primeira tentativa. Na coluna Agora, escolham só o necessário para existir uma versão: um personagem, um problema e uma saída.\n\nEsse cuidado também faz parte de criar jogos. Antes de pensar em dez fases, a criança pode construir uma ação que funcione e experimentar o resultado.\n\nPlanejar inclui decidir o que fica para depois. A imaginação continua tendo espaço.',cta='Usar duas colunas para escolher uma primeira versão.')

C('P09','Dica com explicação',[
('Ele viu o tutorial inteiro. Agora não sabe por onde começar.','Durante o vídeo, parecia fácil. Quando pega o material, falta lembrar o primeiro movimento.','Criança fecha vídeo de avião de papel e olha para folha ainda aberta. Sem tela de curso na capa.'),
('No vídeo, outra pessoa tomou todas as decisões.','Ela virou o papel, alinhou as pontas e escolheu onde dobrar. Seu filho acompanhou. Agora precisa fazer esses movimentos.','Três detalhes da dobra: virar folha, alinhar pontas, apertar vinco. Mesma folha em todos.'),
('Experimentem uma pausa mais cedo.','Assistam à primeira dobra. Pausem. Deixem ele fazer. A dúvida aparece ali, enquanto vocês ainda sabem qual trecho procurar.','Vídeo genérico pausado na primeira dobra; mãos da criança alinham o papel.'),
('Voltar ao vídeo agora tem um motivo.','As pontas ficaram desencontradas. Vocês revêm como alinhá-las e tentam de novo. A explicação responde a uma dúvida que acabou de aparecer.','Duas pontas desalinhadas e o mesmo gesto mostrado no vídeo. Sem carimbo de certo ou errado.'),
('Aprender a criar jogos também precisa desse tempo de fazer.','A criança vê um comando, monta e joga para conferir. O vídeo pode estar pausado justamente porque ela está aprendendo a usar o que viu.','Tela real de aula pausada e atividade digital em uso. Não repetir parágrafo dentro da interface.')
], 'Acompanhar alguém fazendo e fazer com as próprias mãos são experiências diferentes. Uma pausa entre elas dá espaço para descobrir o que ainda ficou confuso.\n\nNo avião de papel, pode ser alinhar as pontas. Na criação de jogos, pode ser escolher o comando que faz um personagem se mover. A dúvida fica mais clara quando há uma tentativa para olhar.\n\nPor isso, terminar o vídeo não precisa ser a meta de cada momento. Assistir a um trecho, fazer e conferir pode render uma conversa muito mais útil sobre o que a criança entendeu.',cta='Pausar uma explicação depois de uma ação e experimentar.')

C('P10','Reflexão',[
('Seu filho mudou a regra da brincadeira. Tem uma ideia aí.','“E se aqui valesse dois pontos?” Antes de descartar a proposta, vale ouvir o que ele quer mudar na partida.','Criança propõe uma regra numa brincadeira de acertar alvos de papel. Sem computador.'),
('Talvez ele queira premiar o que é mais difícil.','O alvo perto vale um ponto. O de longe vale dois. A mudança tem um motivo: acertar mais longe dá mais trabalho.','Dois alvos com distâncias visualmente diferentes, rotulados Perto: 1 e Longe: 2.'),
('Agora existe uma escolha para quem joga.','Tentar o alvo fácil ou arriscar o difícil? Uma regra pequena mudou o jeito de participar.','Vista de cima: bolinha de papel na mão entre as duas opções.'),
('Inventar também é mexer no que já existe.','Uma nova regra, outro caminho ou um final diferente. A criança usa algo conhecido para experimentar uma ideia própria.','Três cartões visuais: alvo que vale mais, caminho alternativo, final de história. Cada um mostra a mudança, sem palavras abstratas.'),
('Ao criar jogos, ela consegue dar vida a essas regras.','Programar permite dizer o que vale ponto e testar a partida. A criatividade aparece na decisão e no que ela muda para quem joga.','Diagrama editorial de dois alvos e pontuação; se usar produto real, captar apenas uma regra implementada. Não prometer esse exercício numa aula específica.')
], 'Quando falamos em criatividade, é fácil pensar só em desenhar bem ou inventar algo que ninguém viu.\n\nUma criança que propõe dois pontos para o alvo mais distante também está inventando: percebeu uma diferença e criou uma regra para ela. Depois, a brincadeira mostra se a ideia ficou interessante.\n\nNa programação de jogos, essas escolhas podem virar ações na tela. O valor de um alvo, o caminho até um tesouro e o que acontece ao errar são decisões de quem cria.\n\nVale prestar atenção às pequenas propostas que seu filho já faz. Algumas ideias aparecem no meio de uma brincadeira.',cta='Perceber a intenção por trás de uma regra inventada.')

# Os lotes seguintes são carregados antes de gravar a fonte completa.
for batch in ['revisao-11-20.py','revisao-21-36.py','revisao-stories.py']:
    path=w/batch
    if path.exists(): exec(compile(path.read_text(encoding='utf-8'),str(path),'exec'))
(w/'final-posts.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Fontes reescritas:',len(posts))
