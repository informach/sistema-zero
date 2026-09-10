# Os seus asteroides entram no jogo

Uma aula, organizada em 7 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-07-o-jogo-do-meu-jeito.md`. SHA-256: `8c6a62c7bee3bb50f7fb44aa1422d8bf18ed5744b6962819d43009532f7cfaf6`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu projeto livre usa a nave própria. O recurso asteroide já foi trazido do Pinta e ainda falta trocar a criação dos obstáculos.

**Resultado:** Substituir um recurso mantendo o grupo, as posições e as regras que já fazem o jogo funcionar.

**Ambiente:** ferramentas externas e galeria próprias; voltar a esta aba para continuar. Não incorporar um Estúdio ou Pinta completo nesta aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Seu projeto livre usa a nave própria. O recurso asteroide já foi trazido do Pinta e ainda falta trocar a criação dos obstáculos.

Hoje você vai substituir um recurso mantendo o grupo, as posições e as regras que já fazem o jogo funcionar.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** sequence. **Essencial:** sim

**Título:** Troque sem perder a configuração

Organize a substituição do bloco que cria os asteroides, preservando o sorteio e os campos.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- O bloco antigo ajuda a conferir o novo antes de ser removido.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

O desenho e o comportamento são partes que se conectam. Um asteroide com sua arte pode continuar no mesmo grupo e receber a mesma posição e velocidade. Aqui, preparar o bloco novo antes de apagar o antigo permite reaproveitar o sorteio de x e conferir os campos. Não deixe as duas criações executando juntas ao finalizar, ou a chuva dobra. Cada novo asteroide precisa receber a animação quando nasce.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. preparar a folha do asteroide

**Narração revisada:**

Abra o mesmo jogo no Estúdio. Em Jogo 2D, Animação, prepare folha-asteroide usando a imagem asteroide e quadros 64 por 64. A folha da nave continua como está.

**Na tela (sequência técnica preservada do original):**

abrir o Estúdio pelo menu da esquerda e **clicar no cartão do projeto do jogo da nave**.
Na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**. Arrastar mais um
"Carregar folha de quadros __ da imagem __ com quadros de __ x __ px" para a área Ao iniciar,
encaixando entre o "Animar sprite nave" e o "Criar grupo de sprites tiros". Escrever `folha-asteroide`
no nome da folha, escolher `asteroide` na gradezinha da imagem e **trocar os dois 32 por 64**. Cortar
para a área do jogo e mostrar, sem pressa, que nada
mudou: os asteroides continuam cinzas.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-01: gravar a demonstração "preparar a folha do asteroide" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. trocar o bloco que cria os asteroides

**Narração revisada:**

No relógio A cada 40 quadros, prepare a criação nova antes de apagar a do kit. Use o grupo asteroides, nome asteroide, y menos 30, largura 40, altura 40, vx 0 e vy 3. Transfira o sorteio de x, confira os campos e só então remova a criação antiga.

**Na tela (sequência técnica preservada do original):**

rolar até a área Enquanto estiver rodando e achar o "A cada 40 quadros", ao lado do
"A cada quadro do jogo". Dentro dele, o "Se a tela atual é jogando", e dentro dele o bloco velho do
Kit espaço. Dar zoom nos campos dele para mostrar que não existe campo de imagem. Ir na coluna da
esquerda, **clicar em Jogo 2D e clicar na subcategoria Muitos** e apontar o bloco **"No grupo __
criar um sprite chamado __ ... com imagem __ vx __ vy __"**, percorrendo o rótulo dele até o
**"com imagem"**. Arrastar o novo para dentro do "Se a tela atual é jogando", logo abaixo do bloco
velho. Arrastar a pecinha "um x aleatório na tela" de dentro do bloco velho para o campo x do bloco
novo, e **dar zoom no campo do bloco velho, que fica sem ela**. Preencher os outros campos. Mostrar a área do jogo com asteroides cinzas
nascendo todos no mesmo ponto e asteroides dela caindo espalhados ao mesmo tempo. Só então clicar
com o botão direito no bloco velho e apagar.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-02: gravar a demonstração "trocar o bloco que cria os asteroides" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. fazer os asteroides girarem

**Narração revisada:**

Em Animação, faça o asteroide que acabou de nascer usar girando, do quadro 0 ao 1 a 8 fps, com folha-asteroide. Teste vários nascimentos. Cada objeto novo deve aparecer animado e continuar reagindo aos tiros e à nave.

**Na tela (sequência técnica preservada do original):**

na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**, arrastar outro
"Animar sprite __ com a folha __ na animação __, do quadro __ ao __ a __ fps" para dentro do
"Se a tela atual é jogando", logo abaixo do bloco "No grupo asteroides criar um sprite chamado
asteroide". Escolher `asteroide` na listinha do sprite e `folha-asteroide` na listinha da folha (que
agora tem duas, `folha-nave` e `folha-asteroide`), abrir a listinha da animação e escolher
`girando`, com zoom nos três campos seguintes se preenchendo sozinhos. Clicar na área do jogo,
apertar Enter e jogar por alguns segundos, com zoom na nave e nos asteroides girando. Enquanto a
narração fala do editar desenho, abrir o
menu de três pontinhos, o título Exibição, o item "Imagens", dar um close no "✏️ editar desenho" de
um dos cards **sem clicar nele**, e **fechar a modal no "Fechar"** antes do Fecho.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** aula-07-passo-03: gravar a demonstração "fazer os asteroides girarem" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Confira um único nascimento por disparo do relógio, a queda, a animação, os acertos e as vidas. A nave e os asteroides agora têm sua arte, com as regras do jogo preservadas.

Na Aula 8, você publica essa versão e aprende uma rotina para continuar criando fora dos cursos.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** concluir as verificações de todas as seções e a entrega do fechamento, quando houver. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.

## Verificações para avançar nas seções

O índice permite revisar seções concluídas. A próxima seção abre ao cumprir os critérios da atual. Pistas e novas tentativas não descontam progresso. A entrega do projeto fica no fechamento.

### A criação de hoje

**Checagem:** O que vamos aprender a fazer nesta aula?

**Resposta e explicação:** Substituir um recurso mantendo o grupo, as posições e as regras que já fazem o jogo funcionar.

### Troque sem perder a configuração

Resolver a ordenação ou associação desta descoberta; a resposta é conferida no servidor.

### O que aconteceu?

**Checagem:** Por que retirar a criação antiga depois de conferir a nova?

**Resposta e explicação:** Para não criar dois asteroides em cada disparo do relógio.

### preparar a folha do asteroide

**Checagem:** Qual tamanho de quadro usa folha-asteroide?

**Resposta e explicação:** 64 por 64.

### trocar o bloco que cria os asteroides

**Checagem:** O que preservar ao substituir o bloco do kit?

**Resposta e explicação:** Grupo, sorteio de x e parâmetros do movimento.

### fazer os asteroides girarem

**Checagem:** Quando cada novo asteroide deve receber girando?

**Resposta e explicação:** Quando ele nasce, usando folha-asteroide.

### Teste e guarde sua criação

**Checagem:** Qual resultado confirma a troca completa?

**Resposta e explicação:** Um nascimento por relógio, com queda, animação e colisões funcionando.
