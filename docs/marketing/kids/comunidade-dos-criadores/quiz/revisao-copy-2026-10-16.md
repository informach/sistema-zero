# Quiz da Comunidade dos Criadores: revisão de copy e proposta da v5

16/10/2026. Proposta aprovada e **implementada no mesmo dia** (quiz `comunidade-orientacao-v5`; ver o
[README](README.md)). O texto abaixo é a proposta como foi aprovada; as decisões finais estão na
seção 7 e o que o código faz, na seção 8.

**O pedido.** Revisar a copy do quiz, melhorar as perguntas e criar o perfil da escola, que ganhou
uma página de oferta própria (F, habilidades escolares).

**Direção dada durante a revisão.** "As perguntas têm que seguir o método SPIN e o objetivo é definir
o perfil da família para redirecionar para a oferta correta. O resultado tem que ser muito pessoal:
colocar as mesmas respostas da família ali, para as famílias se identificarem, e posicionar como a
criação de jogos pode ajudar. O objetivo do resultado é ser uma ponte perfeita entre o diagnóstico da
família e a oferta."

**O que mudou na segunda versão:**
- **Separar filho e filha:** aprovado.
- **Atividade "Experimentem em casa":** sai do resultado.
- **Antes do resultado,** nenhuma tela apresenta a criação de jogos como solução, e nenhuma cita a
  Comunidade.
- **O perfil** deixa de depender de uma pergunta só e passa a somar quatro respostas.

**A régua usada:**
- **O comando `lt-quiz` do fluxo criativo:** perguntas sobre o público, nunca sobre o produto, em
  SPIN (segmentação, situação, problema, implicação com calculadora, necessidade com visualização
  profunda e diagnóstico final). O resultado começa nomeando o problema.
- **Os textos de copy:** o checklist do Light Copy, o `manual-copy.md` e a skill revisao-copy.
- **As decisões já tomadas:**
  - **05/10:** a plataforma orienta, e a ajuda por mensagens aparece só no assunto dúvida.
  - **13/10:** cautela que vira texto mata a copy, e a copy é conversa.
  - **16/10:** mostrar o que a plataforma oferece, sem "em preparação". A Chave do Farol leva ao
    Construtor.

---

## Em resumo

1. **O quiz de hoje não segue o SPIN.** O perfil sai de uma única pergunta de desejo. Não há pergunta
   sobre o problema nem sobre a consequência dele, então o resultado não tem o que devolver à família.
2. **O resultado de hoje não devolve as respostas.** Ele tem de 1.046 a 1.262 palavras, e a oferta
   aparece só no fim de seis ou sete blocos.
3. **Ele contraria duas decisões suas.** Todo resultado fala em ajuda por mensagens e em espera pela
   resposta (05/10). O resultado D manda conferir os postos "em construção" (16/10).
4. **Não existe o perfil da escola.**
5. **A v5 sobe o nível de consciência da família pergunta a pergunta, e cada tela tem seu papel:**
   - **As perguntas** falam só da criança e da casa.
   - **O resultado** nomeia o problema com as palavras da família, explica por que acontece,
     apresenta a criação de jogos como o que muda isso e só então mostra a Comunidade.
   - **A página de oferta** traz o preço e os planos.

---

## 1. Quando aparece o quê

Responde a duas perguntas: "A oferta deve aparecer somente no resultado?" e "Falo de criar jogos já
no início do quiz?".

Concordo com as duas posições. O quiz é a fase antes da oferta. Ele qualifica a família e sobe o nível
de consciência dela, e cada tela leva a família um degrau acima:

| Tela | Nível de consciência | O que aparece | O que NÃO aparece |
|---|---|---|---|
| Entrada e perguntas | Consciente do problema | A criança, a casa, o que preocupa, o que a família quer ver | Criar jogos como solução, Comunidade, aula, plataforma, preço |
| Resultado, primeira metade | Consciente do problema, agora com nome | As respostas da família e por que aquilo acontece | Produto |
| Resultado, meio | Consciente da solução | A criação de jogos como o que muda aquela situação | Produto |
| Resultado, fim | Consciente do produto | A Comunidade dos Criadores, uma tela real, um relato e o botão para a página do perfil | Preço e planos |
| Página de oferta | Pronto para decidir | Criação de jogos de cara, preço, planos, garantia | n/a |

**A única exceção.** A palavra "jogo" aparece nas perguntas quando é a realidade da família, e não
quando é a solução proposta. Exemplos: "ele passa horas em jogos e vídeos", "ele inventa jogos e
regras o tempo todo". É o pai descrevendo o filho.

**Por que a oferta não aparece explicitamente no resultado.** O resultado nomeia a Comunidade só no
último bloco e leva à página certa, mas não mostra preço nem planos. Quem clica chega à oferta sabendo
o que vai encontrar: uma oferta de criação de jogos para o problema que ela mesma descreveu.

---

## 2. Revisão da copy atual, por impacto

### Grave

| Onde | O problema | Correção |
|---|---|---|
| `result.ts`, bloco de apoio | Todo resultado recebe os dois parágrafos de "Preciso de ajuda" + Recados + "o retorno acontece por mensagens e pode exigir espera", mesmo para quem não perguntou sobre ajuda. | Recados entra uma vez, só para quem disse que precisa de alguém a quem recorrer quando travar. Antes vem a orientação da plataforma (trecho do vídeo, Verificar esta parte, Uma pista, Como fazer), sem falar em espera. |
| `result-copy.ts:26` e mais oito lugares | "um canal de mensagens para pedir ajuda", "ajuda por mensagens", "com possível espera pela resposta", "A resposta pode levar um tempo", "veja também o caminho para enviar uma dúvida", "tem onde pedir orientação", "canais de ajuda" (duas vezes). | Sai tudo. |
| `questions.ts:347` | A opção "Considero aulas gravadas com ajuda por mensagens" põe o produto (e a ajuda por mensagens) dentro da pergunta. | Sai. Professor ao vivo vira uma opção da pergunta de necessidade. |
| `result-copy.ts:181` (D) | "confira também os postos marcados como em construção: eles indicam etapas futuras, não conteúdo disponível hoje" | Sai inteira. |
| `engine.ts` e perguntas | Não há problema nem implicação, o perfil depende de uma pergunta só, e não existe o perfil F. | Seções 3 e 4. |
| Resultado inteiro | De 1.046 a 1.262 palavras, com 15 a 21 "pode" por resultado. A família não se vê no texto, e a oferta fica no fim de seis blocos. | Seção 5. |

