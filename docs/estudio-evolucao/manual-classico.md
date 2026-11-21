# Manual do Estúdio Clássico

Para quem usa o Estúdio com blocos: crianças, famílias e a equipe que conduz as aulas. Vale para os
projetos em **Blocos** e na **Ponte**, em **JavaScript** e em **Python**. Os nomes entre aspas são
os que aparecem na tela. Escrito em 21/11/2026 a partir do código da staging (`packages/studio`);
o Estúdio de produção pode estar numa versão anterior.

O Estúdio Pro (o modo Código, com arquivos e pastas) tem o manual próprio:
[`manual-pro.md`](manual-pro.md).

## 1. Criar um projeto

Na lista "Meus Jogos", o cartão "Novo projeto" pergunta três coisas:

1. "Em que linguagem?": JavaScript ("Blocos que viram JavaScript: jogos 2D, 3D e páginas.") ou
   Python ("Blocos que viram Python: desenhos com a tartaruga e jogos.").
2. "Como você quer criar?": "Com blocos" abre este Estúdio; "Com código" abre o Estúdio Pro.
3. "Ponto de partida": um modelo para começar. "Em branco" é em branco mesmo, sem áreas nem
   extensão.

Também dá para começar de um jogo pronto ("Ver os jogos prontos") ou trazer um arquivo com
"Importar". Tudo é guardado sozinho enquanto você cria.

## 2. A barra de cima

Da esquerda para a direita:

| Peça | Para que serve |
|---|---|
| Botão do menu da plataforma | Aparece só quando a página da plataforma o oferece, e esconde ou mostra o menu lateral dela |
| Seta com "Sistema Zero Studio" | "Voltar à lista de projetos". Abaixo de 1.600 px de largura a marca some e fica só a seta |
| Nome do projeto, com o lápis | Clique para renomear. Enter grava e Esc desiste |
| Selo "Salvo" | Mostra se o projeto está guardado. Muda para "Alterações não salvas" enquanto há mudança a gravar |
| Nuvem | Aparece quando a página guarda o projeto na sua conta e algo está acontecendo (guardando, sem internet, erro), com uma frase curta. Em repouso ela não aparece: a frase da conta fica na dica do selo "Salvo" |
| "Rodar", "Rodar de novo" e "Parar" | No meio da barra. É daqui que o jogo é posto para rodar (seção 3) |
| "Blocos" e "Ponte" | Os modos de edição (seção 4) |
| "Zappy" | Abre e fecha o painel do Zappy, o assistente virtual |
| "Desfazer" e "Refazer" | Seção 9 |
| ⋯ ("Mais opções") | O menu com o resto (seção 5) |
| "Compartilhar" | Publica o jogo no Mural (seção 10). Vira "Atualizar no Mural" quando o jogo já foi publicado |

Em telas menores alguns botões ficam só com o ícone. Abaixo de 720 px de largura, "Desfazer" e
"Refazer" passam para dentro do ⋯. Em telas estreitas a tela vira abas: "Blocos" (e "Código", na Ponte),
"Jogo" e "Mensagens". No celular, "Rodar" vira um botão flutuante.

## 3. Rodar, Rodar de novo e Parar

- **"Rodar"** põe o jogo para rodar no palco. Com o jogo rodando, o mesmo botão vira **"Rodar de
  novo"**, que recomeça do zero. **"Parar"** encerra o jogo.
- Antes de rodar, o Estúdio grava a última mudança e espera a gravação ser confirmada. Se a
  gravação falhar, o jogo não começa e a mudança continua no editor como não salva, para você
  tentar de novo. Se não há nada a gravar, o jogo roda na hora.
- Enquanto você monta, o palco acompanha as mudanças sozinho. Quando o código mudou e o palco ainda
  mostra a versão anterior, aparece "Seu código mudou. Aperte Rodar de novo para ver a nova
  versão."
- **O palco** tem o título "Jogo", "Página" ou "Programa", conforme o projeto, e os botões "Jogo
  maior", "Jogo menor" e "Tela cheia". Parado, ele mostra um cartão com "Aperte Rodar".
- **Quando o jogo para com um erro**, o palco mostra "Opa, o jogo parou" ("Opa, a página parou" ou
  "Opa, o programa parou"), com "O sinal vermelho mostra o bloco onde ele parou.", os botões
  "Mostrar o bloco" e "Ver em Problemas", e "O que o computador disse" com o texto técnico. O bloco
  ganha um sinal vermelho.
