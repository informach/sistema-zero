# Revisão didática das 27 aulas

> **Aplicação em 20/09/2026:** a introdução do Desafio põe o jogo de treino logo após a abertura;
> o Dia 5 oferece pausa e retomada; as 25 seções de ferramenta externa com conclusão por vídeo têm
> autoconferência visual; os 53 usos de cena e os critérios entre aulas foram auditados. Uma
> pergunta duplicada no Dia 3 virou aplicação da ideia ao jogo. A fala de salvamento foi corrigida
> nos 17 briefings de fechamento do Estúdio embutido e nos cinco roteiros escritos do Desafio. Os
> detalhes estão em `AUDITORIA-CENAS-E-CONTINUIDADE-2026-09-20.md`; o ensaio que decidirá o final
> da Aula 1 do Dino está preparado em `GUIA-ENSAIO-CRIANCAS-2026-09-20.md`. A revisão abaixo fica
> como registro do diagnóstico que motivou essas mudanças.

## Parecer

**Eu seguiria com o redesenho, com ajustes antes da gravação.** Ele organiza melhor a aprendizagem
do que os pacotes v6: parte de uma mudança visível no jogo, explica conceitos abstratos com cenas
que a criança manipula e mostra cada gesto real do Estúdio ou do Pinta. Também elimina seções que
existiam só para um encaixe ou uma pergunta sobre um botão recém-visto. A direção é boa para quem
está começando. Ainda falta conferir se o ritmo serve à faixa inteira de 8 a 15 anos.

A revisão comparou os 27 manifestos v6 de `sistema-zero/Docs/aulas-interativas` com os 27
manifestos novos, os resumos e percursos das propostas, o briefing, os roteiros já escritos do
Desafio e as pendências registradas em `ACHADOS-TRANSVERSAIS.md`. A conferência de formato dos
manifestos não equivale a observar uma aula com alunos.

| Curso | Seções v6 | Seções novas | Clipes v6 | Clipes novos | Experiências novas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desafio do Primeiro Jogo | 78 | 56 | 61 | 46 | 17 |
| Corre Dino | 127 | 91 | 86 | 72 | 22 |
| O Jogo do Meu Jeito | 76 | 56 | 55 | 48 | 14 |
| **Total** | **281** | **203** | **202** | **166** | **53** |

As contagens vêm dos `manifesto.json` em disco, em 20/09/2026. A tabela anterior do `README.md`
trazia 202 seções, 165 clipes e 55 experiências, números que não batiam com os arquivos atuais.

## O que manter

