# Ajustes das cenas existentes, lote 2

> Consolidação por cena dos pedidos das 27 análises de aula, para as 14 cenas da segunda metade.
> A linha de base é o `CATALOGO-CENAS.json` desta pasta. Cada seção cita o estado atual antes de
> dizer o que muda, para que a correção seja feita sem voltar aos arquivos de aula.
>
> Convenção usada aqui: "meta de fábrica" é a que está registrada no catálogo. Quando uma análise
> de aula trata como existente uma meta que o catálogo não registra, isso aparece como meta nova,
> com a observação de onde veio a confusão.

---

## `onion-skin` · O fantasma do quadro de antes

**Estado hoje:** grupo `art`. O v6 a embrulha como **demonstração guiada**, com roteiro de três
passos, e nenhuma meta é cobrada. Manipula o fantasma do quadro anterior e o tamanho do fogo do
quadro 2. **Duas metas de fábrica:** `blind-move` e `even-step`. Tem três pistas em escada, palpite
de fábrica, pergunta extra ("E no quadro 1? Tente ligar o fantasma lá e veja o que aparece.") e
frase de sucesso. Ações: `frame`, `onion`, `shift`. Não tem pergunta final que conte para concluir.

**Gravidade:** quebra a aula.

**Usada em:** O Jogo do Meu Jeito, Aula 3 (único uso). As Aulas 2 e 4 do mesmo curso a consideram
e adiam para a 3, porque antes disso a nave tem um quadro só.

### O que muda

1. **Demonstração vira experimentação, e este é o ajuste principal.** Hoje a criança assiste e no
   fim aparece o botão "Agora é sua vez", que é uma das fórmulas banidas pela decisão de
   01/08/2026. Como experimentação ela já começa na bancada e o botão deixa de existir. A relação
   tem botão em dois lugares ao mesmo tempo: o fantasma ligado ou desligado, e o tamanho do fogo do
   quadro 2.
2. **Criar a meta `ghost-on`.** A análise da Aula 3 trata as metas da cena como sendo três
   (`blind-move`, `ghost-on`, `even-step`) e o catálogo registra duas. Do jeito que está, a aula
   cobraria uma meta que nunca cai e a seção não fecharia. O rótulo e o pedido abaixo são derivados
   da pista 2 e do passo 2 do roteiro de demonstração, que já descrevem exatamente esse momento.
3. **Não encenar tremor.** A referência do curso manda provocar o desalinhamento e anunciar que é
   de propósito. Conferindo o percurso real, isso não reproduz: com fogo-base, Duplicar quadro,
   Selecionar e mover só a ponta e preencher o vão, a base fica onde estava porque foi copiada. A
   dificuldade honesta e reprodutível é outra, e já está escrita no motor: com um quadro à vista por
   vez não há como saber o quanto o segundo fogo cresceu, que é a meta `blind-move`.
4. **Ganha pergunta final que conta para concluir.** Hoje não tem nenhuma.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `blind-move` | Mudou o fogo 2 sem ver o fogo 1 | No quadro 2, com o fantasma desligado, mude o tamanho do fogo 2. | não |
| `ghost-on` | Com o fantasma ligado, o fogo do quadro 1 apareceu tracejado por cima | No quadro 2, ligue o fantasma. | **sim** |
| `even-step` | Com o fantasma, deixou o fogo 2 maior e dentro do quadro | No quadro 2, com o fantasma ligado, deixe o fogo 2 um pouco maior que o fogo 1, sem passar da borda. | não |

### Outros campos a mudar

- **Pergunta final (nova):** "Com o fantasma ligado no quadro 2, o que é o desenho tracejado?"
  - "O fogo do quadro 1, só para você comparar." (correta)
  - "Um terceiro fogo, que vai entrar na animação."

### O que NÃO mudar

A instrução de abertura, que já descreve a ordem certa (primeiro com o fantasma desligado, depois
com ele ligado). As três pistas. A frase de sucesso. A pergunta extra. O palpite de fábrica. O
elenco, que desenha a mesma nave da cena `frames`: as duas são da mesma aula e do mesmo objeto, e
isso é um acerto. A posição na aula, depois de a criança já ter os dois quadros. O roteiro de
demonstração continua existindo no motor, para quem for revisar a cena.

### Presets por aula

Uma aula só hoje. **Registro de conflito resolvido:** a análise da Aula 3 aponta a Aula 5 como
reuso ("quando ela move crateras e apaga uma delas no segundo quadro do asteroide"). A análise da
Aula 5 avalia e **recusa**, porque o foco de `onion-skin` é o fantasma como guia de alinhamento e o
que a Aula 5 precisa é o tanto do deslocamento, que virou a cena nova `motion-amount`. Vale a
decisão de quem desenhou a Aula 5: **`onion-skin` não entra na Aula 5**.

---

## `pixel-vector` · De perto, a borda conta

**Estado hoje:** grupo `art`, já em formato de experimentação. Manipula o quanto a lupa aproxima as
duas pedras. **Uma meta de fábrica:** `alike`. Tem três pistas, roteiro de demonstração de quatro
passos, pergunta extra e frase de sucesso. Ação: `inspect`.

**Gravidade:** quebra a aula.

**Usada em:** O Jogo do Meu Jeito, Aula 4 (único uso). As Aulas 2 e 3 a consideram e adiam para a
4, porque a comparação só vale depois de ela ter desenhado nos dois estilos. Reuso previsto na
Aula 6, quando a folha da nave é rasterizada.

### O que muda

1. **Criar `stairs` e `smooth`.** A análise da Aula 4 diz que a cena "serve exatamente como está" e
   cobra três metas (`stairs`, `smooth`, `alike`). O catálogo registra `alike` e mais nada. Sem as
   duas, a seção cobra descobertas que não caem e não fecha. Os rótulos e pedidos abaixo saem dos
   passos 2 e 3 do roteiro de demonstração, que já descrevem os dois momentos com precisão.
2. **Nenhuma outra mudança na cena.** Este é o conserto mais barato de todo o lote: duas metas e
   nada de motor.
3. **Mudança de posição de fala, fora da cena:** o "por que 64 na pedra", prometido na seção 2 da
   aula, passa a ser respondido no `dialogue` de abertura desta seção, em vez de ficar solto.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `stairs` | De perto, a borda da pedra de pixel virou degraus | Aproxime até 4 vezes e olhe a borda da pedra de pixel. | **sim** |
| `smooth` | De perto, a borda da pedra de vetor continuou lisa | Com a lupa em 8, olhe a borda da pedra de vetor. | **sim** |
| `alike` | Voltou para longe e comparou de novo | Depois de aproximar, volte Aproximar para 1 ou 2 vezes. | não |

A ordem importa: as duas primeiras são o que ela vê de perto, e `alike` é a conclusão, que só faz
sentido depois de voltar para longe.

### Outros campos a mudar

Nenhum. A instrução, as pistas, a pergunta extra, a frase de sucesso e o palpite escrito na aula
continuam como estão.

### O que NÃO mudar

O formato de experimentação, que já está certo e é um dos dois acertos do v6 neste curso. As três
pistas em escada. O cenário `meu-jeito`, com duas pedras de mesma silhueta sob uma lupa só, sem
personagem do elenco. A frase de sucesso, que já fecha a ideia inteira.

### Presets por aula

Uma aula só.

---

## `random` · Cada cacto pode nascer diferente

**Estado hoje:** grupo `speed`. Manipula o sorteio do lugar e o sorteio da velocidade, com as
marquinhas e as raias. **Uma meta de fábrica:** `velocities`. Tem três pistas, roteiro de
demonstração de dois passos, pergunta extra e a melhor frase de sucesso do catálogo para este
conceito ("Cada sorteio saiu dentro dos limites que você deu, e às vezes repetiu"). Ação: `sample`.
O bloco `experiencia-sorteio-controlado` **não tem campo `prediction`**, então a cena não tem
palpite.

**Gravidade:** quebra a aula no Desafio Dia 3, prejudica o aprendizado no Corre Dino Aula 12. No
Desafio, o palco atual mostra um nascimento pela direita que o jogo dela não faz, e as duas metas
que a aula cobra não existem. No Corre Dino, a cena entrega uma das três descobertas que o roteiro
promete, e a que falta é justamente a razão de ser dela.

