# Proposta: as experiências e demonstrações que a trilha inteira vai pedir

Segundo estudo do Brilliant (15/09/2026), retrato do que já existe e plano para os três cursos de
hoje **e** para os 48 da trilha.

Continua [proposta-experiencias.md](proposta-experiencias.md), de 14/09, que registra os lotes 1 a
4 (os sete ajustes de design, o elenco, a previsão e as dez cenas novas) — todos implementados. O
que está aqui **não repete** aquilo: é o que veio depois.

---

## 1. O retrato de hoje, medido

Levantamento sobre os 27 manifestos `*-v6` em 15/09/2026, **antes** do lote A — é o retrato que
esta proposta partiu para atacar. O que o lote A já executou está marcado ao longo do §4.1.

| Curso | Seções | Interativas | Cenas nativas | HTML | Perguntas | Clipes planejados |
| --- | --- | --- | --- | --- | --- | --- |
| Desafio do Primeiro Jogo | 78 | 8 | 2 | 6 | 0 | 61 |
| Corre, Dino! | 128 | 18 | 18 | 0 | 0 | 88 |
| O Jogo do Meu Jeito | 76 | 34 | 3 | 6 | 25 | 55 |
| **Total** | **282** | **60** | **23** | **12** | **25** | **204** |

**O que o lote 1–4 resolveu:** as cenas passaram de 14 para 24, o elenco tirou as cenas do Dino, e
as seções com algo para mexer saíram de 25 para 60. O aumento é real e está em produção de
conteúdo.

**Quatro coisas que o levantamento mostra hoje, e que ninguém pediu ainda:**

- ⚠️ **Duas cenas construídas e não ligadas.** `symmetry` e `pixel-vector` têm ação, motor,
  avaliação, palco, editor e teste — e nenhum manifesto as usa. As seções para as quais elas foram
  feitas (Meu Jeito a2 "um traço, dois lados" e a4 "aproxime as duas bordas") continuam com a
  experiência HTML antiga.
- ⚠️⚠️ **A previsão não está em nenhuma aula.** `block.prediction` existe no core, no DTO, no
  editor do admin e no player. Zero manifestos a declaram. O padrão mais forte do Brilliant está
  construído e desligado.
- ⚠️⚠️ **Catorze roteiros de demonstração prontos, quatro em uso.** Cada modelo de cena traz um
  `script` testado pelo motor (`playsOut` confere que cada `waitFor` acontece de verdade), e
  `corre-dino-v6/demonstracoes-opcionais.json` traz os catorze empacotados. Nenhum manifesto o
  importa. Enquanto isso, **43 seções de demonstração dependem de 43 clipes, e nenhum foi gravado.**
- ⭐ **Nenhuma cena é usada mais de duas vezes.** Só `world` aparece duas (Dino a1 e Desafio d1).
  As outras 23, uma vez cada. O elenco resolveu "a cena só sabe falar de Dino"; não resolveu "a
  cena só serve para uma seção".

---

## 2. Segunda rodada no Brilliant: dez achados novos

Recolhido jogando *Arrays* e *Repetition and Arrays* (Computer Science Fundamentals), *Vector
Shifts* e *Adding Velocities* (Vectors), *Looping With Logic* (Thinking in Code) e *Surface Area*
(Geometry and Measurement). Os dez achados da rodada anterior continuam valendo; estes são novos.

11. **O palco reage ANTES de conferir.** Em *Vector Shifts* a criança preenche `translate by (3,2)`
    e os pontos andam na hora, com o rastro do caminho desenhado. O `Conferir` só confirma o que
    ela já viu acontecer. O botão nem existe enquanto o comando está incompleto.
12. **O erro é diegético.** Em *Looping With Logic*, `repeat 4 times` faz o caminhão passar do fim
    da rua: a faixa de estado do palco, que dizia `2 left`, vira **`⚠ Package lost.`**, e a linha 1
    do programa ganha um ✖ na margem. Três camadas de feedback, todas dentro do mundo: a
    consequência, o estado e a linha responsável. Nenhuma delas é um "X, tente de novo".
