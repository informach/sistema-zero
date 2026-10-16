# Studio Pro — adendo revisado: Zappy Pro e autoria compartilhada

Data: 15/10/2026. Revisão 3, após conferência da proposta principal, dos lotes em execução e das fronteiras reais do código. Substitui as revisões anteriores do adendo, preservando a proposta principal e suas entregas. Não altera automaticamente os checkboxes ou a homologação da outra sessão.

Atualização de implementação: o [relatório do adendo](studio-zappy-pro-adendo-implementacao-2026-10-15.md) registra o código, as verificações e os limites da entrega A01–A06 no mesmo worktree. Este texto permanece a especificação; não deve ser usado sozinho como comprovante de aceite. A07 continua posterior.

Complementa a [proposta principal v2](studio-pro-proposta-v2-2026-10-15.md), a [proposta Canvas](studio-pro-canvas-p27-proposta-2026-10-15.md) e o [plano em execução](../docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md). Fundamentação: [análise aprofundada do Sandbox, incluindo a revisão dos fluxos](architectural-analysis-studio-pro-sandbox-2026-10-15.md).

## 0. Base de integração e precedência

Este é um adendo aos lotes existentes, não um segundo plano de reconstrução do Studio. As escolhas mais recentes do usuário definem os cinco cenários e a identidade Zappy Pro. A proposta principal mantém as fronteiras de produto, segurança, custo, persistência e publicação. O plano registra o andamento; código e provas delimitam o que existe de fato.

Base conferida nesta revisão, no worktree C:/Users/tocha/projects/sistema-zero e branch feat/studio-pro-completo:

| Base | Estado observado e consequência |
|---|---|
| Proposta principal, seções 3–9 e lotes 0–9 | Já exige uma experiência Zappy, revisão isolada, CAS, ledger, kits próprios e integração Pensa/Pinta/Molda. Reutilizar esses contratos |
| Plano principal, encerramento funcional do lote 7 | Builder, diff, aplicação/inversa, runtime e verificações presentes; critérios transversais do lote 9 permanecem abertos |
| [Plano do lote 8](../docs/superpowers/plans/2026-10-15-studio-pro-lote8.md) e [review de entrega](studio-pro-lote8-review-2026-10-15.md) | Implementação/revisão local registradas durante este review: kits, materiais e curadoria por tarefa. Reutilizar a entrega; aceites transversais continuam no lote 9 |
| Catálogo e pro-game-knowledge atuais | 14 IDs de templates, incluindo grid e táticos; seleção limitada por tarefa já ligada ao tutor e builder. O relatório da sessão principal registra provas locais; isso não equivale a homologação física/autenticada |
| Início do lote 9 observado no código | Disponibilidade do construtor, envelope compartilhado e preflight antes do create já em implementação. Estender esses contratos, sem criar outro preflight |
| [Entrega Canvas](studio-pro-canvas-implementacao-2026-10-15.md) | Kit próprio integrado e fontes liberadas; esta revisão não reabre sua implementação nem substitui seus aceites pendentes |

As descrições históricas de defeitos na proposta principal não devem ser tratadas como defeitos ainda presentes quando o plano/código já registra sua correção. Também não substituir a estratégia de conversão atual: ela preserva a identidade ativa vinculada a Pensa/nuvem e guarda uma cópia do clássico.

O [review de integração desta revisão](studio-pro-sandbox-adendo-review-2026-10-15.md) registra achados, decisões, provas e pontos que precisam ser comprovados durante a implementação.

## 1. Decisão de produto

**Zappy no Estúdio normal; Zappy Pro no Estúdio Pro. Uma única experiência de assistência em cada ambiente, sem a aba genérica “IA” concorrente.**

Zappy Pro reúne orientação, explicação de código, investigação de erros, sugestões, desafios e construção. A criança pode escrever tudo sozinha, pedir uma dica, solicitar uma correção, delegar uma parte ou encomendar o jogo inteiro. Esses comportamentos coexistem e podem alternar dentro do mesmo projeto e da mesma conversa.

O projeto continua pertencendo à criança. Usar IA não converte o documento para outro formato, não torna o chat obrigatório e não concede permissão permanente de edição. O editor, o terminal, os materiais, o preview e o salvamento têm valor independente do assistente. A indisponibilidade de IA ou o esgotamento de créditos não bloqueiam a edição manual; capacidades que dependem de rede continuam sujeitas à sua disponibilidade real.

“Pro” identifica o ambiente e suas capacidades. Preservar a personalidade, voz, histórico, acessibilidade, políticas e integrações do Zappy; adaptar a orientação para arquivos, código e terminal. No normal, continuam valendo a pedagogia e as ferramentas de blocos. Reunir funções não significa misturar esses contextos.

A ativação acompanha o tipo real do projeto, Project.kind, e as capacidades autorizadas pelo host/servidor. Não criar mais um interruptor “Pro” dentro do assistente nem inferir o ambiente por uma aba chamada “Código”. O nome Zappy Pro não libera recursos de IA fora das permissões e limites existentes.

~~~mermaid
flowchart TD
  N[Estúdio normal] --> Z[Zappy: orientação com blocos]
  P[Estúdio Pro] --> E[Editor, terminal, materiais e prévia]
  P --> A[Zappy Pro: uma conversa]
  A --> O[Explicar e orientar]
  A --> D[Investigar]
  A --> C[Construir uma parte ou o jogo]
  D -->|Correção solicitada| C
  C --> R[Proposta isolada: comparar e experimentar]
  R -->|Aplicar| E
  E -->|Contexto da revisão atual| A
~~~

### Correções em relação ao adendo anterior

1. O fluxo deixa de pressupor ideia → briefing → geração → jogo pronto para toda interação.
2. A retirada da aba IA e a continuidade entre orientação e construção passam a ser requisitos explícitos.
3. Perguntas, diagnóstico e rascunhos não exigem jogo completo, build aprovado ou execução do construtor.
4. A criação integral passa a ser uma tarefa de maior escopo dentro do mesmo sistema de assistência.
5. Prévia candidata, evidências e histórico passam a respeitar autoria mista, edição concorrente e mudanças de intenção.
6. Execução sem a aba aberta permanece uma evolução separada. Não é pré-requisito para pedir explicações ou construir por partes.

## 2. O que existe hoje e o que precisa mudar

