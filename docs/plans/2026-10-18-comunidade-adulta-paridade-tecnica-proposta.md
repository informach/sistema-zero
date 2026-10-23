# Proposta técnica de paridade entre a comunidade adulta e a comunidade Kids

Data: 18 de outubro de 2026. Escopo definido por Júlio: ferramentas, plataforma, recursos dos cursos, projetos, comunidade e gamificação. Criação pedagógica de cursos, ementas, preço e campanhas ficam fora deste trabalho.

A comunidade adulta deve oferecer o mesmo conjunto de capacidades do Kids: aprender e criar no mesmo ambiente, guardar projetos, circular entre ferramentas, publicar e remixar jogos, receber devolutivas e acompanhar uma progressão gamificada completa. A proposta é compartilhar os motores existentes e completar sua integração adulta, mantendo identidade, acesso e apresentação específicos de cada público.

Essa paridade inclui XP, sequência, conquistas, missões, rankings, ligas, moeda, avatar e ambiente pessoal. Esses recursos fazem parte do destino da plataforma adulta. A divisão em fases organiza dependências técnicas; não elimina recursos por serem usados hoje por crianças.

O [mapeamento de recursos e fontes](../../.audits/architectural-analysis-2026-10-18-comunidade-adulta.md) fundamenta esta proposta. As constatações referem-se ao código local; os cenários de funcionamento ainda precisam ser executados. Este documento substitui a direção de implantação da proposta anterior, que se concentrou em pedagogia e oferta.

## Diagnóstico arquitetural

Há duas aplicações, `community` e `community-kids`, apoiadas no mesmo `member-shell`, nos serviços de cursos e acesso e nas bibliotecas de criação. Os editores não precisam ser reescritos. Uma parte relevante da integração com esses editores, entretanto, ainda mora no aplicativo Kids.

O adulto possui 17 páginas e 68 caminhos de API em `src/app/api`; o Kids, 47 páginas e 133 caminhos de API. Os 68 caminhos de API adultos também existem no Kids. As 65 rotas adicionais incluem recursos familiares que não pertencem ao adulto, portanto a contagem não mede percentual de paridade.

Existem quatro tipos de diferença:

| Tipo | Exemplos | Tratamento |
| --- | --- | --- |
| Recurso já compartilhado | Player, seções, quizzes, exercícios, entregas, certificados e sala ao vivo | Verificar integração e completar apresentação |
| Integração restrita ao aplicativo Kids | Nuvem de rascunhos, galerias e hosts de ferramentas livres | Extrair comportamento reutilizável e montar no adulto |
| Regra de domínio restrita ao Kids | Posições da jornada, publicação no Mural e recompensa por contribuição | Criar políticas por público, com mudanças de serviço e banco quando necessárias |
| Experiência visual exclusiva | Celebrações, widgets, avatar, quarto, mapas, missões e ranking | Compartilhar componentes de domínio e fornecer apresentação adulta |

## Constatações técnicas adicionais

### Gamificação adulta já recebe eventos

`AwardGamificationService` aceita o público do curso e concede recompensas por aula e quiz. A conclusão de módulo adulto já premia automaticamente XP e moedas. `GetGamificationService` lê perfil, saldo, sequência e conquistas por `audience`.

O player adulto atual conclui a aula e segue a navegação sem apresentar o delta de recompensas como o Kids. Portanto, não se trata de criar o sistema de XP: é necessário expor estado, feedback, resgates e acompanhamento no aplicativo adulto.

Dados adultos já existentes devem ser preservados. O saldo real precisa vir do servidor; uma leitura indisponível não pode aparecer como saldo zero ou perda de conquista.

### Nível e jornada ainda têm regra infantil

O nível retornado pelo backend é calculado por posições qualificadas da Jornada do Criador. `validateJourneyPosition`, no serviço de autoria, recusa posição para curso adulto. O banco reforça a regra em `courses_career_slot_check`, permitindo posições somente com `audience = 'kids'`.

Copiar o mapa de níveis não produz progressão adulta válida. É necessário separar a política de progressão por público e atualizar autoria, consultas, validação e constraint do banco de forma consistente.

### Missões usam catálogo comum e elegibilidade desigual

O motor de missões já recebe `audience`, mas parte dos objetivos depende de Clube, Mural e Estúdio livre. O filtro de oportunidades de conteúdo existente é aplicado ao Kids, não ao adulto.

