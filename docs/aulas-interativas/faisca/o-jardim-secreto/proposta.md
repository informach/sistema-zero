# O Jardim Secreto: proposta da missão do Faísca

28/10/2026 · Proposta revisada para aprovação, segunda revisão. Este documento define a autoria; não declara curso implementado, mídia produzida ou publicação realizada. [Achados e correções das revisões](revisao-proposta.md) · [Direção de arte e critérios de qualidade](direcao-de-arte.md).

## 1. Recomendação e fundamento

Criar **um curso com duas aulas**, uma em 2D e outra em 3D, chamado **O Jardim Secreto**. O personagem recolhe um regador ao encostar nele e faz uma flor florescer quando encosta nela depois da coleta. Sem o regador, a flor permanece fechada e o jogo orienta a procurar o objeto. Reiniciar restaura a partida.

O título, a mecânica, as duas dimensões e o número de aulas já estão no currículo aprovado. A proposta detalha como transformar esse planejamento em uma missão compreensível, realizável e capaz de mostrar transferência de aprendizagem. A direção mais recente do usuário exige reaplicar **os conhecimentos das experiências e dos blocos que a criança completou nos cursos-base**. Por isso, esta revisão também devolve à criança o movimento nas duas dimensões, o limite da tela 2D e a edição de posição.

O resumo antigo do currículo dizia que os controles da missão viriam prontos. Nesta proposta, permanece pronta apenas a infraestrutura que a criança não programou: os comandos de controle e movimento que ela montou voltam a ser tarefa sua. Essa diferença está registrada para reconciliar a descrição do curso antes da publicação, sem alterar silenciosamente o outline histórico nem recriar as aulas do seed.

A promessa do Faísca é **“Eu faço o jogo lembrar e decidir.”** O que muda na missão é a responsabilidade por escolher e combinar regras conhecidas. Não é hora de adicionar inventário, pontuação, tempo, receitas ou várias condições. O jardim deve ser um jogo pequeno que a pessoa consiga compreender inteiro.

Fontes conferidas:

- [Jornada do Criador](../../../jornada-do-criador.md): sequência, abertura da missão, Poderes e promoção.
- [Currículo editorial, posto Faísca](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json): promessa, missão, preparação, critérios e exclusões.
- [Seed e preservação das identidades](../../../jornada-criador-seed.md) e [planejador do seed](../../../../packages/members/src/application/creator-journey/creator-journey-seed.ts): um curso de missão, duas aulas preservadas, públicos Kids/adulto.
- [Projeção da jornada](../../../../packages/core/src/journey/creator-curriculum.ts): conclusão do par, missão e um Poder distinto aplicado.
- [A Chave do Farol](../desafio-primeiro-jogo/README.md) e [A Ilha do Farol](../a-ilha-do-farol/README.md): repertório efetivamente autorado, montagem, projetos, quiz e critérios.
- [Diretrizes pedagógicas](../../../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md), [descoberta guiada](../../../aulas-interativas-tecnico/DESCOBERTA-GUIADA.md), [roteiro](../../../aulas-interativas-tecnico/ESPEC-ROTEIRO.md) e [voz](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md): clareza, exploração, instruções completas quando oferecidas, padrão visual e produção.

Os documentos de autoria são a fonte desta proposta. Não houve consulta ao estado de publicação do Admin nem ensaio com crianças nesta tarefa.

## 2. O papel de uma missão na jornada

| Frente | Finalidade | Como isso aparece no Faísca |
| --- | --- | --- |
| Cursos da trilha | Ensinar e construir com orientação completa | Os dois Faróis ensinam coleta, memória, decisão e sua representação espacial |
| Missão | Aplicar o mesmo raciocínio em outro contexto | O regador e a flor substituem chave e farol; a pessoa decide como programar a relação |
| Poderes | Aprender uma mecânica adicional e aplicá-la ao jogo-base | Contagem, duas informações combinadas, tempo ou sequência |
| Extras | Explorar outra criação ou ferramenta | Cadê Todo Mundo e Pinta, sem obrigação para concluir a missão |

A missão abre depois dos dois cursos da trilha, junto dos Poderes e extras. Pode ser feita antes de escolher um Poder. Concluir o Jardim não promove sozinho: a promoção também depende de um Poder distinto aprendido e aplicado. A comunicação final deve mostrar o próximo requisito real da jornada, inclusive quando esse Poder já estiver concluído.

A leitura das sete missões confirma o mesmo princípio: mudar contexto e representação mantendo a lógica aprendida. A Estação de Reciclagem reaplica colisão e estados da Nave; o Entregador reaplica pulo e ritmo do Dino; as missões posteriores retomam seleção, funções/fases, ondas e gestão conforme o repertório de cada posto. O aumento de dificuldade vem das competências daquele posto. Em todas, a infraestrutura preparada isola o raciocínio avaliado, a ajuda trata a dificuldade concreta e um Poder escolhido não vira pré-requisito oculto. No Faísca, isso pede a menor versão completa dessa estrutura: um item, uma informação e uma decisão.

Cadê Todo Mundo é extra, portanto não podemos pressupor a contagem ensinada ali. Também não podemos depender do Pinta, da modelagem de uma peça ou do assistente de IA/Pensa: essas ferramentas e percursos não são pré-requisitos desta missão. O Zappy aqui oferece orientação editorial preparada, sem exigir geração por IA.

Não há certificado próprio, prazo para terminar, nota por rapidez, obrigação de publicação no Mural ou dívida adicional de projeto autoral. Pedir ajuda não reduz a conquista.

## 3. O que a criança já sabe e o que realmente precisa demonstrar

| Conhecimento dos Faróis | Aplicação no Jardim | Evidência esperada |
| --- | --- | --- |
| Quadros, entrada e movimento | Programar controles e movimento em 2D; movimento em 3D | Personagem anda enquanto há entrada, para ao soltar e continua respondendo nos quadros seguintes |
| Limite e ordem das ações no 2D | Completar a regra que mantém o personagem na tela | Percorrer as quatro bordas sem sair e poder voltar para dentro |
| Evento e reação | Recolher o regador no encontro | O objeto permanece até o contato e some apenas quando recolhido |
| Uma informação verdadeira ou falsa | Guardar que está com o regador | A coleta continua valendo depois que a pessoa se afasta do lugar |
| Se / senão | Escolher a resposta no encontro com a flor | Antes da coleta, aviso; depois, florescimento |
| Valor inicial da memória | Criar a informação da coleta começando em falso | Uma partida nova começa sem coleta; usar o reinício pronto permite repetir essa observação |
| Posição 2D e chão x/z no 3D | Escolher outro lugar alcançável para o regador | O jogo continua funcionando sem depender de uma coordenada do exemplo |
| Altura e contato em 3D | Recolher um regador que realmente está ao alcance | Estar perto na imagem não substitui o contato no espaço |
| Animação do modelo 3D | Tocar o clipe da flor no momento correto | Reaplicar a operação conhecida no farol, com um nome de clipe adequado |

