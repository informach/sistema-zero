# aula-12 — Sorteios dentro de limites

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** Os cactos repetem o mesmo padrão. Vamos variar onde nascem e a velocidade que recebem, uma propriedade por vez.

**Saída esperada:** Nascimento entre x 500 e 560 e velocidade -5 menos sorteio de 0 a 1; o relógio continua em 1,4 s.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | Os cactos repetem o mesmo padrão. Vamos variar onde nascem e a velocidade que recebem, uma propriedade por vez. |
| 2. Veja por que o percurso se repete | demonstration | Relacionar valores fixos a um padrão previsível. |
| 3. O que o sorteio pode mudar? | exploration | Comparar resultados de um sorteio dentro da faixa, mantendo a outra propriedade fixa. |
| 4. Sorteie o lugar de nascimento | application | Conectar o sorteio exclusivamente à entrada x. |
| 5. Veja a conta da velocidade | demonstration | Ler -5 menos 0 e -5 menos 1 como velocidades para a esquerda. |
| 6. Conecte a conta ao cacto | application | Combinar uma base fixa com uma variação limitada. |
| 7. Teste e entregue sua construção | delivery | Nascimento entre x 500 e 560 e velocidade -5 menos sorteio de 0 a 1; o relógio continua em 1,4 s. |
| 8. Veja o que você aprendeu | closing | Nascimento entre x 500 e 560 e velocidade -5 menos sorteio de 0 a 1; o relógio continua em 1,4 s. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Veja por que o percurso se repete

**Por que aqui:** Estabelecer o caso de comparação antes do sorteio.

**Foco:** Relacionar valores fixos a um padrão previsível.

**Fala de ligação / orientação ao aluno:** “O relógio, o x e a velocidade continuam iguais. Observe dois trechos do mesmo padrão; vamos alterar uma propriedade por vez.”

**Fonte:** roteiro-aula-12-corre-dino.md → Parte 1. Passo 1: entender por que está sempre igual.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter o padrão e os números destacados. Não prometer que sorteio garante uma partida sempre diferente de todas as anteriores.

**Na tela:** **Na tela:** abrir o bloco de criar cacto e apontar cada número fixo: x 560, tamanho 44, vx -5; e o relógio em 1.4.

**Trecho original selecionado, antes da edição:** Antes de consertar, bora entender. Abre aí o seu bloco de criar o cacto e olha os números dele. O x está em 560. Sempre 560. Todo cacto nasce exatamente no mesmo lugar. O vx está em menos 5. Sempre menos 5. Todo cacto anda exatamente na mesma velocidade. E o relógio está em 1.4. Sempre 1.4. Todo cacto nasce exatamente no mesmo tempo depois do anterior. Aproveita e confere esses dois comigo, porque eles são os números do nosso jogo e a última aula parte deles: o vx em menos 5 e o relógio em 1.4. Se algum estiver diferente, ajusta agora, que é rapidinho. Junta as três coisas: mesmo lugar, mesma velocidade, mesmo tempo. É impossível não ficar igual. O jogo está fazendo certinho o que você mandou, e o que você mandou é sempre a mesma coisa. Agora, como é que a gente faz um computador fazer uma coisa diferente a cada vez? Ele é uma máquina, ele faz exatamente o que a gente manda... A gente manda ele sortear! É isso: em vez de dar um número pronto, a gente dá uma faixa e deixa ele tirar um número de dentro dela, na hora. Igual tirar papelzinho de um saquinho. E aí o jogo fica imprevisível, que é a palavra chique pra dizer que ninguém consegue adivinhar o que vem. Passo 1 feito, e agora você já sabe o que está deixando o seu jogo previsível. Bora sortear.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### O que o sorteio pode mudar?

**Por que aqui:** Duas comparações delimitadas respondem à mesma pergunta sobre sorteio: posição com velocidade fixa, depois velocidade com posição fixa.

**Foco:** Comparar resultados de um sorteio dentro da faixa, mantendo a outra propriedade fixa.

**Fala de ligação / orientação ao aluno:** “Primeiro compare os dois exemplos de posição, com a mesma velocidade. Depois compare os dois de velocidade, com a mesma posição. São exemplos escolhidos para enxergar a diferença; um sorteio real também pode repetir.”

