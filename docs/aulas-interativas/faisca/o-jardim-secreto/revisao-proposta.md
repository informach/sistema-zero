# O Jardim Secreto: revisão da proposta

28/10/2026 · Revisão documental da [proposta](proposta.md), confrontada com a jornada e com as experiências e montagens dos dois Faróis. Os ajustes abaixo foram incorporados à proposta; não representam implementação ou validação de um curso jogável.

## Principal correção: exigir o que foi aprendido

A missão precisa reaplicar **os conhecimentos das experiências e os blocos que a criança completou**. Ver uma regra pronta dentro do jogo-base não significa ter aprendido a construí-la. Por outro lado, deixar pronta uma regra que a criança efetivamente montou elimina parte da aplicação esperada.

A primeira proposta deixava movimento e limites preparados em excesso. A revisão corrigiu isso com uma matriz de origem → aprendizagem → exigência na seção 3 da proposta. Essa matriz também distingue um conceito investigado, que pode aparecer em uma pergunta ou teste, da programação de infraestrutura que não foi ensinada.

| Frente | Passa a ser responsabilidade da criança | Continua preparado pela equipe |
| --- | --- | --- |
| Movimento | Controles e movimento 2D; movimento 3D no quadro existente | Laço de renderização, câmera, animações de andar e regiões caminháveis 3D |
| Limites | Manter o personagem dentro da tela 2D | Terreno e configuração das áreas 3D |
| Coleta | Encontro, retirada do sprite 2D ou ocultação do modelo 3D e aviso | Artes, criação dos elementos e contato coerente |
| Memória e decisão | Informação inicial falsa, coleta verdadeira, Se/senão, avisos e reação visual | Imagens da flor e clipe de florescimento |
| Posição | Mudar o lugar do regador em cada dimensão e retestar | Cena inicial acessível e identidades dos elementos |
| Ponto de vista e altura | Interpretar as vistas, o alcance e a diferença entre mover objeto e mudar de vista | Câmeras e demonstrações do quiz |
| Recomeço | Definir corretamente o valor inicial da memória e testar outra partida | Mecanismo que reinicia o programa |

Cadê Todo Mundo inspira a arte, mas é extra. A missão não passa a exigir sua contagem nem outro conhecimento que não esteja nos cursos-base obrigatórios.

## Problemas encontrados e decisões

| Problema | Consequência | Correção |
| --- | --- | --- |
| Movimento e limite 2D vinham prontos apesar de terem sido montados nas bases | A missão avaliava só parte do repertório solicitado | Incluídos na construção e nos objetivos; áreas 3D permanecem prontas |
| Reinício e infraestrutura podiam ser confundidos com aprendizagem exigida | Uma falha da preparação poderia reprovar a criança | Separados testes do material fornecido e testes das regras da criança |
| Mudança de posição aparecia como sugestão e como obrigação, concentrada no 3D | Enunciado e avaliação podiam divergir | Escolha alcançável explícita nas duas aulas, sem coordenada de gabarito |
| Pergunta sobre a flor não abrir permitia mais de uma causa | Uma resposta correta dependia de adivinhar o erro escolhido pelo autor | Cena controlada mostra regra e memória; a pergunta pede prever o resultado |
| Alternativas e demonstrações precisavam de regras mais claras | Destaque poderia sugerir o gabarito; falha de WebGL impedir a explicação | Alternativas neutras, posições corretas distribuídas, feedback específico e sequência estática equivalente |
| Exigir que florescimento nunca repetisse poderia introduzir uma trava nova | Outra variável ou conhecimento de animação se tornaria requisito oculto | Novo toque pode repetir; clipe deve terminar aberto, sob responsabilidade da equipe |
| Ajuda dependia demais de consultar outro curso ou de uma interface futura | A criança teria de traduzir nomes e descobrir gestos sozinha | Material próprio do Jardim com ajuda integral por dificuldade e dimensão |
| Referência concluída e projeto inicial não estavam suficientemente separados | Mostrar o resultado poderia instalar a solução ou conceder objetivos | Referência separada; projeto incompleto preservado e um envio por aula |
| Sumiço, aviso e comando de animação podiam ser tratados como prova suficiente | Soluções sem memória ou sem mudança visual poderiam passar | Comportamento observado mais relação entre escrita e leitura da informação, sem nome fixo de variável |
| Exigência visual era genérica e admitia provisórios na apresentação | Protótipo poderia transmitir um padrão inferior ao das bases | Briefing de arte próprio, referência também no Cadê e comparação no jogo real |
| Resumo antigo do currículo dizia que controles viriam prontos | A descrição publicada poderia contradizer a decisão mais recente | Divergência registrada; reconciliar descrição na implementação, preservando identidades e histórico do seed |

