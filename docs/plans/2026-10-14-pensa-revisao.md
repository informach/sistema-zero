# Revisão completa da proposta do Pensa

> Histórico: substituído pela [especificação funcional de 16/10/2026](2026-10-16-pensa-reestruturacao-spec.md). Este documento registra decisões anteriores e não define o contrato vigente.

**14 de outubro de 2026 — três rodadas de revisão de produto, fluxos, usabilidade infantil e arquitetura proposta**

Documento principal: [proposta consolidada](2026-10-14-pensa-proposta.md). Apoio: [pesquisa e evidências](2026-10-14-pensa-pesquisa.md) e [inventário GameDev](2026-10-14-pensa-skills-inventario.csv).

## Parecer

A direção é coerente com o objetivo confirmado: a criança constrói, enquanto Zappy transforma uma ideia livre em um primeiro jogo possível, organiza a construção e ajuda a evoluí-lo. Voz, conhecimento das aulas, método ZERO e integração entre ferramentas contribuem para essa experiência quando tratados como partes do mesmo fluxo.

A primeira revisão tratou 14 achados e incorporou OpenRouter obrigatório e identidade visual Kids. A segunda acrescentou 12 achados sobre facilidade e utilidade. A terceira acrescenta **seis lacunas na continuidade entre telas, ferramentas e versões**. São 32 achados documentados ao todo, 21 de impacto alto e 11 de impacto médio. Impacto aqui significa risco para a consistência ou utilidade da implementação proposta; não classifica incidentes ou vulnerabilidades comprovadas em produção.

O principal achado da segunda rodada é que simplificar a entrada não bastava: o guia no editor ainda podia impor listas de confirmação, navegação repetida e orientações que dizem o objetivo sem ensinar como começar. A proposta passou a exigir uma primeira ação utilizável, conclusão por resultado, ajuda que muda de estratégia e continuidade no mesmo arquivo. O visual familiar e a voz apoiam essa experiência, mas não comprovam que ela seja intuitiva.

Na terceira rodada, o ponto central foi fechar essa continuidade: a criança precisa reencontrar o jogo certo, usar voz também no tutor do editor e receber orientação compatível com a versão aberta. Acesso ao Estúdio não garante tutor habilitado, e voltar um arquivo não basta para voltar o acompanhamento. A seção 3.10 consolida o que aparece e qual ação tem destaque em cada momento, sem acrescentar outro painel para a criança administrar.

A proposta revisada pode orientar o protótipo e a especificação técnica. O piloto agora inclui o ciclo inteiro: ideia → proposta viável → escolha → preparação → construção → teste → incremento simples, com preservação da base anterior. Sua aprovação documental não demonstra qualidade de transcrição, usabilidade infantil, fidelidade pedagógica ou funcionamento dos novos contratos; esses pontos têm evidências de liberação definidas.

## O que foi examinado

- Leitura integral da proposta anterior e reconciliação das decisões presentes na conversa.
- Confronto com domínio do Pensa, planejamento, tarefas, ciclos, progresso, quota, salvamento de criações, handoff, busca do Zappy, voz existente e contratos visuais do host Kids.
- Percurso analítico dos cenários da matriz abaixo, verificando entrada, pré-condição, resultado, falha e retomada. É uma análise documental de fluxos, não uma execução do aplicativo reformulado.
- Conferência das contribuições das skills, separando método aproveitável, regras inadequadas e funcionalidade ainda a construir.
- Consulta à documentação oficial do OpenRouter para confirmar o caminho de transcrição. As demais fontes públicas e seus limites estão na pesquisa anexa.
- Na segunda rodada, inspeção do guia de tarefas, regra de conclusão, sessão de handoff e serviços de arquivamento/exclusão; consulta às orientações primárias W3C e Scratch registradas como E17–E19 na pesquisa.
- Na terceira, conferência de listagem/retomada, política de acesso ao tutor, entrada e respostas do painel, limites de mensagem, categorias de quota e dependências de progresso. A fonte E20 complementa os critérios de linguagem, sem substituir pesquisa de uso.

O inventário contém 373 arquivos de skills, com 359 conteúdos distintos. A pesquisa original leu 27 integralmente e 15 por seções, além de triar os demais 331. Esta revisão não transforma essa cobertura em leitura integral das 373 nem afirma ter executado suas ferramentas. Nenhuma skill foi instalada no produto.

Não houve mudança no código do aplicativo, deploy, geração paga de áudio, avaliação com crianças ou acesso a históricos privados. As constatações locais descrevem o workspace examinado, que contém trabalho concorrente em outras áreas.

## Primeira revisão: achados R01–R14