- **Quando o jogo trava** (projetos em JavaScript), aparece "O preview parece travado", com "Parar" e
  "Continuar esperando".
  Parar troca a prévia presa por uma nova, e o conserto roda na hora. O editor continua respondendo
  e salvando enquanto o jogo está preso.
- **Laço sem fim** (projetos em JavaScript): um `while` ou `for` que não acaba é cortado em cerca de
  4 segundos, e as Mensagens do jogo dizem "laço interrompido". No Python, o programa roda fora da
  página, num Worker, e o Parar o encerra.
- **Projeto que travou a aba**: na próxima abertura, a prévia não roda sozinha. Ela espera você
  apertar Rodar, para o projeto não prender de novo.

## 4. Os modos

### Blocos

A área de montagem com a paleta ao lado. A paleta tem as categorias da extensão instalada e as de
programação. Duas entradas especiais:

- **"🔎 Pesquisar"**, no alto da paleta: procura um bloco para pôr no programa ("Pesquisar
  blocos…").
- **"Mais blocos"**, no pé da paleta: abre a janela das extensões, onde se escolhe um conjunto de
  blocos ("Pôr no meu jogo" ou "Tirar do jogo").

**As áreas do projeto (JavaScript).** Só roda o que está DENTRO de uma área. Elas ficam na
categoria "🗂️ Áreas do projeto":

| Área | Quando roda |
|---|---|
| "⚙️ Ao iniciar" | Uma vez, no começo |
| "⚡ Quando acontecer" | Espera um acontecimento (uma tecla, um toque, um encontro) |
| "🔁 Enquanto estiver rodando" | Repete sem parar |
| "🧱 Estrutura" e "🎨 Aparência" | A página (HTML) e o estilo (CSS) |
| "🧩 Meus moldes" | As receitas: figuras desenhadas, tipos de inimigo e moldes |

Um bloco solto, fora das áreas, é **rascunho**: continua guardado, ganha um aviso e não roda.

**No Python**, cada arquivo tem a área "Programa", com a ordem em que as coisas rodam. O que fica
fora dela também é rascunho. O cabeçalho "Arquivo e partes do programa" tem o arquivo, "Ir para",
"Programa inteiro", "Procurar uma função ou classe" e "Rascunhos".

**O botão direito.** Num bloco: "Duplicar", "Copiar", "Colar", "Escrever um recado", "Abrir o
bloco" ou "Fechar o bloco", "Desligar o bloco" ou "Ligar o bloco", "Encaixes na mesma linha" ou "Encaixes um
embaixo do outro", "Apagar este bloco" e "Perguntar ao Zappy sobre este bloco" (quando o Zappy está
ligado). No fundo da área: "Organizar blocos" (no Python, o "Arrumar blocos" do próprio editor),
"Fechar todos os blocos", "Abrir todos os blocos" e "Apagar os N blocos". Também dá para apagar
arrastando o bloco para a lixeira ("Solte aqui para apagar").

### Ponte

Os blocos e o código lado a lado, sempre juntos: mexer num muda o outro. Abas do código no
JavaScript: "Página", "Estilo" e "Programa"; no Python, os arquivos `.py`. O botão "Arrumar código"
formata o arquivo aberto.

- Um pedaço de código que ainda não tem bloco igual vira um cartão "Código avançado". Ele continua
  funcionando e pode ser editado no código.
- Enquanto o código tem um erro, os blocos não mudam, e a aba Problemas diz "O código tem um erro de
  digitação" ou "Este código não cabe nas áreas dos blocos".
- Clicar numa linha do código leva ao bloco dela.

O modo "Código" sozinho é do Estúdio Pro. Para levar um projeto de blocos para lá, use "Virar
profissional" (seção 5).

## 5. O menu ⋯ ("Mais opções")

Os itens se agrupam pelo assunto. Um item só aparece quando a página e o projeto permitem; nas
aulas, por exemplo, alguns ficam de fora.

