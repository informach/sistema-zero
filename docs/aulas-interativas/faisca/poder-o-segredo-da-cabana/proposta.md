# O segredo da cabana: proposta do Poder do Faísca

29/10/2026 · Proposta aprovada, com o nome do curso trocado de "Duas peças para abrir" para
**O segredo da cabana** (a aprovação pediu um nome mais criativo). A aula 1 segue "Duas peças
para abrir", que é a regra dela. Define a autoria; não declara curso implementado, mídia
produzida ou publicação realizada. Segundo dos quatro Poderes do Faísca, no mesmo formato de
[Moedas no caminho](../poder-moedas-no-caminho/proposta.md), que é a referência de qualidade.

## 1. Recomendação

Criar **um curso com duas aulas**, como o Poder 1: na **aula 1** a criança aprende a juntar duas
informações com **e** no Farol 2D; na **aula 2** reconstrói a mesma regra na Ilha 3D, com menos
instrução. O curso conta como **um** Poder, com as duas aulas concluídas.

**O que o Poder acrescenta:** a decisão que depende de **duas** informações ao mesmo tempo. No
Farol, a porta perguntava uma coisa só (`temChave`). Aqui uma segunda porta pergunta duas
(`temChave` **e** `temEmblema`), e só abre quando as duas são verdadeiras.

