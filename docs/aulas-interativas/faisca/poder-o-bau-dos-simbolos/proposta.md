# O baú dos símbolos: proposta do Poder do Faísca

29/10/2026 · **Proposta para aprovação.** Define a autoria; não declara curso implementado, mídia
produzida ou publicação realizada. Quarto e último dos Poderes do Faísca, no mesmo formato de
[Moedas no caminho](../poder-moedas-no-caminho/proposta.md),
[O segredo da cabana](../poder-o-segredo-da-cabana/proposta.md) e
[A ponte apressada](../poder-a-ponte-apressada/proposta.md).

O currículo chama o Poder de "A sequência dos símbolos". A proposta é chamar o curso de **O baú dos
símbolos** (o baú só abre com os três símbolos tocados na ordem certa). As aulas: **Na ordem certa**
(2D) e **Os símbolos da ilha** (3D).

## 1. Recomendação

Criar **um curso com duas aulas**, como os outros Poderes: na **aula 1** a criança faz o jogo
lembrar **até onde a sequência chegou** no Farol 2D; na **aula 2** reconstrói a mesma regra na Ilha
3D, com menos instrução. O curso conta como **um** Poder, com as duas aulas concluídas.

**O que o Poder acrescenta:** um estado que **registra uma ordem**. Até aqui a variável guardava
"já pegou?" (verdadeiro ou falso), "quantas?" (Moedas) ou "está aberta?" (Ponte). Agora ela guarda
**o passo da sequência**: 0 antes de começar, 1 depois do primeiro símbolo certo, 2 depois do
segundo. Cada símbolo pergunta "é a minha vez?" comparando o passo; se não for, a tentativa volta
ao começo.