**Usada em:** Corre, Dino! Aula 12 e Desafio do Primeiro Jogo, Dia 3.

### O que muda

1. **A régua do nascimento vira preset de duas orientações.** Hoje o palco é o do Corre Dino, com o
   cacto nascendo à direita da tela. No Desafio a pedra nasce em cima, então a régua passa a ficar
   acima da borda de cima, na faixa de y menos 30, com as marquinhas ao longo dela e a pedra
   entrando pela borda de cima. Sem isso, a cena ensina o conceito certo com um movimento que
   contradiz o jogo dela.
2. **O módulo de velocidade vira ligável.** No Corre Dino ele fica ligado, com as raias e a meta
   `velocities`. No Desafio ele sai inteiro, porque ali o vy é fixo em 3 e mostrar velocidade
   sorteada ensinaria uma coisa que o jogo dela não faz.
3. **Criar `positions` e `repeat`.** São as duas descobertas que o roteiro do Corre Dino
   pede e o catálogo não tem. `repeat` é a razão de ser da cena: é ela que desmente a ideia de que
   sorteio garante diferente. Sem ela, a frase de sucesso promete uma repetição que a cena nunca
   cobrou.
4. **Criar `above`**, que é o que o Desafio tem de genuinamente novo: nascer do lado de fora e
   entrar caindo.
5. **`place-samples` não é criada. Conflito resolvido.** O Desafio Dia 3 pede `place-samples`, com
   rótulo "Os sorteios caíram espalhados, e dois caíram perto". Isso é exatamente
   `positions` mais `repeat` fundidas numa meta só. Escolhi as duas granulares, por três
   motivos: elas ensinam dois fatos diferentes, a frase de sucesso da cena promete os dois
   separadamente, e a regra de "nunca contar quantas vezes falta" já está escrita para `repeat`.
   Resultado: o Desafio passa a cobrar três metas em vez de duas, cobrindo as mesmas descobertas.
6. **`repeat` nunca promete o que o sorteio não garante.** Oito sorteios numa faixa de 61 valores
   podem não repetir. O pedido continua sendo "mais oito vezes", a meta cai quando a repetição
   acontecer, e o botão Conferir, enquanto ela não cair, responde "ainda não repetiu, aperta mais
   algumas vezes". Nunca contar quantas vezes falta.
7. **A conta embaixo de cada raia, só no Corre Dino.** Hoje as raias mostram quanto cada cacto andou
   em 1 segundo. Acrescentar embaixo de cada uma a conta que produziu aquele número, `-5 - 0 = -5` e
   `-5 - 1 = -6`. É o que transforma a cena na concretização da conta, e é este ajuste que permite
   tirar a demonstração `velocity` da Aula 12.
8. **Marcar a borda 480 na régua, só no Corre Dino.** A primeira pista já diz que a régua mostra
   onde um cacto pode nascer, depois da borda da tela. Desenhar a linha do 480 com legenda e deixar
   a faixa de 500 a 560 do lado de fora dela dispensa a explicação falada e responde a segunda
   pergunta do quiz.
9. **O palpite passa a existir.** Acrescentar o campo `prediction` ao bloco
   `experiencia-sorteio-controlado`.

### Metas depois do ajuste

> **Construído.** A missão de fábrica é **`positions`, `repeat` e `velocities`**. A `above` existe
> marcada `soNoCaso`, fora da missão de fábrica, e é a do Dia 3 do Desafio, que a declara. A Aula 12
> do Corre, Dino! e o Dia 3 do Desafio cobram `positions`.
>
> Construído também: o palpite e a pergunta final desta cena passaram a morar em `questions.ts`, com
> `revealOn` em `repeat`, com o mesmo texto que esta especificação escreveu para o Corre, Dino!. O
> bloco da aula continua podendo declarar os seus, e o do bloco prevalece.

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `positions` | Saíram lugares diferentes | Aperte Sortear lugar até sair um lugar diferente. | **sim** |
| `repeat` | Um lugar repetiu | Aperte Sortear lugar mais oito vezes. | **sim** |
| `above` | A régua fica acima da tela: a pedra nasce do lado de fora e entra caindo | Deixe o tempo passar até a primeira pedra entrar na tela. | **sim**, só de caso |
| `velocities` | O cacto de -6 chegou mais longe que o de -5 | Aperte Sortear velocidade até sair um cacto -5 e um -6. | não |

### Outros campos a mudar

- **Palpite (novo, Corre Dino):** "Sorteando o lugar, dois cactos podem nascer no mesmo ponto?"
  - "Nunca, o sorteio evita repetir." Se ela escolher esta, a tela conta depois: "Um lugar saiu de
    novo, e a marquinha dele ganhou 2×."
  - "Podem sim." (correta)
  - O palpite volta à tela no instante em que a meta `repeat` cai.
- **Pergunta final (nova, padrão da cena, escrita no Corre Dino):** "O que o sorteio garante?"
  - "Um valor diferente do anterior."
  - "Um valor dentro dos limites que você escolheu." (correta)
  - Explicação ao acertar: "Sortear é tirar um número de dentro da faixa, e a faixa é sua. Repetir é
    possível, e é por isso que o percurso parece novo sem ser controlado."
- **Pergunta final (preset do Desafio):** "Duas pedras seguidas nasceram quase no mesmo lugar. O que
  aconteceu com o sorteio?"
  - "O sorteio quebrou e repetiu por engano."
  - "O sorteio não tem memória, e um lugar pode sair de novo." (correta)
  - Explicação ao acertar: "Sortear é escolher na hora, dentro dos limites. Nada impede que o mesmo
    lugar saia duas vezes seguidas."
- **Título e instrução de abertura** passam a vir do elenco, porque hoje falam de cacto.

### O que NÃO mudar

A frase de sucesso, que já diz a ideia inteira e serve aos dois cursos. As três pistas, adaptadas
só no nome da figura. A ação `sample`. O grupo `speed`. A regra de sortear uma coisa por vez,
primeiro o lugar e depois a velocidade, que está na pista 2.

### Presets por aula

| | Corre, Dino! Aula 12 | Desafio, Dia 3 |
|---|---|---|
| Elenco e cenário | cacto no papel do obstáculo, cenário `corre-dino` | asteroide, cenário `nave` |
| Onde fica a régua | à direita da tela, com a borda 480 marcada e a faixa de 500 a 560 fora dela | acima da borda de cima, na faixa de y menos 30 |
| Módulo de velocidade | ligado, com as raias e a conta embaixo de cada uma | desligado |
| Metas cobradas | `positions`, `repeat`, `velocities` | `positions`, `repeat`, `above` |
| Pergunta final | "O que o sorteio garante?" | "Duas pedras seguidas nasceram quase no mesmo lugar..." |

---

## `restart` · Jogue outra vez

