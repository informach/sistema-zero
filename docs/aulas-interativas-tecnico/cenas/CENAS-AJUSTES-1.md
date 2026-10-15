# Ajustes das cenas existentes, lote 1

> Consolidação por cena dos ajustes que as 27 análises de aula pedem. Este lote cobre catorze cenas:
> `acceleration`, `cleanup`, `controls`, `coordinates`, `draw-loop`, `fill-stroke`, `frames`,
> `game-state`, `gravity`, `hitbox`, `impulse`, `jump-sound`, `layers`, `lives`.
>
> A linha de base é o `CATALOGO-CENAS.json` desta pasta. Toda seção diz primeiro o que o catálogo
> tem hoje e só depois o que muda. Quem for corrigir não precisa voltar aos arquivos de aula.
>
> **Onde mora cada campo.** O catálogo guarda apenas `titulo`, `instrucao`, `manipula`,
> `frase_sucesso`, `pergunta_extra`, `metas`, `pistas`, `roteiro_demonstracao` e `acoes_usadas`.
> O palpite antes de abrir, a pergunta final, a obrigatoriedade (`required`), o elenco (`cast`), o
> cenário e o caso preparado vivem no **bloco do manifesto da aula**, não na cena. Cada ajuste abaixo
> diz de qual dos dois lados ele é.
>
> **Gravidade**, os três níveis usados aqui:
> `quebra a aula` (a seção não consegue concluir hoje, ou a cena abre com a figura errada, ou afirma
> sobre o jogo dela algo que ela pode conferir e descobrir que é falso) · `prejudica o aprendizado`
> (a seção fecha, mas a cena ensina menos do que promete, ou manda a criança procurar um nome que não
> existe) · `melhoria`.
>
> Os títulos usam o separador `·` no lugar do travessão, pela regra de travessão zero do projeto.

---

## `acceleration` · Acelere com um limite

