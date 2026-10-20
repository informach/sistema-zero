<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-dos-criadores/quiz/. Edite o código e rode `bun scripts/espelho-quiz-comunidade.ts` (em packages/funnel). -->

# Quiz da Comunidade: entrada e perguntas

_Versão `comunidade-orientacao-v5`. Tráfego frio em SPIN: as perguntas falam só da criança e da casa; nenhuma tela antes do resultado cita a Comunidade nem apresenta a criação de jogos como solução. O texto é escrito no masculino e vira "ela" quando a primeira resposta é "Filha"._

## Entrada

_Para famílias com crianças de 9 a 14 anos_

**Manchete padrão** (Padrão: o que ele já gosta de fazer):

# Em três minutos, veja como usar o que seu filho já gosta de fazer para ele aprender mais

**Manchete com `?manchete=tela`** (Tela: a dor do tempo de tela):

# Seu filho passa horas na tela. Em três minutos, veja o que faria esse tempo ajudar no aprendizado dele.

Pode ser o que ele já gosta de fazer, como jogos, vídeos, desenhos ou perguntas sobre como as coisas funcionam, ou o que preocupa você, como a lição de casa. Você responde sobre a rotina dele e, no fim, vê as suas respostas organizadas, por que aquilo acontece e por onde começar. O resultado aparece aqui mesmo, logo depois da última resposta.

### O que o quiz olha

- O tempo de tela
- As ideias que ele inventa
- Os desenhos
- A curiosidade sobre como as coisas funcionam
- A lição de casa

Uma orientação do Sistema Zero Kids para mães, pais e responsáveis. Você pode responder pelo celular.

## Perguntas

### P1. Em quem você está pensando?

_Etapa: A rotina (situação). Chave `crianca`. No /admin: Criança e idade. Fica na própria tela de entrada._

Responda pensando em uma criança de cada vez.

- `filho_9_11`: Filho de 9 a 11 anos
- `filha_9_11`: Filha de 9 a 11 anos
- `filho_12_14`: Filho de 12 a 14 anos
- `filha_12_14`: Filha de 12 a 14 anos
- `menos_9`: Menos de 9 anos
- `15_mais`: 15 anos ou mais

### P2. Num dia comum, quanto tempo ele passa em jogos e vídeos?

_Etapa: A rotina (situação). Chave `tempo_tela`. No /admin: Tempo de tela._

Some celular, computador, tablet e videogame. Vale uma estimativa.

- `menos_1h`: Menos de 1 hora
- `1_2h`: De 1 a 2 horas
- `2_4h`: De 2 a 4 horas
- `mais_4h`: Mais de 4 horas

### P3. Em casa, ele pode usar um computador?

_Etapa: A rotina (situação). Chave `computador`. No /admin: Computador._

Pode ser o da família.

- `sim`: Sim, ele pode usar
- `organizar`: Temos, mas preciso organizar os horários
- `celular_tablet`: Por enquanto, só celular ou tablet
- `verificar`: Ainda preciso ver

### P4. Qual destas cenas mais acontece aí em casa?

_Etapa: O que acontece em casa (problema e implicação). Chave `cena`. No /admin: Cena de casa._

- `A`: Ele passa horas em jogos e vídeos, e no fim do dia não sobra nada que ele tenha feito
- `B`: Ele inventa jogos e regras o tempo todo, mas as ideias ficam na conversa ou no papel
- `C`: Ele desenha personagens o tempo todo, e os desenhos ficam guardados no caderno
- `D`: Ele quer saber como os jogos e os programas funcionam, e eu não sei por onde começar a ensinar
- `F`: Na lição, ele repete o exemplo, mas trava quando a pergunta muda
- `nenhum`: Nenhuma dessas parece com a nossa casa

### P5. Quando alguma coisa não dá certo num jogo ou num aplicativo, o que ele faz primeiro?

_Etapa: O que acontece em casa (problema e implicação). Chave `quando_trava`. No /admin: Quando trava._

- `larga`: Larga e vai fazer outra coisa
- `chama`: Chama alguém para resolver
- `tenta`: Tenta de outro jeito até dar certo
- `procura`: Procura um vídeo ou um exemplo
- `nao_reparou`: Ainda não reparei

### P6. Quanto do tempo em jogos e vídeos vira alguma coisa que ele mesmo fez?

_Etapa: O que acontece em casa (problema e implicação). Chave `tempo_criacao`. No /admin: Calculadora do tempo de tela._

Na tela, o título vem montado com o tempo de tela:

- `menos_1h`: Isso dá até 365 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?
- `1_2h`: Isso dá entre 365 e 730 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?
- `2_4h`: Isso dá entre 730 e 1.460 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?
- `mais_4h`: Isso dá mais de 1.460 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?