Não basta ver um jogo terminado: ele pode ter sido copiado sem compreensão. A proposta combina funcionamento, variação de posição e perguntas causais curtas. Mesmo assim, verificação automática não comprova autonomia absoluta nem permite inferir quem ajudou em casa. O ensaio pedagógico deve observar previsões e explicações, além da entrega.

### Matriz de rastreabilidade: o que foi aprendido e o que será exigido

| Origem verificável no curso-base | O que foi aprendido ou montado | Exigência no Jardim |
| --- | --- | --- |
| Chave, Dia 1, partes 3–4: quadros e Faça o personagem andar | Relação entre tecla, comando e repetição; ativar controles e encaixar movimento no quadro existente | Montar esses comandos no 2D; testar andar e parar, sem programar o motor de quadros |
| Chave, Dia 1, partes 5–6: limite e Mantenha o personagem na tela | Movimento seguido de correção do limite | Completar o limite 2D e testar as bordas |
| Chave, Dia 2, partes 1–3: memória, coleta e informação guardada | Evento de encontro, retirar o sprite, criar falso e alterar para verdadeiro | Recolher o regador 2D, criar e atualizar a memória; não trocar a retirada ensinada por uma API inédita |
| Chave, Dia 2, parte 4, e Dia 3, partes 2–3 | Alterar aviso; construir Se/senão; trocar a imagem no sucesso | Mensagem de coleta, resposta sem regador, flor aberta e mensagem de sucesso |
| Chave, Dia 3, partes 6–7: experiência e edição de posição | X/Y no plano; editar a posição de um elemento | Escolher outro lugar alcançável para o regador 2D e retestar |
| Ilha, Aula 1: experiência de ponto de vista | Uma mudança de vista não muda o lugar do objeto | Reconhecer essa diferença no quiz 3D, sem programar câmera |
| Ilha, Aula 1: Faça o personagem andar | Encaixar Andar com WASD/setas no quadro existente | Acrescentar o movimento 3D e testar andar/parar; áreas permitidas continuam prontas |
| Ilha, Aula 2: posição e contato | X/Z no chão, Y na altura; lugar visível pode estar fora de alcance | Editar posição no chão, conseguir recolher e interpretar a situação de altura no quiz |
| Ilha, Aula 2: coleta, memória e aviso | Encontro direto; esconder o modelo; criar/alterar memória e aviso | Construir essas ações no jardim 3D |
| Ilha, Aula 3: resposta sem chave e acender o farol | Se/senão e tocar um clipe do modelo uma vez | Decidir entre aviso e florescimento; acionar o clipe preparado e avisar o sucesso |

Conferência feita nos [roteiros 2D](../desafio-primeiro-jogo/README.md), na [fonte das aulas 3D](../../../aulas-interativas-tecnico/qa/ilha-do-farol-conteudo.ts) e nos projetos progressivos das duas bases. Reaplicar o conhecimento não exige duplicar cada variável ou linha do Farol: a informação de coleta, os avisos e a decisão reaplicam as operações ensinadas, sem reproduzir a chegada do barco ou sua infraestrutura.

**Fora da cobrança:** criar sprites/modelos, desenhar o cenário, preparar o laço de renderização, construir câmera, iluminação, áreas de caminhada 3D, animações de andar, clipes da flor, carregamento de artes e mecanismo de reinício. Esses elementos não foram montados pela criança nos percursos-base. A equipe os fornece e valida. Quebrá-los no projeto inicial é defeito da preparação, não dificuldade que a missão pede à criança resolver.

## 4. Três abordagens consideradas

| Abordagem | Vantagem | Limitação |
| --- | --- | --- |
| Repetir um curso com vídeo montando tudo | Menor dificuldade operacional | A pessoa pode apenas reproduzir a sequência; a missão pouco acrescenta aos Faróis |
| Dar uma tela em branco e apenas o objetivo final | Grande liberdade | Mistura memória de interface, arte, câmera e programação; dificulta descobrir onde houve dúvida |
| **Cenário pronto, objetivos de comportamento e ajuda em camadas** | Mantém a tarefa possível e permite escolher as regras | Exige cuidado com os critérios e com a qualidade da ajuda |

Recomendo a terceira. A missão deve ter pouca infraestrutura para montar, uma regra central visível e liberdade para escolher a ordem de trabalho. A ajuda pode chegar ao passo a passo completo, mas ele não ocupa o vídeo principal nem é uma etapa obrigatória para todos.

Esta é uma adaptação proposta para **missões** da regra de montagem integral dos cursos da trilha. Não altera retroativamente os roteiros dos Faróis. Quando a pessoa abrir uma explicação de montagem, ela deve continuar completa: destino visível, paleta, nome do bloco, encaixe, campo, valor, teste e correção. Autonomia não justifica uma instrução incompleta.

## 5. Jogo, cena e escolhas

### Situação apresentada

“A flor do jardim está fechada. Programe seu jogo para o personagem recolher o regador e fazer a flor florescer quando chegar até ela. Se ele chegar sem o regador, o jogo deve avisar o que está faltando.”

O encontro com a flor executa a ação. Não acrescentar uma tecla para regar, um botão de usar item ou uma medida de água: seriam regras novas. O regador não é consumido; a informação permanece até o reinício. A flor fica aberta depois do sucesso. Encostar novamente não reinicia a partida nem precisa gerar uma nova recompensa.

Na linguagem da missão, **estar com o regador** significa que o jogo lembra da coleta: ele sai do chão e não precisa aparecer na mão do personagem. Não acrescentar inventário nem animação de carregar. **Florescer** significa o botão da flor abrir e revelar suas pétalas, com crescimento visual perceptível. Isso atende à flor que cresce prevista no currículo sem introduzir regas sucessivas. O nome Jardim Secreto descreve o lugar acolhedor entre plantas; não anuncia uma porta, um labirinto ou uma busca de objetos escondidos.

Ao terminar a reação, a flor fica aberta enquanto a pessoa continua andando. Um novo encontro pode repetir o efeito de florescer; isso não reprova a missão nem exige outra variável para impedir a repetição. O clipe 3D deve terminar aberto e conservar a pose final. Não presumir que toda chamada futura de animação será ignorada pelo motor. Reiniciar a partida deixa o personagem sem a coleta, o regador disponível no chão e a flor fechada, conservando o programa.

### Composição visual

Jardim pequeno, um personagem, um regador, uma flor e elementos decorativos de fundo. A flor fechada e a aberta devem ser claramente diferentes em forma, além de cor. O regador precisa ser reconhecível, com tamanho e contraste suficientes na prévia estreita. Caminho simples e largo, com acesso à flor sem passar obrigatoriamente pelo regador. Essa alternativa é essencial para testar o caso sem o objeto.