| Elemento | Código observado | Proposta |
|---|---|---|
| Zappy | Tutor com histórico no domínio, créditos, referências e contexto do projeto | Base da experiência única |
| Conversar / Construir | Ações do Zappy no Pro; painéis e contratos distintos | Preservar as fronteiras de permissão e conectar contexto, tarefa e apresentação |
| Aba IA | AIPanel genérico, conversa em estado local, provider/configuração próprios e contexto centrado em IR/extensões | Retirar da experiência do produto e incorporar suas funções úteis ao Zappy |
| Host Pro do Kids | Injeta tutor; não habilita a feature genérica ai no código lido | Manter entrada única; verificar outros hosts e atalhos antes de remover APIs |
| Proposta de arquivos | Revisão isolada, hashes, comparação, aplicação explícita e inversa | Preservar; acrescentar aplicação rastreável, recuperação e prévia da candidata |
| Contexto do tutor | Prioriza arquivo ativo/diagnósticos; servidor limita a seis arquivos e prefixos de até 4.000 caracteres | Acrescentar seleção, intervalos relevantes e origem/revisão do diagnóstico |
| Continuidade do builder | Recebe objetivo e snapshot; recupera o último job | Vincular pedido, diagnóstico, critérios e resultado sem depender de copiar o chat |

A aba IA **não é** a implementação do construtor Pro. Renomear AIPanel para “Zappy Pro” manteria dois caminhos de contexto, histórico e integração. A unificação deve partir do tutor e do builder existentes.

### Migração da aba IA

Inventariar consumidores de AIPanel, AIProvider, features.ai, Settings, menus, atalhos e layouts estreitos. O playground ainda habilita ai:true; o host Pro do Kids não. A aba deixa de aparecer no Studio do produto; entradas antigas levam ao mesmo Zappy quando o host o disponibiliza, preservando a intenção e o foco. Sem tutor autorizado, a entrada fica indisponível, sem fallback para mock ou chave local. Console e terminal continuam em seus lugares.

Migrar as ações úteis: explicar seleção → orientação contextual; explicar erro → diagnóstico; sugerir próximo passo/desafio → ajuda opcional compatível com o projeto. Reaproveitar componentes de apresentação quando adequados, sem transportar o contrato de IR para a árvore Pro.

O chat genérico atual guarda mensagens no componente. Não prometer migração de histórico que não foi persistido. Se for necessário manter uma sessão aberta durante a transição, permitir salvar seu texto; não inserir esse texto como instrução privilegiada. Configurações de chave local não são copiadas para a conta adulta nem usadas como fallback silencioso. No produto, manter o fluxo familiar/BYOK gerenciado já implementado.

Se houver consumidor externo do pacote que ainda dependa de AIProvider, depreciar a API com compatibilidade documentada e testes antes da remoção. Compatibilidade de biblioteca não justifica mostrar dois assistentes à criança. Esta etapa não exige reescrever o tutor nem trocar o provedor de modelos.

## 3. Os cinco cenários e suas transições

| Cenário | Exemplo | Resposta esperada | Alteração do projeto |
|---|---|---|---|
| Autoria manual | A criança escreve e testa seu jogo | IDE completa, ajuda fechada ou opcional | Somente as operações manuais |
| Orientação | “Me explica esse trecho; quero fazer sozinho” | Explicação localizada, dica ou pequeno exemplo | Nenhuma alteração automática |
| Investigação | “Era para pular, mas ele atravessa o chão” | Comparar esperado e observado, formular hipótese e orientar reprodução | Nenhuma até pedir uma correção |
| Construção por partes | “Agora coloque uma barra de energia” | Uma alteração delimitada, com explicação e revisão | Aplicação explícita da proposta |
| Criação integral | “Faça um jogo de arena com essas regras” | Planejar e construir o escopo combinado, testar e apresentar o jogo | Aplicar a revisão resultante; não exige digitar código |

Não criar um campo permanente “projeto manual / projeto de IA”. As decisões são por pedido. Uma sequência válida é: escrever movimento → pedir explicação → corrigir manualmente → pedir HUD ao Zappy → revisar/aplicar → alterar as cores sozinho → pedir diagnóstico.

### Comportamento da interface

Uma entrada **Zappy Pro**, uma conversa por projeto/perfil e cartões de tarefa/revisão no mesmo espaço. O painel pode ser lateral ou uma aba em telas estreitas; são apresentações do mesmo estado, sem chats duplicados. Ações contextuais do editor, console e preview abrem esse espaço com o trecho/erro escolhido.

Usar ações compreensíveis: **Conversar**, **Investigar** e **Construir**. Não exigir escolher uma delas a cada mensagem: a interface pode reaproveitar a ação atual e sugerir a adequada ao pedido. O nível de ajuda pode ser “uma dica”, “passo a passo” ou “mostrar exemplo”, sem criar outro modo de projeto.

Pedidos explícitos como “corrija este erro” ou “adicione a barra” autorizam preparar uma proposta no escopo indicado. Não pedir confirmação para cada leitura ou pequeno passo interno. Em uma conversa de orientação, uma hipótese do modelo não amplia permissões; uma ambiguidade real pode ser resolvida com “Você quer uma explicação ou uma proposta de correção?”.

“Não funciona” começa por investigação. “Me explica” não dispara geração. “O que posso melhorar?” produz sugestões e não executa todas elas. Sugestões preenchem o pedido para revisão, como o Zappy atual já faz; um clique em ideia não deve iniciar consumo ocultamente.

### Regras para alternar

| Situação | Regra |
|---|---|
| Orientação → construção | Reutilizar trecho, diagnóstico e objetivo escolhidos; mostrar um resumo curto do escopo, sem exigir recontar a conversa |
| Construção → orientação | Permitir dúvidas sem alterar o job. Explicação sobre a candidata indica que ainda não foi aplicada |
| Criança edita durante geração | Continuar editando; a proposta conserva sua base e pode ficar desatualizada |
| Pedido muda durante execução | Esclarecimento pode ser registrado; mudança efetiva de objetivo substitui/cancela a tarefa anterior de forma explícita, sem alterar retroativamente sua base |
| Fechar painel | Não equivale a cancelar; reabrir consulta o estado sem nova inferência |
| Cancelar execução | Impedir novas etapas; preservar código atual e contabilizar uso já ocorrido |
| Descartar proposta pronta | Marcar como descartada; não reapresentá-la como próxima ação |
| Trocar perfil/projeto | Isolar estado, perguntas, diagnósticos, tarefas e continuações assíncronas |

Uma tarefa de construção ativa por conta/perfil/projeto é o padrão inicial. A UI atual impede um segundo envio no mesmo painel, mas isso ainda não é exclusão entre abas: o repositório limita jobs por família e não recusa toda segunda criação no mesmo projeto. Implementar a regra no create do Members, dentro da transação/lock já existentes, antes de prometer essa garantia.

Perguntas de leitura podem coexistir com uma construção, sujeitas aos limites de consumo e concorrência existentes. O editor não é bloqueado enquanto o assistente trabalha; continuam valendo os bloqueios legítimos de observação, suporte e transferência de autoria do host.

## 4. Contratos e fronteiras: uma experiência, capacidades distintas

Preservar os adapters de tutor e builder; compor a experiência acima deles. Não fundir todas as operações em um agente universal com ferramentas de escrita sempre disponíveis.