Também foi retirada a estimativa numérica de duração antes do ensaio. A aula precisa permitir testar, errar, consultar ajuda e retornar, sem promessa de rapidez.

## Segunda revisão: clareza, carga de trabalho e avaliação

O pedido seguinte foi uma nova revisão da proposta já corrigida. Esta rodada preservou a missão, as duas aulas e o repertório obrigatório. Os problemas abaixo ainda existiam depois da primeira revisão.

| Prioridade | Problema encontrado | Ajuste incorporado |
| --- | --- | --- |
| Alta | Uma única parte 3D reunia movimento, coleta, memória, avisos e decisão; a parte 2D também concentrava conceitos e sete objetivos podiam aparecer juntos | Partes curtas por tarefa nas duas aulas, recortes de objetivos e uma única entrega final; não foram acrescentadas novas construções |
| Alta | A memória só podia ser comprovada pela resposta da flor, mas não estava definido como avançar da coleta até essa construção | Coleta tem checagem própria; memória e decisão são verificadas juntas depois. Nenhuma parte exige uma regra de uma parte futura |
| Alta | Uma falha no movimento poderia produzir falsas reprovações de coleta, memória e decisão | Dependências explícitas: indicar o problema observado e os testes que ainda não puderam terminar; distinguir falha técnica |
| Média | “Faça o jogo começar sem regador” podia sugerir retirar o objeto da cena | O objetivo agora diz que o personagem ainda não recolheu o regador; o objeto permanece disponível no início |
| Alta | “Recomeçar” não distinguia nova partida de restauração do projeto; mudar posição depois de coletar também não tinha orientação clara | Nova partida conserva blocos e posição editada. Pedir novo teste após editar e manter a entrada original como referência entre sessões |
| Média | O quiz repetia a relação coleta/decisão e deixava ponto de vista principalmente como alternativa errada de uma pergunta sobre altura | Pergunta 3 agora avalia diretamente mudar a vista sem mover o objeto; posição continua avaliada nos dois projetos |
| Média | Todas as respostas corretas estavam na primeira alternativa, apesar da instrução para variar depois | Gabaritos distribuídos no próprio texto; explicações por erro atualizadas, sem depender da ordem para identificar a resposta na implementação |
| Média | A ajuda de alcance citava altura sem distinguir 2D e 3D, e um sintoma podia ser atribuído à memória sem evidência | Falas por dimensão e recuperação que confere encontro, existência da regra, memória e decisão sem inventar causa |
| Alta | Aceitar soluções equivalentes e textos livres poderia ser interpretado como exigir análise semântica geral, IA ou comparação visual exata | Delimitadas equivalências básicas a testar, atualização de mensagens verificável e pares/clipes conhecidos; significado do texto recebe leitura qualitativa |
| Média | A liberdade de aparência e a decoração não tinham contratos suficientemente claros para o contato e o teste de limite 2D | Pares de flor e variantes compatíveis; área 2D livre até as bordas; oclusão da pergunta de câmera restrita à cena do quiz |

Foi acrescentado um roteiro consultável de testes: andar/parar, visitar a flor antes da coleta, coletar e visitar depois, iniciar outra partida e retestar em outro lugar. Esse roteiro orienta a exploração e não cria novas obrigações de clique. O quiz também passou a explicitar a restauração da cena inicial em uma nova tentativa, preservando os acertos das outras perguntas.

A proposta reforça que todas as versões do projeto usam apenas Programação básica e as extensões Jogo 2D/3D, incluindo a referência jogável e a preparação. Não há novos pré-requisitos, certificado ou exigência de produzir arte.

## O que as revisões não comprovam

A proposta tem critérios de implementação e de ensaio, mas ainda não há projeto do Jardim, artes finais, quiz executável, avaliador específico ou material de produção para testar. A análise de dependência entre memória e decisão precisa ser implementada e validada; não foi declarada uma capacidade existente só por constar no documento.

Na próxima etapa, o protótipo deve mostrar a qualidade visual, a clareza dos objetivos, a ajuda e as quatro perguntas. A implementação precisará verificar soluções equivalentes, falhas previstas, salvamento, retorno da ajuda, importação e comportamento real dos modelos. O ensaio com iniciantes avaliará se a liberdade e a ajuda sustentam a aplicação dos conhecimentos sem transformar a missão em outra cópia obrigatória.

Referências visuais e critérios de produção estão na [direção de arte](direcao-de-arte.md). Rastreabilidade, aulas e critérios completos estão na [proposta revisada](proposta.md).
