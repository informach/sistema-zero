# Proposta: as experiências e demonstrações que faltam

Estudo do Brilliant (14/09/2026) e plano de trabalho para as seções interativas dos três cursos v6.
Maquete navegável com dois protótipos funcionais: `docs/aulas-interativas/proposta-experiencias.html`.

> ➡️ **A continuação está em [proposta-experiencias-trilha.md](proposta-experiencias-trilha.md)**
> (15/09/2026): segunda rodada no Brilliant, as oito melhorias nos modelos que já existem e as
> cenas que os 48 cursos da trilha vão pedir. Este documento aqui continua sendo o registro dos
> lotes 1 a 4, já implementados.

## Estado da implementação (14/09/2026)

| Lote | O quê | Estado |
| --- | --- | --- |
| 1 | Os sete ajustes de design nas 14 cenas | **implementado** |
| 2 | Elenco por curso (`cast`), com o editor no admin | **implementado** |
| 3 | `coordinates`, `screen-reader`, `stage-size` e `draw-loop` | **implementado** |
| 4 | `frames`, `onion-skin`, `symmetry`, `pixel-vector`, `sheet-vs-sprite` e `lives` | **implementado** |
| 4 | A previsão antes de mexer (player + editor do admin) | **implementado** |

**As cenas passaram de 14 para 24.** As dez novas têm ação, limite, modelo, motor, avaliação,
palco, controles, editor no admin e schema no servidor, e entram no mesmo caminho de tudo: a
régua de legalidade é uma só (`isSceneAction`) e os limites também (`SCENE_LIMITS`).

Ligadas em manifesto até aqui:

| Cena | Onde | Tipo |
| --- | --- | --- |
| `coordinates` · `screen-reader` · `stage-size` | Corre Dino aula 1, §3, §4 e §6 | experimentação |
| `draw-loop` | Corre Dino aula 2 | experimentação |
| `world` (elenco nave) | Desafio dia 1, "Criar não é desenhar" | experimentação |
| `frames` · `onion-skin` | Meu Jeito aula 3, "cada quadro é um desenho" e "comparar sem guardar de memória" | demonstração |
| `sheet-vs-sprite` | Meu Jeito aula 6, "duas imagens dentro de uma só" | demonstração |
| `lives` (elenco nave/asteroide) | Desafio dia 4, "Observe ponto e vida mudarem" | demonstração |

⚠️ **O que NÃO foi ligado, e por quê.** A tabela do elenco (§4.2) mapeava as cenas por TÍTULO de
seção. Conferindo o foco DECLARADO de cada uma no manifesto, quatro não casam de verdade e duas já
têm experiência autoral no lugar. É decisão editorial dela, não de implementação: o motor, o
editor e o elenco já aceitam as seis.

| Cena | Seção | Por que ficou de fora |
| --- | --- | --- |
| `hitbox` | Desafio d3 "Observe quais dois objetos se encontraram" | o objetivo declarado é distinguir o GRUPO dos dois objetos que colidiram; a cena é sobre a ÁREA de contato |
| `score` | Desafio d4 "Observe o número e o placar" | o objetivo é separar guardar, alterar e mostrar um valor; a cena é sobre somar ponto DENTRO de Se jogando |
| `game-state` | Desafio d5 "Observe os quatro momentos do jogo" | o objetivo é distinguir a tela atual do desenho da tela; a cena é sobre o relógio dentro da condição |
| `spawn` | Meu Jeito a7 "uma nave, muitos nascimentos" | o objetivo junta relógio do jogo E quadros de animação; a cena cobre só a primeira metade |
| `spawn` | Desafio d3 "Um relógio mais rápido cria mais?" | a seção já tem uma experiência HTML autoral, e trocá-la é conteúdo dela |
| `layers` | Meu Jeito a5 "a pedra sumiu ou foi coberta?" | idem: experiência HTML autoral no lugar |

QA em navegador: feito no ensaio de autoria do kids (`community-kids/tests/visual/
serve-experience-preview.ts`, que monta o editor REAL do admin em cima do bloco REAL da aula) nas
seis cenas do lote 4 e no endereço da Aula 1. Dois ajustes saíram dali: a lupa da `pixel-vector`
ampliava tanto que sobrava só o miolo cheio da pedra, sem a borda que a cena existe para mostrar, e
o desenho das duas cenas de animação ficava encostado na esquerda, com meio palco vazio.

Pendência de conteúdo: se ela quiser, as seis linhas da tabela acima.

## 1. O que a contagem mostra

Levantamento sobre os 27 manifestos de `*-v6` (introdução + 5 dias do Desafio, 13 aulas do Corre
Dino, 8 de O Jogo do Meu Jeito).