| Conceito | Responsabilidade e fonte de verdade |
|---|---|
| Documento do projeto | Árvore, configuração e materiais atuais; coordenador editor/terminal, persistência local e sincronização existentes |
| Conversa | Perguntas, explicações e referências às tarefas; histórico existente do Zappy |
| Pedido de assistência | ID idempotente, intenção solicitada, escopo, revisão/contexto observados e relação com a mensagem |
| Tarefa de assistência | Objetivo delimitado e critérios do pedido ao Zappy; não substitui uma missão do Pensa e não exige uma nova jornada/kanban |
| Execução | Um job com base congelada, orçamento, tentativas, lease, prazo e evidências |
| Proposta | Alterações candidatas contra uma base; pode ser revisada, aplicada, descartada ou ficar obsoleta |
| Registro de aplicação | Relação entre proposta, revisão anterior/posterior e operação reversível efetivamente confirmada |

Esses conceitos são contratos, não uma exigência de criar sete serviços ou tabelas. Primeiro estender os tipos, adapters e repositórios existentes; criar armazenamento adicional apenas para dados que não tenham dono adequado.

**Pensa continua dono das missões.** Quando houver vínculo, guardar uma referência à missão/versão autorizada e um resumo congelado para o pedido. Usar StudioTaskSession, onProgress e withSaveBeforeTaskActions existentes; concluir uma proposta ou aplicar arquivos não conclui automaticamente uma missão. A confirmação de conclusão permanece vinculada à revisão salva e às regras de progresso do host. Uma tarefa espontânea do Zappy não precisa virar missão do Pensa.

O pedido diferencia intenção **explicar / investigar / propor alteração** e escopo **trecho / parte do projeto / jogo completo**. Direitos efetivos vêm da sessão, do host e das políticas no servidor. Texto, briefing, arquivos ou uma classificação produzida pelo modelo nunca concedem permissões.

Ferramentas de orientação e investigação são de leitura. Verificações podem executar o jogo apenas no runtime isolado e dentro do orçamento autorizado. Construção escreve somente na candidata. Aplicar continua sendo uma operação do projeto, validada separadamente; o modelo não chama o filesystem do host, credenciais ou publicação.

O histórico integrado pode ser inicialmente uma projeção de mensagens e jobs existentes, por IDs estáveis. Não duplicar o payload inteiro do job dentro de cada mensagem nem usar texto do chat como banco de estado. Uma resposta de diagnóstico pode originar uma tarefa estruturada; “aplicado” só aparece após confirmação da operação, nunca porque o modelo escreveu “pronto”.

O vínculo mínimo acrescenta ID do pedido, mensagem de origem opcional, intenção, escopo, critérios e referência opcional ao Pensa. Não usar uma paráfrase gerada como autorização. O mesmo retry conserva esses dados; mudar escopo ou base exige nova identidade. Expor consulta por job e paginação para recuperar cartões anteriores: o adapter atual oferece apenas latest, embora get já exista na rota/domínio.

Separar as fases de execução atuais da situação da proposta: pendente, descartada ou aplicada/revertida por uma operação identificada. Um cartão consulta o servidor e o registro local confirmado, indicando a origem do estado; não deduzir aplicação pela última frase da conversa. Após expiração, manter apenas uma referência histórica limitada e o aviso de indisponibilidade, sem reconstruir código a partir do texto.

### Compatibilidade antes de iniciar uma construção

O mesmo projeto pode ser editável localmente e incompatível com build remoto. Resolver capacidades separadas para orientar, investigar com sinais locais, construir/validar remotamente, executar e publicar. Não usar um único booleano “Pro compatível” para todas elas.

| Fronteira atual | Limite relevante | Regra do adendo |
|---|---|---|
| Tutor | Body até 1 MiB, contexto textual recortado | Seleção/diagnóstico cabem no orçamento; não transportar binários |
| Pedido do builder | Objetivo digitado de 1.000 caracteres; domínio até 2.000 após enriquecimento do Pensa; payload de 3.000.000 bytes | Manter limites distintos com nomes claros; novos critérios/contexto entram no cálculo completo, não no campo livre por concatenação ilimitada |
| Build remoto | 80 arquivos, 256.000 caracteres por arquivo, 1.500.000 no agregado e 2.000.000 bytes no envelope | Preflight do envelope completo, inclusive base64, hashes, manifesto e origem, antes de reservar inferência |
| Artefato | 2.500.000 bytes, incluindo captura; prévia com validade de 24 horas | Prévia candidata segue os mesmos limites, sem outro servidor de arquivos |
| Dependências | Catálogo/lock compatíveis com a imagem confiável | Não prometer verificação remota para qualquer pacote instalado no terminal |

O preflight usa validadores compartilhados e também é repetido no servidor; a cópia do navegador é apenas feedback. Não garantir previamente o tamanho exato de um build ainda não produzido: validar a entrada e reservar recursos, depois conferir a saída. Projetos além da capacidade conservam edição/orientação e recebem um motivo acionável. Não reduzir assets, alterar engine, apagar arquivos ou elevar quotas automaticamente para fazer a proposta caber.

Atualização observada durante esta revisão: o lote 9 já introduz studioProBuildEnvelopeIssue/serializeStudioProBuildEnvelope, availability por template, liberação de kits no servidor e preflightStudioProBuild antes do create. Esta parte deve ser consumida e verificada pelo adendo, não implementada novamente. Ao acrescentar contexto, decisões ou novos tipos de evidência, preservar esses contratos e seus limites. Disponibilidade por configuração/liberação não equivale a saúde do runtime; o preflight autorizado confirma a compatibilidade da entrada antes de criar a execução.

## 5. Contexto confiável para aprender e investigar

### Seleção e código atual

Acrescentar ao contexto o caminho, intervalo da seleção, hash do arquivo e versão do documento observada. Priorizar a seleção e os arredores do diagnóstico, seguidos por imports e símbolos necessários. O prefixo do arquivo não é suficiente quando o erro está depois do caractere 4.000.

Cada trecho informa linhas originais, hash, intervalo e se foi truncado. Referências retornadas são validadas contra esses intervalos; não renumerar um recorte como se começasse na linha 1. Se o código mudou, avisar e reencontrar o trecho por hash/contexto ou pedir nova seleção. Não navegar silenciosamente para uma linha que agora significa outra coisa.

Capturar de forma consistente o estado atual do editor e as operações pendentes do terminal. Reusar o coordenador existente; não criar um caminho de sincronização exclusivo do Zappy. Em caso de conflito de sincronização, explicações podem indicar a versão analisada, mas aplicação aguarda a resolução.

O BFF não tem acesso mágico ao WebContainer nem aos arquivos locais não sincronizados. A primeira entrega envia recortes explícitos do snapshot capturado. Se uma leitura adicional for necessária, solicitar outro recorte ou usar um snapshot limitado já enviado; nunca ler um projeto antigo da nuvem como se fosse o atual. Busca iterativa exige contrato próprio de snapshot, orçamento e revisão antes de ser habilitada.

