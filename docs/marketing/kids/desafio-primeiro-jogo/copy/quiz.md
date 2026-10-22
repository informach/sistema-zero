<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/desafio-primeiro-jogo/quiz/ e desafio-adulto/quiz/. Edite o código e rode `bun scripts/espelho-quiz-desafio.ts` (em packages/funnel). -->

# Quiz Kids do Desafio: entrada, ramos e perguntas

_Versão `desafio-farol-v5`. Nenhuma tela antes do resultado cita o Desafio, A Chave do Farol, curso, aula, plataforma, preço ou prazo. O texto é escrito no masculino e vira "ela" quando a entrada é "Na minha filha"._

## Entrada

_Para mães, pais e responsáveis_

**Manchete padrão** (Padrão: ele vive no jogo):

# Seu filho vive no jogo. Em 2 minutos, veja como esse tempo pode virar algo que ele faz.

**Manchete com `?manchete=tela`** (Tela: a dor do tempo de tela):

# Seu filho passa horas na tela. Em 2 minutos, veja o que faria esse tempo render alguma coisa.

Responda sobre a rotina dele. O resultado aparece na hora, sem cadastro.

Uma orientação do Sistema Zero Kids. Dá para responder pelo celular.

## Ramos

- `9a17`: De 9 a 17
- `m9`: Menor de 9
- `adulto`: 18 ou mais

### Saída de 18 ou mais

**A partir de 18 anos, a pessoa responde por si**

Quem tem 18 anos ou mais faz o próprio caminho, com conta própria. O quiz para adultos tem as perguntas certas para isso.

[Abrir o quiz para adultos] (quiz adulto do Desafio) · Corrigir a idade

## Perguntas

### Entrada. Em quem você está pensando?

_Etapa: Entrada. Chave `genero`. No /admin: Filho ou filha._

Uma criança de cada vez.

- `filho`: No meu filho
- `filha`: Na minha filha

### Entrada. Quantos anos ele tem?

_Etapa: Entrada. Chave `idade`. No /admin: Idade._

- `menos_9`: Menos de 9
- `9_12`: De 9 a 12
- `13_17`: De 13 a 17
- `18_mais`: Ele tem 18 anos ou mais

### De 9 a 17. Num dia normal, quanto tempo ele passa em jogos e vídeos?

_Etapa: A rotina dele. Chave `tempo_tela`. No /admin: Tempo em jogos e vídeos._

Celular, videogame e computador, tudo junto. Pode chutar.

- `menos_1`: Menos de 1 hora
- `1_2`: De 1 a 2 horas
- `2_4`: De 2 a 4 horas
- `mais_4`: Mais de 4 horas

### De 9 a 17. Ele tem um computador com mouse e teclado para usar?

_Etapa: A rotina dele. Chave `computador`. No /admin: Computador._

- `so_dele`: Tem, só dele
- `dividido`: Tem, mas é dividido em casa
- `celular_tablet`: Só celular ou tablet
- `verificar`: Ainda vou ver

### De 9 a 17. Qual destas frases parece mais com a sua casa?

_Etapa: A cena de casa. Chave `cena`. No /admin: Cena de casa._

- `A`: Ele vive no jogo e no vídeo, e não faz nada com isso
- `B`: Ele inventa jogo o tempo todo, mas fica só na conversa
- `C`: Ele desenha personagem o tempo todo, e fica no papel
- `D`: Ele quer saber como os jogos são feitos, e eu não sei explicar
- `nenhum`: Nenhuma dessas

### De 9 a 17. Quando ele tenta uma coisa nova no computador e não dá certo, o que costuma acontecer?

_Etapa: A cena de casa. Chave `trava`. No /admin: Quando não dá certo._

- `desiste`: Ele desiste e volta para o jogo
- `chama`: Ele me chama, e eu não sei ajudar
- `copia`: Ele procura um vídeo e copia sem entender
- `insiste`: Ele tenta de outro jeito até dar certo
- `nao_vi`: Ainda não vi isso acontecer

### De 9 a 17. Daqui a um mês, qual cena você gostaria de ver?

_Etapa: O que você quer. Chave `cena_desejada`. No /admin: Cena desejada._

