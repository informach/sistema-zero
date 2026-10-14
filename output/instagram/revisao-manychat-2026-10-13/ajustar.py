from pathlib import Path
import json
import re

ROOT = Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
OUT = Path('output/instagram/revisao-manychat-2026-10-13')
FILES = ['04-postagens-manychat.md', 'postagens/15-guia-manychat.md',
         'campanhas/manychat-desafio/fluxo-curto.md', 'campanhas/manychat-desafio/README.md',
         'campanhas/manychat-desafio/analise-referencias.md', 'campanhas/manychat-desafio/assets.md']
OUT.mkdir(parents=True, exist_ok=True)
backup = OUT / 'antes.json'
if backup.exists():
    raise SystemExit('Backup já existe: não reaplicar o roteiro inteiro.')
backup.write_text(json.dumps({p: (ROOT / p).read_text(encoding='utf-8') for p in FILES}, ensure_ascii=False, indent=2), encoding='utf-8')
old = (ROOT / FILES[0]).read_text(encoding='utf-8')
blocks = re.split(r'(?=^<a id=)', old, flags=re.M)

PUBLIC = {}
PUBLIC[1] = '''### Slide 1 · Capa

> Seu filho não precisa amar estudar para gostar de aprender.
>
> Repare em tudo o que ele sabe sem ninguém ter mandado.

**Visual:** criança com o controle na mão, explicando uma descoberta a um adulto. A cena mostra interesse pela conversa, sem tela da plataforma.

### Slide 2

> O nome dos personagens. O atalho da terceira fase. A combinação que abre a porta.
>
> Para continuar a aventura, ele foi atrás dessas respostas.

### Slide 3

> Quando ele quer passar de fase, aprender uma regra tem uma utilidade clara: conseguir avançar.
>
> Um projeto que ele quer construir também dá um motivo concreto para aprender.

### Slide 4

> Pense numa ideia que ele vive contando: uma nave, um personagem, um mundo diferente.
>
> Quando tenta tirar essa ideia da cabeça, surgem perguntas. Cada resposta ajuda a construir mais um pedaço.

### Slide 5

> Criar jogos dá espaço para essa descoberta. Nesta Base da Lua, feita no nosso Estúdio, mudar o tipo de mundo altera os pulos.
>
> O mesmo comando de pular produz outro resultado.

**Visual:** dois testes no Estúdio, com a mesma ação de pulo: estilo floresta e estilo Lua. Usar uma cópia da Base da Lua para a comparação.

### Slide 6

> Para fazer o astronauta chegar mais alto, ele experimenta o mundo Lua e compara com a floresta.
>
> Troca uma escolha, observa o pulo e decide qual combina com a aventura que quer criar.

**Visual:** sequência legível do bloco de criação do mundo e do pulo em cada versão. Mostrar comparação real, com o jetpack desligado durante o teste.

### Slide 7

> A vontade de fazer o jogo funcionar dá uma razão para perguntar, testar e entender o resultado.
>
> Comente JEITO e conheça no direct um primeiro projeto para ele aprender criando.

**Visual:** criança ajustando o projeto no computador; comparação dos pulos em um recorte menor. Palavra JEITO legível.

### Legenda

> “Como você descobriu isso?” rende uma conversa diferente de “você já estudou?”.
>
> Peça para ele explicar um atalho do jogo de que gosta. Vale prestar atenção ao caminho: ele observou alguém, seguiu uma dica, tentou algumas vezes, mudou de ideia?
>
> Você conhece melhor como ele chegou àquela descoberta. E pode oferecer outra oportunidade de investigar: construir algo que ele queira ver funcionando.
>
> Na criação de jogos, uma ideia vira uma pergunta concreta. Para o astronauta alcançar uma plataforma, por exemplo, é preciso testar o pulo e olhar o resultado. A resposta tem uso imediato no projeto.
>
> Comente JEITO e conheça no direct um primeiro projeto para ele aprender criando.
'''

PUBLIC[2] = '''**Capa do Reel:** Um robô regeu a orquestra. Depois veio o maestro.

| Tempo | Texto na tela | Fala | Cena |
| --- | --- | --- | --- |
| 0–5 s | Um robô regeu na Paulista. | Um robô regeu uma orquestra na Avenida Paulista. | Júlio para a câmera. Texto menor: “São Paulo, março de 2026”. |
| 5–13 s | Depois veio João Carlos Martins. | Depois, João Carlos Martins assumiu a mesma peça. O concerto colocou máquina e interpretação humana lado a lado. | Júlio; corte para partitura própria sobre a mesa. |
| 13–21 s | Quem escolhe o que a máquina faz. | Essa cena abre uma conversa em casa: quem escolhe o que uma máquina vai fazer? | Júlio; a pergunta surge inteira na tela. |
| 21–33 s | As regras aparecem no jogo. | Criar jogos permite experimentar isso. Neste exemplo do nosso Estúdio, o adversário automático calcula lançamentos. Quem cria escolhe quando ele joga e o que acontece se errar. | Guerra de Gorilas vs Robô: início da vez automática, arremesso e passagem de vez. |
| 33–39 s | Escolher. Testar. Observar. | Ele monta uma regra, testa e observa a máquina executá-la. | Bloco e resultado lado a lado; pausa para enxergar a execução. |
| 39–46 s | Comente MAESTRO | Comente MAESTRO e conheça no direct um primeiro projeto para ele começar a criar jogos. | Júlio volta à câmera; palavra MAESTRO em destaque. |

### Legenda

> Até uma máquina que acerta precisa de alguém que decida o que pedir a ela.
>
> Em 29 de março de 2026, a Bachiana Filarmônica SESI-SP tocou Mozart na Avenida Paulista: um robô iniciou a regência e João Carlos Martins assumiu depois. A apresentação propôs uma reflexão sobre técnica e interpretação humana.
>
> Essa reflexão também cabe num projeto da criança. Se o adversário automático ganha toda partida, por exemplo, quem cria precisa avaliar se a disputa ficou interessante. O computador executou a regra; ainda cabe a uma pessoa avaliar o resultado.
>
> Na criação de jogos, seu filho pode experimentar os dois lados: escrever uma instrução e observar o que ela produz. Há uma decisão dele por trás da ação na tela.
>
> Comente MAESTRO e conheça no direct um primeiro projeto para ele começar a criar jogos.
'''