| Grupo | Item | O que faz |
|---|---|---|
| "Editar" | "Desfazer" e "Refazer" | Só abaixo de 720 px de largura; acima disso eles ficam na barra |
| "O meu jogo" | "Salvar" | Grava agora, sem esperar o automático |
| | "Trazer o que eu enviei" | Só nas aulas que oferecem: "troca o que está aqui pela versão que você enviou" |
| | "Mais blocos" | Abre a janela das extensões (Jogo 2D, Jogo 3D, Turtle, Pygame Zero e outras) |
| | "Virar profissional" | "troca os blocos por um projeto de código, sem volta". Antes de converter, o Estúdio guarda uma cópia completa do jogo em Blocos na lista de projetos |
| "Materiais" | "Imagens", "Sons" e "Modelos 3D" | Abrem a janela "Materiais do jogo" na aba certa (seção 8). "Modelos 3D" aparece quando o projeto usa 3D, já tem um arquivo 3D ou a página oferece o Molda |
| "Mostrar" | "Mostrar o jogo" | Esconde e mostra o palco ao lado dos blocos |
| | "Mensagens do jogo" | Abre e fecha essa aba da gaveta ("Mensagens do programa" no Python) |
| "Levar o jogo" | "Baixar o projeto" | "um arquivo para abrir este mesmo projeto no Estúdio Completo" (`.szproject.json`) |
| | "Baixar o código" | "um .zip com o código, para abrir no computador" |
| | "Baixar para publicar" | "um .zip pronto para pôr no ar" |
| "Estúdio" | "Mudar tema" | Claro ou escuro, quando a página não fixa o tema |
| | "Meus projetos" | Volta à lista |

## 6. Procurar no programa

Só nos projetos em JavaScript. Nos projetos grandes, com **300 blocos ou mais**, aparece o botão **"Procurar no programa"** no
canto de cima da área de blocos. O atalho Ctrl+F, com a área de blocos em foco, faz o mesmo. Nos
jogos das aulas, que são menores, o botão não aparece.

- Escreva no campo "Procurar nos blocos do programa". A busca acha o texto que você lê no bloco
  (rótulos e campos), sem ligar para acentos, e mostra até 30 resultados com o total ("Os primeiros
  30 de 120 blocos", por exemplo).
- Cada resultado diz em que área o bloco está, ou "Fora das áreas". Enter passa para o próximo.
- Escolher um resultado usa o "Mostrar o bloco": o Estúdio rola até ele e o põe no centro, mesmo
  que ele estivesse longe e ainda sem desenho.
- "Fechar a busca" devolve o foco ao botão.

Não confunda com o "🔎 Pesquisar" da paleta: aquele procura um bloco novo para pôr no programa;
este procura um bloco que já está no programa.

## 7. A gaveta de baixo

A gaveta fica sempre à vista, fechada só com as abas e os números. Clique numa aba para abrir;
clique de novo para fechar, ou use "Abrir a gaveta" e "Fechar a gaveta". No celular ela é a aba
"Mensagens".

| Aba | O que mostra |
|---|---|
| "Mensagens do jogo" ("Mensagens do programa" no Python) | O que o programa escreve com `console.log` ou `print`. Os erros moram em Problemas. No Python, quando a página permite, há também um campo para testar uma linha de Python ("Testar") |
| "Problemas" | O erro que parou o jogo, o código da Ponte que não vira blocos, os avisos dos blocos e os rascunhos ("1 pedaço está fora das áreas e não roda.", com "Mostrar o primeiro"). Sem nada: "Nenhum problema por aqui. Pode rodar!" |
| "Investigar" | Pausar o jogo, andar um quadro por vez e ver os valores |
| "Desempenho" | Ver se o jogo está rodando liso |
| "Meus testes" | Testes que você escreve para conferir o jogo |

As três últimas só ligam o que precisam quando você as abre, e fechar a gaveta desliga a medida e a
investigação. Abrir "Investigar o jogo" ou "Medir o desempenho" recomeça o jogo.

### Investigar

Aperte **"Investigar o jogo"** ("Investigar o programa" no Python). Com o jogo rodando:

- **"Pausar"** para o jogo na troca de quadro. Pausado, aparecem **"Continuar"** e **"Avançar 1
  quadro"**, que anda exatamente um quadro e pausa de novo.
- **"Valores agora"** mostra as variáveis do jogo e a posição de cada sprite. O que mudou desde o
  quadro anterior ganha a marca "mudou". "Mostrar o bloco" leva ao bloco onde a variável nasce.
- Quando o jogo para com um erro, **"O caminho até o erro"** mostra por quais linhas o jogo passou,
  cada uma ligada ao bloco dela, e os valores daquele momento. "Perguntar ao Zappy" leva a pergunta
  ao assistente.
- "Parar de investigar" volta ao normal.

O que cada tipo de projeto permite está na tabela do fim desta seção. Os valores servem para
entender o jogo, nunca para dar nota.

### Desempenho

Aperte **"Medir o desempenho"**. Os números chegam em meio segundo e são refeitos a cada meio
segundo:

- "Quadros por segundo" (o jogo pede 60; abaixo de 30 ele parece travado);
- "Tempo de cada quadro" (para ficar liso, cada quadro cabe em 16 ms);
- "Coisas no jogo" (sprites desenhados no último quadro), nos jogos 2D; "Objetos na cena" e
  "Desenhos por quadro", nos jogos 3D;
- "Memória do jogo", que fica "indisponível": o navegador não mostra a memória de um jogo.

Cada número leva a marca "medido" ou "indisponível". As barras mostram os últimos segundos (cada
barra é meio segundo), com quantas vezes o jogo ficou lento e quanto levou o quadro mais lento. Uma
página sem jogo diz "Esta página não tem quadros de jogo para medir." Um programa Python que não
desenha na tela mostra o "Tempo do programa". "Parar de medir" encerra.

### Meus testes

Um teste aperta as teclas do jogo e confere, no fim, se aconteceu o que você queria. O jogo roda
escondido, do zero, sem mexer no projeto; os testes ficam guardados no projeto.

1. Aperte **"+ Novo teste"** e dê um "Nome do teste".
2. Em **"Quando eu"**, monte os passos: "Apertar a tecla", "Segurar a tecla" (até 5 segundos),
   "Esperar" (até 10 segundos) ou, nos jogos com o Jogo 2D, "Clicar no sprite" de um grupo. "+ Mais
   um passo" acrescenta outro.
3. Em **"No fim, confira"**, escolha o que conferir: "a variável", "a posição x do sprite", "a
   posição y do sprite", "o texto na tela" ou "as mensagens do jogo", depois "Como comparar" (é
   igual a, é maior que, mudou, aumentou, tem o texto…) e o "Valor para comparar".