| ID / impacto | Problema da proposta anterior | Correção no documento consolidado | Onde conferir |
| --- | --- | --- | --- |
| R01 — Alto | Prometia um jogo construível antes de detalhar como ele seria implementado. A criança poderia aceitar algo cuja inviabilidade só aparecesse depois. | Exigir esqueleto validado de mecânicas, recursos, assets, dependências e teste antes do cartão. Aceitação vincula a revisão; guias preservam o escopo; mudança material retorna à escolha. Tarefas só aparecem após commit integral. | §§ 3.3, 8 e 9. |
| R02 — Alto | Planejamento pronto, execução, teste e ZERO não tinham transições inteiramente reconciliadas. Retomar podia parecer reiniciar o ciclo, e testar podia ser confundido com passar no teste. | Estados separados, mapeamento ZERO versionado, resultado explícito do teste e encerramento incompleto possível. Retomada mantém estado; correção volta a R; mudança de escopo volta a E; incremento inicia outro ciclo. O teste final não bloqueia a própria entrada em O. | §§ 3, 5 e diagrama da § 8. |
| R03 — Alto | “Revisar tarefas” não explicava como preservar conclusão e dependências frente às transições atuais. | Tarefa de reparo ou revisão mantém a evidência anterior; desativação exige remapear dependências; pular não equivale a concluir. Trabalho feito livremente pode ser associado após verificação, sem obrigar repetição. | §§ 5, 9 e 12. |
| R04 — Alto | Criar arte antes do jogo podia herdar a exigência de integração como condição de conclusão e formar uma dependência circular no desenho novo. Assets provisórios também careciam de origem explícita. | Separar produzir/vincular → integrar → experimentar. A criação do asset termina com sua saída salva; importação tem evidência própria. Reutilização exige asset real e autorizado; substituir cópia no jogo depende do contrato do editor. | §§ 6 e 13. |
| R05 — Alto | Preservação do plano e ID de projeto podiam ser interpretados como preservação restaurável do jogo. O salvamento atual pode remover arquivos anteriores. | Exigir checkpoint privado materializado e retenção dos assets antes de incremento ou revisão estrutural. Host controla integridade, armazenamento e restauração. Falha na proteção impede substituir a base. Teste vale para a revisão testada. | §§ 5, 9 e 11. |
| R06 — Alto | O discurso de primeiro fluxo completo dependia de reserva de ideias, reutilização, revisão e incrementos que apareciam adiados no roadmap. | Fechar piloto com ideias guardadas, assets existentes/provisórios, reparo básico e pelo menos um incremento simples com checkpoint. Adiar apenas aprofundamentos, equipes e automações avançadas. | §§ 11 e 13. |
| R07 — Alto | Plano compartilhado não tinha uma regra suficientemente clara para capacidades diferentes, saídas por perfil e conteúdo privado. | Piloto individual; equipes existentes permanecem utilizáveis no legado. Expansão futura exige capacidades compatíveis, saídas/progresso por perfil e autorização de referências. Áudio e histórico pessoal não herdam visibilidade de equipe. | §§ 6, 11 e 12. |
| R08 — Alto | A nova experiência podia parecer uma troca de nomes sobre estágios e schemas que ainda exigem cinco artefatos, vitória/derrota e produção visual completa. | Contrato v2 com comandos e DTOs coerentes; nenhum campo fictício para atravessar o fluxo antigo. Migração gradual, leitura compatível, reconciliação de projetos e rollback sem conversão destrutiva. | §§ 3, 9 e 12. |
| R09 — Alto | O caminho principal estava mais detalhado que interrupções, autosave, duas abas, falha de arquivo e limites de domínio. | Identidade de rascunho antes de operação paga; texto não enviado separado de decisão; transcrição tardia não apaga edição; tabela de exceções com ações concretas. Limites verificados antes de gerar. | §§ 3.1, 5, 8 e 10. |
| R10 — Alto | Durabilidade, cancelamento e cobrança não definiam claramente o momento de entrega e os efeitos de reconexão ou espera pela criança. | Commit atômico, jobs persistidos, revisão esperada, reserva e ledger por operação. Expiração é verificada antes da aceitação; retomada não cobra outra unidade. Distinguir possível custo repetido do fornecedor de débito interno duplicado à família. | §§ 8, 9 e 13. |
| R11 — Médio | Voz dinâmica dependia de identidade/revisão de mensagem que o chat atual não fornece; política de entrega privada precisava ser fechada. | Referência narrável estável para mensagem, proposta, guia e retorno de teste. Texto finalizado e versionado; cache privado; entrega autenticada no piloto; comportamento definido para geração, cancelamento, troca de perfil e áudio antigo. | §§ 3.7, 9 e 10. |
| R12 — Médio | Acesso à base oficial poderia ser confundido com domínio da criança, autorização de recurso ou conhecimento completo do editor. | Separar capacidade, catálogo, conteúdo autorizado e progresso. Validar referências; usar vocabulário oficial; ajuda técnica no Estúdio usa seu contexto real. Busca vazia não cria citações nem prova inexistência de aula. | §§ 3.5 e 8. |
| R13 — Médio | Posto e ferramenta liberada não resolvem disponibilidade granular, dispositivo incompatível ou ausência de qualquer recorte viável. | Capacidades autoritativas incluem recursos e dependências; contexto do dispositivo restringe execução, sem conceder permissões. Sem caminho válido, preservar a ideia e oferecer alternativa identificada, sem inventar executabilidade. | § 4 e critérios da § 13. |
| R14 — Médio | Exemplos, fases de entrega e avaliação misturavam algumas hipóteses e evidências. Diferenças de interface podiam ser atribuídas à quantidade de agentes. | Reconciliar exemplo com o nascimento do filhote, consolidar requisitos e separar benchmark de arquitetura da pesquisa de experiência. Latência medida por etapa, excluindo decisão humana; metas e amostra formativa não viram garantias de resultado. | §§ 4, 11, 13 e 15. |

