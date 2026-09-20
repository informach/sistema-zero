# Briefing do redesenho didático das aulas

> Documento de governança. Toda análise de aula deste projeto segue exatamente o que está aqui.
> Quem analisar uma aula sem ter lido este arquivo inteiro produz material que será descartado.

## 1. O que estamos fazendo e por quê

Os três cursos de jogos do Sistema Zero (Desafio do Primeiro Jogo, Corre Dino, O Jogo do Meu Jeito)
foram gravados num formato antigo: um vídeo único por aula mostrando tudo. A plataforma mudou de
forma estrutural, e o formato das aulas mudou junto: agora cada aula é uma sequência de **seções**,
e cada seção tem **blocos** de conteúdo.

Existe uma revisão histórica chamada v6 em `sistema-zero/docs/aulas-interativas-legado/*-v6/`, com 27 aulas já
reorganizadas em 281 seções. **Essa revisão é um ponto de partida mecânico, não uma referência
didática.** A divisão das seções foi produzida por script (`qa/gerar-*-v6.ts`), aplicando um molde
igual para todas: toda aula tem exatamente 1 apresentação, 1 entrega e 2 fechamentos. O resultado
tem defeitos sérios e conhecidos:

- 43 seções declaram intenção de demonstração e só 11 têm bloco de demonstração. As outras 32
  dependem de um vídeo que não existe.
- 76 das 102 seções de construção têm 2 blocos ou menos. São micro-seções de um encaixe só.
- Os três cursos usam gramáticas diferentes: Corre Dino tem 17 experimentações, o Desafio tem 5 em
  78 seções, e o Meu Jeito substituiu experiência por 26 perguntas de múltipla escolha.

Nosso trabalho é redesenhar a didática aula por aula, do zero, usando o v6 apenas como inventário
do conteúdo que a aula precisa cobrir.

## 2. A doutrina: dois eixos com regras opostas

Este é o conceito central. Errar aqui invalida a análise inteira.

### Eixo do Estúdio: nada de descoberta

Onde fica o bloco, em que categoria e subcategoria, onde encaixa, o que escrever em cada campo.
Aqui a narração conduz do primeiro ao último gesto. A criança **nunca** é mandada descobrir sozinha
onde está uma peça nem montar sozinha uma mecânica.

Decisão registrada em 01/08/2026: o curso não tem exercício. Estão banidas as fórmulas "descubra
sozinho", "monte você mesmo", "é a sua vez", "pausa o vídeo e faz", e o bloco de exercício no fim
da aula.

### Eixo do conceito: explicar e concretizar

Um conceito abstrato é explicado e em seguida vira algo que a criança vê mudar. A experiência
**não é descoberta e não é avaliação**: é a metade concreta de uma explicação.

Exemplo canônico: a aula explica o que são x e y, e logo depois a criança arrasta um controle de x
e um de y e vê o sprite mudar de lugar em tempo real. Ela não descobriu a coordenada, ela sentiu a
coordenada.

Consequência: **vídeo antes da experiência não estraga nada**, porque não existe surpresa a
preservar. O vídeo é a primeira metade da explicação e a experiência é a segunda.

### A exceção: dor antes da solução

Existe um caso, e só um, em que a ordem inverte. Quando o conteúdo é um **problema no jogo da
criança**, o problema roda antes de a ferramenta aparecer. Exemplos: o rastro na tela antes de
"Limpar a tela"; a avalanche de inimigos antes do relógio; o contador de sprites subindo antes da
faxina.

Isso pertence ao eixo do Estúdio, não ao do conceito. E vale a regra de honestidade: **conferir se
a dor reproduz de verdade naquele jogo**. Encenar problema que a gravação não mostra quebra a
confiança da aula. Quando a dor não reproduz, as saídas em ordem de preferência são: trocar por
uma dor real do mesmo jogo; provocar o sintoma de propósito e dizer que está provocando; ou
ensinar honestamente explicando por que a peça fica mesmo sem sintoma visível.

## 3. Experimentação contra demonstração

A diferença **não é didática, é de controle**. As duas existem para tornar concreto algo abstrato.

| | Experimentação | Demonstração |
|---|---|---|
| Quem comanda | a criança mexe nos controles (números, sinais, estados, ordem) | o roteiro já está programado, ela aperta play |
| O que ela faz | muda valores e vê o efeito em tempo real | observa, pausa, avança passo a passo, revê |
| Como conclui | as metas da cena caem, mais a pergunta final corrigida no servidor | ver a demonstração até o fim |

**Critério de escolha, a aplicar conceito por conceito:**

- **Experimentação quando a relação tem um botão.** Dá para escrever "quando eu aumento X,
  acontece Y". Coordenada, gravidade, impulso, intervalo de nascimento, área de colisão, sinal da
  velocidade, ordem de desenho.