### Alta

| Onde | O problema | Correção |
|---|---|---|
| Três lugares (C, "Desenho: quer conhecer a integração", "Para participar da Comunidade") | "curso obrigatório", "curso de entrada obrigatório e publicar o projeto exigido": soa como regra e esconde o nome. | "Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor", como nas ofertas. |
| Resultado inteiro | Nenhuma vez aparecem Ouvir, Verificar esta parte, Uma pista, O que falta para seguir, Como fazer, Guardado na sua conta, Zappy, Mural ou Pensa. | O último bloco de cada perfil mostra os recursos que existem. |
| Resultado inteiro | Não há tese, ou seja, o porquê: no jogo pronto alguém já decidiu tudo; no caderno o número não faz nada. | Bloco "Por que isso acontece", com a mesma tese das ofertas. |
| Resultado inteiro | Não há prova social, embora os relatos já estejam autorizados em `relatos.ts`. | Um ou dois relatos por resultado. |
| Repetições | "ler e usar mouse e teclado" aparece em três blocos do mesmo resultado. O curso de entrada é explicado duas vezes. Em B, "o que o personagem faria primeiro" aparece duas vezes. | Cada informação aparece uma vez. |

### Média

| Trecho | O problema | Correção |
|---|---|---|
| "A sua intenção de oferecer aprendizado e a curiosidade dele podem se encontrar nessa primeira escolha." | Lero-lero. | Sai. |
| "É essa ligação entre escolha e efeito que dá conteúdo à criação" | Abstração. | "Ele decide o que acontece, monta a regra e aperta para testar." |
| "abre outra possibilidade para a criatividade dele" | Clichê. | Sai. |
| "Essa conversa dá um jeito de participar do aprendizado com interesse pelo que ele fez" | Frase torta. | "Peça que ele mostre o que mudou." |
| "Isso evita começar de uma tarefa que ele já conhece." | Não se entende. | Sai. |
| "Pelo que você contou, este é um caminho para conversar com seu filho e experimentar em casa." | Genérica, no topo de todo resultado. | Sai. No lugar entra o quadro com as respostas. |
| "As diferenças que explicamos acima continuam valendo para sua escolha: conhecer os recursos não muda o formato das aulas…" | Cautela que vira texto. | Sai. |
| "preservando o que vocês consideram necessário para escolher" | Lero-lero. | Sai. |
| Entrada: "Descubra por onde seu filho pode começar a criar com tecnologia." | "Descubra" é palavra de vendedor no Manual, e a frase já oferece a solução ("criar"). | Seção 6. |
| Entrada: "Inventar um jogo", "Dar vida a uma ideia desenhada", "Entender como funciona" | Apresentam a solução antes da hora, e "dar vida" é clichê. | A lateral passa a listar as situações da família (seção 6). |
| 93 "pode/podem" e 31 "conhecer" em todo o quiz | Texto em condicional, sem afirmar nada. | Afirmar. |

**Verificador mecânico** (`check-copy.ts`) nas 317 frases do quiz atual: nenhum achado. Os problemas
são de estrutura e de argumento.

---

## 3. As perguntas da v5

São dez perguntas para todos e uma condicional para os perfis B, C e F. Todas falam da criança e da
casa. Cada opção tem uma frase de espelho, que volta no resultado com as palavras da família.

**Filho ou filha.** A P1 pergunta os dois, e daí em diante todo texto usa "ele" ou "ela", "seu filho"
ou "sua filha", "dele" ou "dela". Abaixo, o texto está no masculino. Para a troca ficar simples,
evitamos adjetivos que mudam com o gênero.

**As etapas da barra:** **A rotina** (P1 a S3), **O que acontece em casa** (P4 a I7) e **O que você
quer ver** (N8 a P10).

### P1. Segmentação, na própria tela de entrada

Clicar já começa o quiz, e some a tela intermediária.

**Em quem você está pensando?**
Responda pensando em uma criança de cada vez.

- Filho de 9 a 11 anos
- Filha de 9 a 11 anos
- Filho de 12 a 14 anos
- Filha de 12 a 14 anos
- Menos de 9 anos (vai para a tela da idade, como hoje)
- 15 anos ou mais (vai para a tela da idade)

Espelho: "Sua filha tem entre 9 e 11 anos."

### S2. Situação: o dado da calculadora

**Num dia comum, quanto tempo ele passa em jogos e vídeos?**
Some celular, computador, tablet e videogame. Vale uma estimativa.

- Menos de 1 hora
- De 1 a 2 horas
- De 2 a 4 horas
- Mais de 4 horas

Espelho: "Ele passa de 2 a 4 horas por dia em jogos e vídeos."

### S3. Situação: o computador

**Em casa, ele pode usar um computador?**
Pode ser o da família.

- Sim, ele pode usar
- Temos, mas preciso organizar os horários
- Por enquanto, só celular ou tablet
- Ainda preciso ver

Espelho: "Ele pode usar o computador da casa". As outras três respostas viram uma condição no
resultado.

### P4. Problema: a cena de casa (vale 3 pontos para o perfil)

**Qual destas cenas mais acontece aí em casa?**

| Perfil | Opção (e espelho) |
|---|---|
| A | Ele passa horas em jogos e vídeos, e no fim do dia não sobra nada que ele tenha feito |
| B | Ele inventa jogos e regras o tempo todo, mas as ideias ficam na conversa ou no papel |
| C | Ele desenha personagens o tempo todo, e os desenhos ficam guardados no caderno |
| D | Ele quer saber como os jogos e os programas funcionam, e eu não sei por onde começar a ensinar |
| F | Na lição, ele repete o exemplo, mas trava quando a pergunta muda |
| nenhum | Nenhuma dessas parece com a nossa casa (0 ponto, sempre por último) |