R04 é uma prevenção de inconsistência no fluxo proposto; não houve reprodução de um travamento atual no Pinta. R05 é sustentado pelo comportamento de salvamento inspecionado, mas a solução de checkpoint ainda precisa ser implementada e testada. Essa distinção vale para todo o relatório: corrigir o planejamento não significa corrigir o código.

## Segunda revisão: achados R15–R26

As correções seguintes refinam a proposta consolidada anterior. Elas não são observações de uso por crianças: combinam inspeção de código, percurso dos fluxos e hipóteses que agora têm critérios de avaliação.

| ID / impacto | Lacuna identificada | Correção incorporada | Onde conferir |
| --- | --- | --- | --- |
| R15 — Alto | A simplificação não alcançava a conclusão das missões: guia e domínio atuais exigem marcar passos e critérios. | Separar instrução de evidência no v2; confirmação curta do resultado quando necessária, mantendo fonte e saída válida. Não esconder checkboxes e deixar o servidor dependente deles. | §§ 3.4, 9, 11 e 13. |
| R16 — Alto | “Missão curta” podia continuar sendo apenas um objetivo, sem o primeiro passo utilizável. | Guia informa ação, localização real do recurso e efeito esperado. Detalhe progressivo e exemplos pertinentes; sem controles ou destaques inventados. | §§ 3.4 e 3.9. |
| R17 — Alto | Retorno ao Pensa podia virar pedágio entre ações no mesmo editor; referências de aula podiam romper o contexto. | Próxima missão elegível no guia, preservando arquivo/canvas após salvar e revalidar. Troca de ferramenta e retorno de referência mantêm contexto explícito. | §§ 6, 9 e 11. |
| R18 — Alto | Recursos liberados não garantem que o começo seja ensinável para a criança. | Avaliar conceitos/operações novos, familiaridade e apoio disponível. Primeiro efeito perceptível e detalhe ajustável, sem rótulo de habilidade ou restrição indevida de permissão. | §§ 3.9 e 4. |
| R19 — Médio | Convite inicial ainda acumulava perguntas; ações, caminho, ideias e esperas podiam competir pela atenção. | Um convite livre; exemplos sob demanda; ação principal por estado; caminho/ideias expansíveis. Espera preserva escolha e próximo passo, sem aprovação extra ou navegação automática tardia. | §§ 3.1–3.4 e 3.9. |
| R20 — Médio | Voz estava fechada sobretudo para a primeira ideia. A remoção do áudio “após transcrição” também era ambígua diante do buffer local de revisão. | Ditado para correção, ajuda e teste; ouvir o entendimento curto e discordar sem revisar toda a transcrição. Servidor e buffer local têm ciclos de descarte distintos. | §§ 3.1, 3.7 e 10. |
| R21 — Alto | Níveis de ajuda não definiam o que fazer quando a orientação não resolvesse ou quando a criança discordasse. | Tentativa pequena com efeito observado; estratégia diferente após “Ainda não consegui”; limites honestos. Distinguir escolha criativa de falta de entendimento e não repetir perguntas sem avanço. | §§ 3.5, 3.9 e 13. |
| R22 — Médio | Experimentação podia parecer restrita a O e todo encerramento ainda aparecia em O, inclusive antes de construir. | Preview livre durante R; encerramento mantém a etapa alcançada; pausa/retomada incompleta não cria ciclo automaticamente. Experimento informal não marca teste remoto inexistente. | §§ 3.6, 5 e 8. |
| R23 — Alto | Arquivar/apagar não tinha fluxo fechado para jobs e artefatos novos; uma resposta tardia poderia recriar dados. | Distinguir salvar, pausar, arquivar e apagar; invalidar jobs e limpar derivados, preservando criações independentes. Reativação não ressuscita geração antiga. | §§ 5, 8, 9 e 13. |
| R24 — Alto | “Esqueleto validado” ainda permitia interpretar schema/catalogação como prova suficiente de executabilidade; o diagrama devolvia mudança material direto ao cartão. | Receitas de mecânicas testadas no recorte, combinações compatíveis e revisão por runtime. Recorte alterado volta à validação antes de outro cartão. Separar viabilidade da receita de funcionamento da montagem feita pela criança. | §§ 3.3, 4, 8, 9 e 13. |
| R25 — Médio | Avaliação tinha perguntas úteis, mas pouca definição de ajuda efetiva e risco de fragmentar amostra pequena entre variantes. | Protocolo do fluxo completo, dificuldade → orientação → tentativa seguinte, apoio extra registrado e falhas que impedem ampliação do piloto. Rodadas formativas sem alegação causal. | § 13. |
| R26 — Alto | Checkpoint somente antes do incremento podia chegar tarde: edição livre e autosave após encerrar já poderiam eliminar a base anterior. | Proteger a revisão ao encerrar, antes de anunciar cópia recuperável; revalidar base/estado atual no incremento. Cobrir concorrência de captura, autosave e limpeza. | §§ 5, 8, 11 e 13. |

