# Review da copy de continuidade

Data: 01/10/2026. Objeto: [página E, continuidade](copy/pagina-e-continuidade.md), [análise da oferta](continuidade-primeira-experiencia.md) e [mapa de provas](continuidade-provas-visuais.md). As referências de linha abaixo correspondem ao texto examinado nesta data.

Escopo original: revisão editorial e conferência de afirmações contra fontes locais, preservando a copy durante o review. As referências de linha e os trechos citados abaixo pertencem à versão anterior.

**Atualização posterior, autorizada pelo responsável pelo produto:** os ajustes editoriais foram aplicados à [copy de continuidade](copy/pagina-e-continuidade.md), versão 2. O resultado tem 50 respostas, novo argumento de abertura, comparação entre curso e assinatura, exemplo de continuidade nas ferramentas e instruções comerciais mais diretas. O [registro de aplicação ao fim deste documento](#aplicacao-da-revisao) distingue as mudanças feitas das provas e decisões que continuam pendentes. A rota e os componentes da página não foram implementados nesta etapa.

## Parecer

A copy tem boa cobertura, explica os recursos e respeita várias condições importantes. Seus melhores trechos mostram uma criação passando pelo desenho, pela programação, pelo teste e pela conversa com a família. A explicação sobre autoria e inteligência artificial também está desenvolvida.

**O maior problema é que a página promete continuidade, mas ainda não mostra um próximo passo atual e identificável.** Em diferentes pontos, pede que a família confira o catálogo ou a Jornada. Essa conferência precisa se transformar numa demonstração dentro da própria oferta.

O segundo problema é de argumentação: boa parte do que a assinatura apresenta também pode ter sido conhecido no acesso inicial. Explicar recursos novamente não basta para demonstrar o que a contratação acrescenta. Precisamos tornar essa diferença visível e desejável.

Eu revisaria esses pontos antes de levar o texto à implementação. O objetivo é preservar a profundidade, melhorar a ordem dos argumentos e reduzir a linguagem administrativa que aparece antes de o valor ficar claro. Não há dados para afirmar que a copy atual converte mal ou que as sugestões aumentarão vendas.

## Método e materiais utilizados

A revisão aplicou o material pertinente importado do Fluxo Criativo:

- Papéis de [copywriter](../../../../.claude/agents/copywriter.md) e [revisor de marketing](../../../../.claude/agents/revisor-marketing.md), com três leituras independentes: argumento, voz e respostas, verdade da oferta e provas.
- Skills [copy-funil](../../../../.agents/skills/copy-funil/SKILL.md), [revisao-copy](../../../../.agents/skills/revisao-copy/SKILL.md) e [estrategia-produto](../../../../.agents/skills/estrategia-produto/SKILL.md), com coordenação de marketing e apoio de copywriting e humanizer.
- [Regra local de marketing](../../../../.claude/rules/marketing.md), [funções da página derivadas do Fluxo](../../../../.agents/skills/copy-funil/references/pagina-e-jornada.md) e [regras canônicas de Light Copy](../../../../packages/marketing/src/domain/copy/light-copy-rules.ts).
- Critérios de [análise de marketing](../../../../.agents/skills/analise-marketing/SKILL.md) para separar observação, hipótese e resultado comercial.
- Contexto, posicionamento, deck e decisões já registrados nesta pasta. Não foi necessário pesquisar concorrentes novamente para avaliar estes problemas.

Foram usados os papéis e métodos pertinentes ao review. Agentes de anúncios e conteúdo editorial não acrescentariam evidência à leitura desta página. Os padrões genéricos de copywriting e humanizer foram subordinados à voz e às condições locais, sem importar promessas, perguntas de gancho ou resultados inventados.

## Prioridades

| Prioridade | Achado | Natureza | Ação |
| --- | --- | --- | --- |
| Alta | A página não mostra qual continuidade está disponível agora. | Lacuna de conteúdo e de prova. | Conferir catálogo e demonstrar um próximo passo alcançável por origem e estado. |
| Alta | O valor adicional sobre o curso de entrada fica genérico. | Argumentação. | Comparar o acesso anterior com a assinatura, distinguindo o que permanece do que se acrescenta. |
| Alta para finalizar a oferta | Garantia tem canal indireto e não informa o início da contagem. | Informação prática. | Informar prazo a partir da compra, contato acionável e link dos termos vigentes. |
| Média | A abertura destaca percurso e regras mais que uma criação desejável. | Promessa e voz. | Trazer escolhas, teste e produção para a primeira tela. |
| Média | Requisitos reaparecem sem acrescentar explicação. | Organização. | Concentrar a explicação completa e manter a condição específica junto da promessa pertinente. |
| Média | A integração mais forte aparece depois de vários parágrafos administrativos. | Demonstração. | Antecipar um projeto atravessando as ferramentas. |
| Média | Falta esclarecer o início da assinatura quando o curso ainda está válido. | Condição de contratação. | Acrescentar uma pergunta própria, conferindo contrato e checkout. |
| Média | Dificuldade de execução e perda de interesse dividem uma resposta. | FAQ. | Separar as preocupações e suas soluções. |
| Média | Exceções aparecem antes de dúvidas centrais e algumas respostas demoram a responder. | Hierarquia e clareza. | Reordenar a consulta e começar pela resposta direta. |
| Média | Parte do vocabulário soa como documentação interna. | Humanização. | Traduzir termos sem eliminar condições. |
| Média, antes de publicar | Termos e catálogo usam uma promessa de acompanhamento mais ampla que a explicação da página. | Coerência da oferta. | Confirmar a operação e alinhar os materiais, sem inventar revisão individual. |

As prioridades são editoriais e operacionais, não estimativas de impacto percentual na conversão.

## 1. A principal pergunta da continuidade é devolvida ao leitor

**Trechos:** linha 123, “confira o que seu filho pode fazer agora”; linha 161, “confiram se ela está disponível”; linhas 293 e 295, orientação para consultar catálogo; linha 587, “Conheçam o próximo passo disponível”.

**Problema observado:** a página não identifica uma próxima atividade publicada nem oferece um caminho direto para conhecer essa continuidade. As cenas de personagem, estrelas e placar demonstram conceitos possíveis. Elas não comprovam o que a criança que chega hoje poderá fazer em seguida.

Isso importa porque “o que vem depois?” é uma pergunta central deste visitante. O aviso de que existem requisitos é necessário, mas não responde sozinho à decisão de compra.

**Melhoria:** acrescentar uma demonstração intitulada, por exemplo, **“O que seu filho pode fazer agora”**. Ela precisa mostrar uma situação real de entrada, o próximo passo acessível, a ação da criança e a criação que resulta daquela atividade. O nome do curso, a disponibilidade e os requisitos precisam ser conferidos no catálogo efetivamente publicado.

Usar situações distintas quando necessário: Cadê Todo Mundo concluído como extra; Desafio em andamento; entrada obrigatória concluída com publicação pendente; requisitos do uso livre cumpridos. Não afirmar que todo visitante está em um desses estados específicos.

O convite “Ver como a experiência continua” pode levar a essa demonstração. A página deve permitir entender a proposta antes de exigir que a pessoa saia para investigar por conta própria.

**Prova:** sequências C02, C03, C04 e C09 do mapa visual. Elas estão planejadas, não executadas. A pendência não demonstra que faltam cursos; demonstra que esta peça ainda não comprova a continuidade anunciada. Não resolver com nome de curso futuro ou captura administrativa que contorne os requisitos.

## 2. A assinatura precisa mostrar o que acrescenta ao acesso anterior

**Trechos:** linha 29, “determinadas aulas, atividades e recursos”; linhas 155 a 159, argumento do “uso desse conjunto”; linha 169, novo resumo dos recursos incluídos.

**Problema observado:** aula integrada, projetos e parte da orientação podem já fazer parte do curso de entrada. O leitor pode reconhecer os recursos e continuar sem entender por que contrataria uma assinatura. A comparação com um tutorial ou uma ferramenta isolada responde melhor a um visitante frio do que à objeção “isso eu já vi aqui”.

**Melhoria:** substituir a comparação genérica principal por uma explicação verificável de três dimensões:

| Dimensão | O que a página deve deixar claro |
| --- | --- |
| O acesso que a família já recebeu | Quais aulas e recursos aquela oferta inclui e qual é seu prazo. Não presumir uma política igual para todos. |
| O que a assinatura acrescenta | Cursos publicados incluídos, continuidade de acesso e recursos elegíveis, com as condições específicas da Jornada. |
| O que permanece | Conta, perfil, registros e direitos anteriores, conforme suas condições próprias. |

Título proposto: **“O que a Comunidade acrescenta ao acesso que sua família já tem”**.

Depois, explicar por que o conjunto tem uso continuado: a criança consulta a orientação, constrói uma parte, testa uma mudança, guarda o trabalho e volta para desenvolver outra escolha. Cada recurso deve resolver uma necessidade dentro dessa sequência.

Esse argumento não deve depender de promessas de lançamento. Também não cabe sugerir que a assinatura compra novamente uma visita ao Mural já concedida, nem usar o medo de perder projetos para pressionar a contratação.

**Prova:** C01, C02, C09, C13 e C15, com acesso real de aluno. A comparação final depende da conferência das duas experiências de entrada.

## 3. A abertura está correta, mas pouco concreta

**Trechos:** linha 1, “Seu filho tem um caminho para continuar criando jogos”; linha 3, “com as liberações da Jornada”; linha 5, “Um percurso para aprender, experimentar e voltar às próprias criações”.

**Problema observado:** “caminho” e “percurso” apresentam organização. Ainda explicam pouco o resultado que a criança quer experimentar e que o responsável quer reconhecer. A superpromessa traz recursos, mas termina numa consequência abstrata: “produções que você pode acompanhar”.

O posicionamento já tem consequências melhores: conhecer uma escolha feita pela criança, experimentar um jogo que ela ajudou a construir e ouvir sua explicação. Essas cenas aparecem mais adiante e podem participar da abertura.

**Direção de redação para a próxima versão:**

> **Seu filho pode continuar criando jogos e experimentando as próprias ideias.**
>
> Na Comunidade dos Criadores, ele encontra aulas guiadas, ferramentas para construir e ajuda por mensagens quando surge uma dúvida. Vocês continuam na mesma conta, com projetos que ele pode testar, melhorar e mostrar à família.

Essa alternativa explicita o resultado e o mecanismo. As condições de uso livre precisam permanecer visíveis na explicação próxima, sem transformar a primeira frase numa apresentação dos nomes internos da Jornada. O exemplo não presume conclusão, satisfação ou domínio anterior.

É uma hipótese editorial. Não existe teste que torne essa manchete uma vencedora. A escolha final deve acompanhar a demonstração real do próximo passo, que ainda precisa ser conferida.

## 4. A transparência virou repetição em vários trechos

**Locais:** hero; apresentação das ferramentas; continuidade na mesma conta; Cadê Todo Mundo; integração; interesses; Jornada; IA; irmãos; resumo dos planos.

**Problema observado:** as condições aparecem em muitos pontos com palavras semelhantes. “Conforme a Jornada”, “recursos liberados”, “requisitos” e “percurso” às vezes retomam uma restrição sem acrescentar uma informação útil naquele momento.

A copy tem aproximadamente 7,1 mil palavras, sendo cerca de 2,7 mil antes do FAQ e 4,3 mil nas respostas. Há 23 ocorrências de “Jornada” e 16 de “requisitos”. Essas contagens descrevem o material; não estabelecem que determinada quantidade seja excessiva. O problema é a função de cada repetição.

**Melhoria:** explicar a relação entre contratação e progressão num bloco visual próprio, com início guiado, requisitos da entrada obrigatória, uso livre do Estúdio/Pinta e recursos posteriores. Nos blocos seguintes, manter apenas a condição pertinente àquela possibilidade.

No trecho do Cadê Todo Mundo, reconhecer primeiro o que permanece registrado e então explicar a etapa obrigatória. Isso evita apresentar a primeira experiência principalmente pelo que ela não libera.

Exemplo:

> Se seu filho concluiu o Cadê Todo Mundo, essa conclusão continua registrada no perfil. Para chegar ao uso livre do Estúdio e do Pinta, ele precisa cumprir a entrada obrigatória da Jornada e publicar o projeto exigido.

Não esconder requisitos numa nota distante. As respostas do FAQ precisam funcionar isoladamente, portanto uma condição necessária pode continuar aparecendo nelas.

## 5. A integração merece aparecer antes e com um projeto reconhecível

**Trecho forte:** linhas 65 a 73, personagem no Pinta, regras no Estúdio, teste e ajuste visual. Complemento: linhas 91 a 99, painel e conversa sobre a criação.

**Oportunidade:** esses trechos demonstram a principal força da plataforma. Contudo, o leitor passa antes pela apresentação abstrata do conjunto e pela administração do acesso. Preservar conta e progresso resolve uma objeção; ver um projeto atravessar as ferramentas torna o benefício desejável.

**Melhoria:** antecipar uma versão curta dessa sequência após a explicação do que a assinatura acrescenta. Usar o mesmo personagem e o mesmo projeto em cada etapa:

1. A orientação apresenta a ação.
2. Uma escolha visual aparece no personagem.
3. A criança monta uma regra no Estúdio.
4. O jogo mostra o efeito da regra.
5. O responsável localiza a criação e pode pedir que a criança mostre a escolha.

Se a passagem pelo Pinta exigir um marco posterior, identificá-lo ao lado da demonstração. Não representar toda essa sequência como imediatamente disponível a qualquer conta.

**Prova:** C05, C06 e C08. Um print de cada ferramenta, com projetos diferentes, não demonstra a integração. Um print de painel também não comprova compreensão. Para afirmar que uma criança realizou uma tarefa com determinado apoio, é necessária observação real daquela experiência, com uso autorizado do registro.

## 6. A garantia precisa de uma resposta mais acionável

**Trechos:** linhas 193 e 579, “pelo canal indicado nos termos”. O texto informa sete dias, mas não explicita a partir de quando são contados.

**Problema observado:** existe uma orientação concreta na fonte local e ela foi substituída por uma referência genérica. A pessoa precisa procurar os termos e localizar o canal sozinha. Não é necessário deixar essa informação vaga para preservar segurança factual.

Os [termos Kids locais](../../../../packages/funnel/src/content/legal-kids.ts), seção 8, registram sete dias corridos a partir da compra e solicitação por e-mail. O [contato definido no conteúdo legal](../../../../packages/funnel/src/content/legal.ts) é `contato@sistemazero.com.br`. A revisão verifica a informação versionada, não a operação da caixa de atendimento.

**Redação proposta para a resposta prática:**

> Na primeira contratação da Comunidade, você pode pedir o reembolso integral em até sete dias corridos a partir da compra. Envie a solicitação para contato@sistemazero.com.br e informe o e-mail usado na compra.
>
> Esse prazo também vale para cada nova contratação anual por Pix. As renovações automáticas no cartão seguem as condições dos termos. Pedir reembolso e cancelar a próxima renovação são ações diferentes.

Na implementação, tornar o e-mail acionável e ligar os termos vigentes em `/kids/termos`. Preservar a resposta independente sobre cancelamento, que já indica “Minhas compras”. Essa é uma melhoria de clareza da oferta existente, não uma nova interpretação jurídica ou alteração de política.

## 7. Falta explicar quando começa a assinatura se o curso ainda estiver válido

**Local relacionado:** perguntas sobre curso em andamento e valor de compra anterior, linhas 249 e 281. Nenhuma responde ao início do novo período.

**Por que importa:** uma família com dias restantes do acesso inicial pode entender que a assinatura começará depois ou que aqueles dias serão somados. Isso é diferente de perguntar se o valor de um curso vira desconto. As dúvidas precisam ficar separadas.

Na fonte local, a [entrada de concessão de acesso](../../../../packages/members/src/interfaces/http/routes/webhooks.routes.ts) usa a data do pagamento, e o [serviço de concessão](../../../../packages/members/src/application/grant-entitlement/grant-entitlement.service.ts) calcula a validade da assinatura a partir dessa data e do intervalo. Esse cálculo não soma o saldo de dias do curso de entrada. Isso sustenta uma lacuna na explicação; não foi demonstrado um bug de cobrança.

**Pergunta proposta:** “Se eu assinar agora, o período começa agora ou depois do prazo do curso?”

**Direção de resposta:** informar o início com a aprovação do pagamento e explicar que os dias restantes do acesso ao curso não são acrescentados automaticamente ao plano. Antes de publicar essa formulação, conferir que contrato, checkout e confirmação exibem a mesma condição. A carência técnica não deve ser anunciada como dias extras do plano.

Acrescentar ao mapa visual uma demonstração das datas do curso anterior e da assinatura nova em conta de teste. A prova deve tornar visível a independência dos períodos, sem criar uma cobrança real ou simular uma data que a interface não mostra.

## 8. Uma resposta ainda mistura problemas diferentes

**Trecho:** linhas 265 a 269, “Meu filho teve dificuldade no primeiro curso. Como avaliar se deve continuar?”.

A resposta começa com dificuldade para seguir a atividade e depois trata de falta de interesse e necessidade de apoio individual. São motivos distintos, com recursos e decisões diferentes. A separação solicitada nas revisões anteriores deve ser aplicada também aqui.

**Divisão recomendada:**

- **“Meu filho travou numa atividade. Que ajuda ele terá para continuar?”** Explicar revisão, pedido de ajuda com contexto, Recados e participação inicial do adulto. Assinar não torna o atendimento ao vivo.
- **“Ele começou o curso e perdeu o interesse. O que a assinatura muda?”** Explicar como comparar os interesses com uma atividade disponível. O acesso pode se ampliar; não há garantia de motivação por causa da compra.

A necessidade de adaptação ou acompanhamento especializado pode continuar na pergunta própria sobre apoio específico, que já existe. Não é preciso repetir a mesma análise nas três respostas.

Separar essa dúvida aumenta o número de perguntas, e isso é aceitável. A quantidade deve acompanhar as preocupações reais. Não há motivo para manter exatamente 48 por princípio.

## 9. A consulta pode priorizar melhor a decisão

**Situação atual:** depois da primeira pergunta sobre valor adicional, vêm conta, cursos de origem, vencimento, prazo anterior, Mural, dificuldade, idade e abatimento. Só então aparece a pergunta sobre quais cursos entram.

**Problema observado:** a ordem destaca várias exceções antes de concluir a demonstração do valor atual. Acordeões reduzem a área aberta, mas seus títulos continuam orientando a leitura.

**Recomendação:** abrir a consulta com as questões centrais de continuidade: o que se acrescenta, o que está disponível agora, mesma conta, quando as ferramentas ficam disponíveis, ajuda numa atividade e acompanhamento da aprendizagem. Depois, organizar os demais grupos por acesso anterior, ferramentas, uso, participação e contratação.

Manter links ou atalhos claros para preço, garantia e cancelamento, que não devem desaparecer no fim de uma lista longa. A biblioteca pode continuar completa na mesma página.

### Responder primeiro, desenvolver depois

Algumas respostas exigem que o leitor deduza o “sim” ou “não”. Exemplos:

| Pergunta | Início proposto |
| --- | --- |
| “Meu filho já fez o Desafio. Precisa repetir o que concluiu?” | “Não precisa repetir o que já ficou registrado como concluído no mesmo perfil. A Jornada mostra o que falta para avançar, como uma atividade pendente ou a publicação exigida.” |
| “Todas as ferramentas ficam abertas no primeiro dia?” | “Não. No começo, seu filho usa os recursos preparados para cada aula. O uso livre do Estúdio e do Pinta começa depois de concluir a entrada obrigatória e publicar o projeto exigido.” |

O restante da explicação deve continuar desenvolvido. Responder diretamente não significa reduzir dúvidas importantes a uma frase.

## 10. Traduzir o vocabulário interno melhora a naturalidade

| Texto atual | Problema | Direção proposta |
| --- | --- | --- |
| “A assinatura dá acesso ao conjunto contratado” | Expressão administrativa no meio da argumentação. | “A assinatura reúne os recursos da Comunidade.” Em seguida, explicar quais e como ficam disponíveis. |
| “contratação ou concessão válida” | Obriga a família a entender um conceito de gestão de acessos. | “O acesso às aulas depende do prazo do curso ou do plano contratado.” Adaptar à condição efetivamente tratada. |
| “novos resgates”, “concessão separada” | Vocabulário do serviço de indicações. | “Se o convite de vocês inclui visita permanente ao Mural, essa visita continua válida depois que o prazo do curso termina.” Manter a ressalva sobre convites antigos. |
| “de forma assíncrona” | Termo correto, mas dispensável quando a experiência pode ser descrita. | “A equipe responde por mensagens, e seu filho pode precisar aguardar o retorno.” |
| “produções que você pode acompanhar” | Benefício amplo, sem uma cena. | Mostrar o responsável abrindo a criação e pedindo que a criança explique uma mudança. |

Não recomendo eliminar toda ocorrência de “pode”. Ela muitas vezes expressa corretamente uma possibilidade e evita prometer resultado individual. O problema é a repetição de construções vagas, não a palavra isolada.

Também manteria perguntas separadas para internet e salvamento, com funções mais nítidas: conexão explica o que exige internet; salvamento mostra como guardar e reabrir normalmente. A exceção de rascunho local continua onde for necessária, sem repetir o mesmo parágrafo inteiro.

## 11. Alinhar a promessa de acompanhamento entre os materiais

As linhas 83 a 89 e a resposta sobre ajuda descrevem apoio por mensagens. Os termos locais, na seção 2, mencionam “acompanhamento do professor pelas atividades enviadas”, e a descrição versionada do catálogo também fala em professor acompanhando.

Isso não demonstra que a nova copy seja falsa, mas deixa uma diferença de expectativa dentro da mesma oferta. Confirmar a operação e alinhar página, termos e convites é uma dependência para publicação. Não recomendo acrescentar à copy a promessa de leitura de toda produção apenas para coincidir com um texto anterior.

Esse problema já aparecia na análise da continuidade e permanece em aberto. A revisão editorial não substitui a definição do serviço que será prestado nem altera condições contratuais.

### Ajuste pequeno para visitantes novos

Como a rota será pública, a orientação de contratação da linha 201 pode começar por “Se sua família já tem uma conta, use o mesmo e-mail do responsável”. Isso acomoda quem chegou por um link encaminhado sem transformar a página numa apresentação para público frio. O foco em quem já conhece a plataforma deve permanecer.

## O que merece ser preservado

- Público definido pela primeira experiência, sem inventar um quinto avatar ou pressupor conclusão e satisfação.
- Mesma conta e perfil como continuidade, com acesso e progresso tratados separadamente.
- Distinção entre Cadê Todo Mundo e etapa obrigatória da Jornada.
- Desenho, regra, teste e explicação como uma experiência demonstrável.
- Aprendizagem dentro do tempo de tela que a família já permite.
- Defesa das aulas gravadas por pausa, revisão, ritmo e horário, com ajuda por mensagens descrita honestamente.
- Programação e desenho em respostas próprias. A criação com materiais preparados continua explícita.
- Pensa e Zappy explicados separadamente, com uma resposta geral sobre autoria. A dúvida geral pode mencionar ambos porque trata de uma mesma preocupação: o papel da IA na aprendizagem.
- Cancelamento separado de reembolso, mensal separado de anual e limites de créditos explicados.
- Ausência de urgência inventada, culpa dos pais, prova social fabricada ou promessa de independência universal.
- Mapa de prints próximo das afirmações e distinção entre captura de interface e evidência de aprendizagem.

## Ordem recomendada para a próxima versão

1. Abrir com continuidade e criação reconhecível, mecanismo e consequência para a família.
2. Demonstrar um próximo passo disponível, sem afirmar que todos já cumpriram os mesmos marcos.
3. Mostrar o que a assinatura acrescenta ao acesso anterior, com comparação fiel.
4. Apresentar um projeto atravessando orientação, criação, teste e acompanhamento.
5. Explicar mesma conta, diferenças entre entradas e requisitos num bloco claro.
6. Desenvolver ritmo, ajuda e interesses complementares, incluindo telas, desenho e formação.
7. Apresentar participação, dois perfis e recursos posteriores conforme disponibilidade.
8. Relacionar uso recorrente ao plano, com valor, renovação, garantia e início do período claros.
9. Oferecer respostas organizadas por preocupação, com provas próximas e fechamento que retome uma criação possível.

É uma recomendação de hierarquia, não a imposição de nove seções visuais. O design e a identidade local permanecem como referência.

## Conferências factuais e limites

A leitura das fontes locais sustenta a composição da assinatura, os dois perfis, as condições de pagamento descritas, os marcos de ferramentas independentes da compra, Cadê Todo Mundo como extra e visita ao Mural com concessão própria. Não foi encontrada, nesta revisão, base para retirar essas condições da copy.

Fontes complementares: [estado da Jornada](../../../../packages/core/src/journey/state.ts), [catálogo versionado](../../../../packages/catalog/scripts/seed.ts), [política de bolsas](../../../../packages/referrals/src/domain/gift-policy.ts), [resgate de bolsa](../../../../packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts), [roteiro do Cadê Todo Mundo](../../../aulas-interativas/modulos-cade-todo-mundo.md) e [termos Kids](../../../../packages/funnel/src/content/legal-kids.ts). Código, testes e roteiros documentam a implementação e a intenção; não certificam o catálogo ativo nem a operação de atendimento.

O linter canônico de Light Copy foi executado novamente no texto integral e retornou **zero ocorrências mecânicas**. Isso não invalida os problemas editoriais encontrados. As regras de promessa concreta, tese, consequência e linguagem natural exigem leitura humana e não são resolvidas por esse resultado.

Não houve captura nova, acesso de aluno em staging, teste funcional de compra, envio de mensagens ou experimento de conversão. A rota pública `/oferta/continuar`, sem login, e o descarte de `origem=desafio` continuam sendo as decisões registradas para a implementação.

## Como validar as melhorias

Primeiro, fechar a evidência do próximo passo e a diferença entre os acessos. Depois, conferir se um responsável consegue explicar, após ler a página, o que a assinatura acrescenta, o que a criança pode fazer agora, como recebe ajuda e quais são as condições do plano. São critérios de entendimento; esta revisão ainda não coletou essas respostas.

Quando houver tráfego e instrumentação adequados, comparar uma hipótese identificável de cada vez, como a abertura ou a posição da demonstração. A métrica principal deve usar contratação aprovada e visitantes elegíveis da mesma base, com janela e atribuição definidas. Observar reembolsos e continuidade de uso ajuda a detectar expectativa inadequada. Clique no botão não comprova aumento de vendas.

Sem esse teste, a conclusão desta revisão permanece editorial: a próxima versão deve tornar a continuidade mais concreta, distinguir melhor o valor adicional e conservar as explicações cuidadosas que já estão funcionando como conteúdo.

<a id="aplicacao-da-revisao"></a>

## Aplicação da revisão à versão 2

| Recomendação | Alteração aplicada | Limite ou próximo cuidado |
| --- | --- | --- |
| Mostrar o próximo passo | Novo bloco e FAQ distinguem retomada, entrada obrigatória, publicação e uma atividade livre de desenho, importação e regra no posto Construtor. O botão de demonstração leva a esse bloco. | As fontes de catálogo estão em versões diferentes. Não foram anunciados nominalmente cursos de continuidade sem confirmação; a prova de acesso de aluno e da sequência completa ainda é necessária. |
| Explicar o valor adicional | Comparação entre curso de entrada e assinatura, com conta/progresso e direitos anteriores preservados. O argumento de recorrência foi ligado ao ciclo de criação, teste, salvamento e retomada. | Conferir essa comparação com as condições dos acessos que serão usados na demonstração. |
| Melhorar abertura e integração | Nova promessa centrada em criar e experimentar ideias; a demonstração de desenho, programação e teste precede a explicação detalhada de conta e Jornada. | Imagens inspecionadas mostram a arte no Pinta e entre os materiais do Estúdio; falta a ação executada com o mesmo personagem. |
| Reduzir linguagem administrativa | Removidos termos como “concessão válida” e “novos resgates” do texto público. A explicação completa de progressão fica concentrada, com condições específicas preservadas nos pontos pertinentes. | FAQs continuam completas para leitura isolada. Não retirar requisito para deixar uma frase mais forte. |
| Separar dificuldade e interesse | A dificuldade foi incorporada à resposta de ajuda. Perda de interesse ganhou pergunta própria; necessidade de apoio específico permanece separada. | A pergunta antiga duplicada foi retirada, e o mapa foi atualizado. |
| Reordenar e tornar respostas diretas | A consulta começa por valor, próximo passo, conta, liberação, ajuda, aprendizagem e interesse. Desafio e liberação respondem diretamente antes de desenvolver a explicação. | Biblioteca completa com 50 perguntas, sem impor abertura simultânea de todos os acordeões. |
| Completar garantia e início do período | Prazo da garantia contado da compra, e-mail acionável, link dos termos, nova explicação no corpo e FAQ sobre assinatura iniciada com pagamento aprovado. | Conferir apresentação das datas no checkout e na confirmação durante a implementação; não anunciar a carência técnica. |
| Acomodar visitante sem conta | Orientação de contratação passa a dizer “Se sua família já tem conta” e mantém instrução breve para primeiro acesso. | A página continua dirigida principalmente a quem já conhece a plataforma. |
| Alinhar acompanhamento | A copy continua descrevendo ajuda por mensagens e seus limites, sem acrescentar revisão universal das atividades. | A operação de acompanhamento e a redação dos termos/catálogo ainda precisam ser alinhadas antes da publicação. Este trabalho não alterou contrato ou serviço. |

### Evidência usada nesta atualização

A consulta somente de leitura ao catálogo local retornou uma estrutura antiga com “Programação para crianças”. A captura disponível de staging mostra outros títulos em um perfil de teste. Os roteiros locais registram uma nova versão do Desafio, com vídeos ainda planejados. Não tratamos essas fontes como equivalentes nem inferimos publicação a partir de roteiro.

Para a redação atual, a continuidade concreta é uma possibilidade das ferramentas após os requisitos da Jornada. As imagens locais de Pinta, importação e materiais foram inspecionadas; elas demonstram parte da integração, sem comprovar por si só a liberação para todas as famílias. O [mapa visual atualizado](continuidade-provas-visuais.md) registra essa distinção e inclui a nova prova das datas dos acessos.

O review original não se transforma em teste de conversão por suas sugestões terem sido aplicadas. Nesta etapa foram alterados apenas documentos de copy, análise e provas; não houve compra, envio, alteração de dados da plataforma ou publicação da página.

O responsável pelo produto também confirmou que somente Cadê Todo Mundo, Desafio do Primeiro Jogo e Comunidade têm ofertas próprias. Os demais cursos integram a Comunidade, com novos lançamentos ao longo do tempo. Essa informação foi incorporada à comparação de acesso e às respostas sobre continuidade e catálogo: os novos cursos publicados durante o plano entram na assinatura, sem compra separada por título. Não foi criada promessa de periodicidade nem de disponibilidade atual de um curso específico.

Na verificação documental da versão 2, foram conferidos os links e as âncoras dos seis arquivos alterados, os três campos dinâmicos de preço, a rota de termos e o vínculo único de cada uma das 50 perguntas com seu roteiro de prova. Todos os 40 temas de dúvidas da página A continuam cobertos, além das questões de continuidade. O linter de Light Copy foi aplicado novamente ao texto comercial, sem ocorrências mecânicas. Não foram executados testes de aplicação porque a alteração desta etapa ficou nos documentos.