Ligar o painel adulto sem ajustar elegibilidade pode apresentar tarefas que a pessoa não consegue realizar. O mesmo conjunto elegível precisa governar exibição e resgate.

### Publicação exige mudanças no BFF e no Hub

O BFF contém um slug fixo de Mural Kids. `ShowcaseService`, no Hub, também recusa espaço adulto e elegibilidade de curso adulto. A aprovação de contribuição comunitária só dispara a recompensa para Kids.

O caminho correto é tornar público e destino explícitos e autorizados em cada etapa. Retirar uma checagem de Kids isoladamente enfraqueceria a separação sem completar o recurso.

### Algumas configurações ainda são globais

O estado de participação do desafio recebe `audience`, mas o contrato de configuração do tema mensal consultado é identificado pelo mês, sem público. Se adultos e Kids tiverem desafios diferentes, a configuração também precisará ser segregada.

As criações são indexadas por usuário, ferramenta e item. Diferentemente de vários estados de gamificação, não existe segregação universal por `audience` nessa chave. A adaptação deve revisar identidade, namespaces e autorização, em vez de assumir que todo armazenamento já distingue as duas plataformas.

## Plataforma adulta proposta

| Área | Capacidades esperadas |
| --- | --- |
| Início | Retomada de aula e projeto, resumo de XP/sequência, missões e novidades relevantes |
| Cursos | Catálogo, percursos, módulos, progresso, requisitos, entregas, certificados e acesso comprado |
| Criar | Entrada única para Estúdio, Pinta, Molda e, quando liberado, Pensa |
| Projetos | Biblioteca privada de jogos e assets, busca, retomada e estado de sincronização |
| Comunidade | Discussões, dúvidas, jogos publicados, reações, teste e remix |
| Progresso | Jornada, níveis, conquistas, missões, ranking e ligas |
| Perfil | Identidade, avatar 3D, vitrine de projetos e preferências de exposição |
| Espaço pessoal | Ambiente 3D personalizável, inventário, itens e troféus |
| Oficinas | Turmas, encontros, sala, projetos ao vivo e gravações |
| Ajuda | Biblioteca de tutoriais, ajuda contextual, recados e atendimento |

As capacidades devem aparecer conforme o usuário possui acesso. Recurso bloqueado por contrato, recurso ainda não conquistado e recurso temporariamente indisponível são estados distintos. A interface precisa explicar a diferença e a API precisa aplicá-la.

## Frente 1 Ferramentas de criação

### Estúdio completo

Disponibilizar no adulto o Estúdio livre com Blocos, Ponte e Código, criação de projetos, lista de trabalhos, prévia, assets, importação/exportação e projetos Pro. O acesso aos modos é resolvido pelo contrato e pelas liberações adultas, sem depender de postos infantis.

Reusar `studio`, os adapters e o runtime remoto existentes. Extrair do host Kids o que trata de persistência, serviços de execução, publicação e comunicação com outras ferramentas. Navegação, textos e composição visual continuam no aplicativo adulto.

Completar as rotas de build Pro, criações e publicação. As permissões de iframe, worker e mídia precisam corresponder ao runtime utilizado. O runtime remoto deve ser a base para Pro; terminal local é uma capacidade distinta, sujeita à compatibilidade do host.

Exportação e download precisam de configuração explícita. O editor de aula os desliga por padrão; não confundir a existência do recurso na biblioteca com sua disponibilidade em toda aula.

### Pinta

Disponibilizar o editor livre, sua galeria e o fluxo de criar/editar assets. Permitir levar o resultado ao Estúdio e editar novamente um asset a partir do projeto. O Pinta embarcado em aula já utiliza componente compartilhado; o trabalho maior está no host livre e na navegação entre ferramentas.

Reusar `PintaHostAdapter`, persistência e sincronização existentes. Validar que o vínculo entre asset e projeto permanece correto após renomear, atualizar e retomar em outro aparelho.

### Molda

Disponibilizar modelagem, texturas e céus 3D com biblioteca, salvamento, recuperação e integração com os projetos do Estúdio. O host adulto deve usar `MoldaHostAdapter` e capacidades adultas de ferramentas, sem reaplicar diretamente `moldaToolAccessFor` da jornada Kids.

A transferência precisa preservar as proteções de trabalho já existentes no Molda, os formatos versionados e a recuperação. A interface 3D deve carregar somente quando a pessoa abre a ferramenta.

### Pensa e serviços de IA

