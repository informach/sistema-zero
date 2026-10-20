<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-dos-criadores/quiz/. Edite o código e rode `bun scripts/espelho-quiz-comunidade.ts` (em packages/funnel). -->

# Quiz da Comunidade Kids: entrada, ramos e perguntas

_Versão `comunidade-orientacao-v6`. As perguntas falam só da criança e da casa; nenhuma tela antes do resultado cita a Comunidade nem apresenta a criação de jogos como solução. O texto é escrito no masculino e vira "ela" quando a entrada é "Na minha filha"._

## Entrada

_Para mães, pais e responsáveis_

**Manchete padrão** (Padrão: ele vive no jogo):

# Seu filho vive no jogo. Em 3 minutos, veja como usar isso para ele aprender de verdade.

**Manchete com `?manchete=tela`** (Tela: a dor do tempo de tela):

# Seu filho passa horas na tela. Em 3 minutos, veja o que faria esse tempo render alguma coisa.

Responda sobre a rotina dele. O resultado aparece na hora, sem cadastro.

Uma orientação do Sistema Zero Kids. Dá para responder pelo celular.

## Ramos

- `9a17`: 9 a 17 anos
- `m9`: Menor de 9
- `adulto`: 18 ou mais

### Saída de 18 ou mais

**A partir de 18 anos, é a área adulta**

O Sistema Zero tem uma área para quem tem 18 anos ou mais, com conta própria. Quem responde é a própria pessoa, no quiz adulto.

[Abrir o quiz adulto]

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

### 9 a 17 anos. Num dia comum, quanto tempo ele passa em jogos e vídeos?

_Etapa: A rotina dele. Chave `tempo_tela`. No /admin: Tempo de tela._

Some celular, computador, tablet e videogame. Vale uma estimativa.

- `menos_1h`: Menos de 1 hora
- `1_2h`: De 1 a 2 horas
- `2_4h`: De 2 a 4 horas
- `mais_4h`: Mais de 4 horas

### 9 a 17 anos. Em casa, ele pode usar um computador?

_Etapa: A rotina dele. Chave `computador`. No /admin: Computador._

Pode ser o da família.

- `sim`: Sim, ele pode usar
- `organizar`: Temos, mas preciso organizar os horários
- `celular_tablet`: Por enquanto, só celular ou tablet
- `verificar`: Ainda preciso ver

### 9 a 17 anos. Qual destas frases parece mais com a sua casa?

_Etapa: A cena de casa. Chave `cena`. No /admin: Cena de casa._

- `A`: Ele vive no jogo e no vídeo, e não faz nada com isso
- `B`: Ele inventa jogo o tempo todo, mas fica só na conversa
- `C`: Ele desenha personagem o tempo todo, e fica no caderno
- `D`: Ele quer saber como os jogos são feitos, e eu não sei ensinar
- `F`: Na lição, ele copia o exemplo e trava quando a pergunta muda
- `nenhum`: Nenhuma dessas

### 9 a 17 anos. Quando alguma coisa não dá certo num jogo ou num aplicativo, o que ele faz primeiro?

_Etapa: A cena de casa. Chave `quando_trava`. No /admin: Quando trava._

- `larga`: Larga e vai fazer outra coisa
- `chama`: Chama alguém para resolver
- `tenta`: Tenta de outro jeito até dar certo
- `procura`: Procura um vídeo ou um exemplo
- `nao_reparou`: Ainda não reparei

### 9 a 17 anos. Quanto do tempo em jogos e vídeos vira alguma coisa que ele mesmo fez?

_Etapa: A cena de casa. Chave `tempo_criacao`. No /admin: Calculadora do tempo de tela._

Na tela, o título repete o tempo por dia: "Menos de 1 hora por dia dá até 365 horas"; "De 1 a 2 horas por dia dão entre 365 e 730 horas"; "De 2 a 4 horas por dia dão entre 730 e 1.460 horas"; "Mais de 4 horas por dia dão mais de 1.460 horas".

- `quase_nada`: Quase nada
- `um_pouco`: Um pouco
- `boa_parte`: Boa parte
- `nao_sei`: Não sei dizer

### 9 a 17 anos. Se nada mudar no próximo ano, o que mais preocupa?

_Etapa: A cena de casa. Chave `preocupacao`. No /admin: Preocupação._

- `A`: A tela continuar só para assistir e jogar
- `B`: A vontade de criar passar antes de ele fazer um jogo
- `C`: Os desenhos ficarem na gaveta
- `D`: A curiosidade dele passar em branco
- `F`: A dificuldade na escola virar desânimo
- `nenhum`: Nada, quero aproveitar o interesse dele

### 9 a 17 anos. Daqui a três meses, qual cena você gostaria de ver?

_Etapa: O que você quer. Chave `cena_desejada`. No /admin: Cena desejada._

- `A`: Ele me chamando: olha o que eu fiz
- `B`: Um amigo jogando um jogo que ele inventou
- `C`: O personagem que ele desenhou se mexendo na tela
- `D`: Ele me explicando como um jogo funciona por dentro
- `F`: Ele explicando uma conta com as palavras dele

### 9 a 17 anos. Para dar certo aí em casa, o que precisa estar garantido?

_Etapa: O que você quer. Chave `garantia`. No /admin: O que precisa estar garantido._

- `sozinho`: Ele conseguir sozinho, porque eu não entendo disso
- `recorrer`: Ter a quem recorrer quando travar
- `acompanhar`: Eu conseguir acompanhar
- `tempo_tela`: Caber no tempo de tela combinado
- `orcamento`: Caber no orçamento
- `ao_vivo`: Ter professor ao vivo