## Terceira revisão: achados R27–R32

| ID / impacto | Lacuna identificada | Correção incorporada | Onde conferir |
| --- | --- | --- | --- |
| R27 — Alto | A entrada partia de uma nova ideia; o retorno com vários projetos e o reencontro de arquivados estavam incompletos. A listagem atual só retorna ativos. | Separar primeira visita de continuar um jogo identificado, evitar rascunhos vazios e prever consulta/reativação de arquivados com verificação do limite. Retorno consulta o estado real do job. | §§ 3.1, 3.10 e 5. |
| R28 — Alto | A ajuda técnica dependia do tutor, mas a disponibilidade deste não estava representada nas capacidades. A flag do tutor é condição adicional ao nível compartilhado. | Resolver autorização, habilitação e disponibilidade; incluir esse contexto no planejamento e no handoff. Guia salvo permanece, sem contornar tutor desabilitado por outra rota. | §§ 3.5, 4, 9 e 11. |
| R29 — Médio | Ditado e escuta foram prometidos ao longo da conversa, mas o painel do tutor inspecionado é textual e possui limite de entrada diferente. | Estender os adapters ao tutor nas sessões assistidas; reaproveitar IDs e autorizar conteúdo pela origem. Preservar transcrição longa sem truncar ou criar pedidos adicionais automaticamente. | §§ 3.5, 9, 10 e 11. |
| R30 — Alto | Restauração protegia arquivos, mas não fechava coerência entre criação antiga, plano ativo, guia e dependências concluídas depois. | Restauração recuperável entre serviços; reconciliar arquivo/plano/evidências e invalidar resultados obsoletos. Preservar histórico sem tratar conclusão antiga como prova da condição atual. | §§ 5, 9 e 13. |
| R31 — Médio | “Alteração após entrega” podia tratar explicação como novo plano; encaminhamento da dúvida e mensagens de saldo não tinham política suficientemente clara. | Matriz de planejar/ajudar/reparar/voz, identidade única no encaminhamento e regras de limite. Não atribuir saldo da conta à criança nem dizer que ela já pensou bastante. | §§ 8, 9 e 13. |
| R32 — Médio | Regras de ação principal estavam dispersas; falha de checkpoint podia parecer obrigação de manter sessão aberta e “salvo” tinha alcance ambíguo. | Contrato de tela, ação e retorno; ajuda com rótulo consistente, saídas visíveis e distinção entre ideia, arquivo local, sincronização e versão protegida. Pode pausar com proteção pendente. Mudança de redação não exige nova aprovação. | §§ 3.3, 3.10, 5 e 13. |

### Parecer sobre facilidade e utilidade

A proposta ficou mais adequada ao objetivo infantil ao definir o que aparece e o que a criança consegue fazer em cada momento. Os critérios centrais são: reconhecer sua ideia, localizar a ação, produzir um efeito, discordar, sair de um impasse e retomar. Gestão, contratos e agentes ficam nos bastidores. Isso é uma conclusão sobre a coerência do desenho revisado; a facilidade real ainda precisa ser observada.