Incluir Pensa como capacidade da plataforma adulta, com liberação posterior por curso/percurso. O BFF atual exige criança ou papel privilegiado, portanto será necessário representar a conta adulta como ator válido, com acesso e limites próprios.

Manter no planejamento de jogos os contratos já existentes de projeto, missões e assets. Não ampliar o escopo para planejamento genérico de aplicações nesta transferência.

Tutor IA, créditos e voz também precisam de políticas adultas. A infraestrutura pode ficar preparada, com geração desativada nos contextos iniciais e habilitada apenas onde for configurada. A entrada por voz deve ser uma preferência do adulto, sem passar pela configuração de responsável infantil.

## Frente 2 Projetos e nuvem

Criar uma experiência comum de biblioteca e sincronização para projetos livres e rascunhos de aula. Os dois casos continuam com direitos distintos: o rascunho da aula é autorizado pela aula; a ferramenta livre, por sua licença.

Transferir para `member-shell` o transporte hoje concentrado em `community-kids`: fila de upload, marcas locais, reserva, envio ao R2, commit, retomada, resolução de conflito e indicação de estado. Reusar o contrato `LessonDraftCloud` e os handlers de criações existentes.

| Capacidade | Critério de aceitação |
| --- | --- |
| Salvamento local | Fechar e reabrir não apaga a edição confirmada no dispositivo |
| Salvamento na conta | Outro aparelho recupera o último estado confirmado no servidor |
| Conflito | Edições concorrentes preservam a outra versão e permitem decisão clara |
| Versão incompatível | Cliente antigo não sobrescreve formato que não consegue compreender |
| Navegação | Avançar de seção/aula coordena o salvamento necessário |
| Continuidade | Carryover utiliza a versão correta do projeto anterior |
| Exclusão | Exclusão sincronizada não ressuscita o item em outro aparelho |
| Recuperação | Falha de rede e upload incompleto preservam a última versão válida |
| Isolamento | Uma conta não lista nem carrega criações de outra |

Decisão técnica proposta: criações de aula são isoladas por curso/bloco e autor; a biblioteca livre adulta fica separada da infantil por contexto de plataforma, com compartilhamento futuro apenas explícito. Conferir se identidade e referências atuais bastam ou se será necessário acrescentar contexto às chaves e aos índices. Qualquer migração preserva os objetos Kids existentes.

## Frente 3 Recursos dos cursos

O objetivo desta frente é permitir que qualquer curso adulto use os recursos suportados pela plataforma, com validação e prévia correspondentes.

| Recurso | Trabalho de plataforma |
| --- | --- |
| Seções, objetivos e navegação | Preservar motor compartilhado e estados de bloqueio |
| Texto, vídeo, áudio, imagem, materiais e e-book | Verificar renderer, entrega autenticada e apresentação adulta |
| Quizzes, cenas e atividades interativas | Garantir os mesmos contratos, persistência e feedback |
| Estúdio e Pinta dentro da aula | Completar rascunho na conta, continuidade e envio |
| Projeto Pro | Expor build remoto e validar a prévia no host adulto |
| Entrega, histórico e revisão | Exibir versão enviada, resposta e reenvio sem apagar rascunho |
| Certificado | Preservar elegibilidade, emissão e validação |
| Materiais e Como fazer | Habilitar links quando houver páginas adultas válidas |
| Publicação do projeto | Integrar com mostra adulta e elegibilidade do servidor |
| Oficinas ao vivo | Manter mesma sala, transmissão, workspace e gravações por turma |

No Admin, o público do curso deve governar prévia, linguagem e disponibilidade de capacidades. Importar ou clonar um curso precisa respeitar a configuração adulta, inclusive suas liberações de ferramentas. Hoje o clone para adulto remove `studioUnlockBlocks`; isso precisa ser revisto quando o adulto passar a usar liberações por curso.

## Frente 4 Gamificação completa

### Estado e feedback

Expor XP, saldo, sequência e conquistas no aplicativo adulto. Na conclusão de aula, quiz, envio ou missão, mostrar apenas recompensas confirmadas na resposta do servidor. Atualizar o cabeçalho e o perfil após a celebração sem desmontar o editor em uso.

Extrair o comportamento dos providers e das celebrações Kids. A apresentação adulta pode ter animações, som e identidade próprios. As preferências de som e movimento devem ser respeitadas.