Na versão 3D, manter os mesmos personagens, formas e cores principais da versão 2D. Conservar a composição relativa dos elementos na entrada: personagem, regador e flor ocupam lugares reconhecíveis. A profundidade já é a mudança a compreender; a variação de posição escolhida pela pessoa vem depois. Câmera fixa e enquadramento responsivo; nenhuma modelagem ou operação de câmera é necessária para jogar. Nada importante fica escondido pela decoração. O chão 3D usa x/z; y continua sendo altura.

As artes devem ter **a mesma qualidade e o mesmo estilo visual dos cursos-base**, com Cadê Todo Mundo como referência complementar de jardim, vegetação, flores e pedras. Os personagens e o movimento seguem os Faróis; não transformar os bichos estáticos do Cadê em jogadores sem preparar animação e leitura equivalentes. Não copiar a vista lateral do Cadê para um jogo que exige deslocamento no plano. A composição e a produção estão detalhadas na [direção de arte](direcao-de-arte.md), que faz parte dos critérios de aprovação.

### O que vem preparado

- Artes com medidas e contatos coerentes; cenário, personagem, regador e flor já identificados.
- Criação dos elementos, câmera, iluminação, quadro de renderização, apresentação de avisos e reinício; no 3D, áreas de caminhada e animações de andar/parar.
- No 2D, ficam ausentes os comandos de ativar controles, mover e limitar à tela. No 3D, fica ausente o comando de andar que a criança aprendeu a encaixar. Os quadros que recebem esses comandos já existem, como nos cursos-base.
- Imagens de flor fechada/aberta em 2D; modelo 3D inicialmente fechado com clipe simples `florescer`, tocado uma vez e mantido no estado final.
- Paleta básica de Programação e Jogo 2D ou Jogo 3D, com os comandos já estudados. Efeitos de som são opcionais; não pedir programação de som nem usá-la como critério da missão.
- Regador disponível e flor fechada no início. Indicação das teclas e interface de controle visíveis; os comandos ensinados que fazem o personagem responder ficam por montar.

O projeto de entrada não contém os eventos de coleta e de decisão já resolvidos, nem uma função pronta que faça essa lógica pelo aluno. A memória da coleta é criada pela pessoa; `temRegador` pode aparecer na ajuda como sugestão de nome. A estrutura pronta também deve usar somente blocos básicos, como foi corrigido na Ilha.

Esse limite vale para entrada, referência jogável, ajuda, solução de teste e projeto entregue: Programação básica com Jogo 2D ou Jogo 3D. Sem blocos de HTML, CSS, Canvas, código cru, listas ou objetos de Programação. Arquivos internos produzidos pelo motor para executar as extensões não são blocos do projeto nem conteúdo exigido da pessoa.

A área de avisos pode trazer uma variável simples com o convite inicial, mas não pode consultar uma variável de coleta que ainda não existe. As partes prontas desenham a cena; não movimentam o personagem por uma regra oculta, nem abrem a flor, retiram o regador ou escolhem respostas. O reinício recria o programa desde o começo: quem define o valor inicial da memória da coleta é a pessoa. Regador e flor não começam sobrepostos ao personagem nem entre si.

**Reiniciar a partida conserva os blocos e a posição escolhida.** Não confundir essa ação com restaurar o projeto inicial do Estúdio. A ajuda deve apontar o comando de partida efetivamente disponível em cada versão; a equipe prepara e testa esse comando antes de escrever seu rótulo ou atalho no roteiro. Restaurar o projeto não faz parte dos testes pedidos.

### Liberdade com propósito

A pessoa pode testar quantas vezes quiser, programar as regras em outra ordem e continuar explorando depois dos objetivos. Pode escolher entre artes compatíveis fornecidas, mensagens compreensíveis e posições alcançáveis. **Escolher outro lugar para o regador e retestar faz parte das duas aulas**: reaplica a posição ensinada em 2D e 3D e a variação prevista no currículo. A posição escolhida é livre e deve preservar o acesso à flor sem coleta obrigatória. Não existe posição exata de gabarito.

Personalização visual é opcional e não exige desenhar no Pinta ou modelar no Molda. Para mudar a posição no chão, alterar x **ou** y no 2D, e x **ou** z no 3D, basta; não exigir mexer em ambos nem variar altura. Se o regador ficar alto ou inacessível, explicar o problema e permitir corrigir, sem apagar o restante do projeto. Comparar a posição declarada na preparação com a entrada original da aula; mover o personagem ou um efeito da partida não conta como edição. Não exigir extremos ou uma distância mínima arbitrária para comprovar a escolha.

Para ensinar a relação entre edição e resultado, testar **a nova versão desde o começo da partida** depois da mudança de posição. Se a prévia já reiniciou ao aplicar a edição, essa nova partida serve; caso contrário, usar o reinício fornecido. Não pedir uma nova coleta de um objeto que já saiu da partida anterior nem interpretar a edição como um encontro. Reabrir a aula conserva o projeto editado; a comparação de posição continua usando a entrada original versionada, não o último salvamento. A mudança obrigatória de lugar é aplicação do conceito espacial, distinta das escolhas opcionais de aparência.

## 6. Estrutura das duas aulas

Um módulo, **Faça o jardim florescer**. Planejar vídeos principais breves e ajuda sob demanda. A duração de cada aula depende da montagem, da exploração e das ajudas consultadas; estimá-la depois de um ensaio com iniciantes, sem impor limite de tempo.

### Aula 1: A flor espera por você — 2D

**Conceito central:** combinar movimento, encontro, memória e decisão para resolver a nova missão. **Entrega:** jardim 2D com movimento e limite programados, regador em uma posição escolhida e resposta correta da flor com e sem coleta.

| Parte | Experiência da pessoa | Papel da orientação |
| --- | --- | --- |
| 1. Conheça sua missão | Vê a cena e uma demonstração curta das duas situações, sem blocos | Explicar a tarefa e o que significa conseguir regar; não montar a solução no vídeo |
| 2. Seu material de apoio | Encontra o Passo a passo do projeto e links relevantes dos Faróis | Consulta opcional, no mesmo padrão visual dos outros cursos |
| 3. Faça o personagem andar | Completa controles e movimento no Estúdio | Retomar tecla, comando e quadros; testar andar e parar |
| 4. Mantenha o personagem na tela | Completa o limite e testa as bordas | Retomar a ordem entre movimento e limite |
| 5. Recolha o regador | Constrói encontro, retirada, aviso e informação da coleta | Distinguir o objeto que saiu da cena da informação que será consultada |
| 6. Faça a flor responder | Constrói a decisão, a mudança visual e os avisos | Testar com e sem coleta; completar a verificação da memória |
| 7. Escolha outro lugar e teste | Edita a posição do regador e testa os dois caminhos em nova partida | Reaplicar posição sem cobrar um valor-modelo |
| 8. Entregue seu jardim | Verifica o programa e envia a versão atual | Ensinar o fluxo de verificação e envio com os rótulos reais |

