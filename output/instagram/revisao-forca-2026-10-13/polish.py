from edit import *

# As capas continuam visuais e diretas depois da revisão de precisão.
slide('P01',2,'“Esse carro podia ser mais rápido.”\n\nAo perceber o que mudaria, ele tem uma ideia para experimentar. Criar um jogo permite colocar essa ideia à prova.')
slide('P01',3,'Neste mundo para dirigir, feito no nosso Estúdio, o turbo aumenta a velocidade do carrinho.\n\nQuem cria escolhe a força desse impulso e testa como ele muda a direção.')
slide('P01',5,'Para experimentar um turbo mais forte, ele muda o valor no comando e dirige pelo mesmo caminho.\n\nFicou mais rápido. Ainda dá para fazer a curva? O teste acrescenta outra decisão.')
cap('P01','“Esse carro podia ser mais rápido.” A reclamação já traz uma ideia para experimentar.\n\nPergunte o que seu filho mudaria e peça que conte o efeito que espera. No Meu Mundo, feito no nosso Estúdio, um comando define a força do turbo do carrinho.\n\nQuem cria pode mudar esse valor e dirigir pelo mesmo caminho para comparar. Ganhar velocidade também muda o cuidado para fazer a curva. A opinião encontra uma consequência na tela.\n\nConte aqui uma mudança que ele já sugeriu num jogo.\n\nSiga @criecomhelenaejulio para ver ideias assim virando cenários, personagens e regras.')
title('P06','Você já disse “vai estudar” três vezes. O caderno continua fechado.')
rep('P06','Você já disse “vai estudar” três vezes. O primeiro passo ainda está em aberto.','Você já disse “vai estudar” três vezes. O caderno continua fechado.')
title('P18','A atividade é do seu filho. As dúvidas chegam todas até você.')
slide('P18',1,'A atividade é do seu filho.\n\nAs dúvidas chegam todas até você.')
title('P25','Ele amou a primeira aula. O plano dura doze meses.')
slide('P25',1,'Ele amou a primeira aula.\n\nO plano dura doze meses.')
title('P26','Você não entende os blocos. Ainda pode conversar sobre o que ele aprendeu.')
slide('P26',1,'Você não entende os blocos.\n\nAinda pode conversar sobre o que ele aprendeu.')
title('P39','O herói cai no mesmo lugar. Escolha o que mudar antes do próximo salto.')
title('P49','O jogo pronto esconde o trabalho da primeira tentativa.')
art('P49','O jogo pronto esconde o trabalho da primeira tentativa.\n\nGuarde uma imagem do começo.')
title('P55','Ele disse “gostei”. Falta descobrir de qual parte.')
slide('P55',1,'Ele disse “gostei”.\n\nFalta descobrir de qual parte.')
rep('P52','O futebol estava em todas as páginas. Faltou outra coisa.','O tema favorito chama. A atividade ainda precisa dar motivo para continuar.')

# Não levar observações internas ou ressalvas repetidas para a conversa pública.
rep('P14','\n> O exemplo mostra uma possibilidade da ferramenta. A fala do Jeffrey conta o que criar representa para ele.\n>','')
rep('P23',' É uma demonstração da ferramenta, não uma aula anunciada desse projeto.','')
rep('P33','\n> O jogo demonstra uma possibilidade da ferramenta. O depoimento conta a alegria que o Fernando descreveu na própria experiência.\n>','')
rep('P25','É uma experiência real para conhecer, sem transformar esse comportamento numa exigência para toda criança.','Pergunte também ao seu filho o que ele gostaria de fazer na próxima vez.')
rep('P39','\n> Isso oferece um caminho de investigação, sem transformar uma dificuldade numa definição sobre a criança.\n>','')

# Cabeçalhos: critério editorial, sem prometer causa psicológica para cada dor.
for name in NAMES:
    heads[name]=heads[name].replace('a causa do problema, uma regra de jogo de verdade', 'uma explicação sustentada e uma regra de jogo de verdade')