PUBLIC[3] = '''### Slide 1 · Capa

> As férias acabaram. A rotina ainda não voltou.
>
> A mochila está pronta. O horário de começar ainda vira negociação.

**Visual:** mochila aberta, uniforme na cadeira e criança se preparando para sair; situação cotidiana, sem adulto repreendendo.

### Slide 2

> “Daqui a pouco eu faço.” Você lembra de novo, o dia passa e a tarefa fica para a noite.
>
> O combinado diz o que fazer, mas deixou em aberto quando começar.

### Slide 3

> Troque “mais tarde” por um momento que vocês reconheçam: depois do lanche, por exemplo.
>
> Escolham juntos o primeiro passo e o que marca o fim daquela atividade.

### Slide 4

> Um projeto que ele gosta também pode entrar nesse combinado.
>
> “Depois do lanche, você monta uma parte. Antes de parar, anota o que vai continuar.”

### Slide 5

> Criar um jogo permite dividir uma ideia grande em tarefas pequenas. Esta fazenda foi feita no nosso Estúdio.
>
> Uma tarefa possível: fazer a semente entrar apenas na terra arada. O teste é tentar plantar nos dois tipos de chão.

**Visual:** Fazenda Feliz Profissional: tentativa em terra sem arar e plantio no canteiro arado, com a regra correspondente.

### Slide 6

> Terminou esse teste? O próximo pode ser programar a rega.
>
> Ele sabe o que concluiu e o que deixou para depois. O projeto ganha etapas que cabem no horário combinado.

**Visual:** projeto aberto ao lado de uma anotação simples: “Feito: plantar. Próximo: regar.” É uma cena de produção, sem atribuição a aluno.

### Slide 7

> “Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele.”
>
> Harle, pai do Jeffrey.

**Visual:** retrato autorizado do Harle; depoimento em destaque, sem cena inventada do Jeffrey cumprindo uma rotina.

### Slide 8

> “Continuar a fazenda” é uma tarefa enorme. “Fazer a semente entrar na terra arada” tem começo e fim.
>
> Comente RITMO e conheça no direct um primeiro projeto guiado para fazer no horário de vocês.

**Visual:** agenda com horário escolhido e uma tarefa escrita; palavra RITMO.

### Legenda

> O horário de parar merece entrar no combinado também.
>
> Para uma atividade de criação, escolham uma parte possível de fazer naquele dia. Ao terminar, olhem o que funcionou e deixem uma frase sobre o próximo passo.
>
> No dia seguinte, “continuar o jogo” pode virar “testar se a planta cresce depois da rega”. A criança tem de onde retomar, e você consegue acompanhar o avanço sem conhecer todos os comandos.
>
> As aulas gravadas ajudam a encaixar esse momento na rotina da família: dá para pausar a explicação, construir e voltar ao trecho durante o acesso.
>
> Comente RITMO e conheça no direct um primeiro projeto guiado para fazer no horário de vocês.
'''

PUBLIC[4] = '''### Slide 1 · Capa

> Ele passa a tarde “só jogando”.
>
> A próxima reclamação sobre uma fase pode render uma ideia de criação.

**Visual:** criança apontando uma fase na tela enquanto comenta algo; adulto ouvindo ao lado.

### Slide 2

> “Esse pulo é impossível.” “Tinha que ter uma pista aqui.” “Esse chefe ficou fácil.”
>
> Nessas reclamações há opiniões sobre como o jogo foi feito.

### Slide 3

> Depois da partida, peça para ele escolher uma coisa que mudaria.
>
> A conversa ganha uma decisão para explorar: o que colocar no lugar e como isso mudaria a partida.

### Slide 4

> Três perguntas para abrir a conversa, uma de cada vez:
>
> 1. Se esse jogo fosse seu, o que você mudaria?
> 2. Como você acha que fizeram esta fase?
> 3. Como seria a sua versão?

### Slide 5

> Uma fase pode ensinar o jogador pelo próprio caminho.
>
> Um espaço livre permite testar os botões. Um obstáculo baixo prepara para o salto seguinte.

### Slide 6

> Nesta aventura de 32 fases, feita no nosso Estúdio, o começo deixa espaço para experimentar o movimento.
>
> Depois, os canos ficam mais altos. Segurar o botão faz o personagem pular mais alto também.

**Visual:** Reino Cogumelo, fase 1-1: área inicial e sequência dos canos. Comparar um toque curto com um pulo segurado.

### Slide 7

> Ao criar uma fase, ele escolhe essa ordem e testa se outra pessoa entende o caminho.
>
> “Vai criando, vai sendo mais criativo. ‘Eu quero mudar isso aqui no jogo.’” Daniel, pai do Rafael.

### Slide 8

> Aquela reclamação pode virar uma escolha concreta: onde pôr a pista, qual salto mudar, o que ensinar primeiro.
>
> Comente CRIADOR e conheça no direct um primeiro projeto para ele começar a criar jogos.

**Visual:** criança rearranjando elementos de uma fase; palavra CRIADOR.

### Legenda

> “Eu faria diferente” merece uma segunda frase: “eu mudaria isto, por este motivo”.
>
> Se ele diz que uma fase é injusta, peça um exemplo. Talvez o buraco apareça tarde demais. Talvez falte espaço para pegar impulso. Agora existe uma mudança que dá para experimentar.
>
> Ao construir uma versão própria, ele também pode descobrir um efeito inesperado: facilitar todos os saltos deixou a fase sem graça. Cabe testar outra distância e comparar.
>
> Essa é uma parte interessante de criar jogos: a opinião vira uma escolha, e a partida mostra o efeito dela.
>
> Comente CRIADOR e conheça no direct um primeiro projeto para ele começar a criar jogos.
'''

