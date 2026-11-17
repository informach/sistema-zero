# Roteiro de produção · transformando-o-vilao-em-aliado-aula-3

A Helena grava em câmera, em tom de conversa com pais e responsáveis. A fala abaixo é integral e pronta para teleprompter, sem tags de ElevenLabs. As imagens e os depoimentos entram em edição nos trechos indicados; o responsável assiste à demonstração, sem precisar executá-la. Identificar todo depoimento por nome e vínculo. Os cortes são opcionais e o roteiro precisa funcionar sem eles.

## Parte 1. Uma ideia pode virar um jogo

**Clipe:** `video-a3-rotina`

**Na tela:** No "Criar um jogo reúne várias dessas ações", apresentar um jogo e sua regra [na edição: jardim do Cadê Todo Mundo e blocos]. No "Existe um ciclo nesse trabalho", mostrar as seis ações [na edição: imaginar, planejar, criar, testar, melhorar e compartilhar]. No "Na próxima parte", mostrar o jardim que será usado na demonstração [na edição: projeto preparado].

**Depoimento opcional (não gravar):** Um corte curto de Rafael sobre criar o próprio jogo ou de Fernando explicando sua regra pode entrar depois de "Quem cria precisa transformar essas intenções em regras." Escolher um deles, com nome e vínculo, sem interromper a demonstração seguinte.

**Fala da Helena:**

```text
Criar um jogo reúne várias dessas ações numa experiência que pode ter muito significado para a criança. Ela imagina uma situação e precisa pensar no que o jogador vai fazer, quais regras vão existir e como conferir se funcionaram.

O jogo pode começar com um jardim e animais escondidos. O objetivo é encontrar os animais. Mas o que acontece quando o jogador toca num esconderijo? Como ele sabe quantos já encontrou? Quem cria precisa transformar essas intenções em regras.

Para começar, não é preciso escrever linhas de código. É possível montar regras com blocos visuais. Eles ajudam a expressar um pensamento: quando acontecer isto, faça aquilo.

Essa lógica também é conhecida fora do computador. Antes de sair, eu preciso pegar o que vou levar. Se a porta estiver trancada, preciso da chave. Eu organizo ações e considero condições para chegar a um resultado. No jogo, vou expressar essas relações de um jeito que o computador consiga executar.

Por exemplo: quando o personagem tocar na porta, se estiver com a chave, ele pode entrar. Uma intenção virou uma regra com uma condição. Na demonstração, vamos começar com uma regra ainda mais simples: tocar num esconderijo para revelar o que está atrás.

Existe um ciclo nesse trabalho. Imaginar o que quero fazer. Planejar como as partes se relacionam. Criar as regras. Testar o que acontece. Melhorar o que ainda não corresponde à ideia. E compartilhar, para outra pessoa conhecer e experimentar.

Essas etapas se misturam e podem se repetir. Um teste pode mostrar que preciso rever o plano. A pessoa que joga pode descobrir uma dificuldade que eu ainda não tinha percebido.

Na próxima parte, você vai acompanhar uma demonstração pequena. Eu vou mostrar uma regra sendo construída e o que muda quando a gente testa. Não é preciso abrir a ferramenta ou fazer junto. O objetivo é enxergar o raciocínio de quem está criando. Clique em Próxima parte.
```

## Parte 2. Uma regra, um teste e um resultado

**Clipe:** `video-a3-caminho`

**Na tela:** No "Aqui já temos um jardim", mostrar o projeto preparado [na edição: jardim com animais, esconderijos e Achados em zero]. No "Eu clico neste esconderijo", clicar uma vez no esconderijo ainda sem regra [na edição: clique sem efeito]. No "Eu acrescento uma regra", mostrar o evento e a ação de visibilidade [na edição: Quando clicar/tocar num sprite do grupo esconderijos chamá-lo de escolhido; Deixar o sprite escolhido com 0 % de visibilidade]. No "Agora eu testo", clicar e mostrar o animal [na edição: esconderijo invisível, Achados ainda em zero]. No "Eu acrescento a ação de somar um", mostrar a nova ação no mesmo evento [na edição: Somar 1 em variável achados]. No "Recomeço o jogo para testar", reiniciar e clicar uma vez em cada esconderijo [na edição: achados em zero, depois um e dois, sem repetir clique no mesmo esconderijo]. No "Eu decidi o que queria que acontecesse", manter o resultado à vista [na edição: regra e jogo lado a lado].

**Preparação da captura (não gravar):** Usar uma versão reduzida do jardim do Cadê Todo Mundo, com dois animais sob dois esconderijos separados. Ao iniciar, criar os sprites, deixar os esconderijos à frente, inserir somente os esconderijos no grupo esconderijos, iniciar a variável achados em zero e manter o placar ligado a essa variável durante a execução. Essas partes já vêm preparadas e não são alteradas durante a explicação. Registrar três estados do mesmo projeto: sem evento de clique; evento que torna o escolhido invisível; mesmo evento com a soma de um em achados. Parar e executar novamente a cada mudança, restaurando esconderijos e contagem. Na versão final, tocar uma vez em cada esconderijo, com o jogo em execução, para obter zero, um e dois. Não apresentar como montagem integral nem pedir que o responsável siga paletas. A captura é manual e recebe a fala em edição.

