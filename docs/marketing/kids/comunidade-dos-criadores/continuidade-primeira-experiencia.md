# Oferta de continuidade para famílias que já conhecem a plataforma

Análise e proposta de 01/10/2026. Base: repositório local, pesquisas e decisões já registradas nesta pasta. Não houve consulta à oferta de produção, teste de conversão nem conferência do catálogo de staging nesta etapa. Esta entrega propõe a página; não altera rotas, mensagens, condições comerciais ou permissões.

Atualização posterior em 01/10/2026: a página e os convites internos foram implementados localmente. Consulte o [registro de implementação](implementacao-continuidade.md). As seções abaixo conservam a análise que fundamentou a decisão.

Texto completo: [página E, continuidade](copy/pagina-e-continuidade.md). Demonstrações e respostas ilustradas: [mapa de provas](continuidade-provas-visuais.md).

## A decisão recomendada

Criar uma página própria em `/kids/comunidade-dos-criadores/oferta/continuar`, destinada ao responsável cuja família já conhece o Sistema Zero Kids. Ela será o destino comum dos convites para contratar a Comunidade dentro da plataforma. Também poderá receber visitantes de mensagens de continuidade, inclusive depois do Desafio e do curso Cadê Todo Mundo oferecido por embaixadores.

O assunto principal é a passagem de uma experiência inicial para uma assinatura: o que se acrescenta, como continuar, o que permanece na conta e por que essa organização merece um lugar na rotina da família.

**Não estamos acrescentando um quinto avatar.** As quatro motivações continuam válidas. Esta página atende a um estágio de relacionamento que atravessa todas elas. Uma família que chegou pelo Cadê Todo Mundo pode valorizar desenho, jogos, aprendizagem no tempo de tela ou formação tecnológica. A origem, sozinha, não identifica a motivação dominante.

Ter conta também não comprova que a criança começou, concluiu, gostou ou aprendeu. A abertura precisa funcionar para quem só conheceu parte da plataforma. Por isso, a promessa recomendada é:

> Seu filho pode continuar criando jogos e experimentando as próprias ideias.

O apoio apresenta o mecanismo e a consequência: aulas guiadas, ferramentas e ajuda reunidas; continuidade na mesma conta; projetos que a família pode conhecer. Evitamos anunciar que o primeiro jogo ficou pronto a todo visitante.

## Por que uma página própria

| Alternativa | Vantagem | Limitação | Decisão |
| --- | --- | --- | --- |
| Página A com um aviso de origem | Reaproveita a página existente. | Mantém uma conversa de apresentação e deixa as perguntas da continuidade em segundo plano. O aviso atual fala apenas do Desafio. | Insuficiente para o objetivo. |
| Uma página para cada curso de entrada | Pode reconhecer uma experiência muito específica. | Multiplica manutenção, presume um percurso e fragmenta a oferta antes de haver evidência de necessidade. | Possibilidade futura, se dados e diferenças reais justificarem. |
| Página comum de continuidade, com rota própria | Atende as entradas atuais e futuras; permite mostrar o valor adicional da mesma assinatura. | Precisa explicar diferenças entre os cursos e evitar presumir conclusão. | Recomendada. |

### Endereço público, com uso prioritário nos convites internos

O responsável pelo produto confirmou que a página pode ser acessada por qualquer pessoa, sem login ou restrição. A maioria esperada virá de dentro da plataforma, mas abrir o endereço diretamente, encaminhar o link ou usar outro aparelho são situações aceitáveis.

A rota própria define a conversa de continuidade. Ela não precisa provar a origem do visitante nem exibir dados pessoais. A página A continua recebendo tráfego geral; B, C e D continuam atendendo às motivações específicas.

Também foi confirmado que o endereço com `origem=desafio` ainda não chegou à produção e pode ser descartado. Não propomos redirecionamento nem manutenção dessa variação. Na implementação, remover o tratamento especial e atualizar os emissores conhecidos para a rota nova.

## O que sabemos sobre esse visitante

Sabemos a intenção de direcionamento: a família já teve contato com a plataforma. Ainda não há clientes pagantes da Comunidade, conforme informação do responsável pelo produto. Portanto, não existe base para afirmar que esse público converte mais, que prefere o anual ou que reconhece espontaneamente todos os recursos.