13. **Programa numerado e mundo na mesma tela, com teclado de valores permitidos.** Nunca há
    digitação livre de número: a criança escolhe entre `3 · 4 · 5`, ou entre `−5 … 5`. O espaço de
    resposta é pequeno o bastante para caber na cabeça, e o erro de digitação não existe.
14. **A ajuda é conversa, cita o estado da criança e devolve uma pergunta.** No erro, o botão é
    *Get help*; no acerto, *Why?*. Os dois abrem o mesmo painel de tutor: *"Vamos olhar juntos. Seu
    primeiro ponto foi parar em (−2, 2) — mas onde o alvo dele precisa estar?"*. Tem entrada por
    voz, e a explicação nunca bloqueia o `Continuar`.
15. **No acerto, a cena desenha a explicação por cima.** Ao acertar a soma das velocidades, o palco
    acrescenta as duas componentes deslocadas e fecha o paralelogramo: a figura ganha a
    justificativa do resultado. Acertar não é só ficar verde; é ver por quê.
16. **Depois de acertar, libera ▶ Run.** Rever a execução é prêmio, não requisito.
17. **A moldura da página inteira é o feedback** — verde no acerto, âmbar no erro — e quem fala é
    o mascote, num balão junto dele: *"There you go."*, *"Not exactly."*, *"Hmm, double-check your
    work."*.
18. ⭐⭐ **Mesma mecânica, caso novo.** *Coordinate Transformations* tem **39 lições** e três
    mecânicas (transladar, girar, refletir). O que muda de lição para lição é o CASO: outra figura,
    outro alvo, outra restrição, a composição de duas. A escada sobe pela estrutura do problema, e
    o motor não muda nunca.
19. **3D: arrastar para girar, setas, botão de voltar à vista inicial — e uma cor por face.** A
    tarefa de abertura não tem conta nenhuma: *"gire até ver só uma cor. Agora só duas."* É
    orientação espacial pura, e é exatamente o que a porta do 3D (curso 25) precisa.
20. **A animação curta com ▶ Play dentro do texto.** Entre o parágrafo e a simulação existe um
    terceiro formato: dois segundos de animação, sem áudio, sem narração, que a criança dispara e
    repete quantas vezes quiser. Barato de produzir e faz o trabalho de muito clipe.

**Continua de fora:** a acessibilidade deles (a árvore de um exercício de código do Brilliant
devolve dez botões e nenhum é o exercício) e o XP por exercício (a carreira de 8 níveis já ocupa
esse lugar).

---

## 3. Oito melhorias nos modelos que já existem

Nenhuma delas é cena nova. Todas mexem no que já está de pé.

### 3.1 ⭐⭐ Caso e missão por bloco (`setup`) — a alavanca maior

**Hoje** uma cena tem uma missão só. As metas são do modelo, iguais para todo mundo, e a única
coisa que o professor configura é o `initialImpulse` (em duas cenas) e o elenco. Por isso 24 cenas
rendem 25 usos.

**A proposta:** um campo `setup` no bloco, com (a) as condições iniciais dentro dos `SCENE_LIMITS`
que a cena já valida e (b) quais metas do modelo são o alvo desta atividade. A mesma cena vira
outra atividade sem uma linha de motor novo — o mesmo que o elenco fez pelos personagens, o
`setup` faz pelos casos. É o achado 18 aplicado.

O que isso destrava imediatamente, sem cena nova:

| Cena | Missão de hoje | Missão nova pelo `setup` | Onde entra |
| --- | --- | --- | --- |
| `spawn` | dar intervalo ao nascimento | **nascer fora da tela** (dentro × fora) | Dino a5 "Veja onde o cacto começa" |
| `hitbox` | a área do dano, menor que o desenho | **a área da coleta, maior que o desenho** | curso 7 (moedas), Meu Jeito |
| `layers` | quem é desenhado por último fica na frente | **quem está mais embaixo aparece na frente** (ordenar por y) | cursos 7, 15, 23 |
| `game-state` | o relógio dentro de Se jogando | **a tela atual não é o desenho da tela** | Desafio d5 "os quatro momentos" |
| `random` | posição sorteada × velocidade sorteada | **a mesma faixa, sorteios diferentes** (o que repete e o que varia) | Dino a12, curso 8 |
| `score` | pontos só durante a partida | **guardar, mudar e mostrar são três coisas** | Desafio d4 "o número e o placar" |
| `coordinates` | achar o endereço | **levar o personagem até o alvo** (o caso do Brilliant) | Dino a1, Desafio d1 |
| `acceleration` | a base e o limite | **o cacto antigo conserva a velocidade dele** | Dino a13 |

