# A ponte apressada: proposta do Poder do Faísca

29/10/2026 · **Proposta em aprovação.** Define a autoria; não declara curso implementado, mídia
produzida ou publicação realizada. Terceiro dos quatro Poderes do Faísca, no mesmo formato de
[Moedas no caminho](../poder-moedas-no-caminho/proposta.md) e
[O segredo da cabana](../poder-o-segredo-da-cabana/proposta.md).

O currículo chama o Poder de "A porta fica aberta por um tempo". O nome proposto para o curso é
**A ponte apressada** (a ponte não espera ninguém: baixa, conta os segundos e sobe sozinha). As
aulas: **Aberta por um tempo** (2D) e **A ponte da ilha** (3D).

## 1. Recomendação

Criar **um curso com duas aulas**, como os Poderes 1 e 2: na **aula 1** a criança aprende a fazer
uma coisa acontecer **depois de alguns segundos** no Farol 2D; na **aula 2** reconstrói a mesma
regra na Ilha 3D, com menos instrução. O curso conta como **um** Poder, com as duas aulas
concluídas.

**O que o Poder acrescenta:** o **tempo** como parte da regra. Até aqui, tudo no jogo acontecia na
hora de um encontro ou de uma tecla. Agora um acontecimento deixa um estado **temporário**: a
alavanca baixa a ponte, e a ponte sobe sozinha depois de alguns segundos, sem a criança mandar.