| Curso | Seções | Com algo para mexer | Cenas nativas | HTML | Perguntas curtas |
| --- | --- | --- | --- | --- | --- |
| Desafio do Primeiro Jogo | 78 | 6 | 0 | 6 | 0 |
| Corre, Dino! | 128 | 14 | 14 | 0 | 0 |
| O Jogo do Meu Jeito | 76 | 5 | 0 | 5 | 26 |
| **Total** | **282** | **25** | **14** | **11** | **26** |

Intenções das 282 seções: `application` 103, `closing` 54, **`demonstration` 47**, `presentation`
27, `delivery` 26, `exploration` 25.

⚠️⚠️ **As 47 seções de demonstração não têm nenhuma demonstração interativa.** Nenhum manifesto v6
usa `activity.type: 'demonstration'` — as 14 prontas vivem só em
`corre-dino-v6/demonstracoes-opcionais.json`, que não é importado por ninguém. As 47 dependem
integralmente de clipes: dos 144 planejados, zero gravados.

Outros três achados:

- ⭐ **Cada uma das 14 cenas é usada exatamente uma vez.** Todas do Corre Dino. Nenhuma reaparece,
  embora criar ≠ desenhar, colisão, placar e telas do jogo estejam nos três cursos.
- ⚠️ **Desafio e Meu Jeito não têm uma única cena nativa.** As 26 "perguntas curtas" do Meu Jeito
  são `activity.type: 'question'`: múltipla escolha, sem simulação.
- ⚠️ **As cinco experiências de `docs/aulas-interativas/interacoes/` ficaram para trás.**
  `coordenadas.html`, `pixel-vetor.html`, `quadros.html`, `telas-pontos.html` e
  `velocidade-limite.html` estão no disco, com estado e `participated()`, e nenhuma entrou nos
  manifestos v6. O README desta pasta diz que estão incorporadas — isso vale para o pacote
  HISTÓRICO, não para as revisões atuais.

### O caso concreto da Aula 1 do Corre Dino

O roteiro já registra as duas decisões que esta proposta pede para rever:

- §6 “Veja como funciona o endereço na tela”: *“Mover apenas um marcador… **Não há arraste nem
  parâmetros para a criança.**”* — o conceito de x e y, que o fecho da aula cobra (“sabe que x maior
  é mais pra direita e y maior é mais pra baixo”), é ensinado sem que ela mexa em x nem em y.
- §4 “Ouça o que a descrição informa”: *“captura curta com leitor de tela real”* — um vídeo.

## 2. O que o Brilliant faz (e o que não dá para copiar)

Recolhido jogando *Programming with Variables*, *Thinking in Code*, *Programming with Functions*,
*Coordinate Plane* e *Scientific Thinking*.

1. **A saída é o feedback.** Errar mostra o que o programa da criança desenhou, não um X.
2. **Errar é âmbar.** Botões viram *Tentar de novo* / *Ver a resposta*. Sem vidas, sem perda de
   pontos, sem como travar.
3. **A dica diz o que falta**, em linguagem verificável: “The program should draw exactly 2 shapes.”
4. **Um botão principal, sempre no mesmo lugar.** *Conferir* → *Continuar*. O “Por quê?” que abre a
   explicação é secundário e menor.
5. **Acertar aciona a simulação.** Na lição de engrenagens, a confirmação É a engrenagem girando.
6. **O estado tem nome e fica à vista:** `truckX = 7 · deliveryY = ? · distance = ?` numa faixa
   acima do palco. É o elo entre o número escrito no bloco e o lugar no desenho.
7. **O andaime muda com a pergunta:** quando a pergunta é sobre x, só o eixo x é numerado.
8. **Sobe pela estrutura, não pela quantidade:** duas engrenagens, três, cinco em fila, uma cadeia
   que se divide, um emaranhado — a mecânica não muda uma vez.
9. **Ciclo de quatro batidas:** demonstração manipulável → previsão sobre um caso novo → enunciado
   da regra → aplicação em escala maior.
10. **Distratores são os erros típicos:** `truckX − deliveryX` ao lado de `deliveryX − truckX`.

⚠️ **O que não dá para copiar — acessibilidade.** A árvore de acessibilidade de um exercício de
código do Brilliant devolve dez botões (`Close`, `left`, `right`, `streak`, `report a problem`,
`mute`, `chat with tutor`, `record message` e dois sem nome) e **nenhum é o exercício**. Blocos,
palco e linhas do programa não existem para leitor de tela e só respondem a arrastar — sem clique
nem teclado. Num curso cuja primeira aula ensina o que é um leitor de tela, herdar isso desmentiria
a aula. As cenas daqui já saem na frente: `role="meter"` no medidor, `aria-live` na fala,
e o controle deslizante que faz o mesmo que o arraste na cena da colisão.