Na abertura, há uma **referência jogável concluída** separada do projeto da criança: ela pode experimentar a flor com e sem regador, sem acesso aos blocos da solução por essa atividade. O vídeo mostra o propósito e passa a vez. A referência não substitui o projeto inicial incompleto nem concede os objetivos de construção. A parte do material usa diálogo e consulta opcional; baixar, ler ou imprimir não é requisito para avançar.

O mesmo projeto continua das partes 3 a 8. Não criar uma cópia nova nem substituir o trabalho por uma solução ao avançar. Todas as regras permanecem editáveis nesse Estúdio; a ordem das partes organiza a orientação, não impede construir outra regra antes de chegar à parte que a comenta. A revisão dos objetivos pode acontecer durante a montagem; há **um envio no fim da aula**. A separação em partes reduz a quantidade de tarefas apresentadas de uma vez; não acrescenta conceitos, experiências ou vídeos de montagem obrigatórios.

Objetivos apresentados no Estúdio:

1. “Faça o personagem andar nas quatro direções e parar quando você soltar a tecla.”
2. “Mantenha o personagem dentro da tela, mesmo quando ele chega à borda.”
3. “Recolha o regador no encontro e mostre um aviso da coleta.”
4. “Faça o jogo lembrar se o personagem já pegou o regador. No começo da partida, ele ainda não pegou.”
5. “Se o personagem encostar na flor antes de pegar o regador, mantenha a flor fechada e avise o que falta.”
6. “Depois da coleta, faça a flor abrir quando o personagem encostar nela e mostre que deu certo.”
7. “Escolha outro lugar alcançável para o regador e confira se as regras continuam funcionando.”

Não pedir um envio por objetivo nem uma sequência obrigatória de cliques. A lista descreve o resultado esperado do programa. Os detalhes de teste ficam disponíveis perto de cada objetivo.

Essa é a lista integral para a autoria e a revisão final. Durante a montagem, mostrar o recorte da parte: objetivo 1 na parte 3; 2 na parte 4; 3 na parte 5; 4–6 na parte 6; 7 na parte 7. Conferir também os resultados anteriores para detectar regressões, sem apresentar uma tarefa futura como erro. A memória começa a ser construída na coleta, mas sua evidência completa vem quando a flor a consulta. A parte de coleta não pode exigir essa resposta futura para permitir continuar. Na entrega, todos os objetivos são conferidos na versão atual; uma falha posterior deve apontar a regra afetada, sem apagar o projeto ou a conclusão das partes já visitadas.

O mecanismo de reinício pronto **não é um objetivo de programação**. Ele serve para conferir o valor inicial da memória que a criança criou e repetir os testes. Como memória e decisão se comprovam juntas durante a partida, uma coleta que apenas retira o regador não basta para aprovar a memória. Enquanto faltar a regra da flor, a interface deve indicar que ainda falta completar o teste, sem inventar um diagnóstico. Uma ordem sugerida é mover e limitar → recolher e guardar → decidir → escolher posição e testar; a montagem continua livre dentro do projeto.

### Aula 2: O jardim ganha profundidade — 3D

**Conceito central:** a relação coleta → memória → decisão se conserva quando a representação espacial muda. **Entrega:** jardim 3D completo, com regador em outro lugar alcançável e teste dos dois casos.

| Parte | Experiência da pessoa | Papel da orientação |
| --- | --- | --- |
| 1. A mesma missão em outro espaço | Reconhece a tarefa em uma referência jogável 3D concluída | Lembrança breve: x/z no chão, y na altura; o sentido da regra não mudou |
| 2. Faça o personagem andar | Completa o movimento no quadro existente | Retomar o comando da Ilha e testar andar/parar |
| 3. Recolha o regador | Constrói encontro, ocultação, memória e aviso | Usar a operação de coleta já ensinada no 3D |
| 4. Faça a flor responder | Completa a decisão, os avisos e o acionamento do clipe | Testar as duas respostas e a memória da coleta |
| 5. Escolha outro lugar e teste | Move o regador para outra posição alcançável e refaz as verificações em nova partida | Aplicar x/z no chão e manter a altura ao alcance |
| 6. Revise suas descobertas | Responde quatro perguntas de revisão | Memória, escolha de teste, ponto de vista e altura; correção e nova tentativa |
| 7. Entregue sua missão | Confere a versão final e envia o 3D | Reconhecer as duas criações e mostrar a próxima possibilidade real da jornada |

A aula usa um novo projeto 3D. O trabalho 2D permanece disponível, sem ser sobrescrito. A conversão automática de um jogo no outro não é a evidência pedida: a pessoa precisa aplicar as regras aos elementos do novo cenário. A aula pode lembrar um trecho do 2D, mas não importar silenciosamente a solução completa.

A segunda aula reaplica os objetivos 1 e 3–7 da primeira: andar/parar, coleta e aviso, memória, duas respostas da flor e posição escolhida. **Não repetir o objetivo de montar limites em 3D:** as áreas de caminhada vieram prontas na Ilha. Testar se o movimento respeita essas áreas é verificação da preparação e do comando integrado, sem pedir à criança que programe ou explique seus números. A posição inicial deve ser comparada ao projeto de entrada daquela pessoa, preservado pela aula.

Usar rótulos completos dos objetivos no 3D, sem mostrar uma lista com o número 2 faltando. O recorte por parte segue a mesma lógica da aula 1: movimento; coleta; memória e decisão; posição; conjunto completo na entrega. A ajuda permanece acessível nessa aula, com link ao material único da missão e retorno ao mesmo projeto.

### Roteiro de testes que a pessoa pode consultar

| Teste | Ação no próprio jogo | O que observar |
| --- | --- | --- |
| Andar e parar | Pressione e solte cada direção; no 2D, caminhe até as bordas e volte | O personagem responde enquanto a tecla está pressionada, para ao soltar e permanece na tela 2D |
| Antes da coleta | Inicie uma partida e vá à flor sem encostar no regador | A flor continua fechada e o aviso indica o que falta |
| Depois da coleta | Recolha o regador, afaste-se do lugar dele e vá à flor | O regador saiu do chão; a flor abre no encontro e há aviso de sucesso |
| Outra partida | Reinicie a partida conservando os blocos e vá novamente à flor sem recolher | O regador está disponível e a flor continua fechada |
| Outro lugar | Mude a posição do regador, inicie uma partida e repita os dois caminhos | A coleta e a resposta da flor continuam funcionando no lugar escolhido |

