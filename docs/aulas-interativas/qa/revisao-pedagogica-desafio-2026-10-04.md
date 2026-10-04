# Revisão pedagógica do Desafio do Primeiro Jogo

**Data:** 04/10/2026. **Curso:** A Chave do Farol, `desafio-primeiro-jogo`. **Público de referência:** 9 a 14 anos, sem exigir passagem anterior por Cadê Todo Mundo?.

**Situação:** proposta aprovada e aplicada aos materiais locais em 04/10/2026. Motor de experiências, trios de aula, gerador, critérios, quiz e caderno foram atualizados. Veja o [registro de aplicação e verificações](revisao-desafio-2026-10-04/aplicacao.md). A análise abaixo conserva o diagnóstico anterior à aplicação. Não houve gravação, publicação no Admin nem novo ensaio com crianças.

## Parecer

O curso tem uma boa progressão de produto: andar, recolher, decidir e compartilhar. A montagem já oferece caminhos completos, testes, correção e entrega. O principal ganho agora está em tornar o raciocínio da criança observável: perceber o que cada regra muda, distinguir informação de aparência e escolher um teste que possa revelar um erro.

**Recomendo manter os três dias, criar uma experiência de memória no Dia 2 e dividir a construção do Dia 3 em duas conquistas.** A proposta passa de dez para onze seções e de nove para dez vídeos. A experiência nova ocupa a seção hoje dedicada apenas a observar a falta da coleta. Não é necessário acrescentar um dia, outro jogo ou mais quizzes.

Há também uma correção prioritária no retorno da plataforma: a conferência estrutural do Dia 3 aprova projetos cuja memória da chave está quebrada. Essa limitação foi reproduzida nesta revisão, mesmo com todos os testes existentes passando.

Documentos complementares:

- [Especificação das experiências](revisao-desafio-2026-10-04/experiencias.md): cena nova de memória e melhoria da cena da porta, com controles, estados, metas, pistas e critérios.
- [Falas e atividades propostas](revisao-desafio-2026-10-04/roteiros-propostos.md): textos para os trechos alterados, divisão do Dia 3 e revisão da pergunta sobre memória.

## Referências e alcance da análise

Foram lidos as [Diretrizes Pedagógicas](../DIRETRIZES-PEDAGOGICAS.md), o [Briefing](../BRIEFING.md), as especificações de roteiro e manifesto, a [organização do Farol](../modulos-desafio-primeiro-jogo.md), os cinco trios de aula, o gerador, o projeto preparado, os critérios, o quiz e as fontes do caderno. A comparação com Cadê Todo Mundo considera a revisão de linguagem, o roteiro de contagem e as decisões já consolidadas.

O ensaio anterior de Cadê Todo Mundo envolveu duas crianças e mostrou que uma delas não identificou a tarefa por causa do tour. Isso fundamenta conservar contexto e comandos claros. Não demonstra que a mesma quantidade de seções ou a mesma experiência serve ao Farol.