Também ficam de fora: XP por exercício (a carreira de 8 níveis já ocupa esse lugar; uma segunda
moeda competiria com ela) e tema único (kids tem Padrão e Pink).

## 3. Sete ajustes nas 14 cenas de hoje

Tudo em `packages/member-shell/src/components/scene-activity.tsx`, `exploration-stage.tsx` e
`packages/member-shell/src/styles/scene.css`. Nenhum exige ação nova no motor nem migração de
conteúdo publicado.

| # | Hoje | Vira |
| --- | --- | --- |
| 1 | Rodapé com Desfazer · Recomeçar · Uma pista · Ligar som, todos do mesmo peso, e nenhuma ação principal | Um botão largo à direita (*Conferir* → *Continuar*) e os outros três como ícones pequenos à esquerda |
| 2 | A pista substitui a instrução no mesmo balão | A instrução fica; a pista entra abaixo, como fala do Zappy, marcada `1 de 3` (a escada já está em `catalog.ts`, só não se vê) |
| 3 | “Siga a missão e observe o resultado”, igual em todas as cenas | A frase narra a mudança: “y foi de 150 para 210 — o Dino desceu”. A cena `hitbox` já faz isso; estender às outras treze |
| 4 | `hitbox` abre distância do cacto e largura da área juntas | O segundo controle nasce fechado e abre quando a primeira descoberta acontece |
| 5 | Os números que a criança vai digitar no bloco não aparecem no palco | Faixa de estado acima da cena: `x = 110 · y = 150`, `velocidade = −5`, `pontos = 3` |
| 6 | “OBSERVATÓRIO DE CONTATO”; “Prévia de autoria” vazando na visão do aluno | O `title` do catálogo já está em língua de criança: “Onde a batida acontece?” |
| 7 | Céu, chão e grade fixos em `scene.css`: no tema Pink a cena continua verde e bege | Derivar do tema. ⚠️ O par de comparação (A azul `#315f92`, B laranja `#c67431`) e o vermelho do encosto ficam FIXOS: carregam sentido, não decoração |

⭐ Um oitavo, maior: **a previsão antes de mexer** (implementada). Uma pergunta de duas opções
(“o que vai acontecer se o y aumentar?”) antes de o palco abrir, o padrão mais forte do Brilliant.

⚠️⚠️ Ela NÃO reusa o `block.checkpoint`, como esta proposta chegou a sugerir: o checkpoint alimenta
o `passed` da atividade, então um palpite errado REPROVARIA a criança — o oposto do que a previsão
ensina. Ela é campo próprio (`block.prediction`), não vale nota, viaja em `answers.prediction` junto
da tentativa e aparece no acompanhamento do professor como "Palpite antes de mexer". O gabarito é
opcional e serve só ao relatório dele. O gate trava o PALCO, nunca o rodapé: "Ouvir instrução" e
"Ligar som" ficam de fora, senão quem ainda não lê ficaria sem saída diante de uma pergunta escrita.

## 4. As cenas que faltam

### 4.1 Dez cenas novas

| Cena | A criança mexe em | A descoberta | Onde entra (seção que hoje espera vídeo) |
| --- | --- | --- | --- |
| `coordinates` | x de 0 a 480 e y de 0 a 270, com fantasma da posição anterior | x maior é direita; **y maior é baixo**; o par é um endereço | Dino a1 §6; Desafio d1 “Observe o endereço na tela” |
| `screen-reader` | o texto da descrição e o botão que lê a tela | o desenho não informa nada; a frase precisa do objetivo e do controle | Dino a1 §4 |
| `stage-size` | largura, altura e a borda ligada ou desligada | a tela tem limite, e o limite é escolha de quem faz o jogo | Dino a1 §3 |
| `draw-loop` | desenhar a cada quadro (sim/não), limpar antes (sim/não) | sem repetir, congela; sem limpar, fica rastro | Dino a2; Desafio d1 “O que acontece sem a borracha?” |
| `frames` | troca de dois quadros e a velocidade da troca | dois desenhos parados viram movimento | Meu Jeito a3 (2 seções) |
| `pixel-vector` | ampliação da mesma silhueta em grade e em curva | de perto a borda conta qual é qual — e nenhuma é a certa | Meu Jeito a4 (2 seções) |
| `sheet-vs-sprite` | onde cortar a folha e o tamanho no jogo | o tamanho da folha não é o tamanho no jogo | Meu Jeito a6 (2 seções) |
| `lives` | a batida, e o que acontece com ponto e com vida | duas contagens mudam por motivos diferentes | Desafio d4 |
| `symmetry` | o eixo do espelho e o traço de um lado | um traço, dois lados — o eixo decide onde | Meu Jeito a2 |
| `onion-skin` | ver ou não o quadro anterior por baixo | comparar sem guardar de memória muda o desenho que sai | Meu Jeito a3 |