1. **Explicar e deixar ver a consequência.** As cenas de coordenadas, gravidade, camadas, área de
   colisão e sorteio tornam concretas relações difíceis de enxergar nos blocos. A criança manipula
   um fator, compara o resultado e depois usa a ideia no próprio jogo. Isso está alinhado com a
   recomendação de [integrar representações concretas e abstratas](https://ies.ed.gov/ncee/wwc/PracticeGuide/1).
2. **Guiar o uso da ferramenta.** Um iniciante precisa ver onde está o bloco, onde encaixá-lo e
   como testar. A proposta evita transformar a interface em caça ao tesouro. O apoio durante a
   investigação também tem respaldo em uma
   [metanálise sobre aprendizagem por investigação](https://journals.sagepub.com/doi/abs/10.3102/0034654315627366).
3. **Usar problemas reais do projeto.** O Dino que some atrás da floresta, o contador de cactos que
   só sobe e o jogo que começa antes do jogador são motivos compreensíveis para aprender uma peça.
   A regra de conferir se o problema reproduz no jogo é especialmente acertada.
4. **Preservar escolhas de autoria.** Cor, desenho, força do pulo e dificuldade são decisões da
   criança. Uma conferência automática deve aceitar essas escolhas quando a aula as oferece.

## Ajustes que eu faria

### 1. Tratar a conferência como parte da didática

Um acerto na montagem precisa receber retorno logo após o passo, e uma escolha autorizada não pode
virar erro na aula seguinte. O redesenho corrigiu as seções de construção vazias e as cenas
opcionais das primeiras aulas do Dino. A revisão encontrou uma exceção remanescente: na Aula 7, as
conferências `proteger-controle` da montagem e da entrega exigiam `JUMP: 14`, apesar de a Aula 3
permitir 12 a 18. **As duas exigências foram retiradas**; a conferência continua verificando o
sprite e o lugar do bloco. Antes da gravação, vale percorrer a continuidade das 27 aulas com um
projeto que usa escolhas diferentes das mostradas pelo professor.

Também alinhei exemplos de fala que mandavam olhar o jogo "ali do lado" ou "aí embaixo". A posição
da ferramenta muda conforme a tela; "olha a área do jogo" funciona nas duas apresentações. Os
roteiros ainda não escritos devem seguir essa forma.

### 2. Colocar a primeira ação mais cedo na introdução

Na introdução do Desafio, a criança assiste à abertura e a dois clipes de navegação antes de tocar
no jogo de treino. Eu testaria esta ordem: abertura curta, primeira ação no jogo de treino, depois
o caminho para reencontrar a aula e as orientações de salvamento. Isso faz a navegação responder a
uma necessidade que ela já viveu. Se a ordem atual for mantida, os dois clipes de navegação devem
ser muito curtos e o primeiro gesto deve acontecer sem espera longa.

### 3. Dar um ponto de parada no Dia 5 do Desafio

O Dia 5 concentra dez seções, dois experimentos e vinte verificações de estrutura na entrega. O
roteiro já reconhece que é a aula mais longa. Eu colocaria um convite explícito a parar e retomar
depois de proteger o motor e o relógio, antes de montar as telas. A gravação precisa mostrar a
retomada com o projeto salvo. A divisão é de sessão de estudo, sem criar um sexto dia.

### 4. Ser preciso sobre o progresso em O Jogo do Meu Jeito

Das 33 seções que abrem Pinta ou Estúdio fora da aula, 25 concluem apenas quando o vídeo é assistido.
Isso mede acompanhamento do exemplo, não a arte feita na outra aba. A entrega pela galeria confere
que algum trabalho foi enviado, mas não confirma cada passo intermediário. Os clipes dessas seções
precisam terminar com uma conferência visual curta: o que deve aparecer na arte ou no jogo antes de
voltar à aula. Na interface, a conclusão da seção deve ser entendida como "vi o exemplo"; não se
deve dizer à criança que o desenho foi verificado quando a plataforma não o verificou.

### 5. Evitar que a cena vire uma lista de cliques

Todas as 53 experiências novas são obrigatórias. A proposta diz, com razão, que a cena faz parte
da explicação e não é uma prova. Quando uma cena cobra muitas metas mais uma pergunta final, há o
risco de a criança procurar os cliques que liberam a próxima seção sem entender a relação. Em cada
cena, manter só as comparações essenciais, oferecer pistas progressivas e usar a pergunta final
para explicar a mudança vista. Uma boa verificação em piloto é pedir, depois da cena, que o aluno
conte com as próprias palavras o que mudou e aplique essa ideia no projeto. A recomendação de
[perguntas explicativas e retomadas](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) apoia essa
distinção entre concluir uma atividade e compreender uma ideia.

### 6. Conferir a vitória da primeira aula do Dino

A Aula 1 termina com a tela, a borda e a cor escolhida, mas o Dino criado continua invisível até a
Aula 2. A surpresa tem uma justificativa conceitual boa. Mesmo assim, para o primeiro dia de um
curso de jogo, eu observaria se as crianças percebem a tela como conquista suficiente ou saem com
a impressão de que não fizeram um jogo. Se isso aparecer no piloto, encurtar a distância até o Dino
visível, mantendo a distinção entre criar e desenhar.

## Caminho recomendado para finalizar

1. Fazer uma auditoria de continuidade com valores escolhidos pela criança, começando por Corre
   Dino 3 a 13 e pelo projeto que passa do Desafio para Meu Jeito.
2. Ensaiar três percursos com alunos de idades e familiaridades diferentes: introdução e Dia 1 do
   Desafio, Corre Dino 1 a 3, e Meu Jeito 1 a 2. Observar tempo até a primeira ação, dúvidas sem
   ajuda, momentos de retorno ao vídeo e o que conseguem explicar após cada cena.
3. Ajustar a ordem e a duração onde o ensaio mostrar dificuldade; então fechar os roteiros de
   gravação que faltam: 72 clipes de Corre Dino e 48 de Meu Jeito.
4. Conferir cada trio proposta, manifesto e roteiro, depois percorrer as aulas em staging com
   projetos reais. O validador atual verifica formato e convenções; não prova o funcionamento de
   cada jogo, o ritmo da aula nem a compreensão de quem a faz.

**Decisão recomendada:** manter o redesenho como base. Corrigir as verificações e validar o ritmo
com alunos antes de considerar os 27 manifestos prontos para produção de vídeo e publicação.
