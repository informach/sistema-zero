# As cenas de aula: identidade, estrutura e o que ensina

**15/09/2026.** Proposta para as **45 cenas** — as antigas e as novas, as que eu fiz e as que
não fiz. Nasce de uma tela real que a dona abriu em staging e da pergunta dela: *"o visual não
melhorou nada, os controles também não. O que está acontecendo?"*

Ela tem razão, e a resposta não é uma lista de ajustes. É que três decisões antigas ainda estão
de pé, e enquanto estiverem, cada correção vale para uma cena e volta na seguinte.

---

## 1. O diagnóstico da tela

A tela é a Aula 1 do Corre, Dino!, seção "Criar e mostrar são a mesma coisa?" — a cena `world`,
que é a **primeira experimentação da primeira aula do curso carro-chefe**.

### 1.1 A tela se contradiz

O cartão diz **"Você concluiu a investigação proposta nesta atividade"** enquanto o palco mostra
**"Quem vai morar neste jogo?"** (vazio) e a bancada diz **"Bastidores · ainda vazio"**.

O prêmio por terminar é uma tela que afirma o que ela não mostra. **Isto é meu:** transformei a
frase de sucesso num latch que não desfaz e pus "Ver de novo" como ação principal — e "Ver de
novo" faz `reset`, que esvazia o mundo. Antes o cartão sumia junto com o estado. Criei a
combinação.

### 1.2 Os três padrões do estudo do Brilliant estão DESLIGADOS neste bloco

Conferido no manifesto (`aula-01`, bloco `descoberta`):

| Padrão | Estado |
| --- | --- |
| Previsão antes de mexer | `prediction: false` |
| Pergunta anexa (enunciar a regra) | `checkpoint: false` |
| Caso e missão | `setup: false` |

Escrevi o motor, o DTO, o editor e o player para os três. Nesta aula não liguei nenhum. O que
sobra na tela é a cena de antes com um rodapé novo — que é exatamente o que ela viu.

### 1.3 O desenho, item a item

1. **A ação que move a cena é a mais fraca da tela.** `+ Criar Dino` é um botão cinza pequeno
   dentro de uma caixa tracejada; `Ver de novo` é o azul grande. Está invertido.
2. **O palco não mostra a comparação que a cena ensina.** O assunto é *bastidores × tela*, e os
   dois não aparecem lado a lado: "bastidores" é um controle lá embaixo. A criança nunca vê o
   Dino existindo sem aparecer — ela **lê** que isso aconteceu.
3. **A faixa de estado não é legível.** "o Dino nos bastidores · ainda não · desenho · desligado"
   corre como uma frase só, e "ainda não" não responde pergunta nenhuma porque a pergunta não
   está escrita. (A faixa também parecia cortada — corrigido, era `border-b-0` com folga.)
4. **A frase embaixo do palco fala do sistema, não da cena**: "Experiência recomeçada. Suas
   descobertas foram guardadas." é recado de persistência ocupando o lugar da narração.
5. **Quatro ferramentas cinzas idênticas** (Desfazer, Recomeçar, Ligar som, Uma pista). Eu disse
   que tinha resolvido isso: só troquei botão por texto.
6. **Dois Zappys na mesma tela** dizendo coisas sobrepostas, e o título repetido.
7. **Os dois círculos azuis** no topo são o medidor de descobertas e não dizem isso a ninguém.
8. **O palco desperdiça a largura** e a paleta creme/oliva destoa do azul do kids.
9. **Uma caixa vazia** entre a frase e a bancada — corrigido, era um container que não perguntava
   se tinha filho.

---

## 2. O retrato medido

Varredura dos 27 manifestos e dos 6.223 linhas da interface de cena.

### 2.1 O que ensina está desligado

**52 blocos de cena** nos cursos (41 experimentações, 11 demonstrações):

| Padrão | Ligado em | % |
| --- | --- | --- |
| Previsão antes de mexer | 7 / 52 | 13% |
| Pergunta anexa | 8 / 52 | 15% |
| **Caso e missão (`setup`)** | **3 / 52** | **5%** |
| Elenco (`cast`) | 10 / 52 | 19% |
| Roteiro autoral | 2 / 52 | 3% |
| Animação curta (`inline`) | 2 / 52 | 3% |

O `setup` é o que eu chamei de "a alavanca maior" da proposta anterior. Ele está em **três
blocos**.

### 2.2 A interface está fragmentada

| Medida | Hoje |
| --- | --- |
| Linhas na interface de cena | 6.223 |
| `scene-activity.tsx` (o player) | **1.872 linhas** |
| Cromos de palco independentes | **5** (`exploration-stage`, `scene-stages`, `scene-art-stages`, `scene-core-stages`, `scene-engine-stages`) |
| Cenas com bancada INLINE dentro do player | **14** |
| Ramos `m === '…'` no palco compartilhado | 40 |
| Cenas usadas em aula | 28 de 45 |

Duas convenções convivem: 21 cenas têm bancada em arquivo próprio, 14 têm bancada escrita dentro
do player. Cada cromo tem a própria moldura, o próprio `viewBox`, o próprio rodapé.