Esses testes orientam a investigação e podem ser repetidos. Não viram uma lista adicional de cliques a registrar: os objetivos do projeto já representam os resultados exigidos. Na abertura de uma nova partida, o regador deve estar na cena; quem começa sem tê-lo recolhido é o personagem.

## 7. Experiências e ajuda: onde faz sentido interagir

**Não proponho repetir as experiências de quadros, memória, condição, eixos ou contato.** Esses conceitos já foram investigados nos cursos da trilha. Uma nova sequência com outro desenho ocuparia tempo e poderia entregar a resposta da missão antes de a pessoa tentar.

A principal atividade interativa passa a ser **programar e investigar o próprio jogo**. As pequenas demonstrações do quiz ajudam a observar a causa, sem se tornarem um segundo curso de conceitos.

### Ajuda em camadas

| Camada | Exemplo para a memória | Como fica disponível |
| --- | --- | --- |
| Lembrar o resultado | “O regador saiu do chão. Agora teste se a flor reconhece a coleta quando você chega até ela.” | Orientação curta, ligada à dificuldade observada ou escolhida pela pessoa |
| Lembrar a ideia | “No Farol, uma informação guardava que você estava com a chave. O jardim também precisa lembrar da coleta.” | Material de ajuda que a pessoa escolhe abrir |
| Rever a montagem completa | Mostrar a criação da informação inicial e a mudança no encontro, com todos os gestos | Ajuda específica do Jardim no material da missão; trecho do curso-base como complemento |

As três camadas ficam acessíveis desde o início. Não exigir erro, espera, número de tentativas ou consumo de pistas para liberar ajuda. Não conceder pontos por recusar apoio. Consultar o Farol deve preservar o jardim e oferecer retorno claro à parte de origem.

Na primeira produção, a ajuda completa será **específica do Jardim**, separada por dificuldade e por dimensão, no material de apoio da própria missão. Ela usa os nomes e as artes que a pessoa está vendo. Links para os Faróis são complemento: não obrigar a criança a traduzir sozinha chave/farol para regador/flor nem depender de sair da missão para descobrir um gesto indispensável. O vídeo principal continua sem resolver os encaixes; quem escolhe a ajuda recebe a montagem integral.

Se a plataforma ainda não tiver navegação direta para a parte de recuperação, usar o material de apoio com instrução completa e destino verificável. Não escrever um link fictício ou prometer que o projeto será restaurado sem testar esse fluxo. A implementação pode começar com os recursos atuais de diálogo, materiais e feedback dos objetivos; um painel novo de pistas só será necessário se a navegação existente não sustentar essa consulta.

### Exemplos de falas do Zappy

- Entrada: “Sua missão é fazer a flor abrir só depois que o personagem pegar o regador. Você pode começar pela regra que quiser.”
- Depois de uma coleta sem memória comprovada: “O regador sumiu quando o personagem encostou nele. Agora afaste o personagem e vá até a flor para testar se a coleta continua valendo.”
- Flor abrindo cedo: “Nesta partida, a flor abriu antes de o regador ser recolhido. Confira o que o jogo pergunta quando o personagem chega até ela.”
- Objeto fora de alcance em 2D: “O personagem não conseguiu chegar ao regador. Confira o lugar dele e deixe um caminho livre.”
- Objeto fora de alcance em 3D: “O personagem não conseguiu chegar ao regador. Confira o lugar e a altura dele e teste de novo.”
- Depois de ajustar: “Comece uma partida com a mudança que você fez. Primeiro vá à flor sem pegar o regador; depois recolha o regador e volte.”
- Conquista: “Você usou a mesma ideia para fazer dois jardins lembrarem da coleta e responderem na hora certa.”

Uma fala que descreve um teste só pode aparecer quando o sistema observou esse resultado. Sem evidência, formular como sugestão de teste. Não fingir acompanhar ações que a plataforma não registra.

Botões de ação seguem o padrão já aprovado: ação sugerida na cor principal do tema, demais ações com aparência de botão secundário e alvo de toque claro. Alternativas de pergunta são visualmente equivalentes antes da escolha. Não reintroduzir **Conferir** nas experiências; **Verificar projeto** continua sendo a verificação real do Estúdio.

## 8. Quiz final proposto

Uma seção própria, **diálogo do Zappy → quiz**, sem vídeo ou Estúdio dentro dela. Quatro perguntas, revisão formativa com explicação e novas tentativas; proposta de exigir todas corrigidas para concluir, como nos cursos curtos atuais. Nenhuma pergunta sobre menu, nome de bloco ou escolha de Poder. As opções abaixo estão em ordem editorial, não definem posição fixa do gabarito.

### 1. O regador saiu do chão

Cena 2D: o encontro tem somente a reação de retirar o regador, com o mesmo comando usado na coleta do Farol 2D. Um cartão mostra a informação guardada, “Pegou o regador? Não”, que permanece igual após esse encontro. A regra da flor está explícita: com a informação Sim, florescer; com Não, pedir o regador. O personagem ainda não chegou à flor.

**Pergunta:** “Quando o personagem chegar à flor, o que esse jogo vai fazer?”

- Abrir a flor porque o desenho do regador sumiu.
- Manter a flor fechada e pedir o regador. **Correta.**
- Fazer o regador aparecer de novo no chão.

**Explicação correta:** “Isso mesmo! O desenho sumiu, mas a informação continua dizendo que o regador não foi pego. A flor consulta essa informação.”

**Retorno à primeira alternativa:** “Tirar o regador da cena não muda a informação guardada. Ela ainda está em Não, por isso a flor pede o regador.”

**Retorno à terceira alternativa:** “A regra mostrada não manda o regador voltar. Ela consulta a informação guardada para escolher a resposta da flor.”

Depois da escolha, **Ver o que acontece** mostra a ida à flor e o aviso. Só depois da correção, uma comparação opcional mostra o mesmo encontro também atualizando a informação. As regras visíveis retiram a ambiguidade: um aviso sozinho poderia resultar de falta de memória, condição invertida ou resposta errada, e não permitiria um diagnóstico único.

### 2. O jogo funcionou uma vez. Falta testar o quê?

Cena: a pessoa recolheu o regador e abriu a flor.

**Pergunta:** “Qual teste ajuda a conferir a outra resposta da flor?”

- Iniciar outra partida e ir direto à flor sem pegar o regador. **Correta.**
- Afastar-se e voltar à flor na mesma partida, ainda com o regador.
- Iniciar outra partida, pegar o regador e voltar à flor.

**Explicação correta:** “Você acertou! Assim dá para conferir se a flor continua fechada quando o personagem chega sem o regador.”

**Retorno ao erro:** “O caminho com regador já funcionou. Falta testar o que acontece sem ele.”

Não precisa de animação: a tarefa é escolher um teste, e o enunciado já mostra a partida concluída.