Oito usos novos de oito cenas existentes. ⚠️ O texto de cada missão é conteúdo pedagógico dela: o
`setup` cria o lugar, não escreve a frase.

### 3.2 O botão em destaque do rodapé é "Uma pista"

O ajuste 1 do lote anterior acertou em tirar os quatro botões cinzentos iguais. Mas a única ação
com destaque que sobrou à direita é **pedir dica** — no Brilliant aquele lugar é sempre o caminho
para a frente (*Conferir* → *Continuar*), e a ajuda é secundária.

**A proposta:** o lugar de destaque é de **"Já descobri"**, que roda a avaliação e responde com o
que ainda falta, nomeado como ação ("falta ver o que acontece com o y"). "Uma pista" volta para o
peso das ferramentas. Hoje a cena conclui sozinha quando as metas aparecem, o que é correto, mas
deixa a criança sem gesto de fechamento e sem saber que terminou.

### 3.3 A cena não aceita pergunta anexa, e falta o terceiro tempo

O ciclo do Brilliant tem quatro batidas: manipular → prever → **enunciar a regra** → aplicar. A
previsão entrou no lote 4. O enunciado da regra não existe: `isInteractiveBlock` recusa
`checkpoint` em cena, porque `answers.checkpoint` seria a alternativa escolhida e os pedaços da
sessão na mesma chave. Hoje a regra só cabe numa seção separada, com atividade `question`.

**A proposta:** chave própria (`answers.sceneQuestion`), e a pergunta passa a caber depois da cena,
corrigida pelo servidor, como em todo o resto. É conserto de colisão de nome, não de arquitetura.

### 3.4 Ligar a previsão nas cenas onde o palpite vale mais

Construída e não usada. As seis onde o palpite errado ensina mais: `coordinates` (o y que desce),
`draw-loop` (o rastro), `gravity` (a volta ao chão), `cleanup` (o cacto invisível que continua
existindo), `game-state` (o relógio que já está correndo) e `pixel-vector` (as duas pedras iguais
de longe).

### 3.5 O erro com parâmetro precisa mostrar a diferença

Quando a criança põe `x = 110` e o alvo era 300, a cena mostra o Dino em 110 e a faixa diz
`x = 110`. Falta o que o Brilliant faz: **o alvo continua na tela, ao lado, e a frase nomeia a
diferença** ("faltou andar 190 para a direita"). Vale em `coordinates`, `stage-size`, `impulse`,
`acceleration`, `sheet-vs-sprite` e em toda cena com número — e é o que transforma errar em medir.

### 3.6 Rever como prêmio

"Rever desde o começo" existe na demonstração. Na experimentação, quando a criança fecha as metas,
não há nada para assistir: o ▶ Run do achado 16 é justamente o momento em que ela quer ver a coisa
inteira funcionando com o que ela descobriu.

### 3.7 A pista que cita o estado

`sceneHint` tem a escada fixa de três degraus, e três cenas (`hitbox`, `jump-sound`, `impulse`)
ganharam atalho por estado. O padrão do achado 14 é esse, e deveria valer nas 24: a primeira pista
diz onde a criança está ("seu Dino está em y = 210"), e termina em pergunta.

### 3.8 O terceiro formato: a animação curta inline

Hoje existem dois extremos: o clipe de vídeo (caro, 204 planejados, zero gravados) e a cena
manipulável (cara de construir). Falta o meio: **a cena rodando o roteiro dela sem controles, com
um ▶, dentro do texto da explicação**. O motor já roda roteiros; o que muda é a apresentação. É o
que substitui clipe em "veja a conta da velocidade", "veja o número entrar na frase", "veja o Se e
sua pergunta".