PUBLIC[5] = '''### Slide 1 · Capa

> Ele aprende os comandos de um jogo novo em cinco minutos.
>
> Vale observar também o que faz quando precisa decidir o próximo passo.

**Visual:** criança usando o controle com desenvoltura; sem ícones de alerta ou reprovação.

### Slide 2

> Ele conhece os botões e encontra o caminho que costuma usar.
>
> Quando aparece uma mudança, surge outra tarefa: entender a situação e escolher o que tentar.

### Slide 3

> Repare nestes momentos:
>
> - Segue os passos, mas ainda não sabe o que cada um muda.
> - Quer fazer diferente e espera alguém decidir por ele.
> - Muda várias coisas juntas e perde a pista do que funcionou.
> - Passa quase todo o tempo assistindo ou jogando, com poucas oportunidades de criar.

### Slide 4

> São situações para praticar escolhas com orientação.
>
> Uma aula pode mostrar como fazer. Depois, uma mudança pequena abre espaço para ele decidir, testar e explicar.

### Slide 5

> Criar jogos oferece essas decisões a cada etapa.
>
> Ele escolhe uma reação, monta a regra e testa. Quando sai diferente do esperado, tem algo concreto para investigar.

### Slide 6

> Neste jogo, feito no nosso Estúdio, a nave inimiga persegue o jogador e foge por um instante quando é atingida.
>
> Quem cria precisa decidir em que momento cada reação começa.

**Visual:** Caça Estelar Profissional: perseguição e fuga, com a regra correspondente legível.

### Slide 7

> No teste, ele chega perto da nave e depois a atinge. As duas reações aconteceram como planejou?
>
> Se algo falhou, pode voltar à regra daquela reação. Aprende a escolher onde olhar, em vez de mexer em tudo.

**Visual:** teste em duas etapas, com destaque na regra examinada. Uma falha, se encenada, deve ser produzida numa cópia do exemplo.

### Slide 8

> A Flávia, mãe do Fernando, contou: “No início eu acompanhei mais, agora eu acompanho menos.”
>
> Comente AUTONOMIA e conheça no direct um primeiro projeto com orientação para ele montar e testar.

**Visual:** retrato autorizado da Flávia e relato legível; palavra AUTONOMIA.

### Legenda

> A ajuda pode terminar com uma decisão nas mãos da criança.
>
> Em vez de pegar o mouse assim que ela trava, peça para mostrar o que queria fazer e o que aconteceu. Se precisar, voltem juntos ao trecho da aula.
>
> Depois da explicação, deixe uma escolha possível para ela: qual regra conferir primeiro ou que teste fazer para descobrir o problema.
>
> Na criação de jogos, o resultado aparece na tela e ajuda nessa conversa. Uma nave que deveria fugir continuou perseguindo? Há uma reação específica para examinar.
>
> Cada criança precisa de um apoio diferente. Sobre o Fernando, a Flávia contou: “Ele faz o curso com total independência no momento.”
>
> Comente AUTONOMIA e conheça no direct um primeiro projeto com orientação para ele montar e testar.
'''

PUBLIC[6] = '''### Slide 1 · Capa

> Todo talento começa com pequenos sinais.
>
> As ideias que ele inventa brincando merecem espaço para crescer.

**Visual:** caderno com um personagem, um mapa e regras inventadas para uma brincadeira.

### Slide 2

> Ele inventa um poder para o personagem, desenha uma fase no caderno ou muda a regra do jogo de tabuleiro.
>
> Essas cenas mostram interesses que você pode ajudar a explorar.

### Slide 3

> Convide-o a escolher uma dessas ideias e desenvolver mais um pedaço.
>
> Um personagem pode ganhar uma história. Um mapa pode ganhar caminhos e desafios.

### Slide 4

> Criar um jogo reúne várias dessas vontades:
>
> - Inventar a história dos personagens.
> - Desenhar o lugar onde vivem.
> - Montar um desafio para alguém vencer.
> - Decidir as regras e a pontuação.
>
> Ele pode experimentar todas.

### Slide 5

> Bichinhos do Quintal, feito no nosso Estúdio, reúne criaturas, lugares para explorar e batalhas por turnos.
>
> Há escolhas de história, desenho e regras no mesmo projeto.

**Visual:** Bichinhos do Quintal, criatura e cenário em um recorte, batalha em outro.

### Slide 6

> Uma das regras forma um ciclo: fogo tira o dobro da planta, planta tira o dobro da água, água tira o dobro do fogo.
>
> Para conferir se funciona, quem cria testa cada combinação.

**Visual:** três combinações da tabela de tipos, com os resultados de cada teste.

### Slide 7

> Até batizar uma criatura abre escolhas: onde ela vive, qual golpe usa, contra quem tem vantagem.
>
> Uma ideia puxa a outra, e as regras dão forma à brincadeira.

### Slide 8

> Escolha uma ideia que ele já gosta de inventar e ofereça um lugar para desenvolvê-la.
>
> Comente SINAIS e conheça no direct um primeiro projeto para ele experimentar a criação de jogos.

**Visual:** caderno com a ideia e computador com uma criação em andamento, sem atribuir a um aluno real.

### Legenda

> O detalhe que ele insiste em mudar pode ser a parte de que mais gosta.
>
> Tem criança que passa um tempão escolhendo o nome do personagem. Outra quer refazer o cenário. Outra fica testando a pontuação.
>
> Ao acompanhar um projeto, pergunte o que ela quer melhorar e por quê. A resposta dá assunto para conversar e ideias do que oferecer depois.
>
> Criar jogos reúne essas possibilidades num mesmo lugar. Seu filho pode experimentar desenho, história e programação, sem precisar escolher agora uma área para seguir.
>
> Comente SINAIS e conheça no direct um primeiro projeto para ele experimentar a criação de jogos.
'''

PUBLIC[7] = '''**Capa do Reel:** Nas férias, a tela vira o lugar onde ele cria.

| Tempo | Texto na tela | Fala | Cena |
| --- | --- | --- | --- |
| 0–4 s | Acordou. Pegou o tablet. | Férias. Ele acorda e já pega o tablet. | Helena; criança ao fundo no sofá. |
| 4–12 s | Uma parte desse tempo para criar. | Uma parte desse tempo pode ter outro destino: criar algo que ele queira mostrar quando terminar. | Helena se aproxima do computador. |
| 12–22 s | Um jogo para alguém experimentar. | Um jogo dá esse objetivo. Ele inventa o que acontece, monta uma parte e testa antes de seguir. | Projeto no Estúdio: montar uma instrução e executar. |
| 22–33 s | Quem cria escolhe a comemoração. | Neste boliche, feito no nosso Estúdio, derrubar os dez pinos dispara uma mensagem e faz a câmera tremer. Quem cria escolhe a comemoração. | Boliche na Praça: mostrar o resultado antes dos blocos. Reservar o fim do trecho para ver a câmera reagir. |
| 33–43 s | Débora, nossa filha | A Débora, nossa filha, contou: “No último dia chamei a minha mãe pra ver o meu jogo.” | Helena; foto autorizada da Débora. Não atribuir o boliche a ela. |
| 43–50 s | Comente FERIAS | Comente FERIAS e conheça no direct um primeiro projeto guiado para estas férias. | Helena para a câmera; palavra FERIAS. |

### Legenda

> Nas férias, um projeto pode começar com uma pergunta bem concreta: o que você gostaria de fazer para alguém jogar?
>
> Depois de escolher a ideia, vale combinar uma parte possível de montar naquele dia. Uma comemoração quando vence, por exemplo: qual mensagem aparece, que som toca, o que muda na tela.
>
> Ele faz uma escolha, vê o resultado e decide se gostou. O computador vira também um lugar para experimentar as próprias ideias.
>
> Para quem está começando, uma aventura guiada ajuda a organizar esses primeiros passos. As aulas gravadas permitem escolher o horário, pausar para montar e voltar à explicação.
>
> Comente FERIAS e conheça no direct um primeiro projeto guiado para estas férias.
'''