### 3. A vista mudou. O regador também?

Cena 3D independente do projeto da criança: personagem parado e regador no chão, parcialmente encoberto por uma pedra decorativa. O chão tem referências visuais fixas. Um indicador mostra que somente a câmera vai mudar de lugar; ninguém anda, nenhum objeto é editado e não há coleta. A demonstração gira até uma vista em que o regador fica visível.

**Pergunta:** “Vamos olhar o jardim por outro lado. O que acontece com o lugar do regador?”

- Ele muda de lugar no chão junto com a câmera.
- Ele vai até o personagem quando fica visível.
- Ele continua no mesmo lugar do jardim. **Correta.**

**Explicação correta:** “Isso mesmo! Mudou o lugar de onde olhamos. O regador continua no mesmo ponto do chão.”

**Retorno à primeira alternativa:** “O regador aparece em outro ponto da imagem, mas continua junto da mesma marca no chão. Foi a vista que mudou.”

**Retorno à segunda alternativa:** “Conseguir ver o regador não faz o personagem pegá-lo. Ele ainda precisa andar até lá e encostar.”

**Ver o que acontece** muda só a câmera e conserva referências no chão para comparar. A demonstração não altera o projeto da pessoa. A edição de posição continua sendo avaliada na construção das duas versões; esta pergunta cobre diretamente o ponto de vista que faltava no quiz.

### 4. Parecia que o personagem estava encostando

Cena 3D: a coleta já funcionou com o regador no chão. Só sua altura foi alterada; as regras continuam iguais. Vistos de frente, personagem e regador parecem alinhados, mas uma vista lateral revela o regador acima do alcance. A pergunta inclui essa segunda vista; não exige adivinhar uma altura invisível.

**Pergunta:** “Por que o personagem ainda não recolheu o regador?”

- Basta mudar o lugar de onde olhamos para o personagem pegar o regador.
- O regador está alto demais para encostar no personagem. **Correta.**
- Basta ficar bem embaixo do regador, mesmo sem alcançar sua altura.

**Explicação correta:** “Você acertou! O encontro precisa acontecer também na altura. Mudar a vista ajuda a perceber isso, mas não move o regador.”

**Retorno à primeira alternativa:** “Mudar a vista ajuda a enxergar a distância. Para encostar, é preciso colocar o regador ao alcance do personagem.”

**Retorno à terceira alternativa:** “Ficar embaixo não basta quando ainda há espaço entre os dois na altura. Olhe a vista lateral e compare.”

**Ver o que acontece** compara a tentativa alta e a tentativa ao alcance. Mudar de câmera não pode mover o objeto nem apagar o resultado observado.

Nas perguntas 1, 3 e 4, a demonstração faz parte da devolutiva após escolher; o gabarito aparece junto da explicação, depois do acontecimento. A animação nunca impede a correção: oferecer a sequência em quadros com descrição e movimento reduzido, inclusive se WebGL falhar. Essa alternativa explica a mesma situação, sem marcar como realizada uma cena que não carregou. Na pergunta 2, a correção é direta. Na autoria final, distribuir as posições das respostas corretas, preservando seus IDs; não publicar todas na primeira posição nem usar cor, tamanho ou voz para indicar a resposta antes da escolha.

Mapa de cobertura: pergunta 1, retirada visual versus memória e leitura da condição; 2, teste do caso sem coleta; 3, ponto de vista; 4, altura e contato. Movimento, limite e edição de posição são demonstrados no projeto. Na nova tentativa de uma previsão, restaurar a cena inicial daquela pergunta antes de executar novamente; manter os acertos das demais perguntas. O leitor de tela deve receber a mesma descrição inicial disponível visualmente, sem antecipar a conclusão. Texto ampliado, foco, teclado e controle de voz precisam funcionar sem depender das cores.

Gabarito e correção permanecem no servidor; a demonstração visual não concede conclusão, XP ou aprovação por conta própria. Se reutilizar o componente de quiz demonstrável, será necessário adaptar a cena e registrar as configurações aceitas, sem reutilizar um ID com significado diferente.

## 9. Critérios de avaliação do jogo

Avaliar o programa atual por comportamento. Uma montagem válida que usa blocos básicos equivalentes deve passar. Não comparar o código inteiro com a solução privada, não exigir um nome específico da variável, uma mensagem literal, uma cor ou uma coordenada escolhida pela equipe.

| Critério | Como conferir | Erro que deve ser recusado |
| --- | --- | --- |
| Movimento, nas duas dimensões | Pressionar e soltar as quatro direções em vários quadros | Anda uma vez só, continua sem entrada, direção incorreta ou comando ausente |
| Limite 2D | Chegar a cada borda, continuar pressionando e voltar | Personagem sai da tela; a correção impede voltar para dentro |
| Estado inicial | Iniciar partida e observar flor fechada e regador disponível | Flor já aberta; coleta marcada como feita desde o começo |
| Coleta por encontro e aviso | Aproximar do objeto na posição atual; conferir contato e alteração do aviso | Regador retirado no início, desaparecendo sem encontro ou aviso de coleta ausente |
| Memória duradoura | Coletar, afastar-se, esperar e visitar a flor | A regra só funciona enquanto está perto do lugar da coleta |
| Resposta sem regador | Em partida nova, ir à flor sem tocar no regador | Flor abre sempre; ausência de orientação sobre o que falta |
| Resposta com regador | Coletar e depois visitar a flor; conferir abertura e aviso de sucesso | Apenas o aviso muda; abre na coleta antes de chegar à flor; não avisa o sucesso |
| Resultado estável | Aguardar o fim do efeito e afastar-se da flor | Flor volta a fechar apenas por sair do contato; um novo toque repetir a animação não é erro |
| Valor inicial da memória, após reinício | Usar o reinício fornecido e repetir o caso sem regador | A memória criada pela criança já começa liberando a flor; defeito no mecanismo pronto é falha da equipe |
| Variação de posição, em 2D e 3D | Conferir edição, testar alcance e repetir os dois caminhos | Validação só aceita a posição-modelo ou ignora altura no 3D |

Coleta, espera e deslocamento devem permitir observar pontos intermediários. O verificador precisa distinguir mensagem de estado: escrever “peguei” não comprova uma coleta, e escrever “floresceu” não comprova a abertura visual.

Mensagens são livres dentro do sentido solicitado. A verificação automática pode comprovar mudança do aviso, mas não deve alegar que entende qualquer texto. Oferecer exemplos claros e considerar a leitura qualitativa no ensaio; não reprovar só por escolher palavras equivalentes.

