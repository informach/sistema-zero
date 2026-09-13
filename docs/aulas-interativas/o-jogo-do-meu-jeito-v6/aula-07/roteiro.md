# aula-07 — Os seus asteroides entram no jogo

Adaptação do roteiro gravado: Helena narra; Júlio desenha nas aulas 2–5. Uma aula original continua sendo uma aula, agora dividida em seções.

**Ponto de partida:** Mesmo projeto da aula 6, nave animada e arte asteroide já em No projeto.

**Resultado:** Um único criador de asteroides com imagem, dentro do relógio e da condição jogando; cada novo sprite animado, mecânica preservada.

**Escolhas da criança:** Preservar as artes próprias. Na montagem guiada: folha-asteroide, asteroide, grupo asteroides, y −30, 40 × 40, VX 0, VY 3, relógio 40 quadros, animação girando 0–1/8 fps.

## Percurso

| Seção | Formato | Objetivo |
| --- | --- | --- |
| 1. O que vamos criar hoje | presentation | Mesmo projeto da aula 6, nave animada e arte asteroide já em No projeto. |
| 2. Prepare a folha de 64 por 64 | application | Carregar a folha uma vez, mantendo a folha da nave intacta. |
| 3. Observe: uma nave, muitos nascimentos | demonstration | Distinguir relógio do jogo e quadros de animação; situar nascimento e animação de cada asteroide. |
| 4. Troque a peça e aproveite o sorteio | application | Substituir o criador do kit preservando o x aleatório e eliminando a duplicação. |
| 5. Anime cada asteroide que nascer | application | Animar o sprite recém-criado no mesmo ramo e testar a mecânica. |
| 6. Confira e envie sua criação | delivery | Um único criador de asteroides com imagem, dentro do relógio e da condição jogando; cada novo sprite animado, mecânica preservada. |
| 7. Veja o que você aprendeu | closing | Um único criador de asteroides com imagem, dentro do relógio e da condição jogando; cada novo sprite animado, mecânica preservada. |
| 8. Duas ideias para guardar | closing | Aplicar as ideias da aula em duas situações curtas. Pode consultar as pistas e tentar novamente. |

## Abertura — narração revisada

A nave já usa a sua arte. Hoje vamos trocar os asteroides. A nave foi criada uma vez; as pedras nascem ao longo da partida. Por isso vamos preparar a folha no início e animar cada pedra logo depois que ela nascer.

Reutilizar o resultado mostrado na abertura original; substituir sua lista de passos pela orientação acima. O índice da aula mostra a sequência nova.

## Roteiro das seções

### Prepare a folha de 64 por 64

**Por que neste momento:** Consolida a geometria do quadro e a distinção entre preparação e efeito na tela.

**Narração revisada / ponte:** “Abra o mesmo jogo. No Ao iniciar, coloque Carregar folha de quadros depois da animação da nave e antes do grupo tiros. Nome folha-asteroide, imagem asteroide, quadros 64 × 64. As pedras do kit ainda não mudam.”

**Imagem e condução:** Duas folhas nomeadas, tamanhos 32 e 64. Mostrar a área do jogo sem troca automática.

**Fonte para recortar:** roteiro-aula-07-o-jogo-do-meu-jeito.md → Parte 1. Passo 1: preparar a folha do asteroide.

**Entrada:** “Pra começar, abre o seu jogo: menu da esquerda, Estúdio, e clica no cartão do projeto do jogo da nav”

**Saída:** “ do próximo passo. Os asteroides que estão caindo aí ainda são os cinzas. Primeiro passo concluído."”

**Edição:** Manter todos os campos, destacando a troca de ambos os 32 por 64. Não usar tamanho visível 40 como tamanho do quadro.