- `A`: Ele me chamando: olha o que eu fiz
- `B`: Um amigo jogando um jogo que ele fez
- `C`: Ele escolhendo o personagem e o cenário do próprio jogo
- `D`: Ele me explicando como o jogo funciona por dentro

### De 9 a 17. Para dar certo aí em casa, o que precisa estar garantido?

_Etapa: O que você quer. Chave `garantia`. No /admin: O que precisa estar garantido._

- `sozinho`: Ele conseguir fazer sozinho
- `ajuda`: Ter ajuda quando ele travar
- `acompanhar`: Eu conseguir acompanhar de longe
- `tempo_tela`: Caber no tempo de tela que a gente combinou
- `orcamento`: Caber no orçamento
- `ao_vivo`: Ter professor ao vivo

### De 9 a 17. Juntando tudo, o que você quer para ele?

_Etapa: O que você quer. Chave `sintese`. No /admin: Frase-síntese._

- `A`: Que o tempo de tela sirva para alguma coisa
- `B`: Que as ideias de jogo dele saiam do papel
- `C`: Que os personagens dele ganhem vida na tela
- `D`: Que ele entenda como a tecnologia funciona por dentro
- `conhecer`: Ainda estou conhecendo

### Menor de 9. Ele já lê?

_Etapa: A rotina de vocês. Chave `m9_leitura`. No /admin: Leitura._

- `nao`: Ainda não
- `comecando`: Está começando
- `prefere`: Lê, mas prefere que eu leia
- `sozinho`: Lê sozinho

### Menor de 9. Vocês têm computador com mouse e teclado em casa?

_Etapa: A rotina de vocês. Chave `m9_computador`. No /admin: Computador._

- `sim`: Sim, podemos usar
- `organizar`: Sim, mas preciso organizar um horário
- `celular_tablet`: Só celular ou tablet
- `verificar`: Ainda vou ver

### Menor de 9. Numa semana normal, quantas vezes vocês conseguem sentar juntos no computador?

_Etapa: A rotina de vocês. Chave `m9_tempo_juntos`. No /admin: Tempo juntos._

Pode chutar.

- `uma`: Uma vez, um pouquinho
- `duas_tres`: Duas ou três vezes
- `mais`: Mais do que isso
- `nao_sei`: Ainda não sei

### Menor de 9. Qual destas frases parece mais com ele?

_Etapa: A cena de casa. Chave `m9_cena`. No /admin: Cena de casa._

- `A`: Só fica no joguinho pronto do tablet
- `B`: Inventa brincadeira e personagem o tempo todo
- `D`: Quer saber como tudo funciona e apertar tudo
- `irmao`: Quer fazer o que o irmão mais velho faz
- `nenhum`: Nenhuma dessas

### Menor de 9. Daqui a um mês, qual cena você gostaria de ver?

_Etapa: O que você quer. Chave `m9_cena_desejada`. No /admin: Cena desejada._

- `A`: Ele me chamando para ver o que a gente fez
- `B`: O personagem que ele escolheu andando na tela
- `D`: Ele me explicando o que cada bloco faz
- `A2`: Os avós jogando um jogo nosso

### Menor de 9. Na hora de sentar junto, o que precisa estar garantido?

_Etapa: O que você quer. Chave `m9_garantia`. No /admin: O que precisa estar garantido._

- `nao_programar`: Eu não precisar saber programar
- `curtas`: Sessões curtas, que caibam no dia
- `ele_escolhe`: Ele escolher, e eu só ajudar
- `orcamento`: Caber no orçamento
- `ao_vivo`: Ter professor ao vivo

### Menor de 9. Juntando tudo, o que você quer para ele?

_Etapa: O que você quer. Chave `m9_sintese`. No /admin: Frase-síntese._

- `A`: Um tempo de tela que seja de nós dois
- `B`: Ver as ideias dele virando jogo
- `D`: Que ele entenda como as coisas funcionam
- `conhecer`: Ainda estou conhecendo

## Regra do perfil

Nos dois ramos, a cena de casa e a frase-síntese valem 3; a cena desejada vale 2. O empate vai para a síntese, depois para a cena. Com 4 pontos ou mais, o diagnóstico é claro; abaixo, a carta avisa que as respostas apontaram para mais de um lado. No menor de 9, a cena dos avós soma para o tempo a dois, e o irmão mais velho não soma.