def visual(ident, section, value):
    b=chunks[ident]
    pat=rf'(^### {re.escape(section)}(?: ·[^\n]*)?\n)(.*?)(?=^### |\Z)'
    m=re.search(pat,b,re.M|re.S)
    assert m,(ident,section)
    part=m.group(2)
    part,n=re.subn(r'^\*\*Visual:\*\*[^\n]*',lambda _:f'**Visual:** {value}',part,count=1,flags=re.M)
    if not n:
        # Insert after the public quote, before a production note or divider.
        part=re.sub(r'(^>[^\n]*(?:\n>[^\n]*)*)',lambda x:x[0]+'\n\n**Visual:** '+value,part,count=1,flags=re.M)
    chunks[ident]=b[:m.start(2)]+part+b[m.end(2):]

def production(ident,value):
    chunks[ident],n=re.subn(r'^\*\*Produção:\*\*[^\n]*',lambda _:f'**Produção:** {value}',chunks[ident],count=1,flags=re.M)
    assert n,ident

visual('P01','Slide 3','Meu Mundo em movimento, com carrinho, trajeto e comando real de força do turbo. Sem moedas ou placar que não existem neste exemplo.')
visual('P01','Slide 5','Duas versões preparadas com forças de turbo diferentes, no mesmo caminho e com a mesma sequência de teclas. Mostrar aproximação da curva e efeito da mudança; captar no Estúdio antes de produzir a arte.')
production('P01','Refazer o carrossel a partir desta copy de sete slides. A base Meu Mundo tem carrinho e comando carBoost com força 1,5; não tem as moedas citadas no rascunho anterior. Preparar uma variante com força de turbo maior, executar e captar a comparação no mesmo percurso, documentando a adaptação. Não inventar derrapagem, colisão ou placar: mostrar somente o efeito observado. A capa pode reutilizar a criança jogando com destreza. As artes anteriores não estão prontas para esta copy.')
note_text='Mantém a opinião do jogador como ponto de partida. O turbo confirmado no exemplo substitui as moedas que não existem nessa base. Escolha, mudança e teste sustentam a curiosidade sem julgar o lazer.'
chunks['P01']=re.sub(r'^\*\*O que mudou nesta revisão:\*\*[^\n]*',f'**O que mudou nesta revisão:** {note_text}',chunks['P01'],flags=re.M)
rep('P18','A explicação continua disponível quando chega a hora de fazer? Esse é um detalhe útil para observar numa atividade online.','Chegou a hora de fazer. A explicação precisa continuar ao alcance da criança.')
rep('P26','“O que você acha que vai acontecer?” pode render uma boa conversa antes do teste.','Antes de apertar jogar, peça que ele conte o que espera ver.')
rep('P16','Antes de pegar o teclado…','Antes de pegar o teclado.')
visual('P04','Slide 6','Duas tentativas preparadas com o mesmo vento e a mesma direção; variar somente o comprimento do arraste. Mostrar alcance e indicador de força. Testar as versões antes de captar.')
rep('P04','Por isso o slide 6 precisa de uma rodada com vento visível na seta, para a banana sair da linha.','Para o slide 6, preparar duas tentativas com direção e vento iguais, variando só o arraste; declarar essa preparação e conferir o alcance antes da captura.')
rep('P04','O arquivo do slide 4','O arquivo do slide 3')
rep('P06','O “três” do antigo gancho era cena construída e saiu.','A cena dos três lembretes é hipotética, sem alegação de frequência.')
visual('P13','Slide 6','Torre com dois invasores no caminho; destacar qual está mais adiantado e o trecho de comando que seleciona o alvo.')
visual('P13','Slide 7','Sequência de três capturas da mesma torre: alvo encontrado, disparo, invasor derrotado com ponto. Recortes dos comandos, sem repetir o parágrafo como ilustração.')
rep('P13','e depois com a primeira torre atirando.','e depois com a primeira torre selecionando o alvo, atirando e somando a recompensa; captar os trechos de comando correspondentes.')
rep('P15','A frase do slide 7 é cena possível, sem atribuição a aluno. ','')
rep('P22','Os dois jogadores são alternados, por isso a legenda diz “um de cada vez”.','Os dois jogadores são alternados; mostrar a modalidade com fidelidade se aparecer na captura.')
rep('P22','no trecho de 37 a 46 s','no trecho do depoimento previsto na tabela revisada')
rep('P22','As duas crianças do trecho de 3 a 9 s são encenação, sem nome.','As cenas de crianças são encenadas, sem nome e sem atribuir a elas o Reino Zero. Dar tempo ao áudio real, sem acelerar para caber numa marcação antiga.')
visual('P23','Slide 5','Patrulha Espacial no Estúdio, com regra de disparo legível e a nave disparando ao pressionar espaço. Sem player de aula inventada desse projeto.')
rep('P23','O vídeo pausado ao lado é encenação: não anuncia um curso desse jogo nem diz que a criança o faz no começo.','No slide 5, mostrar somente o Estúdio e a regra; não fabricar uma aula da Patrulha Espacial. A imagem de pausa da capa deve usar uma aula real correspondente à atividade visível.')
rep('P26','A resposta entre aspas no slide 5 é exemplo, sem nome de criança.','No slide 5, captar as regras de crescer e cair, alinhadas aos gestos mostrados.')
visual('P27','Arte','Adulto comparando duas fichas editoriais, sem marcas, preços ou condições inventadas. Quatro campos nas anotações: total, acesso, renovação e cancelamento. Evitar calendários que prometam regras iguais para todo contrato.')
production('P27','Peça de orientação para comparar informações. Sem preço, oferta da plataforma ou regra contratual universal. A legenda pede que o leitor confira as condições da contratação. O visual é uma organização de perguntas, não um contrato simulado.')
rep('P29','A frase do filho na legenda é uma cena possível, sem nome e sem atribuição a aluno.','A demonstração é da equipe; não reencenar uma transformação futura como depoimento de aluno.')
visual('P31','Slide 4','O carrinho diante de dois caminhos entre as árvores, com o mesmo mapa visto de cima num recorte. Destacar como vegetação cria passagens e esconde o marcador.')
rep('P31','os blocos “Espalhar” com 280, 90, 160 e 40 (slide 4)','as passagens entre as árvores e a posição do tesouro (slide 4)')
rep('P45','A cena da arte e a do quarto são ilustrativas','A cena da arte é ilustrativa')
visual('P49','Arte','Duas capturas do MESMO projeto de demonstração preparado pela equipe: movimento inicial e versão com uma regra acrescentada. Rotular “Primeira versão” e “Depois do ajuste”; sem sugerir progresso comprovado de um aluno ou comparar jogos diferentes como se fossem o mesmo.')
production('P49','Preparar e executar duas versões do mesmo projeto para a arte, documentando a única regra acrescentada. O Vale Ensolarado Profissional aparece como exemplo na legenda, sem ser chamado de evolução de um aluno. Se usado nas capturas, manter cenário e personagem iguais nas duas versões. Registrar a autoria da equipe nas fontes e no texto alternativo, sem acrescentar rodapé à arte. A revisão atual é só de copy; capturas ainda pendentes.')
rep('P50','A troca do aumento e os 12 e 40 segundos são cena ilustrativa: mostrar a variante só se a equipe preparar e executar.','A comparação da aceleração é demonstração preparada: executar as duas versões com o mesmo percurso e tempo antes de captar. Não inventar comentários ou resultados de amigos.')
visual('P54','Slide 1','Criança no meio da partida; adulto se aproxima olhando o relógio. Expressões naturais, sem bronca. O relógio e o jogo em andamento sustentam a capa; não usar semáforo nesta imagem.')
visual('P55','Slide 1','Criança mostrando uma parte da atividade ao adulto. O cursor aponta o detalhe escolhido; o adulto acompanha. A cena comunica interesse específico, não contagem de tentativas.')