O teste de utilidade será o que a ajuda permite fazer depois de recebida. Um elogio à interface, uma fala agradável ou um checklist completo não demonstram isso. A avaliação deve permitir escolhas próprias e exploração, sem penalizar uso de Zappy, tecnologia assistiva ou decisão de parar.

## Requisitos reforçados durante a revisão

**OpenRouter:** o cliente atual já usa o gateway no servidor. A proposta agora o exige para planejamento, revisão, guias, ajuda, especialistas e transcrição. O adapter textual existente não oferece STT; a documentação oficial confirma uma API dedicada, descrita na pesquisa. Falha do gateway não autoriza uma chamada direta oculta a outro provedor. Modelos e condições das rotas serão avaliados dentro dessa integração. ElevenLabs continua responsável pela voz própria do Zappy, como solicitado anteriormente.

**Visual Kids:** a mudança usa a identidade, as paletas, Nunito/Baloo, receitas de cartões e controles, navegação e imagens oficiais já presentes na Comunidade Kids. O host continua responsável por seu shell; o pacote Pensa consome os contratos compartilhados. A seção 3.8 exige comparação visual com Criar, Estúdio e Pinta em todos os estados relevantes, incluindo espera e erro. O wireframe textual não é uma proposta de identidade nova.

Ambos estão no cabeçalho de requisitos, nas frentes P0, nos critérios de avaliação e nas condições de liberação da proposta.

## Rastreabilidade dos pedidos

| Pedido confirmado | Resposta na proposta | Evidência necessária na implementação/piloto |
| --- | --- | --- |
| A criança constrói; Zappy orienta. | Missões e ajuda localizada, sem instalar o jogo completo por ela. §§ 1 e 3. | Observar ação, compreensão e escolhas da criança durante a construção. |
| Contar uma ideia crua livremente. | Texto ou ditado revisável; esclarecimento apenas quando muda o recorte. § 3. | Casos com narrativa longa, frase curta, ideia vaga e correção da transcrição. |
| Uma primeira versão simples que ainda seja seu jogo. | Preservação de elementos essenciais, esqueleto viável e escolha explícita. §§ 3 e 4. | Criança reconhece a ideia; projeto de referência funciona com o perfil real. |
| Evoluir em incrementos. | Reserva de ideias, teste, checkpoint e segundo ciclo simples já no piloto. §§ 5 e 11. | Incremento aproveita a base e ela continua recuperável. |
| Aproveitar as skills GameDev. | Métodos traduzidos em requisitos e avaliações; seleção por necessidade. § 7. | Saídas preservam interação central, escopo, dependências, teste e autoria; não executam comandos externos. |
| Ouvir a voz do Zappy. | Síntese dinâmica ElevenLabs, opcional, texto sempre disponível. §§ 3.7 e 10. | Voz correta, revisão correta, foco de áudio, cache e falhas recuperáveis. |
| Manter analogia ZERO. | Zerar → Enxergar → Realizar → Observar, com mapeamento de estados. §§ 3 e 5. | Etapa visível acompanha retomada, correção, teste e incremento. |
| Respeitar posto e o que já está liberado. | Capacidades autoritativas antes da proposta e novamente nas transições. § 4. | Nenhuma mecânica executável depende de recurso indisponível. |
| Integrar Estúdio, Pinta e Molda. | Contratos de entrada, salvamento, saída, integração e retorno. § 6. | Ida e volta preservam perfil, revisão, arquivo e contexto da missão. |
| Usar conhecimento da plataforma e das aulas. | Serviço compartilhado do Zappy, referências verificadas e revisão pedagógica. § 8. | Plano segue métodos pertinentes sem inventar fontes ou presumir domínio. |
| Utilizar OpenRouter. | Gateway obrigatório de modelos e STT; ElevenLabs preservada para síntese. §§ 8 e 10. | Rotas conferidas, falhas simuladas e modelos avaliados. |
| Seguir o visual da Comunidade Kids. | Tokens, componentes, fontes, paletas e navegação existentes. § 3.8. | Comparação de telas renderizadas e uso com teclado, toque e tecnologia assistiva. |
| Ser fácil, intuitivo e realmente ajudar. | Critérios de experiência, guia acionável, ajuda adaptada à tentativa e continuidade no editor. §§ 3.9, 6 e 13. | Percurso observado da ideia à ação, correção e retomada, incluindo impasse e necessidade de apoio adicional. |

## Matriz de fluxos revisados

Todos os itens a seguir foram percorridos na análise documental. “Definido” indica que a proposta especifica o comportamento esperado; não significa teste de software aprovado.