**Trecho original de referência, antes da edição:** Pra começar, abre o seu jogo: menu da esquerda, Estúdio, e clica no cartão do projeto do jogo da nave. O primeiro passo de hoje é curtinho, e ele é só uma preparação. Vai na coluna da esquerda, clica no Jogo 2D, clica na Animação e pega de novo o Carregar folha de quadros, o mesmo bloco que você usou na aula passada. A gente usa ele uma vez pra cada folha, uma pra nave e uma pro asteroide. Arrasta e encaixa entre o Animar sprite e o Criar grupo de sprites tiros. São quatro campos de novo, e você já sabe como cada um funciona. No nome da folha, clica e escreve folha traço asteroide, pela regra da aula passada: o nome asteroide vai ser de outra coisa daqui a pouco. No campo da imagem, clica e pega o asteroide na gradezinha, que é o seu outro desenho. E agora os dois campos do tamanho do quadro, que dessa vez você mexe: eles vêm com 32, e você clica em cada um e escreve 64. Repara que aqui o número é outro. Na nave era 32, e aqui é 64, porque no Pinta você desenhou o asteroide num quadro maior, no Médio do vetor. Cada folha tem o tamanho que ela tem, e o bloco precisa saber o tamanho certo de cada uma. Agora olha a área do jogo: não mudou nada, e é isso mesmo que era pra acontecer. Esse bloco só deixou a folha do asteroide pronta pra ser usada, e quem vai usar ela é um bloco do próximo passo. Os asteroides que estão caindo aí ainda são os cinzas. Primeiro passo concluído."

**Criança:** pausa o clipe, continua no mesmo projeto do Estúdio Completo e confere o resultado abaixo. O botão abre outra aba; voltar à aba da aula após fazer.

**Conclusão da seção:** pergunta corrigida no servidor. Os critérios de criação abaixo são conferidos pela criança e, na entrega, pelo professor; não são inspeção automática do projeto externo.

**O que observar:**

- Folha-asteroide usa imagem asteroide e quadros 64 × 64 no Ao iniciar.
- Folha-nave continua 32 × 32.

**Ajuda no ponto da dificuldade:** Os dois campos devem ser 64. Esse número vem do Médio do vetor escolhido no Pinta.

**Pergunta:** O asteroide vai aparecer com 40 × 40 no jogo. Qual tamanho colocar na folha?

- 64 × 64, o tamanho original de cada quadro. (correta)
- 40 × 40, copiando o tamanho do sprite.

**Devolutiva:** O recorte da folha e o tamanho de exibição têm funções diferentes.

### Observe: uma nave, muitos nascimentos

**Por que neste momento:** O nome “quadro” reaparece com outro significado e o sprite do grupo existe só depois de ser criado.

**Narração revisada / ponte:** “Este relógio conta atualizações do jogo. Os quadros do Pinta são desenhos da animação. Veja a ordem: quando o relógio dispara durante a partida, nasce uma pedra e logo ela recebe a animação. A folha já foi preparada no início.”

**Imagem e condução:** Três trilhas: Ao iniciar prepara folha; relógio cria pedra A, depois B; cada pedra alterna quadros 0/1. Mesmas cores/rótulos para cada objeto, sem controle do aluno.

**Fonte para recortar:** roteiro-aula-07-o-jogo-do-meu-jeito.md → Parte 2. Passo 2: trocar o bloco que cria os asteroides.

**Entrada:** “Desce até a área Enquanto estiver rodando e acha o A cada 40 quadros, aquele que fica do lado do A c”

**Saída:** “o asteroides criar um asteroide. É ele que faz uma pedra nova nascer lá em cima de tempos em tempos.”

**Edição:** Complementar o recorte com uma linha do tempo; não converter 40 quadros em duração exata em segundos.

**Trecho original de referência, antes da edição:** Desce até a área Enquanto estiver rodando e acha o A cada 40 quadros, aquele que fica do lado do A cada quadro do jogo. O quadro desse nome conta o tempo do jogo, ele não é o desenho da sua animação: são duas coisas diferentes com o mesmo nome. Dentro dele tem o Se a tela atual é jogando, e dentro desse tem um bloco só, o que começa com No grupo asteroides criar um asteroide. É ele que faz uma pedra nova nascer lá em cima de tempos em tempos.

**Criança:** apenas assiste, pausa e revê. Conclusão com 90% do clipe; sem controles de experimento e sem abrir a ferramenta nesta seção.

**O que observar:**

- Preparação ocorre uma vez; criação e animação se repetem para cada novo objeto.
- Quadro do jogo não é desenho da folha.

**Ajuda no ponto da dificuldade:** Pergunte “é o tempo do jogo ou uma imagem da animação?” ao ler a palavra quadro.

### Troque a peça e aproveite o sorteio

**Por que neste momento:** Aqui montar antes preserva a peça conectada em x; o trecho deve terminar com o criador antigo removido.

