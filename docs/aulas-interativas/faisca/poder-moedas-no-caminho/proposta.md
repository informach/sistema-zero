# Moedas no caminho: proposta do Poder do Faísca

29/10/2026 · Proposta para aprovação. Define a autoria; não declara curso implementado, mídia
produzida ou publicação realizada. Primeiro dos quatro Poderes do Faísca e referência de
qualidade para os outros três (Duas peças para abrir, A porta fica aberta por um tempo e A
sequência dos símbolos).

## 1. Recomendação

Criar **um curso com duas aulas**, uma em 2D e outra em 3D, como o par e a missão do posto. Na
**aula 1** a criança aprende a contar e a usar uma meta no Farol 2D. Na **aula 2** reconstrói a
mesma regra na Ilha 3D, com menos instrução. O curso conta como **um** Poder.

Direção da usuária (29/10/2026): cada Poder nas duas dimensões, porque acompanha o par. A
segunda dimensão é a prova de transferência: no 3D a criança refaz a regra no outro jogo, e é
isso que mostra que entendeu o contador e a meta, e não só copiou blocos.

**O que o Poder acrescenta:** um **número guardado que muda** (o contador) e uma **decisão por
quantidade** (a meta). O Farol ensinou uma informação verdadeira ou falsa (`temChave`); aqui a
informação passa a ser uma quantidade que cresce a cada coleta, e o Se/senão passa a comparar
essa quantidade com uma meta.