Como apoio externo, o [guia do IES/What Works Clearinghouse](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) recomenda relacionar representações concretas e abstratas, alternar exemplos resolvidos e prática e solicitar explicações. O [estudo de Sentance, Waite e Kallia sobre PRIMM](https://primmportal.com/wp-content/uploads/2020/10/teaching-computer-programming-with-primm-a-sociocultural-perspective.pdf), com estudantes de 11 a 14 anos em escolas, investiga leitura, previsão, execução e modificação de programas. Essas referências apoiam experimentar e interpretar antes de ampliar a construção. A escolha das onze seções é uma decisão de autoria para este curso, não uma quantidade comprovada por esses estudos. A aplicação a um curso individual em vídeo e ao público de 9 e 10 anos ainda precisa de observação.

## O que preservar

1. A aventura pronta antes da construção, sem exigir vitória para começar.
2. Cenário, artes, desenho e barco preparados, com reconhecimento honesto da autoria.
3. Apenas Programação e Jogo 2D, no Estúdio incorporado.
4. O projeto contínuo da criança, com retomadas preparadas apenas na ausência de envio anterior.
5. Caminho, bloco, encaixe, campo, valor, teste e correção em cada montagem.
6. Um vídeo e uma ponte do Zappy por seção com vídeo; quiz em seção própria.
7. Caderno opcional na segunda seção da introdução e ajuda contextual no Como Fazer.
8. Publicação ensinada no mesmo projeto, sem novo bloqueio para o certificado.
9. Quatro perguntas formativas, correção imediata e celebração sem conteúdo comercial.

## Achados por prioridade

| Prioridade | Evidência atual | Consequência didática | Proposta |
| --- | --- | --- | --- |
| Alta | No Dia 2, os testes observam a chave e o aviso; nenhum deles mostra o valor de `temChave`. A própria proposta atual reconhece essa limitação. | É possível reproduzir os encaixes sem distinguir retirar a imagem, mostrar a mensagem e guardar a coleta. | Experiência de contraste com o mesmo desaparecimento e o mesmo aviso, mudando somente a regra de memória. |
| Alta | A seção `contexto` do Dia 2 contém vídeo e diálogo, sem atividade. | A criança vê o problema, mas ainda não manipula a relação que precisará programar. | Usar a mesma seção para uma investigação curta; conservar a demonstração do problema no começo do vídeo. |
| Alta | A seção `decisao` reúne evento novo, consulta de variável, Se, senão, três consequências, dois percursos e envio. | Há vários pontos em que um erro de encaixe pode ocultar o raciocínio. A sobrecarga é uma hipótese de autoria, ainda não um resultado de ensaio. | Separar a resposta sem chave da conclusão com chave, preservando o mesmo Estúdio. |
| Alta | Os critérios do Dia 3 não reavaliam o valor inicial nem a atribuição da coleta. Foram aprovadas duas versões com essas regras quebradas. | “Objetivo da etapa cumprido!” pode contradizer o que acontece ao jogar. | Critérios essenciais cumulativos e testes manuais dos dois caminhos. |
| Média | A cena `lighthouse-key` permite levar/deixar a chave e testar a porta; a informação consultada e o ramo escolhido não aparecem no palco. | A criança pode entender a situação cotidiana da porta e ainda não relacioná-la a `temChave` e ao Se. | Mostrar o valor atual e realçar a resposta escolhida somente ao testar. Manter as duas metas existentes. |
| Média | Os roteiros concentram-se em reproduzir a solução, com pouca mudança escolhida pelo aprendiz. | A conclusão evidencia construção guiada, mas pouco uso independente da regra. | Uma comparação de velocidade no Dia 1 e uma mensagem com palavras próprias no Dia 2, sem novos blocos ou ferramentas. |
| Média | O quiz já cobre quatro ideias importantes, mas a pergunta da memória pede identificar a variável. | Saber reconhecer o nome não basta para localizar uma causa plausível quando o jogo falha. | Trocar essa pergunta por um diagnóstico concreto, mantendo quatro questões. |

## Alternativas consideradas

| Caminho | Ganho | Limite | Decisão |
| --- | --- | --- | --- |
| Ajustar apenas as falas e testes | Custo menor; mantém dez seções. | A memória continua invisível antes da porta, e a construção final continua concentrada. | Útil como melhoria parcial, insuficiente para o objetivo desta revisão. |
| Uma experiência nova e uma divisão da montagem | Dá concretude à memória e uma conquista intermediária na condição; onze seções. | Exige implementação da cena, revisão de critérios e novas gravações. | **Recomendado.** |
| Ampliar para mais dias, com experiências de movimento, eventos e personalização | Mais espaço para prática. | Aumenta duração e navegação; várias dessas ideias já podem ser testadas no próprio jogo. | Não justificado pelo material analisado. Reavaliar somente se o ensaio indicar necessidade. |

## Sequência recomendada

| Aula | Seção | Ação da criança | Evidência de conclusão proposta |
| --- | --- | --- | --- |
| Introdução | 1. A Chave do Farol | Experimentar a aventura pronta. | Vídeo e participação, como hoje. |
| Introdução | 2. Seu Caderno do Aluno | Conhecer a consulta disponível. | Vídeo; consulta continua opcional. |
| Dia 1 | 1. Faça o personagem andar pelo mapa | Montar controles, comparar velocidades e limitar as bordas. | Vídeo, critérios de movimento e envio. |
| Dia 2 | 1. O jogo guardou a chave? | Comparar coleta com e sem memória; afastar e recomeçar. | Vídeo e quatro observações na experiência nova. |
| Dia 2 | 2. Guarde que a chave foi encontrada | Programar evento, memória e aviso; testar uma mensagem própria. | Vídeo, critérios de coleta e pré-requisitos essenciais, envio. |
| Dia 3 | 1. O que a porta precisa? | Testar a mesma pergunta com os dois valores. | Vídeo e duas tentativas reais, como hoje. |
| Dia 3 | 2. Avise quando faltar a chave | Criar o encontro, consultar `temChave` e construir senão. | Vídeo e verificação dessa montagem; sem entrega intermediária. |
| Dia 3 | 3. Acenda o farol com a chave | Completar então e conferir uma sequência de tentativas. | Vídeo, verificação cumulativa e envio único do Dia 3. |
| Dia 3 | 4. Publique seu jogo | Compartilhar o mesmo jogo enviado. | Vídeo, sem tornar publicação um bloqueio novo. |
| Certificado | 1. As regras da sua aventura | Responder, ler as explicações e corrigir. | Quiz formativo, quatro perguntas. |
| Certificado | 2. Comemore sua criação | Reconhecer o trabalho e guardar o certificado. | Vídeo e bloco de certificado existente. |

O tempo a medir é o de executar a atividade, incluindo tentativas e ajuda. Não fixar a duração da aula pela soma dos vídeos. As estimativas dos clipes servem à produção e não autorizam acelerar arrastos.

## Triagem dos conceitos e decisões por aula

### Introdução: conservar a entrada pela ação

**Entrada:** nenhuma programação exigida. **Vitória:** reconhecer a aventura e experimentar. **Seções e clipes:** 2 → 2.

| Conceito | Abstrato? | Concretização | Momento e motivo |
| --- | --- | --- | --- |
| Objetivo do jogo | Não | Jogar a versão pronta. | Antes da construção, para dar sentido às regras. |
| Usar os controles | Operação | Mover o personagem. | Na própria partida; não precisa de outra cena. |
| Consultar o caderno | Operação de apoio | Material real disponível. | Segunda seção, opcional. |

A abertura atual já faz o trabalho necessário. Não transformá-la em outra explicação de evento, variável e condição. Ajustar apenas o fechamento da fala para que a informação “não precisa terminar a partida” venha antes da ação final “Próxima seção”. Hoje essa explicação vem depois da saída, contrariando a direção de encerrar no comando final.

Preservar `apresentacao`, `caderno`, `jogo-pronto`, `materiais-farol` e os vídeos existentes como identidades de conteúdo. A criança começa a construção em outro projeto; não transportar o exemplo resolvido para sua cadeia.

### Dia 1: manter uma seção, acrescentar uma pequena comparação

**Entrada:** cenário preparado, personagem parado. **Vitória:** controlar o personagem e mantê-lo na tela. **Seções e clipes:** 1 → 1.

| Conceito | Abstrato? | Concretização | Momento e motivo |
| --- | --- | --- | --- |
| Sprite | Vocabulário | Apontar o personagem e definir brevemente. | Antes do primeiro bloco com esse termo. |
| Controle e movimento | Não exige cena | Setas aparecem; depois o personagem responde. | Durante a montagem, com efeito imediato. |
| Repetição por quadro | Sim | Segurar uma seta e observar o movimento contínuo. | Junto do encaixe em A cada quadro, sem explicar o motor inteiro. |
| Velocidade | Relação manipulável | Comparar 3 e 1 no próprio bloco; retornar a 3. | Depois de conseguir andar e antes da borda. |
| Ordem e limite | Relação concreta | Chegar à beirada antes e depois da regra. | Conservar o teste atual do problema real. |

A comparação tem uma alteração por vez, um teste e uma volta ao valor de referência. A criança antecipa o efeito com suas palavras; não recebe um novo questionário. Voltar a 3 mantém o percurso previsto e os critérios atuais. Não ensinar que outros valores positivos são, por si, erros de programação.

Preservar a seção `borda` e o vídeo `video-d1-borda`. Na gravação, mostrar a montagem por pequenas conquistas: setas, movimento, comparação, bordas. O enquadramento deve deixar clara a área de trabalho, sem cortar o bloco que identifica o encaixe.

### Dia 2: separar aparência de informação

**Entrada:** projeto próprio com movimento e borda. **Vitória:** recolher uma vez e guardar a coleta. **Seções e clipes:** 2 → 2.

| Conceito | Abstrato? | Concretização | Momento e motivo |
| --- | --- | --- | --- |
| Encontro ainda sem regra | Não | Trecho breve do jogo do Dia 1. | Abertura do vídeo, para situar a necessidade. |
| Evento | Sim, próximo da ação | Gesto Encostar na chave produz a resposta da experiência. | Antes do bloco, retomado ao montar Quando começar a encostar. |
| Variável booleana | Sim | Valor visível de `temChave` nos dois modos da experiência. | Antes da montagem, porque o jogo próprio ainda não consulta esse valor. |
| Falso e verdadeiro | Sim | Sem registro e com registro da coleta. | Junto do mostrador, sem associar falso a erro do aprendiz. |
| Retirar, avisar e guardar | Sim, relação causal | Mesmo sumiço e mesmo aviso, mas memória diferente. | Na experiência nova, isolando o que mudou. |
| Persistir e reiniciar | Sim | Afastar conserva; nova partida reinicia a informação. | Na mesma experiência, sem abrir outra seção. |
| Escrever o aviso | Não exige cena | Mudar o texto no jogo e conferir o efeito. | Depois da montagem guiada; pequena autoria com uma peça já ensinada. |

A cena genérica de contador não serve: somar pontos não explica guardar posse com verdadeiro/falso. A cena proposta em [experiencias.md](revisao-desafio-2026-10-04/experiencias.md) é específica da relação, mas pode servir a outros jogos de coletar um item único.

A primeira seção muda de intenção `explanation` para `exploration`, preservando a chave `contexto`, o vídeo `video-d2-contexto` e a ponte. Recebe o bloco novo `experiencia-memoria`. A segunda mantém a montagem completa atual e sua ordem. A definição de variável passa a retomar o que foi visto, sem repetir uma aula conceitual inteira.

A comparação ocorre em uma experiência isolada. No projeto real, o desaparecimento e o aviso continuam sem provar, sozinhos, a memória. A conferência do programa verifica a atribuição; o uso da informação fica visível no Dia 3. Essa distinção deve permanecer explícita na proposta do autor.

### Dia 3: uma resposta por conquista, depois o teste integrado

**Entrada:** movimento, borda e coleta já enviados. **Vitória:** respostas distintas para sem/com chave e jogo pronto para compartilhar. **Seções:** 3 → 4. **Clipes:** 3 → 4.

| Conceito | Abstrato? | Concretização | Momento e motivo |
| --- | --- | --- | --- |
| Condição | Sim | Mostrar valor consultado e resposta na porta. | Experiência antes do Estúdio. |
| Evento versus condição | Sim | Encostar dispara a consulta; o valor escolhe a resposta. | Ler os níveis do programa durante a montagem. |
| Senão | Sim | Mensagem de falta da chave ao chegar sem ela. | Primeira construção, com teste e conquista próprios. |
| Então | Sim | Acender e acionar o barco somente após a coleta. | Segunda construção, no mesmo Se. |
| Memória entre encontros | Sim | Visitar o farol, buscar a chave e voltar na mesma partida. | Teste integrado, ligando o Dia 2 ao Dia 3. |
| Reinício | Sim | Depois de vencer, recomeçar e testar sem chave. | Para distinguir memória da partida e projeto salvo. |
| Publicação | Operação de entrega | Caminho mínimo já ensinado. | Após o único envio do dia; conservar a seção. |

A primeira montagem entrega um comportamento incompleto, porém útil: sem chave, o jogo explica o que falta. O vídeo diz expressamente que o ramo então ainda está vazio. A criança não precisa interpretar a ausência de luz como erro antes de programar essa parte.

A seção nova `sem-chave` usa `workspaceKey: projeto`. O Estúdio continua definido uma vez e pertencendo, em `blockKeys`, à seção de entrega `decisao`. A seção intermediária cobra vídeo e `projectChecks`, sem exigir `projeto` como bloco enviado. Esse formato existe no contrato do manifesto; a configuração concreta deve ser validada na implementação.

Preservar `condicao`, `decisao` e `fecho`. Manter `video-d3-decisao` na construção com chave e criar `video-d3-sem-chave` para a primeira parte. A nova seção fica entre `condicao` e `decisao`. Não gerar outro projeto inicial, outra cadeia ou outra entrega.

### Certificado: usar a revisão para interpretar um problema

**Entrada:** construção encerrada e publicação ensinada. **Vitória:** revisar e reconhecer a autoria. **Seções:** 2 → 2. **Clipes:** 1 → 1.

| Conceito | Abstrato? | Concretização | Momento e motivo |
| --- | --- | --- | --- |
| Ordem, memória, condição e teste | Retomada | Situações do jogo no quiz. | Antes da celebração, com explicações e correção. |
| Autoria | Não | Nomear exatamente as regras construídas. | Celebração existente. |
| Guardar certificado | Operação | Emissão ou download já disponível. | Encerramento, sem nova experiência. |

Conservar três perguntas: ordem do movimento/borda, resposta sem chave e necessidade de testar os dois caminhos. A pergunta da memória passa a diagnosticar um jogo em que a chave desaparece, o aviso muda e a porta ainda diz que falta a chave. A resposta precisa localizar a atribuição a `temChave`, com contexto que descarte defeito na porta. O texto completo está no [anexo de roteiros](revisao-desafio-2026-10-04/roteiros-propostos.md).

A nova pergunta deve receber identificador próprio ao mudar seu significado. Não reatribuir respostas antigas ao novo enunciado. Preservar aulas concluídas e certificados emitidos. Quatro acertos após correções permitem avançar; não constituem prova de domínio independente de programação.

## Conferência estrutural: problemas reproduzidos

Usei `montarProjetoFarol`, clonei somente o projeto local em memória, alterei sua IR, reconstruí `blocksState` e executei `evaluateStudioSectionProject` com os critérios vigentes de cada dia.

| Alteração de diagnóstico | Resultado atual | Limite da evidência |
| --- | --- | --- |
| Dia 1: mover movimento e borda para fora de A cada quadro, mantendo-os em Enquanto estiver rodando. | 3 de 3 critérios aprovados. | Reproduzido no avaliador; não foi verificado se o editor permite esse encaixe por arrasto. |
| Dia 2: remover o movimento que veio do Dia 1. | 5 de 5 critérios aprovados. | Os critérios conferem a coleta, mas não a conservação do controle do personagem. |
| Dia 3: inicializar `temChave` em verdadeiro. | 6 de 6 critérios aprovados. | O programa passa a considerar a chave presente desde o início. |
| Dia 3: remover da coleta a atribuição de verdadeiro a `temChave`. | 6 de 6 critérios aprovados. | Com o estado inicial falso, a consulta da porta nunca encontra a coleta registrada. |

O [script de diagnóstico](revisao-desafio-2026-10-04/diagnostico-verificacao.ts) reproduz os quatro casos sem gravar projetos ou acessar o banco. É uma investigação do avaliador, não um teste com crianças ou uma execução do player.

**Correções recomendadas na autoria dos critérios:**

- Dia 1: vincular movimento e limite ao corpo de `sz_g2d_update_each_frame`, mantendo movimento antes da borda. A área `loops` sozinha é ampla demais.
- Dia 2: conservar os critérios da coleta e verificar os pré-requisitos essenciais de movimento e borda. Não exigir que a criança refaça o Dia 1.
- Dia 3: verificar também declaração inicial falsa, atribuição verdadeira no encontro com a chave, retirada do item e controles essenciais. Consolidar verificações duplicadas para respeitar o limite de vinte critérios por seção.
- Na nova seção intermediária, verificar somente a etapa já ensinada: evento do farol, consulta a `temChave` e aviso em senão, além dos pré-requisitos. Não cobrar o ramo então ainda vazio.
- Manter mensagens próprias permitidas. A avaliação estrutural não pode garantir que um texto livre é compreensível ou que a criança jogou os dois caminhos.

Essas correções diminuem falsos positivos conhecidos. Não transformam busca por blocos em prova completa do comportamento de qualquer programa. Os testes jogados continuam parte da atividade.

## Caderno e preparação da gravação

O conteúdo atual já acompanha caminhos, encaixes e testes. O gerador monta quinze páginas a partir do JSON de conteúdo e de folhas complementares; não avaliar o PDF apenas pelo número de entradas do JSON.

Na aplicação da proposta:

1. Acrescentar a experiência de memória antes da montagem do Dia 2, usando os mesmos controles da cena. Registrar comandos de observação, sem imprimir respostas antecipadas da experiência.
2. Inserir a comparação de velocidade junto ao passo do movimento.
3. Separar visualmente a montagem sem chave e a montagem com chave, acompanhando as seções novas.
4. Atualizar os testes: sem chave → buscar chave → voltar ao farol → reiniciar e conferir o começo.
5. Acrescentar a opção de aviso próprio, conservando o texto de exemplo para quem quiser utilizá-lo.
6. Atualizar índice e páginas na composição efetiva, mantendo o padrão do Cadê Todo Mundo e as cores oficiais dos blocos.
7. Conservar um único PDF, sem tarefa escrita obrigatória ou gabarito do quiz. Renderizar e conferir a nova versão antes de anexar.

Regravar o vídeo do Dia 1, os dois do Dia 2 e a experiência/montagem do Dia 3; gravar o novo clipe da resposta sem chave. O final da abertura também recebe ajuste de fala. Caderno, publicação e celebração podem conservar suas falas se as imagens e os comandos continuarem correspondendo à versão real. Não foi possível determinar o reaproveitamento das mídias remotas, pois os arquivos locais são moldes `plannedVideo`.

## Ensaio para avaliar aprendizagem

Fazer uma rodada exploratória com iniciantes da faixa de referência, incluindo alguém que não cursou Cadê Todo Mundo e alguém que cursou. Observar o dispositivo disponível, sem exigir teclado e toque da mesma pessoa. Uma amostra pequena serve para localizar problemas, não para estimar eficácia populacional.

| Momento | Pedido de observação | Sinal que buscamos | Se não aparecer |
| --- | --- | --- | --- |
| Abertura | Deixar a pessoa iniciar depois do vídeo, sem explicação extra. | Começa a jogar e identifica o objetivo da aventura. | Revisar contexto/comando antes de ensinar interface adicional. |
| Movimento | Antes de experimentar 1, pedir que diga o que espera mudar. | Relaciona o número ao deslocamento; confere no jogo. | Dar uma pista sobre o campo, depois repetir a comparação. |
| Memória | Depois dos dois modos, pedir que aponte o que mudou no registro. | Distingue chave fora da tela, aviso e valor guardado. | Revisar o contraste e a legibilidade do mostrador. |
| Persistência | Depois da coleta, afastar; depois recomeçar. | Distingue continuar a partida e começar outra. | Rever o comando e o estado inicial; não atribuir tudo à atenção. |
| Condição | Pedir que aponte, nos blocos montados, o que será executado sem chave. | Aponta senão e explica em linguagem própria. | Retomar o vínculo entre mostrador da experiência e consulta do Se. |
| Teste final | Após o caminho com chave funcionar, perguntar qual situação ainda precisa conferir. | Propõe uma partida sem a chave. | Usar a pista “a porta pode encontrar duas situações” e repetir depois. |
| Após 24–72 horas, se viável | Apresentar um pequeno exemplo equivalente com uma moeda que libera uma passagem. | Transfere a relação guardar/consultar sem decorar `temChave`. | Registrar apoio necessário; não bloquear certificado ou criar obrigação no curso. |

No ensaio, classificar cada ação como: fez sem ajuda, fez após pista, fez após demonstração ou ainda não fez. Registrar pedidos de ajuda, retornos ao vídeo e o trecho exato que gerou dúvida. O adulto pode ajudar depois de registrar a dificuldade; o ensaio não deve virar uma prova frustrante.

Aceitar explicações por fala, gesto ou apontamento. Não exigir definição de “variável booleana”, velocidade de resposta ou leitura em voz alta. A evidência desejada é relacionar gesto, regra e efeito.

## Ordem de aplicação

1. Corrigir os falsos positivos dos critérios e acrescentar regressões para os casos reproduzidos.
2. Implementar a experiência de memória e os estados visíveis da experiência da porta; conferir as metas por ações reais.
3. Atualizar juntos propostas canônicas, roteiros, gerador, manifestos e quiz. Criar apenas a seção e o vídeo adicionais do Dia 3.
4. Atualizar e conferir o caderno renderizado. Ensaiar a navegação e a continuidade do projeto entre as duas construções do Dia 3.
5. Ensaiar com crianças, ajustar os trechos em que o adulto ainda precisa completar a instrução e então preparar as gravações finais.
6. Reconciliar no Admin as identidades, mídias, anexos e progresso; conferir alunos novos, com progresso e com certificado. Os moldes locais não substituem vídeos e PDFs publicados.

## Verificações da análise, antes da aplicação

- **33 testes aprovados, zero falhas, 676 verificações**, em cinco arquivos: manifestos, projeto, diretrizes e cena da porta (motor e renderização estática).
- **Cinco manifestos válidos**, sem avisos de convenção.
- **Cinco roteiros conferidos pelo validador**, cobrindo nove vídeos.
- **42 tutoriais válidos**; o validador sugere acrescentar imagem/vídeo a um tutorial de galeria, fora do percurso analisado.
- Quatro casos adicionais de aprovação indevida reproduzidos no avaliador, descritos acima.

Esses números registram a linha de base anterior à aplicação. As verificações posteriores, incluindo o novo PDF renderizado e as regressões corrigidas, estão no [registro de aplicação](revisao-desafio-2026-10-04/aplicacao.md). A execução completa no navegador, a inspeção do conteúdo publicado, a gravação e o ensaio com crianças permanecem pendentes. Testes técnicos não validam compreensão infantil.