for ident in ['ST03','ST05','ST07','ST11','ST13','ST15','ST16','ST18']:
    visual(ident,'Tela 4','Ilustrar a ação final descrita com continuidade da cena anterior. Se houver resultado real da enquete, ele pode acompanhar o texto; a sequência funciona sem esperar respostas. Nunca fabricar votos.')
visual('ST08','Tela 2','Na folha, o herói e o caminho até a porta do castelo. O quiz pergunta qual movimento permite atravessar essa cena, não qual é a única ordem possível de fazer jogos.')
visual('ST14','Tela 3','Batalha com fogo e planta identificados, sem revelar o número do golpe antes do palpite. O quiz é uma previsão; a próxima tela revela a regra escolhida neste jogo.')
visual('ST19','Tela 1','Aula real pausada e atividade correspondente aberta no Estúdio, sem simular aula da Base da Lua.')
visual('ST20','Tela 4','Perguntas para a conversa ao lado do projeto, sem cartela de resposta certa: esta sequência escuta preferências e necessidades de apoio.')

# Remover sugestões antigas de reativar palavras no calendário comum.
rep('P11','; se a dona quiser manter o material no direct, ele volta como convite secundário, antes da linha de seguir.','. A conversão por palavra fica na categoria ManyChat, fora deste calendário.')
rep('P12','as três perguntas estão no Reel e na legenda','as perguntas para esclarecer a dúvida estão no Reel e na legenda')
rep('P16','as três perguntas estão no Reel e na legenda','as perguntas estão no Reel e na legenda')
rep('P24','O material M06 do [plano ManyChat](06-manychat.md) ficou público neste Reel; se a dona quiser manter ROTINA no direct, a decisão é dela e não entra nesta copy.','A orientação está completa no Reel e na legenda; sem palavra-chave ou entrada de direct nesta peça.')
rep('P30','As três reclamações são exemplos, sem nome de jogo real. O material M05 do [plano ManyChat](06-manychat.md) não entra nesta copy; se a dona quiser manter CRIAR no direct, a decisão é dela.','A reclamação é uma cena hipotética, sem nome de jogo real. Sem palavra-chave ou entrada de direct nesta peça.')