**Conferência antes da gravação (não gravar):** Aguardar o primeiro desenho do jardim antes de clicar; testar os três estados e conferir que o placar exibe a variável atual. Sem regra, o clique não faz nada; com visibilidade, revela sem contar; com a soma, revela e conta. Conferir também que tocar no lugar de um esconderijo já invisível não aumenta a contagem. No runtime atual, um sprite com visibilidade zero não recebe esse clique. Os rótulos foram conferidos nas definições reais: sz_g2d_on_group_click em blockCatalogText.ts, sz_g2d_set_opacity em blockCatalogFundamentals.ts e sz_js_var_increment em blockly/blocks/js.ts, no pacote studio. A apostila usa esses mesmos tipos e cores.

**Fala da Helena:**

```text
Aqui já temos um jardim, dois animais escondidos e um placar. Vou começar com uma ideia bem pequena: quando eu tocar no esconderijo, quero descobrir o animal que está atrás.

Eu clico neste esconderijo. Nada aconteceu. O desenho já está aqui, mas ainda falta uma regra para responder ao clique.

O que eu preciso dizer ao jogo? Primeiro, reconhecer que alguém tocou num esconderijo. Depois, fazer aquele esconderijo ficar invisível. Assim, o animal que já está atrás vai aparecer.

Eu acrescento uma regra: quando clicar num esconderijo, deixar esse esconderijo com zero por cento de visibilidade.

Agora eu testo. O esconderijo sumiu e o animal apareceu. O jogo respondeu à regra que eu construí.

Só que repare no placar. Continua em zero. Eu encontrei um animal, mas o jogo não está contando. Por quê? Porque a regra que eu fiz só manda esconder. Ela ainda não manda contar.

Então preciso relacionar a intenção com o que já foi construído. Quero que, ao encontrar um animal, o placar aumente um. A mudança vai entrar dentro desse mesmo acontecimento, junto da ação de esconder.

Eu acrescento a ação de somar um na variável que guarda os achados.

Recomeço o jogo para testar desde o início. O placar está em zero. Clico num esconderijo: o animal aparece e o placar vai para um. Clico no outro: aparece o outro animal e o placar vai para dois.

Eu decidi o que queria que acontecesse, organizei uma regra, observei o resultado e acrescentei o que faltava. O placar não contar não queria dizer que eu era incapaz. Mostrava uma parte da ideia que ainda não estava expressa no programa.

Quem apenas olhar o jogo pronto vai ver um esconde-esconde. Quem participa da criação precisa pensar nessas relações para fazer o esconde-esconde funcionar. Clique em Próxima parte.
```

## Parte 3. O que a demonstração permite perceber

**Clipe:** `video-a3-erro`

**Na tela:** No "Na demonstração", mostrar os três estados [na edição: clique sem efeito, esconderijo que some, placar que conta]. No "Existe também uma relação entre decisão e consequência", destacar a regra e o efeito correspondente [na edição: ação programada e resultado]. No "É isso que torna a criação", voltar para a apresentadora [na edição: câmera].

**Fala da Helena:**

```text
Na demonstração, o resultado apareceu aos poucos. Para chegar nele, foi preciso manter uma intenção em mente, organizar ações e comparar o que eu queria com o que realmente aconteceu.

Quando o esconderijo sumiu, mas o placar não contou, eu precisei separar as duas coisas. Uma parte funcionou. A outra ainda precisava ser construída. Esse olhar evita tratar toda dificuldade como se tudo tivesse dado errado.

Eu também precisei formular uma hipótese: se a contagem deve acontecer no clique, a instrução de contar precisa estar ligada a esse acontecimento. Depois do ajuste, testei para conferir. A resposta apareceu no próprio resultado.

Existe também uma relação entre decisão e consequência. A criança percebe que uma escolha dela muda o que acontece no jogo. Ela participa como alguém que pode agir, observar o efeito e fazer outra escolha.

É claro que nem tudo na vida responde como um programa. Mas essa experiência permite conversar sobre um ponto concreto: o que eu fiz, o que aconteceu e o que posso tentar de outro jeito?

Observe também que o jardim já estava preparado. Começar com apoio e com algumas partes prontas não retira a participação da criança. Pode permitir que ela se concentre numa decisão de cada vez, compreenda aquela relação e depois consiga fazer algo mais complexo.

O que queremos preservar é esse espaço para pensar. Uma explicação pode ajudar a conhecer um caminho. A criança pode acompanhar, testar e depois fazer uma mudança que entende. Se apenas repetir gestos sem compreender o resultado, a oportunidade fica menor.

É isso que torna a criação de jogos uma possibilidade interessante para praticar habilidades cognitivas para a vida. O jogo dá uma situação concreta para planejar, escolher, investigar e ajustar. Cada criança vai precisar de desafios e apoios que façam sentido para ela. Na próxima aula, vamos conversar sobre esse começo. Clique em Concluir aula para continuar.
```