| Situação possível | Pergunta que pesa mais | Resposta da página ou do percurso |
| --- | --- | --- |
| Começou uma atividade e quer seguir | “Consigo continuar o que já comecei?” | Mesma conta e perfil, registros preservados e acesso conforme contratação e requisitos. |
| Concluiu um curso e gostou | “O que pode fazer depois?” | Demonstração do próximo passo disponível e do uso das ferramentas conforme a Jornada. |
| Conheceu o Cadê Todo Mundo | “A assinatura é só esse curso por mais tempo?” | Diferença entre matrícula específica e conjunto da Comunidade, sem desvalorizar o curso inicial. |
| Fez o Desafio | “Precisa repetir? O que falta liberar?” | Conclusão e publicação exigida são marcos distintos; consultar a Jornada. |
| Teve dificuldade ou parou | “O que ajuda a resolver o que aconteceu?” | Revisão da aula, Recados e adequação do formato. Não afirmar que pagar resolve dificuldade de aprendizagem. |
| O acesso de entrada venceu | “Perdi o que fiz? Preciso de outra conta?” | Separar prazo de acesso, conservação dos registros e contratação de novo acesso. |
| Só criou conta ou ainda não ativou | “Como começamos?” | Primeiro acesso e orientação continuam prioritários. A oferta pode estar disponível, mas não substitui ativação e início. |
| Já assina a Comunidade | “Por que estão me oferecendo o que já tenho?” | Na plataforma, direcionar para uso, requisitos ou gestão da assinatura. Evitar nova venda desnecessária. |

Essas situações são hipóteses de uso sustentadas pelos fluxos existentes. Não são relatos de entrevistas. Personalizar uma frase de conclusão exigiria estado real e autorizado da conta, não apenas um parâmetro de URL.

## As perguntas que a copy precisa resolver primeiro

1. **O que muda em relação ao acesso que já temos?** Explicar o conjunto contratado e demonstrar o que a família ganha em possibilidades, organização e continuidade.
2. **O que meu filho consegue fazer em seguida?** Mostrar catálogo publicado, requisito e ação disponível. Um mapa de possibilidades futuras não basta.
3. **Ele continua na mesma conta?** Orientar o uso do e-mail do responsável e do perfil existente. Não sugerir cadastro novo.
4. **Por que uma assinatura?** Demonstrar o ciclo recorrente de consultar, construir, testar, guardar, pedir ajuda e continuar. Não apoiar a decisão apenas na chegada futura de cursos.
5. **Se houve dificuldade, o que ajuda?** Explicar o apoio real e a participação inicial da família, sem prometer professor ao vivo ou independência universal.
6. **O que está incluído, o que exige avanço e quais são as condições de cobrança?** Essas três dimensões devem ficar próximas da oferta.

Os argumentos de telas, desenho e formação permanecem, mas deixam de ocupar a abertura inteira. O visitante precisa reconhecer logo que esta conversa leva em conta seu contato anterior.

### Peso dos desejos, dores e objeções

| Dimensão | Principal nesta página | Secundário, mas presente | Prova necessária |
| --- | --- | --- | --- |
| Desejo da criança | Continuar uma criação, experimentar outra regra, ter uma ideia para construir. | Desenhar personagens, compartilhar, personalizar o espaço e explorar recursos posteriores. | Projeto, alteração e resultado; percurso real de acesso. |
| Desejo do responsável | Dar continuidade a uma atividade cujo valor consegue observar. | Aprendizagem no tempo permitido, iniciação tecnológica e interesses diferentes entre irmãos. | Painel ligado a uma produção; dois perfis separados. |
| Dor prática | Não saber o próximo passo ou como retomar. | Horários, salvamento, equipamentos e primeira ajuda. | Jornada, retomada do projeto e acesso à orientação. |
| Objeção de valor | Pagar novamente pelo que parece já ter. | Comparação com ferramentas gratuitas ou outros formatos. | Acesso específico versus assinatura, sem vender como novo um benefício já concedido. |
| Objeção de uso | A criança parar ou ficar travada. | Dependência de adulto, dúvidas sobre aulas gravadas. | Pausa, revisão, pedido de ajuda e observação real de uma tarefa. |
| Objeção de acesso | Assinar e descobrir novos bloqueios. | Créditos, catálogo em preparação e disponibilidade de recursos avançados. | Diferenciar assinatura, marcos da Jornada e uso limitado de IA. |
| Critério de compra | Oferta disponível hoje e adequação à rotina. | Certificado, comunidade, indicação e personalização. | Catálogo conferido, tarefa representativa, condições comerciais. |