### P5. Problema: o que ele faz quando trava

**Quando alguma coisa no computador não dá certo, o que ele faz primeiro?**

- Larga e vai fazer outra coisa
- Chama alguém para resolver
- Tenta de outro jeito até dar certo
- Procura um vídeo ou um exemplo
- Ainda não reparei

"Larga e vai fazer outra coisa" é a opção nova. É uma dor real de muita família, e a plataforma
responde bem a ela.

Espelho: "Quando algo não dá certo no computador, ele larga e vai fazer outra coisa."

### I6. Implicação: a calculadora

O título é montado com a resposta da S2 (horas por dia × 365, em faixa, para não inventar um número
exato):

| S2 | Título da pergunta |
|---|---|
| Menos de 1 hora | Isso dá até 365 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez? |
| De 1 a 2 horas | Isso dá entre 365 e 730 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez? |
| De 2 a 4 horas | Isso dá entre 730 e 1.460 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez? |
| Mais de 4 horas | Isso dá mais de 1.460 horas por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez? |

- Quase nada
- Um pouco
- Boa parte
- Não sei dizer

Espelho: "Isso dá entre 730 e 1.460 horas por ano, e quase nada desse tempo vira alguma coisa que ele
mesmo fez."

### I7. Implicação: o que preocupa (vale 2 pontos)

**Se nada mudar no próximo ano, o que mais preocupa você?**

| Perfil | Opção (e espelho) |
|---|---|
| A | Que a tela continue sendo só para assistir e jogar |
| B | Que a vontade de criar jogos passe antes de ele fazer o primeiro |
| C | Que os desenhos continuem guardados na gaveta |
| D | Que ele desista de programar antes de entender como funciona |
| F | Que a dificuldade na escola vire desânimo com os estudos |
| nenhum | Nada me preocupa; quero aproveitar o interesse dele (0 ponto, sempre por último) |

### N8. Necessidade: visualização profunda (vale 2 pontos)

**Imagine que, daqui a três meses, alguma coisa mudou aí em casa. Qual cena você gostaria de ver
primeiro?**

| Perfil | Opção (e espelho) |
|---|---|
| A | Ele me chamando para ver uma coisa que ele mesmo fez no computador |
| B | Um amigo jogando um jogo que ele inventou |
| C | O personagem que ele desenhou se mexendo na tela |
| D | Ele me explicando como um programa funciona por dentro |
| F | Ele explicando uma conta com as próprias palavras |

São cenas concretas, como pede o `lt-quiz`, e nenhuma fala de sentimento. A pergunta já não diz "ele
já cria os próprios jogos". O jogo só aparece na cena B, que é o desejo de quem já inventa jogos.

### N9. Necessidade: o que precisa estar garantido (a objeção)

**Para uma atividade nova dar certo aí em casa, o que precisa estar garantido?**

- Que ele consiga aprender sozinho, porque eu não entendo do assunto
- Que ele tenha a quem recorrer quando travar
- Que eu consiga acompanhar o que ele aprende
- Que caiba no tempo de tela que já combinamos
- Que o valor caiba no orçamento da família
- Que tenha um professor ao vivo acompanhando

A última vira uma condição não atendida no resultado.

### P10. Diagnóstico final (vale 3 pontos)

**Juntando tudo o que você respondeu, qual destas frases mais parece com o que você quer para ele?**

| Perfil | Opção |
|---|---|
| A | Que o tempo de tela deixe alguma coisa feita por ele |
| B | Que as ideias de jogo dele saiam do papel |
| C | Que os personagens que ele desenha ganhem movimento e história |
| D | Que ele entenda como os programas funcionam e aprenda a programar |
| F | Que ele entenda o que estuda e use isso na prática |
| nenhum | Ainda quero conhecer as possibilidades (0 ponto) |

### A condicional (só quando o perfil somado for B, C ou F)

**Perfil B: ele quer criar jogos em alguma ferramenta específica?**
- Precisa ser no Roblox
- Precisa ser no Minecraft
- Precisa ser em outra ferramenta específica
- Pode ser outra ferramenta, se ele gostar
- Ainda vou conversar com ele

**Perfil C: o que você quer para os desenhos dele?**
- Que os personagens ganhem movimento e história
- Uma atividade só de desenho, para ele desenhar melhor (vira condição)
- Ainda não sei

**Perfil F: em que parte da escola ele mais trava?**
- Entender o que o enunciado pede (leitura)
- Entender as contas, e não só repetir o exemplo (matemática)
- Começar e organizar uma tarefa de várias etapas (resolver problemas)
- Entender por que as coisas acontecem, em ciências
- Ele vai bem; quero que use na prática o que aprende
- Ele precisa recuperar matéria atrasada da série (vira condição: reforço)

As opções da F são as quatro cartas da página F, mais as duas pontas.

**No total,** são 10 perguntas nos perfis A e D e 11 nos perfis B, C e F. O `lt-quiz` pede
exatamente dez. A pergunta extra existe para não vender a quem precisa de Roblox, de uma atividade só
de desenho ou de reforço da série.

---

## 4. Como o perfil é definido

Uma pergunta só não basta. O perfil passa a somar quatro respostas, uma de cada fase do SPIN:

| Pergunta | Fase | Pontos |
|---|---|---|
| P4. A cena de casa | Problema | 3 |
| I7. O que preocupa | Implicação | 2 |
| N8. A cena daqui a três meses | Necessidade | 2 |
| P10. A frase-síntese | Diagnóstico final | 3 |

**As regras:**
1. **O perfil é o que soma mais pontos.** Em caso de empate, vence a P10 (a resposta mais refletida,
   dada depois de todas as outras) e, depois dela, a P4.