- **Demonstração quando o conceito é um processo no tempo.** Dá para escrever "primeiro isso,
  depois aquilo, depois aquilo outro". Uma sequência que não tem o que ajustar, só o que acompanhar
  acontecendo em ordem.

## 4. As seis perguntas, uma vez por conceito

Não existe molde. As respostas variam de aula para aula e de conceito para conceito. Para **cada
conceito** que a aula ensina, responda e justifique:

1. Esse conceito é abstrato a ponto de precisar virar concreto, ou a explicação já basta?
2. Se precisa, a relação tem botão (experimentação) ou é processo no tempo (demonstração)?
3. Precisa de vídeo, ou a fala do Zappy e a própria cena dão conta?
4. A concretização vem antes ou depois da explicação?
5. Ela vem antes ou depois de a criança montar aquilo no Estúdio?
6. Isso é uma seção ou mais de uma?

Muitos conceitos respondem "não precisa de nada". Vocabulário (a palavra sprite), operação de
interface (confirmar um campo, clicar na área do jogo) e qualquer coisa que a criança testa
imediatamente no próprio jogo dela (as setas moverem a nave, a borda segurar) **não ganham cena**.
Gastar cena com isso é o que produziu o excesso de seções do v6.

## 5. Regras de seção

Não são molde, são pisos de qualidade:

- **Encaixe não é seção.** Uma sequência de gestos sem conceito novo agrupa na vitória que produz.
- **Conceito e sua concretização ficam juntos.** São uma ideia, e partir ao meio obriga a criança a
  atravessar uma divisória no meio de um pensamento.
- **Dor e ferramenta ficam separadas, nessa ordem.** A dor precisa fechar sozinha.
- **Uma vitória visível por aula, no mínimo.** A criança termina com algo novo acontecendo na tela
  dela. Se a aula é de mecânica invisível, ou ela ganha um instrumento que se vê (um medidor, um
  raio-X), ou a vitória é explicada com todas as letras.
- **O estado do projeto ao fim da aula é exatamente o que a aula seguinte assume.**

### Caderno do curso: regra para os próximos cursos

Todo curso infantil tem um caderno para consulta. Na **primeira aula**, a seção 1 apresenta o curso
e a **seção 2 apresenta o caderno**, antes da primeira atividade. Não é preciso criar uma aula de
boas-vindas só para o PDF. O Desafio do Primeiro Jogo já tem uma apresentação própria do caderno;
nos cursos seguintes, aplicar esta regra na Aula 1.

A seção tem intenção `material`, um vídeo curto que mostra onde o caderno fica e como usá-lo, e um
bloco `materials` com o PDF logo abaixo. A conclusão depende de assistir a 90% do vídeo. O
download fica disponível, mas não é obrigatório para avançar. O arquivo real é vinculado no admin;
o manifesto declara o bloco com `items: []`. Gravar o vídeo depois de anexar o PDF, mostrando uma
página verdadeira do caderno. Registrar a seção no relatório, no manifesto e no roteiro da aula.

## 6. Regras de língua e de execução (herdadas, obrigatórias)

- Português brasileiro com acentuação correta.
- **Travessão zero.** Exclamação pontual, 3 a 5 por aula, só nos picos.
- Linguagem falada, não escrita. Proibido "o objetivo de hoje é este".
- "o jogador" para a ação de jogar, "você" para falar com a criança.
- **Nunca chamar o aluno de criança na fala.** A turma vai de 8 a 15 anos. Use "os outros
  criadores", "alguém daqui".
- **Linguagem literal.** Muitos alunos leem ao pé da letra: nada de idiomatismo nem metáfora não
  marcada. Comparação anunciada ("é tipo", "é como") pode e funciona bem.
- Rótulo literal do bloco, nunca parafraseado. Caminho completo (categoria, subcategoria, bloco) na
  primeira menção.
- Âncora em todo encaixe. Nunca "dentro do Ao iniciar"; sempre "dentro do Ao iniciar, logo acima do
  Ir para a tela".
- **Não existe botão de play.** As três ações reais: "olha o seu jogo aí embaixo", "clica na área do
  jogo e aperta X", "recarrega a página". "Roda o jogo" é instrução proibida.
- Sem vocabulário de outro jogo (nada de nave e asteroide num curso de dino).
- Usar o vocabulário canônico: relógio (timer), faxina (culling), medidor, camadas, estados do
  jogo, sorteio, apelido, embrulhar no Se, quadros de invencibilidade, HUD, área de colisão.

## 7. Fontes a ler para cada aula