## O que a plataforma realmente sustenta

### O curso de entrada e a assinatura têm alcances diferentes

O catálogo versionado define a Comunidade como um conjunto que inclui os cursos Kids publicados, Clube, Mural e ferramentas. O direito comercial de acesso às ferramentas convive com os requisitos da Jornada. A descrição histórica do catálogo, por si só, não comprova prestação de acompanhamento individual nem disponibilidade de todos os cursos previstos.

O Cadê Todo Mundo é um curso extra de entrada, com atividade guiada no Estúdio. Seu projeto trabalha a procura de personagens, visibilidade e contagem. A documentação o situa fora da posição obrigatória da Jornada; a publicação não é condição para concluir esse curso. **Concluir esse extra não equivale a cumprir o curso obrigatório de entrada e sua publicação exigida.**

Nos novos resgates de bolsa, a política versionada concede sete dias de curso e, separadamente, visita permanente ao Mural. Resgates históricos conservam a política registrada. A página comum não deve afirmar que todo visitante recebeu sete dias, que todo acesso veio de compra ou que a assinatura é necessária para manter uma visita ao Mural já concedida.

O Desafio tem outra política de acesso; os termos locais registram trinta dias nas novas compras e preservam condições históricas. Também não se deve transferir esse prazo para o Cadê Todo Mundo.

### A assinatura não pula os marcos

| Situação | Continuidade que podemos explicar | Promessa que não cabe |
| --- | --- | --- |
| Curso específico acessível | Continuar ou rever as atividades incluídas enquanto houver acesso válido. | “Você já tem toda a plataforma.” |
| Cadastro ou assinatura, sem marcos cumpridos | Orientação e recursos previstos nas aulas acessíveis. | “Assinou, ficou tudo liberado.” |
| Curso obrigatório de entrada concluído e publicação exigida cumprida, com acesso contratado | Posto Construtor e uso livre do Estúdio e Pinta nos limites da etapa. | “Qualquer certificado libera todas as ferramentas.” |
| Posto Inventor e acesso elegível | Pensa e ajuda do Zappy, sujeitos a disponibilidade e créditos. | “IA ilimitada para qualquer aluno desde o primeiro dia.” |
| Etapas posteriores | Recursos condicionados ao percurso, incluindo Molda no Explorador de Mundos. | “Todo o percurso anunciado já está alcançável hoje.” |

### A mesma conta preserva a ligação com o que foi feito

A contratação concede direitos de acesso à conta; não existe uma necessidade de refazer o cadastro ou zerar o perfil. A proposta orienta usar o mesmo e-mail do responsável e continuar no perfil da criança. A conferência futura deve demonstrar essa passagem com contas de teste das duas origens.

Preservar registros não significa acesso vitalício às aulas e ferramentas, nem promessa de guardar dados para sempre. Os termos e a política de privacidade governam conservação e exclusão. Também não foi encontrado fundamento para prometer crédito automático de uma compra anterior, extensão do presente ou soma de dias ao novo plano.

## Posicionamento, promessa e argumento

**Quadro:** a criança continuar aprendendo a criar jogos, desenvolver escolhas próprias e ter produções que possa mostrar e explicar.

**Furadeira:** criação guiada por projetos, com orientação e prática integradas, revisão, apoio por mensagens, registros e progressão. A continuidade acontece dentro de uma conta que a família já conhece.

**Decorados prioritários:** ter algo novo para experimentar numa criação; retomar sem reorganizar ferramentas e arquivos toda vez; conseguir mostrar o que mudou; o adulto encontrar uma referência concreta para conversar; os irmãos seguirem percursos próprios.

**Referência de comparação:** um ambiente organizado para continuar criando. A decisão envolve a organização da experiência e o uso do conjunto, além do acesso a aulas. Ferramentas gratuitas podem atender outras famílias; aulas ao vivo têm outra dinâmica de apoio. Não precisamos desqualificá-las.

**Promessa da abertura:** “Seu filho pode continuar criando jogos e experimentando as próprias ideias.”