PUBLIC[8] = '''### Slide 1 · Capa

> Seu filho ama Roblox.
>
> Uma ideia trava muitos pais antes do primeiro jogo dele.

**Visual:** criança jogando um percurso de obstáculos em produção própria, sem logo ou tela do Roblox.

### Slide 2

> “Ele precisa saber programar antes de começar.”
>
> A primeira regra do jogo já pode ser a primeira aula. Com uma explicação, uma tentativa e um teste logo depois.

### Slide 3

> Quando comenta que um salto ficou impossível ou que a fase acabou rápido, ele tem uma opinião para explorar.
>
> Que distância deixaria o pulo divertido? O que colocaria antes do final?

### Slide 4

> Ao criar um percurso, ele transforma essas ideias em escolhas: a posição das plataformas, o caminho e a reação quando alguém cai.
>
> Depois joga para conferir se ficou como imaginou.

### Slide 5

> O Parkour do Vulcão foi criado no nosso Estúdio, com rampa, elevador e trampolim.
>
> Quem monta programa as regras: cair volta ao início; pegar a terceira gema leva à vitória.

**Visual:** Parkour do Vulcão em andamento, contador de gemas e blocos da queda e da vitória. A identificação do Estúdio deve ficar visível.

### Slide 6

> Dá para criar percursos no céu e personagens de blocos também.
>
> São jogos e personagens próprios, feitos nas nossas ferramentas e inspirados no que ele gosta.

**Visual:** Salto nas Nuvens em um recorte e `tela-molda@2x.webp` em outro, cada qual identificado pelo contexto. Não inserir o personagem do Molda dentro do jogo.

### Slide 7

> O primeiro jogo pode começar com uma regra pequena. As ideias ganham espaço conforme ele aprende a construí-las.
>
> Comente PRIMEIRO e conheça no direct uma aventura guiada para ele começar do zero.

**Visual:** criança diante de uma regra curta no Estúdio, testando o resultado. Palavra PRIMEIRO.

### Legenda

> Uma regra de jogo cabe primeiro numa frase: “pegou a terceira gema, venceu”.
>
> Programar é explicar ao computador quando isso acontece e o que ele deve fazer. Os blocos ajudam a montar essa instrução e testar o resultado.
>
> Por isso, seu filho pode aprender enquanto constrói. Começa com uma ação, vê funcionar e acrescenta outra. O percurso cheio de obstáculos é uma possibilidade para explorar ao longo desse aprendizado.
>
> Usamos ferramentas próprias. Roblox inspira ideias e estilos; a criação acontece na nossa plataforma.
>
> Comente PRIMEIRO e conheça no direct uma aventura guiada para ele começar do zero.
'''

PUBLIC[9] = '''### Slide 1 · Capa

> Seu filho ama Minecraft.
>
> A próxima invenção dele pode ser um jogo inteiro.

**Visual:** criança criando uma construção de blocos em cena própria, sem logo ou interface do Minecraft.

### Slide 2

> Ele desenha a casa na cabeça, muda uma parede de lugar e procura um jeito de chegar à torre.
>
> Esse gosto por construir pode ser o ponto de partida para inventar um jogo próprio.

### Slide 3

> Além de escolher onde fica a torre, ele pode decidir o que acontece quando alguém chega lá.
>
> Ganha um ponto? Abre outro caminho? Termina a aventura?

### Slide 4

> Para isso, precisa dar instruções ao computador.
>
> No nosso Estúdio, essas instruções são blocos que ele encaixa: quando acontecer uma coisa, faça outra.

**Visual:** recorte real de uma regra do Estúdio, com evento e reação. Evitar equiparar um bloco de construção a uma instrução de programação.

### Slide 5

> O Mundo de Blocos foi feito no nosso Estúdio, inspirado em Minecraft.
>
> Nele, clicar perto do personagem coloca um bloco sólido. Quem cria programa essa reação para o jogador montar um caminho até a muralha.

**Visual:** Mundo de Blocos Profissional: clique, bloco colocado e personagem subindo. Mostrar a criação na ferramenta própria.

### Slide 6

> Na Mina de Cristais, outra criação do Estúdio, pedra vira entulho e cristal vale ponto.
>
> Também dá para criar o personagem: este boneco de blocos foi feito no Molda, nossa ferramenta de 3D.

**Visual:** Mina de Cristais e captura real `tela-molda@2x.webp`, separadas. Preservar o contexto de cada imagem.

### Slide 7

> Construir o cenário é uma parte. Escolher o que acontece dentro dele abre outras possibilidades de criação.
>
> Comente MUNDO e conheça no direct um primeiro projeto para ele aprender a criar jogos.

**Visual:** panorama de mundo próprio e detalhe de uma regra em ação; palavra MUNDO.

### Legenda

> Uma torre pode ser cenário. Também pode guardar a regra mais importante da aventura.
>
> Imagine que chegar ao topo abre uma ponte. Agora a construção participa do jogo: quem cria precisa programar essa reação e testar se a ponte abre na hora certa.
>
> É uma forma de apresentar programação a quem gosta de inventar mundos. O interesse pela construção ajuda a dar sentido ao que ele quer fazer funcionar.
>
> Os exemplos do post foram feitos nas nossas ferramentas, com Minecraft como inspiração. O personagem 3D está no Molda; os jogos rodam no nosso Estúdio.
>
> Comente MUNDO e conheça no direct um primeiro projeto para ele aprender a criar jogos.
'''

