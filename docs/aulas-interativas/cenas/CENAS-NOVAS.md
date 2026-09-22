# Cenas novas do redesenho didático

> Documento de implementação. Reúne, por cena, tudo que as 27 análises de aula pedem, já fundido e
> sem contradição. Quem for construir as cenas trabalha por aqui e não precisa voltar nos arquivos
> de aula.

## Como ler este documento

São **11 cenas novas**. Elas foram especificadas dentro das análises de aula, algumas em mais de uma
aula ao mesmo tempo, com preset e metas próprias em cada lugar. Aqui cada cena aparece uma vez só,
com a **cena base** (o palco, os controles, o conjunto completo de metas) e os **presets por aula**
(o que muda de elenco, de ficha, de texto e de metas cobradas).

Três coisas valem para todas:

1. **Nenhuma das 11 é demonstração.** Todas passam no critério de experimentação da seção 3 do
   briefing: dá para escrever "quando eu mudo X, acontece Y". A justificativa individual está em cada
   seção. O campo de roteiro de demonstração fica preenchido com a razão de não existir.
2. **Meta com o mesmo id significa a mesma coisa em todas as aulas.** O rótulo que aparece quando a
   meta cai pode ser adaptado ao elenco do preset. O que a meta prova, nunca.
3. **Revisita não cobra de novo.** Quando uma aula usa uma cena que a criança já fez, as metas
   antigas chegam com "✓ Você já descobriu isto" e a faixa só pede as novas. Esse comportamento a
   cena já tem.

## Critério de prioridade usado aqui

- **Alta:** três ou mais aulas do redesenho dependem dela.
- **Média:** duas aulas dependem dela, ou uma aula depende e o reuso já está mapeado em outros
  cursos da grade.
- **Baixa:** uma aula depende dela e existe pendência ou custo de produção que atrasa a construção.

## Ordem de construção sugerida

| Lote | Cenas | Por quê |
|---|---|---|
| 1 | `once-vs-always` | Cinco aulas de dois cursos param sem ela, e ela é a primeira seção de conceito de todo curso base |
| 2 | `fixed-vs-read`, `collision-pair`, `invincibility` | Fecham o Desafio do Primeiro Jogo, que é o curso de entrada |
| 3 | `number-line` | Fecha o Corre, Dino!, e é o segundo maior reuso potencial do catálogo |
| 4 | `unique-names`, `two-clocks`, `motion-amount`, `copy-vs-original` | Fecham O Jogo do Meu Jeito nas quatro aulas que hoje trocam conceito por pergunta de múltipla escolha |
| 5 | `published-copy`, `same-rules-new-skin` | Dependem de uma conferência no produto e de três conjuntos de arte, e são as duas de custo mais alto |

## Nota sobre o grupo `world`

Cinco das 11 cenas caem no grupo `world` (`copy-vs-original`, `unique-names`, `published-copy`,
`same-rules-new-skin`, mais as três que já estão lá). O grupo passa de 3 para 7 cenas e deixa de ser
"o mundo do jogo" para virar "o projeto como coisa": nome, cópia, publicação e tema. Vale decidir, na
hora de construir, se isso vira um grupo próprio (`projeto`, por exemplo). Não é bloqueio para
nenhuma das cenas.

---

## `once-vs-always` · Uma vez, sempre, e na hora que acontecer

**Grupo:** `events`

**Conceito abstrato que ela torna concreto:** onde a ação é colocada decide quando ela acontece:
uma vez no começo, de novo a cada passo do jogo, ou só no instante em que alguma coisa acontece.

**Tipo:** experimentação. A relação tem botão, e o botão é o **onde**. Dá para escrever a frase do
critério duas vezes: "quando eu levo a ficha para Enquanto estiver rodando, o contador dela para de
marcar um e passa a marcar um por passo" e "quando eu levo a ficha para Quando acontecer, o contador
dela só sobe quando eu aperto a tecla". O avanço de passos é o instrumento
de leitura, não o conteúdo.

**Prioridade:** alta. Cinco aulas de dois cursos dependem dela, e ela é a cena com maior reuso
potencial do catálogo: abre o conceito de áreas do projeto em todo curso base de nível novo da grade
dos 48.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| Desafio do Primeiro Jogo | Dia 1, Seção 2 "O que acontece uma vez e o que acontece sempre". **Antes** da montagem | `duas-caixas-nave`: duas caixas (`Ao iniciar`, `Enquanto estiver rodando`) e duas fichas (Acender o painel da nave, Mover a nave um pouquinho) | `once`, `always`, `both` |
| Desafio do Primeiro Jogo | Dia 2, Seção 2 "A área que fica esperando você". **Antes** da montagem | `tres-caixas-tiro`: acrescenta a caixa `Quando acontecer`, a ficha Criar um tiro e o botão Apertar a tecla. Revisita: `once`, `always` e `both` chegam com "✓ Você já descobriu isto" | `on-event`, `key-fires`, `flood` |
| Desafio do Primeiro Jogo | Dia 4, Seção 4 "A batida machuca". **Depois** da montagem, como contrafactual | `uma-ficha-vidas`: duas caixas, uma ficha só (Dar três vidas à nave) e uma pedra encostando na nave a cada poucos quadros, já rodando no palco | `once`, com rótulo adaptado |
| Corre, Dino! | Aula 2, Seção 4 "Criar foi uma vez. Desenhar é sempre." **Depois** da montagem, como contrafactual | `duas-caixas-dino`: duas caixas e três fichas (Pintar o fundo, Criar o Dino, Mover o Dino um pouquinho) | `once`, `always`, `both` |
| Corre, Dino! | Aula 4, Seção 2 "A área que fica esperando". **Antes** da montagem | `tres-caixas-som`: acrescenta a caixa `Quando acontecer`, a ficha `Tocar efeito` com a opção `pulo` e o botão Apertar a tecla. Revisita: `once` e `always` já caíram na Aula 2 | `on-event`, `key-fires` |

**Reuso previsto fora do redesenho atual:** todo curso base de nível novo da grade, na aula em que a
segunda área do projeto estreia, e de novo na aula em que a terceira estreia.

**Onde foi considerada e recusada, para ninguém reabrir o assunto:** Corre, Dino! Aulas 1, 7, 9, 10,
11, 12 e 13. Os motivos se repetem: as áreas do projeto são conteúdo das Aulas 1 e 2 daquele curso, e
chegar com uma cena de fundamento na Aula 10 trata como novidade o que a criança usa há oito aulas. Na
Aula 1 especificamente, a regra dura do curso é só explicar o que vai ser usado agora, e a Aula 1 usa
uma área só.

### O que a criança manipula

- **As fichas de ação**, que ela arrasta para dentro de uma das caixas e pode tirar de volta. Quantas
  fichas existem e o que cada uma diz é declarado pelo preset da aula.
- **As caixas do projeto**, duas ou três conforme o preset: `Ao iniciar`, `Enquanto estiver rodando`
  e `Quando acontecer`.
- **Avançar 1 passo**, que anda o palco uma vez e atualiza todos os contadores. O nome `quadro` só
  entra depois, na aula que o apresenta.
- **Voltar ao começo**, que zera o número do passo, os contadores de cada ficha e a tela do jogo, e
  devolve as fichas para o lado de fora.
- **Apertar a tecla**, só nos presets de três caixas. É o botão que dispara o evento.

### Como o palco começa

As caixas do preset, vazias e lado a lado. As fichas de lado, fora delas. O passo começa em 0, e cada
ficha mostra quantas vezes agiu. No `duas-caixas-nave`, a nave já pertence ao simulador e aparece no
céu estrelado diante de um asteroide; nenhuma ficha mistura criar com desenhar.

No preset `uma-ficha-vidas` do Dia 4 o palco é diferente em um ponto e o ponto é o conteúdo: a nave já
está na tela e uma pedra encosta nela a cada poucos quadros, desde o primeiro. A ficha única fica de
lado, e a criança escolhe em qual caixa ela cai:

- Em `Ao iniciar`: a nave começa com três corações, apanha, e os corações vão apagando.
- Em `Enquanto estiver rodando`: os três corações voltam a encher em todo quadro, e a nave nunca perde
  nada, por mais que apanhe.

**Instrumento de leitura obrigatório:** o contador por ficha. No piloto, depois de cinco passos,
Acender o painel marca 1 e Mover a nave marca 5. Nos presets posteriores, o mesmo instrumento
compara as ações próprias de cada aula.

### Elenco e cenário

| Preset | Elenco | Cenário |
|---|---|---|
| `duas-caixas-nave`, `tres-caixas-tiro` | nave (`hero`) e asteroide (`obstacle`) | `nave` |
| `uma-ficha-vidas` | nave (`hero`) e asteroide (`obstacle`) | `nave` |
| `duas-caixas-dino`, `tres-caixas-som` | Dino (`hero`) e cacto (`obstacle`) | `corre-dino` |

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `once` | "Em `Ao iniciar`, a ação aconteceu uma vez só" | "Ponha {ficha de arrumação} em `Ao iniciar` e avance três passos." |
| `always` | "Em `Enquanto estiver rodando`, a ação se repete a cada passo" | "Ponha {ficha de movimento} em `Enquanto estiver rodando` e avance três passos." |
| `both` | "Preparar uma vez e repetir sempre, juntos" | "Deixe {ficha de preparação} em `Ao iniciar` e {ficha de movimento} em `Enquanto estiver rodando`, e avance cinco passos." |
| `on-event` | "Em `Quando acontecer`, a ação ficou esperando" | "Ponha {ficha do evento} em `Quando acontecer` e avance três passos sem apertar a tecla." |
| `key-fires` | "A tecla fez a ação acontecer na hora" | "Com {ficha do evento} em `Quando acontecer`, aperte a tecla." |
| `flood` | "Em `Enquanto estiver rodando`, nasceu um {objeto} em cada passo" | "Ponha {ficha do evento} em `Enquanto estiver rodando` e avance cinco passos." |

**Rótulos adaptados por preset:**

- `uma-ficha-vidas` (Dia 4), meta `once`: "Em `Ao iniciar`, as vidas foram dadas uma vez, e a batida
  conseguiu tirar". O pedido vira "Ponha Dar três vidas à nave em `Ao iniciar` e avance até a pedra
  encostar duas vezes."
- `tres-caixas-som` (Corre, Dino! Aula 4), meta `key-fires`: o objeto é o som, e o contador de
  disparos da ficha é acompanhado pela marca ♪.
- `tres-caixas-tiro` (Dia 2), meta `flood`: "Em `Enquanto estiver rodando`, nasceu um tiro em cada
  passo".