**Superpromessa:** a combinação dessa frase com a explicação de como aulas, ferramentas e ajuda sustentam novos projetos, na mesma conta, com avanços que a família pode conhecer. Mantemos a definição operacional registrada em [promessas e superpromessas](promessas-e-superpromessas.md), sem atribuir ao Fluxo Criativo uma fórmula que não foi encontrada.

### Sequência recomendada para a página

| Trecho | Trabalho persuasivo | Demonstração |
| --- | --- | --- |
| Abertura | Reconhecer familiaridade e apresentar a continuidade. | Curso e projeto da mesma conta, sem afirmar satisfação. |
| O próximo passo | Transformar “mais conteúdo” em uma nova escolha que pode ser construída. | Alteração de regra e resultado. |
| O que a assinatura acrescenta | Explicar a passagem de acesso específico para o conjunto integrado. | Comparação real dos acessos, catálogo e recursos. |
| Mesma conta e requisitos | Resolver repetição, Cadê Todo Mundo, Desafio e liberações. | Duas contas de teste, marcos e próximo passo. |
| Experiência integrada | Ligar aula, Estúdio, Pinta, ajuda, salvamento e acompanhamento. | Um projeto atravessando as ferramentas. |
| Ritmo e apoio | Defender pausa, revisão, horário e ajuda contextual. | Tarefa, revisão e conversa pelos Recados. |
| Interesses complementares | Incorporar as quatro motivações sem quatro novas vendas. | Personagem, regra, explicação e painel. |
| IA e continuidade posterior | Explicar autoria e recursos adicionais com condições. | Pensa, Zappy e ação feita pela criança. |
| Comunidade e família | Mostrar compartilhamento, convivência e dois percursos. | Mural, Clube, painel e perfis. |
| Valor e planos | Relacionar recorrência ao uso do conjunto e esclarecer cobrança. | Oferta vigente, requisitos e gestão. |
| Respostas práticas | Resolver cada questão separadamente, junto da prova pertinente. | Recortes e sequências do mapa visual. |
| Fechamento | Convidar a decidir pelo próximo passo disponível. | Retorno aos planos, sem urgência inventada. |

O texto completo mantém as respostas comuns necessárias para a página ser independente. Elas serão agrupadas em acordeões; a existência da biblioteca não exige abrir todos os textos e prints simultaneamente.

## Como a rota deve se relacionar com os links existentes

Esta é uma proposta para a futura implementação. O caminho `/oferta/continuar` ainda não foi criado nesta entrega.

| Origem | Situação local encontrada | Destino ou tratamento proposto |
| --- | --- | --- |
| Convites internos para a assinatura | Constante `COMUNIDADE_OFERTA_URL` aponta para `/oferta`. | Usar a rota de continuidade como destino comum desses convites. |
| Mensagem de conclusão do Desafio | Serviço aponta para `/oferta?origem=desafio`. | Atualizar diretamente para `/oferta/continuar`; descartar o parâmetro antigo. |
| Mensagem de acesso expirado | Serviço aponta para `/oferta`, sem contexto. | Usar continuidade; não afirmar que concluiu. |
| Cadê Todo Mundo por embaixador | Acesso de entrada e visita ao Mural têm políticas próprias. | Oferecer continuidade ao responsável, respeitando os direitos já concedidos. |
| Falta de ativação ou primeiro acesso | Fluxos levam à recuperação de senha ou aos perfis. | Preservar esses destinos funcionais. |
| Falta de requisito, com assinatura ativa | Jornada distingue recurso incluído de marco ainda não cumprido. | Levar à etapa necessária; não oferecer outra assinatura como solução. |
| Gestão, cancelamento, suporte ou falha de pagamento | São tarefas específicas. | Manter o destino da tarefa. “Todos os links” significa todos os convites de venda pertinentes. |

Remover o tratamento específico de `origem=desafio` e os links que o geram. Não criar redirecionamento especial para essa variação. Parâmetros válidos de campanha e indicação continuam seguindo os mecanismos existentes; não serão responsáveis por escolher a copy principal. As páginas A–D mantêm suas rotas e funções.

Não incluir nome, e-mail, idade ou progresso da criança na URL. Não inferir que um clique veio de embaixador somente porque abriu esta página. A atribuição deve continuar usando os mecanismos já existentes e seus registros válidos.

### Ajustes de coerência encontrados para a etapa de implementação