Fontes conferidas: [Jornada do Criador](../../../jornada-do-criador.md), [currículo editorial,
posto Faísca](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json)
(Poder 1: "Contador numérico e objetivo por quantidade"; aplicação: "acrescentar moedas ao
caminho do Farol e exigir uma quantidade para uma recompensa opcional"; critério: "cada moeda
conta uma vez; coletar menos que a meta não libera a recompensa"), [seed](../../../jornada-criador-seed.md),
[diretrizes pedagógicas](../../../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md),
[descoberta guiada](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md) e os dois cursos da
trilha e a missão já autorados.

## 2. Onde as duas aulas moram (seed preservado)

O seed cadastrou o curso `jornada-faisca-poder-1` (e `-adulto`) com **uma** aula reservada,
`aula-1`, e guarda a impressão digital desse planejamento (`outlineHash`). Mudar o currículo
para duas aulas faria uma nova execução do seed recusar o curso já cadastrado ("o planejamento
editorial mudou"). Por isso, como no Jardim:

- O currículo **não muda**. A `aula-1` reservada recebe a **aula 2D**.
- A **aula 3D** entra como `aula-2`, criada no Admin dentro do mesmo curso antes da importação
  do manifesto (o importador preenche uma aula existente; não cria aulas).
- O curso só conta como concluído com **todas as aulas publicadas concluídas**
  (`mark-lesson-complete`: concluídas = total), então o Poder exige as duas dimensões.
- ⚠️ O Admin só exige a `aula-1` (a reservada) para publicar o curso. **Publicar o curso só
  depois da `aula-2`**, senão ele sai só com a metade 2D. Fica registrado no README do curso.
- A descrição do curso no seed fala em uma aula; a reconciliação editorial (texto do curso no
  Admin) fica anotada para antes da publicação, sem mexer no outline histórico.

Oferta adulta: mesma fonte, projetada para `jornada-faisca-poder-1-adulto` pelo adaptador
editorial que o Jardim já usa.

## 3. O jogo

### 2D: moedas no caminho do Farol

O Farol concluído continua inteiro (andar, limite, chave, aviso, farol, barco). Entram:

- **Seis moedas** ao longo do caminho de areia, do começo do personagem até a praia. Nenhuma
  começa encostada no personagem, na chave ou no farol.
- Um **baú** na ilhota da ponte: a recompensa opcional. Fechado, ele espera; com **pelo menos
  cinco moedas**, abre e mostra o tesouro. O farol continua pedindo só a chave.
- Um **ícone de moeda** no canto, ao lado do número de moedas guardadas.

**Seis moedas e meta cinco, de propósito:** a criança que pega todas tem seis, e o baú precisa
abrir. É a situação concreta que separa "**pelo menos** cinco" de "**exatamente** cinco", o erro
mais provável com comparação.

### 3D: moedas na trilha da Ilha

A Ilha concluída continua inteira. Entram seis moedas girando sobre a trilha, um baú num lugar
alcançável fora da trilha principal (a definir no cenário, sem atrapalhar o caminho até o farol)
e o número de moedas escrito na tela. O baú tem o clipe `abrir`. Mesma meta: cinco.

### O que vem preparado e o que a criança constrói

| Preparado pela equipe (não é cobrado) | A criança constrói |
|---|---|
| Artes (moedas, baú fechado/aberto, ícone), posições, o grupo das moedas já criado com as seis, o giro das moedas no 3D, o clipe do baú, o desenho e o reinício | A variável `moedas` começando em 0 · a coleta: ao encostar numa moeda, **ela some** e **soma 1** · mostrar o número na tela · no baú: **se** `moedas` ≥ 5, abrir; **senão**, avisar quantas faltam · testar com menos, com cinco e com seis |

O grupo é preparado porque a ideia nova é o contador, não a coleção. A criança usa o encontro
"com alguma moeda do grupo" do mesmo jeito que usou o encontro com a chave.

## 4. O encontro com "alguma moeda": blocos que já existem

Antes de criar qualquer bloco, o catálogo inteiro das duas extensões foi conferido (29/10/2026).
Não há bloco novo neste Poder: tudo o que a montagem pede já existe no nível iniciante.

- **2D:** "Para cada sprite do grupo `moedas` que colidir com o sprite `personagem`, chamar o
  sprite de `moeda`, fazer …" (`sz_g2d_on_sprite_group_overlap`), no núcleo de entrada do Jogo 2D
  (`initialCore.ts`, nível `iniciante-2d`). É um comando de **🔁 Enquanto estiver rodando**, não
  um evento: roda a cada quadro enquanto a moeda encosta. É o mesmo jeito que o exemplo Vale
  Ensolarado usa para pegar as gemas ("Tirar do grupo" + somar os pontos).
- **3D:** "Quando `personagem` encostar em algum do grupo `moedas`, chamando de `moeda`"
  (`sz_g3d_on_touch_group`) e "Remover `moeda` da cena", no conjunto iniciante do Jogo 3D.
- Também existem no iniciante: "Tirar o sprite do grupo", "Mostrar placar … valor …", "Trocar a
  imagem do sprite" (2D); "Escrever na tela", "Tocar a animação", "Girar", "Criar grupo" (3D).

Consequência para a aula 2D, que vira uma descoberta a mais: como o bloco do 2D roda a cada
quadro, **se a moeda não sair do grupo, ela conta sem parar** enquanto o personagem estiver em
cima. Tirar a moeda é o que faz cada moeda contar uma vez só. No 3D o encontro é um evento (conta
ao começar a encostar), mas a moeda continua precisando sumir, senão conta de novo a cada nova
encostada. A ideia de "cada moeda conta uma vez" fica igual nas duas dimensões.

## 5. Aula 1: Cada moeda conta (2D, `aula-1`)

| Parte | Momento | Conteúdo |
|---|---|---|
| 1 | Jogo pronto | Jogar o Farol com moedas: pegar algumas, ver o número subir, tentar o baú com poucas e com cinco |
| 2 | Vídeo conceitual | **O cofrinho**: cada moeda que cai soma um; o número fica guardado mesmo quando a gente sai de perto; para comprar algo, a pergunta é "tenho **pelo menos** o preço?". Liga a ideia ao jogo e convida a investigar |
| 3 | Experiência "O contador de moedas" | A criança manipula a regra (ver §7) |
| 4–7 | Montagem no Estúdio | Uma etapa por regra: criar `moedas` = 0 · coleta (some + soma 1) · mostrar o número · o baú com Se/senão e comparação. Instruções completas, com paleta, bloco, destino, campos, teste e correção |
| 8 | Quiz | Previsão e diagnóstico (ver §8) |
| 9 | Entrega | Verificar e enviar o projeto 2D |

Cada etapa de montagem tem objetivos próprios, que crescem por parte: a coleta não cobra o baú
ainda não pedido.

## 6. Aula 2: Moedas na ilha (3D, `aula-2`)

Mais curta, como a aula 3D da missão: o conceito já foi visto.

| Parte | Conteúdo |
|---|---|
| 1 | Jogo pronto da Ilha com moedas e baú |
| 2 | Vídeo curto: "a mesma regra em outro mundo"; mostra o resultado e convida a construir |
| 3 | Construção com ajuda opcional completa (a mesma variável, a coleta com o bloco do grupo, o número na tela, o baú com o clipe `abrir`) |
| 4 | Quiz curto (uma ou duas perguntas, uma com cena 3D) |
| 5 | Entrega do projeto 3D |

## 7. Experiência "O contador de moedas"

Cena com o personagem real do Farol, cinco ou seis moedas e o baú. Mostra o valor guardado como
na diretriz: **antes → somar 1 → agora**, um único valor atual, e a meta ao lado do baú.

Descobertas (propósitos observáveis, não uma ordem de cliques):

1. **Cada moeda soma um.** Pegar moedas uma a uma e ver o número subir de 1 em 1.
2. **A mesma moeda não conta duas vezes.** Com a regra "a moeda some" ligada, voltar ao lugar
   não soma de novo. Desligando "some", passar por cima soma de novo: o erro aparece na tela.
3. **O número fica guardado.** Afastar-se das moedas não muda o valor.
4. **Menos que a meta não abre.** Tentar o baú com quatro.
5. **"Pelo menos" e "exatamente".** Com seis moedas, comparar a regra "≥ 5" (abre) com "= 5"
   (não abre).

O Zappy acompanha o estado real (uma fala por situação observada), com reinício, repetição e
exploração fora de ordem.

## 8. Quiz proposto (aula 1, quatro perguntas)

1. **Previsão, com cena:** "Ela tem 4 moedas e encosta no baú. O que acontece?" → continua
   fechado e avisa que falta 1.
2. **Previsão, com cena:** "Pegou as seis. A regra do baú é 'moedas igual a 5'. Abre?" → não;
   "pelo menos 5" abriria.
3. **Diagnóstico:** "Com 6 moedas no caminho, o número chegou a 20. O que faltou na regra da
   moeda?" → fazer a moeda sumir (ela contou várias vezes).
4. **Escolha de teste:** "Para ter certeza de que a meta funciona, quais partidas testar?" →
   uma com menos de 5 e uma com 5 ou mais.

Aula 2: uma pergunta de transferência ("na ilha, a moeda some e soma 1: o que acontece se a
criança voltar ao lugar dela?") e uma com cena.

## 9. Objetivos verificados no jogo (executor)

Os objetivos rodam o jogo e observam o resultado, nas duas dimensões:

| Objetivo | O que o teste faz | Erros que ele pega |
|---|---|---|
| Contar a coleta | Leva o personagem a três moedas | `moedas` igual a 3; as três sumiram; as outras continuam |
| Cada moeda conta uma vez | Passa de novo pelo lugar de uma moeda pega | O número não muda (pega a moeda que não some) |
| Contar só com moeda | Anda pelo caminho sem encostar em moedas | O número não muda (pega a soma no lugar errado, como no quadro) |
| Meta não alcançada | Com três moedas, vai ao baú | Baú fechado, aviso mudou |
| Meta alcançada, com folga | Pega as seis e vai ao baú | Baú aberto (pega "igual a 5") |
| Nova partida | Reinicia | `moedas` volta a 0, moedas voltam, baú fechado |
| O Farol continua | Chave e farol ainda funcionam | Regras do par preservadas |

O nome da variável pode ser outro, como no Jardim: o teste encontra a quantidade pelo
comportamento. Se a navegação não chega a uma moeda, o teste diz que não terminou e orienta a
conferir o movimento, sem acusar a regra.

## 10. Artes

Mesma família visual do Farol 2D e da Ilha no Blender (paleta, contorno limpo, volumes
estilizados, luz do motor):

- **2D (SVG, no estilo dos sprites do Farol):** moeda dourada (com brilho e um leve relevo),
  baú fechado e baú aberto com o tesouro (mesma caixa e ponto de apoio nas duas imagens), ícone
  de moeda para o canto da tela.
- **3D (Blender, com o acabamento da Ilha):** moeda (gira pelo bloco "Girar sem parar", já
  iniciante), baú com o clipe `abrir` (tampa que abre com um brilho do tesouro, pose final
  aberta), ambos na caixa e na origem certas, com a área de toque estável.
- Prévias lado a lado com o Farol e a Ilha, conferidas dentro do jogo, na prévia estreita e na
  ampla, e medidas no executor sem placa de vídeo (a lição do Jardim).

## 11. Entregas depois da aprovação

Fonte das aulas, manifestos das duas aulas, projetos progressivos 2D e 3D (com os arquivos
portáteis), experiência, quiz com cenas, objetivos e cenários de teste no executor (correto e os
erros plausíveis da tabela), roteiros e falas para a voz, caderno em PDF, artes 2D e 3D com as
fontes, README com o procedimento de importação (incluindo criar a `aula-2`). Gravação de vídeo
e voz, ensaio com crianças e publicação ficam com a equipe.

## 12. O que precisa ser aprovado

1. Um curso com duas aulas (2D na `aula-1` reservada, 3D numa `aula-2` criada no Admin), sem
   mudar o currículo do seed.
2. ~~Opção A do §4: bloco novo do Jogo 2D~~. Substituído (29/10/2026): o bloco do grupo já
   existe no iniciante do Jogo 2D e será usado; nenhum bloco novo (§4).
3. O jogo: seis moedas, meta "pelo menos cinco", baú como recompensa opcional, farol e chave
   intactos.
4. A experiência, o quiz e os objetivos como descritos.