PUBLIC[10] = '''### Slide 1 · Capa

> Seu filho gosta de desenhar, inventar personagens e criar histórias.
>
> Imagine alguém jogando uma aventura que saiu desses desenhos.

**Visual:** personagem num caderno e uma cena de jogo própria, sem fingir que são trabalhos de um aluno real.

### Slide 2

> Ele mostra o desenho e conta o nome do herói, os poderes e quem atrapalha o caminho.
>
> A história já oferece ideias para uma aventura.

### Slide 3

> Para virar jogo, essa história ganha escolhas de quem joga.
>
> O herói pode abrir a porta ou seguir pela floresta. Cada caminho precisa ter uma reação.

### Slide 4

> Criar o jogo é decidir essas reações e fazer o computador executá-las.
>
> O desenho ganha movimento, o cenário ganha caminhos e outra pessoa experimenta a história.

### Slide 5

> No Pinta, nossa ferramenta de desenho, ele pode criar personagens e cenários.
>
> Dá para animar também: mudar um pouco o desenho em cada quadro cria a sequência do movimento.

**Visual:** `tela-pinta@2x.webp` e `tela-animacao@2x.webp`, com a sequência dos cinco quadros visível.

### Slide 6

> No Estúdio, o desenho pode virar o cenário da fase.
>
> Neste exemplo, o herói anda na frente da imagem. As instruções do jogo dizem como ele se move.

**Visual:** Cenário do meu desenho executando com uma arte trazida do Pinta. Mostrar movimento real e a regra correspondente.

### Slide 7

> Para explorar formas em 3D, existe o Molda: modelar, pintar e animar.
>
> Este personagem de blocos foi criado lá.

**Visual:** `tela-molda@2x.webp`, separada da arte 2D; não sugerir conversão automática de desenho em modelo 3D.

### Slide 8

> Um começo para essa jornada é aprender a dar comandos a um personagem e fazer uma aventura funcionar.
>
> Comente PERSONAGEM e conheça no direct um primeiro projeto guiado de criação de jogos.

**Visual:** personagem de exemplo em movimento no Estúdio, com seu comando legível. Palavra PERSONAGEM.

### Legenda

> O poder que ele inventou para o herói rende uma decisão de jogo.
>
> Se o personagem fica invisível, por exemplo, o poder dura quanto tempo? Pode usar toda hora? O que muda para o vilão?
>
> A história ganha regras que outra pessoa consegue experimentar. Seu filho desenha, escolhe as reações e testa se a aventura funciona como imaginou.
>
> Pinta, Estúdio e Molda mostram possibilidades diferentes desse caminho. Um primeiro projeto guiado apresenta os comandos e os testes; desenho livre e modelagem fazem parte das possibilidades de continuidade na Comunidade.
>
> Comente PERSONAGEM e conheça no direct um primeiro projeto guiado de criação de jogos.
'''

PUBLIC[11] = '''**Capa do Reel:** Ele já gosta de jogar. Imagine um jogo criado por ele.

| Tempo | Texto na tela | Fala | Cena |
| --- | --- | --- | --- |
| 0–5 s | Imagine um jogo criado por ele. | Seu filho já gosta de jogar. Imagine um jogo criado por ele. | Helena e Júlio no sofá, falando para a câmera. |
| 5–12 s | André, nosso filho | O André, nosso filho, sempre gostou de jogar e assistir a jogos. | Foto autorizada do André; volta ao casal. |
| 12–20 s | Uma parte desse tempo para criar. | Eu e o Júlio passamos a usar uma parte desse tempo para ensiná-lo a criar os próprios jogos. | Casal; projeto aberto no computador, sem representar gravação histórica. |
| 20–30 s | Ele escolhe e testa. | Criando, ele tinha escolhas para fazer: o que acontecia primeiro, que regra testar, o que mudar quando algo falhava. | No Estúdio, uma regra sendo testada. |
| 30–37 s | Quem cria decide a vitória. | Neste duelo, feito no nosso Estúdio, vence quem terminar com mais vida. | Duelo de Heróis: cronômetro acaba e compara as vidas. |
| 37–44 s | André conta como foi. | Ele contou: “Eu já jogava um monte, agora eu faço os meus jogos.” | Foto e frase literal do André, sem atribuir o duelo a ele. |
| 44–51 s | Comente TELA | Comente TELA e conheça no direct um primeiro projeto para seu filho começar a criar. | Volta ao casal; palavra TELA. |

### Legenda

> O gosto do André por jogos deu assunto para a gente ensinar programação em casa.
>
> Usamos uma parte do tempo que ele já passava na tela para criar. Foi nesse processo que percebemos mais interesse dele por aprender e mais envolvimento com as aulas.
>
> Essa é a nossa experiência com o André. Dela nasceu a vontade de oferecer a outras famílias um começo orientado, com explicação, construção e teste.
>
> Para acompanhar, você pode pedir que seu filho mostre uma escolha do projeto: o que queria fazer, qual comando usou e o que aconteceu quando testou. O jogo dá um assunto concreto para essa conversa.
>
> Comente TELA e conheça no direct um primeiro projeto para seu filho começar a criar.
'''

PUBLIC[12] = '''**Capa do Reel:** A profissão dele ninguém adivinha.

| Tempo | Texto na tela | Fala | Cena |
| --- | --- | --- | --- |
| 0–5 s | Ninguém adivinha a profissão dele. | Ninguém consegue adivinhar a profissão do seu filho. | Júlio para a câmera. |
| 5–13 s | Há escolhas para praticar hoje. | Hoje, você pode dar espaço para ele inventar, resolver um problema e explicar uma escolha. | Criança desenhando um caminho e explicando a ideia. |
| 13–21 s | Um projeto reúne essas ações. | Criar um jogo reúne essas ações: planejar o que acontece, montar as regras e conferir o resultado. | Papel com plano simples e projeto no Estúdio. |
| 21–33 s | Cada resposta leva a um lugar. | Nesta vila, feita no nosso Estúdio, uma resposta leva à padaria; outra, à oficina. Quem cria precisa montar os dois caminhos e testar cada resposta. | Vila das Vocações: botões Padeiro e Mecânico, com seus respectivos destinos. |
| 33–41 s | Ele tem uma escolha para explicar. | Depois, pode explicar por que escolheu aqueles destinos. Você acompanha o raciocínio dele num projeto que dá para jogar. | Volta ao plano e aos dois caminhos funcionando. |
| 41–48 s | Comente FUTURO | Comente FUTURO e conheça no direct um primeiro projeto para ele aprender criando. | Júlio; palavra FUTURO. |

### Legenda

> “O que você quer ser?” é uma conversa. “Como você resolveu isso?” abre outra.
>
> Um projeto permite acompanhar escolhas que já existem hoje. Ele tentou um caminho, encontrou um problema, pediu uma explicação, decidiu mudar alguma coisa.
>
> Na criação de jogos, você pode pedir que ele mostre duas versões da mesma ideia e explique por que ficou com uma delas. Dá para conversar sobre planejamento, teste e decisão olhando o que ele fez.
>
> São práticas úteis para explorar agora, enquanto descobre do que gosta e conhece outras possibilidades para o futuro.
>
> Comente FUTURO e conheça no direct um primeiro projeto para ele aprender criando.
'''