1. **Bloqueio de produto:** o componente atual diz que, ao entrar na Comunidade, “fica tudo liberado”. Isso conflita com a política de progressão. O convite precisa distinguir falta de assinatura de falta de requisito e falar ao responsável sobre contratação.
2. **Template de conclusão:** o texto versionado menciona “uma pessoa lendo o que ela envia”. A nova página descreve ajuda por mensagens, sem revisão universal de toda produção. Confirmar a operação e alinhar a promessa antes de reutilizar o template. O arquivo de seed não comprova qual mensagem está ativa em produção.
3. **Catálogo e termos:** há descrições de acompanhamento do professor pelas atividades enviadas. Essa diferença precisa de alinhamento entre entrega, termos e comunicação; a nova copy não altera nem substitui obrigações existentes.
4. **Faixa etária:** a entrada por bolsa foi descrita para 8 a 15 anos; a oferta da Comunidade trabalha 9 a 14. Ter recebido o curso não comprova adequação automática à assinatura. Preservamos a recomendação atual e acrescentamos uma resposta específica, sem ampliar a faixa por conta própria.
5. **Prova de continuidade:** ainda falta demonstrar, com contas representativas, o que já existe antes e o que se acrescenta depois. Um print de administrador não serve para provar o acesso de um aluno.

Esses achados são problemas de coerência a resolver; não foram corrigidos em código ou contratos nesta entrega.

## Evidências e limites

| Fonte local | O que sustenta |
| --- | --- |
| [Política de bolsa](../../../../packages/referrals/src/domain/gift-policy.ts) e [regras do serviço de indicações](../../../../packages/referrals/CLAUDE.md) | Prazo dos novos resgates e separação da visita ao Mural; condições históricas. |
| [Resgate da bolsa](../../../../packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts) | Concessões separadas e aproveitamento da conta existente. |
| [Roteiro do Cadê Todo Mundo](../../../aulas-interativas/modulos-cade-todo-mundo.md) | Conteúdo, curso extra e publicação opcional; roteiro não comprova que toda revisão já foi publicada. |
| [Teste de acesso dos cursos na Jornada](../../../../packages/members/tests/integration/journey-course-access.test.ts) | Matrícula no curso extra pode dar acesso sem conclusão da entrada obrigatória; arquivo inspecionado, não reexecutado nesta etapa documental. |
| [Estado da Jornada](../../../../packages/core/src/journey/state.ts) e [catálogo de marcos](../../../../packages/core/src/journey/catalog.ts) | Direito de acesso, requisitos, publicação e disponibilidade são dimensões distintas. |
| [Catálogo inicial versionado](../../../../packages/catalog/scripts/seed.ts) | Composição prevista da assinatura; não é inventário confirmado do catálogo ativo. |
| [Concessão de acesso](../../../../packages/members/src/application/grant-entitlement/grant-entitlement.service.ts) | Direitos concedidos à conta a partir da oferta. |
| [Convites internos](../../../../packages/community-kids/src/lib/links.ts) e [bloqueio de produto](../../../../packages/community-kids/src/components/kids/kids-locked-product.tsx) | Destino atual e promessa de liberação que exige revisão. |
| [Ciclo do Desafio](../../../../packages/members/src/application/challenge-lifecycle/send-challenge-lifecycle.service.ts) e [avisos de vencimento](../../../../packages/members/src/application/renewal-reminder/send-renewal-reminders.service.ts) | Entradas que hoje chegam à oferta geral ou ao parâmetro antigo. |
| [Templates versionados](../../../../packages/messaging/scripts/seed-templates.ts) | Mensagens candidatas a alinhamento; não confirma conteúdo ativo em produção. |
| [Termos locais](../../../../packages/funnel/src/content/legal-kids.ts) | Condições de acesso, conservação, contratação e garantia; não houve revisão jurídica nesta análise. |
| [Inventário](inventario-plataforma.md), [deck](deck-argumentacao.md), [estratégia](estrategia-paginas.md) e [diretrizes](diretrizes-copy.md) | Recursos, motivações, limites de prova e voz definidos na pesquisa anterior. |

## Como avaliar a proposta depois

Antes de publicar, conferir o catálogo realmente acessível, os marcos alcançáveis, as condições comerciais e a passagem na mesma conta. Capturar as demonstrações descritas no mapa visual e resolver a divergência sobre acompanhamento. Preservar a estética das páginas atuais e substituir prévias ilustrativas por capturas reais identificáveis.