**Divergência resolvida, e é a principal desta cena.** A análise do Corre, Dino! Aula 4 escreveu uma
meta `on-event` única, com o rótulo "Em `Quando acontecer`, a ação só acontece quando você aperta" e o
pedido "avance três quadros sem apertar nada, e só depois aperte a tecla". Esse pedido é duas provas
dentro de uma. A análise do Desafio Dia 2 separou as duas em `on-event` (ficou esperando) e
`key-fires` (a tecla fez acontecer). **Fica a divisão do Dia 2**, porque um id de meta não pode
significar duas coisas diferentes em dois cursos, e porque a faixa que cobra uma prova de cada vez é a
que a criança consegue seguir. **Consequência para a Aula 4 do Corre, Dino!:** o critério de conclusão
daquela seção, hoje escrito como "a meta `on-event` da cena cai", passa a ser "as metas `on-event` e
`key-fires` caem".

**Segunda divergência resolvida.** A Seção 2 do Dia 1 tem o critério "as duas metas da cena caem", e a
especificação da mesma aula lista três. **Ficam as três.** A meta `both` comprova, no mesmo teste,
que a preparação age uma vez e o movimento continua. A diferença entre criar e desenhar fica na
cena `world`, onde pode ser ensinada sem contradição.

**Terceira divergência resolvida.** A especificação do Dia 1 registrou, no campo de reuso, "Corre Dino
aula 1, Meu Jeito aula 6". As análises daqueles dois cursos decidiram o contrário: no Corre, Dino! a
cena entra na **Aula 2**, quando a criança passa a ter uma ação em cada área, e em O Jogo do Meu Jeito
a Aula 6 usa `unique-names`, que é outro assunto. **Vale o que as análises de curso decidiram.**

**Quarta divergência resolvida, de rótulo.** A ficha do preset do Corre, Dino! Aula 4 foi escrita como
"Tocar o som do pulo". O bloco real do Estúdio se chama `Tocar efeito`, em Jogo 2D › Som › Efeitos
prontos, com a opção `pulo`, e a mesma aula já manda corrigir esse rótulo na cena `jump-sound`. **A
ficha diz `Tocar efeito` com `pulo`**, porque é o nome que a criança vai procurar na coluna da
esquerda cinco minutos depois.

### Pistas

1. "Olhe o número do passo e conte quantas vezes cada ação aconteceu."
2. "Ponha uma ação em `Ao iniciar` e avance mais de um passo. Ela acontece de novo?"
3. "Agora arraste a mesma ação para `Enquanto estiver rodando` e avance de novo."
4. Só nos presets de três caixas: "Ponha a mesma ação em `Quando acontecer` e avance passos sem
   tocar no botão. O contador dela sobe?"

No preset `uma-ficha-vidas` do Dia 4 as pistas são outras duas, porque a ficha é uma só:

1. "Deixe a ficha em `Ao iniciar` e avance até a pedra encostar. Olhe os corações."
2. "Agora leve a mesma ficha para `Enquanto estiver rodando` e avance de novo. Conte quantos corações
   sobram depois de três batidas."

### Palpite seletivo

**Preset `duas-caixas-nave`, Desafio Dia 1:** sem palpite e sem pergunta final. O vídeo já apresenta
a relação, as três metas exigem comprová-la, e o quiz dedicado faz a avaliação depois.

**Presets de duas caixas, Corre, Dino! Aula 2:** "Se você põe Mover o Dino em `Ao iniciar`, o que
acontece quando o jogo roda?"

- Ele se mexe uma vez e para ✓
- Ele se mexe sem parar

**Preset `tres-caixas-tiro`, Desafio Dia 2:** "Você quer que o tiro saia só quando o jogador apertar a
tecla. Se você puser Criar um tiro em `Enquanto estiver rodando`, o que acontece?"

- Nasce um tiro em cada quadro, sem parar ✓
- Nasce um tiro só, quando você apertar

**Preset `tres-caixas-som`, Corre, Dino! Aula 4:** "Você põe `Tocar efeito` com `pulo` dentro de
`Quando acontecer` e deixa passar cinco quadros sem encostar no teclado. Quantas vezes o som toca?"

- Nenhuma ✓
- Cinco, uma por quadro

**Preset `uma-ficha-vidas`, Desafio Dia 4:** sem palpite. Ele roda depois da montagem, como
contrafactual, e a criança já fez o palpite de duas caixas no Dia 1. A faixa abre direto no pedido.

**Se ela errar:** a tela conta a resposta no instante em que a meta correspondente cai, e o palpite
volta à tela com a alternativa certa destacada.

### Pergunta depois de descobrir

**Presets de duas caixas, Desafio Dia 1:** "Você quer que a nave seja criada só no começo e se mexa o
tempo todo. Onde vai cada ação?"

- Criar em `Ao iniciar`, mover em `Enquanto estiver rodando` ✓
- As duas em `Enquanto estiver rodando`