4. "Salvar teste". Depois, **"Rodar os testes"**.

O resultado diz, por exemplo, "2 de 3 testes passaram.", e cada teste aparece como "Passou: …" ou
"Não passou: …", com "Ver como o jogo terminou" (a foto do fim) e "Editar". Para tirar um teste:
"Editar" e depois "Apagar teste". Limites: até 20 testes por projeto e até 15 segundos por teste.

No Python, o teste novo pergunta "O que testar": **"Testar o programa"** (os mesmos passos, com
"a variável", a posição x ou y e "as mensagens do programa") ou **"Testar uma função"**: escolha
uma função `def` de um arquivo `.py` e escreva os casos, um por linha, como no Python (`2, 3 -> 5`),
até 8 casos.

### O que cada tipo de projeto tem

Pela proposta aprovada em 20/11/2026 ([`paineis-proposta.md`](paineis-proposta.md)):

| Tipo de projeto | Investigar | Desempenho | Meus testes |
|---|---|---|---|
| Jogo 2D e Jogo 2D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, sprites | no navegador, num palco escondido |
| Jogo 3D, Mundo 3D e Jogo 3D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, objetos e desenhos por quadro | no navegador, num palco escondido |
| Página de HTML e CSS | Valores agora e caminho até o erro | a aba diz que a página não tem quadros para medir | o texto da página e as mensagens |
| Python com Turtle, Pygame Zero, pygame-ce ou Raylib | Pausar e Avançar na troca de quadro, Valores agora, caminho até o erro | quadros por segundo e tempo de cada quadro | testar o programa e testar uma função |
| Python sem biblioteca de jogo | caminho até o erro e os valores quando o programa termina | o tempo que o programa levou | testar uma função |

Fora desta versão: parar no meio de um bloco, trocar um valor com o jogo pausado e a memória do
jogo. Quando um tipo de jogo ainda não pausa pelo Estúdio, a aba diz isso e segue mostrando os
valores.

## 8. Materiais: imagens, sons e modelos 3D

O menu ⋯, grupo "Materiais", abre a janela **"Materiais do jogo"**, com as abas "Imagens", "Sons" e
"Modelos 3D". As três portas abrem a mesma janela, cada uma na sua aba; apertar de novo a porta da
aba aberta fecha a janela.