| Cenário | Resultado esperado / recuperação | Situação do planejamento |
| --- | --- | --- |
| Texto curto ou narrativa longa | Guardar original, extrair intenção e sugerir recorte sem repetir entrevista fixa. | Definido para o piloto. |
| Criança ainda sem ideia | Sementes abertas, combinação e rascunho; nenhuma escolha presumida. | Definido para o piloto. |
| Microfone negado, silêncio ou formato inválido | Texto permanece utilizável; explicar falha sem apagar o rascunho. | Definido para o piloto. |
| Nome inventado transcrito errado | Revisar texto ou regravar; síntese posterior separada da transcrição. | Definido para o piloto. |
| Cancelar gravação ou receber trecho atrasado | Descartar só o trecho cancelado; respeitar edição e identidade do perfil/projeto. | Definido para o piloto. |
| Proposta aceita, recusada ou corrigida | Escolha explícita de revisão; preservar intenção e ideias adiadas. | Definido para o piloto. |
| Detalhamento altera o recorte escolhido | Retornar ao cartão e mostrar a mudança; não substituir silenciosamente. | Definido para o piloto. |
| Falha na geração ou commit do plano | Manter escolha, retomar job, não abrir tarefas parciais. | Definido; exige testes de interrupção. |
| Pedido incompatível com posto/recursos | Aproximação identificada ou ideia guardada; nenhum bloqueio vira tarefa obrigatória. | Definido para o piloto. |
| Capacidades indisponíveis ou alteradas | Não declarar executabilidade sem validação; preservar trabalho e reavaliar somente o necessário. | Definido para o piloto. |
| Dispositivo incompatível | Explicar a limitação de execução sem atribuí-la ao posto; preservar continuidade em dispositivo suportado. | Definido; matriz de dispositivos pendente. |
| Aula acessível, mas recurso bloqueado | Referência pode ser autorizada; recurso continua fora do escopo construível. | Definido para o piloto. |
| Busca curricular vazia ou fora do ar | Usar somente evidência técnica disponível ou adiar parte dependente; não inventar fonte. | Definido para o piloto. |
| Referência perde acesso/publicação | Revalidar trecho e áudio protegido; manter intenção e trabalho autoral. | Definido; contrato de procedência necessário. |
| Começar pelo Pinta/Molda | Produção salva conclui sua missão; importação e teste têm etapas próprias. | Definido para combinações validadas. |
| Pinta indisponível ou arte reutilizável | Recurso existente real ou criação simples autorizada; arte original não é requisito universal. | Definido para o piloto. |
| Asset alterado, ausente ou incompatível | Atualizar/importar conforme contrato, restaurar ou vincular saída compatível; testar o uso. | Definido para o piloto; impacto amplo posterior. |
| Sair do editor e voltar | Salvar, retornar à missão e localizar arquivo existente; não criar arquivo vazio por padrão. | Definido para o piloto. |
| Trabalho feito fora da sequência sugerida | Associar evidência válida à missão e atualizar dependências sem refazer trabalho. | Definido para o piloto. |
| Duas abas alteram plano/progresso | Comparar revisão, guardar arquivo e reconciliar conflito; resultado antigo não sobrescreve novo. | Definido; exige testes de concorrência. |
| Missão concluída precisa de correção | Criar reparo/revisão, preservar conclusão histórica e rever evidência afetada. | Definido para o piloto. |
| Nenhuma missão disponível | Identificar teste pronto, dependência bloqueada ou inconsistência; oferecer ação pertinente. | Definido para o piloto. |
| Preview aberto sem evidência do objetivo | Registrar apenas o que se sabe; não concluir sucesso automaticamente. | Definido para o piloto. |
| Teste falha ou é inconclusivo | Registrar revisão e resultado; oferecer correção ou pausa, mantendo histórico. | Definido para o piloto. |
| Encerrar pequeno ou parar incompleto | Encerramento explícito com motivo; sem publicação, recompensa ou sucesso fictício. | Definido para o piloto. |
| Escolher incremento | Revalidar capacidades, proteger a base e planejar apenas a mudança. | Obrigatório no piloto. |
| Checkpoint falha ou asset antigo é limpo | Não avançar substituindo a base; restauração deve depender de material retido. | Definido; prova de restauração necessária. |
| Trocar 2D por 3D | Nova base/projeto compatível quando necessário; sem conversão automática presumida. | Limite explícito do piloto. |
| Pausa longa, offline ou sessão expirada | Retomar estado confirmado, separar salvamento local/remoto e revalidar autorização. | Definido para o piloto. |
| Quota esgotada ou reserva expirada | Manter arquivos/guias; nova reserva antes da aceitação se necessário; sem débito duplicado na retomada. | Definido; parâmetros do ledger pendentes. |
| Limites de projetos, ciclos ou mensagens | Conferir antes de pagar; oferecer alternativa suportada e preservar dados canônicos. | Definido para o piloto. |
| Ouvir, parar, editar e ouvir de novo | Texto final e revisão corretos; foco de mídia, cancelamento e cache privados. | Definido para o piloto. |
| Síntese lenta/falha ou autoplay bloqueado | Texto continua; áudio pronto pode exigir novo toque; nenhuma troca silenciosa da voz. | Definido; validação de dispositivos necessária. |
| OpenRouter indisponível/modelo inadequado | Preservar pedido; erro recuperável ou alternativa configurada pelo mesmo gateway. | Definido para o piloto. |
| Troca de perfil durante áudio/IA | Parar mídia, limpar buffers e impedir exibição/publicação sem autorização válida. | Definido; testes de isolamento necessários. |
| Novo layout em outra paleta/tela | Herança de tokens, leitura, foco e ação principal preservados. | Definido; comparação visual necessária. |
| Projeto antigo marcado `done` | Reconciliar execução real; nunca apresentar jogo concluído só por plano pronto. | Migração gradual definida. |
| Plano compartilhado/adulto e rollback | Manter legado utilizável; v2 não força conversão destrutiva nem exposição de dados. | Fora do piloto novo; compatibilidade exigida. |
| Voz depois da primeira ideia | Corrigir, pedir ajuda e relatar teste pelo mesmo ditado revisável, sem comando executado automaticamente. | Definido para o piloto. |
| Guia consultado sem marcar passos | Evidência de resultado e saída, sem converter leitura/navegação em execução. | Contrato v2 exigido no piloto. |
| Criança não sabe localizar o primeiro recurso | Mostrar nome/caminho real e instrução curta; nunca inventar controle ou destaque. | Definido; avaliação no editor necessária. |
| Criança quer mudar, mas não está travada | Tratar como escolha de autoria, não impor correção ou lição adicional. | Definido para o piloto. |
| Primeira ajuda não resolve | Mudar estratégia, obter observação pertinente ou reconhecer limite; sem loop de dica repetida. | Definido; observar tentativa seguinte. |
| Guia recolhido ou detalhe excessivo | Recuperar instrução e ajuste de densidade, mantendo falha e salvamento pendente visíveis. | Definido para o piloto. |
| Testar durante a construção | Preview permitido; resultado informal não fabrica teste de revisão remota. | Definido para o piloto. |
| Guardar ideia antes de construir e retomar | Manter Z/E e ciclo pendente; nenhum O concluído ou incremento automático. | Definido para o piloto. |
| Avançar missão no mesmo editor/arquivo | Salvar, revalidar e trocar guia sem navegar ao plano ou recriar arquivo. | Contrato do host exigido no piloto. |
| Arquivar/apagar durante IA, voz ou checkpoint | Invalidar operação e descartar saída tardia, sem apagar artes/jogos independentes. | Definido; testes de corrida necessários. |
| Editar livremente depois de encerrar | Base já protegida continua recuperável; novo estado pode ser preservado separadamente. | Definido; teste com autosave/limpeza necessário. |
| Tudo liberado, mas instrução difícil demais | Ajustar apoio ou começo do jogo sem rotular a criança ou retirar autorização. | Definido; revisão pedagógica e observação necessárias. |
| Abrir entrada repetidamente sem enviar ideia | Não criar vários projetos vazios; primeiro envio tem identidade idempotente. | Definido para o piloto. |
| Voltar com dois jogos e job recém-concluído | Identificar o jogo escolhido e consultar operação existente, sem escolher só pela última escrita nem navegar sozinho. | Definido; observação de retomada necessária. |
| Reencontrar arquivado com limite de ativos cheio | Consultar plano e escolher uma ação para liberar espaço; não excluir ou reativar silenciosamente. | Contrato de listagem/reativação v2 exigido. |
| Estúdio disponível com tutor desabilitado ou sem saldo | Manter guia pertinente e explicar indisponibilidade; nenhuma rota alternativa contorna autorização. | Definido; testar políticas e mudança durante a sessão. |
| Ditado longo e escuta dentro do tutor | Voz usa adapters compartilhados, autorização por origem e limites claros; texto preservado sem corte ou envios adicionais. | Integração do piloto exigida. |
| Explicação, reparo e encaminhamento de dúvida | Categoria de operação correta e um débito por interação lógica; não gerar outro plano por pedir esclarecimento. | Definido; conciliação e parâmetros precisam de teste. |
| Restaurar base depois de concluir incremento | Criação, plano e guia coerentes; evidências históricas não liberam recursos ausentes; falha parcial é recuperável. | Restauração mínima obrigatória no piloto. |
| Sair enquanto proteção da versão está pendente | Permitir pausa, informar o alcance real do salvamento e retomar operação sem falsa confirmação. | Definido; observar compreensão e testar interrupção. |