PUBLIC[13] = '''### Slide 1 · Capa

> Em sete cidades do mundo, o Minecraft virou projeto de escola.
>
> A tarefa era imaginar melhorias para o lugar onde os alunos vivem.

**Visual:** mapa próprio com sete cidades, identificação discreta “Projeto de 2023”; sem foto de escola ou interface do programa.

### Slide 2

> Em 2023, o Minecraft Education e a C40, uma rede de cidades pelo clima, levaram um desafio a escolas de sete cidades.
>
> Nova York, Londres e Buenos Aires estavam entre elas.

**Visual:** mapa com as sete cidades; fonte discreta “Minecraft Education, 2023”.

### Slide 3

> Os alunos precisavam pesquisar, planejar, construir no jogo e apresentar uma proposta para a cidade.
>
> O programa sugeria de 8 a 12 semanas para o trabalho.

### Slide 4

> “Uma rua mais segura” cabe numa frase. Construir essa rua pede escolhas.
>
> Onde fica a calçada? Por onde passam os carros? Como alguém chega ao ponto de ônibus?

**Visual:** uma rua montada em blocos numa ilustração própria. Mostrar as escolhas citadas, sem apresentar a ilustração como trabalho do programa.

### Slide 5

> O desafio deu uma finalidade à construção: resolver um problema e explicar a proposta.
>
> Esse é um caminho para explorar o interesse da criança por inventar mundos.

### Slide 6

> Na criação de jogos, dá para acrescentar reações a esse mundo. No Meu Mundo, feito no nosso Estúdio, chegar perto do lago dispara um aviso.
>
> Quem cria escolhe onde ele aparece e testa se o jogador o encontra na hora certa.

**Visual:** Meu Mundo, carrinho entrando na área do lago e aviso aparecendo. Recorte da regra com identificação do Estúdio.

### Slide 7

> Agora há algo para construir, testar e mostrar. A ideia virou uma experiência que outra pessoa pode explorar.
>
> Comente APRENDER e conheça no direct um primeiro projeto para ele aprender a criar jogos.

**Visual:** trajeto do carrinho até o lago, com a reação visível; palavra APRENDER.

### Legenda

> Um mapa bonito ganha outro desafio quando alguém precisa usá-lo.
>
> Ao mostrar uma criação, vale deixar a outra pessoa explorar antes de explicar tudo. Ela encontrou o caminho? Percebeu o aviso? Entendeu o objetivo?
>
> As respostas dão ideias para melhorar o projeto. Quem cria pode mudar uma passagem ou a posição de uma pista e pedir outro teste.
>
> O caso das escolas vem do programa Schools Reinventing Cities, documentado pelo Minecraft Education em 2023. Nosso exemplo é o Meu Mundo, criado no Estúdio do Sistema Zero. Cada um mostra uma forma de transformar uma ideia em algo que outras pessoas podem explorar.
>
> Comente APRENDER e conheça no direct um primeiro projeto para ele aprender a criar jogos.
'''

PUBLIC[14] = '''### Slide 1 · Capa

> Seu filho larga a tarefa no primeiro tropeço.
>
> Antes de chamar de preguiça, repare no que aconteceu um minuto antes.

**Visual:** criança afastando a cadeira, caderno ou computador na mesa; sem expressão de desespero ou adulto repreendendo.

### Slide 2

> Ele apagou a mesma conta duas vezes, tentou de novo e fechou o caderno: “não sei fazer”.
>
> A dificuldade está numa parte. A frase tomou conta da tarefa inteira.

### Slide 3

> Comece localizando o ponto em que ele travou.
>
> Pedir que mostre a última tentativa ajuda a descobrir o que já fez e onde precisa de uma explicação.

### Slide 4

> Escolha uma pergunta para continuar a conversa:
>
> “Qual parte travou?”
> “O que você já tentou?”
> “Quer testar de outro jeito?”
>
> A resposta ajuda vocês a escolher o próximo passo.

### Slide 5

> Criar um jogo oferece um lugar para praticar isso. Na Guerra de Gorilas, feita no nosso Estúdio, errar o lançamento deve passar a vez.
>
> Quem monta essa regra testa um erro de propósito e confere se o outro jogador consegue jogar.

**Visual:** dois momentos: regra de passagem de vez e lançamento de teste que erra, seguido do outro jogador. Mostrar a relação entre programar e testar.

### Slide 6

> Se a vez não passar, ele tem uma parte para conferir. O resto do jogo continua lá.
>
> Nas nossas aulas, “Uma pista” oferece uma dica por vez. “Verificar esta parte” confere os objetivos da atividade.

**Visual:** cópia de demonstração do jogo para o teste; captura de uma aula publicada com objetivos, em quadro separado e identificado. Não apresentar a Guerra de Gorilas como curso disponível.

### Slide 7

> “Não sei fazer o jogo” fica mais fácil de investigar quando vira “preciso conferir a troca de vez”.
>
> Comente TENTATIVA e conheça no direct um primeiro projeto para ele montar e testar, uma parte de cada vez.

**Visual:** a regra da troca de vez destacada dentro do projeto, sem apagar os outros blocos; palavra TENTATIVA.

### Legenda

> Depois de “não consegui”, vale pedir para ver a tentativa.
>
> Se a criança ainda não entendeu a explicação, voltem a ela. Se entendeu a ideia, mas o resultado saiu diferente, escolham uma parte para conferir.
>
> Num jogo, por exemplo, o personagem anda e o cenário aparece, mas a vez não passa. Esses detalhes mostram o que já funciona e deixam uma tarefa menor para investigar.
>
> A ajuda do adulto pode ser localizar esse ponto e acompanhar um novo teste. Assim, a criança participa da solução e vê o que mudou depois da tentativa.
>
> Comente TENTATIVA e conheça no direct um primeiro projeto para ele montar e testar, uma parte de cada vez.
'''