| Sistema | Reaproveitar | Completar ou adaptar |
| --- | --- | --- |
| XP | Ledger e concessões por ação | Widgets, histórico resumido e delta na interface |
| Sequência | Dia civil, proteção e férias | Indicadores, configuração e comunicação adulta |
| Conquistas | Slugs, registro e datas | Catálogo visual adulto e filtro por recursos disponíveis |
| Moedas | Saldo, teto, gasto e idempotência | Carteira, loja e apresentação adulta |
| Missões | Cadências, progresso por eventos e resgate | Elegibilidade por recurso, catálogo acessível e rotas adultas |
| Ranking | Consulta segregada, paginação e exclusão de equipe | Tela adulta, identidade pública e contexto de participação |
| Ligas | XP semanal e resolução de liga | Apresentação, acesso e navegação |
| Avatar 3D | Configuração, peças, inventário, compra e renderização | Extrair componentes, expor rotas e integrar à identidade adulta |
| Ambiente pessoal | Quarto 3D, catálogo, disposição e troféus | Host adulto, apresentação e integração com perfil |
| Recompensa de módulo | Evento de conclusão e deduplicação | Escolher apresentação sem duplicar o prêmio já automático no adulto |
| Desafios | Temas, participação e recompensas | Destino adulto e configuração por público quando houver temas distintos |
| Jornada e liberações | Marcos persistidos e conceitos de percurso | Política adulta, autoria, banco, projeções e editor |

### Jornada adulta e capacidades

Separar três perguntas no servidor:

1. A pessoa tem direito comercial ao recurso?
2. A pessoa atingiu o requisito configurado para usá-lo?
3. A pessoa está com a atividade ou o projeto em estado válido para a operação?

XP mede atividade; jornada representa progressão; licença concede direito. O mesmo número não deve substituir os três conceitos.

Proposta: um contrato de política de jornada por público, com versão, cursos/posições, marcos exigidos e recompensas de ferramentas. A política Kids atual mantém seus critérios. A adulta recebe uma configuração própria, sem limite estrutural imposto pelos 49 slots infantis.

Esta decisão exige alterar a restrição de autoria e a constraint do banco, além de atualizar consultas de nível, projeções e liberações. A migração deve preservar marcos Kids e conquistas já registradas. Os valores e critérios concretos da jornada adulta poderão ser definidos depois; aqui se propõe a capacidade técnica de configurá-los.

Não usar o nível atual do Kids como fallback de autorização adulta. Até existir política adulta válida, o servidor deve resolver capacidades explicitamente pelo contrato da atividade e pelos direitos existentes.

### Missões alcançáveis

Uma missão só aparece quando a plataforma oferece a ação e o aluno consegue acessá-la. Missões de publicar/remixar dependem da mostra; missões de arte dependem da ferramenta; tarefas de oficina dependem de vaga ativa.

Generalizar o filtro de oportunidades atualmente aplicado ao Kids. Exibição e resgate precisam consultar a mesma política. Repetir requisição ou resgatar em duas abas não pode pagar novamente.

### Economia cosmética

Reusar moedas, loja, inventário, avatar, itens e troféus. A moeda pode manter uma identidade visual adulta, preservando as regras e os saldos reais. A compra cosmética continua sem conceder nota, curso ou ferramenta paga.

O avatar adulto pode coexistir com foto de perfil. O ambiente pessoal pode se apresentar como espaço do criador, preservando a capacidade 3D do quarto. A proposta inclui esses sistemas; nomes e catálogo visual não exigem redefinir seu motor.

### Rankings, ligas e perfil

Usar coorte e estado adultos, sem somar XP infantil. Preservar exclusão de staff, paginação estável e autorização. O contrato atual de ranking adulto não expõe os mesmos links de perfil da experiência Kids; perfis clicáveis requerem uma identidade pública adulta explícita.

A conta adulta escolhe como se apresenta. Reusar a projeção de jogo e construir o vínculo de identidade apropriado, evitando depender de rotas de criança ou de consentimento parental. Perfil privado e opção de exibir publicamente são estados independentes do direito de estudar e criar.

## Frente 5 Comunidade, mostra e remix

Preservar o fórum adulto existente e acrescentar uma mostra jogável com publicação de projeto de aula e de criação livre, capa, descrição, reações, comentários, página de jogo e remix autorizado.

| Integração | Mudança necessária |
| --- | --- |
| BFF de publicação | Destino, URLs e público configuráveis |
| Hub Showcase | Elegibilidade e allowlist de destino por público, mantendo canal apropriado |
| Página de jogo | Host adulto e autorização para carregar o artefato |
| Remix | Verificar projeto original e capacidades do destinatário |
| Plays e marcos | Confirmar público de origem antes de recompensar |
| Moderação | Aplicar recompensas adultas apenas nas ações configuradas e aprovadas |
| Perfil | Listar publicações adultas com visibilidade correspondente |
| Desafio mensal | Vincular publicação e participação ao público correto |