Na avaliação comercial, separar pelo menos origem conhecida, experiência iniciada e experiência concluída quando esses dados já existirem e puderem ser usados adequadamente. O clique em um link interno não prova conclusão. Também distinguir primeira contratação de acesso já ativo.

O resultado principal é contratação aprovada por visitante elegível da oferta. Cliques nos planos e início de checkout ajudam a localizar dificuldades, mas não comprovam vendas. Depois, acompanhar uso, pedidos de ajuda, cancelamentos e reembolsos para saber se a expectativa apresentada corresponde à experiência.

Sem volume e histórico de vendas, não fixamos aumento esperado nem um tamanho de amostra inventado. A primeira validação pode combinar dados de navegação com conversas sobre três pontos: o que a pessoa entendeu que ganharia, o que espera fazer em seguida e o que ainda impede a decisão.

## Situação desta entrega

A análise, a proposta integral de copy e o mapa de provas estão documentados. A rota própria, a retirada do parâmetro antigo, a alteração dos links internos e as capturas de staging pertencem à próxima etapa. Esta proposta não executa essas mudanças nem envia mensagens.

### Revisão realizada

A versão inicial foi submetida ao [review de continuidade](revisao-continuidade-2026-10-01.md). A revisão editorial 2 aplica seus ajustes de argumento, ordem e linguagem: próximo passo concreto nas ferramentas após os requisitos, comparação de acesso, integração antecipada e 50 respostas organizadas por decisão. A dificuldade na atividade e a perda de interesse estão separadas. A garantia informa prazo a partir da compra, e-mail e termos; o início da assinatura ganhou uma resposta própria. O mapa visual foi atualizado para todas as perguntas.

O verificador local de Light Copy foi executado sobre o arquivo comercial e terminou sem ocorrências. A conferência documental validou os links locais dos cinco documentos envolvidos, as âncoras únicas, o vínculo de cada resposta com o mapa visual e os três campos dinâmicos de preço. Essas verificações não equivalem a aprovação de conversão, teste do checkout ou execução das capturas propostas.

## Evidência e decisão na atualização editorial 2

A atualização da copy preserva a distinção entre acesso incluído e avanço da criança. Para responder ao que vem depois, desenvolve uma atividade possível no posto Construtor: desenho no Pinta, arte no Estúdio, regra de movimento, teste e retomada. O exemplo é uma possibilidade das ferramentas liberadas, não o anúncio de um novo curso publicado nem a afirmação de que toda criança já tem esse acesso.

A conferência das fontes encontrou diferenças relevantes: o banco local consultado contém um curso Kids publicado, “Programação para crianças”, sem a posição de carreira do percurso atual; a captura local de catálogo mostra “Nave Contra Asteroides”, “O jogo do meu jeito” e “Corre, Dino!”, em perfil de teste; o roteiro atual do Desafio apresenta “A Chave do Farol” e registra vídeos ainda por gravar. Esses materiais não bastam para confirmar o catálogo acessível a um aluno comum. Por isso, a copy não anuncia esses títulos como próximos cursos disponíveis.

O responsável pelo produto esclareceu a estrutura comercial: só há ofertas próprias para Cadê Todo Mundo, Desafio do Primeiro Jogo e Comunidade dos Criadores. Os demais cursos pertencem à Comunidade e recebem novos lançamentos, sem oferta avulsa para cada título. A copy agora explicita que os cursos incluídos e os novos publicados durante o plano não exigem uma compra separada. Essa decisão não fixa calendário de lançamentos nem confirma o estado de publicação de um título específico; não foi usada para prometer aulas futuras como prontas.

As capturas inspecionadas de Pinta, importação e materiais demonstram parte da integração. Faltam validar a sequência completa e os requisitos com contas comuns das duas origens. O [mapa visual](continuidade-provas-visuais.md) registra o que já foi observado e o que continua pendente. A diferença entre a descrição de acompanhamento nos termos e a operação confirmada também permanece como item de alinhamento antes de publicação.

O período da assinatura foi conferido na entrada de pagamento e no serviço de concessão: começa na data do pagamento e não soma automaticamente o prazo restante do curso anterior. A redação agora explica isso; a verificação visual do resumo contratual e das datas pertence à implementação.