Fontes conferidas: [currículo editorial, posto Faísca](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json)
(Poder 4: "Estado que registra uma ordem"; pré-requisito: "Evento, comparação e memória";
aplicação: "Abrir um baú ao tocar três símbolos na ordem correta"; critério: "A ordem correta abre;
uma ordem diferente reinicia a tentativa"), [diretrizes pedagógicas](../../../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md)
(inclusive "Poderes do posto"), [descoberta guiada](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md)
e os dois cursos da trilha.

## 2. Onde as duas aulas moram (seed preservado)

Como nos outros Poderes: o seed cadastrou o curso do Poder 4 (`jornada-faisca-poder-4`, e o
`-adulto`) com **uma** aula reservada, `aula-1`, que recebe a aula 2D; a aula 3D entra como
`aula-2`, criada no Admin no mesmo curso antes da importação. ⚠️ Publicar o curso só depois da
`aula-2`. A oferta adulta usa a mesma fonte (o curso entra em `COMMON_COURSE_SLUGS`). O título no
currículo muda para "O baú dos símbolos"; como o seed reaproveita o curso, a equipe troca o título
no Admin antes de publicar.

## 3. O jogo

### 2D: os três símbolos no gramado do Farol

O Farol concluído continua inteiro (andar, limite, chave, aviso, farol que acende, barco). Entram:

- **Três pedras com símbolos** no gramado de baixo, uma ao lado da outra: **o sol**, **a lua** e
  **a estrela**. Cada pedra tem o símbolo apagado e aceso.
- **A placa da ordem**, ao lado do baú, com os três desenhos na ordem: sol, lua, estrela. A ordem
  fica à vista: o desafio é o jogo **lembrar** até onde a criança chegou, não adivinhar.
- **O baú** (a mesma arte do baú das Moedas), fechado e aberto.
- A tecla **R** para uma nova partida.

A regra do jogo: tocar o sol começa a sequência; com o sol já tocado, a lua continua; com a lua já
tocada, a estrela abre o baú. Tocar um símbolo fora da vez apaga os acesos e a tentativa recomeça,
e o aviso diz para começar pelo sol. As pedras ficam perto umas das outras: a sequência se faz em
poucos passos, e o teste do jogo cabe no prazo do executor.

### 3D: os símbolos na Ilha

A Ilha concluída continua inteira (com a pedra e os coqueiros sólidos). Entram as três pedras com
símbolos (clipes `acender` e `apagar`: o símbolo brilha e apaga), a placa da ordem e o baú das
Moedas (clipe `abrir`), no gramado da frente, no mesmo arranjo do 2D. Mesma regra.

### O que vem preparado e o que a criança constrói

| Preparado pela equipe (não é cobrado) | A criança constrói |
|---|---|
| Artes, posições, clipes, a placa e o reinício | A variável `passo` começando em 0 · no sol: `passo` vira 1, o sol acende, aviso · na lua: **se** `passo` = 1, `passo` vira 2 e a lua acende; **senão**, `passo` volta a 0, os acesos apagam e o aviso pede para começar pelo sol · na estrela: **se** `passo` = 2, o baú abre e a estrela acende; **senão**, recomeça igual · testar: a ordem certa, uma ordem errada, começar pelo meio e recomeçar depois de errar |

O Se/senão com uma variável já é do par (pré-requisito). A ideia nova fica toda na **comparação
com o passo**: cada símbolo pergunta se chegou a vez dele, e o senão desfaz a tentativa.

## 4. Blocos: nenhum bloco novo

O catálogo inteiro foi conferido (29/10/2026), nas duas dimensões:

- **Variável de número, "Alterar variável", Se/senão e a comparação** (`sz_val_compare`, com o `=`
  no menu; Programação → Lógica e Se): iniciante, **os mesmos nos dois jogos** (Programação é
  comum).
- **2D:** "Quando o sprite começar a encostar no sprite" e "Trocar imagem do sprite" (Jogo 2D,
  iniciante).
- **3D:** "Quando encostar em" e "Tocar a animação" (Jogo 3D, iniciante).
- Os eventos de grupo ("Quando começar a encostar em algum do grupo", nos dois jogos) existem, mas
  não entram: cada símbolo tem a sua pergunta, e três encontros separados deixam a vez de cada um à
  vista. Funções (que juntariam o "recomeçar" num lugar só) são do intermediário e também não
  entram: o senão repete três blocos curtos.

Nenhum desalinhamento 2D/3D encontrado para esta ideia.

## 5. Aula 1: Na ordem certa (2D, `aula-1`)

| Parte | Momento | Conteúdo |
|---|---|---|
| 1 | Jogo pronto | Jogar o Farol com os símbolos: abrir o baú na ordem certa, errar a ordem e recomeçar |
| 2 | Passo a passo do projeto | O material das duas aulas, para consultar quando quiser |
| 3 | Vídeo conceitual + experiência | **A senha do cadeado** (ver abaixo) e a experiência "A ordem dos símbolos" (§7) |
| 4 | Montagem: o sol começa | Criar `passo` com 0; no sol, `passo` vira 1, o sol acende, aviso. Montagem guiada completa |
| 5 | Montagem: a lua pergunta a vez | No encontro com a lua, o Se `passo` = 1 com o então e o senão que recomeça. Montagem guiada completa |
| 6 | Montagem: a estrela abre o baú | No encontro com a estrela, o Se `passo` = 2, o baú abre; senão, recomeça. Montagem guiada completa |
| 7 | Quiz | Previsão e diagnóstico (§8) |
| 8 | Entrega | Verificar e enviar o projeto 2D |

**Vídeo conceitual, a comparação:** "Sabe o cadeado de bicicleta com números, ou a senha de
desenhar no celular? Não basta saber os números: eles têm que vir **na ordem certa**. E, se você
erra um, não adianta continuar: tem que começar de novo." Meme ilustrado por 2 a 3 segundos: o
Zappy girando os números de um cadeado, pensativo. Liga ao jogo: os símbolos são os números, e o
jogo guarda numa variável **até onde você chegou**. Convida a investigar: "observe o número do passo
a cada símbolo, e o que acontece quando você toca um fora da vez".

Cada montagem tem objetivos próprios, que crescem por parte: o sol não cobra a lua, e a lua não
cobra o baú.

## 6. Aula 2: Os símbolos da ilha (3D, `aula-2`)

Transferência, como as aulas 3D dos outros Poderes.

| Parte | Conteúdo |
|---|---|
| 1 | Jogo pronto da Ilha com os símbolos |
| 2 | Montagem: o sol e a lua (vídeo lembra a regra; montagem completa no Passo a passo, com os clipes `acender` e `apagar`) |
| 3 | Montagem: a estrela abre o baú (idem, com o clipe `abrir`) |
| 4 | Quiz curto (duas perguntas, uma com cena 3D) |
| 5 | Entrega do projeto 3D |

## 7. Experiência "A ordem dos símbolos"

Cena com o personagem do Farol, as três pedras, a placa e o baú, e o número do **passo** à vista
(como a diretriz pede: a informação guardada aparece). A regra montada aparece como os blocos do
Estúdio: os três encontros, com os dois Se.

Controles: tocar o sol, tocar a lua, tocar a estrela, recomeçar a partida, e o jeito de o baú
decidir: **na ordem** (com o passo) / **só contando** (abre com os três tocados, em qualquer ordem,
como um contador das Moedas).

Descobertas (propósitos observáveis, não uma ordem de cliques):

1. **O passo anda com a ordem certa.** Sol: passo 1; lua: passo 2.
2. **A ordem certa abre.** Sol, lua, estrela: o baú abre.
3. **Fora da vez recomeça.** Um símbolo fora da vez volta o passo a 0 e apaga os acesos.
4. **Começar pelo meio não conta.** Lua ou estrela primeiro: nada avança.
5. **Recomeçar vale.** Depois de errar, sol, lua e estrela abrem.
6. **Contar não é lembrar a ordem.** No modo "só contando", a ordem errada também abre: é por isso
   que o baú precisa do passo.

O Zappy acompanha o estado real, com reinício, repetição e exploração fora de ordem.

## 8. Quiz proposto (aula 1, quatro perguntas)

1. **Previsão, com cena:** "O personagem tocou o sol e a lua. passo é 2. Agora ele toca a estrela.
   O que acontece?" → o baú abre.
2. **Previsão, com cena:** "O personagem tocou o sol e depois a estrela. O que acontece?" → a
   tentativa recomeça: passo volta a 0, o sol apaga e o baú continua fechado.
3. **Diagnóstico:** "Num teste, o baú abriu só tocando a estrela. O que falta?" → o Se `passo` = 2
   na estrela (ou o baú está fora do então).
4. **Diagnóstico:** "Depois de errar a ordem, tocar a lua e a estrela abriu o baú, sem o sol. Onde
   está o erro?" → o senão não volta `passo` para 0.

Aula 2: uma previsão com cena 3D (o personagem erra, começando pela lua, e depois toca sol, lua e
estrela: o baú abre, porque recomeçar pelo sol vale) e uma pergunta sem cena (onde fica o "Tocar a
animação abrir": dentro do então do Se `passo` = 2, no encontro com a estrela).

## 9. Objetivos verificados no jogo (executor)

| Objetivo | O que o teste faz | Erros que ele pega |
|---|---|---|
| Parado não abre | Espera sem tocar nada | Baú fechado no começo |
| O sol começa | Leva o personagem ao sol | `passo` mudou e o aviso mudou; o baú continua fechado |
| A ordem certa abre | Sol, lua, estrela | O baú abre (pega a estrela sem o Se e a comparação com o passo errado) |
| Fora da vez recomeça | Sol, estrela, depois lua e estrela | O baú continua fechado (pega o senão que não volta o passo a 0) |
| Começar pelo meio não abre | Lua, estrela | Baú fechado (pega a lua sem o Se) |
| Recomeçar vale | Sol, estrela, sol, lua, estrela | O baú abre (pega o senão que trava a tentativa para sempre) |
| Nova partida | Abre o baú e aperta R | Baú fechado e `passo` de volta ao começo |
| O Farol continua | Chave e farol ainda funcionam | Regras do par preservadas (só 2D) |

O nome da variável pode ser outro: o teste observa o comportamento (o baú e o aviso). As pedras
ficam perto umas das outras para cada objetivo caber nos 15 segundos do executor, mesmo com cinco
encontros no 3D; as esperas somadas de cada parte ficam dentro do orçamento (40 segundos).

## 10. Artes

Mesma família visual do Farol 2D e da Ilha no Blender:

- **2D (SVG, no estilo dos sprites do Farol):** as três pedras com o símbolo apagado e aceso (mesma
  caixa nas duas imagens) e a placa da ordem. O baú é o das Moedas.
- **3D (Blender, com o acabamento da Ilha):** as três pedras com os clipes `acender` e `apagar`
  (o símbolo brilha e apaga) e a placa da ordem, na caixa e na origem certas. O baú é o
  `bau-do-tesouro` das Moedas, com o clipe `abrir`. As pedras dos símbolos são baixas: o
  personagem encosta nelas, e elas não precisam ser sólidas.
- Prévias lado a lado com o Farol e a Ilha, conferidas no jogo e no executor sem placa de vídeo.

## 11. Entregas depois da aprovação

As mesmas dos outros Poderes: fonte das aulas, manifestos, projetos progressivos 2D e 3D (com os
arquivos portáteis), a experiência nova, o quiz com cenas, objetivos e cenários de teste no
executor (o correto e os erros plausíveis da tabela), roteiros e falas para a voz, caderno em PDF
no padrão visual dos outros, artes 2D e 3D com as fontes e o README com a importação (incluindo
criar a `aula-2` e trocar o título do curso). Gravação, voz, ensaio com crianças e publicação
ficam com a equipe.

## 12. O que precisa ser aprovado

1. O nome do curso, **O baú dos símbolos** (no lugar de "A sequência dos símbolos"), e um curso com
   duas aulas (2D na `aula-1` reservada, 3D numa `aula-2` criada no Admin).
2. Nenhum bloco novo: a ordem usa uma variável de número e a comparação `=` de Programação, iguais
   nos dois jogos (§4).
3. O jogo: sol, lua e estrela perto do baú, com a placa da ordem à vista e o Farol intacto; o baú
   reaproveita a arte das Moedas.
4. A comparação do vídeo (a senha do cadeado), a experiência com o modo "só contando" para
   comparar, o quiz e os objetivos.