DM1 = {
1: 'Um projeto que ele quer ver funcionando dá motivo para aprender. Veja um começo guiado para essa experiência.',
2: 'Seu filho pode começar a dar instruções ao computador criando uma aventura. Veja como funciona esse primeiro projeto.',
3: 'Vocês escolhem o horário, e ele acompanha as etapas com aulas gravadas. Veja o primeiro projeto.',
4: 'Ele pode começar a transformar ideias em regras com uma aventura guiada. Veja como é esse começo.',
5: 'Temos um primeiro projeto em que ele acompanha a explicação, monta e testa. Veja como funciona.',
6: 'Para experimentar a criação de jogos, ele pode começar com uma aventura guiada. Veja o primeiro projeto.',
7: 'Um primeiro jogo pode ser o projeto destas férias. Veja a proposta e como encaixar as aulas no horário de vocês.',
8: 'Dá para começar do zero, aprendendo uma regra de cada vez. Veja a aventura guiada que propomos para esse início.',
9: 'Para começar a dar vida às regras de um mundo, ele pode montar uma primeira aventura. Veja a proposta.',
10: 'O primeiro projeto ensina a dar comandos a um personagem e fazer a aventura funcionar. Veja como ele começa.',
11: 'O gosto por jogar pode abrir espaço para criar também. Veja nosso primeiro projeto guiado.',
12: 'Inventar, montar e testar cabem num primeiro jogo. Veja a proposta para ele começar com orientação.',
13: 'Seu filho pode começar a transformar ideias em instruções numa primeira aventura guiada. Veja como funciona.',
14: 'Ele pode começar por um projeto dividido em partes, com explicação e teste. Veja como são esses primeiros passos.',
}

LEAD = {
1: 'Na aventura A Chave do Farol, ele aprende a dar comandos para encontrar a chave e acender o farol.',
2: 'Em A Chave do Farol, ele programa as ações do personagem e testa o que cada comando faz.',
3: 'Ele monta A Chave do Farol, pausando a explicação para construir uma parte e testar antes de seguir.',
4: 'Em A Chave do Farol, ele programa o personagem e testa a regra que abre a porta com a chave.',
5: 'Em A Chave do Farol, ele programa a porta e testa as duas situações: com a chave e sem ela.',
6: 'Em A Chave do Farol, ele programa o personagem, escolhe entre os desenhos disponíveis e escreve as mensagens.',
7: 'Ele monta A Chave do Farol: encontra a chave, programa as reações e testa a aventura funcionando.',
8: 'Ele monta A Chave do Farol em 2D, aprendendo os comandos enquanto constrói e testa a aventura.',
9: 'Em A Chave do Farol, uma aventura 2D, ele programa o personagem, a chave e a reação do farol.',
10: 'Em A Chave do Farol, ele programa as ações do personagem e personaliza a aventura com desenhos disponíveis e mensagens.',
11: 'Em A Chave do Farol, ele aprende a programar uma aventura, montar as regras e testar o resultado.',
12: 'Em A Chave do Farol, ele aprende a dar comandos ao personagem e testar as regras da aventura.',
13: 'Em A Chave do Farol, uma aventura 2D no nosso Estúdio, ele aprende os comandos e testa o jogo.',
14: 'Ele monta A Chave do Farol por etapas, com dicas e o botão Verificar esta parte para conferir os objetivos.',
}
SCOPE = {
1: 'Mundos em 3D, como o do post, são possibilidades de continuidade na Comunidade.',
2: 'O adversário automático mostra outras possibilidades do Estúdio.',
3: 'A fazenda mostra uma possibilidade de criação além desse primeiro projeto.',
4: 'A aventura de 32 fases mostra outras possibilidades do Estúdio.',
5: 'O jogo de naves mostra outras possibilidades do Estúdio.',
6: 'O jogo de criaturas mostra outras possibilidades de criação na Comunidade.',
7: 'O boliche mostra uma possibilidade de criação além desse primeiro projeto.',
8: 'Percursos em 3D e modelagem são possibilidades de continuidade na Comunidade.',
9: 'Mundos em 3D e modelagem são possibilidades de continuidade na Comunidade.',
10: 'Desenho livre e modelagem entram no caminho da Comunidade.',
11: 'O duelo mostra outras possibilidades do Estúdio.',
12: 'A vila em 3D mostra possibilidades de continuidade na Comunidade.',
13: 'Mundos em 3D são possibilidades de continuidade na Comunidade.',
14: 'A Guerra de Gorilas mostra outras possibilidades do Estúdio.',
}

DIRECTION = {
1: 'Manter a diferença entre estudar por obrigação e querer descobrir. Mostrar objetivo, tentativa e comparação; sem diagnosticar memória nem apresentar a física do jogo como retrato da Lua real.',
2: 'Partir do concerto, atribuir a reflexão ao evento e mostrar uma decisão humana verificável no jogo. Sem dizer que chamar um bloco ensina o funcionamento interno de inteligência artificial.',
3: 'Manter a retomada de rotina e oferecer um combinado concreto: horário, tarefa e ponto de retomada. A ponte está em dividir a criação em etapas, sem atribuir mudança de hábitos à rotina virtual da fazenda.',
4: 'Manter o interesse do pai pelo que o filho faz jogando e as perguntas de criação. Desenvolver a relação entre uma opinião sobre a fase, uma mudança e seu teste.',
5: 'Manter a diferença entre familiaridade com interfaces e decidir o próximo passo. Observar situações para praticar escolhas, valorizando orientação e ajuda. O teste da criança sustenta a ponte com autonomia.',
6: 'Manter os pequenos sinais como interesses para explorar, sem classificação de talento. Reunir história, desenho e regras no mesmo projeto e abrir espaço para experimentar.',
7: 'Manter a cena das férias e a experiência da Helena. Mostrar criação com objetivo e escolhas; sem culpar a rotina dos pais. Fala mais curta, com pausas para ver a demonstração.',
8: 'Manter o interesse por Roblox e desfazer a exigência de conhecimento prévio. Mostrar regras simples por trás de possibilidades vistosas, sempre nas ferramentas próprias.',
9: 'Manter o interesse por Minecraft como convite para inventar mundos. Explicar programação por evento e reação, sem equiparar blocos de construção a comandos nem desvalorizar o que já cria.',
10: 'Manter desenho e histórias como possibilidades desejadas. Explicar a participação do jogador e ligar o convite a um primeiro projeto de programação, distinguindo a continuidade em desenho livre e 3D.',
11: 'Manter a história real da família e a mudança no uso de uma parte do tempo de tela. Evitar hierarquia universal entre duração e atividade. O jogo mostrado é demonstração atual, não registro do André.',
12: 'Manter o desejo de preparar o filho para o futuro. Mostrar planejamento, duas respostas para testar e explicação de escolhas; sem inferir profissão a partir do tema do jogo.',
13: 'Manter o fato documentado de 2023 e explicar o projeto: pesquisar, construir e apresentar. Acrescentar programação como reação a testar; distinguir o exemplo escolar das nossas ferramentas.',
14: 'Manter o tropeço que leva a abandonar uma tarefa, sem presumir sua causa. Localizar a tentativa e mostrar programação e teste da troca de vez, em vez de usar só o erro durante a partida.',
}