**Experiência nativa:** random. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Posições diferentes, mesma velocidade; Velocidades −5 e −6, mesma posição.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Sorteie o lugar de nascimento

**Por que aqui:** Primeira aplicação muda um único campo e preserva o tempo de criação.

**Foco:** Conectar o sorteio exclusivamente à entrada x.

**Fala de ligação / orientação ao aluno:** “No x do bloco que cria cacto, conecte Sorteio entre 500 e 560. Os dois limites ficam depois da borda 480. O relógio continua em 1,4.”

**Fonte:** roteiro-aula-12-corre-dino.md → Parte 2. Passo 2: sortear o lugar do cacto.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Preservar o encaixe em x e a faixa externa. Explicar que muda o tempo de chegada até o Dino, mesmo com o mesmo relógio de nascimento.

**Na tela:** **Na tela:** Jogo 2D › Sorteios, arrastar "um número de a" por cima do x (560) do bloco de criar cacto; trocar os números para 500 e 560. Rodar e mostrar os intervalos variando.

**Trecho original selecionado, antes da edição:** Na categoria Jogo 2D, subcategoria Mira e contas, pega o bloco um número de tanto a tanto. Clica nele, segura e arrasta por cima do x do bloco de criar cacto, aquele 560. Igualzinho você fez com o valor da variável na Aula 11: o bloco novo toma o lugar do número, não tem buraquinho vazio. Ele tem dois campos, e vêm com 1 e 6, que é a faixa de um dadinho. Troca por 500 e 560. Agora cada cacto vai nascer num lugar sorteado entre 500 e 560. Todos continuam nascendo fora da tela, que é a nossa regra de sempre, mas uns nascem mais pertinho da beirada e outros mais longe. Clica na área do jogo e joga um pouco. Repara: agora tem cacto que chega rapidinho depois do outro, e tem cacto que demora mais. O espaço entre eles mudou, e aí já não dá mais pra jogar no automático: você tem que olhar de verdade. E repara numa coisa esperta: a gente nem mexeu no relógio. Ele continua batendo no mesmo compasso de antes, certinho. Mas como o cacto nasce mais longe ou mais perto, ele demora mais ou menos pra chegar no dino. Um numerozinho sorteado, e o ritmo inteiro do jogo mudou. Passo 2 feito, com o primeiro sorteio no lugar. O terceiro é o outro sorteio, na velocidade.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No x do cacto, conecte Sorteio entre 500 e 560.
- Preserve o relógio de 1,4 s com criação protegida por jogando.
- Use um único bloco para criar o cacto com posição e velocidade sorteadas.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Veja a conta da velocidade

**Por que aqui:** A dificuldade é o sinal da conta; uma régua fixa mantém a atenção nessa relação.

**Foco:** Ler -5 menos 0 e -5 menos 1 como velocidades para a esquerda.

**Fala de ligação / orientação ao aluno:** “Se sair zero, -5 menos zero continua -5. Se sair um, fica -6. Em direção à esquerda, -6 percorre mais distância por quadro.”

**Fonte:** roteiro-aula-12-corre-dino.md → Parte 3. Passo 3: sortear a velocidade.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Reaproveitar a explicação aritmética e acrescentar a régua. Evitar dizer que -6 é maior que -5.

**Na tela:** Duas contas alinhadas e duas setas à esquerda com origem igual. Não alterar o tamanho do cacto nem o intervalo. Distinguir valor numérico de rapidez.

**Trecho original selecionado, antes da edição:** Agora uma variadinha também na velocidade, e essa é mais sutil, mas faz diferença. O vx está em menos 5. A gente quer que ele seja menos 5 ou um pouquinho mais rápido, sorteado. Na categoria Programação, subcategoria Matemática, pega o bloco de conta, aquele com dois espaços e o sinal no meio. Esse é novo, você nunca usou. O nome já entrega: ele serve pra fazer conta. Clica, segura e arrasta ele por cima do vx. Esse bloco de conta tem três pedaços: o espaço da esquerda, o sinal do meio e o espaço da direita. O sinal vem no mais, e hoje a gente não quer o mais. Abre a listinha e escolhe o menos. No espaço da esquerda, que já vem com um número, escreve -5 por cima. E no espaço da direita, vai de novo em Jogo 2D, subcategoria Mira e contas, pega outro um número de tanto a tanto e arrasta por cima do que está lá. Nele, põe 0 e 1. Lê junto comigo: menos 5, menos um número sorteado entre 0 e 1. Se sortear 0, o cacto anda a menos 5. Se sortear 1, ele anda a menos 6, ou seja, um tiquinho mais rápido. Espera... menos um número deixa ele mais rápido? Parece esquisito, mas faz sentido: lembra da Aula 5, que velocidade negativa é pra esquerda, e quanto mais negativo, mais rápido? Então tirar 1 de menos 5 dá menos 6, que é mais rápido ainda. Isso engana a cabeça da gente, e por isso vale reparar. Clica na área do jogo e joga. Agora, além do espaço entre eles variar, uns cactos vêm um tiquinho mais rápidos que os outros. Você não consegue nem decorar o ritmo, nem decorar a velocidade. Passo 3 feito, com os dois sorteios prontos. O quarto é testar.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Conecte a conta ao cacto

