# A sua nave entra no jogo

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-06-o-jogo-do-meu-jeito.md`. SHA-256: `9ad05f5ccb2dab008f1b093e66a0b75b003a3f4d193754813bb5d2b8571114e8`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Você tem nave/voando de 32 × 32 e asteroide/girando de 64 × 64 no Pinta. O projeto livre ainda usa o Kit espaço.

**Resultado:** Usar a imagem e a folha de animação próprias mantendo o nome e o comportamento da nave.

**Ambiente:** ferramentas externas e galeria próprias; voltar a esta aba para continuar. Não incorporar um Estúdio ou Pinta completo nesta aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Tamanho do desenho ou tamanho no jogo? | Resolver a descoberta. |
| Sua nave entra no jogo | Responder uma pergunta de decisão. |
| Veja seu fogo voando | Responder uma pergunta de decisão. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Tamanho do desenho ou tamanho no jogo?

**Intenção e objetivo (professor):** Exploração · Usar a imagem e a folha de animação próprias mantendo o nome e o comportamento da nave.

**Texto para o aluno:**

Oi! Chegou a hora de pilotar a nave que você desenhou. Vamos trocar a arte e manter os controles do seu jogo.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Tamanho do desenho ou tamanho no jogo?**

Modelo: `sequence`. Critério desta seção.

Relacione cada configuração com sua função antes de trocar os blocos.

**Peças:** 54 × 54 · 32 × 32 · 0 até 1

**Gabarito para o professor:**

- Tamanho de cada quadro da folha da nave: 32 × 32
- Tamanho da nave desenhada no jogo: 54 × 54
- Intervalo dos dois quadros da animação: 0 até 1

**Pistas:**

- A folha recorta a imagem original; o sprite decide quanto espaço ela ocupa no jogo.

**Texto para o aluno:**

Uma imagem importada fica disponível como recurso; um sprite usa esse recurso no jogo. O nome nave continua ligando os controles e os outros blocos ao personagem.

A folha de animação precisa saber o tamanho de cada quadro da arte: 32 × 32. Isso é diferente do tamanho do sprite na tela, que será 54 × 54.

Os quadros 0 e 1 são as duas imagens, porque a contagem da folha começa em zero.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Sua nave entra no jogo

**Intenção e objetivo (professor):** Aplicação · Substituir a arte preservando a identidade usada pelos controles.

**Ferramenta externa:** Estúdio livre. Orientar a alternância de abas e o retorno à aula. O sistema não verifica automaticamente essa criação externa.

**Narração revisada / instruções disponíveis em texto:**

### Trazer os seus desenhos para dentro do projeto

Abra Estúdio pelo menu e entre no cartão do jogo importado, não no projeto de teste. Use a área de recursos para trazer nave e asteroide do Pinta.

Confira os nomes antes de trocar os blocos.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

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

**Produção:** aula-06-passo-01: gravar a demonstração "trazer os seus desenhos para dentro do projeto" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Apagar a nave do kit e montar a sua

Em Ao iniciar, remova somente Criar nave do kit, preservando a pilha. Em Jogo 2D, Sprites, crie o sprite nave com imagem nave: x 400, y 410, largura 54 e altura 54.

O nome nave mantém a ligação com os controles.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

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

**Produção:** aula-06-passo-02: gravar a demonstração "apagar a nave do kit e montar a sua" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Abra o projeto importado. Depois da troca, teste as setas antes de mexer na animação.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A nave nova apareceu, mas os controles procuram outro nome. O que conferir?

- Se o sprite continua com o nome nave.
- Se o título do jogo tem a palavra nave.
- Se a folha tem uma cor diferente.

**Resposta esperada (professor):** Se o sprite continua com o nome nave.

**Devolutiva:** O nome nave liga o sprite aos controles e às outras regras. Trocar a imagem não exige mudar essa ligação.

**Pistas:**

- Os blocos de controle precisam encontrar o mesmo personagem.

**Critério configurado:** `checar-construir-2`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Veja seu fogo voando

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. A pergunta verifica compreensão, sem avaliar automaticamente o trabalho externo.

**Ferramenta externa:** Estúdio livre. Orientar a alternância de abas e o retorno à aula. O sistema não verifica automaticamente essa criação externa.

**Narração revisada / instruções disponíveis em texto:**

### Carregar a folha e animar a nave

Em Jogo 2D, Animação, carregue folha-nave da imagem nave com quadros 32 por 32. Configure a animação voando do quadro 0 ao 1 a 8 fps.

Teste o fogo, as setas, os tiros e as colisões no mesmo jogo.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**. Arrastar
"Carregar folha de quadros __ da imagem __ com quadros de __ x __ px" para a área Ao iniciar,
encaixando entre o "Criar sprite nave" e o "Criar grupo de sprites tiros". Escrever `folha-nave` no
primeiro campo, escolher `nave` na gradezinha do campo da imagem e **dar zoom nos dois campos de px
já em 32, sem digitar neles**. Em seguida arrastar "Animar sprite __ com a folha __ na animação __, do quadro __ ao __ a __
fps" para logo abaixo dele, ainda acima do "Criar grupo de sprites tiros". Escolher `nave` na
listinha do sprite e `folha-nave` na listinha da folha. Abrir a listinha da
animação com zoom, escolher `voando`, e dar zoom nos três campos seguintes se preenchendo sozinhos.
Terminar com zoom na área do jogo, com a nave dela e o motor acendendo.

**Produção:** aula-06-passo-03: gravar a demonstração "carregar a folha e animar a nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

A nave tem sua arte e o fogo animado; movimento, tiros, vidas e telas continuam funcionando. Confira o salvamento do mesmo projeto livre.

Na Aula 7, você troca também os asteroides, preservando a chuva e as colisões.

Depois de conferir o salvamento, volte a esta aba para a pergunta final. Na próxima aula você continua o trabalho guardado na ferramenta.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A animação ficou recortada. Qual tamanho conferir na folha da nave?

- 800 × 480, porque é o tamanho da tela.
- 32 × 32 por quadro, o tamanho da arte.
- 54 × 54, porque é o tamanho do sprite no jogo.

**Resposta esperada (professor):** 32 × 32 por quadro, o tamanho da arte.

**Devolutiva:** Cada quadro da arte mede 32 × 32. O sprite pode aparecer com 54 × 54 sem mudar esse recorte. Teste também controles e tiros.

**Pistas:**

- A folha recorta o desenho original; o sprite muda o tamanho em que ele aparece.

**Critério configurado:** `checar-fechamento`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## Cadastro e validação em staging

1. Abra a aula correspondente no admin de staging. Importe `manifesto.json` no rascunho com **Vincular ao destino aberto** e confira a prévia. Preserve a configuração do Estúdio existente e sua cadeia, quando houver.

2. Confira o quadro de critérios de cada seção. Os nomes acima correspondem ao manifesto. Cada vídeo mantém a chave original: reimportar preserva mídias já vinculadas. Vincule e confira os vídeos planejados pelo uploader Vimeo.

3. Se uma versão anterior deste pacote já foi importada, retire do rascunho os cartões antigos listados abaixo. O importador preserva blocos omitidos e pode levá-los ao fechamento; omitir uma chave no arquivo não apaga o cartão antigo. Confira quizzes e entregas existentes separadamente para manter apenas as exigências intencionais.

4. Use a prévia para revisar apresentação e continuidade. Para testar bloqueios, publique apenas em staging e entre com um perfil de aluno de teste sem conclusão anterior. A prévia navega livremente e marcos concluídos são preservados.

5. Tente uma resposta incorreta ou um projeto sem o requisito, confira o bloqueio e depois cumpra o critério. Verifique liberação, retorno, recarga e continuidade para a próxima aula. Em uma etapa com vários objetivos, cumprir só um não deve liberar.

**Cartões antigos a retirar após reimportação:**

- `checar-comeco`: Confira: A criação de hoje
- `checar-entenda`: Confira: O que aconteceu?
- `checar-construir-1`: Confira: trazer os seus desenhos para dentro do projeto
- `checar-construir-3`: Confira: carregar a folha e animar a nave

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