O BFF e o Hub devem concordar sobre público do autor, projeto, curso e destino. A mesma publicação não deve ser recompensada simultaneamente como contribuição genérica e publicação de projeto quando isso duplicar a recompensa prevista.

## Frente 6 Acesso, operação e capacidade de vender

Reusar catálogo, pagamentos e matrículas. Acrescentar uma visão operacional das capacidades adultas: curso, ferramenta livre, espaço comunitário, turma e recurso de IA têm direitos verificáveis.

| Entrega | Regra técnica |
| --- | --- |
| Curso específico | Matrícula do curso adulto |
| Todos os cursos adultos | `all_courses`, respeitando modalidade e contrato |
| Ferramenta dentro de aula | Direito da aula/bloco; não exige licença livre adicional |
| Estúdio/Pinta/Molda/Pensa livres | Referência de acesso e capacidade configuradas |
| Comunidade e mostra | Direito ao espaço e às operações autorizadas |
| Oficina ao vivo | Vaga e grants da turma/sessões; não inferir pela chave-mestra |
| Tutor/IA | Direito, liberação de capacidade e limite de uso |

Revisar as referências atuais de produto: várias checagens de ferramentas livres não incluem público na própria referência. A introdução de licenças adultas precisa definir explicitamente se o direito vale em uma ou nas duas plataformas.

No Admin, incluir indicadores de prontidão técnica: ferramenta e runtime exigidos, modalidade, destino de publicação, liberações de jornada e prévia adulta. Não é necessário criar outro painel de autoria.

Venda de curso gravado já utiliza a infraestrutura central. Venda de vaga ao vivo requer auditoria específica de pagamento, reserva, lotação, concessão, confirmação, estorno e revogação; o caminho de inscrição examinado cria registros de origem manual.

## Organização do código

Recomendo manter os dois aplicativos e ampliar o núcleo comum. Copiar o aplicativo Kids inteiro criaria duas implementações que divergiriam; consolidar tudo em um único aplicativo agora ampliaria a mudança de sessão, identidade e implantação sem ser necessário para obter paridade.

| Responsabilidade | Local recomendado |
| --- | --- |
| Contratos de capacidade, jornada e público | `core` |
| Regras e estado de gamificação, acesso, criações e curso | `members` |
| Políticas de publicação, moderação e espaços | `hub` |
| Transporte de nuvem, BFF e componentes de domínio compartilhados | `member-shell`, agrupados por recurso |
| Editor e persistência interna de cada ferramenta | Pacote `studio`, `pinta`, `molda` ou `pensa` |
| Primitivos visuais e tokens | `ui` |
| Navegação, textos, temas e composição adulta | `community` |
| Identidade Kids, família e apresentação infantil | `community-kids` |

Extrair avatar e ambiente 3D para componentes compartilhados de domínio, com carregamento sob demanda. Não colocar regra de moeda ou acesso em `ui`. Não fazer o adulto importar componentes de `community-kids` diretamente.

Começar pelas extrações necessárias a cada frente. Evitar refatorar todo o player, todo o fórum e todos os editores antes de entregar uma capacidade utilizável.

## Ordem de execução

| Fase | Trabalho técnico | Entrega verificável |
| --- | --- | --- |
| 1 Fundação e gamificação visível | Matriz de capacidades, rotas adultas selecionadas, XP/sequência/conquistas e integração de deltas | Adulto conclui atividade e vê recompensa persistida, sem efeitos no Kids |
| 2 Nuvem e ferramentas | Extrair sincronização, biblioteca, hosts de Estúdio/Pinta/Molda e runtime Pro | Adulto cria, retoma em outro aparelho e leva assets entre ferramentas |
| 3 Progressão e economia | Política de jornada adulta, migração, missões, moedas, avatar, ambiente, ranking e ligas | Sistemas adultos completos, com recompensas e resgates corretos |
| 4 Mostra e comunidade | Publicação adulta no Hub, jogar, remix, perfil e desafios | Jogo adulto publicado, jogado e remixado no destino correto |
| 5 Operação e recursos condicionais | Prontidão no Admin, tutoriais, venda de vagas, Pensa/voz/tutor com política adulta | Gestão e acesso completos, com IA disponível apenas onde configurada |