### 2.3 São duas linguagens visuais

| | Cena | Kids (Pen) |
| --- | --- | --- |
| Papel | `#faf8ee` creme | `#ffffff` branco |
| Superfície | `#e9efda` verde-creme | `#eff3f9` azul-claro |
| Tinta | `#42503a` oliva | `#0f1a33` azul-tinta |
| Linha | `#d9dfd1` | `#d6deea` |
| Cartão | quente, com borda | branco liso, sem borda, raio 24 |

A cena mistura apenas **5% a 8%** do tema no papel. Não é descuido: foi desenhada como um mundo
ilustrado próprio, com orçamento de contraste medido e travado em `scene-contrast.test.ts` para
os três temas. É uma decisão que envelheceu — o kids virou o Pen e a cena ficou onde estava.

---

## 3. As quatro causas-raiz

Não são bugs. São as razões pelas quais os bugs voltam.

### R1 · A cena é um mundo visual paralelo, e ninguém decidiu isso de novo

A paleta da cena foi desenhada para ser uma ilustração autônoma. Funciona — e é por isso que
sobreviveu. Mas hoje ela vive dentro de um app que tem identidade própria, e a criança vê os dois
na mesma tela. Enquanto a cena for um mundo paralelo, **toda** cena vai destoar, não só esta.

### R2 · Não existe UM palco nem UMA bancada

Cinco cromos, quatorze bancadas inline. Consertar a faixa cortada exigiu tocar um arquivo; o
mesmo defeito em outra família não teria sido corrigido. A caixa vazia sobreviveu a quatro
reviews porque ninguém olha 40 ramos `if`. **Qualquer melhoria de desenho custa cinco vezes.**

### R3 · O que ensina é opcional, e opcional quer dizer desligado

Previsão, pergunta anexa e caso são campos que cada bloco declara. Construímos o motor e ligamos
em 5% a 15%. **Um recurso que depende de alguém lembrar não é recurso, é intenção.** E o editor
esconde os três atrás de um `<details>` fechado.

### R4 · A cena CONTA a comparação em vez de MOSTRAR