- `quase_nada`: Quase nada
- `um_pouco`: Um pouco
- `boa_parte`: Boa parte
- `nao_sei`: Não sei dizer

### P7. Se nada mudar no próximo ano, o que mais preocupa você?

_Etapa: O que acontece em casa (problema e implicação). Chave `preocupacao`. No /admin: Preocupação._

- `A`: Que a tela continue sendo só para assistir e jogar
- `B`: Que a vontade de criar jogos passe antes de ele fazer o primeiro
- `C`: Que os desenhos continuem guardados na gaveta
- `D`: Que a curiosidade dele sobre os programas passe antes de ele entender como funcionam
- `F`: Que a dificuldade na escola vire desânimo com os estudos
- `nenhum`: Nada me preocupa; quero aproveitar o interesse dele

### P8. Imagine que, daqui a três meses, alguma coisa mudou aí em casa. Qual cena você gostaria de ver primeiro?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `cena_desejada`. No /admin: Cena desejada._

- `A`: Ele me chamando para ver uma coisa que ele mesmo fez no computador
- `B`: Um amigo jogando um jogo que ele inventou
- `C`: O personagem que ele desenhou se mexendo na tela
- `D`: Ele me explicando como um programa funciona por dentro
- `F`: Ele explicando uma conta com as próprias palavras

### P9. Para uma atividade nova dar certo aí em casa, o que precisa estar garantido?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `garantia`. No /admin: O que precisa estar garantido._

- `sozinho`: Que ele consiga aprender sozinho, porque eu não entendo do assunto
- `recorrer`: Que ele tenha a quem recorrer quando travar
- `acompanhar`: Que eu consiga acompanhar o que ele aprende
- `tempo_tela`: Que caiba no tempo de tela que já combinamos
- `orcamento`: Que o valor caiba no orçamento da família
- `ao_vivo`: Que tenha um professor ao vivo acompanhando

### P10. Juntando tudo o que você respondeu, qual destas frases mais parece com o que você quer para ele?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `sintese`. No /admin: Frase-síntese._

- `A`: Que o tempo de tela deixe alguma coisa feita por ele
- `B`: Que as ideias de jogo dele saiam do papel
- `C`: Que os personagens que ele desenha ganhem movimento e história
- `D`: Que ele entenda como os programas funcionam e aprenda a programar
- `F`: Que ele entenda o que estuda e use isso na prática
- `conhecer`: Ainda quero conhecer as possibilidades

### Extra (perfil B). Ele precisa criar jogos numa ferramenta específica?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `ferramenta`. No /admin: Ferramenta (perfil B)._

- `roblox`: Precisa ser no Roblox
- `minecraft`: Precisa ser no Minecraft
- `outra`: Precisa ser em outra ferramenta específica
- `pode_outra`: Qualquer ferramenta serve, se ele gostar
- `conversar`: Ainda vou conversar com ele

### Extra (perfil C). Para os desenhos dele, o que faz mais sentido?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `desenho`. No /admin: Desenhos (perfil C)._

- `movimento`: Que os personagens façam coisas: andem, pulem, reajam
- `so_desenho`: Que ele desenhe melhor, com traço e técnica
- `nao_sei`: Ainda não sei

### Extra (perfil F). Em que parte da escola ele mais trava?

_Etapa: O que você quer ver (necessidade e diagnóstico final). Chave `escola`. No /admin: Escola (perfil F)._

- `leitura`: Entender o que o enunciado pede
- `matematica`: Entender as contas, e não só repetir o exemplo
- `problemas`: Começar e organizar uma tarefa de várias etapas
- `ciencias`: Entender por que as coisas acontecem, em ciências
- `vai_bem`: Ele vai bem; quero que use na prática o que aprende
- `reforco`: Ele precisa recuperar matéria atrasada da série

## Como o perfil é definido

| Pergunta | Pontos |
| --- | --- |
| Cena de casa (`cena`) | 3 |
| Preocupação (`preocupacao`) | 2 |
| Cena desejada (`cena_desejada`) | 2 |
| Frase-síntese (`sintese`) | 3 |

O perfil é o que soma mais pontos. Empate: vence a frase-síntese, depois a cena de casa. O segundo perfil (2 pontos ou mais) ganha uma frase no resultado; empate no segundo lugar: a preocupação, depois a cena desejada. A cena desejada não tem opção neutra, então sempre sai um perfil.

Com menos de 4 pontos no perfil vencedor, o resultado abre com "Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu."

| Perfil | Página de oferta | Pergunta extra |
| --- | --- | --- |
| A. Tempo de tela | `tempo-de-tela` | n/a |
| B. Criação de jogos | `criacao-de-jogos` | ferramenta |
| C. Desenho e personagens | `expressao-visual` | desenho |
| D. Programação | `formacao-tecnologica` | n/a |
| F. Habilidades escolares | `habilidades-escolares` | escola |