---

## 4. Os cursos de hoje: o que falta

### 4.1 Ligar o que já existe (nenhum código novo)

| Seção | Curso | O que ligar | Tipo | Estado |
| --- | --- | --- | --- | --- |
| "um traço, dois lados" | Meu Jeito a2 | `symmetry` | experimentação | **feito** |
| "aproxime as duas bordas" | Meu Jeito a4 | `pixel-vector` | experimentação | **feito** |
| "onde cortar a folha?" | Meu Jeito a6 | `sheet-vs-sprite` | experimentação | **feito** |
| "a pedra sumiu ou foi coberta?" | Meu Jeito a5 | `layers` + elenco | experimentação | **feito** |
| "uma nave, muitos nascimentos" | Meu Jeito a7 | `spawn` + elenco | demonstração | **feito** |
| "O que acontece sem a borracha?" | Desafio d1 | `draw-loop` + elenco | experimentação | **feito** |
| "Abra espaço entre os asteroides" | Desafio d3 | `spawn` + elenco | experimentação | **feito** |
| "Observe o endereço na tela" | Desafio d1 | `coordinates` + elenco + caso | demonstração | lote B |
| "Observe o número e o placar" | Desafio d4 | `score` + elenco + missão | demonstração | lote B |
| "Observe os quatro momentos do jogo" | Desafio d5 | `game-state` + elenco + missão | demonstração | lote B |
| "Observe quais dois objetos se encontraram" | Desafio d3 | — | — | lote C (`contact`) |

⚠️⚠️ **As 14 demonstrações prontas do Corre Dino NÃO entram.** Conferindo seção por seção, cada
uma delas tem a experimentação da MESMA cena na mesma aula — a demonstração ali entregaria de
graça a descoberta que a seção seguinte existe para provocar, contra a regra "dor antes da
solução". Elas continuam servindo a quem monta uma aula nova, que é para o que foram feitas. O que
aquelas 14 seções pedem são cenas que ainda não existem (`velocity`, `variable`, `contact`,
`group-loop`), e é o lote C que as atende.