Quatro delas já existem como HTML testado em `docs/aulas-interativas/interacoes/`
(`coordenadas`, `pixel-vetor`, `quadros`, `telas-pontos`) e viram cena nativa em vez de iframe.

⚠️ Cada cena nova exige: entrada em `SCENE_IDS` (`core/learning/scene/actions.ts`), ações e limites
próprios, modelo com metas/pistas/roteiro em `catalog.ts`, redução em `engine.ts`/`state.ts`,
avaliação em `evaluate.ts` e desenho em `exploration-stage.tsx`. A régua de legalidade é única
(`isSceneAction`), então o DTO do members e o editor do admin herdam sem cópia.

### 4.2 Elenco por curso — a mudança de maior alcance

Seis das catorze cenas ensinam conceitos que os três cursos repetem, mas só sabem falar de Dino e
cacto. Um campo de **elenco** no modelo (quem é o personagem, quem é o obstáculo, como se chama o
palco) transforma 6 cenas em 18 usos, sem uma linha de motor novo:

| Cena | Desafio | Meu Jeito |
| --- | --- | --- |
| `world` | d1 “Criar não é desenhar” (nave) | — |
| `hitbox` | d3 “Quais dois objetos se encontraram” | — |
| `score` | d4 “O número e o placar” | — |
| `game-state` | d5 “Os quatro momentos do jogo” | — |
| `spawn` | d3 “Um relógio mais rápido cria mais?” | a7 “Uma nave, muitos nascimentos” |
| `layers` | — | a5 “A pedra sumiu ou foi coberta?” |

⚠️ O elenco é DADO, não código: `cast: { hero, obstacle, stage }` no bloco, com o do Dino como
padrão. O texto do catálogo (`title`, `instruction`, `success`, `hints`) passa a interpolar os
nomes. Isso mexe no conteúdo das 14 cenas — refazer o texto com cuidado, é conteúdo pedagógico da
dona.

### 4.3 O que NÃO vira cena

Sete seções de demonstração são passeio pelo aplicativo, não conceito: “onde os projetos ficam”,
“uma cópia faz a ponte”, “salvo e guardado na conta”, “onde procurar uma próxima ideia”, “como pedir
uma ajuda que funciona” (Meu Jeito) e “uma seção de cada vez”, “seu caderno e o caminho da ajuda”,
“salvar e enviar são coisas diferentes” (introdução do Desafio). O lugar delas é o **tutorial guiado
do kids**, que já existe e aponta para a tela de verdade — ver `tutorial-guiado-onboarding-kids`.

## 5. Ordem de trabalho

| Lote | O quê | Custo | Onde |
| --- | --- | --- | --- |
| 1 | Os sete ajustes de design | baixo, sem migração | `member-shell` + `scene.css` |
| 2 | Elenco por curso | médio (conteúdo) | `core/learning/scene/catalog.ts` + admin |
| 3 | `coordinates`, `screen-reader`, `stage-size`, `draw-loop` | alto (ações novas no motor) | `core/learning/scene/*` + `scene-stages.tsx` |
| 4 | `frames`, `onion-skin`, `symmetry`, `pixel-vector`, `sheet-vs-sprite`, `lives` + previsão | alto | idem + `scene-art-stages.tsx` + `prediction` no bloco |

Resultado dos quatro lotes: **25 → 59 seções** em que a criança mexe em alguma coisa, e as 47
demonstrações deixam de depender só de vídeo. Os clipes continuam valendo — para mostrar o **gesto**
no Estúdio, que é o que vídeo faz melhor do que qualquer simulação.

⚠️ `packages/core/tests/learning.test.ts` trava os 54 manifestos: formato, critérios sem pendência e
cada atividade interativa com um caminho de passar expresso como AÇÕES da criança. Cena nova ou
elenco novo passa por ele.

## 6. Protótipos

`proposta-experiencias.html` (esta pasta) tem as duas cenas da Aula 1 funcionando:

- **O endereço na tela** — x e y com controle deslizante, botões de ±20 e setas do teclado; faixa de
  estado viva; fantasma da posição anterior; guias até cada eixo; três descobertas; frase que narra
  a mudança.
- **O que o leitor de tela lê** — painel “o que aparece” contra “o que a pessoa ouve”, com voz real
  (`speechSynthesis`, pt-BR) e o texto sempre visível. A criança aperta ouvir com o campo vazio,
  escreve a descrição e ouve a diferença.

⚠️ São maquetes para decidir, não código do produto: o reconhecimento de objetivo e controle é por
palavra-chave no navegador e serve para orientar. A conferência de verdade continua no servidor,
como nas outras cenas.