- **"Enviar do computador"** traz um arquivo do seu computador.
- **"Trazer do Pinta"** traz um desenho da sua galeria do Pinta (personagem, cenário, peças ou
  mapa); **"Trazer do Molda"** traz um modelo, uma textura ou um céu; **"Trazer da equipe"** traz as
  artes da sua equipe nas missões. Cada botão aparece quando a página o oferece.
- **"⭐ Usar como capa"** faz da imagem a capa do jogo na lista. "Voltar para a foto automática"
  desfaz.
- Nas aulas, o desenho que você fez no Pinta da aula aparece com o selo "Seu desenho da aula". Para
  mudar, desenhe de novo lá e envie: ele volta sozinho.
- Nos blocos, use o NOME do material: é por ele que o bloco acha a imagem, o som ou o modelo.

## 9. Desfazer e refazer

Os círculos "Desfazer" e "Refazer" da barra (ou Ctrl+Z e Ctrl+Y) agem no editor certo:

- no modo **Blocos**, nos blocos;
- na **Ponte**, no último editor que você tocou: nos blocos até você tocar no código. A dica do
  botão diz onde ("Desfazer nos blocos (Ctrl+Z)" ou "Desfazer no código (Ctrl+Z)").

Sem nada a desfazer, o botão fica desligado. No código, cada clique desfaz um grupo de digitação,
como o Ctrl+Z. Quando a Ponte refaz os blocos a partir do código, o desfazer dos blocos recomeça.

## 10. Compartilhar no Mural

**"Compartilhar"** abre "Compartilhar no Mural dos Criadores". Publicar põe o jogo no Mural para a
comunidade ver e cria um link de jogar para mostrar à família e aos amigos.

1. **"Título"** do jogo. Em algumas aulas ele já vem definido.
2. **"Resumo do projeto"**: conte rapidinho o que o jogo faz. Onde a página oferece, um botão do
   Zappy escreve um rascunho ("Escrever com ajuda do Zappy" ou "Gerar resumo com o Zappy"), que você
   muda como quiser.
3. **"Capa do projeto"**: "Gerar capa" tira uma foto do jogo; "Enviar uma imagem" usa uma imagem
   sua; "Usar a capa da aventura" usa a capa padrão, quando existe.
4. **"Publicar"**. O botão só liga com o título, o resumo e a capa preenchidos.

Depois aparecem "Ver no Mural", "Abrir o jogo" e "Copiar link de jogar". Se o jogo já está no
Mural, o botão vira **"Atualizar no Mural"**: troca o jogo do mesmo link pela versão de agora, e o
post continua com os comentários ("Manter a capa de agora" guarda a capa). "Publicar como jogo
novo", em "Outras formas de publicar", cria outro post, quando a página permite.

Em algumas páginas o botão aparece desligado, com a explicação ao passar o mouse ou tocar nele.

## 11. Baixar o jogo

O grupo "Levar o jogo" do ⋯ tem três saídas. As três baixam um arquivo; nenhuma publica sozinha.

- **"Baixar o projeto"**: o projeto inteiro num `.szproject.json`, para abrir em outro Estúdio com
  "Importar". É o jeito de levar o projeto de uma aula para o Estúdio Completo.
- **"Baixar o código"**: um ZIP com `index.html`, `style.css`, `script.js`, `sz-ext/` (os motores
  das extensões), `sz-assets.js` (as imagens e sons) e um `LEIA-ME.txt`. Para ver o jogo no
  computador, abra a pasta com um servidor local, por exemplo a extensão "Live Server" do VSCode ou
  `npx serve`; abrir o `index.html` com dois cliques pode não carregar tudo. No Python, o ZIP leva
  os arquivos `.py` e os materiais.
- **"Baixar para publicar"**: abre "Exportar para publicação", com "Minificar o código
  (recomendado)", e baixa um ZIP pronto para um servidor (com `Dockerfile` e `railway.json`).

Detalhes em [`exportacao.md`](exportacao.md).

## 12. Quando aparece "Não deu para abrir estes blocos"

Só nos projetos em JavaScript. Na área de blocos aparece o recado:

> Não deu para abrir estes blocos. Nada foi perdido: o projeto continua como estava. O editor de
> blocos não conseguiu mostrar este programa, o que acontece, por exemplo, com uma sequência de
> blocos longa demais. Continue pelo código, no modo Ponte.

**O que fazer:**

1. Não se preocupe: o projeto está inteiro. Enquanto o recado aparece, o Estúdio não grava os
   blocos, justamente para não guardar um programa pela metade.
2. A área de blocos fica só de leitura, coberta pelo recado. Não tente arrastar blocos para ela.
3. Vá para o modo **Ponte** e continue pelo código. O jogo roda normalmente.
4. Onde o projeto não tem a Ponte (algumas aulas só com Blocos), o recado diz "Peça ajuda a um
   adulto para continuar." Nesse caso, a equipe pode baixar o projeto ("Baixar o projeto") para
   guardar uma cópia e abrir num Estúdio com a Ponte.

**Por que acontece.** O caso conhecido é uma sequência única de milhares de blocos, um embaixo do
outro, no mesmo corpo: o editor de blocos (Blockly 12) não consegue desenhar uma corrente tão longa.
Os jogos organizados em eventos e áreas abrem normalmente, mesmo com 10 mil blocos. A mesma
proteção vale para qualquer falha ao abrir os blocos. Mais em
[`classico-em-escala.md`](classico-em-escala.md), seção "Conserto B".

## 13. Projetos grandes

Nos projetos em JavaScript, a partir de 1.500 blocos, o Estúdio desenha só a parte do programa que está perto da tela. O resto
continua no projeto, com todos os blocos, e é desenhado quando você chega perto, usa "Mostrar o
bloco", desfaz ou refaz. Nada muda no código gerado nem no que é guardado. Nos jogos das aulas, que
têm de 70 a 80 blocos, isso nunca entra em ação.

Um limite visível: ao arrastar uma pilha muito longa que leva a parte ainda não desenhada, ela não
encaixa por baixo em outro bloco durante esse arrasto.

## 14. O Zappy no Estúdio Clássico

O botão "Zappy" abre o painel do assistente virtual. No Kids, o topo do painel avisa: "O Zappy é um
assistente virtual, não uma pessoa da equipe." Pelo botão direito num bloco, "Perguntar ao Zappy
sobre este bloco" leva a pergunta junto com o bloco.

Com a aba "Investigar" ou "Desempenho" ligada, uma pergunta ao Zappy leva junto os valores e os
números que a aba está mostrando naquele momento, e o Zappy é orientado a usar só esses dados, sem
inventar valores ou medidas. Ele não liga nenhuma aba sozinho e não observa o jogo enquanto você não
pergunta ([`zappy-e-as-abas.md`](zappy-e-as-abas.md)).

## 15. As aulas continuam iguais

Os cursos **Cadê Todo Mundo?** e **Desafio do Primeiro Jogo: A Chave do Farol** foram gravados com
este Estúdio. Os blocos, os textos, as cores, os campos, os caminhos na paleta (por exemplo,
`Jogo 2D → Movimento → Movimentos prontos`), as áreas e os botões que eles ensinam não mudaram.
As abas novas da gaveta e a busca no programa foram acrescentadas sem tirar nada do que a criança
encontra nos vídeos. A prova é a matriz e os testes descritos em [`README.md`](README.md) e
[`homologacao-a-h.md`](homologacao-a-h.md).

## Para a equipe: de onde vêm os nomes deste manual

- Textos da barra, do menu, da gaveta e das mensagens: `packages/studio/src/core/i18n/shared/pt-BR.ts`
  e `packages/studio/src/core/i18n/pro/pt-BR.ts`.
- Grupos e ordem do menu ⋯: `packages/studio/src/components/layout/topbar/menuLayout.ts`.
- Investigar, Desempenho e Meus testes: `packages/studio/src/components/devtools/`
  (`investigateCopy.ts`, `performanceCopy.ts`, `studentTestsCopy.ts`).
- Procurar no programa: `packages/studio/src/components/blocks/WorkspaceSearch.tsx`; limites em
  `packages/studio/src/blockly/offscreenThreshold.ts` (300 para a busca, 1.500 para o desenho sob
  demanda).
- Botão direito: `packages/studio/src/blockly/contextMenuWords.ts` e `blockly/setup.ts`.
- Salvar antes de rodar: [`salvar-e-executar.md`](salvar-e-executar.md).