**Narração revisada / ponte:** “No A cada 40 quadros, dentro de Se a tela atual é jogando, monte No grupo … criar um sprite chamado … com imagem. Escolha asteroides; nome asteroide; mova o x aleatório do velho; y −30; tamanho 40 × 40; imagem asteroide; vx 0; vy 3. Confira e apague só o criador velho.”

**Imagem e condução:** Novo criador no mesmo Se/relógio. Mover a peça x, preencher os nove campos, comparar e usar Apagar este bloco no antigo. O x vazio antigo pode gerar pedras no canto até a retirada.

**Fonte para recortar:** roteiro-aula-07-o-jogo-do-meu-jeito.md → Parte 2. Passo 2: trocar o bloco que cria os asteroides.

**Entrada:** “Olha os campos dele: grupo, x, y, tamanho, cor, vx e vy. Não tem campo de imagem. Nenhum. E isso não”

**Saída:** “ito que você fez na aula passada. Olha a área do jogo de novo: só os seus! Segundo passo concluído."”

**Edição:** Preservar o gesto de mover, não copiar, a peça x. Identificar pelo rótulo com imagem, sem posição de gaveta. Mostrar coexistência como etapa temporária, nunca resultado a entregar.

**Trecho original de referência, antes da edição:** Olha os campos dele: grupo, x, y, tamanho, cor, vx e vy. Não tem campo de imagem. Nenhum. E isso não é erro seu. Esse bloco veio do Kit espaço, o mesmo kit de onde veio aquela nave que você apagou, e ele desenha a pedra cinza dele sozinho. Ele nunca teve onde pôr um desenho. Então a gente troca ele por outro, igual você fez com a nave. Só que aqui a ordem é ao contrário: primeiro monta o novo, depois apaga o velho. É que dentro deste bloco velho tem uma peça que você vai aproveitar, e daqui a pouco você vê qual. Vai na coluna da esquerda, clica no Jogo 2D e clica na subcategoria Muitos. Desce a lista até um bloco comprido que começa com No grupo criar um sprite chamado. O que você quer é o mais comprido de todos: ele começa com No grupo, depois vem criar um sprite chamado, e no fim tem com imagem, vx e vy. É por esse com imagem que você reconhece ele. Arrasta ele pra dentro do Se a tela atual é jogando, logo embaixo do bloco velho. Os dois ficam juntos ali por um tempinho, e é de propósito. Esse bloco tem nove campos, e a gente passa por todos, um de cada vez. Começa pelo grupo, que vem escrito inimigos. Esse é de escolher: clica nele e, na listinha dos grupos do seu jogo, clica no asteroides. Logo em seguida vem o nome do sprite, e esse nasce vazio. Clica nele e escreve asteroide. Ele pode até ficar vazio, mas a gente vai precisar dele no último passo pra mandar nesse asteroide que acabou de nascer. Aí vem o x, e ele é o único que você não digita nem escolhe. Olha o bloco velho: tem uma pecinha encaixada no x dele, escrita um x aleatório na tela, e é ela que faz cada pedra nascer num lugar diferente da tela. Então pega essa pecinha com o mouse, arrasta ela pra fora do bloco velho e solta por cima do campo x do bloco novo. Arrasta, não copia. Se você copiar, fica uma em cada bloco, e a gente quer ela só no novo. Repara que o x do bloco velho ficou sem a pecinha. Ele vai continuar criando pedras, só que todas no mesmo lugar agora. Fica assim mesmo, que ele já vai embora. No campo do y, que vem depois, clica e escreve menos 30, com o sinal de menos na frente. Esse número negativo faz a pedra nascer um pouco acima da tela, pra ela entrar caindo. Os dois seguintes são o tamanho: clica na largura e escreve 40, clica na altura e escreve 40 também. Depois deles vem a imagem, que está escrita inimigo. Esse é de escolher também: clica nele e pega o asteroide na gradezinha. E os dois últimos são o vx e o vy, que são a velocidade. O vx já está em 0, e deixa assim, porque a pedra não anda pros lados. Já no vy você clica e escreve 3, que é a velocidade com que ela desce. Preenchidos os nove, olha a área do jogo. Estão caindo asteroides seus, espalhados. E estão caindo pedras cinzas junto, todas no mesmo ponto, porque os dois blocos estão montados ao mesmo tempo, cada um criando o dele. A gente resolve isso já. E se você reparou que os seus ainda não giram, é isso mesmo: girar é o último passo. Agora sim, apaga o bloco velho. Clica nele com o botão direito e escolhe Apagar este bloco, lendo o texto antes de clicar, do mesmo jeito que você fez na aula passada. Olha a área do jogo de novo: só os seus! Segundo passo concluído."