O padrão nº 1 do Brilliant é antes/depois lado a lado. Nenhum dos 45 palcos tem isso como
estrutura: cada um desenha **um** estado, e a comparação vive no texto ("compare", "depois
ligue"). É a diferença entre a criança ver a descoberta e ler que ela aconteceu.

---

## 4. A proposta

Seis lotes. Cada um ataca uma raiz, não um sintoma.

### Lote 1 — O palco único (`SceneCanvas`)

Um componente dono da moldura, da faixa de estado, da frase, do alvo e do **modo comparação**.
As 45 cenas deixam de ser molduras e viram **desenhos** dentro dele.

- Mata os cinco cromos. A faixa, a frase, o recorte, a largura e o foco passam a ter **um** lugar.
- `viewBox` único e uma régua de composição (onde fica o rótulo, onde fica a medida, onde fica o
  alvo). Hoje cada família inventou a sua.
- ⚠️ Não é renomear arquivo: é tirar a moldura de dentro de 45 desenhos.

### Lote 2 — A bancada única (`SceneBench`)

Um vocabulário de controle, quatro peças: **Medida** (deslizante com valor e passo), **Chave**
(estado no rótulo), **Escolha** (dois ou três valores, sem `aria-pressed`) e **Gesto** (a ação da
cena, em destaque). As 14 bancadas inline saem do player.

- O player cai de 1.872 para ~600 linhas e volta a ser legível.
- A hierarquia inverte: **o gesto da cena é o botão forte**; "Ver de novo" e as ferramentas
  descem para o peso que têm.
- Acessibilidade deixa de ser caso a caso: toque, teclado e leitor de tela nascem certos porque
  existe uma peça só.

### Lote 3 — A cena entra na identidade do kids: **cromo é Pen, mundo é jogo**

Esta é a decisão de desenho que resolve o "destoante" **sem achatar a ilustração**.

- **O CROMO vira Pen**: cartão branco liso, raio 24, linha `--pen-linha`, tinta `--pen-tinta`,
  ação `--pen-acao`. Vale para a moldura, a faixa, a bancada, a frase, o rodapé e o cartão de
  conclusão. É o que encosta no app, e é o que estava destoando.
- **O MUNDO continua ilustrado**: céu, grama, árvores, o Dino. A cena é um retrato de um **jogo**
  — se ela virar branco e azul, deixa de parecer um jogo e vira formulário.
- **Duas invariantes ficam de pé**, e são o que separa isto de uma repintura no olho:
  1. O **par de comparação** (A azul, B laranja) não muda de matiz com o tema — ele diz QUAL
     medida é qual, no palco, na faixa e na comparação guardada.
  2. O **orçamento de contraste** (`scene-contrast.test.ts`) continua verde nos três temas. A
     conta é refeita, não estimada.
- Entrega junto uma **galeria das 45 cenas** (uma página com todos os palcos lado a lado, antes e
  depois) — porque você nunca viu 21 delas, e não dá para aceitar o que não se vê.

### Lote 4 — O que ensina deixa de ser opcional

Atacar R3 nas duas pontas:

- **Autoria**: no editor, previsão e pergunta anexa saem do `<details>` fechado e viram **passos
  do fluxo** de criar uma cena. A publicação passa a **avisar** (não bloquear) quando uma
  experimentação não tem nem previsão nem pergunta — do jeito que já avisa sobre vídeo planejado.
- **Conteúdo**: uma passada editorial pelos **52 blocos**, ligando previsão, pergunta e caso onde
  eles ensinam. É trabalho de texto, não de código, e é o que muda a tela da criança hoje.
- Meta: sair de 13/15/5% para **não menos que 80%** dos blocos com previsão **ou** pergunta.

### Lote 5 — A comparação vira estrutura

`SceneCanvas` ganha o modo **antes | depois** nativo, e as cenas cujo assunto É a comparação
declaram isso em vez de pedir no texto.

- No `world`: **bastidores | tela** lado a lado. A criança vê o Dino existindo e não aparecendo,
  na mesma imagem. Hoje ela lê isso.
- Vale para `layers`, `hold-vs-press`, `contact`, `delta-time`, `pixel-vector`, `fill-stroke`,
  `shading`, `onion-skin`, `frames` e as outras de contraste.

### Lote 6 — A conclusão e o rodapé contam a verdade

Conserta a contradição na raiz, e não só nesta tela:

- O cartão de conclusão pertence à **sessão**, não ao estado do instante. Revendo a cena, ele
  vira *"você já descobriu isto — está revendo"*, em vez de afirmar conclusão sobre um palco
  vazio.
- A frase embaixo do palco volta a narrar a **cena**; recado de sistema ("salvo na sua conta")
  desce para o rodapé, onde já mora o irmão dele.
- Um Zappy por tela, um título por tela.

---

## 5. O que muda para a criança

Na tela que você mandou, depois dos seis lotes:

| Hoje | Depois |
| --- | --- |
| Cartão diz "concluiu" sobre palco vazio | "Você já descobriu isto — está revendo" |
| `+ Criar Dino` cinza dentro de caixa tracejada | **O gesto da cena é o botão forte da tela** |
| Bastidores é um controle lá embaixo | **Bastidores e tela lado a lado**, a descoberta à vista |
| Sem previsão, sem pergunta, sem caso | Ela **aposta** antes de mexer e **enuncia a regra** depois |
| Papel creme, tinta oliva, cartão quente | Cromo do Pen; o mundo do jogo continua ilustrado |
| Quatro ferramentas cinzas iguais | Ferramentas discretas, uma ação clara |

---

## 6. Custo, ordem e o que pode quebrar

| Lote | O quê | Custo | Risco |
| --- | --- | --- | --- |
| **1** | Palco único | alto | toca os 45 desenhos; é o lote que segura os outros |
| **2** | Bancada única | alto | tira 14 bancadas do player |
| **3** | Cromo no Pen + galeria | médio | a conta de contraste tem que ser refeita, não estimada |
| **4** | Autoria + passada nos 52 blocos | médio | o de conteúdo é o que mais muda a tela, e é o mais barato |
| **5** | Comparação estrutural | médio | pede decisão de desenho cena a cena |
| **6** | Conclusão e rodapé | baixo | conserta a contradição |

**A ordem importa, e não é a da tabela.** Sugiro: **6 → 4 → 3 → 1 → 2 → 5**.

- O **6** é pequeno e tira a mentira da tela hoje.
- O **4 (conteúdo)** é o que mais muda para a criança por hora gasta, e não depende de nada.
- O **3** te dá a galeria: você vê as 45 cenas antes de autorizar o caro.
- Só então **1** e **2**, que são a reforma estrutural, e **5**, que é desenho cena a cena.

### O que eu NÃO vou fazer

Estes são os puxadinhos que eu recusaria mesmo que fossem mais rápidos:

- Repintar a paleta da cena no olho, sem refazer a conta de contraste.
- Corrigir a faixa, a caixa vazia e a hierarquia **uma família por vez** — é o que garante que
  voltem.
- Ligar previsão e pergunta só nas aulas que você reclamar.
- Achatar o mundo do jogo em branco e azul para "entrar na identidade".

---

## 7. Antes de eu começar

Três coisas que eu quero de você, porque já errei hoje supondo:

1. **A galeria das 45 cenas vem primeiro** (parte do lote 3, mas eu entrego separada). Você olha,
   e aí decide o que merece redesenho e o que já está bom.
2. **O "cromo é Pen, mundo é jogo"** é a decisão central do lote 3. Se você quiser o mundo também
   no Pen, muda tudo — e eu acho que fica pior, mas é sua chamada.
3. **A ordem 6 → 4 → 3 → 1 → 2 → 5** é minha sugestão. Se você quiser ver o visual mudar
   primeiro, invertemos 3 e 4.