**Estado hoje:** experimentação, grupo `speed`. Manipula o relógio de 5 segundos, a condição
`Se velocidade > −9` e a fileira de cactos. Tem **3 metas**, nesta ordem: `base-limit` ("A base parou
em −9"), `old-speed` ("Os cactos velhos não mudaram de número") e `past-limit` ("Sem a condição, a
base passou de −9"). Três pistas, pergunta extra ("Desligue a condição de novo. Até onde a base
vai?"), roteiro de demonstração com três passos e a ação `sample`. O bloco
`experiencia-aceleracao-modelo` do manifesto declara `cenario` e **não declara `cast`**.

**Gravidade:** quebra a aula. A seção da Aula 13 conclui quando "as quatro metas de `acceleration`
caem", e só existem três. A frase de sucesso e o palpite falam de um cacto −10 que nenhuma meta
produz.

**Usada em:** Corre, Dino! Aula 13 (uso único no redesenho).

### O que muda

1. **Criar a meta `spawned-ten`.** É a razão de ser da cena: a base para em −9 e mesmo assim nasce um
   cacto −10, porque o sorteio vem depois da base. Hoje isso só aparece na frase de sucesso.
2. **Reordenar as metas** para `base-limit`, `spawned-ten`, `old-speed`, `past-limit`. A ordem é uma
   história: o limite funciona, o limite tem alcance, o passado não muda, e só no fim o contrafactual
   mostra que é mesmo o limite quem segura. O contrafactual por último é onde ele ensina.
3. **O pedido da meta nova não conta vezes.** Quatro sorteios entre 0 e 1 podem não trazer nenhum
   −10. O pedido é "até nascer", e o botão Conferir, enquanto a meta não cai, responde "ainda não
   saiu um −10, aperta mais algumas vezes". Contar vezes num sorteio é prometer o que o sorteio não
   garante, e a Aula 12 acabou de ensinar justamente isso.
4. **Declarar o elenco no bloco do manifesto**, como já fazem os blocos de demonstração das Aulas 5 e
   12. A cena está escrita em vocabulário de cacto, então hoje funciona neste curso e não viaja para
   nenhum outro.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `base-limit` | A base parou em −9 | Com a condição ligada, aperte Passar 5 segundos cinco vezes. | não |
| `spawned-ten` | Mesmo com a base parada em −9, nasceu um cacto −10 | Com a base no −9 e a condição ligada, aperte Passar 5 segundos até nascer um cacto −10. | **sim** |
| `old-speed` | Os cactos velhos não mudaram de número | Aperte Passar 5 segundos três vezes e olhe o número embaixo de cada cacto. | não |
| `past-limit` | Sem a condição, a base passou de −9 | Desligue a condição e aperte Passar 5 segundos cinco vezes. | não |

O catálogo escreve o menos com o sinal `−` (U+2212), e não com hífen. A meta nova segue a mesma
convenção, senão a faixa mistura dois desenhos do mesmo número.

### Outros campos a mudar

- **Elenco (manifesto):** cacto no papel do obstáculo. **Cenário:** `corre-dino`.
- **Comportamento do Conferir:** resposta específica enquanto `spawned-ten` não cai, conforme o item
  3 acima.

### O que NÃO mudar

A frase de sucesso, que já diz a ideia inteira. O palpite. O palco com a fileira de cactos e o número
embaixo de cada um, que é a única representação do catálogo em que um valor muda sozinho com o tempo.
E o interruptor da condição, ligada e desligada: a troca por um seletor de três estados (`>` −9,
`=` −9 e sem condição) foi considerada e **recusada**, porque com o `=` a cena não mostra nada, e
erro sem sintoma é justamente o que não se aprende por observação. Esse caso pertence à cena
`number-line`, onde a resposta da pergunta fica escrita na tela a cada passo.

### Presets por aula

Uso único. Nota de continuidade: a cena diz "Passar 5 segundos" e a Seção 7 da mesma aula convida a
trocar o relógio para 2 ou 10 segundos. A ordem proposta resolve sozinha, porque a cena vem antes do
balanceamento. Se as duas trocarem de lugar em alguma revisão futura, o rótulo do botão passa a
contradizer o jogo dela.

---

## `cleanup` · Para onde vai o cacto que sai da tela?

**Estado hoje:** experimentação, grupo `population`. Manipula "A regra Remover do grupo quem saiu da
tela e o tempo". Tem **1 meta**: `invisible-stored` ("Saiu da tela e ficou no grupo"). Três pistas,
pergunta extra ("E se você desligar a regra e deixar outros cactos saírem?"), roteiro de demonstração
com dois passos e as ações `advance` e `connect`. O palco mostra a tela do jogo e os bastidores lado
a lado, com a prateleira enchendo. A saída é a borda da esquerda, com a seta "saída" desenhada. As
palavras "cacto" e "cactos" estão escritas no palco e na nota da chave.

**Gravidade:** quebra a aula. As duas aulas concluem com duas metas e só existe uma, então a cena
fecha na dor, sem a ferramenta. No Corre Dino a conclusão da seção cita nominalmente uma meta
inexistente.

**Usada em:** Corre, Dino! Aula 6 (a faxina) e Desafio do Primeiro Jogo, Dia 2 (depois de ver os
tiros voarem, antes de montar a regra).

### O que muda

1. **Criar a segunda meta.** O id é **`rule-removes`**, que é o que a Aula 6 do Corre Dino já usa no
   critério de conclusão da seção, e o rótulo descreve quem age (a regra) em vez de descrever o
   objeto. As duas aulas cobram esse mesmo id.
2. **Alinhar o nome da chave ao rótulo do bloco do Estúdio.** A cena chama de "Remover do grupo quem
   saiu da tela" e o bloco se chama `Tirar do grupo __ quem sair da tela, para cada um (chamado __ )`,
   em Jogo 2D › Grupos › Participação e limpeza. Dois nomes para a mesma peça, na mesma seção, é o
   defeito que o próprio histórico desta cena já corrigiu uma vez. Alinhar pelo rótulo do bloco na
   instrução, nas três pistas, nos pedidos das metas e na frase de sucesso.
3. **Tirar a palavra cacto do palco e das notas.** A figura já vem do elenco, os textos não. Afetados:
   o título, a instrução, "2 cactos na tela e 5 no grupo", "A saída é a borda da esquerda", "Abre
   depois que dois cactos saírem da tela", as três pistas, a frase de sucesso e os dois passos do
   roteiro de demonstração.
4. **A borda de saída vira parâmetro do caso, e é aqui que as duas aulas se contradizem.** No Corre
   Dino o cacto sai pela esquerda. No Desafio o tiro sobe e sai por cima. **Resolvido por parâmetro**
   (`saida`: esquerda ou cima), com a seta acompanhando o lado escolhido, e não por escolha de um dos
   dois: o conceito é o mesmo nos dois jogos, e manter a saída fixa faria a cena ensinar a ideia certa
   com um movimento que contradiz o jogo de metade das turmas. É o único ajuste que mexe no desenho do
   palco.
5. **Só no preset do Corre Dino: um quarto sprite chegando.** Fora da tela, à direita, ainda entrando,
   no mesmo sentido do jogo dela. Com a regra ligada, esse sprite **não** é tirado do grupo, e ela vê
   isso acontecer. Sem esse caso, a conclusão natural depois da Aula 5 (o cacto nasce em x 560, fora
   da tela) é que a faxina apaga tudo que está fora da tela.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `invisible-stored` | Saiu da tela e ficou no grupo | Deixe o tempo passar até dois cactos saírem da tela. (a palavra do objeto vem do elenco) | não |
| `rule-removes` | A regra tirou do grupo quem saiu | Ligue `Tirar do grupo quem sair da tela` e deixe o tempo passar até dois saírem. | **sim** |

### Outros campos a mudar

- **Título:** parametrizado pelo elenco. "Para onde vai o cacto que sai da tela?" vale só no preset do
  Corre Dino.
- **Instrução:** o nome do objeto e o nome da regra passam a vir do elenco e do rótulo do bloco.
- **Pergunta extra, no preset do Corre Dino:** acrescentar "E o cacto que ainda está chegando, lá na
  direita? A regra tira ele também?", ao lado da pergunta extra de fábrica.
- **Elenco (manifesto), e é um detalhe que derruba o palco se errar:** esta cena desenha **só o
  obstáculo**. O elenco vai no papel `obstacle`. Declarar em `hero` deixa o palco vazio.

### O que NÃO mudar

A prateleira dos bastidores ao lado da tela do jogo, que é a imagem certa e o instrumento que torna o
vazamento visível no lugar do sermão sobre lentidão. A meta `invisible-stored` e o par dor mais
ferramenta, que já está correto. A frase de sucesso ("Sair da tela não tira ninguém do grupo: quem
tira é a regra!"). E a ordem de uso nas duas aulas, com a dor antes da regra.

### Presets por aula

| | Corre, Dino! Aula 6 | Desafio Dia 2 |
|---|---|---|
| Elenco (papel `obstacle`) | cacto | tiro |
| Cenário | `corre-dino` | `nave`, fundo de estrelas, sem chão, figuras flutuando |
| Saída | borda da esquerda | borda de cima |
| Palco | 3 na tela, 3 no grupo, mais 1 chegando pela direita | 3 na tela, 3 no grupo, sem o que chega |
| Pergunta extra | a de fábrica mais a do que está chegando | a de fábrica |
| Metas cobradas | `invisible-stored`, `rule-removes` | `invisible-stored`, `rule-removes` |

---

## `controls` · O convite para começar

**Estado hoje:** experimentação, grupo `events`. Manipula a tela de início e a peça Começar. Tem
**3 metas**: `missing-touch` ("Tocou e nada aconteceu"), `start-tap` ("Começou tocando") e
`start-key` ("Começou com Enter"). Três pistas, pergunta extra ("E se você levar Começar de volta para
Quando apertar Enter? O Enter ainda funciona?"), roteiro de demonstração com dois passos e as ações
`connect` e `start`. É a **única** das catorze cenas deste lote cujo texto não cita nenhum personagem
nem cenário, e por isso é a que viaja mais barato entre cursos.

**Gravidade:** prejudica o aprendizado. As três metas existem e a seção conclui. O que falha é o
palpite, que pergunta o que ela acabou de viver no próprio jogo minutos antes.

**Usada em:** Corre, Dino! Aula 8. Avaliada e **recusada** no Desafio Dia 5, porque o Desafio só usa
Enter e o bloco de toque não está liberado naquele nível: a cena ensinaria uma peça que ela não tem.

### O que muda

1. **Trocar o palpite (manifesto).** De "Você toca na tela de início. O que acontece?" para "O jogo já
   começa com o Enter. Se você levar o Começar para o bloco que escuta qualquer tecla ou o toque, o
   Enter para de funcionar?", com as alternativas "Sim, ele troca um jeito pelo outro" e "Não, os dois
   passam a funcionar" (correta). O palpite volta à tela quando a meta `start-key` cai. O motivo é o
   erro de raciocínio real: a criança lê "qualquer tecla ou toque" como uma opção **diferente** de "a
   tecla Enter", em vez de uma que **contém** a outra. O palpite de fábrica não toca nisso.
2. **Rótulo de `missing-touch`:** de "Tocou e nada aconteceu" para "É o mesmo que aconteceu no seu
   jogo: tocou e nada aconteceu". A meta cai em segundos porque ela já sabe, e isso é bom, mas a faixa
   não deve celebrar como descoberta o que ela trouxe de casa.
3. **Vocabulário das caixas de evento:** usar os rótulos da edição atual, `Quando apertar a tecla` e
   `Quando apertar qualquer tecla ou tocar na tela`.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `missing-touch` | É o mesmo que aconteceu no seu jogo: tocou e nada aconteceu | Com Começar em `Quando apertar a tecla`, toque na tela de início. | não |
| `start-tap` | Começou tocando | Leve Começar para `Quando apertar qualquer tecla ou tocar na tela`, e toque na tela de início. | não |
| `start-key` | Começou com Enter | Na tela de início, aperte Enter. | não |

### Outros campos a mudar

- **Palpite (manifesto):** texto novo no item 1 acima.
- **Ponto a decidir por quem for corrigir:** o palpite novo nasce da pergunta extra de fábrica. Se as
  duas ficarem, a cena pergunta duas vezes a mesma coisa, uma antes e uma depois. Ou a pergunta extra
  sai, ou ela é reescrita para outro ângulo.

### O que NÃO mudar

"Tela de início" fica como está: nesta aula a tela é desenhada de verdade, e o nome corresponde ao que
ela vê. As três metas e a ordem delas, que cobrem exatamente o percurso do dia. A pergunta final de
fábrica ("Por que tocar não começava a partida?").

### Presets por aula

Uso único. Elenco: personagem Dino. Cenário: `corre-dino`. O palco (uma tela com um convite escrito e
duas caixas de evento) não tem nada de específico do Dino, então a cena serve a qualquer curso da
trilha na aula em que o menu ganha um jeito de começar, trocando só o elenco.

---

## `coordinates` · O endereço na tela

**Estado hoje:** experimentação, grupo `stage`. Manipula o x e o y do Dino na tela do jogo. Tem
**3 metas**: `right` ("x maior leva para a direita"), `down` ("y maior leva para baixo") e `origin`
("O 0, 0 fica no canto de cima, à esquerda"). Três pistas, pergunta extra, roteiro de demonstração
com três passos e a ação `place`. Todos os textos escrevem "Dino".

**Gravidade:** prejudica o aprendizado, com um defeito de vocabulário sério no Desafio. A seção
conclui, porque as três metas existem, mas o manifesto do Dia 1 cobra uma só e a cena fala de um dino
num curso de nave.

**Usada em:** Desafio Dia 1 (antes de montar a nave) e Corre, Dino! Aula 1 (a análise diz que serve
como está, e ela já é obrigatória).

### O que muda

1. **Cobrar as três metas no Desafio Dia 1.** Hoje o manifesto cobra só `down`. Ela vai preencher x e
   y no bloco seguinte, então precisa dos dois eixos, e a origem 0,0 é o que explica por que 400 não é
   o meio da nave.
2. **A palavra Dino sai dos textos e passa a vir do elenco.** Afetados: `instrucao` (três ocorrências),
   `manipula`, `frase_sucesso`, `pergunta_extra`, as três pistas e os três passos do roteiro de
   demonstração. Os rótulos das três metas não citam o elenco e ficam como estão.
3. **Andando junto, e não é da cena:** o clipe `video-coordenadas` do Dia 1 precisa perder a afirmação
   de que x 400 centraliza a nave. 400 é o canto esquerdo da caixa de largura 54, e o centro fica em
   427. Se o vídeo continuar dizendo isso, a meta `origin` desmente o vídeo dois minutos depois.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `right` | x maior leva para a direita | Aumente só o x. | não |
| `down` | y maior leva para baixo | Aumente só o y. | não |
| `origin` | O 0, 0 fica no canto de cima, à esquerda | Leve o Dino para x 0 e y 0. (o nome do objeto vem do elenco) | não |

### Outros campos a mudar

- **Instrução, pistas, roteiro, frase de sucesso e pergunta extra:** o nome do objeto vem do elenco.
- **Caso preparado:** cada aula mantém o seu, e os dois estão certos (ver presets).

### O que NÃO mudar

As três metas, os rótulos e os pedidos. A pergunta final, que está correta. A obrigatoriedade no Corre
Dino. E o caso preparado do Desafio, x 400 e y 40, que combina com a tela 800 × 480 daquele curso.

### Presets por aula

| | Desafio Dia 1 | Corre, Dino! Aula 1 |
|---|---|---|
| Elenco | nave | Dino |
| Cenário | `nave` | `corre-dino` |
| Caso preparado | x 400, y 40 | x 110, y 150, os mesmos números do bloco seguinte |
| Metas cobradas | `right`, `down`, `origin` (hoje só `down`) | `right`, `down`, `origin` |
| Obrigatória | sim | sim, já é |

---

## `draw-loop` · Por que o desenho se repete

**Estado hoje:** experimentação, grupo `stage`. Manipula quando desenhar o Dino, limpar a tela antes e
o relógio. Tem **2 metas**: `trail` ("Sem limpar, os desenhos velhos ficam") e `moving` ("Limpando e
desenhando, o Dino anda"). Três pistas, pergunta extra ("E se limpar sem desenhar? O que sobra na
tela?"), roteiro de demonstração com três passos e as ações `advance`, `erase` e `loop`.

**Gravidade:** quebra a aula. As duas aulas concluem com três metas e só existem duas. E o passo 1 do
roteiro de demonstração ("Com o desenho só no começo, o x do Dino anda e a tela fica parada") já
descreve exatamente a descoberta que não existe como meta: a cena entrega o que não cobra.

**Usada em:** Corre, Dino! Aula 2 (já obrigatória) e Desafio Dia 1.

### O que muda

1. **Criar a meta `frozen`**, que é a que separa "desenhar" de "desenhar de novo". É o mesmo ajuste
   nos dois cursos, e é o conceito raiz: montar o `A cada quadro do jogo` sem saber o que é um quadro
   é copiar gesto.
2. **Ajuste editorial no Desafio Dia 1, sem tocar no motor.** A cena está escondida numa seção
   chamada "O que acontece sem limpar a tela?", como se fosse só sobre limpeza, quando ela entrega o
   loop inteiro. O título da seção passa a ser **"O que é um quadro"**, a instrução de abertura passa
   a "Avance um quadro por vez e olhe a tela e o x da nave", e a pergunta final passa a cobrar o
   ciclo, e não só a limpeza.
3. **Posição no Desafio:** a cena vem **antes** de montar o motor. Hoje a seção 8 encaixa o
   `A cada quadro do jogo` e a cena que explica o que é um quadro vem na 9, depois.
4. **A palavra Dino sai dos textos e vem do elenco:** `instrucao`, `manipula`, o rótulo de `moving`,
   o pedido de `frozen`, as pistas e os três passos do roteiro.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `frozen` | Sem desenhar de novo, a tela não muda | Com o Dino na tela, desenhe só no começo, sem limpar a tela, e aperte Avançar 1 quadro. (o nome do objeto vem do elenco) | **sim** |
| `trail` | Sem limpar, os desenhos velhos ficam | Desenhe o Dino a cada quadro, sem limpar a tela, e deixe o tempo passar. | não |
| `moving` | Limpando e desenhando, o Dino anda | Desenhe o Dino a cada quadro, ligue Limpar a tela antes e deixe o tempo passar. | não |

### Outros campos a mudar

- **Instrução, no preset do Desafio:** "Avance um quadro por vez e olhe a tela e o x da nave".
- **Pergunta final (manifesto), no Desafio:** passa a cobrar o ciclo inteiro, e não só a limpeza.
- **Título da seção que a usa, no Desafio:** "O que é um quadro".

### O que NÃO mudar

O palco e o avanço quadro a quadro com o x exposto na faixa, que é o que faz o ciclo ficar lento o
bastante para ser visto. A frase de sucesso. As duas metas existentes e os pedidos delas. A
obrigatoriedade no Corre Dino. E não acrescentar vídeo à seção do Desafio: a cena ensina isso melhor
do que a narração, e a análise tira o vídeo de propósito.

### Presets por aula

| | Corre, Dino! Aula 2 | Desafio Dia 1 |
|---|---|---|
| Elenco | Dino | nave |
| Cenário | `corre-dino` | `nave` |
| Metas cobradas | `frozen`, `trail`, `moving` | `frozen`, `trail`, `moving` |
| Título e instrução | de fábrica | "O que é um quadro", instrução nova |
| Vídeo na seção | conforme a aula | nenhum, de propósito |

---

## `fill-stroke` · A cor de dentro e a linha de fora

**Estado hoje:** grupo `art`. Manipula o preenchimento e o contorno da pedra. Tem **2 metas**:
`only-stroke` ("Deixou o preenchimento em Sem cor", pedido "Deixe só o preenchimento em Sem cor.") e
`both` ("Voltou as duas partes com cor"). Três pistas, pergunta extra ("E se as duas partes ficarem em
Sem cor ao mesmo tempo?"), a ação `ink`, e um roteiro de demonstração cujos passos são numerados
`step-1`, `step-3` e `step-4`: **não existe `step-2`**. A aula usa a cena hoje como demonstração no
meio do texto, com um botão Ver acontecer que toca as quatro partes de uma vez, e nenhuma meta é
cobrada.

**Correção ao que a análise da aula afirma:** a análise da Meu Jeito Aula 4 diz que a cena tem "três
metas no motor (`only-fill`, `only-stroke`, `both`)". O catálogo tem duas. **`only-fill` não existe.**
O buraco na numeração do roteiro é o rastro do mesmo sumiço: o passo 1 mostra o contorno em Sem cor,
que é exatamente a meta que falta, e o passo seguinte registrado já é o preenchimento em Sem cor.

**Gravidade:** quebra a aula. A seção conclui quando "as três metas de `fill-stroke` caem", só existem
duas, e no formato atual nenhuma das duas é cobrada.

**Usada em:** O Jogo do Meu Jeito, Aula 4 (uso único).

### O que muda

1. **Criar a meta `only-fill`**, que é a primeira metade do conceito e o primeiro passo do roteiro.
2. **Promover de demonstração a experimentação, e tirar o botão Ver acontecer.** Não há processo no
   tempo a acompanhar: há duas chaves para virar e um estado de volta. A frase do critério se escreve
   inteira, "quando eu deixo o contorno em Sem cor, sobra o preenchimento; quando eu deixo o
   preenchimento em Sem cor, sobra a linha e dá para ver o fundo por dentro".
3. **A pergunta que conta para concluir passa a ser a que hoje está no quiz final:** "Deixar o Contorno
   em Sem cor faz o quê?", com "Tira a linha de fora e mantém o preenchimento" (correta) e "Apaga
   todas as formas do desenho". Assim a ideia é cobrada uma vez só, no lugar onde ela acabou de sentir.
4. **Texto da instrução:** ela fala em "pedra", e nesta aula a criança ainda não traçou a dela. Ou
   trocar por "a pedra desta bancada", ou a fala do `dialogue` da seção deixa claro que a pedra da
   cena não é a dela e que nada do que ela fizer ali muda o desenho.
5. **Renumerar os passos do roteiro em sequência**, se ele continuar existindo, porque o buraco do
   `step-2` é o rastro do sumiço da meta.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `only-fill` | Deixou o contorno em Sem cor | Deixe só o contorno em Sem cor. | **sim** |
| `only-stroke` | Deixou o preenchimento em Sem cor | Deixe só o preenchimento em Sem cor. | não |
| `both` | Voltou as duas partes com cor | Depois de deixar uma parte em Sem cor, volte as duas com cor. | não |

A meta nova entra **primeiro**, porque a instrução de abertura já manda começar pelo contorno.

### Outros campos a mudar

- **Pergunta final (manifesto):** texto novo no item 3 acima. A pergunta sai do quiz final da aula.
- **Instrução:** conforme o item 4.
- **Formato do bloco:** experimentação, sem botão Ver acontecer.

### O que NÃO mudar

O palco: a pedra da bancada com fundo quadriculado atrás, que existe para o Sem cor não parecer
branco. As três pistas, que já descrevem a escada certa. A frase de sucesso. A pergunta extra. E o
cenário `meu-jeito` sem personagem do elenco.

### Presets por aula

Uso único. Esta cena serve de novo na Aula 5 do mesmo curso, quando a chama externa e a interna
recebem cores próprias, e em qualquer curso futuro de vetor no Pinta.

---

## `frames` · Dois desenhos viram movimento

**Estado hoje:** grupo `art`. Manipula qual quadro aparece, a prévia tocando e a velocidade dela. Tem
**4 metas**: `two-drawings`, `movement`, `paused-one` e `slow-shows-two`. Três pistas em escada,
pergunta extra ("E se os dois quadros fossem iguais? O fogo ainda ia pulsar?"), roteiro de
demonstração com três passos e as ações `advance`, `frame`, `play` e `rate`. Hoje a aula usa a cena
como **demonstração guiada**, e **nenhuma das quatro metas é cobrada**.

**Gravidade:** quebra a aula. A seção conclui quando "as cinco metas de `frames` caem": existem quatro
e o formato atual não cobra nenhuma.

**Usada em:** O Jogo do Meu Jeito, Aula 3 (uso único no redesenho). Reuso previsto na Aula 5 do mesmo
curso, quando o asteroide ganha dois quadros, e na Aula 7, quando a animação passa a tocar dentro do
jogo.

### O que muda

1. **Promover a experimentação.** A frase do critério se escreve inteira: "quando eu ponho a
   velocidade em 8, paro de ver dois desenhos e passo a ver o fogo pulsar". Parar a prévia rápida e
   encontrar um quadro só na tela é a prova do conceito, e ela precisa fazer isso com a mão, não
   assistir.
2. **Criar a meta `same-frames`**, que é a pergunta extra de fábrica promovida a meta. É o ajuste que
   apaga uma seção inteira: com ela, o `quadros.html` fica desnecessário, e esse HTML já está na lista
   de material redundante a remover.
3. **A pergunta que conta para concluir passa a ser a que hoje está anexada ao iframe**, reescrita para
   a cena: "Duplicar o quadro já basta para o fogo parecer pulsar?", com "É preciso mudar o fogo num
   dos dois quadros" (correta) e "Sim, dois desenhos iguais trocando depressa já pulsam".
4. **Ação nova no motor:** uma que iguale o quadro 2 ao quadro 1 e permita voltar, ao lado do `frame`
   e do `rate` que já existem. O palco não muda.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `two-drawings` | Com a prévia parada, olhou o quadro 1 e o quadro 2 | Com a prévia parada, passe do quadro 1 para o quadro 2. | não |
| `movement` | Rápido, viu o fogo pulsar | Ponha a velocidade em 8 e deixe a prévia tocar. | não |
| `paused-one` | Parou a prévia rápida e viu um quadro só | Com a prévia rápida tocando, pare a prévia. | não |
| `slow-shows-two` | Devagar, viu um quadro e depois o outro | Ponha a velocidade em 2, ligue a prévia e espere. | não |
| `same-frames` | Com os dois quadros iguais, o fogo parou de pulsar | Deixe o quadro 2 igual ao quadro 1 e ligue a prévia rápida. | **sim** |

### Outros campos a mudar

- **Formato do bloco:** experimentação, sem a demonstração guiada.
- **Pergunta final (manifesto):** texto novo no item 3 acima, vindo do iframe que sai.
- **Ponto a decidir por quem for corrigir:** a meta nova nasce da pergunta extra de fábrica. Com ela
  virando meta, a `pergunta_extra` passa a perguntar o que a criança acabou de derrubar. Ou sai, ou é
  reescrita para outro ângulo.

### O que NÃO mudar

O palco, que desenha a nave 32 × 32 com o fogo, ou seja, o objeto da própria aula. As quatro metas e
os pedidos delas. As três pistas em escada. A frase de sucesso. O palpite de fábrica. E o fato de a
cena desenhar o mesmo objeto da `onion-skin`, que é da mesma aula: isso é acerto e precisa continuar.

### Presets por aula

Uso único. Cenário `meu-jeito`, sem personagem do elenco.

---

## `game-state` · O relógio na tela de início

**Estado hoje:** experimentação, grupo `events`. Manipula a peça Criar cacto, a caixa Se jogando e o
começo da partida. Tem **3 metas**: `outside` ("Nasceram cactos antes de começar"), `waiting` ("No
início, nada nasceu por 2 segundos") e `playing` ("Jogando, voltou a nascer"). Três pistas, pergunta
extra ("E se você voltar ao início depois de jogar?"), roteiro de demonstração com dois passos e as
ações `advance`, `connect` e `start`. O palco tem um contador "0 cactos criados até agora", hoje só
como estado inicial.

**Correção ao diagnóstico herdado, e ela importa para priorizar:** não é verdade que a cena nunca foi
ligada em aula nenhuma. Ela **está ligada no Corre, Dino! Aula 7**, na seção 5, depois da manobra mais
difícil do curso. O que nunca aconteceu foi a ligação **no Desafio**: lá a mesma comparação foi
refeita num HTML com dois botões fixos e três passos (`telas.html`), e a cena nativa ficou de fora.

**Gravidade:** prejudica o aprendizado. As três metas existem e caem. Os defeitos são de posição, de
vocabulário e de duplicação: um curso a usa tarde demais, o outro a substituiu por um HTML que ensina
menos, porque lá a criança escolhe entre duas situações prontas e nunca move a peça de criar para
dentro da condição, que é o gesto que ela vai repetir três vezes no Estúdio dez minutos depois. Some
a isso que as metas da cena caem por ação registrada, enquanto o estado do HTML é participação
informada pelo cliente.

**Usada em:** Corre, Dino! Aula 7 (hoje na seção 5, passa para a seção 3) e Desafio Dia 5 (entra no
lugar do HTML da seção 4). Avaliada e **recusada** como par da `score` no Dia 5, para não mostrar a
mesma relação duas vezes na mesma aula.

### O que muda

1. **Posição no Corre Dino:** sai da seção 5 e vai para a seção 3, antes da manobra. Ela deixa de ser
   a revelação de um problema e passa a ser a metade concreta da explicação do Se. Hoje a criança
   atravessa a montagem mais difícil do curso antes de a ideia virar concreta.
2. **Vocabulário:** a caixa passa a ler `Se o estado do jogo é jogando`, porque o bloco da edição
   atual se chama `o estado do jogo é __ ?`, em Jogo 2D › Jogo e telas › Telas e partida.
3. **"Tela de início" vira "no início" no preset do Corre Dino Aula 7**, porque naquela aula nenhuma
   tela é desenhada ainda: o que existe é um estado com esse nome. Vale para a instrução, as pistas,
   os rótulos e o enunciado da pergunta final.
4. **O contador vira protagonista.** "Cactos criados" fica rotulado e visível o tempo todo, ao lado do
   palco. É ele que torna visível justamente aquilo que o jogo dela não mostra. Sem esse número à
   vista, a meta `waiting` vira uma tela parada olhando outra tela parada.
5. **A faixa passa a mostrar três leituras**, que é a melhor coisa do HTML que sai: toques do relógio,
   nascimentos e a resposta da pergunta, no formato "3 toques do relógio, 0 nascimentos, condição
   falsa". É isso que mostra que o relógio continua tocando enquanto nada nasce.
6. **Elenco parametrizado:** o título e os textos escrevem "cacto" e "Criar cacto".
7. **O HTML sai.** `telas.html` e o `interacoes/telas-pontos.html` da lista de material redundante são
   superados por esta cena e pela `score`.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `outside` | Corre Dino: "Nasceram cactos antes de começar" · Desafio: "Sem a pergunta, as pedras nasceram antes de começar" | No início, com Criar cacto fora do Se, deixe o tempo passar. | não |
| `waiting` | Corre Dino: "No início, nada nasceu por 2 segundos" · Desafio: "Com a pergunta, o relógio tocou três vezes e nenhuma pedra nasceu" | Leve Criar cacto para dentro de `Se o estado do jogo é jogando` e deixe o tempo passar 2 segundos no início. | não |
| `playing` | Corre Dino: "Jogando, voltou a nascer" · Desafio: "Começando a partida, as pedras voltaram a nascer" | Com Criar cacto dentro do Se, comece a partida e deixe o tempo passar. | não |

### Outros campos a mudar

- **Pergunta final (manifesto), no Desafio Dia 5:** "O relógio tocou no momento inicio, mas tem a
  pergunta antes de criar. O que acontece?", com "Cria uma pedra porque o relógio tocou" e "Nenhuma
  pedra é criada" (correta). Explicação ao acertar: "A chamada do relógio acontece do mesmo jeito. É a
  resposta da pergunta que decide se o bloco de dentro age."
- **Instrução e pistas:** o nome da peça e o nome da caixa vêm do elenco e do rótulo do bloco atual.

### O que NÃO mudar

As três metas e os ids. A estrutura do palco, que é sempre a mesma em qualquer curso: uma ação, um
relógio e dois momentos. A pergunta final de fábrica no Corre Dino ("O que faz Criar cacto esperar na
tela de início?"), com o enunciado ajustado para "no início". E não acrescentar vídeo em nenhuma das
duas seções: o contador da cena mostra a relação melhor do que a narração.

### Presets por aula

| | Corre, Dino! Aula 7 | Desafio Dia 5 |
|---|---|---|
| Elenco | personagem Dino, obstáculo cacto | nave e asteroide |
| Cenário | `corre-dino` | `nave` |
| Peça que ela move | `Criar cacto` | `Criar pedra` |
| Relógio do palco | de fábrica | 40 quadros, o mesmo número do Dia 3 |
| Palavra para o momento | "no início" (não existe tela desenhada ainda) | "início", com as telas já existindo |
| Rótulos das metas | de fábrica | reescritos, ver a tabela acima |
| Posição | seção 3, antes da manobra | seção 4, no lugar do HTML |

---

## `gravity` · Faça o Dino voltar ao chão

**Estado hoje:** experimentação, grupo `motion`. Manipula o Dino e a ligação da gravidade. Tem
**1 meta**: `floating` ("Sem gravidade, não parou de subir"). Três pistas, pergunta extra ("E se você
desligar a gravidade no meio da queda?"), roteiro de demonstração com **um passo só** e as ações
`advance`, `connect` e `jump`. O bloco está com `required: false` no manifesto e é, ao mesmo tempo, o
**único critério de conclusão da seção**.

**Gravidade:** quebra a aula. Duas vezes. A seção conclui com duas metas e existe uma. E, por ser
opcional sendo o único critério, ela fecha sem a criança ter feito a atividade que a define, que é o
GRAVE 3 dos achados transversais.

**Usada em:** Corre, Dino! Aula 3 (uso único).

### O que muda

1. **Criar a meta `landed`.** É a metade mais importante e a razão de ser da aula: hoje a cena cobra
   só a subida que não acaba, e não cobra a volta ao chão.
2. **Passar o bloco para obrigatório** (`required: true`).
3. **A honestidade entra antes da cena, no `dialogue` da seção, e não dentro da cena.** O texto
   proposto pela aula: "Isto aqui é um modelo separado, feito para você olhar uma coisa de cada vez.
   Nele, o Dino consegue pular mesmo sem gravidade, porque o que a gente quer ver é o que acontece
   depois do salto. No seu jogo falta essa mesma peça, e é ela que vai trazer o Dino para o chão. Só
   quem está de pé no chão é que consegue pular."
4. **Se o roteiro de demonstração continuar existindo, ele precisa do segundo passo.** Hoje ele tem um
   passo só, espelhando a meta única, e termina no ar.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `floating` | Sem gravidade, não parou de subir | Com a gravidade desligada, faça o Dino pular e espere. | não |
| `landed` | Com gravidade, o pulo voltou ao chão | Com o Dino no ar, ligue a gravidade e espere. | **sim** |

### Outros campos a mudar

- **`required`:** de `false` para `true`.
- **Roteiro de demonstração:** segundo passo, conforme o item 4.

### O que NÃO mudar

A correção já registrada, e que está certa: quem faz o pulo é a criança, e ela liga a gravidade com o
Dino no ar. A instrução de abertura, as três pistas, a pergunta final, a explicação, a frase de
sucesso e a pergunta extra. O palco começando com o Dino parado no chão e a gravidade desligada.

### Presets por aula

Uso único. Elenco: Dino. Cenário: `corre-dino`. Nota vizinha, que não é da cena: a explicação da
bolinha jogada para cima sai do clipe da gravidade justamente porque esta cena faz melhor.

---

## `hitbox` · Onde a batida acontece?

**Estado hoje:** experimentação, grupo `collision`. Manipula a Distância do cacto e o Tamanho da área
do Dino. **A lista de metas está vazia.** Tem três pistas (a terceira já descreve a descoberta dos
80%), pergunta extra ("Com a área em 80%, traga o cacto de novo. Quando aparece BATEU agora?"),
roteiro de demonstração com dois passos e as ações `move` e `resize`. O palco **não declara de onde a
área parte**, e o bloco vem com `required: false` no manifesto.

**Gravidade:** quebra a aula. É uma das três cenas do catálogo inteiro com a lista de metas vazia (as
outras duas são `delta-time` e `circle-collision`). A seção *Ajuste só a área de colisão* conclui sem
que nada precise acontecer, e o maior conceito da aula passa de raspão dentro de uma seção sobre
arrastar um bloco para a lixeira.

**Usada em:** Corre, Dino! Aula 10 (uso único).

### O que muda

1. **Criar as três metas.** Hoje são zero.
2. **O palco declara o ponto de partida:** a área do Dino abre em **100%**, igual à do jogo dela antes
   do conserto, e o cacto começa a 149 de distância, como já está. Assim o primeiro movimento dela na
   cena é o mesmo movimento da aula, que é diminuir.
3. **O outro lado do dial entra na cena, com a `too-small`.** Ela é a imagem espelhada da `early-hit`
   e é o que transforma o controle num dial de verdade: um extremo acusa batida que não houve, o outro
   ignora batida que houve, e no meio a conta bate com o que o olho vê. Sem ela, a cena ensina que
   menor é sempre melhor, que é exatamente o que o README do curso manda não ensinar.
4. **Passar o bloco para obrigatório** (`required: true`).

### Metas depois do ajuste

> **Construído, e diverge desta tabela nos ids. O código vence** (conferência de 19/09/2026 contra
> `catalog.ts`). A missão de fábrica da cena é **`contact`, `area-contrast` e `too-small`**. Os ids
> `early-hit` e `fair-hit` também existem, com estes rótulos e estes pedidos, mas marcados
> `soNoCaso`, isto é, fora da missão de fábrica e só valendo quando um bloco os declara em
> `setup.goals`. A diferença não é só de nome: os pedidos de `contact` e `area-contrast` **não
> contam o resultado nem entregam o número**, pela regra do catálogo de que o pedido diz o gesto e
> nunca a descoberta ("até aparecer BATEU" é a resposta do palpite da própria cena). Os rótulos ao
> cair, que é o que a criança lê depois, são os desta tabela. A Aula 10 do Corre, Dino! cobra a
> missão de fábrica, sem declarar `setup.goals`.

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `contact` (era `early-hit`) | BATEU com os desenhos ainda longe | Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez. | **sim** |
| `area-contrast` (era `fair-hit`) | Área menor, mesmo lugar: a batida sumiu | Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino. | **sim** |
| `too-small` | Os desenhos se tocam, e o jogo disse que não bateu | Encoste o cacto no desenho do Dino e deixe o Tamanho da área do Dino em 40%. | **sim** |

### Outros campos a mudar

- **Instrução de abertura.** De "Traga o cacto um toque de cada vez até aparecer BATEU. Depois deixe o
  cacto no mesmo lugar e mude só a área do Dino." para "Traga o cacto um toque de cada vez até
  aparecer BATEU. Depois deixe o cacto no lugar e mude só o tamanho da área do Dino, para baixo e para
  cima."
- **Terceira pista.** Passa a cobrir o extremo de baixo: "Agora encoste o cacto no desenho do Dino e
  leve a área para 40%. Olhe se aparece BATEU." As duas primeiras continuam.
- **Frase de sucesso.** De "O Dino ficou do mesmo tamanho. Só a área mudou, e a batida ficou justa!"
  para "O Dino ficou do mesmo tamanho o tempo todo. Quem mandou na batida foi a área, e o tamanho dela
  é escolha sua."
- **Explicação ao acertar (manifesto), ajustada:** "O desenho é para os olhos, a área é para a conta.
  O tamanho da área é um número seu: menor perdoa mais, maior perdoa menos."
- **`required`:** de `false` para `true`.

### O que NÃO mudar

O palco e os controles, que servem. O palpite ("Com esta área grande, quando vai aparecer BATEU?",
com "Antes de os desenhos se encostarem" correta). A pergunta final ("O que o jogo usa para saber que
houve batida?", com "Áreas invisíveis em volta de cada um" correta). As duas primeiras pistas. A
distância inicial de 149. O elenco de fábrica, personagem Dino e obstáculo cacto.

### Presets por aula

Uso único. Cenário `corre-dino`. Dois vizinhos que andam com esta cena e não são dela: a seção 3 de
hoje (*O contorno e o desenho são iguais?*) é um clipe parado que faz pior o que a cena faz, e sai; e
o critério de entrega cobra `PERCENT: 80` exato enquanto a referência do curso declara campo livre de
70 a 85, então o critério precisa aceitar a faixa.

---

## `impulse` · Escolha a altura do salto

**Estado hoje:** experimentação, grupo `motion`. Manipula o impulso do salto e o Dino. Tem **1 meta**:
`first-height` ("Um salto chegou ao chão"). Três pistas, pergunta extra ("Agora faça um salto que
passe da marca azul e fique abaixo de 150."), roteiro de demonstração com dois passos (o segundo já é
a comparação que falta como meta) e as ações `advance`, `impulse` e `jump`. O bloco está com
`required: false` sendo o único critério de conclusão da seção.

**Gravidade:** quebra a aula. A seção conclui com duas metas e existe uma, e a cena é opcional sendo o
único critério. Hoje a cena cobra apenas que um salto terminou, o que acontece sozinho.

**Usada em:** Corre, Dino! Aula 3 (uso único).

### O que muda

1. **Criar a meta `compare`.** A comparação **é** a cena: sem ela, a criança pode concluir a seção sem
   nunca ter trocado o impulso.
2. **Passar o bloco para obrigatório** (`required: true`).

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `first-height` | Um salto chegou ao chão | Faça o Dino pular e espere o salto terminar. | não |
| `compare` | Outro impulso, marca bem diferente | Pule com impulso 9 e depois com impulso 14. | **sim** |

### Outros campos a mudar

- **`required`:** de `false` para `true`.

### O que NÃO mudar

O isolamento da variável, que é o acerto central: a gravidade fica igual e só o impulso muda. A marca
do salto anterior no palco, que faz a comparação não depender de memória. O palpite de fábrica (68 de
altura com impulso 9, mais de 150 com impulso 14), que é bom justamente porque a criança quase sempre
chuta proporcional e erra. A instrução, as pistas, a frase de sucesso e a pergunta extra. E o palco
começando com o impulso em 9.

### Presets por aula

Uso único. Elenco: Dino. Cenário: `corre-dino`. Duas notas para quem for corrigir, e elas são de fala
e de critério, não da cena:

- **Calibração:** a cena usa 9 e 14, e o jogo dela usa 2, 30 e 14. Não alegar equivalência numérica
  entre os dois. A cena é um modelo, e a aula já diz isso.
- **Critério da aula:** o campo da força do pulo é declarado livre de 12 a 18 e o critério exige 14
  exato. Quem aceitar o convite do vídeo reprova. O critério passa a aceitar a faixa.

---

## `jump-sound` · O som acompanha o pulo

**Estado hoje:** experimentação, grupo `events`. Manipula "A peça Tocar som, o Dino e a tecla Espaço".
Tem **6 metas**, todas bem escritas: `false-sound`, `silent-jump`, `quiet-air`, `key-sound`,
`tap-sound` e `every-jump`. Três pistas, pergunta extra, roteiro de demonstração com dois passos e as
ações `advance`, `connect` e `jump`. A cena conta os sons com ♪.

**Gravidade:** prejudica o aprendizado. As metas existem e a seção fecha. O defeito é de rótulo, e ele
é caro: a cena fala de uma peça chamada "Tocar som", e a peça do Estúdio se chama **`Tocar efeito`**,
em Jogo 2D › Som › Efeitos prontos, com a opção `pulo`. A criança vai procurar "Tocar som" na coluna
da esquerda cinco minutos depois de sair da cena e não vai achar. Junto vem um problema de acesso: a
dor desta aula é inteiramente sonora, e quem está sem áudio não consegue fazer a cena.

**Usada em:** Corre, Dino! Aula 4. Avaliada e **recusada** no Desafio Dia 2, porque lá o som mora
dentro do mesmo evento que cria o tiro e não existe um segundo lugar possível para montar a
comparação: o foco da cena é escolher entre dois gatilhos, e no Dia 2 só há um.

### O que muda

1. **Trocar "Tocar som" por `Tocar efeito`** na instrução, no campo `manipula`, nos pedidos das seis
   metas, nas três pistas, na frase de sucesso, na pergunta final e nos dois passos do roteiro de
   demonstração.
2. **Instrumento visível:** acrescentar um contador de pulos ao lado do contador de sons, com a mesma
   marca do ♪. Sem os dois lado a lado, a cena depende do áudio para ser feita.
3. **Trocar a pergunta extra**, que hoje repete a meta `quiet-air` que a criança acabou de derrubar,
   por: "E se alguém abrir o seu jogo no celular e pular tocando na tela? Qual dos dois eventos toca o
   som?"

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `false-sound` | Som sem pulo | Com `Tocar efeito` em Quando apertar Espaço, aperte Espaço duas vezes no mesmo pulo. | não |
| `silent-jump` | Pulo sem som | Com `Tocar efeito` em Quando apertar Espaço, pule tocando no Dino. | não |
| `quiet-air` | Sem pulo novo, o som esperou | Com `Tocar efeito` em Quando o Dino pular, aperte Espaço duas vezes no mesmo pulo. | não |
| `key-sound` | Com o som no pulo, a tecla fez pulo e som | Com `Tocar efeito` em Quando o Dino pular, pule pela tecla Espaço. | não |
| `tap-sound` | Com o som no pulo, o toque fez pulo e som | Com `Tocar efeito` em Quando o Dino pular, pule tocando no Dino. | não |
| `every-jump` | Um som em cada pulo, por tecla e por toque | Leve `Tocar efeito` para Quando o Dino pular. Depois pule pela tecla Espaço e tocando no Dino. | não |

Nenhuma meta é criada nem removida. A Aula 4 cobra **três**: `false-sound`, `silent-jump` e
`every-jump`. As outras três continuam no motor, disponíveis para outro uso.

### Outros campos a mudar

- **Pergunta extra:** texto novo no item 3 acima.
- **Palco:** contador de pulos ao lado do contador de sons.

### O que NÃO mudar

As seis metas, os ids e os rótulos, que estão bem escritos. O contador de sons com ♪. O elenco: a cena
já é de Dino e não precisa de elenco novo.

### Presets por aula

Uso único. Elenco: Dino. Cenário: `corre-dino`.

---

## `layers` · Quem fica na frente?

**Estado hoje:** experimentação, grupo `world`. Instrução "O Dino está escondido. Mude a ordem de
desenhar e faça o Dino aparecer." Manipula "A ordem de desenhar do Dino e da floresta". Tem **3
metas**: `front` ("O Dino apareceu na frente"), `covered` ("Escondeu de novo só trocando a ordem") e
`back-in-front` ("No jogo, quem é desenhado por último fica na frente"). Três pistas, pergunta extra
("E se fossem três peças? Quem ficaria por cima de todas?"), roteiro de demonstração com três passos e
a ação `layer`. No Corre Dino o bloco está com `required: false` sendo o único critério de conclusão
da seção.

**Gravidade:** quebra a aula, por três motivos somados, um em cada curso. No Desafio, o papel
`scenery` do cenário `nave` traz o tiro de fábrica, então a cena abriria com um tiro no lugar do fundo
de estrelas. No Meu Jeito, o rótulo da terceira meta afirma uma coisa sobre um jogo que não existe
naquela tela. No Corre Dino, a cena é opcional sendo o único critério da seção.

**Usada em:** Desafio Dia 1 (depois da montagem, como contrafactual), Corre, Dino! Aula 2, e O Jogo do
Meu Jeito Aula 5, no modo `camadas` do Pinta. É a cena deste lote com mais usos, e a única que roda em
dois modos diferentes.

### O que muda

1. **Elenco do Desafio, e é o ajuste que salva o palco.** Declarar `hero` como a nave e **declarar
   explicitamente a figura do fundo de estrelas** no papel `scenery`, porque nesse cenário o papel já
   vem de fábrica como o tiro. Sem a figura declarada, a cena abre com um tiro fazendo o papel de
   cenário. O cenário do palco é `nave`.
2. **O modo `camadas` inverte a leitura da lista, e os textos precisam acompanhar.** No jogo, quem está
   no fim da ordem de desenhar fica na frente. No painel **Camadas** do Pinta, a de cima na lista é a
   que aparece na frente. Então, no modo `camadas`:
   - o rótulo de `back-in-front` passa de "No jogo, quem é desenhado por último fica na frente" para
     "A de cima na lista é a que aparece na frente";
   - os pedidos das três metas passam a falar em "uma camada para trás" e "uma camada para a frente",
     que são os nomes dos botões do Pinta;
   - as pistas 2 e 3 ("Quem está embaixo é desenhado por último" e "Leve o Dino para o fim da lista")
     invertem junto, senão a cena manda a criança para o lado errado da lista.
   - **Conferir antes de escrever:** se o motor já troca esses textos no modo `camadas`, ou se eles
     precisam ser passados no bloco. Enquanto isso não for conferido, o texto do modo `camadas` não
     pode ser dado como resolvido.
3. **Derivado do item 2, e a análise da Aula 5 não cita:** a frase de sucesso ("Só a ordem mudou: quem
   é desenhado por último fica por cima, e ninguém foi apagado!") cai na mesma armadilha, porque fala
   de desenho de jogo. Ela precisa da versão do modo `camadas`.
4. **Passar o bloco para obrigatório no Corre Dino Aula 2** (`required: true`).
5. **Posição no Meu Jeito:** sai da seção 2 e vai para a seção 3, **depois** de a chama nascer cobrindo
   a pedra, para a instrução de abertura ("A chama está cobrindo a pedra") ser verdade no desenho dela
   na hora em que ela lê.
6. **As palavras Dino e floresta saem dos textos e vêm do elenco:** instrução, `manipula`, rótulos de
   `front` e `covered`, pistas e os três passos do roteiro.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `front` | O Dino apareceu na frente (nome do elenco) | modo jogo: "Leve o Dino para o fim da ordem de desenhar." · modo camadas: "Leve a pedra uma camada para a frente." | não |
| `covered` | Escondeu de novo só trocando a ordem | modo jogo: "Com o Dino no fim da ordem de desenhar, leve a floresta para o fim." · modo camadas: "Leve a pedra uma camada para trás." | não |
| `back-in-front` | modo jogo: "No jogo, quem é desenhado por último fica na frente" · modo camadas: "A de cima na lista é a que aparece na frente" | modo jogo: "Leve o Dino de novo para o fim da ordem de desenhar." · modo camadas: "Traga a pedra de novo uma camada para a frente." | não |

Nenhuma meta é criada. Os três ids continuam iguais nos três usos, e o que varia é o texto por modo e
por elenco.

### Outros campos a mudar

- **Instrução, pistas, `manipula`, frase de sucesso e roteiro:** por elenco e por modo, conforme os
  itens 2, 3 e 6.
- **Elenco (manifesto) no Desafio:** `hero` nave, `scenery` com figura declarada (fundo de estrelas).
- **`required` no Corre Dino Aula 2:** de `false` para `true`.

### O que NÃO mudar

Os três ids de meta. A pergunta final e a explicação. A pergunta extra. A ideia central de que ninguém
é apagado e só a ordem muda. E o arranjo invertido do Desafio Dia 1: a cena vem **depois** da montagem,
porque a ordem certa já está no jogo dela e a cena existe para provar o contrafactual sem estragar o
que ela montou. Esse é o único caso invertido daquela aula, e a inversão é o conteúdo.

### Presets por aula

| | Desafio Dia 1 | Corre, Dino! Aula 2 | Meu Jeito Aula 5 |
|---|---|---|---|
| `hero` | nave | Dino | pedra |
| `scenery` | fundo de estrelas, **figura declarada** | floresta | chama |
| Cenário do palco | `nave` | `corre-dino` | `meu-jeito` |
| Modo da lista | jogo | jogo | `camadas` |
| Posição | depois da montagem, como contrafactual | na seção do `Desenhar o sprite` | seção 3, depois de a chama cobrir a pedra |
| Obrigatória | sim | sim (hoje `false`) | sim |
| Metas cobradas | `front`, `covered`, `back-in-front` | `front`, `covered`, `back-in-front` | `front`, `covered`, `back-in-front` |

---

## `lives` · O que a batida muda?

**Estado hoje:** experimentação, grupo `events`. Manipula a peça Somar ponto, a peça Perder uma vida e
as batidas. Tem **3 metas**: `life-lost` ("A batida tirou uma vida"), `points-stay` ("Os pontos
ficaram, mesmo perdendo vida") e `over` ("Sem vidas, a partida acabou."). Três pistas, pergunta extra,
roteiro de demonstração com três passos, o terceiro dizendo "Mais duas batidas: acabaram os corações e
a partida", e as ações `advance`, `collide` e `connect`.

**Gravidade:** prejudica o aprendizado, e hoje **não quebra nenhuma aula, porque nenhuma das 27 a
usa**. Ela era cobrada no Desafio Dia 4 e foi retirada de lá: a meta `over` afirma sobre o jogo dela
uma coisa que ela pode conferir e descobrir que é mentira, porque naquele dia as vidas chegam a zero e
a partida continua, já que a tela de fim só existe no Dia 5.

**Usada em:** nenhuma aula do redesenho. Retirada do Desafio Dia 4. Avaliada e **recusada** no Desafio
Dia 5, onde a meta `over` já seria verdadeira, porque aquela é a aula mais carregada do curso, a
relação entre vidas e fim de partida aparece no teste completo da seção 8, e cada cena a mais empurra
a pausa para mais longe. Ela continua servindo ao Corre, Dino!, onde nasceu, e aos cursos com vida e
fim de partida (curso 3, Duelo de Heróis, e curso 6, Sobrevivente).

### O que muda

1. **`over` vira meta de caso, cobrada só onde a partida realmente acaba.** É a mesma solução que
   resolve o elenco: o que é verdade em um jogo e mentira em outro não pode ser meta de fábrica. Sem
   isso, o primeiro curso que ligar a cena antes de ter tela de fim repete o defeito do Dia 4.
2. **O passo 3 do roteiro de demonstração acompanha a meta.** "Mais duas batidas: acabaram os corações
   e a partida" só pode aparecer no mesmo caso em que `over` é cobrada.
3. **Tirar o ponto final do rótulo de `over`.** "Sem vidas, a partida acabou." é o **único rótulo com
   ponto final entre as 85 metas de todo o catálogo**. É detalhe pequeno e é o tipo de coisa que a
   faixa mostra em letra grande.
4. **Elenco parametrizado:** os textos escrevem Dino e cacto, como nas outras cenas deste lote.

### Metas depois do ajuste

| id | rótulo quando cai | pedido que a faixa mostra | é nova? |
|---|---|---|---|
| `life-lost` | A batida tirou uma vida | Leve Perder uma vida para Quando bater e bata no cacto. | não |
| `points-stay` | Os pontos ficaram, mesmo perdendo vida | Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois bata no cacto com Perder uma vida em Quando bater. | não |
| `over` | Sem vidas, a partida acabou | Com Perder uma vida em Quando bater, bata até não sobrar nenhuma vida. | não, mas passa a ser **meta de caso** |

### Outros campos a mudar

- **Roteiro de demonstração:** o passo 3 acompanha a meta de caso.
- **Instrução, pistas e frase de sucesso:** nome do elenco parametrizado.

### O que NÃO mudar

As duas primeiras metas e a ideia central, que é boa e não tem substituta no catálogo: ponto e vida
são duas contagens separadas, e cada uma muda pelo seu próprio motivo. A frase de sucesso. As três
pistas. O palco com as duas contagens à vista.

### Presets por aula

Nenhum no redesenho atual, e isso é a decisão a registrar: a cena fica **órfã**. Ou ela é ligada no
primeiro curso da trilha que tenha vidas e fim de partida, ou fica no catálogo sem uso. O que não vale
é ligá-la no Desafio Dia 5 só para não perdê-la, pelo motivo já registrado na análise daquela aula.
Quando for ligada, `over` só entra onde a partida realmente acaba.

---

## Ordem de correção sugerida

Critério: primeiro o que impede uma seção de concluir hoje ou faz a cena abrir errada, depois o que
afirma coisa falsa, depois rótulo e vocabulário que mandam a criança procurar o que não existe, e por
fim posição e formato. Dentro de cada nível, quem serve mais aulas vem antes.

| # | Cena | Por que aqui |
|---|---|---|
| 1 | `hitbox` | Zero metas. A seção que sustenta o maior conceito da aula fecha sem a criança fazer nada, e ainda é opcional |
| 2 | `layers` | Três aulas. No Desafio abre com a figura errada, no Meu Jeito afirma uma coisa sobre um jogo que não está na tela, e no Corre Dino é opcional sendo o único critério |
| 3 | `cleanup` | Duas aulas, duas concluem com uma meta que não existe. A cena fecha na dor sem a ferramenta, e a saída do palco contradiz o jogo de um dos dois cursos |
| 4 | `draw-loop` | Duas aulas. Falta a meta que é o conceito raiz, e o roteiro já entrega o que a cena não cobra |
| 5 | `fill-stroke` | Falta uma meta que a análise da aula supõe existir, e o buraco no roteiro confirma o sumiço. No formato atual nenhuma meta é cobrada |
| 6 | `frames` | Falta uma meta e nenhuma das quatro é cobrada hoje. Conserta a aula e apaga um HTML redundante |
| 7 | `gravity` | Falta a metade que dá nome à cena, e ela é opcional sendo o único critério |
| 8 | `impulse` | Mesma dupla falha da `gravity`, na mesma aula, e a meta que existe cai sozinha |
| 9 | `acceleration` | Falta a meta que é a razão de ser da cena, mais a ordem das descobertas e o elenco não declarado |
| 10 | `game-state` | Nada falta no motor. Está tarde demais num curso e ausente no outro, onde um HTML pior ocupa o lugar dela |
| 11 | `jump-sound` | Manda a criança procurar um bloco com um nome que a paleta não usa mais, e depende de áudio para ser feita |
| 12 | `coordinates` | Uma aula cobra uma meta de três, e o texto fala de dino num curso de nave |
| 13 | `controls` | Só o palpite, que chega depois de ela já ter vivido a resposta no jogo dela |
| 14 | `lives` | Não quebra nada hoje porque nenhuma aula a usa. Consertar antes do primeiro reuso, e decidir se ela é ligada em algum curso |
