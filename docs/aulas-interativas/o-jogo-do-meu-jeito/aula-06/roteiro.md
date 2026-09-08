# A sua nave entra no jogo

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-06-o-jogo-do-meu-jeito.md`. SHA-256: `9ad05f5ccb2dab008f1b093e66a0b75b003a3f4d193754813bb5d2b8571114e8`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Você tem nave/voando de 32 × 32 e asteroide/girando de 64 × 64 no Pinta. O projeto livre ainda usa o Kit espaço.

**Resultado:** Usar a imagem e a folha de animação próprias mantendo o nome e o comportamento da nave.

**Ambiente:** ferramentas externas e galeria próprias; voltar a esta aba para continuar. Não incorporar um Estúdio ou Pinta completo nesta aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Você tem nave/voando de 32 × 32 e asteroide/girando de 64 × 64 no Pinta. O projeto livre ainda usa o Kit espaço.

Hoje você vai usar a imagem e a folha de animação próprias mantendo o nome e o comportamento da nave.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** sequence. **Essencial:** sim

**Título:** Tamanho do desenho ou tamanho no jogo?

Relacione cada configuração com sua função antes de trocar os blocos.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- A folha recorta a imagem original; o sprite decide quanto espaço ela ocupa no jogo.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

Uma imagem importada fica disponível como recurso; um sprite usa esse recurso no jogo. O nome nave continua ligando os controles e os outros blocos ao personagem. A folha de animação precisa saber o tamanho de cada quadro da arte: 32 × 32. Isso é diferente do tamanho do sprite na tela, que será 54 × 54. Os quadros 0 e 1 são as duas imagens, porque a contagem da folha começa em zero.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. trazer os seus desenhos para dentro do projeto

**Narração revisada:**

Abra Estúdio pelo menu e entre no cartão do jogo importado, não no projeto de teste. Use a área de recursos para trazer nave e asteroide do Pinta. Confira os nomes antes de trocar os blocos.

**Na tela (sequência técnica preservada do original):**

no menu da esquerda, clicar em Estúdio. Na tela "Meus Jogos", **clicar no cartão** do
projeto do jogo da nave. Na barra de cima, abrir o menu de três pontinhos, apontar o título Exibição
e clicar em "Imagens". Mostrar a modal "Imagens e sons": a fileira de botões em cima, a seção
"No projeto" com a frase de lista vazia e, mais embaixo, a seção "Biblioteca". Clicar em
"🎨 Trazer do Pinta". Mostrar a modal "Trazer do
Pinta" com a frase de ajuda e os cards dos desenhos dela. Clicar no card `nave`, no botão "Adicionar
ao projeto", e mostrar ele virar o selo "✓ no projeto". Repetir no card `asteroide`. **Fechar a
modal do Trazer do Pinta pelo "Fechar" do rodapé**, mostrar os dois desenhos dentro da seção
"No projeto" e **fechar também a modal "Imagens e sons" pelo "Fechar" do rodapé dela**. Só com as
duas janelas fechadas, cortar para a área do jogo, ainda igual.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-01: gravar a demonstração "trazer os seus desenhos para dentro do projeto" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. apagar a nave do kit e montar a sua

**Narração revisada:**

Em Ao iniciar, remova somente Criar nave do kit, preservando a pilha. Em Jogo 2D, Sprites, crie o sprite nave com imagem nave: x 400, y 410, largura 54 e altura 54. O nome nave mantém a ligação com os controles.

**Na tela (sequência técnica preservada do original):**

na área Ao iniciar, apontar o **segundo bloco da pilha**, o "Criar nave", logo abaixo
do "Preparar o jogo em tela cheia". Dar zoom nos campos dele, mostrando que ali só tem cor do corpo
e cor das asas. **Clicar nele com o botão direito**, mostrar o menu com "Apagar este bloco" e
clicar. Mostrar a pilha se religando sozinha, com o "Criar grupo de sprites tiros" subindo para
debaixo do "Preparar o jogo". Panorâmica pelos bloquinhos que ficaram **com o sinal de aviso**, e
**abrir um deles** para ler a frase. Cortar para a área do jogo, ainda com a nave cinza voando.
Voltar e, na coluna da esquerda, **clicar na categoria Jogo 2D** e **clicar na subcategoria
Sprites**. Dar zoom no bloco **"Criar sprite ... em x ... y ... largura ... altura ... com
imagem"**, percorrendo o rótulo dele da esquerda para a direita até o **"com imagem"** do fim.
Arrastar **ele** para a área Ao iniciar, encaixando
**entre o "Preparar o jogo em tela cheia" e o "Criar grupo de sprites tiros"**. Preencher os campos
da esquerda para a direita, **cortando para a área do jogo a cada campo**: digitar `nave` (os avisos
somem e um quadradinho azul-claro aparece perto do canto de cima), `400`, `410`, `54`, `54`, e por
fim **clicar no campo da imagem e mostrar a gradezinha com os dois desenhos do projeto**, escolhendo
`nave`. Zoom na área do jogo: duas naves espremidas dentro do sprite. Em seguida, mostrar lado a
lado o desenho no Pinta com os dois quadros dela, para a criança ver de onde vieram as duas.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-02: gravar a demonstração "apagar a nave do kit e montar a sua" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. carregar a folha e animar a nave

**Narração revisada:**

Em Jogo 2D, Animação, carregue folha-nave da imagem nave com quadros 32 por 32. Configure a animação voando do quadro 0 ao 1 a 8 fps. Teste o fogo, as setas, os tiros e as colisões no mesmo jogo.

**Na tela (sequência técnica preservada do original):**

na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**. Arrastar
"Carregar folha de quadros __ da imagem __ com quadros de __ x __ px" para a área Ao iniciar,
encaixando entre o "Criar sprite nave" e o "Criar grupo de sprites tiros". Escrever `folha-nave` no
primeiro campo, escolher `nave` na gradezinha do campo da imagem e **dar zoom nos dois campos de px
já em 32, sem digitar neles**. Em seguida arrastar "Animar sprite __ com a folha __ na animação __, do quadro __ ao __ a __
fps" para logo abaixo dele, ainda acima do "Criar grupo de sprites tiros". Escolher `nave` na
listinha do sprite e `folha-nave` na listinha da folha. Abrir a listinha da
animação com zoom, escolher `voando`, e dar zoom nos três campos seguintes se preenchendo sozinhos.
Terminar com zoom na área do jogo, com a nave dela e o motor acendendo.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-06-passo-03: gravar a demonstração "carregar a folha e animar a nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

A nave tem sua arte e o fogo animado; movimento, tiros, vidas e telas continuam funcionando. Confira o salvamento do mesmo projeto livre.

Na Aula 7, você troca também os asteroides, preservando a chuva e as colisões.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