Distinguir o hash do conteúdo original, usado para detectar edição, do digest do contexto sanitizado enviado ao modelo. Redação de segredo pode alterar texto e linhas; a referência precisa carregar um mapa de intervalos validado, sem divulgar os valores removidos. Trecho que não possa ser mapeado com segurança recebe referência ao arquivo, não uma linha inventada. Não trocar esse protocolo por casts no retorno da IA.

Limites de bytes, arquivos e privacidade permanecem. Leitura adicional é direcionada pelo problema, não envio integral de projeto, mídia, lock ou node_modules. A ampliação do contexto deve atravessar todos os validadores do cliente, BFF e domínio; campos desconhecidos hoje podem ser descartados pelo schema.

### Diagnóstico como investigação

Pacote de diagnóstico proposto: revisão do código, origem do sinal, execução/artefato, ambiente, mensagem sanitizada, localização mapeada quando disponível, passos de reprodução e comportamento esperado. Distinguir TypeScript, instalação/resolução, build, runtime e lógica do jogo.

O aluno pode apontar o erro do console ou dizer “esperava X, aconteceu Y”. A coleta usa os sinais já disponíveis antes de fazer perguntas. Se faltar uma decisão relevante, fazer uma pergunta curta. Stack trace sozinho não prova a intenção, e ausência de exceção não prova que o jogo funciona como esperado.

Observações da prévia precisam estar vinculadas à instância e à revisão. Descartar sinais tardios de iframes encerrados. Quando o runtime não fornecer source map confiável, mostrar a localização disponível e sua limitação; não inventar linha de TypeScript a partir do JavaScript compilado.

Saída mínima: o que foi observado, hipótese sustentada, como conferir e próximo passo. A criança pode escolher tentar sozinha ou pedir correção. Nenhum patch é produzido por padrão só porque ocorreu um erro.

## 6. Construção incremental e criação integral

### Uma mudança por vez

Cada tarefa registra objetivo, alcance e critérios verificáveis. “Adicionar energia” não autoriza trocar motor, reescrever controles, substituir arte ou atualizar dependências sem necessidade. Alterações relacionadas em vários arquivos formam uma unidade coerente; aplicar arquivos avulsos não pode quebrar invariantes entre módulos.

Ler o projeto atual antes de propor. Identificar o que a criança mudou desde a última execução e preservar isso. O histórico explica decisões; arquivos e revisões dizem o que de fato existe. Não reconstruir o projeto pela lembrança do modelo ou reaplicar silenciosamente algo descartado.

As próximas etapas podem ficar sugeridas, sem execução automática. O aluno pode encerrá-las manualmente; não exigir passar pelo Zappy para registrar que uma tarefa foi resolvida.

### Jogo inteiro pelo Zappy

A criança descreve o resultado e o Zappy Pro assume a construção combinada. Usar kit próprio adequado ou projeto existente, materiais disponíveis e escolhas já feitas. Pedir apenas o que altera significativamente o resultado; Pensa é uma origem possível de objetivo, não uma etapa obrigatória.

Preservar Pensa para planejamento mais amplo da aventura. O Zappy Pro pode esclarecer uma implementação e organizar os passos de uma tarefa no editor. Ajustar prompts e contingências para não redirecionar ao Pensa todo pedido de “como faço” ou “por onde começo”; as duas ferramentas precisam cooperar sem exigir uma ida e volta para uma mudança simples.

Para um jogo pequeno, uma execução pode entregar uma revisão jogável completa. Para um objetivo maior, decompor em etapas com critérios e checkpoints recuperáveis. Na entrega inicial, cada continuação é uma solicitação explícita sobre uma base escolhida. A execução automática de vários jobs para o mesmo objetivo só será habilitada depois de existir limite agregado de tarefa no ledger, além dos limites por job. Criar novo job não reinicia uma franquia infinita.

Se a criança autorizou construir o escopo inteiro, etapas internas dentro desse escopo e orçamento podem continuar sem confirmação de cada microação. Mudança relevante de escopo ou necessidade de orçamento adicional fica explícita. Até existir essa orquestração de tarefa, o produto deve oferecer etapas sucessivas, sem prometer conclusão autônoma ilimitada.

Uma candidata pode evoluir por checkpoints sem alterar o projeto aberto. Se o aluno quiser intervir, pode aplicar uma etapa estável e continuar a partir dela, ou cancelar a continuação e editar manualmente. Antes de avançar, conferir se a base ainda corresponde à versão escolhida. Uma proposta desatualizada não substitui trabalho novo.

Entrega “completa” é relativa aos critérios acordados: não significa adicionar funcionalidades nunca pedidas. Publicação permanece separada. Criar imagens/modelos pagos exige o fluxo e orçamento de Pinta/Molda; o builder não inventa URLs nem gera materiais automaticamente só para completar uma decoração.

### Briefing opcional e memória de decisões

Substituir o briefing obrigatório por um resumo opcional: objetivo, mecânica central, dispositivos/controles, condições de conclusão, direção visual e restrições. Projeto já existente pode não precisar de briefing.

Campos guardam proveniência e estado: informado pelo aluno, herdado de Pensa, default do kit ou sugestão ainda não confirmada. Código atual prevalece sobre um resumo antigo sobre implementação; uma decisão pedagógica expressa do aluno prevalece sobre preferências inferidas.

Persistir decisões estáveis como metadados versionados do projeto, passando por migração, validação, sincronização e roundtrip. O job congela apenas o contexto necessário e o hash dessas decisões. Conversa inteira, credenciais, URLs assinadas e logs não entram no documento exportável.

Usar campos tipados dentro de proMeta, com schema próprio e leitores/migração coordenados. Hoje sanitizeProMeta reconhece apenas devScript, templateId e origin; a guarda de preservação recusa um documento com metadado novo não compreendido. Acrescentar o campo somente na interface TypeScript não funciona.

Manter três identidades distintas: hash das fontes/configuração/assets da revisão; versão/hash das decisões; identidade do artefato e do relatório. O hash atual de StudioProRevision não inclui um futuro briefing. Antes de aplicar, revalidar a base e a versão do pedido/decisões que justificou a mudança. Renomear o projeto não exige recompilar; mudar o objetivo pode invalidar o aceite sem mudar o código.

Perguntas estruturadas têm ID, revisão, finalidade e resposta validada. Oferecer resposta livre, “decida por mim” quando seguro e cancelamento. Uma pergunta pendente não bloqueia editor nem consultas independentes. Evitar o padrão do Sandbox em que só escolher uma das opções destrava a conversa.

Começar com campos curados e até três decisões relevantes por rodada de criação, sem chamada paga por clique. Perguntas dinâmicas podem usar a resposta estruturada do tutor e o mesmo contrato quando necessárias; não dependem de transplantar a orquestração Trigger. Espera humana libera lease/reserva: uma resposta depois da expiração gera uma continuação com nova validação, não ressuscita o job vencido.

## 7. Revisar, experimentar, aplicar e desfazer