**Criança:** pausa o clipe, continua no mesmo projeto do Estúdio Completo e confere o resultado abaixo. O botão abre outra aba; voltar à aba da aula após fazer.

**Conclusão da seção:** pergunta corrigida no servidor. Os critérios de criação abaixo são conferidos pela criança e, na entrega, pelo professor; não são inspeção automática do projeto externo.

**O que observar:**

- Um único criador de asteroides ativo ao final, o com imagem.
- Grupo asteroides, nome asteroide, x aleatório conectado nesse criador.
- y −30, largura/altura 40, VX 0, VY 3; dentro de Se jogando no relógio de 40 quadros.

**Ajuda no ponto da dificuldade:** Se saem pedras do kit junto, procure o criador antigo ainda ativo. Se as novas saem todas no mesmo x, confira onde ficou conectada a peça aleatória.

**Pergunta:** Estão caindo pedras suas e pedras cinzas. O que conferir primeiro?

- Se o criador antigo do kit ainda está ativo junto do novo. (correta)
- Se a cor da nave está errada.

**Devolutiva:** Dois criadores podem gerar duas famílias de pedras. Esta substituição termina com apenas o novo.

### Anime cada asteroide que nascer

**Por que neste momento:** O nome asteroide aponta para quem acabou de nascer; colocar a animação no início não alcança os nascimentos futuros.

**Narração revisada / ponte:** “Logo abaixo do novo criador, dentro do mesmo Se jogando e do mesmo relógio, coloque Animar sprite. Escolha asteroide, folha-asteroide e girando. Confira 0 a 1, 8 fps. Inicie e teste: cada pedra nova deve animar, e tiros, pontos e vidas precisam continuar funcionando.”

**Imagem e condução:** Destaque no encaixe imediatamente depois do criador, antes de fechar o Se. Teste com pelo menos três nascimentos; nova partida também funciona.

**Fonte para recortar:** roteiro-aula-07-o-jogo-do-meu-jeito.md → Parte 3. Passo 3: fazer os asteroides girarem.

**Entrada:** “Último passo, e ele é rápido, porque esse bloco você já montou uma vez, na aula passada, pra sua nav”

**Saída:** “as pedras, girando. O jogo é o mesmo do Desafio, com os mesmos blocos, e agora ele é seu de verdade.”

**Edição:** Preservar seletores e teste. Não incluir aqui uma tarefa nova de melhorar as artes. Atualizar “caixa pelos pixels” para explicar caixa delimitadora do conteúdo opaco apenas na revisão do professor.

**Trecho original de referência, antes da edição:** Último passo, e ele é rápido, porque esse bloco você já montou uma vez, na aula passada, pra sua nave. Na coluna da esquerda, clica no Jogo 2D, clica na Animação e pega de novo o bloco comprido que começa com Animar sprite com a folha na animação. Arrasta ele pra dentro do Se a tela atual é jogando, logo embaixo do bloco que você acabou de montar, o que cria o asteroide. Ele fica bem embaixo desse por um motivo: cada vez que um asteroide novo nasce, esse bloco manda ele girar. É pra isso que serve aquele nome que você escreveu no segundo campo do bloco de cima, porque o bloco de animar precisa de um nome pra saber em quem mandar. Agora os campos, e os três são de escolher, igual na aula passada. Clica no primeiro, que é o sprite, e pega o asteroide na listinha. Clica no segundo, que é a folha: hoje tem duas aí dentro, e você pega a folha traço asteroide. E no terceiro clica no Escolher e pega a girando. Os outros três se preencheram sozinhos outra vez, do quadro zero ao quadro um, a oito fps, que são os dois desenhos que você fez da sua pedra rolando e pegando fogo. Agora clica na área do jogo, aperta o Enter e joga um pouco. Essa é a sua nave, com o seu motor! Essas são as suas pedras, girando. O jogo é o mesmo do Desafio, com os mesmos blocos, e agora ele é seu de verdade.

**Criança:** pausa o clipe, continua no mesmo projeto do Estúdio Completo e confere o resultado abaixo. O botão abre outra aba; voltar à aba da aula após fazer.