Na primeira versão, a checagem das mensagens deve se limitar a texto não vazio e ao aviso atualizado no acontecimento correspondente. Exemplos claros ficam na ajuda, como “Pegou o regador!”, “Busque o regador primeiro.” e “A flor abriu!”. Não criar análise semântica por IA nem um filtro de palavras que rejeite frases válidas. O relatório automático confirma a atualização do aviso; a clareza do texto é uma observação qualitativa, sem alegar aprovação automática de seu significado.

A estrutura básica deve ser conferida separadamente para impedir código cru e blocos avançados. O programa precisa reaplicar uma informação verdadeira/falsa guardada na coleta e consultada por uma decisão: não basta um temporizador fazer a flor abrir na hora aproximada do teste. Conferir a ligação entre escrita e leitura no IR, sem exigir o nome `temRegador` nem a ordem visual da solução. O nome da variável, sozinho, também não comprova memória. Essa análise é trabalho de implementação a validar, não uma capacidade já garantida pelo avaliador atual.

As duas evidências são complementares: relação causal no programa e resultado em execução. Os testes devem aceitar nomes diferentes de variável e condições equivalentes. Identidades dos elementos visuais podem ser estáveis no projeto preparado para a navegação do avaliador. Medir a abertura pela imagem/modelo e pela pose final do clipe real, não só por um aviso ou por ter sido chamado o comando de animar. Um clipe inexistente ou que não modifica a flor não pode passar.

Essa aceitação cobre montagens do repertório básico ensinado, incluindo consultar a informação diretamente, compará-la com verdadeiro/falso e inverter a condição junto das respostas. Não prometer reconhecimento de qualquer programa equivalente. Validar essas formas explicitamente antes de publicar a missão. Usar pares conhecidos de flor fechada/aberta e metadados dos clipes fornecidos, associados aos elementos da cena; não depender de comparação exata de pixels nem de um classificador visual genérico. Opções de arte só são oferecidas depois de testadas com esses contratos.

Uma solução privada por etapa serve para testar os critérios. Não enviá-la como projeto inicial nem instalar essa solução ao abrir ajuda. Verificação deve preservar o projeto e observar sua revisão atual. Alterar depois de verificar exige conferir a versão que será enviada, pelo fluxo de entrega existente.

A missão não deve exigir mais comportamento do que o enunciado anuncia. Estado inicial, coleta única, espera e resposta da flor detalham os objetivos públicos; não viram tarefas secretas. Os critérios de aprendizagem cobrem apenas os conhecimentos das experiências e montagens ensinadas. Antes de avaliar, a equipe deve conferir que câmera, renderização, artes, áreas 3D e reinício fornecidos funcionam. Se essa preparação falhar, não atribuir o problema à criança nem exigir que ela aprenda a corrigi-la para concluir.

Verificar o conjunto em partidas independentes, inclusive com tempo de caminhada e espera diferentes, para recusar vitórias por temporização sem impedir soluções válidas. Não tocar no código da pessoa para forçar uma resposta durante a execução. O resultado estável é garantido também pela arte: um clipe com pose final errada é defeito do material; um comando programado pela criança que fecha a flor ao se afastar é evidência sobre a regra criada por ela.

### Dependências e resultados incompletos

Se o personagem não anda, a verificação não consegue testar a coleta por encontro. Isso não comprova que a coleta está errada. Retornar o problema observado no movimento e explicar que os testes dependentes ainda não puderam terminar. Da mesma forma, se a flor ainda não tem regra, o sumiço do regador não comprova nem refuta a memória. Distinguir resultado observado, teste dependente pendente e falha de infraestrutura; nunca exibir uma sequência de reprovações inferidas de uma única falha.

Para o avaliador, usar os comandos de entrada normais e as posições atuais, com margem de tempo proporcional ao percurso e à velocidade válida escolhida. Um caminho automático que falhou não prova por si só que o objeto está inacessível. Testar o navegador do avaliador com diferentes lugares alcançáveis; separar limite de execução técnico de prazo de aprendizagem. O feedback não deve pedir à pessoa que copie a velocidade ou a coordenada da solução para satisfazer o robô.

## 10. Recuperação e tratamento do erro

| Dificuldade observada | Primeiro apoio | Recuperação completa, se pedida |
| --- | --- | --- |
| Personagem não anda ou anda só uma vez | Conferir entrada e lugar do comando no quadro | Movimento da Chave ou da Ilha, conforme a dimensão |
| Personagem sai da tela 2D | Testar a borda e a ordem entre movimento e limite | Limite da Chave do Farol |
| Regador não some | Conferir se houve encontro e qual objeto recebe a reação | Coleta dos Faróis |
| Regador some, mas nada muda na flor | Conferir se o personagem encostou na flor e se a regra dela já existe; depois verificar memória e condição | Ajuda do Jardim para memória e decisão, com referência aos Faróis |
| Flor abre sem o item | Testar em nova partida e conferir a pergunta da decisão | Se/senão e caso sem chave |
| Funciona só perto do regador | Pedir afastamento antes de ir à flor | Informação que permanece depois do encontro |
| Funciona em 2D, mas não em 3D | Conferir alcance e altura antes de reescrever a lógica | Posição e contato da Ilha |
| Reinício mantém a vitória | Observar o começo de outra partida | Estado inicial e reinício dos projetos-base |

O feedback deve descrever o ocorrido e indicar onde investigar. Evitar “errado”, “não passou”, “combina com o teste” ou uma lista de blocos como primeira resposta. Falha de carregamento, navegação automática ou WebGL gera mensagem técnica de tentativa, não julgamento de aprendizagem. A pessoa mantém acesso ao projeto para corrigir.

As referências aos Faróis nessa tabela identificam a origem da retomada; o primeiro destino de montagem continua sendo a ajuda específica do Jardim. Uma mesma observação pode ter mais de uma causa: não afirmar “você esqueceu a memória” apenas porque a flor não abriu.

## 11. Material de apoio, identidade visual e produção

Manter **Passo a passo do projeto** como nome e seguir o template dos cursos anteriores: capa, Nunito/Baloo 2, cartões, cores reais dos blocos, numeração e testes. Na missão, o começo do material apresenta objetivo, regras do jogo, roteiro de testes e espaço para planejar. Uma seção claramente separada de **Ajuda para montar** oferece as montagens completas. Não colocar o programa resolvido na capa, na primeira página ou ao lado do objetivo principal.

Isso permite consultar uma ajuda precisa sem transformar toda a experiência numa cópia obrigatória. O material fica disponível na parte 2 da primeira aula; a aula 2 remete ao mesmo arquivo. Não cobrar leitura, download ou impressão. Quiz continua na plataforma, sem gabarito antecipado no material.

Uma única fonte editorial e um master integral atendem aos públicos Kids e adulto. Notas de tela, falas do Zappy e falas gravadas devem ficar separadas. Se houver intervenções de Dedé/Debinha, registrar frases exatas e manter o master compreensível sozinho. Não há necessidade pedagógica de uma intervenção em cada parte.