### Prévia da candidata

Preservar comparação, captura e evidências existentes; acrescentar **Jogar proposta** quando existir artefato executável. As ações ficam claras: jogar proposta, comparar alterações, aplicar e descartar. Uma resposta de orientação não ganha esses controles.

Persistir um descritor de artefato produzido/validado pelo servidor, com revisão, versão do runtime e expiração. Não aceitar URL indicada pelo modelo nem deduzir a URL do jogo pela captura. Extrair do preview remoto um renderer que receba artefato explícito; o componente atual lê o store vivo e não deve receber uma candidata por substituição temporária do documento.

Preservar CSP, origem opaca e bridge validada por instância. Progresso da candidata fica em memória, separado por execução/revisão, sem gravar recordes do projeto real. Aplicar não importa recordes da experimentação. Manter uma prévia ativa por vez e alternar Atual/Proposta, liberando recursos da anterior.

Artefato expirado pode ser recriado a partir da mesma revisão e materiais retidos, sem nova inferência, respeitando autorização e quota de build. Reutilizar StudioProArtifact, cujo ID é aleatório e cujo sha256 identifica o manifesto compilado; nenhum deles é o hash das fontes. Acrescentar a associação à revisão, à imagem/toolchain e à versão do perfil de validação no resultado do builder, atravessando seus parsers.

Uma recriação produz outro artefato e outro relatório. Se a imagem anterior não estiver disponível, informar nova validação no runtime atual; não reutilizar sua captura/prova antiga nem prometer bytes idênticos. Se fontes ou materiais expiraram, informar indisponibilidade. O job dura até sete dias, mas também pode ser removido pelo teto de dez jobs retidos por família; sete dias não é garantia mínima de recuperação.

No Pro completo, a prévia atual normalmente é local/WebContainer. A candidata remota não deve iniciar um segundo jogo simultâneo: o layout suspende/desmonta o iframe atual enquanto a candidata ocupa a área de jogo, sem desmontar editor e terminal. Ao voltar, informar eventual reinício da partida. Ocultar por CSS não suspende RAF, áudio ou input; essa regra precisa de teste real de ownership.

### Concorrência e reconciliação

Manter a comparação atômica da revisão-base antes de aplicar. Hoje ela protege o projeto inteiro; uma alteração em outro arquivo também pode tornar a candidata obsoleta. Isso é conservador e correto, mas precisa de saída utilizável para autoria mista.

Primeira entrega: informar exatamente por que a proposta ficou desatualizada, manter comparação e oferecer preparar uma nova proposta sobre a versão atual. Essa ação é distinta de consultar/reabrir e informa eventual uso de IA. Não bloquear a edição para evitar conflitos.

Evolução: reconciliação determinística em três versões — base, atual e candidata — gera **outra candidata**. Mudanças em arquivos distintos não provam independência semântica; sempre revalidar o resultado combinado. Conflito no mesmo trecho, caminho, dependência ou material exige resolução visível. Nunca contornar CAS com substituição forçada, merge textual silencioso ou aplicação de parte arbitrária de uma alteração multiarquivo.

### Aplicação durável e desfazer

O painel atual guarda a inversa em memória. Evoluir para registro de operação por projeto/perfil, com ID, hashes anterior/posterior, proposta de origem e inversa limitada. Fechar/reabrir o Zappy não deve apagar o direito de desfazer uma aplicação ainda disponível.

Integrar o registro à persistência do documento pelo coordenador existente. Na primeira entrega, a inversa é um registro auxiliar local, por projeto/perfil, no mesmo banco IndexedDB e na mesma transação de gravação da revisão, usando runSerializedProjectWrite e writeInOneTransaction. Não colocar vários MiB de histórico em proMeta: essa partição é regravada nos autosaves e enviada no program da sincronização.

A operação passa por estados distintos: aplicada em memória, guardada neste aparelho e sincronizada. Quota/falha de gravação não vira confirmação de sucesso; manter o trabalho em memória como pendente, sem rollback que apague digitação posterior, e permitir repetir o save com o mesmo ID. Não reaplicar o patch para repetir a persistência. Se o host não tem persistência compatível, oferecer somente undo da sessão e identificá-lo assim.

Desfazer durável inicialmente vale neste aparelho/perfil. Restauração de nuvem e duplicação/importação não carregam automaticamente inversas locais; conferir hashes e invalidar registros incompatíveis. Sincronizar histórico entre aparelhos é evolução explícita do formato de partes, não consequência automática de salvar o projeto. Documento e recibo remoto não são uma transação distribuída.

As filas atuais usam estado JavaScript e não demonstram exclusão de escrita entre abas. A aplicação precisa respeitar a autoria do host e a revisão durável, além do CAS do store. Evoluir a escrita comum para conferir a versão durável esperada e gravar documento/registro na mesma transação IndexedDB; ler em uma transação e gravar em outra deixa uma janela de corrida. Hashing e preparo acontecem antes da transação, com nova conferência de escopo/base. Autosave, rename, restore e exclusão também devem respeitar essa coordenação; proteger apenas o clique em Aplicar deixa um autosave antigo sobrescrever o resultado. Preservar o flush de saída já existente: nenhum await de rede ou hashing dentro da transação.

O aceite exige prova de duas instâncias: conflito preserva ambas as versões ou impede a segunda aplicação, sem sobrescrita silenciosa. BroadcastChannel pode avisar sobre mudança, mas não substitui a verificação transacional. Qualquer coordenação adicional pertence à persistência comum a editor/terminal/IA, nunca a um mutex exclusivo do botão do Zappy. O CAS remoto continua sendo responsabilidade da sincronização existente; um contador local não coordena aparelhos distintos.

Desfazer uma aplicação recente usa precondições. Se houve edição posterior, não restaurar o snapshot antigo inteiro: oferecer uma reversão compatível sobre a versão atual, ou explicar o conflito. O undo de digitação do Monaco continua tendo seu papel; a UI diferencia “desfazer minha edição” de “desfazer alteração do Zappy”.

Histórico de aplicação é separado da retenção curta do job. Limite inicial proposto: até 20 operações e 8 MiB de inversas por projeto, somente na partição auxiliar, sob quota do aparelho e limite agregado por perfil a definir com medição antes da ativação. Registrar tamanho antes de admitir a operação; reduzir retenção por política explícita, sem reduzir o conteúdo necessário para desfazer. Ao expirar/remover uma inversa, mostrar sua indisponibilidade. Não prometer undo ilimitado. Excluir projeto/perfil remove os registros associados; o ZIP de fontes não os contém.

## 8. Verificação proporcional ao pedido e ao estado do projeto

O Studio precisa aceitar **trabalho em andamento**. “Toda interação termina com um jogo pronto” é uma regra do Sandbox incompatível com aprendizado e edição manual. Isso não significa chamar de aprovado um jogo quebrado.