### 9 a 17 anos. Juntando tudo, o que você quer para ele?

_Etapa: O que você quer. Chave `sintese`. No /admin: Frase-síntese._

- `A`: Que o tempo de tela sirva para alguma coisa
- `B`: Que as ideias de jogo dele saiam do papel
- `C`: Que os desenhos dele ganhem vida
- `D`: Que ele aprenda a programar de verdade
- `F`: Que ele entenda o que estuda e use na prática
- `conhecer`: Ainda estou conhecendo

### 9 a 17 anos · extra (perfil B). Ele precisa criar jogos numa ferramenta específica?

_Etapa: O que você quer. Chave `ferramenta`. No /admin: Ferramenta (perfil B)._

- `roblox`: Precisa ser no Roblox
- `minecraft`: Precisa ser no Minecraft
- `outra`: Precisa ser em outra ferramenta específica
- `pode_outra`: Qualquer ferramenta serve, se ele gostar
- `conversar`: Ainda vou conversar com ele

### 9 a 17 anos · extra (perfil C). Para os desenhos dele, o que faz mais sentido?

_Etapa: O que você quer. Chave `desenho`. No /admin: Desenhos (perfil C)._

- `movimento`: Que os personagens façam coisas: andem, pulem, reajam
- `so_desenho`: Que ele desenhe melhor, com traço e técnica
- `nao_sei`: Ainda não sei

### 9 a 17 anos · extra (perfil F). Em que parte da escola ele mais trava?

_Etapa: O que você quer. Chave `escola`. No /admin: Escola (perfil F)._

- `leitura`: Entender o que o enunciado pede
- `matematica`: Entender as contas, e não só repetir o exemplo
- `problemas`: Começar e organizar uma tarefa de várias etapas
- `ciencias`: Entender por que as coisas acontecem, em ciências
- `vai_bem`: Ele vai bem; quero que use na prática o que aprende
- `reforco`: Ele precisa recuperar matéria atrasada da série

### Menor de 9. Ele já lê?

_Etapa: A rotina de vocês. Chave `m9_leitura`. No /admin: Leitura._

- `nao_le`: Ainda não
- `comecando`: Está começando
- `prefere`: Lê, mas prefere que eu leia
- `le_sozinho`: Lê sozinho

### Menor de 9. Vocês têm computador em casa?

_Etapa: A rotina de vocês. Chave `m9_computador`. No /admin: Computador._

- `sim`: Sim, podemos usar
- `organizar`: Sim, mas preciso organizar horário
- `celular_tablet`: Só celular ou tablet
- `verificar`: Ainda vou ver

### Menor de 9. Por semana, quanto tempo vocês conseguem sentar juntos no computador?

_Etapa: A rotina de vocês. Chave `m9_tempo_juntos`. No /admin: Tempo juntos._

Chute.

- `uma_vez`: Uns 20 minutos, uma vez
- `duas_tres`: Duas ou três vezes, de 20 a 30 minutos
- `mais`: Mais do que isso
- `nao_sei`: Ainda não sei

### Menor de 9. Qual destas frases parece mais com ele?

_Etapa: A cena de casa. Chave `m9_cena`. No /admin: Frase que parece com ele._

- `A`: Só fica no joguinho pronto do tablet
- `B`: Inventa brincadeira e personagem o tempo todo
- `D`: Quer saber como tudo funciona e apertar tudo
- `irmao`: Quer fazer o que o irmão mais velho faz
- `nenhum`: Nenhuma dessas

### Menor de 9. Se nada mudar, o que mais preocupa?

_Etapa: A cena de casa. Chave `m9_preocupacao`. No /admin: Preocupação._

- `A`: A tela continuar só para assistir e jogar
- `B`: As ideias dele ficarem só na brincadeira
- `D`: A curiosidade dele passar em branco
- `nenhum`: Nada, quero aproveitar a fase

### Menor de 9. Daqui a três meses, qual cena você gostaria de ver?

_Etapa: O que você quer. Chave `m9_cena_desejada`. No /admin: Cena desejada._

- `A`: Ele me chamando para ver o que a gente fez
- `B`: O personagem dele aparecendo na tela
- `D`: Ele me explicando o que cada botão faz
- `A2`: Os avós jogando um jogo nosso

### Menor de 9. Para dar certo aí em casa, o que precisa estar garantido?

_Etapa: O que você quer. Chave `m9_garantia`. No /admin: O que precisa estar garantido._

- `conduzir`: Eu conseguir conduzir sem saber programar
- `curto`: Caber em sessões curtas
- `seguro`: Ser um lugar seguro
- `orcamento`: Caber no orçamento
- `sozinho`: Ele conseguir sozinho, não tenho tempo
- `ao_vivo`: Ter professor ao vivo

### Menor de 9. Juntando tudo, o que você quer?

_Etapa: O que você quer. Chave `m9_sintese`. No /admin: Frase-síntese._

- `A`: Um tempo de tela nosso, com alguma coisa feita no fim
- `B`: As ideias dele virando um jogo
- `D`: Ele entender, brincando, como as coisas funcionam
- `conhecer`: Ainda estou conhecendo

## Regra do perfil

Nos dois ramos, a cena de casa e a frase-síntese valem 3; a preocupação e a cena desejada valem 2. Com 4 pontos ou mais, o diagnóstico é claro; abaixo, a carta avisa que as respostas apontaram para mais de um lado. No menor de 9, a cena dos avós soma para o tempo a dois, e o irmão mais velho não soma.