**Por que aqui:** Montagem logo depois da visualização, sem outro parâmetro novo.

**Foco:** Combinar uma base fixa com uma variação limitada.

**Fala de ligação / orientação ao aluno:** “No VX do cacto, use a conta: -5 menos Sorteio entre 0 e 1. Confira que o sorteio da posição continua ligado ao x.”

**Fonte:** roteiro-aula-12-corre-dino.md → Parte 3. Passo 3: sortear a velocidade.

**Montagem:** Regravar a tela com a edição jogo-2d-1.0-documento-2; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. Manter A, operador − e B claramente visíveis. Retirar a conclusão que transforma todo sorteio em garantia de não repetição.

**Na tela:** **Na tela:** Programação › Matemática, arrastar o bloco de conta por cima do vx (-5); sinal −; esquerda -5; direita outro "um número de a" com 0 e 1. Rodar.

**Trecho original selecionado, antes da edição:** Agora uma variadinha também na velocidade, e essa é mais sutil, mas faz diferença. O vx está em menos 5. A gente quer que ele seja menos 5 ou um pouquinho mais rápido, sorteado. Na categoria Programação, subcategoria Matemática, pega o bloco de conta, aquele com dois espaços e o sinal no meio. Esse é novo, você nunca usou. O nome já entrega: ele serve pra fazer conta. Clica, segura e arrasta ele por cima do vx. Esse bloco de conta tem três pedaços: o espaço da esquerda, o sinal do meio e o espaço da direita. O sinal vem no mais, e hoje a gente não quer o mais. Abre a listinha e escolhe o menos. No espaço da esquerda, que já vem com um número, escreve -5 por cima. E no espaço da direita, vai de novo em Jogo 2D, subcategoria Mira e contas, pega outro um número de tanto a tanto e arrasta por cima do que está lá. Nele, põe 0 e 1. Lê junto comigo: menos 5, menos um número sorteado entre 0 e 1. Se sortear 0, o cacto anda a menos 5. Se sortear 1, ele anda a menos 6, ou seja, um tiquinho mais rápido. Espera... menos um número deixa ele mais rápido? Parece esquisito, mas faz sentido: lembra da Aula 5, que velocidade negativa é pra esquerda, e quanto mais negativo, mais rápido? Então tirar 1 de menos 5 dá menos 6, que é mais rápido ainda. Isso engana a cabeça da gente, e por isso vale reparar. Clica na área do jogo e joga. Agora, além do espaço entre eles variar, uns cactos vêm um tiquinho mais rápidos que os outros. Você não consegue nem decorar o ritmo, nem decorar a velocidade. Passo 3 feito, com os dois sorteios prontos. O quarto é testar.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- No x do cacto, conecte Sorteio entre 500 e 560.
- Na velocidade do cacto, use -5 menos Sorteio entre 0 e 1.
- Use um único bloco para criar o cacto com posição e velocidade sorteadas.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Observe alguns nascimentos. Todos começam fora da tela e andam à esquerda. Um resultado pode repetir. Confira os dois sorteios em tomadas diferentes, sem alterar o relógio.

**Critérios da entrega:**

- No x do cacto, conecte Sorteio entre 500 e 560.
- Na velocidade do cacto, use -5 menos Sorteio entre 0 e 1.
- Preserve o relógio de 1,4 s com criação protegida por jogando.
- Use um único bloco para criar o cacto com posição e velocidade sorteadas.