def quote(paragraphs):
    return '\n>\n'.join('> ' + p for p in paragraphs)

newblocks = []
for i, b in enumerate(blocks[1:], 1):
    head = b[:b.index('### Slide') if '### Slide' in b else b.index('**Capa do Reel:**')]
    head = re.sub(r' · \*\*O que mudou em relação à versão atual:\*\*[^\n]+', ' · **Direção da peça:** ' + DIRECTION[i], head)
    head = head.replace(' (antes CURIOSIDADE)', '').replace(' (antes ESCOLHAS)', '').replace(' (antes CONVERSA)', '').replace(' (antes TALENTO)', '').replace(' (mantida)', '')
    # A ideia de referência é uma síntese; a direção explicita a adaptação editorial atual.
    if i == 5:
        head = re.sub(r'(?<=\*\*Ideia da referência:\*\* ).*?(?= · \*\*Formato)', 'familiaridade com aplicativos e autonomia são experiências distintas; a adaptação mostra escolhas que a criança pode praticar com orientação.', head)
    if i == 9:
        head = re.sub(r'(?<=\*\*Ideia da referência:\*\* ).*?(?= · \*\*Formato)', 'o interesse por Minecraft como ponto de partida para construir mundos e aprender programação.', head)
    if i == 14:
        head = re.sub(r'(?<=\*\*Ideia da referência:\*\* ).*?(?= · \*\*Formato)', 'acolher a dificuldade diante de uma tentativa que falhou, fazer perguntas e ajudar a encontrar o próximo passo.', head)
    prod = b[b.index('**Produção:**'):].strip().removesuffix('---').strip()
    if i == 1:
        prod += ' Comparar somente os pulos, nas mesmas condições e sem jetpack; guardar a alteração do estilo numa cópia de produção. Os 40% são uma configuração do jogo, não a gravidade real da Lua. A copy não ensina astronomia a partir dessa proporção.'
    if i == 2:
        prod += ' Fonte primária complementar: [SESI-SP](https://www.sesisp.org.br/noticia/tecnologia-e-emocao-se-encontram-em-apresentacao-inedita-da-bachiana-filarmonica-sesi-sp). Mostrar chamada e efeito do bloco; não atribuir à criança a escrita do algoritmo de cálculo de arremesso.'
    if i in (3, 5, 14):
        prod += ' Quando a direção pedir um teste com falha, preparar uma cópia do exemplo e registrar a alteração. A peça mostra o processo de criação; não atribuir efeito na rotina ou autonomia ao comportamento de um personagem.'
    if i == 7:
        prod = prod[:prod.index(' Para as férias de julho,')] + ' Para julho, a mesma versão funciona: remover apenas a referência interna a férias de verão, sem trocar o jogo ou inventar outro roteiro. A fala da Débora é literal; preservar texto e usar imagem autorizada. O boliche é exemplo da plataforma, não projeto atribuído à Débora. A interjeição do texto do jogo pode permanecer na captura, pois é interface real; não alterar o runtime por regra de copy.'
        prod = prod.replace('; na tela, sem a exclamação', '')
    if i == 8:
        prod = prod[:prod.index(' Salto nas Nuvens')] + ' Salto nas Nuvens e a captura real do Molda entram como possibilidades separadas. Preservar a interface de cada um, sem pôr o modelo dentro do jogo. Demonstrações da equipe: não atribuir a aluno nem anunciar curso desses jogos.'
    dm2 = ['O primeiro passo é o Desafio do Primeiro Jogo. ' + LEAD[i],
           'Aulas gravadas no computador, para 9 a 14 anos. ' + SCOPE[i],
           'Pagamento único. Acesso por 30 dias após aprovação do pagamento e garantia de 7 dias a partir da compra.']
    url = re.search(r'^https://sistemazero.com.br/[^\n]+', b, re.M)[0]
    direct = '\n### Direct\n\n**DM1**\n\n> Oi, esta é uma resposta automática. ' + DM1[i]
    direct += '\n\n**Botão interno:** Ver o primeiro passo\n\n**DM2 (depois do toque)**\n\n' + quote(dm2)
    direct += '\n\n**Botão de site:** Conhecer o Desafio\n\n' + url + '\n\n' + prod
    newblocks.append(head.rstrip() + '\n\n' + PUBLIC[i].strip() + '\n' + direct)

text = blocks[0].rstrip() + '\n\n' + '\n\n---\n\n'.join(newblocks) + '\n'
text = text.replace('Seu filho ama Minecraft. Ele passa horas construindo, sempre dentro das regras de outra pessoa.', 'Seu filho ama Minecraft. A próxima invenção dele pode ser um jogo inteiro.')
text = text.replace('No tempo de tela, o que ele faz pesa mais que o relógio.', 'Ele já gosta de jogar. Imagine um jogo criado por ele.')
text = text.replace('cerca de 46 s, com Helena', 'cerca de 50 s, com Helena')
text = text.replace('Reel 9:16, cerca de 50 s | TELA', 'Reel 9:16, cerca de 51 s | TELA')
text = text.replace('Reel 9:16, cerca de 50 s. · **Palavra:** TELA', 'Reel 9:16, cerca de 51 s. · **Palavra:** TELA')
text = text.replace('Reel 9:16, cerca de 50 s | FUTURO', 'Reel 9:16, cerca de 48 s | FUTURO')
text = text.replace('Reel 9:16, cerca de 50 s. · **Palavra:** FUTURO', 'Reel 9:16, cerca de 48 s. · **Palavra:** FUTURO')
text = text.replace('Reescritas em 13/10 para devolver a ideia de cada referência, que a versão anterior tinha trocado.', 'Revisadas em 13/10 para preservar os ganchos fortes, mostrar a aprendizagem pelas ações da criança, complementar as peças nas legendas e encurtar o direct.')
(ROOT / FILES[0]).write_text(text, encoding='utf-8')
print('14 peças atualizadas; backup anterior preservado.')