| Pedido | Verificação necessária | O que não afirmar |
|---|---|---|
| Explicação/dica | Arquivos/intervalos existentes, compatibilidade do contexto e referências | Que houve build, execução ou correção |
| Diagnóstico | Evidências atuais; reprodução quando disponível | Causa confirmada se há apenas hipótese |
| Mudança pontual em base funcional | Validade da alteração, tipos/build aplicáveis e checks relacionados | Que o jogo inteiro foi exaustivamente testado |
| Correção em projeto já com erros | Comparação base/candidata e resultado do erro investigado | Que todo erro residual foi introduzido pelo patch |
| Criação integral ou etapa declarada jogável | Build/boot, controles/objetivos compatíveis, critérios acordados e captura | Que estética e diversão foram comprovadas por smoke |

Adicionar identidade de revisão/artefato/runtime e perfil de teste às evidências. Separar código, inicialização, contrato do kit, critérios da mudança e conferência visual/manual. “Não executado”, “indisponível”, “incompatível” e “falhou” são estados distintos.

### Base incompleta

O caminho atual trata falhas de validação como candidatas a reparo. Antes de ampliar a assistência incremental, registrar a baseline quando houver erros prévios e houver necessidade de comparação. Distinguir diagnósticos preexistentes, resolvidos, introduzidos e indeterminados; o mesmo texto de erro não prova a mesma causa.

Reparos respeitam o escopo pedido. Se um erro preexistente bloquear o objetivo, explicar a dependência; não gastar o orçamento reformando outras partes. Verificações da base também contam nos limites de execução. Evidência atual reutilizável precisa corresponder ao mesmo hash, ambiente e perfil.

Manter uma única via de aplicação do builder, com os gates de validação existentes e evidência compatível com o escopo. Uma parte pode compilar e funcionar sem completar o jogo inteiro; “parcial” descreve o objetivo, não uma licença para ignorar falhas. Se a base incompleta impede a validação, terminar com diagnóstico e próximo passo, preservando a candidata para inspeção enquanto retida. Não ampliar o reparo automaticamente nem habilitar “Aplicar ignorando erros”.

Edição manual e salvamento de rascunhos continuam permitidos independentemente desse critério do builder. Publicação conserva sua validação própria. Aplicar automaticamente patches em bases que continuam inválidas fica fora desta entrega: exigiria uma política adicional de baseline/regressão comprovada e não deve ser introduzida como atalho do adendo.

### Contratos de jogo

templateId indica origem e não garante regras atuais. Perfis de teste pertencem ao verificador confiável e declaram capacidades/versão. Mudança legítima de controles ou objetivo pode tornar o perfil antigo incompatível; não “reparar” a intenção da criança para satisfazer o kit original.

O observador do jogo ajuda a medir estado, mas faz parte do código editável e não certifica correção sozinho. Cruzar entradas e efeitos visíveis; o modelo não envia testes privilegiados nem decide o resultado. Critérios textuais ficam manuais até existir teste realmente executado.

## 9. Recursos dos kits como material para aprender e construir

Evoluir studioProGameGuide e os manifests existentes, em coordenação com o lote 8, para descrever ID, motor, arquivos/exports, referência tipada, precondições, exemplo, lifecycle, limites e teste. A seleção studioProTaskGuides já existe e recebe a pergunta do tutor e o objetivo do builder. O delta deste adendo é conferir essas referências contra o código e apresentar as mesmas receitas como aprendizagem/manual/construção; não criar outro catálogo ou mecanismo de seleção.

Um mesmo recurso admite três usos: **entender como funciona**, **seguir uma receita manual** ou **pedir uma proposta de implementação**. Não fazer do catálogo um menu que sempre gera código.

| Receita própria | Uso e integração |
|---|---|
| Energia e feedback de dano | HUD específico por motor, regra pura e referência aos arquivos |
| Ondas/dificuldade | Configuração e limites de entidades dos kits de arena |
| Sons de coleta/acerto | Gesto do usuário, limite de vozes e descarte |
| Câmera e enquadramento | Controlador Three e dimensões reais dos modelos |
| Luz e materiais | Presets Three com orçamento gráfico e materiais existentes |
| Personagem/animação | Sprites Canvas/Phaser ou modelos/clips Three, usando IDs Pinta/Molda |

O catálogo mestre pertence ao código confiável do Studio. Um manifesto editado no projeto não concede ferramentas nem comprova compatibilidade. Projetos importados ou muito modificados continuam editáveis; usar assistência genérica e checks disponíveis quando não houver receita compatível.

Não criar um segundo estado visual paralelo à árvore nem motor universal. Compartilhar apenas quando houver consumidores reais e semântica igual. Canvas mantém simulação fixa, seed, pools limitados e limpeza; Phaser usa seus sistemas; Three mantém ownership e descarte de recursos GPU e animações.

O Sandbox oferece referências úteis de composição e apresentação das APIs, mas não deve ser copiado como engine de produção: o relatório documenta falhas de input, lifecycle, pool e persistência, além de não ter localizado licença explícita na cópia. Manter implementação própria.

## 10. Estado durável, custos e execução fora da aba

Registrar eventos pequenos de transições confirmadas, com execução, sequência, versão, etapa, resultado e referências. Gravar checkpoint/evento na mesma transação do domínio; consultar por cursor e deduplicar. Streaming é uma otimização posterior.

Uma apresentação simples informa “Lendo seu código”, “Preparando a mudança”, “Verificando” e “Pronto para revisar”. Resultado de ferramenta precisa distinguir sucesso, recusa e falha operacional. Evitar porcentagens inventadas e exposição de raciocínio interno.

Separar **Consultar estado** de **Continuar execução**. Consulta, recarga, navegar pelo histórico e abrir uma proposta já pronta não geram inferência. A criação da prévia pode consumir recurso de build e deve seguir sua quota própria. Manter o ledger familiar/BYOK para reserva, consumo confirmado e consumo incerto; nenhuma carteira/tabela de preços paralela.

Conversas, decisões do projeto, eventos, artefatos e registros de aplicação têm retenções diferentes. Apagar conversa não apaga código; descartar uma proposta não apaga cobrança real. Excluir um projeto deve solicitar cancelamento e remover seus registros pela política do domínio. Exclusão local offline não pode cancelar imediatamente um job remoto: registrar cancelamento pendente e impedir reaplicação/restauração local; envio posterior e prazo do servidor limitam a continuação. Não apresentar remoção remota como confirmada antes do ACK. Exportação de código não carrega automaticamente chat, telemetria ou credenciais.

Limites iniciais dos eventos: 128 por execução, até 1 KiB cada, erro sanitizado e remoção junto ao job, inclusive quando antecipada pelo teto de retenção. IDs pseudonimizados fora do domínio, sem prompt, código, blobs ou URL assinada em logs. Métricas agregadas medem tempo até uma ajuda útil, taxa de conflitos, patches aceitos, correções confirmadas e custo por tarefa; número de gerações não é medida de aprendizado.

### Executor de servidor: etapa posterior