Fontes conferidas: [currículo editorial, posto Faísca](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json)
(Poder 3: "Relógio e estado temporário"; pré-requisito: "Evento e decisão"; aplicação: "Acionar
uma ponte que fecha depois de alguns segundos"; critério: "Abre no acionamento, fecha após o
intervalo e pode ser acionada outra vez"), [diretrizes pedagógicas](../../../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md)
(inclusive a seção "Poderes do posto"), [descoberta guiada](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md)
e os dois cursos da trilha.

## 2. Onde as duas aulas moram (seed preservado)

Como nos Poderes 1 e 2: o seed cadastrou `jornada-faisca-poder-3` (e `-adulto`) com **uma** aula
reservada, `aula-1`. A `aula-1` reservada recebe a aula 2D; a aula 3D entra como `aula-2`, criada
no Admin no mesmo curso antes da importação. ⚠️ Publicar o curso só depois da `aula-2`. A oferta
adulta usa a mesma fonte, projetada com `manifestoParaDestino` (o curso entra em
`COMMON_COURSE_SLUGS`). O título do curso no currículo muda para "A ponte apressada"; como o seed
reaproveita o curso existente, a equipe troca o título no Admin antes de publicar.

## 3. O jogo

### 2D: a ponte da pedra do sino, no Farol

O Farol concluído continua inteiro (andar, limite, chave, aviso, farol que acende, barco). Entram:

- **A pedra do sino**, uma pedrinha no mar com um sino de bronze, separada da praia por água.
- **A ponte levadiça** de madeira, entre a praia e a pedra. Começa **levantada**.
- **A alavanca**, na praia, longe da ponte, para dar uma corridinha até ela.
- A tecla **R** para uma nova partida (como nos outros Poderes).

A regra do jogo: puxar a alavanca baixa a ponte; **4 segundos depois** ela sobe sozinha. Encostar
na ponte baixada leva o personagem até a pedra, e o sino toca; com a ponte levantada, o aviso diz
que ela subiu e é preciso puxar a alavanca de novo. Os 4 segundos dão para chegar se a criança for
direto, e fazem a criança sentir o tempo passando.

### 3D: a ponte na Ilha

A Ilha concluída continua inteira. Entram a pedra do sino no mar, a ponte levadiça (modelo 3D com
os clipes `baixar` e `subir`) e a alavanca (com o clipe `puxar`). Mesma regra, mesmos 4 segundos.

### O que vem preparado e o que a criança constrói

| Preparado pela equipe (não é cobrado) | A criança constrói |
|---|---|
| Artes, posições, clipes, o reinício e a **água que não deixa passar** (2D: "Impedir o sprite de atravessar o sprite" com a água; 3D: "Permitir andar em" na ilha e na pedra). A travessia é sempre pela regra da ponte | A variável `ponteAberta` começando falsa · na alavanca: baixar a ponte, `ponteAberta` verdadeiro, avisar, e **depois de 4 segundos** subir a ponte, `ponteAberta` falso, avisar · na ponte: **se** `ponteAberta`, levar o personagem à pedra e tocar o sino; **senão**, avisar que a ponte subiu · testar: atravessar a tempo, chegar atrasado, puxar de novo |

A decisão na ponte é a mesma ideia do Farol (Se e senão com uma variável verdadeiro ou falso), que
é o pré-requisito. A ideia nova fica toda no "depois de 4 segundos": **onde** ele fica (dentro do
evento da alavanca) e **o que** vai dentro dele (desfazer o que a alavanca fez).

## 4. Blocos: nenhum bloco novo

O catálogo inteiro foi conferido (29/10/2026), nas duas dimensões:

- **"depois de N segundos, fazer"** (`sz_js_set_timeout_seconds`, Programação → 🔁 Repetições):
  espera os segundos e roda os blocos de dentro. Iniciante, o **mesmo nos dois jogos**
  (Programação é comum), e encaixa dentro de um evento. É ele que o Poder usa. O reinício do jogo
  (tecla R ou parar e jogar de novo) cancela a espera pendente.
- **Variável booleana, Se/senão, valor da variável** (Programação): iniciante.
- **2D:** "Quando o sprite começar a encostar no sprite", "Trocar imagem do sprite", "Mudar a
  posição do sprite para x y" (Jogo 2D, iniciante).
- **3D:** "Quando encostar em", "Tocar a animação", "Colocar o objeto em x y z" (Jogo 3D,
  iniciante).

⚠️ **Desalinhamento encontrado, sem mexer nele:** os dois jogos têm um bloco próprio chamado
**"Depois de N segundos"**, com a mesma frase e lugares diferentes. No Jogo 2D
(`sz_g2d_after_seconds`, Tempo) ele é um bloco de topo, que não entra dentro de um evento; no Jogo
3D (`sz_g3d_after_seconds`, Tempo e sorteio) ele entra dentro de um evento. Os dois já estão nas
mãos das crianças, e a regra é que bloco que a criança já usa não muda de forma. Por isso o Poder
usa o bloco de Programação, que é igual nos dois. A decisão sobre os dois blocos dos jogos fica
para depois (§12, item 5).

A contagem regressiva do Jogo 3D ("Começar a contagem", "o tempo que falta") não entra: não tem par
no Jogo 2D, e o Poder não precisa mostrar o tempo restante.

## 5. Aula 1: Aberta por um tempo (2D, `aula-1`)

| Parte | Momento | Conteúdo |
|---|---|---|
| 1 | Jogo pronto | Jogar o Farol com a ponte: atravessar a tempo, chegar atrasado, puxar de novo |
| 2 | Passo a passo do projeto | O material das duas aulas, para consultar quando quiser |
| 3 | Vídeo conceitual + experiência | **O botão do semáforo** (ver abaixo) e a experiência "A ponte apressada" (§7) |
| 4 | Montagem: a alavanca baixa a ponte | Criar `ponteAberta` falso; na alavanca, baixar a ponte, guardar verdadeiro, avisar. Montagem guiada completa |
| 5 | Montagem: a ponte sobe sozinha | Dentro do evento da alavanca, o "depois de 4 segundos" que sobe a ponte, guarda falso e avisa. Montagem guiada completa |
| 6 | Montagem: atravessar | O encontro com a ponte, o Se, o então (ir à pedra e tocar o sino) e o senão. Montagem guiada completa |
| 7 | Quiz | Previsão e diagnóstico (§8) |
| 8 | Entrega | Verificar e enviar o projeto 2D |

**Vídeo conceitual, a comparação:** "Sabe o botão do semáforo de pedestre? Você aperta, o sinal
fica verde **por um tempo**, e depois volta para o vermelho sozinho. Ninguém precisa apertar outro
botão para ficar vermelho: o semáforo já sabe esperar. E se você apertar de novo, ele abre de
novo." Meme ilustrado por 2 a 3 segundos: o Zappy esperando na faixa, olhando um relógio. Liga ao
jogo: a alavanca é o botão, a ponte baixada é o sinal verde, e o bloco "depois de 4 segundos" é o
semáforo sabendo esperar. Convida a investigar: "observe o que muda quando o tempo acaba, e o que
acontece se você chegar atrasado".

Cada montagem tem objetivos próprios, que crescem por parte: a alavanca não cobra a subida ainda
não pedida, e a subida não cobra a travessia.

## 6. Aula 2: A ponte da ilha (3D, `aula-2`)

Transferência, como as aulas 3D dos outros Poderes: o conceito já foi visto.

| Parte | Conteúdo |
|---|---|
| 1 | Jogo pronto da Ilha com a ponte |
| 2 | Montagem: a alavanca e a ponte que sobe sozinha (vídeo lembra a regra; montagem completa no Passo a passo, com os clipes `puxar`, `baixar` e `subir`) |
| 3 | Montagem: atravessar até o sino (idem) |
| 4 | Quiz curto (duas perguntas, uma com cena 3D) |
| 5 | Entrega do projeto 3D |

## 7. Experiência "A ponte apressada"

Cena com o personagem real do Farol, a alavanca, a ponte, a pedra do sino e um **relógio de
segundos** visível (cada segundo que passa acende uma marquinha, até 4). Mostra a informação
guardada como na diretriz (`ponteAberta`: verdadeiro ou falso) e a regra montada como os blocos do
Estúdio: o evento da alavanca com o "depois de 4 segundos" dentro, e o Se da ponte.

O tempo da cena anda **um segundo por vez**, num botão: assim a criança controla o relógio e
consegue observar cada momento, sem pressa e sem depender da velocidade do aparelho.

Controles: puxar a alavanca, esperar 1 segundo, encostar na ponte, recomeçar a partida, e o lugar
do "depois de": **dentro da alavanca** / **no começo do jogo** (como "e" / "ou" na Cabana).

Descobertas (propósitos observáveis, não uma ordem de cliques):

1. **Fechada no começo.** Encostar na ponte antes de puxar: o aviso diz que ela está levantada.
2. **A alavanca abre.** Puxar: a ponte baixa e `ponteAberta` vira verdadeiro.
3. **A tempo, atravessa.** Puxar, esperar menos de 4 segundos e encostar: o sino toca.
4. **Sobe sozinha.** Esperar os 4 segundos: a ponte sobe e `ponteAberta` volta a falso, sem
   ninguém mandar.
5. **Pode puxar de novo.** Depois que subiu, puxar outra vez baixa de novo.
6. **O lugar do "depois de".** Com ele no começo do jogo, a ponte nunca mais sobe depois da
   primeira vez: o relógio só começa quando o bloco roda, e no começo ele roda uma vez só.

O Zappy acompanha o estado real (uma fala por situação observada), com reinício, repetição e
exploração fora de ordem.

## 8. Quiz proposto (aula 1, quatro perguntas)

1. **Previsão, com cena:** "O personagem puxou a alavanca, esperou 2 segundos e encostou na ponte.
   A ponte sobe depois de 4 segundos. O que acontece?" → ele atravessa e o sino toca.
2. **Previsão, com cena:** "O personagem puxou a alavanca e esperou 5 segundos antes de encostar na
   ponte. O que acontece?" → a ponte já subiu; ele fica na praia e o aviso pede para puxar de novo.
3. **Diagnóstico:** "Num teste, a ponte baixou e nunca mais subiu. O que falta?" → o "depois de 4
   segundos" com a subida dentro (ou ele existe, mas está vazio).
4. **Diagnóstico:** "A ponte subiu sozinha uma vez, logo no começo, e depois disso a alavanca
   baixa a ponte e ela não sobe mais. Onde está o erro?" → o "depois de" está fora do evento da
   alavanca, no começo do jogo.

Aula 2: uma previsão com cena 3D (a ponte já subiu e o personagem puxa a alavanca de novo: ela
baixa outra vez) e uma pergunta sem cena (onde fica o "Tocar a animação subir": dentro do "depois
de 4 segundos").

## 9. Objetivos verificados no jogo (executor)

| Objetivo | O que o teste faz | Erros que ele pega |
|---|---|---|
| A alavanca baixa a ponte | Leva o personagem à alavanca | Ponte baixada, `ponteAberta` verdadeiro, aviso mudou; nada muda antes do encontro |
| Ainda aberta antes do tempo | Puxa e espera 1 segundo | Ponte ainda baixada (pega a subida sem espera e o tempo curto demais) |
| Sobe sozinha | Puxa e espera um pouco mais que 4 segundos | Ponte levantada e `ponteAberta` falso (pega a ponte que nunca sobe e a subida que só troca a imagem) |
| Pode acionar de novo | Puxa, espera subir, puxa outra vez | Baixa de novo e sobe de novo (pega o "depois de" no começo do jogo) |
| Atravessa a tempo | Puxa e vai direto à ponte | O personagem chega à pedra e o sino toca |
| Atrasado não passa | Puxa, espera subir e vai à ponte | Fica na praia e o aviso mudou (pega a travessia sem o Se e a regra invertida) |
| Nova partida | Puxa, aperta R | Ponte levantada, `ponteAberta` falso, e a espera pendente não sobe nada depois |
| O Farol continua | Chave e farol ainda funcionam | Regras do par preservadas (só 2D) |

O nome da variável pode ser outro: o teste observa o comportamento. O tempo pode ser outro valor
entre 3 e 6 segundos sem reprovar (o teste mede a subida dentro dessa janela); fora dela, o
objetivo explica o que observou. As esperas somadas de cada parte ficam dentro do orçamento do
executor (até 40 segundos por parte).

## 10. Artes

Mesma família visual do Farol 2D e da Ilha no Blender:

- **2D (SVG, no estilo dos sprites do Farol):** a ponte levadiça baixada e levantada (mesma caixa e
  ponto de apoio nas duas imagens), a alavanca para cima e para baixo, a pedra do sino com o sino
  parado e balançando, e a água entre a praia e a pedra.
- **3D (Blender, com o acabamento da Ilha):** a ponte com os clipes `baixar` e `subir`, a alavanca
  com o clipe `puxar` e a pedra com o sino (clipe `tocar`), na caixa e na origem certas, com a área
  de toque estável.
- Prévias lado a lado com o Farol e a Ilha, conferidas no jogo e no executor sem placa de vídeo.

## 11. Entregas depois da aprovação

As mesmas dos outros Poderes: fonte das aulas, manifestos, projetos progressivos 2D e 3D (com os
arquivos portáteis), a experiência nova, o quiz com cenas, objetivos e cenários de teste no
executor (o correto e os erros plausíveis da tabela), roteiros e falas para a voz, caderno em PDF
no padrão visual dos outros, artes 2D e 3D com as fontes e o README com a importação (incluindo
criar a `aula-2` e trocar o título do curso). Gravação, voz, ensaio com crianças e publicação
ficam com a equipe.

## 12. O que precisa ser aprovado

1. O nome do curso, **A ponte apressada**, e um curso com duas aulas (2D na `aula-1` reservada,
   3D numa `aula-2` criada no Admin).
2. Nenhum bloco novo: o tempo usa o "depois de N segundos" de Programação, igual nos dois jogos (§4).
3. O jogo: alavanca, ponte levadiça de 4 segundos e a pedra do sino, com o Farol intacto; a água
   que não deixa passar vem pronta, e a travessia é a regra da ponte.
4. A comparação do vídeo (o botão do semáforo), a experiência com o relógio de um segundo por vez,
   o quiz e os objetivos.
5. Os dois blocos "Depois de N segundos" dos jogos (2D de topo, 3D dentro de evento) continuam
   como estão: este Poder não mexe neles. Alinhar os dois é uma decisão à parte, para depois.