As dependências são mais importantes que a numeração: missões de publicação entram depois da mostra; circulação de assets depende de identidade e nuvem; nível e liberação de ferramentas dependem da política adulta. XP e conquistas podem ficar visíveis antes do ambiente 3D estar pronto.

Não é necessário esperar todas as fases para usar recursos adultos já verificados. A paridade completa, entretanto, inclui todas as frentes descritas.

## Estimativa técnica preliminar

Hipótese de planejamento: uma pessoa experiente no monorepo, com dedicação integral, acesso a ambientes de teste e trabalho exclusivamente de plataforma. Não inclui conteúdo dos cursos, redesign visual completo, produção de assets 3D ou reescrita dos editores.

| Frente | Esforço inicial indicativo |
| --- | --- |
| Fundação, políticas e gamificação visível | 4 a 7 dias úteis de desenvolvimento |
| Nuvem e hosts de ferramentas | 8 a 15 dias úteis |
| Jornada, economia e gamificação completa | 10 a 18 dias úteis |
| Mostra, remix, perfil e desafios | 7 a 12 dias úteis |
| Admin, tutoriais, integração final e regressão | 5 a 9 dias úteis |
| Total do núcleo de paridade | 34 a 61 dias úteis |

Venda automatizada de vagas e adaptação completa de Pensa/IA/voz devem receber estimativa própria após auditar os fluxos de identidade e cobrança. A faixa total não representa paridade desses recursos condicionais nem prazo contratado. O primeiro teste vertical e o inventário de extrações devem recalibrar a estimativa antes de um cronograma fechado.

## Migração e implantação

Preservar saldos, XP, inventário, conquistas e projetos já existentes. Novos contratos devem conviver com clientes publicados até que os dois aplicativos tenham sido atualizados.

Alterações de jornada precisam de migração para a constraint que hoje limita posições ao Kids, seguida das projeções e validações correspondentes. Se houver versionamento de percurso, os marcos devem continuar interpretáveis pela versão em que foram conquistados.

Para desafios separados, introduzir contexto de público na configuração com preenchimento explícito dos dados existentes. Para armazenamento segregado, não renomear ou apagar objetos em massa sem mapa de compatibilidade e recuperação.

Liberar frentes independentemente em staging, com contas adultas e Kids comuns. Configuração ausente ou erro de consulta deve produzir estado indisponível, não liberação ampla nem bloqueio comercial falso.

## Critérios de paridade

| Área | Prova necessária |
| --- | --- |
| Cursos | Conta adulta usa os tipos de bloco e os fluxos suportados, inclusive entregas e Pro |
| Criações | Salvar, retomar, conflito, exclusão e recuperação funcionam em dois navegadores |
| Ferramentas | Estúdio/Pinta/Molda circulam assets sem perder vínculo ou permissão |
| XP e conquistas | Evento confirmado aparece; repetição não duplica recompensa |
| Moedas | Compra/resgate concorrentes preservam saldo e inventário |
| Jornada | Adulto avança pela política adulta; Kids mantém a sua |
| Missões | Toda tarefa exibida é acessível e seu resgate usa a mesma regra |
| Ranking e liga | Públicos e equipe não se misturam; paginação e semana permanecem consistentes |
| Avatar e ambiente | Equipar, comprar, montar e retomar preservam estado e posse |
| Mostra | Publicar/jogar/remixar funciona somente nos destinos e acessos corretos |
| Perfil | Visibilidade escolhida e dados publicados correspondem à conta adulta |
| Administração | Prévia, contratos, liberações e prontidão representam o que o aluno recebe |
| Regressão | Fluxos Kids compartilhados continuam funcionando após cada extração |

Testes de domínio cobrem regras; testes com banco cobrem concorrência, ledger e migrações; testes de browser cobrem editor, assets, nuvem, avatar e ambiente 3D. Não substituir a prova completa por testes de componentes isolados.

## Decisão recomendada

Tratar a comunidade adulta como outra experiência completa do mesmo ecossistema. Compartilhar ferramentas, nuvem e motores de gamificação; completar as políticas de público, jornada e publicação; dar ao adulto a mesma capacidade de criar e participar.

O primeiro incremento deve ligar gamificação real e salvamento na conta no adulto. Em seguida, expandir ferramentas livres e concluir progressão, economia e mostra. Essa ordem produz melhorias utilizáveis enquanto prepara a paridade completa, sem depender da criação pedagógica de um curso.