Explicação ao acertar: "`Ao iniciar` é a arrumação: acontece uma vez, no começo. `Enquanto estiver
rodando` é o motor: acontece de novo a cada quadro, sem parar."

**Presets de duas caixas, Corre, Dino! Aula 2:** "Você quer que o Dino seja criado só no começo e ande
o tempo todo. Onde vai cada ação?"

- Criar em `Ao iniciar`, mover em `Enquanto estiver rodando` ✓
- As duas em `Enquanto estiver rodando`

Explicação ao acertar: "`Ao iniciar` é a arrumação: acontece uma vez, no começo. `Enquanto estiver
rodando` é o motor: acontece de novo a cada quadro, sem parar. O Dino foi criado uma vez e é o mesmo
Dino que aparece em todos os quadros."

**Preset `tres-caixas-tiro`, Desafio Dia 2:** "Onde vai a ação de criar o tiro?"

- Em `Quando acontecer`, na tecla ✓
- Em `Enquanto estiver rodando`

Explicação ao acertar: "`Quando acontecer` é a área que fica esperando. O que está dentro dela não
acontece sozinho e não acontece sempre: acontece na hora em que a coisa que ela espera acontece."

**Preset `tres-caixas-som`, Corre, Dino! Aula 4:** "O jogo precisa arrumar a tela uma vez no começo,
desenhar sem parar, e tocar um som quando alguém aperta uma tecla. Onde vai cada uma dessas três
coisas?"

- Arrumar em `Ao iniciar`, desenhar em `Enquanto estiver rodando`, tocar em `Quando acontecer` ✓
- As três em `Enquanto estiver rodando`

Explicação ao acertar: "`Ao iniciar` é a arrumação, e acontece uma vez. `Enquanto estiver rodando` é o
motor, e acontece a cada quadro. `Quando acontecer` fica parada esperando, e só faz alguma coisa quando
alguma coisa acontece."

**Preset `uma-ficha-vidas`, Desafio Dia 4:** "Onde vai o bloco que dá três vidas à nave?"

- Em `Ao iniciar`, para ela receber as vidas uma vez ✓
- No motor, para ela receber as vidas o tempo todo

Explicação ao acertar: "As vidas são arrumação: elas são dadas uma vez, no começo. No motor, as três
voltariam a encher em todo quadro, e a batida nunca conseguiria tirar nada."

### Frase de sucesso

- Presets de duas caixas: "Você achou a diferença: arrumar é uma vez, o motor é sempre."
- Presets de três caixas: "`Ao iniciar` é uma vez. `Enquanto estiver rodando` é sempre. `Quando
  acontecer` é na hora."

**Divergência resolvida.** A análise do Corre, Dino! Aula 4 propôs "São três jeitos diferentes de
acontecer: uma vez no começo, sempre enquanto roda, e uma vez a cada vez que acontece." Fica a do
Dia 2, que é mais curta, usa os três rótulos literais das caixas e evita o "uma vez a cada vez", que
lido ao pé da letra se contradiz.

### Roteiro de demonstração

Não tem. A cena é de experimentação: não há sequência a acompanhar, há ficha para arrastar e quadro
para avançar.

### O que o motor precisa

**Já existe e ela usa:** `advance` (o avanço quadro a quadro, de `draw-loop`), `collide` (no preset
`uma-ficha-vidas`, de `lives` e `score`).

**Precisa ser construído:**

- `place-in-area`: arrastar uma ficha de ação para dentro de uma área e tirar de volta.
- `trigger`: o botão de disparo de evento no palco, que faz a caixa `Quando acontecer` agir.
- `fire-count`: o contador de disparos por ficha, que é o instrumento de leitura da cena inteira.
- `reset-stage`: o botão Voltar ao começo.
- `schedule-hit`: as batidas agendadas por quadro, no preset `uma-ficha-vidas`. É a mesma capacidade
  que `invincibility` pede, e vale construir as duas no mesmo lote.
- **Parametrização por preset:** quantas caixas existem, quantas fichas, o que cada ficha diz e quais
  metas são cobradas precisam vir do bloco da aula, e não estar cravados na cena. Sem isso, os cinco
  usos viram cinco cenas.

### Estado: construída, com os cinco presets

A cena está no catálogo com as seis metas e os cinco presets desta especificação
(`duas-caixas-nave`, `tres-caixas-tiro`, `uma-ficha-vidas`, `duas-caixas-dino`, `tres-caixas-som`).
As três metas da terceira caixa, `on-event`, `key-fires` e `flood`, entraram como metas de **caso**,
então a missão de fábrica da cena continua sendo `once`, `always` e `both`, e cada preset de três
caixas declara as suas.

**Divergências entre o especificado e o construído, e o código vence:**

1. **A frase de sucesso virou quatro, e não duas.** Além da frase dos presets de duas caixas e da
   dos de três, a cena ganhou uma para a combinação `on-event` + `key-fires` do Corre, Dino! Aula 4
   ("Quando acontecer espera a tecla e age na hora em que ela é apertada") e uma para a missão de
   uma meta só do Desafio Dia 4 ("Em Ao iniciar, a ação acontece uma vez e a batida consegue tirar
   vidas"). A escolha é automática, pela lista de metas cobradas. É melhor do que o pedido aqui:
   com duas frases só, a Aula 4 do Corre, Dino! celebraria uma caixa que o preset dela não mostra.
2. **O rótulo de `flood` ficou literal no tiro**, e não parametrizado por objeto: "Em Enquanto
   estiver rodando, nasceu um tiro em cada quadro". Não incomoda, porque o único uso de `flood` é o
   preset `tres-caixas-tiro` do Desafio Dia 2.
3. **Os pedidos de `on-event` e `key-fires` falam "a ficha do evento"**, e não o nome literal da
   ficha, que é o que permite servir ao mesmo tempo ao tiro do Desafio e ao `Tocar efeito` do Corre,
   Dino!.

---

## `fixed-vs-read` · O número escrito e o número lido

**Grupo:** `motion`, ao lado de `aim`, de quem ela é a antessala. A alternativa defensável é `events`,
pela vizinhança com `variable`.

**Conceito abstrato que ela torna concreto:** um número escrito no campo continua o mesmo para sempre,
e um bloco de leitura pergunta onde a nave está bem na hora em que a ação acontece, e responde com o
número daquele instante.

**Tipo:** experimentação. A relação tem botão, e são dois: onde a nave está, e de onde vem o x do tiro.
Dá para escrever "quando eu movo a nave, o tiro nasce em X", e a resposta muda conforme a chave. Não é
processo no tempo: cada disparo é um caso isolado, e a prova é a comparação entre duas marquinhas, não
uma sequência.

**Prioridade:** média. Uma aula depende dela hoje, e o reuso já está mapeado em todo curso em que
alguma coisa nasce em cima de outra: disparo, moeda que nasce sobre um sprite, efeito que aparece onde
o personagem está.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| Desafio do Primeiro Jogo | Dia 2, Seção 3 "O número escrito e o número lido". **Antes** da montagem | `nave-e-tiro`: a nave no meio, x 400, a chave em "o número 400", nenhuma marquinha na tela e as marcas da caixa desligadas | `same-spot`, `follows`, `box-marks` |

**Reuso previsto fora do redesenho atual:** Corre, Dino! e O Jogo do Meu Jeito usam o mesmo par de
blocos de leitura. A grade inteira do Iniciante 2D tem disparo, coleta ou efeito que nasce em cima de
um sprite. E a cena é a antessala da `aim`, que é a mesma ideia com direção em vez de posição.

### O que a criança manipula

- **Onde a nave está:** um controle deslizante de x, de 0 a 800, de 1 em 1.
- **De onde vem o x do tiro:** uma chave de duas posições, **o número 400** ou **o centro x da nave**.
- **Atirar:** um botão que cria um tiro e deixa uma marquinha no lugar onde ele nasceu.
- **Mostrar as marcas da caixa da nave:** um interruptor que desenha duas linhas, o centro x e a borda
  de cima.
- **Limpar as marcas:** um botão.

### Como o palco começa

A nave no meio, x 400. A chave em **o número 400**. Nenhuma marquinha na tela. As marcas da caixa
desligadas. Os tiros que já saíram continuam subindo pelo caminho deles, e é isso que prova que o
número lido foi lido uma vez, no disparo, e não fica sendo lido para sempre.

### Elenco e cenário

Papéis do palco: `hero` (a nave) e `scenery` (o tiro). No cenário `nave`, esses dois papéis já trazem
de fábrica as figuras certas, então a cena nasce sem elenco declarado. **Cenário:** `nave`.

**Achado de vizinhança, resolvido:** o cenário `nave` define de fábrica `scenery: tiro`. O Dia 1 pede
a cena `layers` com a nave e o **fundo de estrelas** nesse mesmo papel, o que exigia figura declarada
explicitamente, senão aquele palco abriria com um tiro no lugar do cenário. Os dois saíram no mesmo
lote: a figura `estrelas` entrou em `SCENE_FIGURES` e o bloco `experiencia-camadas` do Dia 1 a
declara.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `same-spot` | "Com o número escrito, os dois tiros nasceram no mesmo lugar" | "Com o x em o número 400, atire, leve a nave para outro lugar e atire de novo." |
| `follows` | "Com a leitura, o tiro nasceu onde a nave estava" | "Troque para o centro x da nave, leve a nave para outro lugar e atire." |
| `box-marks` | "O tiro sai do meio da caixa e da borda de cima dela" | "Ligue as marcas da caixa da nave e atire com o centro x da nave." |

A meta `box-marks` existe porque a aula ensina, junto, que o centro x e a posição y são medidas da
**caixa**, e não do desenho. Cena separada para isso repetiria o mesmo palco por uma precisão, e é a
correção que o próprio README do v6 pede.

**Divergência resolvida na construção, e o código vence.** O pedido de `box-marks` estava escrito
como "Ligue as marcas da caixa da nave e atire", e a cena construída acrescenta "com o centro x da
nave". A linha acima já traz o texto do código. O motivo: com a chave no número escrito, a marca não
sai do meio da caixa, e o pedido antigo podia ser cumprido sem que a descoberta acontecesse.

### Pistas

1. "Atire, depois arraste a nave para longe e atire de novo. Olhe as duas marquinhas."
2. "Troque de onde vem o x do tiro e repita: atire, arraste a nave, atire."
3. "Ligue as marcas da caixa e olhe por onde o tiro sai."

### Palpite antes de abrir

"O x do tiro está com o número 400 escrito. Você leva a nave para a beirada da direita e atira. De onde
sai o tiro?"

- Do meio da tela, onde está o 400 ✓
- De perto da nave

**Se ela errar:** o palpite volta à tela quando a meta `same-spot` cai, com a marquinha das duas
tentativas em cima do mesmo ponto e a frase "As duas marquinhas caíram no mesmo lugar: o 400 estava
escrito, e escrito não muda."

### Pergunta depois de descobrir

"A nave anda o tempo todo. O que faz o tiro novo nascer sempre nela?"

- Ler o centro x da nave na hora do disparo ✓
- Escrever o número 400 no x do tiro

Explicação ao acertar: "O número escrito fica igual para sempre. O bloco de leitura pergunta onde a
nave está bem na hora do disparo, e responde com o número daquele instante. Por isso o tiro acompanha a
nave, e o tiro que já saiu segue o caminho dele."

### Frase de sucesso

"Número escrito é sempre o mesmo. Número lido é o de agora."

### Roteiro de demonstração

Não tem. A cena é de experimentação: a prova é a comparação entre duas marquinhas que ela mesma
produziu.

### O que o motor precisa

**Já existe e ela usa:** `place` (o controle de posição, de `coordinates`), `shoot` (o disparo, de
`cooldown` e de `aim`).

**Precisa ser construído:**

- `value-source`: a chave que decide se um campo recebe um número escrito ou uma leitura ao vivo de
  outro objeto. É o coração da cena.
- `spawn-mark`: a marquinha que fica no lugar onde uma coisa nasceu, com o botão de limpar.
- `box-marks`: as linhas do centro x e da borda de cima da caixa de um sprite. Serve também à cena
  `hitbox`, que hoje fala de área invisível sem nunca mostrar as duas medidas separadas.

### Estado: construída

A cena está no catálogo, no grupo `motion`, como experimentação e sem roteiro de demonstração. As
três metas, as três pistas, o palpite, a pergunta do fim, a explicação e a frase de sucesso saíram
como estão escritos acima, com a única diferença no pedido de `box-marks`, já registrada. A cena
ganhou uma pergunta extra que esta especificação não previa: "E se a nave andar depois do disparo? O
tiro que já saiu muda de caminho?". O Dia 2 do Desafio deixou de ficar em AGUARDA.

---

## `collision-pair` · Quem some na trombada?

**Grupo:** `collision`

**Conceito abstrato que ela torna concreto:** dentro de uma colisão entre dois grupos, cada apelido
aponta para um participante daquele encontro, e não para o grupo inteiro.

**Tipo:** experimentação. A relação tem botão, porque a criança escolhe o alvo de cada comando, o
apelido ou o grupo, e vê quantos objetos somem. Não é processo no tempo: a trombada acontece uma vez e
o que importa é o antes e o depois dos dois contadores.

**Prioridade:** média. Duas aulas do Desafio dependem dela: o Dia 3 abre a cena, e o Dia 4 declara o
apelido já concretizado e monta o bloco irmão sem cena nova.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| Desafio do Primeiro Jogo | Dia 3, Seção 5 "Quem some na trombada". **Antes** de montar a colisão | `tiros-e-pedras`: três pedras caindo em três colunas e três tiros subindo, com só um tiro alinhado com a pedra do meio. Os dois seletores começam no grupo inteiro | `whole-group`, `just-the-pair`, `others-stay` |
| Desafio do Primeiro Jogo | Dia 4, Seção 4 "A batida machuca" | **Sem cena.** Remissão declarada: o apelido já foi concretizado no Dia 3, e aqui ele se chama `inimigo`, no bloco irmão `Para cada sprite do grupo que colidir com o sprite`. A relação é a mesma e repetir o palco não ensina nada | nenhuma |

**Reuso previsto fora do redesenho atual:** Corre, Dino!, na colisão do Dino com o grupo de cactos. O
Jogo do Meu Jeito, na colisão da nave com o grupo. É o conceito de apelido do vocabulário canônico,
então serve a qualquer curso que use um laço de grupo.

### O que a criança manipula

- **O tiro que sai:** um seletor que alterna entre "tiro (o apelido)" e "tiros (o grupo inteiro)".
- **A pedra que sai:** um seletor que alterna entre "asteroide (o apelido)" e "asteroides (o grupo
  inteiro)".
- **Deixar a trombada acontecer:** um botão que deixa o tempo correr até o tiro alinhado encostar na
  pedra do meio.
- **Voltar ao começo.**

### Como o palco começa

Três pedras caindo em três colunas e três tiros subindo, com só um tiro alinhado com a pedra do meio.
Dois contadores à vista o tempo todo: "pedras no grupo: 3" e "tiros no grupo: 3". Os dois seletores
começam no grupo inteiro, que é o caso errado e é de propósito: é ele que produz a imagem forte da
cena, três pedras sumindo por causa de uma trombada.

### Elenco e cenário

Nave (`hero`), tiro e asteroide. **Cenário:** `nave`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `whole-group` | "Escolhendo o grupo, sumiu todo mundo" | "Deixe os dois seletores no grupo inteiro e deixe a trombada acontecer." |
| `just-the-pair` | "Escolhendo os apelidos, sumiram só os dois que se bateram" | "Troque os dois seletores para os apelidos, volte ao começo e deixe a trombada acontecer." |
| `others-stay` | "As outras pedras continuaram o caminho delas" | "Com os apelidos escolhidos, deixe o tempo passar até as outras duas pedras saírem pela borda de baixo." |

### Pistas

1. "Olhe os dois contadores antes e depois da trombada."
2. "Só um tiro encostou numa pedra. Quantos sumiram?"
3. "Troque o alvo dos dois comandos para os apelidos, tiro e asteroide, e faça de novo."

### Palpite antes de abrir

"Três tiros e três pedras estão no jogo. Um tiro encosta numa pedra, e o comando manda tirar o grupo
asteroides. O que some?"

- Só a pedra que foi atingida
- Todas as pedras do jogo ✓

**Se ela errar:** o palpite volta à tela quando a meta `whole-group` cai, com o contador de pedras indo
de 3 para 0 destacado, e a frase "O comando falou com o grupo, e o grupo é todo mundo."

### Pergunta depois de descobrir

"Dentro dessa colisão, quem é asteroide?"

- A pedra que participou daquele encontro ✓
- Todas as pedras do grupo ao mesmo tempo

Explicação ao acertar: "O bloco dá um apelido para cada um dos dois que se encostaram. O apelido vale só
dentro daquela trombada, e é por isso que as outras pedras continuam no jogo."

### Frase de sucesso

"O apelido aponta para um. O grupo aponta para todos."

### Roteiro de demonstração

Não tem. A cena é de experimentação: a trombada é o mesmo evento nos dois casos, e o que muda é a
escolha dela.

### O que o motor precisa

**Já existe e ela usa:** `advance` e `collide` (de `lives` e `score`), `connect`.

**Precisa ser construído:**

- `command-target`: o alvo de um comando, com os valores apelido e grupo. **Atenção ao nome:** já
  existe uma ação chamada `target` no motor, usada pela cena `aim` para escolher o alvo da mira. São
  coisas diferentes, e reusar o nome quebra a cena `aim`. Este documento fixa `command-target`.
- `group-count`: contadores por grupo à vista, atualizados a cada quadro.

### Estado: construída

A cena está no catálogo, no grupo `collision`, como experimentação e sem roteiro de demonstração. As
três metas, os rótulos, os pedidos, as três pistas, o palpite, a pergunta do fim, a explicação e a
frase de sucesso saíram idênticos ao que está escrito acima. A cena ganhou uma pergunta extra que
esta especificação não previa: "E se só um dos dois comandos usar o apelido?". O Dia 3 do Desafio
deixou de ficar em AGUARDA.

---

## `invincibility` · O respiro depois da batida

**Grupo:** `events`, ao lado de `cooldown` e de `lives`, que são as duas cenas da mesma família (uma
janela de tempo que conta para trás).

**Conceito abstrato que ela torna concreto:** depois de levar dano, o sprite ignora danos novos por um
número de quadros. É uma janela de tempo que conta para trás, não um escudo que dura a partida inteira.

**Tipo:** experimentação. A relação tem botão, e o botão é o número de quadros: dá para escrever "quando
eu aumento a proteção, menos batidas contam". O avanço de quadros é o instrumento que torna a janela
legível, não o conteúdo.

**Prioridade:** média. Uma aula depende dela hoje, e ela é o degrau 8 da escada de conceitos e o padrão
4.8 do documento de pedagogia, onde "quadros de invencibilidade" é o termo canônico.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| Desafio do Primeiro Jogo | Dia 4, Seção 3 "O respiro depois da batida". **Antes** de montar o bloco que tem o campo 45 | `tres-pedras`: a nave com três corações cheios, o contador de quadros em 0, e três pedras diferentes a caminho, marcadas para encostar nos quadros 1, 10 e 30 | `no-shield`, `window`, `expires` |

**Reuso previsto fora do redesenho atual:** Corre, Dino!, na batida contra o cacto. O Jogo do Meu
Jeito. E qualquer aula que use `Machucar o sprite em e deixá-lo invencível por quadros`.

### O que a criança manipula

- **Proteção:** um controle com os valores 0, 15, 45 e 90 quadros.
- **Avançar 1 quadro.**
- **Avançar até a próxima pedra**, que pula direto para o quadro da batida seguinte.
- **Voltar ao começo.**

### Como o palco começa

A nave com três corações cheios, o contador de quadros em 0, e as três pedras a caminho, marcadas para
encostar nos quadros 1, 10 e 30. A faixa mostra duas informações o tempo todo: as vidas que restam e
"proteção: 0 quadros restando".

**Honestidade obrigatória no palco.** As três pedras somem nos três testes, porque cada uma é retirada
do grupo no instante da batida. O que muda entre os testes é só a contagem de vidas. Sem isso, a cena
ensinaria que a proteção faz a pedra atravessar, que é falso, e a criança pode conferir no jogo dela e
descobrir que a cena mentiu.

### Elenco e cenário

Nave (`hero`) e asteroide (`obstacle`). **Cenário:** `nave`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `no-shield` | "Sem proteção, as três batidas tiraram as três vidas" | "Deixe a proteção em 0 e avance até passar a terceira pedra." |
| `window` | "Com 45 quadros, só a primeira batida tirou vida" | "Ponha a proteção em 45, volte ao começo e avance até passar a terceira pedra." |
| `expires` | "Com 15 quadros, a proteção acabou antes da terceira pedra" | "Ponha a proteção em 15, volte ao começo e avance até passar a terceira pedra." |

A meta `expires` é a que impede a leitura errada mais provável, a de que proteção ligada quer dizer
proteção para sempre. Sem ela a cena ensina metade da ideia.

### Pistas

1. "Depois da primeira batida, olhe a faixa da proteção contando para trás."
2. "Compare quantas vidas sobraram com a proteção em 0 e com a proteção em 45."
3. "Ponha 15 e olhe em que quadro a proteção chega a zero. A pedra do quadro 30 chega antes ou depois
   disso?"

### Palpite antes de abrir

"A nave tem três vidas e três pedras diferentes vão encostar nela, uma logo atrás da outra, com 45
quadros de proteção ligados. Quantas vidas sobram?"

- Nenhuma
- Duas ✓

**Se ela errar:** o palpite volta à tela quando a meta `window` cai, com os dois corações que sobraram
destacados e a frase "As três pedras bateram. Só a primeira tirou vida, porque as outras duas chegaram
dentro dos 45 quadros."

### Pergunta depois de descobrir

"Por que só a primeira batida tirou vida quando a proteção estava em 45?"

- Porque os danos seguintes foram ignorados enquanto a proteção contava ✓
- Porque a nave ficou com vidas infinitas até o fim da partida

Explicação ao acertar: "A proteção é uma janela de tempo. Enquanto ela está contando, dano novo não
entra. Quando ela chega a zero, a próxima batida volta a tirar vida."

### Frase de sucesso

"A proteção não é um escudo para sempre: é um respiro com prazo."

### Roteiro de demonstração

Não tem. A cena é de experimentação: o número de quadros é o botão, e a criança compara três valores.

### O que o motor precisa

**Já existe e ela usa:** `advance` e `collide`.

**Precisa ser construído:**

- `shield`: um contador regressivo de proteção por sprite, legível na faixa a cada quadro.
- `schedule-hit`: batidas agendadas por quadro, para as três pedras chegarem sempre nos mesmos
  instantes em todos os testes. É a mesma capacidade que o preset `uma-ficha-vidas` de
  `once-vs-always` pede.
- `advance-to`: avançar até o próximo evento agendado, para ela não precisar apertar trinta vezes.

### Estado: construída

A cena está no catálogo, no grupo `events`, como experimentação e sem roteiro de demonstração. As
três metas, os rótulos, os pedidos, as três pistas, o palpite, a pergunta do fim, a explicação e a
frase de sucesso saíram idênticos ao que está escrito acima, e a pergunta extra ("E se a proteção
durasse 90 quadros?") casa com o valor 90 do controle. Nada diverge. O Dia 4 do Desafio deixou de
ficar em AGUARDA.

---

## `number-line` · A régua dos números negativos

> **Construída, e ela confere com esta especificação.** Conferência de 19/09/2026 contra
> `catalog.ts`: grupo, título, instrução, campo do que ela manipula, as quatro metas com os mesmos
> ids, rótulos e pedidos, as três pistas na mesma ordem, a frase de sucesso e a pergunta extra batem
> palavra por palavra. **Nenhuma divergência.** Duas notas de implementação: a cena não tem roteiro
> de demonstração, como esta especificação já previa, e o palpite e a pergunta final passaram a
> morar também na cena (`questions.ts`), com `revealOn` em `greater`, além de poderem ser declarados
> no bloco da aula.

**Grupo:** `speed`, junto de `random` e `acceleration`.

**Conceito abstrato que ela torna concreto:** quanto mais para a esquerda da régua um número mora,
menor ele é, e é isso que a pergunta "é maior que?" responde. Com o sinal errado, ela responde não para
sempre, sem aviso nenhum.

**Tipo:** experimentação. A relação tem botão duas vezes: dá para escrever "quando eu levo o marcador
para a esquerda, a resposta vira não" e "quando eu troco o sinal, a resposta muda sem o número ter
mudado".

**Prioridade:** média. Uma aula depende dela hoje, e o reuso já está mapeado em quatro cursos da grade.
É o segundo maior reuso potencial do catálogo, atrás só de `once-vs-always`, porque comparação e limite
aparecem em quase todo jogo.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| Corre, Dino! | Aula 13, Seção 3 "A régua dos números negativos". **Antes** de montar | `velocidade-menos-nove`: régua de -12 a 0, bandeirinha fixa no -9, marcador no -5, sinal em `=` | `colder`, `greater`, `stops`, `silent` |

**Reuso previsto fora do redesenho atual:** curso 2 (Pong), quando a velocidade da bola troca de sinal.
Curso 3 (Duelo de Heróis) e curso 6 (Sobrevivente), quando a vida desce até zero e a pergunta segura o
fundo. Curso 9 (Dino Corredor Profissional), no recorde. E o Desafio do Primeiro Jogo, em qualquer dia
em que um valor ganhe limite.

### O que a criança manipula

1. Um **marcador** do valor da base sobre uma régua deitada de -12 a 0, de 1 em 1. Ela arrasta o
   marcador ou usa os dois botões de passo.
2. Um botão **Somar -1**, que anda o marcador uma casa para a esquerda. É o mesmo gesto que o relógio
   de 5 segundos faz no jogo, com o mesmo rótulo do bloco.
3. Um botão **Voltar ao começo**, que devolve o marcador ao -5.
4. Um **seletor de sinal** com três opções: `>`, `=` e `<`. Três, e não os oito do menu real, para a
   cena ficar sobre a comparação e não sobre a lista. A aula continua mandando abrir a listinha do
   bloco e escolher o quinto item, e a cena não contradiz isso porque não mostra a lista do bloco.

### Como o palco começa

A régua deitada de -12 a 0, com uma bandeirinha fixa no -9 e o marcador no -5. O sinal começa no `=`,
que é como o bloco nasce. Embaixo da régua, a frase montada com as peças: `velocidade` `=` `-9`, e ao
lado dela a resposta, **não**, em palavra e em ícone. Um contador de quantas vezes o Somar -1 foi
apertado, em 0.

A resposta embaixo da régua é o instrumento inteiro desta cena. É ela que faz o erro silencioso ficar
legível: no jogo dela, o mesmo erro não tem sintoma nenhum.

### Elenco e cenário

Nenhum personagem do elenco. A cena desenha a régua, a bandeirinha, o marcador e a frase. **Cenário:**
`corre-dino`, pelas cores, para a criança reconhecer que é o jogo dela que está sendo discutido.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `colder` | "Somar -1 anda uma casa para a esquerda, e para a esquerda é mais rápido" | "Aperte Somar -1 três vezes e olhe onde o marcador para." |
| `greater` | "-5 é maior que -9, porque mora à direita dele na régua" | "Volte ao começo e troque o sinal para o biquinho que aponta para a direita." |
| `stops` | "No -9 a pergunta diz não, e a base para ali" | "Com o biquinho escolhido, leve o marcador até o -9." |
| `silent` | "Com o igual, a resposta é não em todo lugar menos num" | "Volte ao começo, ponha o sinal no igual e aperte Somar -1 quatro vezes." |

### Pistas

1. "A régua é parecida com um termômetro deitado. O -9 fica mais para a esquerda que o -5."
2. "Olhe a frase embaixo da régua. A resposta muda sozinha conforme o marcador anda."
3. "Deixe o marcador no -5 e troque o sinal para o biquinho que aponta para a direita. Depois leve o
   marcador até o -9 e olhe a resposta."

### Palpite antes de abrir

"Na régua, qual dos dois é o maior: -5 ou -9?"

- -5, porque está mais à direita ✓
- -9, porque 9 é maior que 5

**Se ela errar:** a tela conta depois, quando a meta `greater` cai: "Na régua, o -9 mora à esquerda do
-5. Quem está mais à direita é o maior." O palpite volta à tela nesse instante.

### Pergunta depois de descobrir

"Se o sinal ficar no igual, o que acontece com uma base que começa em -5?"

- Ela para no -9, igual.
- Ela nunca muda, porque -5 não é igual a -9 ✓

Explicação ao acertar: "Com o igual, a pergunta só diz sim no -9 exato. A base começa no -5, então a
resposta é não já na primeira vez, e ela fica parada para sempre. E o jogo não mostra aviso nenhum,
porque não tem erro nenhum: a pergunta foi respondida, e a resposta foi não."

### Frase de sucesso

"Na régua, quem está mais à direita é o maior. E o sinal decide o que a pergunta responde."

### Roteiro de demonstração

Não tem. A cena é de experimentação, e é justamente por isso que ela existe: o erro do sinal igual não
tem sintoma, então ele só se aprende num lugar onde a resposta da pergunta está escrita na tela a cada
passo. Uma demonstração desse erro não mostraria nada, que é exatamente o problema.

### O que o motor precisa

**Já existe e ela usa:** nada diretamente. O palco é novo.

**Precisa ser construído:**

- `step-value`: um marcador sobre régua, com mínimo, máximo, passo e a possibilidade de arrastar.
- `compare-op`: a troca de operador (`>`, `=`, `<`), com a frase montada e a resposta legível embaixo
  da régua, recalculada a cada passo.
- `fire-count`: o contador de quantas vezes o botão foi apertado. É o mesmo que `once-vs-always` pede.
- `reset-stage`: o botão Voltar ao começo.

---

## `copy-vs-original` · A cópia e o original

**Grupo:** `world`

**Conceito abstrato que ela torna concreto:** exportar tira uma cópia para um arquivo e importar
transforma essa cópia num projeto. Depois disso são dois jogos separados, e mexer num não mexe no
outro.

**Tipo:** experimentação. A relação tem botão, e o botão é **em qual dos dois lados ela mexe**. Dá para
escrever a frase do critério: "quando eu mudo a cor da nave de um lado, a do outro lado fica como
estava". Um roteiro que só toca não alcançaria a segunda metade da ideia, porque é ela quem precisa
escolher o lado.

**Prioridade:** média. Uma aula depende dela hoje, e o reuso já está mapeado no Desafio do Primeiro
Jogo e em qualquer curso que ensine o Fazer a minha versão do Mural.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 1, Seção 4 "Uma cópia vai, e o original fica". **Antes** de percorrer as telas do caminho | `aula-e-estudio`: duas telas lado a lado, a da aula com o jogo da nave dentro, a do Estúdio vazia, e o meio sem arquivo nenhum | `exported`, `imported`, `independent` |

**Reuso previsto fora do redesenho atual:** Desafio do Primeiro Jogo, onde o Enviar para o professor e
o Sincronizar com o enviado são a mesma ideia de cópia com duas pontas. E qualquer curso que ensine o
Fazer a minha versão do Mural, que cria um projeto novo a partir da versão do dia da publicação.

**Divergência resolvida.** A análise da Aula 1 registrou que a Aula 8 deste mesmo curso usaria esta
cena, porque a tela Compartilhar diz literalmente que a versão publicada fica do jeito que está. A
análise da Aula 8 decidiu por uma cena própria, `published-copy`. **Ficam as duas**, e o motivo é o
foco: a terceira meta desta é `independent` (mexer num lado não mexe no outro), e a terceira da outra é
`republish` (o Mural só muda quando você publica de novo), que é uma segunda metade que só existe com o
botão Publicar. Forçar uma cena só apresentaria o Publicar sete aulas antes da hora, o que o briefing
proíbe. As duas compartilham o palco de dois painéis e a ação `recolor`, então são baratas juntas e
devem ser construídas no mesmo lote.

### O que a criança manipula

- **Exportar:** botão do lado da aula. Faz nascer o cartão do arquivo no meio da tela, com o nome
  terminando em `.szproject.json`.
- **Importar:** botão do lado do Estúdio. Só fica ativo depois que o arquivo existe. Faz nascer o
  projeto no lado do Estúdio.
- **Pintar a nave de outra cor:** um botão em cada lado, que troca a cor do corpo da nave daquele lado
  por uma das quatro cores do seletor.
- **Voltar ao começo.**

### Como o palco começa

Duas telas lado a lado, com rótulo em cima de cada uma: **A aula do Desafio**, à esquerda, com o jogo
da nave dentro, e **O Estúdio Completo**, à direita, vazio, com a frase "Você ainda não tem projetos".
O meio, onde o arquivo vai aparecer, começa sem nada.

### Elenco e cenário

Sem elenco declarado. **Cenário:** `nave`, e não `meu-jeito`. É a escolha certa aqui e o motivo vale
registrar: o jogo retratado é o do Dia 5 do Desafio, que ainda tem a nave e o asteroide de fábrica. A
arte da criança só entra na Aula 6, e as outras cenas deste curso usam `meu-jeito` porque retratam a
pedra e a chama que ela desenha. Os dois cenários têm fundo escuro com estrelas, então a troca não muda
a paleta do palco, só as figuras.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `exported` | "O arquivo saiu, e o jogo continuou na aula" | "Aperte Exportar e olhe o lado da aula." |
| `imported` | "O mesmo jogo apareceu no Estúdio" | "Com o arquivo pronto, aperte Importar." |
| `independent` | "Mudou a cor de um lado, e o outro ficou como estava" | "Com jogo nos dois lados, pinte a nave de um lado só." |

### Pistas

1. "Aperte Exportar e olhe o lado da aula antes de olhar o arquivo."
2. "Com o arquivo no meio, aperte Importar e compare as duas telas."
3. "Pinte a nave do lado do Estúdio e olhe a nave do lado da aula."

### Palpite antes de abrir

"Você exporta o jogo que está na aula do Desafio. O que acontece com o jogo que estava lá?"

- Ele continua na aula, inteiro ✓
- Ele sai da aula e vai para dentro do arquivo

**Se ela errar:** a tela conta depois, quando a meta `exported` cai: "O jogo continuou na aula. O
arquivo levou uma cópia." O palpite volta à tela nesse instante.

### Pergunta depois de descobrir

"Você pintou a nave de outra cor no projeto do Estúdio. E a nave do jogo que está na aula do Desafio?"

- Continua com a cor de antes ✓
- Muda junto, porque é o mesmo jogo

Explicação ao acertar: "O arquivo levou uma cópia. Depois de importar, são dois jogos separados: cada
um guarda o que você fizer nele."

### Frase de sucesso

"Exportar tira uma cópia, importar transforma a cópia num projeto seu, e daí em diante cada um segue o
seu caminho."

### Roteiro de demonstração

Não tem. A cena é de experimentação, e a segunda metade da ideia depende de ela escolher em qual lado
mexer.

### O que o motor precisa

**Já existe e ela usa:** o palco de dois painéis lado a lado, que `delta-time` (dois computadores) e
`contact` (duas pistas) já montam.

**Precisa ser construído:**

- `export-file`: o cartão do arquivo nascendo no meio, com nome e extensão visíveis, sem tirar nada do
  painel de origem. **Construída**, exclusiva desta cena.
- `import-file`: a chegada do arquivo no painel de destino, virando projeto. **Construída**, exclusiva
  desta cena.
- `recolor`: trocar a cor de uma peça dentro de um painel, por painel. **Construída**, com `side` em
  `lesson` ou `studio` e quatro cores. Compartilhada com `published-copy`, que usa `side: "project"`.
- `reset-stage`: o botão Voltar ao começo. **Não virou ação própria:** o motor reusa o `reset` que já
  existia, e a interface chama o gesto de "Voltar ao começo". É a única divergência desta cena.

### Divergência entre o especificado e o construído

Só a de `reset-stage`, acima. Título, instrução, o que a criança manipula, frase de sucesso, pergunta
extra, as três metas com rótulo e pedido e as três pistas entraram no catálogo palavra por palavra.

---

## `motion-amount` · O tanto que muda

**Grupo:** `art`

**Conceito abstrato que ela torna concreto:** entre dois quadros, o quanto um detalhe se desloca decide
se o olho vê parado, movimento ou tremedeira, e quem tem que ficar no lugar é o corpo.

**Tipo:** experimentação. A relação tem botão e a frase se escreve inteira duas vezes: "quando eu
aumento o quanto a cratera anda, o desenho passa de parado para rolando" e "quando eu aumento o quanto
a pedra inteira anda, ele passa de rolando para pulando". A Prévia rodando ao lado é o instrumento de
leitura, não uma sequência a acompanhar.

**Prioridade:** média. Uma aula depende dela hoje, e ela fecha o mesmo buraco de animação em três
cursos.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 5, Seção 5 "Dois quadros, e o tanto que muda". **Antes** de mexer no segundo quadro | `pedra-dois-quadros`: os dois quadros iguais, com a pedra, três crateras e uma chama. A Prévia tocando a 8 por segundo e parecendo uma imagem parada. Os dois controles em 0 | `no-change`, `local-move`, `too-much` |

**Reuso previsto fora do redesenho atual:** Corre, Dino!, na animação de correr, que também é de dois
quadros com o corpo parado e as pernas trocando. Desafio do Primeiro Jogo, no fogo da nave entre pequeno
e grande. E a Aula 3 deste mesmo curso, onde a relação aparece pela primeira vez e hoje só tem a cena
`frames`, que mostra o efeito e não o tanto.

**Por que nenhuma cena de `art` que já existe serve:**

- `frames` manipula qual quadro aparece, a prévia tocando e a velocidade dela. Ela responde "dois
  desenhos viram movimento", que é a pergunta da Aula 3, e não tem nenhum controle de deslocamento.
- `onion-skin` chega perto, porque manipula o tamanho do fogo no quadro 2 comparando com o quadro 1.
  Mas o foco dela é o fantasma como guia de alinhamento, e este curso liga o fantasma na Aula 3. Trazer
  ela para cá repetiria o palco da Aula 3 com o foco errado.
- `symmetry` e `pixel-vector` são de outro assunto.

### O que a criança manipula

- **O tanto que a cratera anda:** 0 a 12, de 1 em 1.
- **O tanto que a pedra inteira anda:** 0 a 12, de 1 em 1.
- **A Prévia**, que toca sozinha a 8 por segundo ao lado dos dois quadros parados, com um botão de
  parar e voltar a tocar.

### Como o palco começa

Os dois quadros lado a lado, iguais, com a pedra, três crateras e uma chama. A Prévia tocando e
parecendo uma imagem parada. Os dois controles em 0.

Começar com a Prévia tocando e parada ao mesmo tempo é o que torna a primeira meta uma descoberta em vez
de uma obviedade: ela vê que tocar rápido não basta.

### Elenco e cenário

Personagem `pedra`. **Cenário:** `meu-jeito`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `no-change` | "Os dois quadros iguais deixam a Prévia parada" | "Deixe os dois controles em 0 e olhe a Prévia." |
| `local-move` | "A cratera andando um pouco já faz a pedra parecer que rola" | "Deixe o tanto da pedra inteira em 0 e ponha o da cratera entre 3 e 6." |
| `too-much` | "Com a pedra inteira andando muito, o desenho pula em vez de rolar" | "Ponha o tanto que a pedra inteira anda em 10 ou mais." |

A meta `local-move` aceita **faixa**, de 3 a 6, e não um valor exato. A regra travada no projeto é que
todo campo declarado livre pela aula tem critério em faixa.

### Pistas

1. "Os dois quadros estão iguais. Olhe a Prévia e depois mexa em um controle só."
2. "Deixe a pedra inteira parada e mexa só na cratera. Comece em 3."
3. "Agora mexa no tanto que a pedra inteira anda e olhe a Prévia de novo."

### Palpite antes de abrir

"Os dois quadros são iguais. O que a Prévia mostra?"

- Uma pedra parada ✓
- Uma pedra girando

**Se ela errar:** o palpite volta à tela quando a meta `no-change` cai, com a frase "Trocar depressa
dois desenhos iguais não faz movimento nenhum. O movimento está na diferença entre eles."

### Pergunta depois de descobrir

"Você quer que a sua pedra pareça rolando. O que muda no segundo quadro?"

- Uma cratera e uma ponta do fogo, um pouquinho ✓
- A pedra inteira, para um canto bem diferente

Explicação ao acertar: "O olho lê rolagem quando o corpo fica no lugar e os detalhes andam um pouco.
Quando o corpo inteiro muda de lugar, o olho lê um pulo."

### Frase de sucesso

"O corpo fica parado e os detalhes andam um pouco. É esse o tanto que faz a pedra rolar."

### Roteiro de demonstração

Não tem. A cena é de experimentação, e ela existe justamente porque a versão narrada deste conteúdo
entrega um critério de parada que é opinião ("se ficou doido demais, mexe menos"). Só mexendo nos dois
controles a criança encontra o próprio critério.

### O que o motor precisa

**Já existe e ela usa:** `play` e `rate` (a prévia de dois quadros com velocidade, de `frames`),
`frame`.

**Precisa ser construído:**

- `nudge`: um controle de deslocamento por peça, que a cena aplica na cratera e no corpo, com faixa e
  passo declarados. **Construída**, com `piece` em `crater` ou `body` e `amount` inteiro de 0 a 12.

### Divergência entre o especificado e o construído

Nenhuma. Título, instrução, o que a criança manipula, frase de sucesso, pergunta extra, as três metas
com rótulo e pedido e as três pistas entraram no catálogo palavra por palavra.

---

## `unique-names` · Cada nome só pode ser de uma coisa

**Grupo:** `world`

**Conceito abstrato que ela torna concreto:** no mesmo trecho do projeto, um nome pertence a uma coisa
só. Se o nome que os blocos procuram não existe, eles avisam e a tela para de mudar. Se dois blocos
criam o mesmo nome, o Estúdio recusa e pede um nome diferente.

**Tipo:** experimentação. A relação tem botão, e o botão é o próprio nome: quando ela escreve o mesmo
nome nos dois blocos, o aviso acende, e quando ela troca um, ele apaga.

**Prioridade:** média. Duas aulas do Meu Jeito dependem dela: a 6 abre a cena, e a 7 usa a mesma regra
ao contrário, em duas frases, sem cena nova.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 6, Seção 3 "Cada nome só pode ser de uma coisa". **Depois** de apagar o criador do kit, com os avisos acesos no jogo dela | `nave-e-folha`: o bloco de cima cria `nave`, o de baixo está com o campo vazio, os três blocos da direita estão sem aviso e a tela mostra uma nave voando | `missing`, `clash`, `own-name` |
| O Jogo do Meu Jeito | Aula 7 | **Sem cena.** Remissão declarada, em duas frases dentro da construção: aqui ela monta antes de apagar, ao contrário da Aula 6, porque o bloco velho da nave criava o nome `nave` e o bloco velho da pedra não cria nome nenhum. A cena da Aula 6 se paga aqui | nenhuma |

**Reuso previsto fora do redesenho atual:** Desafio do Primeiro Jogo, onde ela cria os grupos `tiros` e
`asteroides`, a variável `pontos` e a constante `alvo`, e onde a mesma regra vale sem nunca ser dita.
Corre, Dino!, nos grupos e variáveis.

**Por que nenhuma cena existente serve:** `world` trata de criar contra mostrar um objeto, e não de
nome. `variable` trata de guardar, mudar e mostrar um valor, e o nome dela é dado. Nenhuma das 45 toca
em declaração de nome nem em aviso do Estúdio.

### O que a criança manipula

- **O bloco de cima**, que cria um nome, com dois botões: **Tirar este bloco** e **Pôr de volta**.
- **O campo de nome do bloco de baixo**, com três opções numa listinha: `nave`, `folha-nave` e `nave2`.
- Ao lado, a tela do jogo e três blocos que citam `nave`, cada um com um espaço para o sinal de aviso.

### Como o palco começa

O bloco de cima cria `nave`. O bloco de baixo está com o campo de nome vazio. Os três blocos da direita
estão sem aviso. A tela mostra uma nave voando.

**Fidelidade obrigatória.** Os dois avisos precisam ser os textos reais da tela do Estúdio. O de nome
ausente é *"O nome nave ainda não foi criado neste jogo"*. O de nome repetido é *"O nome nave já foi
criado neste trecho; escolha um nome diferente"*. E o congelamento do preview precisa ser mostrado como
o Estúdio faz de verdade: a tela segura a última versão que funcionava, e não fica preta nem vazia. A
criança acabou de ver exatamente isso no jogo dela, segundos antes de abrir a cena, e qualquer
diferença aqui desfaz a ligação.

**Tom.** Ajudante, nunca bronca, como no resto dos cursos.

### Elenco e cenário

Esta cena não desenha personagem do elenco: ela desenha blocos, campos, avisos e a tela do jogo.
**Cenário:** `meu-jeito`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `missing` | "Sem o bloco que cria o nome, os outros acendem o aviso e a tela para de mudar" | "Tire o bloco de cima e olhe os três blocos e a tela." |
| `clash` | "Dois blocos criando o mesmo nome: o Estúdio pede um nome diferente" | "Ponha o bloco de cima de volta e escolha `nave` também no bloco de baixo." |
| `own-name` | "Com um nome só dela, a folha fica junto da nave sem briga" | "No bloco de baixo, troque `nave` por `folha-nave`." |

### Pistas

1. "Olhe os três blocos da direita. Eles procuram um nome. Quem cria esse nome?"
2. "Ponha os dois blocos criando `nave` e leia o aviso que aparece."
3. "Dê um nome só dele ao bloco de baixo, com `folha` na frente."

### Palpite antes de abrir

"Os dois blocos vão criar o nome `nave`. O que acontece?"

- O Estúdio pede um nome diferente ✓
- O segundo substitui o primeiro

**Se ela errar:** o palpite volta à tela quando a meta `clash` cai, com o aviso literal em destaque e a
frase "Ninguém foi substituído. O Estúdio parou e pediu um nome diferente."

### Pergunta depois de descobrir

"No seu jogo, o sprite já se chama `nave`. Que nome dar para a folha de quadros dele?"

- `folha-nave`, um nome só dela ✓
- `nave`, porque é o desenho da nave

Explicação ao acertar: "Quando dois blocos criam o mesmo nome no mesmo trecho, o Estúdio para e pede um
nome diferente. Por isso a folha recebe o nome dela, `folha-nave`, e a nave continua com o nome dela."

### Frase de sucesso

"Cada nome é de uma coisa só, e é por isso que a folha ganhou nome próprio."

### Roteiro de demonstração

Não tem. A cena é de experimentação: tirar o bloco, repetir o nome e trocar o nome são três gestos dela,
e cada um acende ou apaga um aviso diferente.

### O que o motor precisa

**Já existe e ela usa:** nada diretamente. O palco é novo.

**Precisa ser construído:**

- `name-field`: escolher ou digitar o nome de um bloco, com listinha de opções. **Construída**, com a
  lista fechada em campo vazio, `nave`, `folha-nave` e `nave2`.
- `toggle-block`: tirar um bloco da pilha e pôr de volta, com a pilha religando sozinha.
  **Construída**.
- `studio-warning`: o sinal de aviso por bloco com o texto literal do Estúdio, mais o congelamento do
  preview segurando a última versão que funcionava. **Construído dentro do palco**, e não como ação.

### Divergência entre o especificado e o construído

Duas, as duas de escrita e as duas a favor do construído. As crases dos nomes saíram dos textos que
aparecem na tela, porque a cena não formata código, e a terceira pista concorda com a folha: "um nome
só **dela**", e não "dele". O catálogo é a versão que vale, e esta especificação já está alinhada.

---

## `two-clocks` · Dois relógios ao mesmo tempo

**Grupo:** `population`

**Conceito abstrato que ela torna concreto:** o relógio que faz nascer uma pedra e o relógio que troca
os desenhos de cada pedra são dois relógios diferentes, e cada pedra começa o seu próprio giro no
instante em que nasce.

**Tipo:** experimentação. A relação tem dois botões, e o conteúdo é a independência entre eles: quando
eu aumento o ritmo de nascer, vem mais pedra e o giro de cada uma continua igual; quando eu aumento a
velocidade do giro, elas giram mais rápido e continua nascendo na mesma hora. Independência só se sente
mexendo em um e vendo o outro parado, e nenhuma demonstração faz isso.

**Prioridade:** média. Uma aula depende dela hoje, e ela é a única cena do catálogo que desambigua a
palavra quadro, que é um problema de vocabulário de todos os cursos de jogo.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 7, Seção 3 "Dois relógios ao mesmo tempo". **Antes** de montar o criador novo | `pedras-girando`: a tela vazia, o relógio de nascer em 40, a animação em 8, o tempo parado | `more-rocks`, `faster-spin`, `each-one` |

**Reuso previsto fora do redesenho atual:** Corre, Dino!, onde os cactos nascem em série e podem
animar. Desafio do Primeiro Jogo, no dia dos asteroides, onde a palavra quadro aparece pela primeira vez
com dois sentidos. E qualquer curso com inimigo animado que nasce ao longo da partida.

**Por que nenhuma cena existente serve:**

- `spawn`, que a aula usa hoje, manipula o intervalo do relógio de nascimento e ensina que sem relógio
  vira parede. Nesta aula a criança não toca no relógio, e a cena não tem animação nenhuma nos sprites,
  então ela não pode mostrar dois relógios.
- `frames` manipula a velocidade da animação, e não tem nascimento.
- `pool` e `cleanup` são sobre o que acontece com quem sai da tela.
- `enemy-type` chega perto no formato (vários nascem de uma ficha só), mas o conteúdo dela é ficha
  compartilhada contra cópia ao nascer, que este curso não ensina.

### O que a criança manipula

- **A cada quantos quadros nasce uma pedra:** 20, 40 ou 80.
- **Quantos desenhos por segundo cada pedra troca:** 2, 8 ou 16.
- **▶ Tempo**, que deixa o tempo correr, e **Voltar ao começo**.

### Como o palco começa

A tela vazia, o relógio de nascer em 40, a animação em 8, o tempo parado. Duas coisas contadas à vista:
uma faixa embaixo com **pedras que nasceram**, e, em cima de cada pedra na tela, o número do quadro que
ela está mostrando agora, 0 ou 1.

O rótulo em cima de cada pedra é a peça que torna a meta `each-one` observável. Sem ele, "cada pedra
começa o giro dela quando nasce" continua invisível, que é o problema que a cena existe para resolver.

### Elenco e cenário

Personagem `nave` (`hero`), obstáculo `asteroide`. **Cenário:** `meu-jeito`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `more-rocks` | "Mudando só o relógio de nascer, veio mais pedra, e cada uma continuou girando no mesmo ritmo" | "Deixe a animação em 8, ponha o relógio em 20 e deixe o tempo passar." |
| `faster-spin` | "Mudando só a animação, as pedras giraram mais rápido, e continuou nascendo na mesma hora" | "Deixe o relógio em 40, ponha a animação em 16 e deixe o tempo passar." |
| `each-one` | "Cada pedra começou no quadro 0, na hora em que ela nasceu" | "Deixe o tempo passar até nascerem três pedras e olhe o número em cima de cada uma na hora em que ela entra." |

### Pistas

1. "São dois números que andam sozinhos: quantas pedras já nasceram e qual desenho cada pedra está
   mostrando agora."
2. "Mexa num controle de cada vez. Primeiro no de nascer, depois no do giro."
3. "Deixe nascer três pedras e olhe o número em cima de cada uma no instante em que ela aparece."

### Palpite antes de abrir

"Se as pedras nascerem mais juntas, o giro de cada uma fica mais rápido?"

- Não, o giro continua igual ✓
- Fica, porque é o mesmo relógio

**Se ela errar:** o palpite volta à tela quando a meta `more-rocks` cai, com as duas leituras lado a
lado, mais pedras na faixa e o mesmo ritmo de troca em cima de cada uma.

### Pergunta depois de descobrir

"Onde encaixar o bloco que manda a pedra girar?"

- Logo depois do bloco que cria a pedra, dentro do mesmo relógio ✓
- Uma vez só, no `Ao iniciar`

Explicação ao acertar: "A pedra só existe depois de nascer. O bloco de animar precisa estar logo depois
do de criar, dentro do mesmo relógio, para alcançar cada pedra nova. No `Ao iniciar` ele rodaria uma
vez, quando ainda não existe pedra nenhuma."

### Frase de sucesso

"São dois relógios: um faz nascer, o outro troca os desenhos. E cada pedra começa o giro dela quando
nasce."

### Roteiro de demonstração

Não tem. A cena é de experimentação, e a independência entre os dois relógios só aparece mexendo em um e
vendo o outro ficar parado. Uma demonstração mostraria os dois mudando juntos e ensinaria o contrário.

### O que o motor precisa

**Já existe e ela usa:** `advance` e `connect` (de `spawn`), `rate` (o controle de fps da animação, de
`frames`).

**Precisa ser construído:**

- `frame-badge`: o rótulo do quadro atual em cima de cada sprite vivo. É a peça que faz a meta
  `each-one` ser observável, e é a única coisa realmente nova desta cena. **Construído no palco.**
- `group-count`: a faixa com pedras que nasceram. É o mesmo contador que `collision-pair` pede.
- `birth-every`: o relógio de nascimento, que saiu como ação própria desta cena, com `frames` em 20,
  40 ou 80, os três valores que esta especificação pedia.

### Divergência entre o especificado e o construído

Nenhuma. Título, instrução, o que a criança manipula, frase de sucesso, pergunta extra, as três metas
com rótulo e pedido e as três pistas entraram no catálogo palavra por palavra.

---

## `published-copy` · A cópia que foi para o Mural

**Grupo:** `world`

**Conceito abstrato que ela torna concreto:** publicar tira uma cópia do jogo do jeito que ele está
naquela hora. O projeto continua sendo dela para mexer, e a cópia do Mural fica como estava.

**Tipo:** experimentação. A relação tem botão: quando ela muda uma coisa no projeto, a tela do Mural não
muda, e quando ela publica de novo, muda. As duas metades são o conceito, e a segunda é a que a aula de
hoje nem menciona.

**Prioridade:** era baixa por causa de uma pendência de produto, não por importância: é o único
conceito real daquela aula. A pendência foi decidida, e a cena está **construída**, com as três metas.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 8, Seção 3 "A cópia que foi para o Mural". **Depois** de publicar, com a publicação dela já aberta | `projeto-e-mural`: duas telas lado a lado, o projeto à esquerda com a nave rodando, o Mural à direita vazio, com o dizer "nada publicado ainda" | `first-publish`, `only-project`, `republish` |

**Reuso previsto fora do redesenho atual:** Desafio do Primeiro Jogo, no dia de publicar, e o fecho do
Corre, Dino!. É a cena de fechamento padrão de qualquer curso Kids que termine no Mural, e hoje esse
conceito não existe em nenhum dos três cursos.

**Por que nenhuma cena existente serve:** as 45 tratam de palco, arte, mundo, movimento, eventos,
população, velocidade e colisão. Nenhuma toca em publicação nem em duas cópias do mesmo projeto. A mais
próxima é `copy-vs-original`, desta lista, e a razão de serem duas está explicada na seção daquela cena.

### O que a criança manipula

- **A cor da nave no projeto**, com três cores.
- O botão **Publicar**.
- O botão **Abrir a versão do Mural**.

### Como o palco começa

Duas telas lado a lado, **O seu projeto** à esquerda, com a nave rodando, e **A versão no Mural** à
direita, vazia, com o dizer "nada publicado ainda".

### Elenco e cenário

Personagem `nave`. **Cenário:** `meu-jeito`.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `first-publish` | "Depois de publicar, as duas telas mostram a mesma nave" | "Aperte Publicar e olhe as duas telas." |
| `only-project` | "Mudando a cor no projeto, só a tela da esquerda mudou" | "Depois de publicar, troque a cor da nave e olhe as duas telas." |
| `republish` | "O Mural ganhou uma publicação nova com a cor nova" | "Com a cor trocada, aperte Publicar de novo." |

**A pendência que segurava a terceira meta foi decidida.** O documento de design da plataforma
(`sistema-zero/docs/plans/2026-09-19-cenas-presets-design.md`) registra que o serviço do Mural cria
outro post quando recebe uma nova chave de publicação, e que a mesma chave apenas evita duplicar o
mesmo envio. Ou seja, **republicar põe uma publicação nova no Mural, e não atualiza a que já estava
lá**. A cena foi construída assim, a meta `republish` está cobrada na Aula 8 do Meu Jeito, e nada
neste projeto afirma atualização.

### Pistas

1. "A tela da direita está vazia. Aperte Publicar."
2. "Agora troque a cor da nave e compare as duas telas."
3. "Aperte Publicar de novo e olhe os dois cartões do Mural."

### Palpite antes de abrir

"Depois de publicar, você troca a cor da nave no seu projeto. O que acontece com a do Mural?"

- Ela continua com a cor de antes ✓
- Ela troca de cor junto

**Se ela errar:** o palpite volta à tela quando a meta `only-project` cai, com as duas naves de cores
diferentes lado a lado e a frase "A do Mural é uma cópia. Ela ficou do jeito que estava na hora em que
você publicou."

### Pergunta depois de descobrir

"Uma semana depois de publicar, você melhora o seu jogo. Como o Mural passa a mostrar a versão nova?"

- Publicando de novo ✓
- Sozinho, assim que você salva

Explicação ao acertar: "Publicar tira uma cópia do jogo do jeito que ele está naquela hora. O seu
projeto continua seu para mexer, e cada vez que você publica entra uma publicação nova no Mural, com a
versão daquele momento. A de antes continua lá, do jeito que ela foi."

### Frase de sucesso

"São cópias: o projeto continua seu para mexer; cada publicação guarda a versão daquele momento."

### Roteiro de demonstração

Não tem. A cena é de experimentação: as duas metades do conceito dependem de ela escolher quando mexer
na cor e quando apertar Publicar.

### O que o motor precisa

**Já existe e ela usa:** o palco de dois painéis lado a lado, de `delta-time` e `contact`.

**Construído, e conferido no código:**

- `publish`: copiar o estado do painel da esquerda para o da direita, congelando a cópia. Exclusiva
  desta cena.
- `open-mural`: abrir a versão publicada. Exclusiva desta cena.
- `recolor` com `side: "project"`: trocar a cor de uma peça no painel da esquerda, em três cores.
  Compartilhada com `copy-vs-original`, que usa os lados `lesson` e `studio` e quatro cores.
- O "Voltar ao começo" **não virou ação própria**. Onde esta especificação pedia `reset-stage`, o
  motor reusa o `reset` que já existia, como o documento de design da plataforma decidiu.

### Divergência entre o especificado e o construído

O rótulo da meta `republish`, a terceira pista, a frase de sucesso e a explicação da pergunta de fim
mudaram, todas pelo mesmo motivo: a republicação cria uma publicação nova em vez de atualizar a
existente. O catálogo é a versão que vale, e esta especificação já está alinhada a ele.

---

## `same-rules-new-skin` · As mesmas regras, outra história

**Grupo:** `world`

**Conceito abstrato que ela torna concreto:** a mecânica é o que o jogo faz, as regras. O tema é a
história desenhada por cima. Trocar desenho não muda regra, e tirar uma regra muda o jogo de verdade.

**Tipo:** experimentação. A relação tem dois botões, e o segundo é o que faz a cena valer: quando eu
troco o tema, a lista de regras continua acesa igual; quando eu desligo uma regra, a lista muda e o jogo
muda junto. A segunda metade é o contraexemplo, e ela é obrigatória pela regra de honestidade que a
própria aula registra, que proíbe dizer "mesmos blocos" quando um exemplo tirou o tiro.

**Prioridade:** baixa. Uma aula depende dela, e ela é a mais cara de produzir das 11, porque pede três
conjuntos de arte do mesmo jogo. Em compensação, ela **substitui a produção de dois jogos jogáveis para
gravação**, que hoje está em aberto nos ajustes de produção daquela aula, então o custo líquido é menor
do que parece.

### Onde é usada

| Curso | Aula | Preset / caso preparado | Metas cobradas |
|---|---|---|---|
| O Jogo do Meu Jeito | Aula 8, Seção 4 "As mesmas regras, outra história". **Depois** de publicar | `tres-temas`: o jogo da nave rodando, o tema em nave, e ao lado a lista com as quatro regras acesas | `skin-only`, `three-skins`, `rule-off` |

**Reuso previsto fora do redesenho atual:** fecho do Corre, Dino! e do Desafio do Primeiro Jogo, e
qualquer aula que fale de versões, de remix ou do tema do mês.

**Por que nenhuma cena existente serve:** nenhuma das 45 tem troca de aparência sem troca de regra. A
mais próxima em espírito é `enemy-type`, que mostra o que muda quando se mexe numa ficha, e o conteúdo
dela é ficha compartilhada contra cópia ao nascer, que é outro assunto.

### O que a criança manipula

- **O tema:** nave no espaço, carrinho na estrada, submarino no fundo do mar.
- **A regra de atirar:** ligada ou desligada.
- **O jogo**, que roda ao lado e pode ser jogado com as setas e a tecla de tiro.

### Como o palco começa

O jogo da nave rodando, o tema em nave, e ao lado uma lista com quatro regras acesas: "as setas movem",
"a tecla atira", "o obstáculo vem", "encostou, perde uma vida".

### Elenco e cenário

Três conjuntos de desenhos para o mesmo jogo. **Cenário:** `meu-jeito`.

**Cuidado de produção, e é o que decide se a cena ensina ou desensina.** Os três temas precisam ser o
**mesmo jogo** com três conjuntos de desenhos, e não três jogos parecidos. Se um deles for construído
com regra diferente, a cena passa a ensinar o contrário do que promete. O obstáculo vem de cima nos
três, inclusive na estrada.

### Metas

| id | rótulo quando cai | pedido que a faixa mostra |
|---|---|---|
| `skin-only` | "Trocou o tema e as quatro regras continuaram acesas" | "Troque o tema para carrinho e olhe a lista de regras." |
| `three-skins` | "Três histórias diferentes, o mesmo jogo" | "Passe pelos três temas." |
| `rule-off` | "Desligando a regra de atirar, a lista mudou e o jogo mudou junto" | "Desligue a regra de atirar e jogue um pouco." |

### Pistas

1. "Troque o tema e olhe a lista de regras do lado."
2. "Passe pelos três temas e veja se alguma regra apagou."
3. "Agora desligue a regra de atirar e jogue um pouco."

### Palpite antes de abrir

"Trocando a nave por um carrinho, o que muda no jogo?"

- O desenho, e as regras continuam ✓
- As regras também, porque é outro jogo

**Se ela errar:** o palpite volta à tela quando a meta `skin-only` cai, com as quatro regras acesas
destacadas e a frase "Nenhuma regra apagou. O que mudou foram os desenhos."

### Pergunta depois de descobrir

"Um criador trocou a nave por um carrinho e tirou o tiro. O que ele mudou?"

- O tema e também a mecânica, porque uma regra saiu ✓
- Só o tema, porque ele só trocou desenho

Explicação ao acertar: "Trocar desenho muda o tema. Tirar, pôr ou mudar uma regra muda a mecânica. Dá
para fazer uma sem a outra, e dá para fazer as duas."

### Frase de sucesso

"As regras são a mecânica. Os desenhos são o tema. Você escolhe o que troca."

### Roteiro de demonstração

Não tem. A cena é de experimentação, e o contraexemplo (desligar a regra e jogar) só funciona se for ela
a desligar e a jogar.

### O que o motor precisa

**Já existe e ela usa:** nada diretamente. O palco é novo.

**Precisa ser construído:**

- `skin`: trocar o conjunto de desenhos de um mesmo jogo, sem tocar nas regras. **Construída**, com
  `theme` em `space`, `road` ou `sea`.
- `rule-toggle`: ligar e desligar uma regra, com a lista refletindo e o jogo obedecendo.
  **Construída**.
- `playable`: o jogo da cena aceitar as setas e a tecla de tiro da criança, dentro do palco. Das 11
  cenas, esta é a única que pede isso. **Construído como duas ações**, `play-move` (direção -1 ou 1)
  e `play-shoot`.

### Divergência entre o especificado e o construído

Nenhuma. Título, instrução, o que a criança manipula, frase de sucesso, pergunta extra, as três metas
com rótulo e pedido e as três pistas entraram no catálogo palavra por palavra.

---

# Ações novas no motor de cenas

A lista completa do que precisa ser construído para as 11 cenas existirem. Sem repetição, e com quem
depende de cada uma. É por aqui que se decide a ordem de trabalho do motor.

## Ações compartilhadas por mais de uma cena

| Ação | O que faz | Cenas que dependem | Nota |
|---|---|---|---|
| `reset-stage` | O botão Voltar ao começo: zera contadores, tempo e posições, e devolve as peças ao estado inicial do preset | `once-vs-always`, `collision-pair`, `invincibility`, `number-line`, `copy-vs-original`, `two-clocks` | Nenhuma das 45 cenas do catálogo tem esse controle hoje. É a capacidade mais barata e mais reusada da lista, e vale construir primeiro |
| `fire-count` | Contador de disparos por ficha ou por botão, à vista no palco | `once-vs-always`, `number-line` | É o instrumento de leitura que faz a `once-vs-always` funcionar sem narração |
| `group-count` | Contadores por grupo, à vista e atualizados a cada quadro | `collision-pair`, `two-clocks` | Em `collision-pair` conta quem sumiu, em `two-clocks` conta quem nasceu |
| `schedule-hit` | Batidas agendadas por quadro, para o mesmo encontro acontecer no mesmo instante em todos os testes | `invincibility`, `once-vs-always` (preset `uma-ficha-vidas`) | Sem isso a comparação entre dois valores de proteção não é comparação |
| `recolor` | Trocar a cor de uma peça dentro de um painel, por painel | `copy-vs-original`, `published-copy` | As duas cenas são do mesmo palco de dois painéis e devem ser construídas juntas |

## Ações de uma cena só

| Ação | O que faz | Cena | Nota |
|---|---|---|---|
| `place-in-area` | Arrastar uma ficha de ação para dentro de uma área do projeto, e tirar de volta | `once-vs-always` | O coração da cena de maior reuso do catálogo |
| `trigger` | Botão de disparo de evento no palco, que faz a caixa `Quando acontecer` agir | `once-vs-always` | Só nos presets de três caixas |
| `value-source` | Chave que decide se um campo recebe um número escrito ou uma leitura ao vivo de outro objeto | `fixed-vs-read` | |
| `spawn-mark` | Marquinha que fica no lugar onde uma coisa nasceu, com botão de limpar | `fixed-vs-read` | A cena `random`, no ajuste do Desafio Dia 3, pede marquinhas na régua de sorteio. Vale conferir se é a mesma peça |
| `box-marks` | As linhas do centro x e da borda de cima da caixa de um sprite | `fixed-vs-read` | Serve também à cena `hitbox`, que hoje fala de área invisível sem nunca mostrar as duas medidas |
| `command-target` | Alvo de um comando, com os valores apelido e grupo | `collision-pair` | **Não usar o nome `target`:** ele já existe no motor, na cena `aim`, para escolher o alvo da mira. São coisas diferentes |
| `shield` | Contador regressivo de proteção por sprite, legível na faixa a cada quadro | `invincibility` | |
| `advance-to` | Avançar até o próximo evento agendado, em vez de um quadro por vez | `invincibility` | Variante de `advance`, que já existe |
| `step-value` | Marcador sobre uma régua, com mínimo, máximo, passo e arrasto | `number-line` | |
| `compare-op` | Troca de operador (`>`, `=`, `<`), com a frase montada e a resposta recalculada e legível a cada passo | `number-line` | É o que torna o erro silencioso do sinal visível. Sem isso a cena não tem razão de existir |
| `export-file` | Fazer nascer o cartão de um arquivo, com nome e extensão, sem tirar nada do painel de origem | `copy-vs-original` | |
| `import-file` | A chegada do arquivo no painel de destino, virando projeto | `copy-vs-original` | |
| `nudge` | Controle de deslocamento por peça entre dois quadros, com faixa e passo | `motion-amount` | |
| `name-field` | Escolher ou digitar o nome de um bloco, com listinha de opções | `unique-names` | |
| `toggle-block` | Tirar um bloco da pilha e pôr de volta, com a pilha religando sozinha | `unique-names` | |
| `studio-warning` | Sinal de aviso por bloco com o texto literal do Estúdio, mais o congelamento do preview segurando a última versão que funcionava | `unique-names` | Os dois textos são citados na seção da cena e não podem ser parafraseados |
| `frame-badge` | Rótulo do quadro atual em cima de cada sprite vivo | `two-clocks` | É a peça que torna a meta `each-one` observável |
| `publish` | Copiar o estado do painel da esquerda para o da direita, congelando a cópia | `published-copy` | Depende da conferência de produto registrada na cena |
| `skin` | Trocar o conjunto de desenhos de um mesmo jogo, sem tocar nas regras | `same-rules-new-skin` | |
| `rule-toggle` | Ligar e desligar uma regra, com a lista refletindo e o jogo obedecendo | `same-rules-new-skin` | |
| `playable` | O jogo da cena aceitar as setas e a tecla de tiro da criança, dentro do palco | `same-rules-new-skin` | Única das 11 que pede isso |

## Capacidade de autoria, não de palco

Não é uma ação, é uma condição para as 11 cenas não virarem 20.

| Capacidade | O que é | Cenas que dependem |
|---|---|---|
| Parametrização por preset | Quantas caixas, quantas fichas, o que cada ficha diz, qual elenco, qual cenário e quais metas são cobradas precisam vir do bloco da aula, e não estar cravados na cena | `once-vs-always` em primeiro lugar (cinco usos, três presets diferentes), e em menor grau todas as outras |
| Rótulo de meta adaptável por preset | O id da meta é fixo e o rótulo que aparece quando ela cai acompanha o elenco da aula | `once-vs-always` (o `once` do Dia 4 fala de vidas, o do Dia 1 fala de arrumação) |

## O que já existe e as 11 reaproveitam

Nenhuma destas precisa de trabalho novo. Está aqui para quem for construir não reconstruir por engano.

| Ação existente | De onde vem | Quem reaproveita |
|---|---|---|
| `advance` | `draw-loop` e mais 21 cenas | `once-vs-always`, `collision-pair`, `invincibility`, `two-clocks` |
| `collide` | `score`, `lives` | `collision-pair`, `invincibility`, `once-vs-always` (preset do Dia 4) |
| `connect` | `world`, `spawn` e mais 14 cenas | `collision-pair`, `two-clocks` |
| `place` | `coordinates` | `fixed-vs-read` |
| `shoot` | `cooldown`, `aim` | `fixed-vs-read` |
| `play` e `rate` | `frames` | `motion-amount`, `two-clocks` |
| `frame` | `frames`, `onion-skin` | `motion-amount` |
| Palco de dois painéis lado a lado | `delta-time` (dois computadores), `contact` (duas pistas) | `copy-vs-original`, `published-copy` |