# Metadados dos ganchos descrevem a peça vigente, sem carregar justificativas descartadas.
hooks={
'P01':'Opinião de jogador com uma ideia para construir','P06':'Cena de rotina: três lembretes e caderno fechado',
'P12':'Chamado cotidiano com informação que falta','P13':'Pedido escolar com várias ações possíveis','P14':'Ideia que vira lugar explorável',
'P15':'Modelo e espaço de escolha','P16':'Ação antes de assumir o teclado','P18':'Atividade do filho e dúvidas chegando ao adulto',
'P19':'Frase comum com motivo a escutar','P21':'Promessas abstratas e atividade concreta','P22':'Mesma idade, experiências diferentes',
'P23':'Vídeo parado e trabalho acontecendo','P24':'Rotina sem horário definido','P25':'Empolgação breve e compromisso longo',
'P26':'Dúvida de quem acompanha sem conhecer os comandos','P27':'Parcela e compromisso total','P28':'Equipamento ligado à atividade',
'P30':'Reclamação que abre uma ideia','P35':'História transformada em caminho','P37':'Planejamento visual de uma fase',
'P39':'Queda repetida e escolha do próximo teste','P42':'Critério de conclusão de uma tarefa','P45':'Mudança pequena e resultado a descobrir',
'P49':'Resultado pronto e registro da primeira tentativa','P51':'Convite para aprender com o filho','P54':'Partida iniciada sem horário combinado',
'P55':'Resposta curta e preferência concreta','P56':'Retomada preparada antes da pausa','P58':'Olhar de quem joga pela primeira vez'}
for ident,description in hooks.items():
    chunks[ident]=re.sub(r'\*\*Gancho:\*\*[^\n]*',f'**Gancho:** {description}.',chunks[ident])

# Espaço para respirar e demonstrar: duração estimada, gravação define o corte.
for ident,b in list(chunks.items()):
    if '**Capa do Reel:**' in b:
        marker='\n### Legenda'
        chunks[ident]=b.replace(marker,'\n**Ritmo:** tempos estimados para fala natural e demonstração. Na gravação, preservar o áudio real e alongar a cena se o teste ainda não estiver legível; não acelerar a fala para caber.\n'+marker)