Por aula, na referência histórica `C:\Users\tocha\projects\sistema-zero\docs\aulas-interativas-legado\{curso}-v6\{aula}\`:

- `roteiro.md` — o percurso atual, a fala revisada, o trecho original gravado e as instruções de
  montagem. **É a fonte do conteúdo.** Leia inteiro.
- `manifesto.json` — a estrutura importável: seções, intenções, blocos, critérios de conclusão.
- `montagem.json` — o mapa dos clipes: arquivo de origem, primeira e última fala, o que editar.
- `configuracao-estudio.json` — só nos dias do Desafio: blocos liberados, chain, vitrine.

No nível do curso:

- `{curso}-v6/README.md` — decisões por aula e continuidade entre aulas.
- `{curso}-v6/blocos-por-aula.json` — os blocos do Estúdio usados em cada aula, com caminho completo
  na paleta atual.

Referências transversais:

- `CATALOGO-CENAS.json` (nesta pasta) — as 56 cenas que existem hoje, com título, instrução, o que
  manipulam, metas, pistas e roteiro de demonstração.
- `sistema-zero/docs/orientacao-cursos-jogos.md` — a pedagogia oficial e o dicionário canônico.
- `fluxo-criativo/meus-produtos/comunidade-dos-criadores/entregas/cursos/MOLDE-ROTEIRO-AULA.md` — o
  molde de roteiro e o checklist de conformidade.

## 8. Formato de saída obrigatório

Um arquivo markdown por aula, em `aulas/{curso}-{aula}.md`, com esta estrutura exata:

```markdown
# {Curso} · {Aula} · {Título proposto}

## Resumo
- Estado de entrada: {o que o projeto da criança já tem quando a aula começa}
- Vitória do dia: {o que fica novo na tela dela}
- Seções hoje: {N} · Seções propostas: {M}
- Clipes hoje: {N} · Clipes propostos: {M}

## Triagem dos conceitos
| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
(uma linha por conceito, incluindo os que NÃO ganham nada, com a justificativa)

## Diagnóstico do desenho atual
(o que está errado hoje, item a item, com a seção citada pelo título)

## Proposta final

### Seção 1. {título voltado para a criança}
- **Intenção:** apresentação | conceito | construção | dor | entrega | fechamento
- **Por que existe:** {uma frase}
- **Conclui quando:** {critério}
- **Blocos:**
  1. `{tipo}` — {conteúdo integral ou resumo fiel do que o bloco traz}
  2. ...

(repetir para todas as seções)

## Experiências e demonstrações desta aula
Para cada uma:
- **Cena:** `{id}` — {título}
- **Situação:** já existe e serve | já existe e precisa de ajuste | precisa ser criada
- **Se precisa de ajuste:** qual ajuste, e por quê
- **Se é nova:** especificação completa (ver seção 9)
- **Elenco/cenário:** {cast e cenario a usar}
- **Metas cobradas nesta aula:** {ids das metas}

## Vídeos
| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |

## Continuidade
- O que esta aula assume da anterior
- O que esta aula entrega para a seguinte
- Valores canônicos que saem daqui
```

## 9. Especificação de cena nova

Quando propor uma cena que não existe, entregue:

- **Id sugerido** (kebab-case, em inglês, no padrão dos 45 existentes)
- **Título** visível para a criança, em português
- **O conceito abstrato** que ela torna concreto, em uma frase
- **Tipo:** experimentação ou demonstração, com a justificativa pelo critério da seção 3
- **O que a criança manipula** (os controles exatos, com faixas de valor quando houver)
- **Como o palco começa**
- **Metas** (id, rótulo que aparece quando cai, pedido que a faixa mostra)
- **Pistas**, uma por vez, em ordem crescente de entrega
- **Palpite antes de abrir** (a pergunta e as alternativas, com a correta marcada)
- **Pergunta depois de descobrir** (conta para concluir) e a explicação que ela lê ao acertar
- **Frase de sucesso**
- **Roteiro de demonstração** (as etapas com a fala de cada uma), quando for demonstração
- **Quais outros cursos e aulas também usariam essa cena**, porque cena que serve um lugar só é cara

## 10. Princípios de julgamento

Quando estiver em dúvida, decida por estes, nesta ordem:

1. **A criança entende de verdade**, e não apenas avança na tela.
2. **Menos seções com mais substância**, sempre que o conceito não se perder.
3. **Reaproveitar cena que já existe** antes de propor cena nova, mas nunca forçar uma cena cujo
   foco não bate com o conceito da seção.
4. **Menos vídeo**, quando a cena ensina melhor do que a narração.
5. **Encantamento conta.** Esta é uma aula para alguém de 8 a 15 anos que quer fazer um jogo. O
   texto tem que ser gostoso de ler e a seção tem que dar vontade de continuar.