Hoje o painel pede os avanços do job. Recuperar estado durável não significa terminar tudo com a aba fechada. A mensagem correta é “Você pode reabrir e continuar”, sujeita ao prazo da execução.

Quando a execução fora da aba for incorporada, avaliar fila na infraestrutura Cloudflare existente, com outbox transacional no Members. Não é dependência dos cinco cenários nem motivo para adotar Clerk, Neon, Daytona e Trigger.

Requisitos: comando com IDs/versão; autorização derivada do registro; claim com lease e versão; checkpoint/agendamento atômicos; cancelamento/revogação revalidados; deduplicação; outbox reconciliável; limite de concorrência; DLQ; limpeza; política de transporte incerto. Extrair o orquestrador de servidor já existente para compartilhamento com o worker, sem duplicar regras.

Reentrega não autoriza repetir inferência de resultado desconhecido. Não prometer exactly-once de APIs externas. Cloudflare Queues documenta entrega pelo menos uma vez, portanto o consumidor precisa tratar duplicatas. [Garantias oficiais](https://developers.cloudflare.com/queues/reference/delivery-guarantees/).

Preservar inicialmente os limites atuais por job: três chamadas de modelo, três validações e cinco minutos incluindo fila. Uma tarefa maior precisa de orçamento agregado e checkpoints explícitos; não contornar limites abrindo jobs automaticamente. Espera humana fica fora de um job ativo, com revalidação ao continuar.

## 11. Sequência de integração com a implementação em andamento

### Encaixe nos lotes e requisitos da proposta principal

Os IDs A01–A07 servem para rastrear este delta; não substituem R01–R14 nem renumeram os lotes em execução.

| Delta | Extensão concreta | Base existente e dependência |
|---|---|---|
| A01 — Experiência única | Zappy Pro, intenções por pedido, ações de seleção/erro e migração da aba IA | Lotes 3/7; R01, R11. Reusar tutor, builder e gate do host |
| A02 — Contexto e continuidade | Intervalos verificáveis, diagnóstico, IDs de pedido/mensagem/job e consulta de propostas anteriores | Lotes 3/7; R01, R11. Contratos ponta a ponta antes da UI |
| A03 — Revisão e recuperação | Jogar candidata, identidade das provas, situação da proposta e aplicação/inversa persistidas | Lotes 1/7/9; R02, R08, R10, R13. Persistência comum e artefato existente |
| A04 — Decisões e missão | Briefing opcional versionado, perguntas recuperáveis e referência ao Pensa | Lotes 3/4/7; R01, R10. Migração de documento e progresso do host |
| A05 — Receitas dos kits | Referências verificadas e usos didáticos da curadoria por tarefa | Lotes 6A/6B/8; R11, R12, R13. Estender catálogo que a sessão principal já amplia |
| A06 — Limites e capacidade | Consumir preflight do lote 9; acrescentar exclusão de tarefa ativa, retenção explícita e orçamento por continuação | Lotes 2/5/7/9; R04, R07, R14. Mesmo ledger, repositório e runtime |
| A07 — Evoluções posteriores | Merge em três versões, executor fora da aba e tarefa com vários jobs automáticos | Lotes 7/9; R02, R07, R08. Só após provas próprias e limite agregado |

R03, R05, R06 e R09 continuam integralmente cobertos pelo plano principal. O adendo não reabre suas entregas nem altera conversão, modelo de assets, carga da nuvem ou publicação para facilitar o assistente.

### Cortes de entrega

| Etapa | Entrega | Critério de saída |
|---|---|---|
| 0 — Contratos e capacidade | A02/A06: payloads versionados, preflight e exclusão de job no domínio; leitores de documento/recibos e migração compatíveis | Testes passam por cliente → BFF → Members → runtime; nenhum campo perdido e retry sem nova execução |
| 1 — Identidade e cinco fluxos | A01/A02: entrada Zappy Pro; migração da aba IA; transferência orientação → construção; contexto por seleção/revisão | Todos os cenários acessíveis sem segundo chat, sem mutação inesperada e sem bloquear edição |
| 2 — Revisão confiável | A03: prévia da candidata, associação de evidências, registro de aplicação e recuperação | Experimentar não altera projeto/recordes; aplicar/desfazer respeita concorrência e sobrevive à reabertura |
| 3 — Continuidade e recursos | A04/A05: decisões, briefing opcional, catálogo didático, eventos e diagnóstico da baseline | Pedidos incrementais preservam autoria; criação integral tem escopo/budget; projeto incompleto não é reescrito fora do pedido |
| 4 — Evoluções operacionais | A07: reconciliação em três versões, execução fora da aba e orçamento agregado | Cada capacidade tem prova específica de falhas, duplicatas, conflitos, cancelamento e custo incerto |

Entregar em cortes verticais: primeiro uma dúvida sobre trecho; depois diagnóstico que vira correção; depois alteração incremental; depois criação completa. Exercitar cada corte com edição manual antes/depois. Canvas Survival e um kit Three dão cobertura de motores diferentes; não condicionar a experiência inteira a um único kit.

### Responsabilidades na branch compartilhada

| Fronteira | Pontos existentes a estender | Coordenação |
|---|---|---|
| Experiência e hosts | ZappyPanel, ProBuilderPanel, contexto do editor, features do Studio e adapters Kids/admin/playground | Sessão principal mantém propriedade; separar componentes novos somente após acertar contratos |
| Tutor/builder/domínio | core/studio/pro-builder, adapter, rotas BFF, servidor e repositório Members | Um responsável pelo contrato completo, incluindo schemas e migrações; não editar só uma ponta |
| Documento e aplicação | proRevision, projectOperations, projectValidation, proTree, projectDocument e persistência/partições | Coordenador existente é único dono; undo não ganha um caminho de escrita separado |
| Prévia e prova | StudioProArtifact, studio-pro-runtime, RemoteProPreview, renderer local e bridge | Sessão principal mantém runtime e isolamento; não substituir store para mostrar candidata |
| Recursos didáticos | pro-game-knowledge, catálogo e fontes dos kits | Integrar na frente do lote 8; preservar drivers e geração determinística existentes |

Na data deste review, a alteração se limitava ao adendo e seus artefatos de análise. A execução autorizada depois está registrada no [plano do adendo](../docs/superpowers/plans/2026-10-15-studio-zappy-pro-adendo-implementacao.md), que documenta a divisão efetiva de arquivos. Antes de começar outro delta, reler o plano e o diff vigente, atribuir seu responsável e registrar os arquivos compartilhados. A divisão pode paralelizar componentes independentes, mas contratos, migrações e gravação do documento precisam de um dono por vez. Não executar checkout, reset, stash ou commit abrangente sobre trabalho concorrente.

### Migração, ativação e retorno

1. Ampliar leitores/parsers e armazenamento antes de habilitar novos escritores. Definir limites e versões do documento, pedido, resultado e recibo; testar instâncias antigas ainda abertas. O cliente informa capacidade, mas o servidor continua autorizando cada operação.
2. Validar fixtures do formato anterior, roundtrip local/nuvem, exportação/importação do documento e exportação independente de fontes. Consumidor antigo que não entende o formato recusa a escrita e pede atualização, preservando o original. Não retirar a guarda de preservação nem descartar campos desconhecidos para abrir o arquivo.
3. Habilitar cada corte por capacidade do host/servidor após suas provas. Jobs antigos continuam consultáveis/canceláveis; não receberão critérios, escopo ou artefatos inventados. Se não puderem continuar com segurança, terminar de forma explícita e oferecer novo pedido, sem reaproveitar autorização de consumo.
4. Recuar uma capacidade impede novas execuções/escritas daquele recurso, preservando consulta, cancelamento e edição dos documentos compatíveis. Reverter o aplicativo para um leitor incompatível não é rollback seguro; manter compatibilidade de leitura ou bloquear a abertura com recuperação/exportação preservada. Não executar migração destrutiva de dados.

A primeira integração inclui etapas 0–3, aproveitando a entrega local do lote 8 e o trabalho em andamento no lote 9. A07 permanece evolução separada. Um jogo pequeno pode ser produzido inteiro nessa integração; trabalhos maiores avançam por continuações explícitas. Não apresentar autonomia ilimitada, merge automático ou undo entre aparelhos como entregues.

## 12. Matriz de aceitação

| Caso | Resultado verificável |
|---|---|
| Criar manualmente sem IA habilitada ou sem créditos | Editar, salvar e exportar continuam disponíveis conforme capacidades do host; nenhuma inferência |
| Pedir uma dica sem solução pronta | Resposta curta e localizada; hash do documento inalterado |
| Explicar trecho após o caractere 4.000 | Trecho correto chega ao contexto, com linhas originais; referências navegáveis |
| Dizer “não funciona” | Investigação antes de proposta; diferencia esperado, observado e hipótese |
| Pedir correção após diagnóstico | Uma tarefa vinculada, sem redigitar contexto e sem dois históricos divergentes |
| Pedir mudança pequena em jogo existente | Preserva arte, controles e partes não envolvidas; diff delimitado |
| Construir jogo inteiro | Critérios acordados atendidos ou pendências explícitas; sem promessa além das evidências/budget |
| Alternar manual → orientação → construção → manual | Mesmo documento e conversa; nenhuma redefinição permanente de modo |
| Editar durante geração, inclusive arquivo diferente | CAS preserva edição; candidata desatualizada oferece caminho de reconciliação |
| Desfazer depois de nova edição | Não restaura snapshot inteiro nem apaga trabalho posterior |
| Fechar/reabrir após aplicar | Registro de aplicação e inversa retidos disponíveis; sem reaplicação ou inferência |
| Base com erro não relacionado | Diagnóstico identifica baseline; não amplia escopo silenciosamente |
| Pergunta pendente + recarga + resposta livre | Estado preservado, editor utilizável, resposta vinculada à pergunta certa |
| Jogar candidata e descartá-la | Documento e recordes reais iguais; instância/áudio/listeners liberados |
| Trocar regra/controle do kit | Perfil incompatível visível; sem teste removido para fabricar sucesso |
| Duas abas, retry, troca A → B → A | IDs, escopo, versão e leases impedem aplicação/cobrança duplicada |
| Cancelar com resposta tardia | Resultado antigo não restaura execução cancelada nem altera projeto |
| Limite familiar, BYOK ou uso incerto | Estado financeiro correto; sem fallback de fonte ou novas chamadas escondidas |
| Retirar aba IA | Desktop/estreito/atalhos abrem o mesmo Zappy; compatibilidade dos consumidores verificada |
| Portabilidade e acesso | Documento/ZIP usam kits próprios; perfil isolado; teclado/foco/leitor de tela e efeitos reduzidos |
| Missão do Pensa vinculada | Aplicar patch não conclui missão; conclusão exige o save confirmado e a referência/versão autorizada |
| Metadados novos e cliente antigo | Roundtrip preserva decisões; leitor incompatível recusa escrita sem sobrescrever o documento |
| Projeto grande ou dependência só local | Preflight informa incompatibilidade antes de inferência; orientação e edição continuam; quotas não são elevadas |
| Preview expirado antes do job | Reconstrução permitida tem novo artefato/relatório; sem fontes retidas, recuperação fica indisponível; captura antiga não comprova novo build |
| Job removido pelo teto familiar | Cartão informa expiração/remoção, não promete sete dias mínimos nem reconstrói proposta pelo chat |
| Falha de quota ao salvar aplicação | Documento/recibo não ficam parcialmente confirmados; edição em memória preservada; retry salva sem aplicar patch outra vez |
| Duas instâncias e autosave atrasado | Gravação compara revisão durável na mesma transação; autosave antigo não sobrescreve aplicação nova |
| Restaurar nuvem, duplicar ou abrir em outro aparelho | Código permanece íntegro; undo local não é apresentado como sincronizado; precondições invalidam inversa incompatível |
| Alternar Atual/Proposta e fechar preview | Só uma instância recebe input/toca áudio; descarte comprovado e editor/terminal preservados |
| Host sem tutor autorizado | Entrada indisponível de forma clara; sem chat fictício, fallback por chave local ou bloqueio do editor |
| Excluir projeto offline com job ativo | Cancelamento fica pendente, não confirmado; resultado tardio não recria/aplica projeto excluído |
| Objetivo maior que um job | Limite alcançado tem checkpoint/resultado explícito; nova etapa exige continuação e orçamento, sem loop de jobs |

Avaliações semânticas devem incluir mensagens ambíguas e pedidos de ajuda sem código pronto. Testar o contrato pela rota real, além de funções de prompt, para detectar campos descartados. Medir a qualidade das respostas com tarefas reais; testes de contrato não certificam comportamento de um modelo externo.

Nesta terceira revisão passaram **137 testes selecionados** nas últimas execuções de cada suíte (118 Studio, 14 member-shell, 3 core e 2 runtime; zero falhas) e quatro sondagens reproduzíveis das fronteiras de metadados, envelopes, curadoria e artefatos. A seleção do member-shell foi repetida após os avanços do lote 9; suas contagens anteriores de 10 e 13 não são somadas novamente. [Evidências e comandos desta rodada](studio-adendo-review3-evidence-2026-10-15.json). A [rodada anterior](studio-sandbox-fluxos-evidence-2026-10-15.json) permanece separada; não somar contagens como casos exclusivos.

Essas provas verificam a base e fundamentam as correções da proposta, não homologam a implementação futura do adendo. A matriz acima só pode ser marcada cumprida com resultados da implementação correspondente. Nesta rodada não houve inferência paga, execução do app Sandbox, homologação autenticada, teste físico ou deploy. Não afirmar que todos os novos fluxos funcionarão em produção antes dessas verificações.