Os vídeos principais mostram propósito, situação e testes, com lembranças breves dos conceitos. Se houver vídeo adicional de ajuda de montagem, ele deve mostrar todos os gestos do trecho que explica. Nenhum roteiro orienta clicar em um botão que ainda não existe, presume a posição da interface na tela ou antecipa uma promoção que depende de outro requisito.

## 12. Viabilidade técnica e entregas após aprovação

O repertório que a criança montou nos Faróis cobre o núcleo exigido: controles e movimento, limite 2D, encontros, retirar o sprite 2D ou esconder o modelo 3D, variável booleana, mensagens, condição, troca de imagem, acionamento de animação e edição de posição. O mecanismo de reinício e os demais elementos preparados permanecem responsabilidade da equipe. **Não há motivo pedagógico, neste momento, para criar uma extensão Jardim nem um bloco “resolver missão”.** A arte pode mostrar água ou florescimento como animação preparada; a criança decide quando esse efeito acontece.

Reutilizar o Estúdio incorporado, materiais, diálogos, quiz, verificações executadas e envio existentes. O executor 3D já navega até elementos por identidade e geometria atuais; as regras do Jardim devem fornecer seu próprio percurso, não copiar coordenadas da Ilha. O renderizador e o controle de modelo já aprendidos precisam ser testados com as novas artes.

Sequência proposta para a produção:

1. Validar a proposta pedagógica e preparar o protótipo das duas cenas, da ajuda e das quatro perguntas junto das artes representativas descritas no próximo item.
2. Produzir o conjunto visual com qualidade dos cursos-base e inspiração também no Cadê Todo Mundo, conforme a [direção de arte](direcao-de-arte.md). Peças geométricas provisórias podem servir a testes internos, mas a aprovação visual do protótipo deve mostrar artes representativas do acabamento final. Conferir tamanho, contato e estados fechado/aberto antes de completar a produção, gravar ou publicar.
3. Criar entradas incompletas e soluções privadas das duas aulas, somente com blocos básicos, usando a matriz da seção 3 para separar o que fica pronto e o que a pessoa monta. Recusar uma entrada com os comandos de movimento ou as regras avaliadas já resolvidos.
4. Implementar os testes de comportamento e seus contraexemplos, incluindo altura, posição alternativa, reinício e solução equivalente.
5. Escrever fonte editorial, objetivos, falas de apoio, roteiros, manifestos e derivados. Conservar um envio por aula e a revisão antes da entrega final.
6. Produzir e revisar o PDF no template existente, incluindo as ajudas completas 2D/3D; gerar e escutar voz; gravar e conferir os vídeos principais. Vídeos adicionais de ajuda são opcionais se o material já oferecer todos os gestos com clareza, sem depender de reprodução de vídeo para consultar um passo.
7. Ensaiar com iniciantes que concluíram os dois Faróis. Publicar somente depois de ajustar os obstáculos identificados.

Identidade: `jornada-faisca-missao` / `jornada-faisca-missao-adulto`. Preservar UUIDs, duas aulas obrigatórias e `creatorSeed.requiredLessonIds`. O hash do outline histórico não deve ser alterado só para renomear títulos de apresentação. Antes de publicar, reconciliar a descrição antiga “controles preparados” com a decisão atual de a pessoa remontar os comandos ensinados; não alterar o seed nesta revisão documental. O seed registra a missão no agrupamento técnico 2D, mas a autoria contém as duas dimensões: conferir explicitamente extensões e disponibilidade do Estúdio 3D na segunda aula.

Não alterar políticas, conceder blocos, promover pessoas ou publicar remotamente como efeito de criar os arquivos locais. Não repetir o certificado dos cursos iniciais. Publicar apenas uma das duas aulas não deve disponibilizar uma missão pela metade.

## 13. Revisão e ensaio pedagógico

Verificação técnica mínima: solução completa 2D/3D; movimento ausente, fora do quadro ou sem parada; limite 2D ausente ou ineficaz; duas ordens de montagem; variações válidas de arte/texto/posição; regador inacessível ou alto; flor abrindo cedo; ausência de memória; condição invertida; alteração após verificar; reinício; retomada entre sessões; retorno da ajuda; importação portátil; prévia estreita; falha de modelo e WebGL. Separar os testes das montagens da criança dos testes da infraestrutura fornecida. Os quizzes devem permitir erro, explicação, nova tentativa e conclusão validada no servidor, com alternativas neutras antes da resposta.

Conferir especialmente as dependências entre objetivos: a coleta permite avançar sem exigir a flor futura; a entrega exige o conjunto na revisão atual. Testar mudar a posição depois de coletar, reiniciar sem perder os blocos, retomar mantendo a comparação com a entrada original, revisar uma previsão sem deixar a cena no resultado anterior e concluir após consultar a ajuda completa. Verificar que as opções de aparência mantêm estados e contato válidos e que a cena especial de câmera do quiz não altera a câmera fixa do jogo.

Ensaio pedagógico inicial sugerido: 4–6 participantes que tenham concluído os Faróis, contemplando leitores com diferentes ritmos. É uma avaliação formativa pequena, não uma comprovação estatística. Registrar:

- Se conseguem dizer o objetivo do jogo sem repetir uma instrução de bloco.
- Se escolhem testar a flor sem regador, além do caminho de vitória.
- Se distinguem esconder o item e guardar a coleta.
- Se transferem a regra para 3D e reconhecem uma dificuldade de altura.
- Qual ajuda procuram, se entendem a explicação e se conseguem voltar ao projeto.
- Se a variação de posição deixa a regra funcionando e se explicam por quê.

As estimativas de simplicidade e didática não devem receber notas definitivas antes do protótipo e do ensaio. A hipótese a verificar é: objetivos concretos + infraestrutura pronta + apoio acessível permitem mais autonomia do que repetir um vídeo inteiro de montagem.

## 14. O que precisa ser aprovado

Recomendações centrais: manter O Jardim Secreto e duas aulas; usar regador e flor com uma informação central de coleta; preparar somente a infraestrutura que a criança não montou; exigir os conceitos investigados e os comandos completados nos Faróis, incluindo movimento, limite 2D, coleta, memória, avisos, decisão e posição; verificar ponto de vista e altura sem cobrar programação de câmera; oferecer ajuda completa sob demanda; usar quatro perguntas de transferência; concluir com os dois projetos enviados, sem certificado ou publicação obrigatória. As artes seguem os Faróis e podem se inspirar no Cadê Todo Mundo, com qualidade equivalente avaliada na cena real.

As regras de acesso e promoção já pertencem ao currículo aprovado. A aprovação solicitada aqui é da forma pedagógica e da produção da missão. Depois dela, o próximo artefato deve ser o protótipo para avaliar clareza e apresentação antes de autorar e publicar o curso completo.