**Estado hoje:** grupo `events`, formato de experimentação. Manipula o toque na tela, o que o toque
faz no fim e os cactos da pista. **Duas metas de fábrica:** `ended` e `screen-only`. Tem três
pistas, roteiro de demonstração de três passos, pergunta extra e frase de sucesso ("A pista começou
limpa. Isso é jogar de novo de verdade!"). Ações: `advance`, `connect`, `start`. A escolha oferecida
hoje se chama "Ir para o início" contra "Reiniciar o jogo".

**Gravidade:** prejudica o aprendizado. A cena conclui com as duas metas de fábrica antes de a
criança chegar ao contraste que a própria frase de sucesso celebra: ela pode sair de lá tendo visto
só o problema, sem ter visto a solução. E o rótulo "Ir para o início" não existe mais na paleta.

**Usada em:** Corre, Dino! Aula 9 e Desafio do Primeiro Jogo, Dia 5.

### O que muda

1. **Vocabulário da paleta atual.** "Ir para o início" vira `Mudar o estado do jogo para inicio`. As
   duas aulas pedem a mesma troca, e as duas opções passam a ser dois blocos que existem de verdade
   na paleta dela, com o nome que ela vai ler lá.
2. **Criar `clean-track`** (Corre Dino Aula 9). A terceira descoberta existe hoje como pedido e como
   frase de sucesso, e não existe como meta.
3. **Criar `back-to-menu`** (Desafio Dia 5). É o ponto de atenção registrado no curso e a pergunta 2
   do quiz, e hoje nada na aula mostra isso acontecendo.
4. **Conflito resolvido entre as duas metas novas.** `clean-track` diz que Reiniciar começa com a
   pista limpa, e `back-to-menu` diz que Reiniciar leva para a abertura e exige outro comando. Não
   são alternativas: são as duas metades do mesmo Reiniciar, uma sobre o que sobra na tela e a outra
   sobre onde o jogo cai. As duas existem, e cada aula cobra a sua.
5. **Corrigir o passo 3 do roteiro de demonstração.** Hoje ele diz "Com Reiniciar o jogo, o toque no
   fim limpa a pista. A partida nova começa vazia", o que sugere que a partida recomeça sozinha. As
   duas aulas registram o contrário: Reiniciar roda o `Ao iniciar` inteiro de novo, e o último bloco
   de lá guarda o momento inicio. Trocar por: "Com Reiniciar o jogo, o fim limpa a pista e o jogo
   volta para a abertura."
6. **A prova precisa ficar à vista.** Os cactos ou pedras da partida anterior têm que continuar
   desenhados na pista quando a cena volta ao início, e de preferência contados. É a prova inteira
   da cena, e hoje ela depende de a criança reparar sozinha num punhado de obstáculos.
7. **A ação do fim vira preset:** toque na tela no Corre Dino, Enter no Desafio.

**Pendência a conferir antes de fechar:** se o `Ao iniciar` do Corre Dino também termina guardando o
momento inicio. Se sim, `back-to-menu` é verdadeira lá também e pode ficar disponível sem ser
cobrada. Se não, a preset do Corre Dino desliga a meta.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `ended` | A batida levou para o fim | Toque na tela e deixe o tempo passar. | não |
| `screen-only` | Só trocar de estado deixou os cactos na pista | No fim, com Mudar o estado do jogo para inicio escolhido, toque na tela duas vezes. | não, mas o rótulo e o pedido trocam o nome do bloco |
| `clean-track` | Reiniciar começou com a pista limpa | Depois de jogar de novo com Mudar o estado do jogo para inicio, escolha Reiniciar o jogo e, no fim, toque na tela duas vezes. | **sim** |
| `back-to-menu` | Reiniciar levou para a abertura, e foi preciso outro Enter para jogar | Escolha Reiniciar o jogo, aperte Enter no fim e olhe em que momento o jogo ficou. | **sim** |

### Outros campos a mudar

- **Instrução de abertura:** hoje fala em tocar na tela. A ação vira preset, para o Desafio ler
  "Jogue até bater. No fim, aperte Enter. Depois troque o que o Enter faz e jogue de novo."
- **Pergunta final do Corre Dino (de fábrica, com o enunciado ajustado):** "O que Reiniciar o jogo
  faz que Mudar o estado do jogo para inicio não faz?"
- **Pergunta final do Desafio (nova):** "Depois da derrota você aperta Enter e o jogo reinicia. Para
  onde ele vai?"
  - "Para a abertura, e outro Enter começa a partida." (correta)
  - "Direto para uma partida nova."
  - Explicação ao acertar: "Reiniciar roda o Ao iniciar inteiro de novo, e o último bloco de lá
    guarda o momento inicio."
- **Pergunta extra:** troca "Ir para o início" pelo rótulo novo.
- **O que `screen-only` mostra no Desafio:** a partida seguinte começa com as pedras da anterior
  ainda caindo, o placar no número antigo e as vidas no que sobrou. É o contrafactual exato do jogo
  dela.

### O que NÃO mudar

O palco, que já está certo: uma pista, um obstáculo e duas opções de volta, sem nada específico do
Dino. O formato de experimentação. As duas metas de fábrica como descobertas. As três pistas, com o
rótulo novo. A frase de sucesso. A posição na aula: a cena vem antes da montagem, porque o erro que
ela previne é um bug silencioso que pareceria certo.

### Presets por aula

| | Corre, Dino! Aula 9 | Desafio, Dia 5 |
|---|---|---|
| Elenco e cenário | Dino e cacto, cenário `corre-dino` | nave e pedras, cenário `nave` |
| Ação do fim | toque na tela | Enter |
| Metas cobradas | `ended`, `screen-only`, `clean-track` | `screen-only`, `back-to-menu` |
| Herança visível no `screen-only` | os cactos da partida anterior, contados | pedras caindo, placar antigo e vidas no que sobrou |

---

## `score` · Quando o placar cresce?

**Estado hoje:** grupo `events`. Manipula a peça de pontuação, a região Se jogando e a próxima tela.
A peça tem **dois lugares possíveis**: solta ou dentro do Se. **Duas metas de fábrica:**
`score-idle-wrong` e `score-playing`. Tem três pistas, roteiro de demonstração de três passos,
pergunta extra e frase de sucesso. Ações: `advance`, `collide`, `connect`, `start`.

**Gravidade:** prejudica o aprendizado, com agravante de doutrina. A cena cobra duas metas onde o
roteiro descreve quatro, e a pergunta final ("Por que o placar parou no fim?") não tem meta nenhuma
que produza a resposta. O agravante: o que a cena não cobra, a aula cobra como dedução da criança,
que é exercício, e exercício está banido desde 01/08/2026.

**Usada em:** Corre, Dino! Aula 11 (único uso). Avaliada e **recusada** no Desafio Dia 5, porque
seria a mesma relação de `game-state` aplicada ao placar, na aula mais carregada daquele curso.
Reuso previsto na Aula 13 do próprio Corre Dino, com o relógio de 5 segundos.

### O que muda

1. **Três lugares para a peça `Somar ponto`, em vez de dois.** Hoje ela só pode estar solta ou
   dentro do Se. Passa a poder estar solta, dentro do `A cada quadro do jogo` e dentro do
   `A cada 1 segundos`, e as duas últimas podem estar dentro ou fora do Se. Este é o ajuste grande e
   o mais caro de motor de todo o lote.
2. **Criar `score-runaway`**, que é a meta que substitui a pergunta banida. Hoje a aula conta que
   seriam 60 pontos por segundo e pede que a criança deduza sozinha onde o bloco vai. Com o
   controle, ela põe no quadro, o placar sai de 0 e vai para 60 num segundo, e a conclusão chega
   pelos olhos. É a mesma armadilha da avalanche da Aula 5, agora com um número no lugar de uma
   parede de cactos.
3. **Criar `score-waiting` e `score-kept`.** As duas estão descritas no roteiro e não existem no
   catálogo. Sem `score-kept`, a cena fica sem a resposta da própria pergunta final.
4. **Rótulos da paleta 1.0.** Onde a cena diz "Se jogando", passa a dizer
   `o estado do jogo é jogando ?`. A palavra "tela" fica só para o que a criança vê, que são início,
   jogando e fim, como o curso já fala.

### Metas depois do ajuste

> **Construído, e diverge desta tabela em dois ids. O código vence** (conferência de 19/09/2026
> contra `catalog.ts`). A missão de fábrica é **`score-runaway`, `score-idle-wrong`, `score-start`,
> `score-playing` e `score-end`**. Os ids `score-waiting` e `score-kept` também existem, marcados
> `soNoCaso`, fora da missão de fábrica. A diferença não é só de nome: `score-start` e `score-end`
> são **comparações**, e o motor só as concede depois do contraste (a peça solta precisa ter somado
> no início antes, e os pontos precisam ter crescido jogando antes, senão dois toques em "Próxima
> tela" levariam ao Fim com o placar em 0 e a meta afirmaria que ele "parou"). A Aula 11 do Corre,
> Dino! cobra a missão de fábrica, sem declarar `setup.goals`.

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `score-runaway` | No quadro, o placar disparou: 60 por segundo | Ponha Somar ponto dentro do A cada quadro do jogo e deixe passar um segundo inteiro. | **sim** |
| `score-idle-wrong` | Solto, o placar cresceu no início | Com Somar ponto solto, deixe o tempo passar na tela de início. | não |
| `score-start` (era `score-waiting`) | Dentro de Se jogando, o início esperou | Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para Se jogando e espere de novo. | **sim** |
| `score-playing` | Pontos aumentam jogando | Com Somar ponto em Se jogando, aperte Próxima tela até Jogando e deixe o tempo passar. | não |
| `score-end` (era `score-kept`) | No fim, o placar parou no valor | Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar. | **sim** |

### Outros campos a mudar

- **Instrução de abertura.** De "Deixe o tempo passar em cada tela (início, jogando e fim) e olhe o
  placar. Depois mude o Somar ponto de lugar e compare." para "Ponha o Somar ponto em cada lugar e
  olhe o placar. Depois passe pelas três telas: início, jogando e fim."
- **Frase de sucesso.** De "Os pontos crescem jogando e ficam guardados fora da partida!" para "Onde
  a peça mora decide duas coisas: quantas vezes por segundo, e em quais telas."
- **Explicação da pergunta final**, que ganha a metade nova: "O número continua guardado no fim.
  Quem decide quando somar são duas coisas juntas: o relógio, que decide de quanto em quanto tempo,
  e o Se, que decide em que telas."

### O que NÃO mudar

A pergunta final em si ("Por que o placar parou no fim?"), que está boa e passa a ter resposta. O
palco das três telas com o placar na fileira embaixo. As duas metas de fábrica. A pergunta extra. As
três pistas, ajustadas só nos rótulos. O grupo `events`.

### Presets por aula

Uma aula só hoje, Corre Dino Aula 11, com elenco Dino e cacto e cenário `corre-dino`. Registrar que
a Aula 13 do mesmo curso a reaproveita inteira, com o relógio de 5 segundos no lugar do de 1
segundo, e que o terceiro lugar da peça é o que torna esse reuso possível.

---

## `screen-reader` · O que o leitor de tela lê

> ⛔ **SUPERADO POR DECISÃO DE PRODUTO, 20/09/2026.** Esta ordem de trabalho foi executada e depois
> revertida no material das aulas. A dona tirou a acessibilidade do Corre, Dino!: o conceito é
> complexo demais para o primeiro curso da trilha e o resultado dele não muda nada na tela de quem
> está aprendendo. **Nenhuma aula do Corre Dino aponta mais para esta cena, e nenhuma deve voltar a
> apontar.** A cena e a meta `says-all-controls` continuam no catálogo e servem a outro curso. O
> registro completo está em `ACHADOS-TRANSVERSAIS.md`, na seção do GRAVE 1. Tudo o que vem abaixo
> descreve o estado de antes e fica só como histórico.

**Estado hoje:** grupo `stage`. Manipula a descrição do jogo e o botão de ouvir a tela. **Três metas
de fábrica:** `heard-empty`, `says-goal` e `says-control`. Tem três pistas que já falam a língua
deste jogo ("pule, corra, desvie" e "apertando espaço"), roteiro de demonstração de dois passos,
pergunta extra e frase de sucesso. Ações: `describe`, `listen`. **Não tem pergunta final que conte
para concluir.** E o mais importante: **nenhuma aula a usa hoje.** O bloco `experiencia-leitor-de-tela`
que apontava para ela foi aposentado pelo `retireBlockKeys` do manifesto, junto com o passo "conte
para o computador o que é o seu jogo".

**Gravidade:** quebra a aula. A Aula 1 do Corre Dino publica hoje sem um dos quatro passos do
percurso, o clipe `video-tela-v7` termina anunciando um passo que não vem, a seção de recapitulação
recapitula quatro passos, e a Aula 2 tem na entrega o critério "Mantenha a descrição do jogo em Ao
iniciar" sem que nenhuma seção de nenhuma aula tenha mandado colocar essa peça.

**Usada em:** Corre, Dino! Aula 1 (restauração) e Corre, Dino! Aula 13 (revisita).

### O que muda

1. **Voltar para a Aula 1**, na seção do bloco `Descrever o jogo para leitor de tela __`, antes de
   ela escrever a frase no bloco. Acessibilidade está na lista de conceitos que o curso ensina do
   zero, e é o único conceito do dia que produz um resultado audível.
2. **Ganha pergunta final que conta para concluir.** Hoje não tem nenhuma.
3. **O texto de exemplo da cena fecha igual ao do bloco**, para a criança escrever a mesma frase em
   seguida sem inventar duas versões. A frase canônica é "Corra com o dino e pule os cactos
   apertando espaço."
4. **Criar `says-all-controls`** para a revisita da Aula 13. Lá `says-control` já está satisfeita
   desde a Aula 1, e passar de novo seria não aprender nada.
5. **Caso preparado da Aula 13.** O palco não parte do começo de fábrica: o campo já vem com a frase
   escrita na Aula 1, e o jogo do palco aceita os três jeitos de pular. Ela aperta Ouvir a tela e
   escuta uma frase que promete um jeito só, enquanto o jogo aceita três. É o desencontro que a
   seção existe para mostrar.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `heard-empty` | Sem frase, a pessoa ouve só Imagem | Aperte Ouvir a tela com o campo vazio. | não |
| `says-goal` | A frase diz o que fazer | Escreva o que se faz no jogo e aperte Ouvir a tela de novo. | não |
| `says-control` | A frase diz como jogar | Escreva também qual tecla usar e aperte Ouvir a tela de novo. | não |
| `says-all-controls` | A frase conta os três jeitos de pular | Escreva também a seta para cima e o toque na tela, e aperte Ouvir a tela de novo. | **sim** |

### Outros campos a mudar

- **Pergunta final (nova):** "Qual frase ajuda mais quem não está vendo a tela?"
  - "Corra com o dino e pule os cactos apertando espaço." (correta)
  - "Um jogo muito legal com um dinossauro."
  - Explicação ao acertar: "A frase que serve diz o que fazer no jogo e como jogar. Sem ela, quem
    usa o leitor de tela ouve só que ali tem uma imagem."

### O que NÃO mudar

As três metas de fábrica, que estão certas. As três pistas, que já usam o vocabulário do jogo. A
instrução de abertura. A frase de sucesso. A pergunta extra. O roteiro de demonstração. O cenário
`corre-dino`, com a área do jogo e o campo da descrição à vista.

### Presets por aula

| | Corre, Dino! Aula 1 | Corre, Dino! Aula 13 |
|---|---|---|
| Como o palco começa | campo de descrição vazio, estado de fábrica | campo já com a frase da Aula 1, e o jogo aceitando os três jeitos de pular |
| Metas cobradas | `heard-empty`, `says-goal`, `says-control` | `says-all-controls` |
| As demais metas | todas em jogo | `heard-empty` e `says-goal` aparecem com "✓ Você já descobriu isto." |

**Dependência declarada, vinda da Aula 13:** a cena está no lote caro da ordem de trabalho. Se ela
não existir quando a Aula 13 for publicada, a seção continua funcionando sem o bloco `interactive`:
sobram a fala, o vídeo do gesto e o critério da descrição. O que se perde é a criança ouvir a
diferença entre a frase velha e a frase nova. É perda real e não é bloqueio.

---

## `shading` · A luz dá volume

**Estado hoje:** grupo `art`. É usada como **demonstração no meio do texto**, com um botão "Ver
acontecer" que toca as três partes de uma vez, e **nenhuma das três metas é cobrada**. Manipula os
tons de sombra e de luz e o lado do sol. **Três metas de fábrica:** `flat`, `volume` e `side`. Tem
três pistas em escada, roteiro de demonstração de um passo, pergunta extra e frase de sucesso.
Ações: `light`, `shade`.

**Gravidade:** prejudica o aprendizado. A cena existe inteira e correta, e o conteúdo dela passa
sem cobrar nada.

**Usada em:** O Jogo do Meu Jeito, Aula 2 (único uso). Considerada e recusada na Aula 3 (o fogo
recebe no máximo um miolo mais claro, que é escolha e não regra de volume) e na Aula 4 (as crateras
da pedra são contraste de forma, não modelagem por tons). Reuso previsto na Aula 5, quando a chama
ganha ponta clara e base escura.

### O que muda

1. **Demonstração vira experimentação, e este é o ajuste principal da aula.** Pelo critério do
   briefing a relação tem botão e a frase se escreve inteira: "quando eu mudo o sol de lado, o tom
   escuro troca de lado". Não há processo no tempo a acompanhar, há uma chave para virar e um lado
   para escolher. **E o formato de demonstração guiada termina com o botão "Agora é sua vez", que é
   uma das fórmulas banidas.** Como experimentação, a criança já começa na bancada e o botão deixa
   de existir.
2. **A pergunta que conta para concluir passa a ser a que hoje está solta no teste da seção 7**,
   reescrita para a cena, para a ideia ser cobrada uma vez só, no lugar onde ela acabou de sentir.
3. **Observação de coerência, não pedida por nenhuma aula:** o pedido de `flat` é "Ligue a sombra e
   a luz e depois desligue", o que faz `volume` cair primeiro por construção. A ordem na faixa deve
   ser `volume`, `flat`, `side`, que é a ordem real do gesto.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `volume` | Ligou os tons e viu a bola redonda | Ligue a sombra e a luz. | não |
| `flat` | Tirou os tons e viu a bola chapada de novo | Ligue a sombra e a luz e depois desligue. | não |
| `side` | Mudou o sol de lado e viu a sombra trocar de lado | Com a sombra e a luz ligadas, mude o sol de lado. | não |

Nenhuma meta nova. Esta cena é a mais barata do lote: só troca de formato e ganha pergunta final.

### Outros campos a mudar

- **Pergunta final (nova, herdada do teste da seção 7):** "Uma parte do seu desenho já está numa cor
  escura. Como mostrar que a luz bate nela?"
  - "Pondo poucos pixels de um tom mais claro da mesma família." (correta)
  - "Cobrindo a parte inteira com a cor da sombra do corpo."

### O que NÃO mudar

As três metas de fábrica, que cobrem a ideia inteira. As três pistas em escada. A frase de sucesso.
A pergunta extra. As ações `light` e `shade`. O cenário `meu-jeito`, sem personagem do elenco: a
cena desenha a bola de três tons de azul. O roteiro de demonstração continua existindo no motor,
para quem for revisar a cena.

### Presets por aula

Uma aula só.

---

## `sheet-vs-sprite` · A folha e o tamanho no jogo

**Estado hoje:** grupo `art`. Manipula a largura do recorte na folha da nave, o quadro recortado e o
tamanho no jogo. **Três metas de fábrica:** `squeezed`, `crop-half` e `crop-whole`. Tem três pistas,
palpite de fábrica, pergunta extra e frase de sucesso. Ações: `crop`, `cut`. O roteiro de
demonstração tem **um passo só, numerado `step-2`**, sem `step-1`.

**Gravidade:** quebra a aula. O manifesto da seção 5 declara
`setup.goals: ["crop-half", "crop-whole", "size-apart"]`, e **`size-apart` não existe no catálogo**.
Do jeito que está, a seção pede uma descoberta que nunca vai cair.

**Usada em:** O Jogo do Meu Jeito, Aula 6, hoje **duas vezes em seções seguidas**: uma demonstração
guiada na seção 4 e uma experimentação na seção 5, que é a que cobra a meta inexistente. As Aulas 3
e 4 a consideram e adiam para a 6, porque a folha de quadros só existe quando o desenho vai para o
jogo. **A Aula 7 não a usa:** o que aquela aula precisa é a cena nova `two-clocks`.

### O que muda

1. **`size-apart` sai do manifesto e entra `squeezed`.** A lista passa a ser
   `["squeezed", "crop-half", "crop-whole"]`, que são as três de fábrica. A ideia que o roteiro
   queria com `size-apart` ("mudou o tamanho no jogo e conferiu a folha") já está na cena, como
   terceira pista e como pergunta extra, e a explicação da pergunta final também cobre: o 32 é o
   quadro da folha e o 54 é o tamanho no jogo.
2. **Uma aparição só, em modo experimentação.** A demonstração guiada da seção 4 sai inteira, junto
   com o clipe `video-folha-demo`. Hoje a criança assiste alguém fazer e em seguida é mandada fazer
   a mesma coisa acontecer, o que parte uma ideia ao meio e gasta uma seção inteira. Com o corte, o
   botão "Agora é sua vez" da demonstração some junto.
3. **Palpite.** Com a demonstração fora, o palpite da experimentação passa a ser o único, e o certo
   é o que a cena já traz de fábrica ("Os quadros da nave têm 32 de largura. Com um recorte de 16, o
   que aparece no jogo?"). O palpite que estava na demonstração, sobre a folha inteira, deixa de
   existir, porque a meta `squeezed` agora é cobrada na experimentação e o palpite dela cabe ali.
4. **Observação de coerência, não pedida pela aula:** com a demonstração fora do percurso, o roteiro
   de um passo só numerado `step-2` fica órfão. Ou completar os passos, ou registrar no catálogo que
   ele não é usado por aula nenhuma.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `squeezed` | Viu o jogo mostrar a folha inteira | Escolha a largura 64 e olhe o jogo. | não |
| `crop-half` | Recortou 16 e olhou o jogo | Escolha a largura 16 e olhe o jogo. | não |
| `crop-whole` | Achou o recorte que mostra uma nave inteira | Escolha a largura 32 e olhe o jogo. | não |

`size-apart` **não é criada**. Ela não existe e não precisa existir.

### Outros campos a mudar

Nenhum campo de texto da cena muda. As mudanças são todas de uso: a lista de metas do manifesto, o
corte da demonstração e o corte do clipe.

### O que NÃO mudar

A instrução de abertura. As três pistas, inclusive a terceira, que é onde mora a ideia que o roteiro
chamava de `size-apart`. A pergunta extra. A frase de sucesso. Os números 64, 16 e 32, que são a
espinha da cena. O cenário `meu-jeito`, sem personagem do elenco. A folha da cena, que já é uma nave
com fogo pequeno e fogo grande, ou seja, exatamente a folha que a criança acabou de desenhar.

### Presets por aula

Uma aula só.

---

## `spawn` · Abra espaço entre os cactos

**Estado hoje:** grupo `population`. Manipula a peça Criar cacto, o relógio e o intervalo. **Uma
meta de fábrica:** `every-frame`. Tem três pistas, roteiro de demonstração de um passo, pergunta
extra e frase de sucesso que já promete a descoberta do espaço. Ações: `advance`, `connect`. **O
controle do relógio fala em segundos.**

**Gravidade:** quebra a aula no Desafio Dia 3, prejudica o aprendizado no Corre Dino Aula 5. No
Desafio, as duas metas que a aula cobra não existem. No Corre Dino, o roteiro declara duas
descobertas e o catálogo tem uma, e a que falta é justamente o conserto: a cena fecha na metade da
ideia.

**Usada em:** Corre, Dino! Aula 5 e Desafio do Primeiro Jogo, Dia 3. **Descartada em O Jogo do Meu
Jeito, Aula 7**, e o motivo vale registrar: naquela aula a criança não toca no relógio, e a cena não
tem animação nenhuma nos sprites, então ela não pode mostrar dois relógios. O lugar daquele conceito
é a cena nova `two-clocks`.

### O que muda

1. **Criar a meta do espaço, e o id é `with-timer`.** Ele faz par com a meta de fábrica
   `every-frame`: as duas nomeiam **onde a peça está**, e não o que aconteceu na tela. O Corre Dino
   Aula 5 e o Desafio Dia 3 cobram esse mesmo id.
2. **A unidade do relógio vira preset, com o rótulo literal do bloco de cada curso. Conflito
   resolvido.** O Corre Dino pede que a cena diga `A cada __ segundos fazer`, e o Desafio pede o
   controle em quadros, com 20, 40 e 80. Os dois têm razão, porque **são blocos diferentes em cursos
   diferentes**: o do Desafio se chama `A cada quadros` e é o número que ela escreve lá. A regra do
   briefing é rótulo literal, nunca parafraseado, então a cena lê a unidade do preset em vez de
   escolher uma para os dois.
3. **Criar `same-fall`** (Desafio Dia 3). A intuição junta frequência e velocidade num "mais rápido"
   só, o quiz de hoje cobra exatamente essa separação e nenhuma cena mostra. A faixa mostra a
   velocidade de queda fixa em 3 nos dois casos, e uma linha marca até onde a primeira pedra chegou.
4. **A explicação da pergunta final ganha a metade nova:** o relógio decide de quanto em quanto
   tempo nasce uma pedra, e quem faz cada uma descer é o vy.
5. **Título, instrução e rótulos por elenco**, porque hoje a cena é toda escrita em cacto.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `every-frame` | Viu a parede de cactos | Com Criar cacto em A cada quadro, deixe o tempo passar um segundo inteiro. | não |
| `with-timer` | Com o relógio, sobrou espaço entre os cactos | Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos. | **sim** |
| `same-fall` | Com mais pedras nascendo, cada pedra desce na mesma velocidade | Troque o relógio de 40 para 20 e compare quanto cada pedra desceu em 60 quadros. | **sim** |

### Outros campos a mudar

- **Primeira menção ao relógio dentro da cena** passa a trazer junto o rótulo do bloco que ela vai
  procurar logo depois, na unidade do preset.
- **Pergunta final:** manter "Por que virou uma parede de pedras sem o relógio?", que está boa, e
  acrescentar à explicação a separação entre quem decide o ritmo e quem decide a queda.

### O que NÃO mudar

A meta `every-frame` e a imagem da parede, que é a dor canônica do nascimento sem relógio. A
instrução de abertura. As três pistas. A frase de sucesso. A pergunta extra ("E se o relógio esperar
um pouco mais entre dois cactos?"). O formato de experimentação. As ações `advance` e `connect`. O
grupo `population`.

### Presets por aula

| | Corre, Dino! Aula 5 | Desafio, Dia 3 |
|---|---|---|
| Elenco e cenário | Dino e cacto, cenário `corre-dino` | nave e asteroide, cenário `nave` |
| Unidade do relógio | segundos, com o rótulo `A cada __ segundos fazer` | quadros, com 20, 40 e 80, e o rótulo `A cada quadros` |
| Metas cobradas | `every-frame`, `with-timer` | `every-frame`, `with-timer`, `same-fall` |
| Instrumento extra no palco | nenhum | velocidade de queda fixa em 3 à vista, e a linha de até onde a primeira pedra chegou |

---

## `stage-size` · A tela e o limite dela

**Estado hoje:** grupo `stage`. Manipula largura e altura da tela e a borda que mostra o limite. O
palco abre em 800 por 480 com a borda escondida, que é o estado de fábrica do bloco. **Duas metas de
fábrica:** `border-on` e `target` (chegar em 480 por 270). Tem três pistas, roteiro de demonstração
de três passos, pergunta extra e frase de sucesso. Ações: `border`, `stage`. Está marcada com
`semPerguntaFinal: true`.

**Gravidade:** prejudica o aprendizado.

**Usada em:** Corre, Dino! Aula 1 (único uso).

### O que muda

1. **De percurso.** Hoje a cena roda antes de a criança preparar a tela no projeto dela, então ela
   descobre para que serve a borda antes de ter passado pelo problema que a borda resolve, e a cena
   entra como curiosidade. Passa a rodar depois, quando a confusão já existe no projeto: a cor do
   `Preparar o jogo em tela cheia` pinta a telinha e o espaço em volta, e aí os números 480 e 270
   não têm o que medir na tela. O palco abrindo em 800 por 480 com a borda escondida passa a ser
   exatamente o estado em que ela acabou de deixar o jogo dela.
2. **Criar `follows`.** O catálogo registra duas metas e o roteiro descreve três. A que falta é a do
   meio, e é a mais importante para o conceito: é ela que mostra que a borda obedece aos números.
3. **Ganha pergunta final.** Hoje a cena está marcada com `semPerguntaFinal: true` e a aula dispensa
   a pergunta. A pergunta nova é a que planta a retirada da borda na Aula 2.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `border-on` | A borda mostra onde a tela acaba | Ligue a borda da tela. | não |
| `follows` | A borda acompanha os números | Com a borda à vista, mude a largura ou a altura. | **sim** |
| `target` | Chegou na tela de 480 por 270 | Deixe a tela em 480 por 270. | não |

### Outros campos a mudar

- **Pergunta final (nova), e `semPerguntaFinal` sai:** "Se a borda for apagada, o que muda no jogo?"
  - "Nada no jogo. Só sai o desenho que mostrava o limite." (correta)
  - "A tela do jogo fica maior."
  - Explicação ao acertar: "A borda é um instrumento. Ela desenha uma moldura para você enxergar
    onde a telinha começa e termina. O tamanho continua sendo os dois números que você escreveu."

### O que NÃO mudar

O palco abrindo em 800 por 480 com a borda escondida. O alvo de 480 por 270, que é o tamanho do
Corre Dino. As duas metas de fábrica. As três pistas. A frase de sucesso. A pergunta extra. O
cenário `corre-dino`, sem personagem do elenco.

### Presets por aula

Uma aula só.

---

## `symmetry` · O que o espelho faz com o seu traço?

**Estado hoje:** grupo `art`, já em formato de experimentação, e o uso atual está correto. Manipula
os dois espelhos do Pinta e os traços da nave na grade. **Uma meta de fábrica:** `one-side`. Tem três
pistas em escada, palpite, pergunta final, roteiro de demonstração de três passos e frase de
sucesso. Ações: `clear-paper`, `mirror-mode`, `trace`.

**Gravidade:** quebra a aula. A análise da Aula 2 trata as metas como sendo três (`one-side`,
`two-sides`, `axis-decides`) e cobra as três mais uma quarta. O catálogo registra `one-side` e mais
nada, então três das quatro metas cobradas não caem.

**Usada em:** O Jogo do Meu Jeito, Aula 2 (único uso). Considerada e recusada na Aula 3, porque o
fogo não é simétrico.

### O que muda

1. **Criar `two-sides` e `axis-decides`.** São as duas metades que faltam da instrução de abertura,
   que já manda pintar três vezes: com os espelhos desligados, com o Espelho lado a lado, e com o de
   cima e de baixo. Os rótulos e pedidos abaixo saem das pistas 2 e 3 e dos passos 2 e 3 do roteiro
   de demonstração.
2. **Criar `fill-ignores-mirror`**, que é o alcance do espelho e transforma uma armadilha em
   experiência, dentro do mesmo palco. O motivo está no código: o espelho é aplicado no ponto de
   plotagem, então pega Lápis, Linha, Borracha, Retângulo e Círculo, e **não** pega o Balde de tinta
   nem o Trocar uma cor. E a linha-guia tracejada continua na tela com o balde na mão, que é o que
   engana.
3. **Ação nova no motor: `fill`**, do lado do `trace` que já existe.
4. **A pergunta final passa a cobrar o alcance**, em vez de repetir o que o espelho faz.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `one-side` | Pintou com o espelho desligado | Com os dois espelhos desligados, pinte a asa. | não |
| `two-sides` | Com o Espelho lado a lado, a asa apareceu do outro lado do meio | Ligue o Espelho lado a lado e pinte a asa de novo. | **sim** |
| `axis-decides` | Com o espelho de cima e de baixo, a cópia caiu em cima, e não ao lado | Desligue o Espelho lado a lado, ligue o de cima e de baixo e pinte a asa de novo. | **sim** |
| `fill-ignores-mirror` | Com o espelho ligado, o Balde encheu um lado só | Deixe ligado o Espelho lado a lado e encha a asa com o Balde de tinta. | **sim** |

### Outros campos a mudar

- **Pergunta final.** Hoje a aula pergunta "O que os dois espelhos fazem com o traço que você
  pinta?". Passa a ser: "Com o Espelho lado a lado ligado, o que aparece dos dois lados?"
  - "O que você pinta com o Lápis, com a Linha e com a Borracha." (correta)
  - "Tudo, inclusive o que você enche com o Balde de tinta."

### O que NÃO mudar

O formato de experimentação e o uso atual, que é um dos poucos acertos do v6 neste curso. A
instrução de abertura em três tempos. As três pistas em escada. A frase de sucesso. A pergunta
extra. As ações `clear-paper` e `mirror-mode`. O cenário `meu-jeito`, sem personagem do elenco: a
cena desenha a grade da nave.

### Presets por aula

Uma aula só. Registrar que a lista de ferramentas que o espelho alcança cresce junto com o curso,
como o próprio comentário do motor prevê, e que a meta `fill-ignores-mirror` é o lugar onde essa
lista fica visível.

---

## `variable` · Guardar, mudar e mostrar

**Estado hoje:** grupo `events`. Manipula o número guardado, a soma e o mostrar na tela. **Três metas
de fábrica, e as três estão certas:** `stored`, `changed-hidden` e `shown`. Tem três pistas, roteiro
de demonstração de três passos, pergunta extra e frase de sucesso. Ações: `change`, `show`, `store`.
Ela foi escrita com o vocabulário da Aula 11 do Corre Dino: a caixa se chama pontos, o botão se
chama `Somar 1 em pontos` e a chave se chama `Mostrar placar`. **E nenhuma aula a usa hoje.**

**Gravidade:** quebra a aula, por omissão. Este é o caso mais barato e mais rentável do lote inteiro:
a cena está pronta, correta, com as três metas certas e com o vocabulário já alinhado, e o eixo
exato da Aula 11 do Corre Dino roda hoje sem ela.

**Usada em:** Corre, Dino! Aula 11 e Desafio do Primeiro Jogo, Dia 4. Considerada e **recusada** em
Corre, Dino! Aula 6, por dois motivos: o `quantos sprites tem no grupo` não guarda nada, e a imagem
da caixinha pertence à Aula 11 pela regra de imagem única do curso.

### O que muda

1. **Ligar a cena na Aula 11 do Corre Dino.** É o ajuste principal e não custa motor nenhum.
2. **Demonstração vira experimentação** (pedido do Desafio Dia 4). Os pedidos das três metas já estão
   escritos como ações da criança, e a relação tem botão: ela liga e desliga o `Mostrar placar` e
   aperta `Somar 1 em pontos`, e escolhe a ordem em que aciona cada um. **Com a troca, o botão "Agora
   é sua vez" do formato de demonstração deixa de existir.**
3. **A fala do passo 2 do roteiro de demonstração.** Hoje diz "Três acertos: a caixa vai para 3". No
   Corre Dino não existe acerto: o ponto vem do tempo que o jogador aguenta. Vira "Três segundos: a
   caixa vai para 3." Os passos 1 e 3 ficam como estão.
4. **O texto desenhado no palco vira preset.** No Desafio, a palavra "placar" do palco é trocada pelo
   mesmo rótulo que ela vai escrever no bloco, `Pontos:`, para a cena e o Estúdio mostrarem a mesma
   coisa. No Corre Dino a palavra placar fica, porque é o nome do bloco de lá.
5. **Ganha pergunta final que conta para concluir**, com uma variante por curso.

**Pendência a conferir antes de fechar:** o rótulo literal do bloco do Desafio que mostra o valor na
tela, para a chave da cena não ficar com o nome de outro curso.

### Metas depois do ajuste

> **Construído, e as metas conferem com esta tabela** (conferência de 19/09/2026 contra
> `catalog.ts`): os três ids, os três rótulos e os três pedidos batem palavra por palavra, e a cena
> não tem meta só de caso. A Aula 11 do Corre, Dino! cobra os três sem declarar `setup.goals`.
>
> **Uma divergência, e o código vence: o item 3 do "O que muda" não foi feito.** O passo 2 do
> roteiro continua dizendo "Três acertos: a caixa vai para 3", e o palpite de fábrica da cena fala
> de um acerto que soma 1. A cena é compartilhada com o Dia 4 do Desafio, onde o ponto vem mesmo de
> acertar. No Corre Dino o ponto vem do tempo, e quem faz a ponte é a fala que abre a seção. Se a
> divergência precisar ser fechada, o caminho é `goalCopy` no bloco ou um preset da cena, não
> reescrever o roteiro compartilhado.

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `stored` | A caixa guardou um número | Guarde um número na caixa. | não |
| `changed-hidden` | Mudou o valor sem estar na tela | Depois de guardar, aperte Somar 1 em pontos com Mostrar placar desligado. | não |
| `shown` | Mostrar não mudou o valor guardado | Depois de guardar, ligue Mostrar placar. | não |

Nenhuma meta nova. As três de fábrica cobrem a separação inteira.

### Outros campos a mudar

- **Pergunta final no Desafio Dia 4 (nova), trazida do quiz para a cena, porque é ali que ela acabou
  de ver a resposta:** "O placar foi desenhado três vezes sem nenhum acerto novo. O que o número na
  tela mostra?"
  - "O mesmo número de antes." (correta)
  - "Três pontos a mais, um por desenho."
  - A pergunta do quiz continua onde está, como revisão.
- **A mesma pergunta no Corre Dino**, trocando "acerto" por "ponto": "O placar foi desenhado três
  vezes sem nenhum ponto novo. O que o número na tela mostra?"

### O que NÃO mudar

As três metas e a ordem delas. A instrução de abertura ("Guarde um número na caixa. Mude o número
sem mostrar. Só depois ligue o mostrar."), que já descreve a ordem certa das três metas. As três
pistas. A frase de sucesso. A pergunta extra ("E se você mostrar primeiro e mudar depois?"), que é
exatamente o que acontece no jogo do Corre Dino na ordem em que ela monta: o placar entra na seção 3
e o `Somar` só na seção 5. Os nomes `pontos`, `Somar 1 em pontos` e `Mostrar placar` no preset do
Corre Dino.

### Presets por aula

| | Corre, Dino! Aula 11 | Desafio, Dia 4 |
|---|---|---|
| Elenco e cenário | cenário `corre-dino`, sem personagem nem obstáculo, com o fundo e o placar no visual do jogo dela | nave e asteroide, cenário `nave` |
| Texto do palco | placar | `Pontos:` |
| Fala do passo 2 do roteiro | "Três acertos: a caixa vai para 3." (o construído, compartilhado; a fala da aula faz a ponte para o ponto por segundo) | "Três acertos: a caixa vai para 3." |
| Metas cobradas | `stored`, `changed-hidden`, `shown` | `stored`, `changed-hidden`, `shown` |

---

## `velocity` · O que move o Dino a cada quadro

**Estado hoje:** grupo `motion`. O catálogo a descreve como experimentação (tem campo do que
manipula, metas e pistas), mas o v6 a embrulha num bloco de **demonstração** com cinco ações de
preparo. Manipula a velocidade do Dino nos dois eixos e o relógio. **Duas metas de fábrica:** `moves`
e `left`. Tem três pistas, roteiro de demonstração de três passos, pergunta extra e frase de
sucesso. Ações: `advance`, `velocity`.

**Gravidade:** quebra a aula. O Desafio Dia 2 conclui com `up` e `down`, e nenhuma das duas está
registrada no catálogo. E, mesmo que estivessem, o caso preparado de hoje deixa o tiro grudado no
canto de baixo, à direita, de onde o número positivo não tem para onde descer, então `down` não
cairia se ela experimentasse o positivo primeiro.

**Usada em:** Corre, Dino! Aula 5 e Desafio do Primeiro Jogo, Dia 2. **Sai** de Corre, Dino! Aula 12
e do Desafio Dia 3.

### O que muda

1. **Conflito de existência das metas, resolvido.** O Desafio Dia 2 afirma que `up` e `down` "existem
   no catálogo como metas de caso". O Desafio Dia 3 afirma o contrário, que `down` e `stopped` são
   metas inexistentes. O catálogo registra `moves` e `left`, e mais nada. Decisão: **declarar `up`,
   `down` e `still` como metas da cena, e não como metas de caso**, porque duas análises do mesmo
   curso discordam e nenhum caso pode depender de meta que não está registrada.
2. **`stopped` e `still` são a mesma descoberta, e fica `still`.** O Corre Dino Aula 5 pede `still`
   com rótulo e pedido escritos; o Desafio Dia 3 chama a mesma coisa de `stopped` num bloco que sai
   da aula. Sem o zero no meio, o sinal fica ensinado pela metade: positivo e negativo sem o ponto
   de parada.
3. **Demonstração vira experimentação, para todos os usos.** O Corre Dino Aula 5 pede a troca pelo
   critério do briefing, que lista o sinal da velocidade entre os exemplos de experimentação. O
   Desafio Dia 2 depende disso sem dizer, porque `up` e `down` só caem se a criança escolher o sinal.
   O custo é retirar o embrulho de demonstração: o palco e as metas já existem. **Com a troca, o
   botão "Agora é sua vez" some.** O ganho é que ela escolhe o número, vê o x ou o y mudar quadro a
   quadro, e só depois digita o valor no bloco dela.
4. **Consertar o caso preparado do Desafio Dia 2.** Hoje são cinco ações (velocidade 10 e 5, avança 3
   segundos, velocidade 10 e 0, avança 0,6, velocidade 0 e 0) que levam o tiro aos dois limites do
   palco. Trocar por três, que só mostram que dá para andar e param no meio da altura: velocidade 5
   para o lado e 0 para baixo, avança 1,5 segundo, velocidade 0 e 0. O tiro fica com espaço para
   subir e para descer.
5. **Elenco no texto inteiro.** Hoje o título, a instrução, os rótulos das metas e a frase de sucesso
   falam de Dino. O v6 já renomeia o título no Corre Dino para "O que move o cacto a cada quadro", e
   a troca precisa alcançar o resto do texto, em cada preset.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `moves` | A posição mudou sozinha, com o relógio | Escolha uma velocidade diferente de zero e deixe o tempo passar. | não |
| `left` | Velocidade negativa levou para a esquerda | Ponha um número negativo na velocidade para o lado e deixe o tempo passar. | não |
| `still` | Com velocidade zero, o cacto fica no lugar | Ponha a velocidade para o lado em 0 e deixe o tempo passar. | **sim** |
| `up` | Velocidade negativa levou para cima | Ponha um número negativo na velocidade de cima e baixo e deixe o tempo passar. | **sim** |
| `down` | Velocidade positiva levou para baixo | Ponha um número positivo na velocidade de cima e baixo e deixe o tempo passar. | **sim** |

### Outros campos a mudar

- **Descrição do palco no roteiro do Desafio Dia 2.** Hoje o texto descreve o palco de fábrica ("O
  tiro está em x 240, y 210") e não o palco depois do caso. Passa a descrever o que ela vê ao abrir.
- **Título e instrução por preset**, derivados do elenco.
- **Palpite do Corre Dino Aula 5 (mantido, está bom e aponta para o sinal):** "O cacto nasce na
  direita da tela. Para o cacto vir para a esquerda, a velocidade para o lado precisa ser...", com
  menos 5 correto.

### O que NÃO mudar

As duas metas de fábrica. As três pistas, e em especial a segunda, que é a tese da cena: "A
velocidade não move nada sozinha: quem move é o relógio, um quadro de cada vez." A pergunta extra. A
frase de sucesso. As ações `advance` e `velocity`. O grupo `motion`. O caso do Corre Dino Aula 5,
com o cacto em x 400, y 230 e velocidades zeradas, que está bom.

### Presets por aula

| | Corre, Dino! Aula 5 | Desafio, Dia 2 |
|---|---|---|
| Elenco e cenário | cacto no papel do herói, cenário `corre-dino` | tiro no papel do herói, cenário `nave` |
| Eixo em foco | o do lado | o de cima e baixo |
| Caso preparado | cacto em x 400, y 230, velocidades zeradas | três ações: velocidade 5 e 0, avança 1,5 segundo, velocidade 0 e 0 |
| Metas cobradas | `left`, `moves`, `still` | `up`, `down` |

### Onde ela sai, e o que fica no lugar

- **Corre, Dino! Aula 12.** Sai. A mesma cena, com o mesmo elenco e no mesmo formato, já rodou na
  Aula 5 com três partes, e a versão da Aula 12 acrescenta um pixel por quadro a uma comparação que
  a criança viu sete aulas atrás. A comparação continua existindo em dois lugares: a leitura da conta
  em voz alta, na fala de montagem da Seção 4, e a cena `random` com a conta escrita embaixo de cada
  raia (ajuste 7 daquela cena). **São alternativas excludentes: ou a `velocity` volta para a Seção 4
  da Aula 12, ou a conta entra na `random`. Nunca as duas.**
- **Desafio, Dia 3.** Sai. O que é novo naquele dia não é o sinal da velocidade, é o sorteio e o
  nascimento fora da tela, e isso cabe em `random`. A confusão que sobra, o menos de y contra o menos
  de vy, é resolvida por uma frase na orientação, ao lado dos dois campos: "aqui o menos é lugar, não
  velocidade. Menos 30 quer dizer um pouquinho acima da tela".
- **Aviso de preparo, válido para qualquer aula futura do Corre Dino.** As cinco ações de preparo que
  a Aula 12 usava moviam o cacto para a direita e para baixo antes de a demonstração começar, e no
  Corre Dino o cacto nunca sobe, nunca desce e nunca vai para a direita. Se a cena voltar a qualquer
  aula daquele curso, o preparo precisa deixar o cacto encostado na borda direita, no chão, com o vy
  em 0 do começo ao fim.

---

## `world` · Criar e mostrar são duas coisas diferentes

**Estado hoje:** grupo `world`. Manipula criar o Dino nos bastidores e mostrar o Dino na tela. **Duas
metas de fábrica:** `hidden` e `visible`. Tem três pistas, roteiro de demonstração de três passos,
pergunta extra e explicação precisa. Ações: `connect`, `create`. Na Aula 1 do Corre Dino o bloco está
com `required: false`.

**Gravidade:** prejudica o aprendizado.

**Usada em:** Desafio do Primeiro Jogo, Dia 1 (serve como está) e Corre, Dino! Aula 1 (um ajuste de
configuração).

### O que muda

1. **Passar de `required: false` para obrigatória na Aula 1 do Corre Dino.** A cena é o único
   critério de conclusão daquela seção, e opcional ela deixa a seção fechar sem ninguém ter feito
   nada. É a correção mais barata de todo o lote: uma linha.
2. **Elenco do Desafio:** nave, cenário `nave`. Nada mais.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `hidden` | O Dino existe nos bastidores | Crie o Dino nos bastidores. | não |
| `visible` | O mesmo Dino aparece na tela | Mostre o Dino na tela do jogo. | não |

Nenhuma meta nova.

### Outros campos a mudar

Nenhum. A instrução, as pistas, a pergunta extra, a frase de sucesso, a pergunta final e o roteiro de
demonstração continuam exatamente como estão, nos dois cursos.

### O que NÃO mudar

Tudo. Esta é a cena mais saudável do lote, e as duas análises que a usam dizem o mesmo: serve
exatamente como está. Vale registrar também **onde ela foi recusada e por quê**, para ninguém tentar
reaproveitar errado: na introdução do Desafio, para salvar contra enviar, e na Aula 6 do Meu Jeito,
para a cena nova `unique-names`. Nos dois casos o motivo é o mesmo: o foco da `world` é um objeto do
jogo existindo sem aparecer, e não um destino de arquivo nem um nome.

### Presets por aula

| | Desafio, Dia 1 | Corre, Dino! Aula 1 |
|---|---|---|
| Elenco e cenário | nave, cenário `nave` | Dino, cenário `corre-dino` |
| Configuração | como está | `required` passa a ser verdadeiro |
| Metas cobradas | `hidden`, `visible` | `hidden`, `visible` |

---

## Ordem de correção sugerida

**Critério:** primeiro o que faz uma seção não fechar ou publicar uma promessa que a cena não cumpre,
depois o que custa pouco e devolve muito, e por último o acabamento.

1. **`velocity`.** Quebra o Dia 2 do Desafio e a Aula 5 do Corre Dino ao mesmo tempo, e duas outras
   aulas dependem da decisão de remoção para fechar o percurso delas.
2. **`variable`.** Está pronta, correta e desligada: ligar não custa motor e devolve o eixo inteiro
   da Aula 11.
3. **`screen-reader`.** ⛔ **Item cancelado em 20/09/2026.** A prioridade valia enquanto o conserto
   fosse restaurar o passo na Aula 1. A decisão de produto foi a inversa: a cobrança saiu da Aula 2
   e a acessibilidade saiu do curso. Não há nada a fazer aqui.
4. **`symmetry`.** Três das quatro metas cobradas não existem, e uma delas ainda pede ação nova no
   motor (`fill`).
5. **`random`.** Duas aulas de dois cursos cobram cinco metas onde o catálogo tem uma, e o palco
   precisa de duas orientações para não contradizer o jogo da criança.
6. **`spawn`.** Duas metas novas, um id duplicado a fundir e um conflito de unidade que muda o texto
   escrito no palco.
7. **`pixel-vector`.** Duas metas a criar e mais nada: é o conserto mais barato entre os que quebram.
8. **`score`.** Três metas novas e o controle de frequência, que é a peça de motor mais cara da
   lista, e é ele que tira o exercício banido da Aula 11.
9. **`onion-skin`.** Uma meta a criar e a troca de formato, que faz o botão banido sumir.
10. **`sheet-vs-sprite`.** Tirar `size-apart` do manifesto é uma linha; o resto é corte de percurso e
    de clipe.
11. **`restart`.** Duas metas novas e o vocabulário da paleta atual, com uma pendência a conferir.
12. **`stage-size`.** Uma meta, uma pergunta final e uma troca de lugar no percurso.
13. **`shading`.** Troca de formato e pergunta final, zero meta nova.
14. **`world`.** Uma linha de configuração e um elenco.