**Um sorteio pode produzir o mesmo resultado de novo?**

- Sim, repetir é possível. (correta)
- Não, sorteio nunca repete.

A faixa limita resultados; ela não exige que sejam sempre diferentes.

**Por que os limites de x ficam acima de 480?**

- Para o cacto começar fora da tela. (correta)
- Para ele virar um ponto no placar.

A borda direita do palco está em x 480.

**Quanto dá -5 menos 1?**

- -6, que anda mais rápido para a esquerda que -5. (correta)
- -4, que anda mais rápido para a direita.

Subtrair 1 torna a velocidade mais negativa.

## Orientação ao professor e à edição

- Parte 4: retirar o alargamento livre da faixa para 500–700. Fechar nos limites 500–560 e variação 0–1.
- As duas comparações do laboratório são exemplos didáticos controlados; não são prova estatística de aleatoriedade.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: 159e3a4a3abd173079edeb63dca925f8f0d5de398b73da0f7c579e3d871a0c75. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).

## Blocos e gravação no Estúdio atual

Edição: jogo-2d-1.0-documento-2.

Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.

No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.

Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.

| Bloco | Onde encontrar | O que faz |
| --- | --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto | Roda quando alguma coisa acontece. |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto | Repete enquanto o projeto estiver rodando. |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto | Roda ao abrir ou a cada nova partida. |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D › Movimento › Velocidade e gravidade | Soma a gravidade do mundo à velocidade vertical do sprite neste quadro. Sem definir outro valor, usa 0,6. Encaixe logo ANTES do bloco que movimenta o sprite. |
| Limpar a tela | Jogo 2D › Desenho e efeitos › Efeitos | Apaga tudo o que foi desenhado. Use no começo de cada quadro, antes de desenhar de novo. |
| Controlar o dinossauro , força do pulo | Jogo 2D › Kits prontos › Dino | Pula com ↑/Espaço ou toque na metade de cima da tela; abaixa com ↓ ou segurando o dedo embaixo. Já vem com chão e poeira. Para o dino cair, encaixe o "Aplicar a gravidade do mundo" logo acima. Use dentro do "a cada quadro". |
| Criar dinossauro em x y tamanho cor | Jogo 2D › Kits prontos › Dino | Cria um dinossauro desenhado (com perninhas que correm sozinhas). A pose muda quando ele pula ou abaixa. |
| Criar grupo de sprites | Jogo 2D › Grupos › Criar e percorrer | Cria um grupo vazio para guardar MUITOS sprites do mesmo tipo (tiros, inimigos, estrelas). |
| Desenhar o grupo | Jogo 2D › Grupos › Desenho e ordem | Desenha todos os sprites do grupo. Use a cada quadro, depois de mover. |
| Mostrar placar valor em x y cor tamanho | Jogo 2D › Vida e placar › Indicadores e texto na tela | Escreve "rótulo valor" (ex.: Pontos: 5) na tela. Ligue o valor à variável do placar. |
| Desenhar o sprite | Jogo 2D › Sprites › Criar e trocar aparência | Desenha o sprite na tela do jogo. Use a cada quadro, depois de "Limpar a tela". |
| A cada segundos | Jogo 2D › Tempo › Quadros e intervalos | Roda o “fazer” a cada N segundos. É uma raiz de “🔁 Enquanto estiver rodando”; não encaixe dentro de “A cada quadro”. A raiz roda em todas as telas: para criar algo só durante a partida, coloque “se a tela atual é jogando?” dentro do “fazer”. |
| Soltar explosão no sprite cor | Jogo 2D › Desenho e efeitos › Partículas | Solta um jato de partículas (da cor escolhida + estilhaços cinza) no centro do sprite. |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D › Cenários › Fundos | Desenha um céu com sol, nuvens, morros e uma faixa de grama que rola (parallax). Use no começo do "a cada quadro", depois de limpar a tela. O dino corre sobre a grama. |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro quando a criança aperta qualquer tecla ou toca na tela. É o "aperte qualquer coisa para começar" das telas de início. Segurar a tecla dispara uma vez só. |
| Quando o sprite pular | Jogo 2D › Controles › Teclado, ações e toque | Roda o que está dentro toda vez que o sprite pula de verdade (ex.: tocar um som, contar os pulos). Vale para os três jeitos de pular: estilo plataforma, pular no chão e o kit do dinossauro. |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D › Colisões › Encostar e bloquear | Para cada sprite do grupo que encostar no seu sprite (ex.: a nave), roda o "fazer" com aquele sprite. Use dentro do "a cada quadro". |
| Tocar efeito | Jogo 2D › Som › Efeitos prontos | Toca um efeito sonoro pronto (sintetizado, sem arquivo). Escolha um no menu. |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D › Grupos › Participação e limpeza | Remove do grupo os sprites que saíram da tela e roda o "fazer" para cada um (ex.: perder uma vida quando um asteroide escapa). Só tira quem já foi embora de verdade: o que nasce fora da tela e ainda está vindo continua no jogo. |
| um número de a | Jogo 2D › Sorteios › Números e posições | Sorteia um número inteiro entre os dois valores (incluindo as pontas). Limites com vírgula são ajustados para os inteiros internos; se o intervalo não tiver nenhum inteiro, usa o mais próximo do meio. |
| Reiniciar o jogo | Jogo 2D › Jogo e telas › Telas e partida | Use dentro de um evento, laço ou função. Limpa a partida e executa novamente as três áreas do projeto. |
| o estado do jogo é ? | Jogo 2D › Jogo e telas › Telas e partida | Verdadeiro se o jogo está naquela tela. Use dentro de um "se". |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D › Colisões › Área de contato | Muda o tamanho da área de colisão do sprite: menor que 100% = colisão mais justa para DANO; maior = mais fácil de PEGAR (moedas). Vale para as perguntas de encostar; "impedir de atravessar" continua usando o tamanho cheio. Veja a área real com "Mostrar a caixa de colisão". |
| Mudar o estado do jogo para | Jogo 2D › Jogo e telas › Telas e partida | Guarda o estado atual, como início, jogando ou vitória. Use a pergunta sobre o estado para escolher o que desenhar e mover. A mudança não pausa o motor nem desenha uma tela. |
| Descrever o jogo para leitor de tela | Jogo 2D › Jogo e telas › Telas e partida | Explica o objetivo e os controles para quem não vê o canvas. Coloque em “Ao iniciar”. |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D › Jogo e telas › Preparar a área do jogo | Atalho para começar: prepara a tela responsiva e centralizada. Use uma vez em “Ao iniciar”. |
| Tremer a tela com intensidade | Jogo 2D › Desenho e efeitos › Efeitos | Sacode a tela e para sozinho (o tremor vai diminuindo). Chame uma vez, ex.: numa colisão ou explosão. |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D › Jogo e telas › Telas e partida | Cobre a tela com um aviso central (título + subtítulo + dica). Ótimo para as telas de início, vitória e derrota. |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D › Kits prontos › Dino | Cria um obstáculo desenhado e coloca no grupo. Cacto e pedra nascem no chão (pule por cima); o pássaro vem no alto (abaixe por baixo). Ligue o x na borda direita e um vx negativo para ele vir vindo. |
| A cada quadro do jogo | Jogo 2D › Tempo › Quadros e intervalos | Repete o que está dentro a cada quadro (≈60 vezes por segundo), é o coração do jogo. |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D › Grupos › Movimento | Move cada sprite do grupo pela sua velocidade (vx/vy). Use a cada quadro. |
| Condição se, senão se e senão | Programação › ❓ Lógica & Se | Executa o "então" quando a condição for verdadeira. Use + para juntar "senão se" e "senão". |
| Criar variável com valor | Programação › 🏷️ Variáveis | Cria uma variável e guarda nela um valor: número, conta, aleatório, etc. |
| Somar em variável | Programação › 🏷️ Variáveis | Soma ou tira uma quantidade do valor atual de uma variável. |
| Conta matemática | Programação › 🔢 Matemática | Faz uma conta entre dois valores (somar, subtrair, multiplicar, dividir, resto, potência). |
| juntar texto | Programação › 🔣 Valores | Junta vários pedaços (texto fixo e valores) num só texto. Use + para adicionar pedaços. |
| Número | Programação › 🔣 Valores | Um valor numérico. |
| texto | Programação › 🔣 Valores | Um valor de texto. |
| valor da variável | Programação › 🔣 Valores | Usa o conteúdo de uma variável já criada como valor. |

Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.