## Decisões que a revisão fecha

1. A viabilidade é pré-condição da proposta apresentada; guias posteriores não podem descobrir pela primeira vez se a ideia cabe na plataforma.
2. ZERO descreve a experiência e o ciclo do jogo, com estados técnicos separados. Corrigir, retomar e incrementar são caminhos diferentes.
3. A primeira entrega valida pelo menos um incremento; backlog simples, reutilização, reparo e checkpoint são parte desse compromisso.
4. Conteúdo, permissão e progresso permanecem separados, mesmo quando usam o mesmo serviço do Zappy.
5. OpenRouter e identidade visual Kids são restrições de arquitetura e de experiência, já presentes no escopo P0.
6. Voz é opcional em ambos os sentidos. A criança pode escrever, ler, falar e ouvir sem perder controle sobre envio e escolhas.
7. A simplificação alcança o editor: guia por ação, evidência de resultado, próxima missão sem navegação obrigatória ao plano e possibilidade de explorar.
8. A utilidade da ajuda é avaliada pela tentativa seguinte e pela recuperação do impasse, distinguindo apoio do produto de intervenção adicional do facilitador.
9. Encerramento protege a base antes da próxima edição livre; pausa mantém a etapa e exclusão impede saídas tardias.
10. Retomar identifica o jogo; arquivar não torna o plano impossível de reencontrar. Restaurar recupera também o acompanhamento coerente.
11. A ajuda prometida precisa estar autorizada e disponível no destino; voz acompanha o fluxo até o tutor e uma dúvida encaminhada não é cobrada duas vezes.