⚠️ **Os clipes de demonstração do Dino são gravação do GESTO no Estúdio** ("pegue o bloco, troque
o número"), não da explicação do conceito. A estimativa inicial de cortar 43 clipes para 18 não se
sustenta: o corte real vem das cenas do lote C, e mesmo assim o clipe de construção guiada
continua sendo o corpo da aula.

### 4.2 As cenas que os três cursos ainda pedem

Das 43 seções de demonstração, estas não têm cena que sirva, nem com elenco nem com `setup`:

| Cena nova | A seção que hoje é clipe | A descoberta |
| --- | --- | --- |
| `velocity` | Desafio d2 "Compare o sinal da velocidade", d3 "Observe posição e velocidade"; Dino a12 | a posição muda porque a velocidade soma nela a cada quadro; o sinal é o lado |
| `spawn-from` | Desafio d2 "Observe de onde o tiro sai" | o que nasce começa com os dados de quem o criou |
| `fill-stroke` | Meu Jeito a4 "a cor de dentro e a linha de fora" | preencher e contornar são dois desenhos no mesmo traço |
| `shading` | Meu Jeito a2 "a luz dá volume" | duas cores da mesma cor fazem a forma parecer redonda |

Só quatro, e duas delas são de arte. É o sinal de que os três cursos de hoje estão perto de
fechados — o buraco de verdade está no que vem depois.

---

## 5. Os 48 cursos da trilha: a escada e os buracos

A régua é a [escada de 14 degraus](../orientacao-cursos-jogos.md) e a grade dos 48 cursos
(`fluxo-criativo/.../entregas/cursos/trilha-cursos-jogos.md`). A pergunta certa não é "quais cenas
o curso 12 precisa": é **qual degrau ainda não tem cena**. Cada degrau aparece em oito cursos ou
mais, e a cena é a mesma, vestida com outro elenco e outro caso.

| # | Degrau | Cena de hoje | Falta |
| --- | --- | --- | --- |
| 1 | Loop e desenho | `draw-loop` `layers` `stage-size` `coordinates` | — |
| 2 | **Sprite e movimento** | — | `velocity` |
| 3 | **Input: evento × estado** | `jump-sound` `controls` (parcial: só o evento) | `hold-vs-press` |
| 4 | Gravidade e pulo | `gravity` `impulse` | — |
| 5 | Relógios | `spawn` | `cooldown` |
| 6 | Colisão | `hitbox` (a área) | `contact` (pergunta × evento, e quem bateu) |
| 7 | **Grupos e spawn** | `spawn` `cleanup` | `group-loop` |
| 8 | Dados do jogo | `score` `lives` `game-state` `restart` | `variable` |
| 9 | **Inimigo como TIPO** | — | `enemy-type` |
| 10 | **Mundo e câmera** | — | `camera`, `tilemap` |
| 11 | **Motor avançado 2D** | — | `pool`, `entity-state` |
| 12 | **Porta do 3D** | — | `axis-z`, `camera-3d` |
| 13 | **Motor avançado 3D** | — | `pick-ray` (+ `entity-state`) |
| 14 | **Na mão** | — | `delta-time`, `circle-collision` |

⚠️⚠️ **As 24 cenas de hoje cobrem os degraus 1 a 8 — que são o Corre, Dino!. Os degraus 9 a 14, que
são 40 dos 48 cursos, não têm nenhuma.** É o retrato mais importante deste documento: a biblioteca
foi construída para o curso 1, e a trilha tem mais cinco níveis.

---

## 6. As cenas novas, por lote

Nome do `SceneId` em inglês, como manda `SCENE_IDS`; o título de criança é conteúdo dela.

### Lote C — o núcleo que fecha o Iniciante 2D (serve os cursos 1 a 8, e volta em todos)

| Cena | Grupo | A criança mexe em | A descoberta | A dor que abre |
| --- | --- | --- | --- | --- |
| ⭐⭐ `velocity` | motion | vx e vy, e o relógio | a posição muda porque a velocidade soma nela todo quadro; o sinal é o lado | "empurrei o sprite uma vez e ele parou" |
| ⭐⭐ `hold-vs-press` | events | apertar uma vez × segurar a tecla | `Quando apertar` dispara uma vez; `está apertada?` vale enquanto durar | a raquete que anda um passo por toque |
| ⭐⭐ `variable` | events | a caixa, o `+1` e o mostrar | guardar, mudar e mostrar são três coisas; mostrar não muda o valor | o placar que não sobe porque ninguém somou |
| ⭐⭐ `group-loop` | population | percorrer o grupo, comparar distância, escolher | para escolher um do grupo é preciso olhar todos | a torre que atira sempre no primeiro que nasceu |
| ⭐⭐ `enemy-type` | population | a ficha (vida, velocidade, cor) e o nascer | mudar a ficha muda TODOS: o jogo mora nos dados | trocar a velocidade de 30 inimigos um por um |
| ⭐⭐ `camera` | stage | andar com o herói; ligar a câmera que segue | o mundo é maior que a tela; a tela é uma janela que anda | o herói que some no canto |
| ⭐ `contact` | collision | a pergunta contínua × o evento da batida; quem bateu | "está encostando?" e "acabou de encostar" não são a mesma pergunta | o dano que tira 60 vidas num toque só |
| ⭐ `cooldown` | events | a recarga entre dois tiros | o relógio também serve para ESPERAR, não só para repetir | a metralhadora sem querer |
| ⭐ `aim` | motion | mover o alvo e ver a seta virar | apontar é uma seta do atirador até o alvo | o tiro que só vai para a direita |
| ⭐ `diagonal` | motion | andar nos 4 lados e nas diagonais | a diagonal fica mais rápida sem querer; normalizar conserta | o personagem que corre na diagonal |
| ⭐ `tilemap` | world | trocar letras de um mapa em texto | o mapa é um dado; o desenho nasce dele | montar 200 blocos à mão |

### Lote D — o motor (Intermediário e Avançado 2D, cursos 9 a 24)

| Cena | Grupo | A criança mexe em | A descoberta |
| --- | --- | --- | --- |
| ⭐⭐ `pool` | population | criar sempre × reciclar o que morreu | o contador que só sobe é o vazamento; reciclar reaproveita o mesmo corpo |
| ⭐⭐ `entity-state` | events | o estado de cada personagem: parado, mirar, atirar, recarregar | cada um tem o próprio cérebro, e o estado decide o que ele faz agora |
| ⭐⭐ `delta-time` | motion | a mesma cena em duas máquinas, por quadro × por segundo | contar quadros muda o jogo de máquina para máquina; contar tempo, não |
| ⭐ `circle-collision` | collision | os dois centros e os dois raios | a batida é a distância entre os centros contra a soma dos raios |

`mold` (o molde do gk) **não entra como cena**: é `enemy-type` com outro elenco e outra missão — e
é justamente o argumento do curso 9, "a mesma ideia, agora no motor".

### Lote E — a porta do 3D (cursos 25 a 48)

| Cena | Grupo | A criança mexe em | A descoberta |
| --- | --- | --- | --- |
| ⭐⭐ `axis-z` | stage | x, y e z de um objeto, com a sombra no chão | o eixo novo é a profundidade, e **agora o y cresce para cima** |
| ⭐⭐ `camera-3d` | stage | orbitar, a posição da câmera e para onde ela olha; voltar à vista inicial | a câmera é um objeto do mundo, e o que você vê depende de onde ela está |
| ⭐ `mesh` | art | o wireframe ligado e desligado | o modelo é feito de pontos ligados; a textura é a roupa |
| ⭐ `pick-ray` | collision | mirar e ver a face escolhida acender | a mira é uma reta que sai da câmera e para na primeira coisa |

⚠️ `camera-3d` abre com a tarefa do achado 19, sem conta nenhuma: *gire até ver só uma cor; agora
só duas*. É a única atividade da trilha que ensina orientação espacial antes de qualquer eixo.

### Lote F — a arte (Pinta, cursos atuais)

| Cena | Grupo | A criança mexe em | A descoberta |
| --- | --- | --- | --- |
| `fill-stroke` | art | o miolo e o contorno da mesma forma | preencher e contornar são dois desenhos; um pode existir sem o outro |
| `shading` | art | a cor base e uma segunda mais escura, e de onde vem a luz | duas cores da mesma cor fazem a forma virar volume |

### E as duas que os cursos de hoje pedem

`velocity` está no lote C e `spawn-from` cabe como missão de `spawn` pelo `setup` (o que nasce
começa na posição de quem criou), sem cena nova.

**Total: 21 cenas novas** — 11 no núcleo, 4 no motor, 4 no 3D, 2 na arte. Com elas a biblioteca vai
a 45 modelos e **os 14 degraus ficam cobertos**.

---

## 7. O que não vira cena

- **Passeio pelo aplicativo**: "onde os projetos ficam", "uma cópia faz a ponte", "salvo e guardado
  na conta", "como pedir uma ajuda que funciona", "uma seção de cada vez", "salvar e enviar são
  coisas diferentes". O lugar é o tutorial guiado do kids, que aponta para a tela de verdade.
- **Gesto no Estúdio**: "observe a mudança de todos os blocos", "como testar o jogo completo",
  "como conferir uma mudança". Vídeo faz isso melhor que simulação, e é para isso que os clipes
  ficam.
- **Economia, ondas e balanceamento** (moedas, preço, dificuldade que cresce): são números numa
  tabela, e `enemy-type` já ensina que o jogo mora nos dados.
- **Um construtor universal de simulações.** O editor escolhe entre modelos prontos; cada assunto
  novo é uma cena escrita. Isso continua sendo verdade e é o que segura a qualidade.

---

## 8. Ordem de trabalho

| Lote | O quê | Custo | Onde |
| --- | --- | --- | --- |
| **A** | Ligar o que já existe: 25 seções, incluindo os 14 roteiros prontos | ~zero, só manifesto | `docs/aulas-interativas/*-v6` |
| **B** | As oito melhorias dos modelos (o `setup` é a espinha) | médio | `core/learning/scene/*`, `member-shell`, admin |
| **C** | As 11 cenas do núcleo 2D | alto | `scene/*` + `scene-stages.tsx` |
| **D** | As 4 cenas do motor | alto | idem |
| **E** | As 4 cenas do 3D | alto, e pede palco novo (projeção) | idem + palco 3D |
| **F** | As 2 cenas de arte | médio | `scene-art-stages.tsx` |

**A ordem importa:** o lote A entrega 25 seções interativas sem código nenhum. O lote B multiplica
as 24 cenas de hoje por dois, também sem cena nova. Só então o C, que é onde o custo mora.

O que os seis lotes dão, somados: **60 → 85 atividades interativas nos cursos de hoje**, os clipes
de demonstração de **43 para ~18**, e uma biblioteca de **45 modelos que cobre os 14 degraus** —
isto é, os 48 cursos da trilha, cada um montado com elenco e caso, não com motor novo.

⚠️ Cada cena nova exige o caminho inteiro: `SCENE_IDS`, ações e limites, modelo com metas, pistas e
roteiro no `catalog.ts`, redução no `engine.ts`/`state.ts`, avaliação no `evaluate.ts`, leituras no
`readout.ts` e desenho no palco. A régua de legalidade é uma só (`isSceneAction`), então o DTO do
members e o editor do admin herdam sem cópia. E `packages/core/tests/learning.test.ts` trava os 54
manifestos: cena nova, elenco novo ou `setup` novo passa por ele.

---

## 9. O que foi implementado (15/09/2026)

Os seis lotes foram entregues, com um review entre cada um. Esta seção é o que ficou **de
verdade** — a proposta acima continua sendo o raciocínio, não o registro.

| Lote | Estado | Onde olhar |
| --- | --- | --- |
| **A** | ✅ 13 manifestos dos três cursos v6 | `docs/aulas-interativas/*-v6/*/manifesto.json` |
| **B** | ✅ as oito melhorias, com o `setup` como espinha | `core/learning/scene/*`, `member-shell`, admin |
| **C** | ✅ 11 cenas do núcleo (24 → 35) | `catalog.ts` + `scene-core-{stages,controls}.tsx` |
| **D+E+F** | ✅ 10 cenas do motor, do 3D e do ateliê (35 → **45**) | `catalog.ts` + `scene-engine-{stages,controls}.tsx` |

**A biblioteca tem 45 modelos e os 14 degraus estão cobertos.**

### O que mudou em relação à proposta

- **O 3D é desenhado à mão em SVG**, não renderizado. O lote E previa "palco novo (projeção)" e é
  exatamente isso: uma projeção isométrica com a matriz do chão, um cubo de três cores e uma
  sombra. Puxar three.js para o player de aula custaria o peso dele em TODA cena.
- **`circle-collision` mudou de descoberta.** A proposta dizia "a batida é a distância contra a
  soma dos raios", e a primeira versão dava a meta quando os dois se separavam de novo — o que o
  relógio, que só aproxima, nunca permite. Hoje a prova é o mesmo lugar TROCAR de resultado
  quando o raio muda, com a distância parada. É uma descoberta melhor: separa a conta do desenho.
- **`fill-stroke` e `shading` foram LIGADOS aos cursos de hoje** (Meu Jeito a2 e a4, as duas
  seções que a §4.2 nomeia), junto de `velocity` no Desafio d3 e no Corre Dino a12. As quatro
  entram como demonstração ao lado do vídeo planejado, e a conclusão da seção passa para a cena.

### Os achados dos reviews que viraram correção

Cada lote foi revisado antes do seguinte, e o que apareceu está corrigido e travado por teste.

**A régua que os reviews mais pegaram** é a mesma nos dois lotes: *uma meta só pode cair quando a
criança VIU o que a meta afirma*. Oito cenas davam descoberta pelo estado inicial, por acidente, ou
por metade do gesto — `entity-state` fechava duas metas num toque, `pick-ray` premiava uma oclusão
que a tela não tinha, `camera-3d` abria já mostrando as duas cores que pedia, `shading` contava um
clique que não mudava um pixel. A tabela dos oito está no `core/CLAUDE.md`.

Os outros:

- **A cena com pergunta anexa dizia "concluído" antes do servidor concordar** — o cartão de
  sucesso agora aponta para a pergunta em aberto, e errar deixou de dar o mesmo recado que não
  responder (`withAttachedQuestion`).
- **O carimbo do envio da tentativa era gravado antes do `await`** — uma falha de rede prendia a
  criança em "Aguardando conexão" sem nenhuma nova tentativa de envio.
- **Um toque de mouse no botão "Segurar a tecla" deixava a tecla PRESA** (os três eventos em
  fila), justo na cena que separa acontecimento de estado.
- **O caso (`setup`) atravessava a troca de cena inteiro** e deixava o bloco recusado para sempre,
  sem caminho de volta pelo editor; e sumia calado na troca de tipo.
- **`contact` dava "afastar e voltar" só por afastar**; **`variable` dava "mudou sem estar na
  tela" antes de existir um valor guardado.**
- **Duas opções de ação do editor com a mesma identidade** — o `<select>` selecionava a irmã
  errada, e o aviso só aparecia no console.
- **Dezessete ações com número e sem campo no editor** — o professor escolhia e não conseguia
  ajustar, e em três cenas o valor de fábrica era o próprio estado inicial: a única ação autorável
  era um gesto que não muda nada, e o `setup` (a peça-título do lote B) ficava inútil ali.
- **O caso (`setup`) pré-semeava a memória do gesto** — a cena abria com o fantasma de um lugar
  onde a criança nunca esteve, e a demonstração com caso escapava inteira do `playsOut`. O full
  review pegou a segunda metade disso: a primeira correção cobria 16 grupos e deixava de fora os
  contadores que alimentam metas de repetição, então um caso com um sorteio entregava "dois
  lugares de nascimento" no primeiro gesto da criança.
- **Sete cenas davam descoberta no primeiro toque** — `velocity` nasce com velocidade zero,
  `delta-time` nasce com as duas máquinas juntas, `tilemap` contava trocas em vez de letras
  repetidas, e o deslizante no batente reenviava o mesmo valor, fechando meta com um gesto que
  não muda nada.
- **Dois `setup` MORTOS nos manifestos** — o passo 1 do roteiro do modelo de `velocity` carrega
  os dois eixos e apagava o caso: a pedra do Desafio nunca descia, e o Dino da a12 ia para a
  direita numa demonstração cuja instrução fala em velocidade negativa. Viraram roteiro autoral.
- **A velocidade tinha dois eixos e CINCO superfícies mostravam um** — a faixa, a `<desc>` do
  SVG, o relatório do professor, a fala do motor e a frase embaixo do palco diziam "velocidade 0"
  (ou "foi de 60 para 60") enquanto o Dino descia na tela. As duas últimas são justamente as que
  a criança lê, e só caíram no quarto review.
- **O `grid.written` crescia sem teto** — na 25ª casa trocada o retrato passava a ser recusado
  pelo próprio leitor, e a criança lia "esta descoberta mudou, recomece" no meio de um mapa de
  60 casas que a pista manda pintar.
- **`circle-collision` ficava inacabável** — o relógio só aproxima, então passados ~6 segundos de
  ▶ a meta da conta virava impossível, com a pista mandando fazer exatamente o que já não
  funcionava. A distância virou controle.
- **A pergunta anexa não ENVIAVA depois de "Ver de novo"** — o conserto anterior mudou só a
  renderização para o latch; o envio continuava olhando o `result.passed` vivo.
- **O ensaio do professor não avaliava a pergunta anexa** — ele mandava só o que o controlador da
  cena guarda, então o avaliador via "não respondeu" para quem tinha acabado de responder, a
  seção não destravava e ele não conseguia conferir a explicação que escreveu.
- **Os palcos novos não vestiam o elenco** no `<title>` e na `<desc>` do SVG — a criança de uma
  turma de nave lia "nave" na faixa e o leitor de tela anunciava "o Dino" no mesmo desenho.
- **Acertar a pergunta anexa não mostrava a explicação** do professor, e ela SUMIA da tela nas duas
  cenas que pedem montagem assentada.