2. **O segundo perfil,** se somar 2 pontos ou mais, ganha uma frase no resultado ("Você também falou
   de…"). A oferta continua sendo a do primeiro. Se houver empate no segundo lugar, vale a ordem I7,
   N8.
3. **Sempre sai um perfil.** A N8 não tem opção neutra, então mesmo quem responde "nenhuma" nas outras
   tem um perfil. Quando o perfil vencedor soma 3 pontos ou menos, o resultado abre com "Pelas suas
   respostas, o caminho mais perto de vocês é…".
4. **O que sai do motor:** a pergunta de desempate (QT), o estado "dois objetivos com o mesmo peso" e
   o resultado sem perfil.

**Exemplos:**

| Respostas | Soma | Perfil | Frase do segundo |
|---|---|---|---|
| P4 F, I7 F, N8 F, P10 F | F 10 | F | n/a |
| P4 A, I7 A, N8 F, P10 F | A 5, F 5 | F (empate, vence a P10) | A |
| P4 C, I7 D, N8 B, P10 "ainda quero conhecer" | C 3, D 2, B 2 | C, com a abertura "o caminho mais perto" | D (I7 vem antes da N8) |
| P4 nenhuma, I7 nada, N8 D, P10 "ainda quero conhecer" | D 2 | D, com a abertura "o caminho mais perto" | n/a |

Os pontos de cada perfil vão no evento do resultado visto (`viu_resultado`, campos `pontos` e
`perfil_secundario`), junto do perfil e do destino.

---

## 5. O resultado como ponte

### A estrutura, na ordem dos níveis de consciência (cerca de 500 palavras)

1. **Título:** nomeia o problema, como manda o `lt-quiz`. Ainda não fala da solução.
2. **O que você contou:** o quadro com as respostas da família, nas palavras dela (os espelhos), de
   seis a oito linhas. É aqui que a família se identifica.
3. **Por que isso acontece:** a tese do perfil, ligando a cena (P4) à calculadora (I6) e à
   preocupação (I7).
4. **O que muda isso:** a criação de jogos como solução, ainda sem o produto. Inclui a cena da N8 e,
   quando existe, a frase do segundo perfil.
5. **Onde isso acontece:** a Comunidade dos Criadores, a frase da P5 (quando ele trava), uma tela real
   e um ou dois relatos.
6. **Antes de seguir:** só quando há uma condição, uma frase cada.
7. **O próximo passo:** o que a página da oferta mostra, a frase da N9 e o botão. Sem preço.

**O que sai do resultado atual:** a apresentação longa da Comunidade, os blocos de formato e de
apoio, a atividade "Experimentem em casa" (decidido), o convite que repete os requisitos e a frase
genérica do topo.

**A abertura comum do bloco 5:** "A Comunidade dos Criadores é a plataforma do Sistema Zero Kids em que
crianças de 9 a 14 anos aprendem criando jogos."

### Copy por perfil

Entre chaves está o que vem das respostas.

#### A. Tempo de tela

**Título:** Seu filho passa horas na tela, mas quase sempre do lado de quem só escolhe

**Por que isso acontece.** Você contou que ele passa {de 2 a 4 horas} por dia em jogos e vídeos, e
que quase nada desse tempo vira alguma coisa feita por ele. Isso tem explicação: nos jogos e nos
vídeos prontos, alguém já tomou todas as decisões. As regras, os personagens e o que acontece em cada
toque vieram prontos, e ele só escolhe o que vem em seguida. O interesse está lá. O que falta é um
tempo de tela que peça alguma coisa dele além de escolher.

- Se a I6 for "Boa parte", a segunda frase muda para: "…e que uma boa parte desse tempo já vira
  criação. Então a vontade já existe, e o que falta é uma sequência para ela crescer."

**O que muda isso.** Quando a criança cria o próprio jogo, ela passa para o outro lado da tela. Decide
quanto o personagem pula, o que acontece quando ele encosta numa moeda e quanto vale cada ponto.
Aperta para testar e vê na hora se ficou como queria. O tempo na tela continua, mas agora tem
decisão, teste e, no fim, um jogo que é dele. {Cena da N8 A:} E a cena que você quer ver primeiro,
ele chamando você para ver uma coisa que ele mesmo fez, é como termina um jogo criado: com alguém da
família jogando.

**Onde isso acontece.** {Abertura comum.} Os cursos são projetos de jogo, e a aula mostra cada passo
ao lado do editor. O jogo publicado vai para o Mural com um link para a família jogar. {Frase da P5.}
**Tela:** `aula-estudio`. **Relato:** AV12, Flávia, mãe do Fernando ("O Fernando passava muito tempo
nas telas, mas ele mais assistia, não desenvolvia nada…").

**O próximo passo.** Na próxima página, você vê um projeto por dentro, do jogo pronto até a regra que
ele monta, como você acompanha e os planos. {Frase da N9.}
**Botão:** Ver como o tempo de tela vira criação

#### B. Criação de jogos

**Título:** As ideias de jogo do seu filho já existem. Falta o caminho para elas funcionarem

**Por que isso acontece.** Você contou que ele inventa jogos e regras o tempo todo, mas as ideias
ficam na conversa ou no papel. A vontade já está aí. O que falta é transformar a ideia em regras que
o computador entende: quando tocar aqui, acontece isso. Enquanto esse passo não chega, cada ideia
nova fica do mesmo tamanho da anterior. {Se a I7 for B:} E é por isso que preocupa ver essa vontade
passar antes do primeiro jogo.

**O que muda isso.** Criar um jogo é escrever as regras da ideia: quando o jogador tocar no
esconderijo, o personagem aparece e o contador soma um. A criança monta essas regras, aperta para
testar e descobre na hora se o jogo faz o que imaginou. Se não fez, ajusta. É assim que uma ideia vira
um jogo que outra pessoa consegue jogar. {Cena da N8 B:} E a cena que você quer ver, um amigo jogando
o jogo que ele inventou, é o fim natural desse caminho.

**Onde isso acontece.** {Abertura comum.} Cada curso é um jogo completo, e ele começa jogando a versão
pronta para saber aonde vai chegar. Quando conclui A Chave do Farol e publica o jogo, chega ao posto
Construtor, e o Estúdio fica livre para os jogos que ele inventar. O jogo publicado ganha um link e
um cartão com código QR para mandar a quem a família combinar. {Frase da P5.}
**Tela:** `regra`. **Relato:** AV04, André, aluno ("Eu já jogava um monte, agora eu faço os meus
jogos…"). Com a N8 B, troca por AV02, Rafael ("No fim eu peguei o link e mandei pro meu amigo jogar").

**O próximo passo.** Na próxima página, você vê os cursos como projetos de jogo, do primeiro até o
Estúdio livre, e como ele testa cada regra. {Frase da N9.}
**Botão:** Ver como ele tira os jogos do papel

#### C. Expressão visual

**Título:** Os desenhos do seu filho já têm personagem e história. Falta o que eles fazem

**Por que isso acontece.** Você contou que ele desenha personagens o tempo todo, e que os desenhos
ficam guardados no caderno. O desenho já tem quase tudo o que um personagem precisa: aparência, jeito
e história. O que ainda não tem é movimento: o que o personagem faz quando alguém aperta uma tecla.

**O que muda isso.** Num jogo, o personagem desenhado anda, pula e reage, e é a criança que decide
como. A aparência vem do desenho, e a ação vem das regras que ela monta. O desenho deixa de ser só
para olhar. {Cena da N8 C:} A cena que você quer ver, o personagem dele se mexendo na tela, é o
encontro dessas duas partes.

**Onde isso acontece.** {Abertura comum.} Ele desenha no Pinta, o editor de desenhos da plataforma, e
traz o desenho para o jogo no Estúdio. Os cursos começam com personagens preparados, e o Pinta e o
Estúdio ficam livres no posto Construtor, quando ele conclui A Chave do Farol. {Frase da P5.}
**Tela:** `integracao` (o cavaleiro saindo do Pinta e entrando no jogo). **Relato:** AV07, Jeffrey,
aluno ("Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas
ideias").

**O próximo passo.** Na próxima página, você acompanha o cavaleiro saindo do Pinta e entrando no jogo,
e vê o caminho até ele usar os próprios personagens. {Frase da N9.}
**Botão:** Ver o desenho dele entrando no jogo

#### D. Formação tecnológica

**Título:** A curiosidade do seu filho sobre como os programas funcionam pede alguma coisa que ele
possa testar

**Por que isso acontece.** Você contou que ele quer saber como os jogos e os programas funcionam, e
que você não sabe por onde começar a ensinar. A curiosidade dele é o melhor começo. Só que uma
explicação que começa pelos comandos faz a criança esperar um bom tempo até ver alguma coisa
acontecer na tela, e a curiosidade não espera.

**O que muda isso.** Programar faz sentido quando cada comando tem um efeito que a criança vê e testa.
Num jogo, isso acontece o tempo todo: ela monta o comando, aperta para testar e vê o personagem andar,
pular ou parar. Se não aconteceu o que esperava, a pergunta é dela: o que está trocado? {Cena da N8
D:} A cena que você quer ver, ele explicando como um programa funciona por dentro, nasce dessa
pergunta.

**Onde isso acontece.** {Abertura comum.} Ele aprende a programar montando jogos. A aula mostra o passo
ao lado do editor, e as falas do Zappy explicam o que fazer (o botão Ouvir lê em voz alta). Os cursos
seguem uma ordem, de Cadê Todo Mundo e A Chave do Farol até os próximos, e a Jornada do Criador mostra
em que ponto ele está e o que vem depois. {Frase da P5.}
**Tela:** `jornada`. **Relato:** N5, Daniel, pai do Rafael ("Tem um pouco da teoria, ele aprende, ele
pratica teoria na aula e cria o joguinho…").

**O próximo passo.** Na próxima página, você vê a sequência dos cursos, uma aula por dentro e a
Jornada do Criador. {Frase da N9.}
**Botão:** Ver o caminho para ele aprender a programar

#### F. Habilidades escolares (perfil novo)

**Título:** Seu filho aprendeu a repetir os passos. Falta ver o que os números fazem

**Por que isso acontece.** Você contou que, na lição, ele repete o exemplo e trava quando a pergunta
muda. {Condicional F, espelho curto: "e que o que mais trava são as contas".} Muitas vezes isso quer
dizer que ele aprendeu os passos e ainda não sabe o que aqueles números representam. No caderno, o
número não aparece fazendo nada: entra na conta, sai um resultado, e só a correção diz se deu certo.
Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.

**O que muda isso.** No jogo, o número faz alguma coisa. Um comando manda o personagem andar cinco
passos. A criança troca para dez, aperta para testar e vê o personagem ir duas vezes mais longe. No
caderno, cinco é só um número. No jogo que ela cria, cinco é a distância que o personagem anda.
{Frase da condicional F, uma delas:}
- *Leitura:* No jogo, a instrução é um enunciado: para montar, ele precisa descobrir o que fazer e
  quando. Se não entendeu, o jogo mostra na hora, e ele volta e lê de novo.
- *Matemática:* Antes de mudar um valor, ele diz o que vai acontecer, depois joga e confere se acertou.
  O placar soma, as vidas diminuem e o personagem anda um número de passos.
- *Resolver problemas:* Um jogo tem personagem, obstáculos e pontos. Ele faz o personagem andar, testa
  e só então acrescenta a próxima parte, que é a mesma organização que um trabalho escolar pede.
- *Ciências:* No jogo, ele liga e desliga uma reação e compara as duas versões. Mudar uma coisa e
  observar o efeito é o jeito de investigar que as aulas de ciências pedem.
- *Vai bem:* No jogo, a conta da escola ganha um uso: quanto vale cada estrela, quantos passos o
  personagem anda, quantas vidas sobram.

{Cena da N8 F:} A cena que você quer ver, ele explicando uma conta com as próprias palavras, cabe numa
pergunta que você pode fazer sempre: me mostra o que faz esse número mudar.

**Onde isso acontece.** {Abertura comum.} Ali, a aula liga o que ele viu no jogo ao que o comando
significa. No jogo do jardim, do curso Cadê Todo Mundo, cada personagem encontrado soma um no
contador, e é ele quem monta essa regra. {Frase da P5.}
**Tela:** `contador`. **Relato:** AV08, Daniel, pai do Rafael ("Foi um curso que trouxe pro Rafa uma
questão de se pensar, de se organizar, tanto na lógica, na matemática"). Alternativa: N11, Flávia.

**O próximo passo.** Na próxima página, você vê o jogo do jardim por dentro e onde aparecem leitura,
matemática, ciências e resolver problemas. {Frase da N9.}
**Botão:** Ver a escola dentro do jogo

### Frase do segundo perfil (entra em "O que muda isso")

- **A:** Você também falou do tempo de tela: criando, esse tempo passa a ter decisão e, no fim, alguma
  coisa que é dele.
- **B:** Você também falou das ideias de jogo que ele inventa: criando, elas viram regras que
  funcionam.
- **C:** Você também falou dos desenhos: num jogo, o personagem desenhado ganha movimento.
- **D:** Você também falou da curiosidade sobre como os programas funcionam: num jogo, cada comando
  tem um efeito que ele testa.
- **F:** Você também falou da escola: num jogo, a conta ganha um uso que ele vê na tela.

### Frases pela P5 (entram em "Onde isso acontece")

- **Larga e vai fazer outra coisa:** Você contou que, quando algo não dá certo, ele larga e vai fazer
  outra coisa. No jogo, o erro aparece na hora, na regra que ele acabou de montar, e a plataforma
  mostra onde olhar: nas partes que têm verificação, Verificar esta parte diz o que já está certo e o
  que falta. Travar vira uma pista, e não o fim da tentativa.
- **Chama alguém para resolver:** Você contou que, quando algo não dá certo, ele chama alguém. Aqui, a
  primeira ajuda está na tela: ele volta ao trecho do vídeo, ouve a fala do Zappy de novo e, nas
  partes que têm verificação, vê o que falta. Aos poucos ele resolve sozinho, e você fica para ver o
  resultado.
- **Tenta de outro jeito até dar certo:** Você contou que ele tenta de outro jeito até dar certo. É
  exatamente o que um jogo pede: mudar uma parte, testar e comparar. A aula ensina a mudar uma coisa
  por vez, para ele saber o que resolveu.
- **Procura um vídeo ou um exemplo:** Você contou que ele procura um vídeo ou um exemplo. Aqui, o
  vídeo da aula fica ao lado do editor: ele volta ao trecho, compara com a própria montagem e segue.
- **Ainda não reparei:** Na primeira aula, sente perto e observe. A faixa O que falta para seguir
  mostra o próximo passo, e você vê na hora o que ele já faz sozinho.

### Frases pela N9 (entram em "O próximo passo")

- **Aprender sozinho:** Você disse que ele precisa conseguir aprender sozinho, porque você não entende
  do assunto. A explicação está nas aulas, com o passo ao lado do editor. O seu papel é combinar o
  horário e pedir para ver o jogo.
- **A quem recorrer:** Você disse que ele precisa ter a quem recorrer quando travar. Primeiro vem o que
  está na tela: o trecho do vídeo, Verificar esta parte, Uma pista nos experimentos e o Como fazer,
  com tutoriais por assunto. Se a dúvida continuar, o botão Preciso de ajuda manda a pergunta para a
  nossa equipe, e a resposta chega por escrito nos Recados. *(É a única vez que Recados aparece no
  resultado.)*
- **Acompanhar:** Você disse que quer acompanhar o que ele aprende. Na área dos pais, cada filho tem um
  painel com os cursos, as atividades, as entregas e o ponto da Jornada. E a conversa que mais mostra
  o que ele aprendeu é a mais simples: me mostra o que você mudou.
- **Tempo de tela:** Você disse que precisa caber no tempo de tela que vocês já combinaram. As aulas
  são gravadas: ele pausa hoje e continua amanhã do mesmo ponto, e o aviso Guardado na sua conta
  confirma que o projeto ficou salvo. Vocês continuam decidindo os dias e a duração.
- **Orçamento:** Você disse que o valor precisa caber no orçamento. Na próxima página estão os dois
  planos, mensal e anual, com tudo o que a assinatura inclui. E, se em sete dias vocês acharem que
  não é para ele, devolvemos o valor integral.

**Segundo relato, pela N9,** quando não repete o do perfil:

| N9 | Relato |
|---|---|
| Aprender sozinho | N8, Daniel ("…eu já não entendo mais nada, ele segue sozinho") |
| A quem recorrer | AV03, Débora ("Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo…") |
| Acompanhar | N15, Harle ("…ele me mostra os jogos que ele criou") |
| Tempo de tela | N2, Daniel ("…ele não ficou com maior tempo de tela") |
| Orçamento | N6, Daniel ("…como se fosse um investimento para crianças…") |

### Antes de seguir (só quando há condição)

- **Só celular ou tablet:** Você contou que, por enquanto, ele só tem celular ou tablet. Para criar na
  plataforma, ele precisa de um computador com internet, mouse e teclado, que pode ser o da família.
  Vale organizar isso antes de assinar.
- **Computador compartilhado:** Como as aulas são gravadas, basta combinar um horário em que o
  computador esteja livre.
- **Ainda vai ver o computador:** Ele vai precisar de internet, mouse e teclado, e pode ser o
  computador da família.
- **Professor ao vivo:** Você disse que precisa de um professor ao vivo acompanhando. Na Comunidade, as
  aulas são gravadas e a plataforma orienta cada passo. As dúvidas vão por escrito para a equipe, e
  não há professor numa chamada. Esse ponto, ela não atende.
- **Roblox ou Minecraft:** Você disse que precisa ser no {Roblox}. A Comunidade ensina no Estúdio, a
  ferramenta de criação da própria plataforma, e não tem curso de Roblox nem de Minecraft. Se a
  vontade dele é essa ferramenta, converse com ele antes de assinar.
- **Outra ferramenta específica:** A Comunidade ensina no Estúdio, a ferramenta da própria plataforma.
  Confira se é essa a vontade dele antes de assinar.
- **Ainda vai conversar sobre a ferramenta:** Mostre a ele as telas da próxima página e pergunte se a
  vontade é criar jogos ou usar uma ferramenta específica.
- **Atividade só de desenho:** Você disse que procura uma atividade só de desenho. Na Comunidade, o
  desenho entra nos jogos: ele prepara os personagens no Pinta e usa no Estúdio. Para uma atividade só de desenho, essa
  não é a escolha certa.
- **Matéria atrasada (F):** Você contou que ele precisa recuperar matéria atrasada. Para isso, um
  professor de reforço, que retoma o conteúdo da série, é a escolha certa. A Comunidade não segue a
  série. Ela pode entrar ao lado do reforço, como a atividade em que as contas têm um efeito que ele
  vê.

Quando há uma condição não atendida, o botão vira "Conhecer a proposta e conferir os requisitos", como
hoje.

### Exemplo montado: perfil F, para uma filha

**As respostas:**
- Filha de 9 a 11 anos, de 2 a 4 horas de tela por dia, e pode usar o computador.
- Cena de casa: a da lição. Quando trava: larga. Do tempo de tela, quase nada vira criação.
- Preocupação: o desânimo com os estudos. Cena daqui a três meses: ela explicando uma conta.
- Na N9: acompanhar o que ela aprende. Na P10: a escola. Onde mais trava: nas contas.
- Soma: F 10.

> **Sua filha aprendeu a repetir os passos. Falta ver o que os números fazem**
>
> **O que você contou**
> - Sua filha tem entre 9 e 11 anos e pode usar o computador da casa.
> - Ela passa de 2 a 4 horas por dia em jogos e vídeos. Isso dá entre 730 e 1.460 horas por ano, e
>   quase nada desse tempo vira alguma coisa que ela mesma fez.
> - A cena mais comum aí em casa: na lição, ela repete o exemplo, mas trava quando a pergunta muda.
> - Quando algo não dá certo no computador, ela larga e vai fazer outra coisa.
> - O que mais preocupa você: que a dificuldade na escola vire desânimo com os estudos.
> - A cena que você quer ver primeiro: ela explicando uma conta com as próprias palavras.
> - Para dar certo, você quer acompanhar o que ela aprende.
>
> **Por que isso acontece**
> Você contou que, na lição, ela repete o exemplo e trava quando a pergunta muda, e que o que mais
> trava são as contas. Muitas vezes isso quer dizer que ela aprendeu os passos e ainda não sabe o que
> aqueles números representam. No caderno, o número não aparece fazendo nada: entra na conta, sai um
> resultado, e só a correção diz se deu certo. Por isso, uma resposta errada, sozinha, diz pouco
> sobre capacidade ou vontade.
>
> **O que muda isso**
> No jogo, o número faz alguma coisa. Um comando manda o personagem andar cinco passos. Ela troca
> para dez, aperta para testar e vê o personagem ir duas vezes mais longe. No caderno, cinco é só um
> número. No jogo que ela cria, cinco é a distância que o personagem anda. Antes de mudar um valor,
> ela diz o que vai acontecer, depois joga e confere se acertou. O placar soma, as vidas diminuem e o
> personagem anda um número de passos. A cena que você quer ver, ela explicando uma conta com as
> próprias palavras, cabe numa pergunta que você pode fazer sempre: me mostra o que faz esse número
> mudar.
>
> **Onde isso acontece**
> A Comunidade dos Criadores é a plataforma do Sistema Zero Kids em que crianças de 9 a 14 anos
> aprendem criando jogos. Ali, a aula liga o que ela viu no jogo ao que o comando significa. No jogo
> do jardim, do curso Cadê Todo Mundo, cada personagem encontrado soma um no contador, e é ela quem
> monta essa regra.
> Você contou que, quando algo não dá certo, ela larga e vai fazer outra coisa. No jogo, o erro
> aparece na hora, na regra que ela acabou de montar, e a plataforma mostra onde olhar: nas partes
> que têm verificação, Verificar esta parte diz o que já está certo e o que falta. Travar vira uma
> pista, e não o fim da tentativa.
>
> *(tela do contador)*
>
> “Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na
> matemática.” Daniel, pai do Rafael
>
> “Eu pergunto ele todo dia à tarde quando eu chego do serviço, ele me mostra os jogos que ele
> criou.” Harle, pai do Jeffrey
>
> **O próximo passo**
> Na próxima página, você vê o jogo do jardim por dentro e onde aparecem leitura, matemática,
> ciências e resolver problemas. Você disse que quer acompanhar o que ela aprende. Na área dos pais,
> cada filho tem um painel com os cursos, as atividades, as entregas e o ponto da Jornada. E a
> conversa que mais mostra o que ela aprendeu é a mais simples: me mostra o que você mudou.
>
> **[Ver a escola dentro do jogo]**

Repare na ordem: o jogo só aparece no terceiro bloco, e a Comunidade no quarto. Sem o quadro, são
cerca de 500 palavras. O resultado atual mais curto tem 1.046.

---

## 6. Tela de entrada

A entrada não fala em criar jogos. Mas precisa dizer, com todas as letras, por que vale a pena
responder.

### A motivação da família

As cinco famílias chegam por motivos diferentes:
- A criança passa horas na tela e nada fica.
- Inventa jogos que não saem do papel.
- Desenha e os desenhos ficam no caderno.
- Quer entender como os programas funcionam.
- Repete o exemplo da lição e trava.

Por baixo das cinco há o mesmo desejo e a mesma trava: **"meu filho já gosta de alguma coisa, e eu
quero que isso ajude ele a aprender mais, mas não sei por onde começar."**

Por isso, a motivação para responder é sair sabendo por onde começar, a partir do que a criança já
faz. É isso que a manchete promete, e é isso que o resultado entrega: as respostas organizadas, por
que aquilo acontece e o que muda isso.

**A manchete atual não diz isso.** A primeira versão desta proposta ("O que seu filho faz quando pode
escolher diz muito sobre o jeito como ele aprende") anunciava uma constatação, e não um ganho. A
família lê, concorda e não vê motivo para clicar.

### A manchete

O `lt-quiz` pede três coisas: só o ganho da família, um número concreto e um prazo realista. O
número vai para o tempo de resposta, porque a regra do funil proíbe prometer resultado da criança em
prazo.

**Recomendada (vale para todas as famílias):**
> Em três minutos, veja como usar o que seu filho já gosta de fazer para ele aprender mais

**Alternativa (pela dor mais comum, o tempo de tela):**
> Seu filho passa horas na tela. Em três minutos, veja o que faria esse tempo ajudar no aprendizado
> dele.

**Abaixo da manchete:** Jogos, vídeos, desenhos, perguntas sobre como as coisas funcionam ou a lição
de casa: responda algumas perguntas sobre a rotina dele e sobre o que preocupa você. No fim, você vê as
suas respostas organizadas, por que aquilo acontece e por onde começar. O resultado aparece aqui
mesmo, na tela.

**Os três minutos** são estimativa para dez ou onze toques. As métricas do funil já medem o tempo
entre o início do quiz e o resultado. Se a mediana ficar perto de dois minutos, a manchete passa a
dizer dois.

### Uma manchete por campanha (não adotada)

Quem chega por um anúncio vem pela promessa daquele anúncio. Se o anúncio fala de escola e o quiz
abre falando de tela, a família não reconhece o motivo que a trouxe. A proposta: o link de cada
campanha leva um tema (por exemplo `?tema=escola`), e a manchete continua a promessa do anúncio. Sem
tema, vale a recomendada.

| Tema | Manchete |
|---|---|
| tela | Seu filho passa horas na tela. Em três minutos, veja o que faria esse tempo deixar alguma coisa feita por ele. |
| jogos | Seu filho vive inventando jogos. Em três minutos, veja o que falta para essas ideias saírem do papel. |
| desenho | Seu filho desenha personagens o tempo todo. Em três minutos, veja o que esses desenhos podem render além do caderno. |
| programacao | Seu filho quer entender como os programas funcionam. Em três minutos, veja por onde ele pode começar. |
| escola | Quando seu filho repete o exemplo e trava na pergunta seguinte, falta uma coisa que o caderno não mostra. Em três minutos, veja o que é. |

O tema muda só a manchete. As perguntas e a soma do perfil continuam iguais, então o tema não
empurra a família para um perfil.

> **Decisão da dona:** a manchete por campanha fica para depois. No lugar dela entrou um teste A/B
> com duas manchetes: a recomendada é o padrão, e `?manchete=tela` mostra a alternativa pela dor do
> tempo de tela.

**A lateral** passa a listar as situações que o quiz olha, em vez das soluções. O selo "Um interesse.
Várias possibilidades." vira "O que o quiz olha":
- O tempo de tela
- As ideias que ele inventa
- Os desenhos
- A curiosidade sobre como as coisas funcionam
- A lição de casa

Logo abaixo, a P1 (filho ou filha e a idade) já na mesma tela.

---

## 7. Decisões

Todas tomadas pela dona em 16/10/2026:
- Separar filho e filha na P1.
- Tirar do resultado a atividade "Experimentem em casa".
- A oferta só aparece no resultado, e a criação de jogos não é apresentada como solução antes dele.
- **Manchete:** a recomendada é o padrão; a alternativa do tempo de tela entra num teste A/B com
  `?manchete=tela`. A manchete por campanha não foi adotada.
- **Uma tela real por perfil** no resultado.
- **Onze perguntas em B, C e F,** por causa da condicional.
- **Os pesos do perfil** como propostos (cena e frase-síntese 3, preocupação e cena desejada 2).
- **Admin:** as métricas precisam contar certo o quiz novo.

---

## 8. O que mudou no código

- **Versão nova:** `comunidade-orientacao-v5`. Quem respondeu a v4 começa uma resposta nova, e o lead
  antigo fica guardado como hoje.
- **O perfil novo:** F (`habilidades-escolares`), que leva a `/oferta/habilidades-escolares`.
- **O motor:** o perfil passa a ser a soma de pontos de P4, I7, N8 e P10. Saem a pergunta de
  desempate, o estado misto e o resultado sem perfil.
- **Filho ou filha:** a P1 guarda o gênero, e os textos usam formas para ele e ela.
- **A calculadora:** a I6 monta o título com a resposta da S2.
- **Manchete A/B:** `?manchete=tela` mostra a alternativa; o resto vê a padrão. A variante exibida
  fica em `attribution.quizHeadline` do lead.
- **O resultado:** passa a ser montado pelos espelhos. Os relatos vêm do mesmo `relatos.ts` das
  ofertas.
- **O `/admin`:** Performance e Perfis com os filtros "Só o quiz atual" e "Manchete"; perguntas
  nomeadas na Performance, com a extra fora da cadeia de etapas; perfil F na aba Perfis; respostas
  da v4 legíveis como "(quiz anterior)". Os pontos de cada perfil vão no evento `viu_resultado`.
- **Testes novos:**
  - reprovam "em construção", "pode exigir espera", "possível espera" e "curso obrigatório" no quiz;
  - reprovam "Comunidade", "aula", "curso" e "plataforma" nas telas antes do resultado.
- **Documentação:** o espelho em Markdown (`copy/quiz-comunidade.md`, `copy/resultados-quiz.md`) e o
  CLAUDE.md do funil, que hoje diz que a F não tem perfil no quiz.