Fontes conferidas: [currículo editorial, posto Faísca](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json)
(Poder 2: "Combinar duas informações com E"; pré-requisito: "Variável booleana e Se/senão";
aplicação: "Criar uma segunda porta que exige chave e emblema"; critério: "Nenhum item ou apenas
um mantém a porta fechada; os dois abrem"), [diretrizes pedagógicas](../../../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md)
(inclusive a seção "Poderes do posto"), [descoberta guiada](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md)
e os dois cursos da trilha.

## 2. Onde as duas aulas moram (seed preservado)

Como no Poder 1: o seed cadastrou `jornada-faisca-poder-2` (e `-adulto`) com **uma** aula
reservada, `aula-1`. O currículo não muda. A `aula-1` reservada recebe a aula 2D; a aula 3D entra
como `aula-2`, criada no Admin no mesmo curso antes da importação. ⚠️ Publicar o curso só depois
da `aula-2`. A oferta adulta usa a mesma fonte, projetada com `manifestoParaDestino` (o curso
entra em `COMMON_COURSE_SLUGS`).

## 3. O jogo

### 2D: a cabana do faroleiro no Farol

O Farol concluído continua inteiro (andar, limite, chave, aviso, farol que acende, barco). Entram:

- **O emblema do farol**: um distintivo redondo com a estrela do farol, no gramado de baixo, longe
  da chave (que fica no gramado de cima). Nenhum dos dois começa encostado no personagem.
- **A cabana do faroleiro**, no canto do gramado de baixo, com a porta fechada. É a segunda porta:
  abre só com a chave **e** o emblema, e aberta mostra a luz de dentro. O farol continua pedindo
  só a chave.
- A tecla **R** para uma nova partida (como no Poder 1).

**Duas peças em lugares opostos, de propósito:** a criança testa naturalmente os casos que o
critério pede (sem nenhuma, só com a chave, só com o emblema e com as duas), e pode pegar as peças
em qualquer ordem.

### 3D: a cabana na Ilha

A Ilha concluída continua inteira. Entram o emblema (modelo 3D, no outro lado da trilha em relação
à chave) e a cabana do faroleiro com a porta fechada e o clipe `abrir` (a porta gira e a luz de
dentro acende). Mesma regra.

### O que vem preparado e o que a criança constrói

| Preparado pela equipe (não é cobrado) | A criança constrói |
|---|---|
| Artes (emblema, cabana fechada e aberta), posições, o clipe da cabana, o desenho e o reinício. A regra da chave do Farol (`temChave`) já está no projeto, porque é do par | A variável `temEmblema` começando falsa · a coleta do emblema: ao encostar, **ele some**, `temEmblema` vira verdadeiro e o aviso conta · na cabana: **se** `temChave` **e** `temEmblema`, abrir e avisar; **senão**, avisar que a porta pede a chave e o emblema · testar sem nenhuma, com uma de cada vez e com as duas |

A coleta do emblema é a mesma regra da coleta da chave, que a criança já montou no Farol: ela
reaplica o que sabe, e a ideia nova fica toda na pergunta da cabana.

## 4. Blocos: nenhum bloco novo

O catálogo inteiro foi conferido (29/10/2026), nas duas dimensões. Tudo o que o Poder pede já existe
no iniciante:

- **"e / ou"** (`sz_val_logic`, Programação → Lógica e Se): o bloco de valor que junta duas
  condições, com o menu **e** e **ou**. Iniciante, o mesmo nos dois jogos (Programação é comum).
- **Variável booleana, Se/senão, valor da variável, verdadeiro ou falso** (Programação): iniciante.
- **2D:** "Quando o sprite começar a encostar no sprite", "Destruir o sprite", "Trocar imagem do
  sprite" (Jogo 2D, iniciante).
- **3D:** "Quando encostar em", "Esconder o objeto", "Tocar a animação" (Jogo 3D, iniciante).

Não há bloco num lado e não no outro: os dois jogos montam a pergunta com o mesmo bloco de
Programação.

## 5. Aula 1: Duas peças para abrir (2D, `aula-1`)

| Parte | Momento | Conteúdo |
|---|---|---|
| 1 | Jogo pronto | Jogar o Farol com a cabana: tentar a porta sem nada, com uma peça e com as duas |
| 2 | Passo a passo do projeto | O material das duas aulas, para consultar quando quiser |
| 3 | Vídeo conceitual + experiência | **A bicicleta e o capacete** (ver abaixo) e a experiência "A porta com duas peças" (§7) |
| 4 | Montagem: guarde o emblema | Criar `temEmblema` falso e a coleta do emblema (some, guarda verdadeiro, avisa). Montagem guiada completa |
| 5 | Montagem: a porta pede as duas | O encontro com a cabana, o Se com o bloco **e**, o então e o senão. Montagem guiada completa |
| 6 | Quiz | Previsão e diagnóstico (§8) |
| 7 | Entrega | Verificar e enviar o projeto 2D |

**Vídeo conceitual, a comparação:** "Para andar de bicicleta você precisa da bicicleta **e** do
capacete. Só a bicicleta não vale; só o capacete também não. É preciso ter as duas coisas ao
mesmo tempo." Meme ilustrado por 2 a 3 segundos: o Zappy de capacete, segurando a bicicleta.
Liga ao jogo: a cabana pergunta duas coisas, e o bloco **e** só responde sim quando as duas são
verdadeiras. Convida a investigar: "observe quando a porta abre e quando continua fechada, e
compare com a regra **ou**".

Cada montagem tem objetivos próprios, que crescem por parte: a coleta do emblema não cobra a
porta ainda não pedida.

## 6. Aula 2: Duas peças na ilha (3D, `aula-2`)

Transferência, como a aula 3D das Moedas: o conceito já foi visto.

| Parte | Conteúdo |
|---|---|
| 1 | Jogo pronto da Ilha com o emblema e a cabana |
| 2 | Montagem: guarde o emblema (vídeo lembra a regra; montagem completa no Passo a passo) |
| 3 | Montagem: a cabana pede as duas (idem, com o clipe `abrir`) |
| 4 | Quiz curto (duas perguntas, uma com cena 3D) |
| 5 | Entrega do projeto 3D |

## 7. Experiência "A porta com duas peças"

Cena com o personagem real do Farol, a chave, o emblema e a cabana. Mostra as duas informações
como na diretriz (os dois valores guardados, cada um verdadeiro ou falso) e a pergunta da porta
montada como os blocos do Estúdio: `temChave` **e** `temEmblema`, com a resposta (verdadeiro ou
falso) ao lado.

Controles: pegar a chave, pegar o emblema, encostar na porta, recomeçar a partida, e a regra da
porta em dois botões, **e** / **ou** (como "Pelo menos 5" / "Igual a 5" nas Moedas).

Descobertas (propósitos observáveis, não uma ordem de cliques):

1. **Sem nenhuma peça, fechada.** Tentar a porta logo no começo.
2. **Uma peça só não abre.** Com a chave sozinha **ou** com o emblema sozinho, a porta continua
   fechada e o aviso diz o que ela pede.
3. **As duas abrem.** Com as duas peças, a porta abre.
4. **A ordem não importa.** Pegar o emblema antes da chave também abre (ver o caso nas duas ordens).
5. **"e" e "ou".** Com a regra **ou**, uma peça só já abre a porta: é o erro que a regra **e**
   evita.

O Zappy acompanha o estado real (uma fala por situação observada), com reinício, repetição e
exploração fora de ordem.

## 8. Quiz proposto (aula 1, quatro perguntas)

1. **Previsão, com cena:** "O personagem pegou só a chave e encosta na cabana. A regra é `temChave`
   e `temEmblema`. O que acontece?" → continua fechada e o aviso pede as duas peças.
2. **Previsão, com cena:** "A regra da cabana foi montada com **ou**. O personagem pegou só o
   emblema. O que acontece?" → abre, porque com **ou** basta uma; por isso a cabana usa **e**.
3. **Diagnóstico:** "A cabana abre logo depois de pegar a chave, mesmo sem o emblema. O que está
   errado na regra?" → a pergunta usa **ou**, ou pergunta só `temChave`.
4. **Escolha de teste:** "Para ter certeza de que a cabana funciona, quais partidas testar?" →
   uma só com a chave, uma só com o emblema e uma com as duas (além de tentar sem nenhuma).

Aula 2: uma previsão com cena 3D (pegou o emblema primeiro e a chave depois: a cabana abre, a ordem
não importa) e uma pergunta sem cena (onde fica o "Tocar a animação abrir": no então do Se).

## 9. Objetivos verificados no jogo (executor)

| Objetivo | O que o teste faz | Erros que ele pega |
|---|---|---|
| Guardar o emblema | Leva o personagem ao emblema | O emblema some e o aviso muda; nada muda antes do encontro |
| Sem peças, fechada | Vai direto à cabana | Porta fechada e o aviso mudou (pega a porta que abre sempre) |
| Só a chave não abre | Pega a chave e vai à cabana | Porta fechada (pega **ou** e a pergunta só com `temChave`) |
| Só o emblema não abre | Pega o emblema e vai à cabana | Porta fechada (pega **ou** e a pergunta só com `temEmblema`) |
| As duas abrem | Pega as duas e vai à cabana | Porta aberta (pega a pergunta invertida e o emblema que não é guardado) |
| Nova partida | Pega as duas, abre e reinicia | Peças de volta, porta fechada |
| O Farol continua | Chave e farol ainda funcionam | Regras do par preservadas |

O nome da variável do emblema pode ser outro: o teste observa o comportamento. Um Se dentro do
outro (`Se temChave`, e dentro dele `Se temEmblema`) produz o mesmo resultado e também passa. Se a
navegação não chega a uma peça, o teste diz que não terminou e orienta a conferir o movimento.

## 10. Artes

Mesma família visual do Farol 2D e da Ilha no Blender:

- **2D (SVG, no estilo dos sprites do Farol):** o emblema do farol (distintivo redondo com a
  estrela, 32 × 32) e a cabana do faroleiro fechada e aberta (mesma caixa e ponto de apoio nas
  duas imagens, a aberta com a luz de dentro).
- **3D (Blender, com o acabamento da Ilha):** o emblema e a cabana com o clipe `abrir`, na caixa e
  na origem certas, com a área de toque estável e pose final aberta.
- Prévias lado a lado com o Farol e a Ilha, conferidas no jogo e no executor sem placa de vídeo.

## 11. Entregas depois da aprovação

As mesmas do Poder 1: fonte das aulas, manifestos, projetos progressivos 2D e 3D (com os arquivos
portáteis), a experiência nova, o quiz com cenas, objetivos e cenários de teste no executor (o
correto e os erros plausíveis da tabela), roteiros e falas para a voz, caderno em PDF no padrão
visual dos outros, artes 2D e 3D com as fontes e o README com a importação (incluindo criar a
`aula-2`). Gravação, voz, ensaio com crianças e publicação ficam com a equipe.

## 12. O que precisa ser aprovado

1. Um curso com duas aulas (2D na `aula-1` reservada, 3D numa `aula-2` criada no Admin).
2. Nenhum bloco novo: a pergunta usa o bloco **e / ou** que já é do iniciante (§4).
3. O jogo: o emblema e a cabana do faroleiro como segunda porta, farol e chave intactos.
4. A comparação do vídeo (a bicicleta e o capacete), a experiência, o quiz e os objetivos.