## O que ainda precisa ser demonstrado

| Frente | Próxima evidência concreta |
| --- | --- |
| Produto e pedagogia | Faixa oficial reconciliada, mecânicas do piloto escolhidas e protótipo com ideia simples, ambiciosa e centrada em 3D. O terceiro caso pode validar uma limitação explicada; não promete cobertura universal de 3D. |
| Experiência infantil | Rodadas formativas em que a criança reconheça sua ideia, encontre como começar e entenda o resultado do teste; observar preferências por texto/voz sem presumir melhora universal. |
| Conhecimento | Cobertura real das fontes escolhidas, referências autorizadas e avaliação pedagógica de planos com temas diferentes dos exemplos das fases. |
| IA e voz | Benchmark dos modelos no OpenRouter, transcrição em português infantil, voz ElevenLabs, custos por operação e condições reais das rotas e da conta. |
| Estado e cobrança | Especificação do worker, ledger, TTL de reserva, limites e retomada após falha entre chamadas e gravações. |
| Criações | Checkpoint recuperado depois de modificar/salvar a versão seguinte e executar a limpeza normal, com plano/guia coerentes e falha parcial recuperável. |
| Integração | DTOs v1/v2, perfil, retorno, tutor autorizado com voz, produção/importação/teste e rollback demonstrados nos editores do recorte. |
| Visual e acessibilidade | Protótipo renderizado comparado com as telas Kids nas paletas suportadas, em teclado, toque, zoom e tecnologia assistiva. |

Essas pendências são trabalho previsto para protótipo, especificação e implementação, não requisitos omitidos nem pedidos de nova autorização para a revisão. Custos, latências e ganhos de aprendizagem ainda não têm medições que sustentem promessa comercial.

## Verificação documental

Os documentos foram reconciliados quanto a requisitos, prioridades, estados e limites. A conferência final apresentou os seguintes resultados:

- 116 referências locais verificadas nos três documentos Markdown, sem destino ausente.
- Blocos de código equilibrados, tabelas com colunas consistentes e nenhum marcador de conflito.
- 373 caminhos de skills existentes e hashes correspondentes ao inventário; 359 conteúdos distintos. Cobertura preservada: 27 leituras integrais, 15 dirigidas e 331 triagens.
- 32 achados identificados sem duplicação, sendo seis da terceira revisão, e 58 cenários de uso/recuperação na matriz.
- OpenRouter, visual Kids e incremento protegido presentes na proposta; formulações antigas que deixavam o canal de transcrição indefinido foram substituídas.
- Comparação com a cópia anterior à terceira revisão confirmou alterações na proposta, pesquisa e relatório; o inventário permaneceu inalterado.

Essas verificações são documentais. Não foram executados build, testes do aplicativo, benchmark de fornecedores ou validação visual de uma implementação, pois o trabalho desta revisão alterou somente documentação.