**Conclusão da seção:** pergunta corrigida no servidor. Os critérios de criação abaixo são conferidos pela criança e, na entrega, pelo professor; não são inspeção automática do projeto externo.

**O que observar:**

- Animar asteroide/folha-asteroide/girando, 0–1, 8 fps depois do criador, no mesmo ramo.
- Três asteroides sucessivos animam.
- Tiro acerta, pontuação/vidas reagem e nova partida reinicia corretamente.

**Ajuda no ponto da dificuldade:** Se a primeira pedra anima e as outras não, confira se Animar sprite está junto de cada criação. Não coloque esse bloco só no Ao iniciar.

**Pergunta:** Por que Animar sprite fica logo depois do criador dentro do relógio?

- Para animar cada asteroide novo depois que ele existe. (correta)
- Para mudar a velocidade de queda de todas as pedras.

**Devolutiva:** A sequência é criar e animar o objeto recém-criado. A queda é controlada por vx e vy.

## Entrega e revisão do professor

Jogue uma partida, perca ou vença, reinicie e confira a nova partida. Envie o mesmo projeto com nave e asteroides usando suas artes.

- Folha-asteroide 64 × 64 preparada no Ao iniciar, com nome distinto do sprite.
- Criador do kit ausente; novo criador único com x aleatório, y −30, 40 × 40, VX 0, VY 3 no relógio de 40 quadros e condição jogando.
- Animar o recém-criado imediatamente depois, mesmo ramo; girando, 0–1, 8 fps.
- Arte nova não altera inadvertidamente controles, estado, placar, vidas, explosão ou reinício.
- Conferir colisão real com a arte enviada: o contorno visual irregular não implica colisão pixel a pixel.

**Configuração obrigatória antes da importação:** primeiro bloco de Estúdio da aula em “Na ferramenta completa, com entrega pela galeria”. Mínimo e máximo: 1 criação. A referência é por tipo e índice 0: conferir que aponta para a entrega, nunca um editor incorporado.

O recebimento é verificado pela plataforma. Qualidade visual, resultado funcional e identidade da criação são revisão do professor. Não aprovar automaticamente uma arte só porque uma pergunta foi respondida. Se a criação enviada for outra, pedir reenvio pelo fluxo existente, com orientação específica.

## Fechamento — narração revisada

Agora a sua nave e os seus asteroides estão no jogo. Você trocou a peça que precisava de imagem e conservou as outras regras. Cada asteroide novo nasce e já começa a animação. Na próxima aula vamos publicar esta versão. Antes, duas perguntas rápidas.

## Quiz final

**O y −30 serve para quê?**

- Começar a pedra um pouco acima da tela antes de ela entrar caindo. (correta)
- Escolher o quadro −30 da animação.

y indica posição; neste jogo o sentido positivo para baixo permite a pedra entrar com vy 3.

**Mudar a arte exige remontar o placar?**

- Não, se mantivermos os grupos, nomes e conexões que a lógica usa. (correta)
- Sim, a imagem sempre apaga os blocos de pontos.

A aparência pode mudar conservando o comportamento. Ainda assim, testar confirma que a troca preservou as referências.

## Ajustes de produção

- Nesta aula montar antes de apagar preserva a peça x; o criador antigo não declara um nome próprio como o Criar nave da aula 6.
- A caixa automática é baseada nos limites do conteúdo opaco; não prometer precisão pixel a pixel em todos os vazios.
- Editar desenho atualiza os projetos vinculados após salvar/sincronizar; não promete atualizar a publicação já feita.
- Manter o caminho editar desenho como orientação de ajuda: Imagens → editar desenho → salvar no Pinta → voltar e conferir atualização. Não iniciar outra tarefa.
- No fecho gravado, atualizar a ordem da aula 8: publicar vem antes de apresentar outras versões.

As falas originais selecionadas são matéria-prima: aplicar cortes e substituições antes de exportar. Não somar a narração antiga inteira à ponte nova. Nenhum timecode foi inventado; marcar entrada e saída assistindo ao arquivo gravado. Textos e títulos devem ter legenda, foco visual único e tamanho legível.

Fonte: roteiro-aula-07-o-jogo-do-meu-jeito.md. SHA-256: 8c6a62c7bee3bb50f7fb44aa1422d8bf18ed5744b6962819d43009532f7cfaf6. Mapa completo: [montagem.json](montagem.json).
