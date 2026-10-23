# Pensa: pesquisa, diagnóstico e avaliação das skills

> Histórico: substituído pela [especificação funcional de 16/10/2026](2026-10-16-pensa-reestruturacao-spec.md). Este documento registra decisões anteriores e não define o contrato vigente.

Data: 14/10/2026. Documento de apoio à [proposta de produto](2026-10-14-pensa-proposta.md).

## 1. Decisão e método

Decisão investigada: como transformar o Pensa em um orientador de projetos infantis que acolhe uma ideia crua, propõe um primeiro jogo viável e acompanha sua construção e evolução. Direção confirmada pelo responsável durante a pesquisa: **a criança constrói; Zappy planeja, orienta e ajuda quando ela trava**.

Na revisão, o responsável acrescentou dois requisitos: escuta opcional com a voz própria do Zappy pela integração ElevenLabs e manutenção de uma analogia explícita com o método ZERO, permitindo adaptar nomes e significados. A proposta foi atualizada; o complemento de inspeção está na seção 8.

A investigação combinou leitura do código e dos contratos atuais, inventário da pasta fornecida, leitura aprofundada de métodos selecionados e pesquisa pública em fontes primárias. O recorte é experiência de criação, pedagogia, organização do trabalho e arquitetura de IA. Preços de cursos, campanhas e tamanho do mercado não ajudam a resolver esta decisão e ficaram fora do estudo.

Base local: workspace `C:/Users/tocha/projects/sistema-zero`, com HEAD `6f93dcbfe` e alterações preexistentes em andamento. O diagnóstico corresponde aos arquivos lidos em 14/10/2026, não a uma auditoria da implantação em produção. Não houve sessão de observação de crianças, análise de abandono, benchmark de modelos ou teste do aplicativo no navegador. Fricção observada no código e fricção relatada pelo responsável sustentam hipóteses de produto; não são medição de eficácia.

Público de referência: o `CLAUDE.md` do Pensa declara 8–13 anos; a cláusula de segurança do prompt fala em 7–12. A proposta usa 8–13 como referência de desenho, registra essa divergência e recomenda alinhar documentação, conteúdo e política do produto. Escolaridade, fluência de leitura e experiência com blocos devem orientar a ajuda mais do que a idade isolada.

## 2. O que o Pensa realmente faz hoje

| Achado verificável | Evidência local | Implicação |
| --- | --- | --- |
| Conversa exige cinco decisões em ordem: ideia, objetivo, controles, resultado e dimensão. O prompt pede reconfirmação de respostas adiantadas. | [stage-z.ts](../../packages/member-shell/src/server/pensa-agents/stage-z.ts), `FIVE_QUESTIONS_KIDS` e `ANTI_INFERENCE_RULES`. | A entrevista seriada é uma regra explícita do produto. Microfone sozinho preservaria essa regra. |
| Um avaliador LLM roda depois do turno e só libera `ready` com as cinco decisões. | [stage-z-evaluator.ts](../../packages/member-shell/src/server/pensa-agents/stage-z-evaluator.ts). | Há custo e latência além da resposta de chat. A extração é probabilística; somente a conjunção dos cinco booleanos é determinística. |
| O frontend torna a metodologia ZERO e os documentos parte da navegação obrigatória. | [PensaApp.tsx](../../packages/pensa/src/components/PensaApp.tsx), `StageZ`, `StageE`, `StageR`, `StageO`. | A criança precisa aprender o processo administrativo antes de chegar à criação. |
| Os cinco artefatos são Carta da Ideia, game design, direção visual, plano de tarefas e revisão. | [types.ts](../../packages/pensa/src/core/types.ts), [advance.ts](../../packages/members/src/domain/pensa/advance.ts). | São úteis como estrutura interna; sua existência não exige cinco aprovações documentais pela criança. |
| `IdeaArtifactSchema` exige vitória e derrota; direção visual exige paleta, regras, telas e inventário. | [planner-contract.ts](../../packages/member-shell/src/server/pensa-agents/planner-contract.ts). | Jogos de exploração e criação livre ficam forçados a um formato competitivo; detalhes visuais obrigatórios aumentam o planejamento inicial. |
| A geração pede plano completo e um cartão para cada item visual; auditoria exige cobertura exatamente uma vez. | [pensa-ai.ts](../../packages/member-shell/src/routes/pensa-ai.ts), [plan-audit.ts](../../packages/member-shell/src/server/pensa-agents/plan-audit.ts). | Reutilizar uma arte pronta ou adiar sua personalização exige evoluir o contrato, e não apenas mudar a ordem dos cartões. |
| O plano de tarefas tem uma geração grande, limite de 8.000 tokens e timeout de corpo de até 180 segundos. | [pensa-ai.ts](../../packages/member-shell/src/routes/pensa-ai.ts), ramo `task_plan`. | O desenho atual tolera esperas longas. O timeout não informa a latência real observada. |
| SSE mantém a conexão e persiste o resultado mesmo após desconexão do cliente. | [pensa-ai.ts](../../packages/member-shell/src/routes/pensa-ai.ts), [pensa-planner.md](../pensa-planner.md). | Isso protege contra fechar a tela, mas não demonstra recuperação depois de reinício do processo ou deploy. |
| Há ciclos, dependências, cartões revisados, referência à saída e próxima tarefa elegível. | [pensa.ts](../../packages/members/src/domain/pensa/pensa.ts), [task-plan.ts](../../packages/members/src/domain/pensa/task-plan.ts). | A base de gerenciamento já existe e deve ser reaproveitada. |
| O novo ciclo nasce em Z quando o anterior tem `stage='done'`; a execução anterior segue independente. | [create-cycle.service.ts](../../packages/members/src/application/pensa/create-cycle.service.ts). | `done` significa planejamento terminado. Não comprova jogo construído ou testado. |
| Concluir uma tarefa exige passos, critérios e saída compatível; o serviço confere o ID esperado do projeto Estúdio. | [update-task-progress.service.ts](../../packages/members/src/application/pensa/update-task-progress.service.ts). | É uma boa integridade de contrato, mas não verifica, por si, se a mecânica funciona ou se a criança compreendeu o que fez. |
| O catálogo é filtrado por blocos conquistados, dimensão, extensões e acesso às ferramentas. | [pensa-capabilities.ts](../../packages/member-shell/src/server/pensa-capabilities.ts), [planner-contract.ts](../../packages/member-shell/src/server/pensa-agents/planner-contract.ts). | A factibilidade precisa começar nesse catálogo, antes de apresentar uma promessa. |
| Estúdio, Pinta e Molda já recebem guias e devolvem progresso. | [use-pensa-task-handoff.ts](../../packages/community-kids/src/components/kids/use-pensa-task-handoff.ts), [pensa-planner.md](../pensa-planner.md). | O redesenho pode concentrar-se no Pensa e ampliar pontualmente os contratos do host. |
| Planos podem ser compartilhados; criações continuam por perfil. | [pensa-planner.md](../pensa-planner.md), seção Equipe. | Compartilhar o plano não equivale a editar o mesmo jogo. A proposta deve explicitar essa limitação. |
| No fluxo Pensa examinado, a entrada é um textarea; não foi localizado recurso de ditado. | [PensaApp.tsx](../../packages/pensa/src/components/PensaApp.tsx), `StageZ`; busca por `MediaRecorder`, `SpeechRecognition` e transcrição nos pacotes pertinentes. | Entrada por voz é uma capacidade nova, com estados próprios de gravação, revisão e falha. |

Há divergências entre documentação histórica e implementação. Por exemplo, o manual diz que falta de acesso bloqueia o envio, mas o ramo atual de geração também recusa certas combinações de ferramentas indisponíveis. O prompt de direção visual ainda encaminha genericamente modelos e materiais ao Estúdio, enquanto a geração seguinte pode encaminhá-los ao Molda. O código atual deve governar a migração; os documentos precisam ser reconciliados.

## 3. Inventário da pasta GameDev

Origem: `C:/Users/tocha/Downloads/06 - Game Dev (MakeCode Arcade)/GameDev`.

Foram encontrados **14 diretórios, 373 arquivos `SKILL.md`, 359 conteúdos distintos por SHA-256 e 14 cópias adicionais idênticas byte a byte**. Similaridade conceitual entre arquivos diferentes não foi contabilizada como duplicação. Vários repositórios têm versões `.claude`, `.codex` e `.agents` que divergem entre si.

O [inventário CSV](2026-10-14-pensa-skills-inventario.csv) registra todos os caminhos, descrição declarada, número de linhas, hash, duplicação, cobertura da leitura e uso proposto. Cobertura: **27 skills lidas integralmente, 15 com leitura dirigida de seções e 331 inventariadas e triadas**. READMEs, licenças e referências auxiliares foram consultados adicionalmente. Essa cobertura não significa leitura integral de todas as 373 skills nem execução ou validação de seus scripts.

| Diretório | SKILL.md | Avaliação para esta decisão |
| --- | ---: | --- |
| `AlterLab_GameForge-main` | 34 | Material extenso sobre papéis, escopo, prototipação e coordenação; precisa de adaptação forte ao contexto infantil. |
| `Claude-Code-Game-Studios-main` | 72 | Bons contratos de arte, mudança e evidência; fluxo profissional repleto de documentos, aprovações e hierarquia. |
| `everything-game-dev-code-main` | 87 | Melhor ponto de partida para métodos pequenos e separados. O README anuncia 86; a cópia local contém 87 arquivos. |
| `godogen-master` | 4 | Referência de decomposição por risco, memória persistente e verificação do resultado. Geração autônoma diverge do papel escolhido para a criança. |
| `skills-main` | 140 | Coleção generalista de engenharia, marketing, agentes e interfaces; não são 140 especialidades de game design. |
| `cc-skills-main` | 5 | Frontend, metadados, favicon e material de divulgação; baixa contribuição para o problema central. |
| `love2d-pocket-bomber-game-main` | 2 | Implementação LÖVE/Lua e iOS. Consulta técnica eventual, fora do runtime do Pensa. |
| `phaserjs-oakwoods-main` | 4 | Phaser e testes; técnicas pontuais de assets e verificação. |
| `threejs-capacitor-ios-game-main` | 3 | Three.js e empacotamento iOS; não define capacidades educacionais do Estúdio. |
| `threejs-tactics-game-main` | 3 | Three.js e testes; referência técnica. |
| `vibe-isometric-sprites-main` | 3 | Variações da skill de geração de imagens com fal.ai. |
| `vibejam-starter-pack-main` | 16 | Phaser, Three.js, tiles, imagem e testes; contém versões diferentes e cópias idênticas. |
| `ai-game-spritesheets-main` | 0 | README, prompts e imagens sobre normalização de sprites. Relevante mesmo sem SKILL.md. |
| `awesome-agent-skills-main` | 0 | Catálogo de referências, não implementação de um planejador infantil. |

Apesar do nome da pasta superior, não foi localizada skill específica de MakeCode nos `SKILL.md` e READMEs pesquisados. O Estúdio é um editor próprio com Blockly, código, representação intermediária, extensões e preview em sandbox. **Não há razão para trocar de engine ou importar restrições do MakeCode por causa do nome da pasta.**

## 4. Métodos aproveitáveis e adaptações necessárias

Os caminhos abaixo são relativos à pasta GameDev. A tabela resume a leitura; o CSV diferencia leitura integral de leitura dirigida para cada arquivo.

| Fonte local | Conhecimento aproveitável | Adaptação concreta para Pensa |
| --- | --- | --- |
| `everything-game-dev-code-main/skills/design/core-loop-design/SKILL.md` | Ação recorrente, reação do jogo, feedback e motivação. | Extrair da fala um exemplo jogável: fazer algo → perceber resultado → querer tentar de novo. Não perguntar terminologia de design. |
| `.../skills/workflow/vertical-slice-planning/SKILL.md` | Menor recorte que demonstra a experiência, partes reais e partes provisórias. | Primeiro jogo com identidade reconhecível. Retirar exigência de polimento para apresentação a investidores. |
| `.../skills/workflow/milestone-planning/SKILL.md` | Dependências, critérios de entrada/saída e reserva para revisão. | Uma versão por vez; próximas versões como possibilidades, sem cronograma de trabalho infantil. |
| `.../skills/workflow/gdd-writing/SKILL.md` | Separar decisões, hipóteses e perguntas abertas. | Registro estruturado nos bastidores; cartão curto na tela. |
| `.../skills/workflow/orchestration-patterns/SKILL.md` | Dono de cada saída, contratos entre especialistas e revisão. | Workflow de servidor com saídas tipadas; um único interlocutor, o Zappy. |
| `.../skills/workflow/playtest-analysis/SKILL.md` | Distinguir observação de interpretação e priorizar problemas. | “O que aconteceu quando você tentou?” antes de sugerir a próxima melhoria. |
| `.../skills/workflow/risk-register/SKILL.md` | Risco explícito, gatilho e alternativa. | Bloqueios técnicos e pedagógicos internos com saída simples para a criança. |
| `.../skills/art-audio-content/art-bible/SKILL.md` | Cores por função, forma, câmera e legibilidade. | Direção visual mínima agora; detalhar somente quando houver uma tarefa de arte. |
| `.../skills/art-audio-content/placeholder-asset-pipeline/SKILL.md` | Começar com recursos provisórios e trocar sem quebrar referências. | Permitir biblioteca pronta e arte simples; usar IDs estáveis do Sistema Zero, sem importar convenções de arquivos de outra engine. |
| `.../skills/art-audio-content/sprite-pipeline/SKILL.md` e `tilemap-pipeline/SKILL.md` | Tamanho, pivô, quadros, grade, camadas e colisão. | Briefs do Pinta especificam somente dados suportados pela integração atual. Não impor tiles de 64 px a todos os jogos. |
| `.../skills/art-audio-content/generated-raster-asset-pipeline/SKILL.md` | Aparência aprovada não implica integração correta; separar dimensão da imagem e colisão. | Aplicar a verificação de uso aos desenhos da criança e recursos prontos. Não gerar a arte no lugar dela. |
| `.../skills/design/accessibility-design/SKILL.md` | Resultados equivalentes por entradas diferentes, alternativas e limites explícitos. | Voz opcional, escrita equivalente, navegação por teclado e leitura em voz alta sob demanda. |
| `.../skills/design/onboarding-tutorial-design/SKILL.md` | Aprender pela ação; distinguir compreensão de obediência. | Missão tem objetivo visível, dica escalonada e teste que a criança consegue explicar. |
| `.../skills/design/progression-design/SKILL.md` | Evitar complexidade inicial e conectar etapas. | Fonte sobre progressão do jogador; a adaptação para progressão do aprendiz é hipótese nossa, não evidência pedagógica da skill. |
| `.../skills/design/level-design/SKILL.md`, `narrative-design/SKILL.md`, `quest-design/SKILL.md` | Espaço legível, motivação, objetivos, estados e recuperação. | Especialidades opcionais quando a ideia pede cenário, história ou missões. Não adicionar esses sistemas a todo jogo. |
| `.../skills/engineering-common/gameplay-architecture/SKILL.md` | Separar responsabilidades, dados e execução. | Pensa coordena; cada ferramenta mantém sua criação e persistência. |
| `.../skills/workflow/verification-loop/SKILL.md` e `.../skills/qa-release/qa-test-matrix/SKILL.md` | Conclusão ligada a critérios e evidências. | Plano pronto, arte salva, arte integrada, comportamento testado e aprendizagem são sinais diferentes. |
| `AlterLab_GameForge-main/skills/workflows/game-brainstorm/SKILL.md` | Investigar o que empolga antes de listar funcionalidades. | Acolher a identidade da ideia em uma fala livre; retirar as sete fases de entrevista e a validação comercial. |
| `.../skills/workflows/game-scope-check/SKILL.md` e `.../skills/agents/game-producer/SKILL.md` | Inventário de funcionalidades, dependências e lista de adiamentos. | Guardar ideias futuras com motivo e preservação do desejo. Não aplicar percentuais rígidos, cobrança de velocidade ou cortes automáticos. |
| `.../skills/workflows/game-prototype/SKILL.md` e `game-jam-mode/SKILL.md` | Testar a mecânica central cedo e usar recursos simples. | Construção incremental no mesmo projeto. Excluir a regra de descartar todo código, a urgência e o vocabulário de competição. |
| `.../skills/workflows/game-team-orchestrator/SKILL.md` | Sequência e contrato das entregas entre especialidades. | Poucas funções internas com budget e roteamento. Não reproduzir diretores, departamentos ou aprovações por camada. |
| `.../skills/agents/game-ux-designer/SKILL.md` e `game-accessibility-specialist/SKILL.md` | Objetivo claro, retomada e alternativas de interação. | Validar com crianças e dispositivos reais; alegações normativas e números do texto não viram requisito sem fonte própria. |
| `Claude-Code-Game-Studios-main/.claude/skills/quick-design/SKILL.md` | Mudanças pequenas merecem processo pequeno. | Ajustar velocidade ou cor sem reabrir todo ZERO. |
| `.../.claude/skills/scope-check/SKILL.md`, `prototype/SKILL.md`, `sprint-plan/SKILL.md` | Comparar intenção e execução, organizar o trabalho presente. | Preservar a comparação; não mostrar burndown, story points ou departamentos à criança. |
| `.../.claude/skills/propagate-design-change/SKILL.md` | Rastrear efeitos de uma mudança. | Replanejar apenas tarefas, recursos e testes afetados. Manter o que já funciona. |
| `.../.claude/skills/art-bible/SKILL.md` e `asset-spec/SKILL.md` | Coerência visual, manifesto e reutilização com IDs estáveis. | Especificar o recurso no momento de produzi-lo; reduzir aprovações repetitivas. |
| `.../.claude/skills/playtest-report/SKILL.md` | Separar problema de design, ajuste, defeito e acabamento. | Conversa curta depois de jogar; resultado pode gerar uma tarefa pequena ou uma ideia futura. |
| `godogen-master/godot/skills/godogen/SKILL.md`, `decomposer.md` e `shared/skills/godogen/visual-target.md` | Memória durável, isolar riscos e verificar movimento em execução. | Reaproveitar princípios; excluir geração integral, ferramentas locais, publicação e exigência de assets gerados. Imagem conceitual nunca prova jogo funcionando. |
| `vibejam-starter-pack-main/.claude/skills/phaser-gamedev/SKILL.md` e `tinyswords-tilemap/SKILL.md` | Medir assets e respeitar contratos do conjunto gráfico. | Referência para autores das integrações, não documentação de blocos entregue diretamente à criança. |
| `vibejam-starter-pack-main/{.claude,.agents}/skills/threejs-builder/SKILL.md` | Eixos, câmera, escala e ancoragem. | As versões divergem: uma assume direção de GLTF, outra manda verificá-la. O contrato do Molda/Estúdio prevalece. |
| `ai-game-spritesheets-main/README.md` | Consistência entre poses, escala e linha de apoio. | Orientações futuras para animação no Pinta; não adotar automaticamente serviços, scripts ou geração de imagem. |

### O que a coleção não resolve

Ela oferece repertório de produção de jogos, mas não comprova adequação a crianças brasileiras, qualidade de transcrição infantil ou preservação de autoria. Também não conhece os blocos conquistados, os arquivos da criança, os contratos de importação ou as regras de acesso do Sistema Zero.

As personas com suposta experiência profissional, histórias sobre jogos famosos e percentuais apresentados como leis não são evidência. Exemplos concretos a rejeitar: MoSCoW 60/25/15 obrigatório; buffer sempre 20%; encerrar todo protótipo com “kill/promote”; proibir continuidade do código; tratar pixel art ou low poly como qualidade inferior. Algumas dessas regras podem servir a contextos específicos, mas conflitam com este produto ou carecem de validação.

Licenças MIT foram encontradas na raiz de AlterLab, Claude Code Game Studios, Everything Game Dev Code e AI Game Spritesheets. Não foi encontrado `LICENSE` na raiz da cópia de Godogen; isso não determina, por si, a licença de todo o conteúdo. Antes de incorporar texto ou código, registrar procedência e licença por arquivo. Nesta entrega houve análise, sem instalação ou cópia dos pacotes para execução.

## 5. Pesquisa pública e implicações

Todas as fontes abaixo foram consultadas em 14/10/2026. As recomendações de interface são inferências e propostas, salvo quando expressamente descritas como observação do código.

| ID / fonte primária | Evidência consultada e data | Limite | Implicação proposta |
| --- | --- | --- | --- |
| E01 — [MakeCode: Events Project](https://arcade.makecode.com/courses/csintro3/events/project) | Currículo oficial, sem data editorial explícita. Orienta escolher a funcionalidade que caracteriza o jogo, construir um MVP, usar sprites da galeria e iterar com feedback. | Método educacional publicado, não comparação causal entre interfaces. | Começar com experiência jogável e identidade; arte pode ser aprimorada depois. |
| E02 — [MakeCode: Final Project](https://arcade.makecode.com/courses/csintro1/project/final) | Currículo oficial, sem data editorial explícita. Recomenda demonstrar conceitos cedo, acompanhar progresso e rever funcionalidades conforme a execução. | Não testa Zappy nem crianças brasileiras nesta plataforma. | Cada versão precisa de resultado observável e revisão de escopo. |
| E03 — [Harvard: Let’s Not All Make the Same Thing](https://www.gse.harvard.edu/ideas/usable-knowledge/21/12/lets-not-all-make-same-thing) | Divulgação institucional de pesquisa de Karen Brennan, 01/12/2021. Relata entrevistas com 30 jovens que criavam com Scratch e discute interesses pessoais, apoio e tempo. | Relato institucional sobre estudo qualitativo; artigo científico vinculado não abriu nesta consulta. Não demonstra eficácia de IA. | Sustentar autonomia com ajuda, retomada e metas pequenas; não retirar todo suporte. |
| E04 — [MIT: Little Language Models](https://www.media.mit.edu/projects/little-language-models-coco/overview/) | Página institucional de projeto para 8–16 anos, sem data editorial explícita. Propõe interação lúdica e significativa com ideias de IA. | Descrição de projeto, sem resultado comparativo de aprendizagem na página. | Zappy deve ser compreensível, corrigível e instrumento de criação. |
| E05 — [Rodrigues e Ribeiro, PROPOR 2026](https://aclanthology.org/2026.propor-1.98.pdf) | Artigo de abril de 2026, 208 crianças de 2º/3º ano, 5.400 amostras de palavras isoladas em português brasileiro; investiga reconhecimento fonêmico. | Leitura de palavras e avaliação de pronúncia, sobretudo Sudeste. Não é ditado espontâneo de ideias nem comparação atual dos fornecedores candidatos. | Testar transcrição no público real, incluir nomes inventados e preservar correção fácil. Não extrapolar taxas de erro do artigo. |
| E06 — [Doshi e Hauser: criatividade e diversidade](https://arxiv.org/abs/2312.00506) | Artigo disponibilizado pelos autores; publicação associada em Science Advances, 2024. Experimento de escrita com sugestões de IA encontrou ganhos individuais e redução de diversidade coletiva naquele desenho. | Escrita curta por adultos, não criação infantil de jogos; não estabelece efeito universal da IA. | Hipótese a monitorar: preservar detalhes próprios e medir se os planos convergem excessivamente para poucos modelos. |
| E07 — [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Publicado em 19/12/2024; página consultada avisa que o ferramental evoluiu. Distingue workflows e agentes, e recomenda justificar complexidade por avaliação. | Experiência de engenharia, não prova sobre Pensa nem indicação de framework atual. | Começar com workflow explícito e funções especializadas; ampliar autonomia quando houver ganho mensurável. |
| E08 — [Anthropic: multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | 13/06/2025. Relata benefício para pesquisa paralelizável e maior consumo de tokens em seu sistema. | Pesquisa aberta difere de planejamento educacional. Os multiplicadores publicados não são estimativa de custo do Pensa. | Comparar um planejador com revisão contra múltiplos especialistas, usando custo, fidelidade e latência locais. |
| E09 — [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) | Documentação atual consultada: disponibilidade limitada e possibilidade de reconhecimento remoto em alguns navegadores. | Compatibilidade muda; não mede qualidade em português infantil. | Não depender exclusivamente da Web Speech API nem prometer processamento local sem comprovação. |
| E10 — [MDN: MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) | Documenta gravação de streams e consulta de MIME suportado. | Gravar áudio não fornece transcrição; suporte de formato precisa de teste. | Captura explícita com negociação de formato, serviço de transcrição desacoplado e alternativa por texto. |
| E11 — [UNICEF: Guidance on AI and children 3.0](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children) | Dezembro de 2025. Página oficial destaca privacidade, transparência, inclusão, segurança e desenvolvimento infantil. | Orientação normativa internacional, não certificado ou avaliação do produto. | Minimizar áudio, explicar o papel da IA e envolver crianças nos testes. |
| E12 — [Lei 15.211/2025, texto oficial](https://planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm) | Lei de 17/09/2025, texto consolidado consultado. Arts. 3, 7 e 8 tratam de proteção, configuração protetiva e riscos desde a concepção. | A consulta não constitui análise completa da lei, regulamentação e operação do Sistema Zero. | Tratar gravação e fornecedores de IA como decisões do produto infantil; revisar condições antes de liberar voz. |
| E13 — [ElevenLabs: Stream speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream) | Referência oficial consultada na revisão: síntese de texto com voz selecionada e resposta em streaming. | Não demonstra latência ou qualidade no ambiente do Sistema Zero. | É possível estudar entrega progressiva de áudio para mensagens finalizadas, sem precisar de agente de voz contínuo. |
| E14 — [ElevenLabs: Models](https://elevenlabs.io/docs/overview/models) | Catálogo oficial com diferentes modelos e compromissos de qualidade/latência. | A oferta e o acesso efetivo da conta podem variar; não houve benchmark. | Usar o modelo atual como referência e comparar alternativas com a voz do Zappy e textos reais. |
| E15 — [ElevenLabs: Zero Retention Mode](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode) | Documentação condiciona o modo a clientes Enterprise elegíveis e descreve ativação por API. | Não confirma contratação ou habilitação nesta conta. | Não presumir ausência de retenção dos textos personalizados enviados à síntese. |
| E16 — [OpenRouter: Speech-to-Text](https://openrouter.ai/docs/guides/overview/multimodal/stt) e [Create transcription](https://openrouter.ai/docs/api/api-reference/stt/create-transcription) | Documentação oficial consultada em 14/10/2026: endpoint dedicado de transcrição, com texto e uso na resposta; capacidades variam por modelo/provedor. | Nenhuma chamada paga ou avaliação de fala infantil foi executada. Disponibilidade documental não confirma adequação da rota à conta e ao produto. | Transcrição pelo OpenRouter, com adapter próprio e avaliação de modelos/formatos; síntese continua pela ElevenLabs. |
| E17 — [W3C: Use Clear Step-by-step Instructions](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/) | Guia suplementar de acessibilidade cognitiva: instruções concisas, próximas da atividade, com passos e exemplos pertinentes. | Não é experimento específico com crianças nem requisito normativo autônomo de conformidade WCAG. | Separar objetivo de instrução utilizável; localizar o recurso e explicar o efeito esperado no guia do editor. |
| E18 — [W3C: Help Users Understand What Things are and How to Use Them](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/) | Recomenda finalidade clara, controles familiares e consistência de aparência, localização e interação. | Orientação geral; não comprova que os componentes atuais ou futuros do Pensa sejam intuitivos. | Uma ação principal por estado, continuidade Kids e correção/ajuda reconhecíveis; validar no protótipo. |
| E19 — [Scratch Foundation: Creative Learning Guide for Families](https://www.scratchfoundation.org/learn/learning-library/creative-learning-for-families) | Material oficial incentiva projetos significativos, experimentação, iteração e estratégias para sair de impasses. | Página educacional, sem comparação causal do Pensa ou de tutoria por IA. | Preservar escolha e exploração; avaliar a ação que a ajuda possibilita, não apenas conclusão ou satisfação. |
| E20 — [W3C: Use a Simple Tense and Voice](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p02-simple-tense/) | Guia suplementar recomenda fala direta, estrutura simples e forma verbal adequada ao idioma e ao momento descrito. | Não estabelece um vocabulário infantil em português nem prova compreensão dos rótulos propostos. | Mensagens precisas sobre ação e salvamento; distinguir resultado confirmado de ação pendente e validar a linguagem no protótipo. |

Foram abertas também a página e a entrada documental do Enunciado ANPD nº 1/2023, mas houve falhas ao recuperar seu corpo em parte das tentativas. Não se usa o snippet como fundamento para declarar uma base legal específica. A implementação deve definir base legal, informação aos responsáveis e tratamento por terceiros com a política vigente do produto. Permissão do microfone não substitui essa definição.

Outras limitações de acesso: o PDF sobre assistentes de voz hospedado na University of Florida e a versão ScienceDirect não abriram; as páginas do guia Creative Computing tiveram respostas inconsistentes; a página Science Advances não abriu, e foi usada a versão dos autores no arXiv. Esses acessos falhos não foram contados como estudos integralmente revisados.

## 6. Comparação de abordagens

| Abordagem | Benefício | Problema principal | Decisão |
| --- | --- | --- | --- |
| Entrevista atual com microfone | Entrada mais fácil; menor alteração inicial. | Mantém cinco decisões e sequência documental. | Pode ser teste isolado de voz, não redesenho suficiente. |
| Ideia livre → proposta curta → construção acompanhada | Usa o repertório da IA para organizar; preserva escolhas importantes e produz ação cedo. | Precisa representar sugestões, evidência e limites sem inventar decisões da criança. | Recomendada. |
| IA cria o jogo e criança personaliza | Resultado imediato e demonstração fácil. | Retira parte central da construção, contrariando a direção confirmada. | Excluída do escopo proposto. |

## 7. Lacunas que precisam de validação real

- A entrada por voz é mais confortável para quais crianças, dispositivos e ambientes? Não presumir preferência universal.
- Quantas sugestões a criança consegue revisar sem apenas concordar? Testar síntese curta contra cartão com desenho esquemático.
- Qual recorte ainda parece ser “meu jogo”? O julgamento da criança pesa mais que uma nota do planejador.
- Uma missão curta permite agir e compreender? Contar conclusão de checklist não basta.
- O que o Estúdio pode verificar com segurança hoje e o que exige novo contrato? Abrir o preview prova apenas que foi aberto.
- Quanto custa um plano aceito e executável, incluindo falhas e revisão? Ainda não há benchmark nesta pesquisa.
- Quais modelos, rotas e condições de dados atendem ao áudio infantil pretendido? OpenRouter para transcrição e ElevenLabs para síntese estão definidos pelo requisito do produto; adequação, contratação e acesso efetivo ainda exigem verificação.

A proposta anexa converte essas lacunas em etapas de validação, critérios de aceite e limites explícitos. Ela não usa a quantidade de skills ou de agentes como prova de qualidade.

## 8. Complemento: voz existente e vínculo com o ZERO

### Inspeção da integração ElevenLabs

| Achado | Evidência | Implicação |
| --- | --- | --- |
| Existe uma voz própria do Zappy, configurável por ambiente. | [voz-do-zappy.md](../voz-do-zappy.md), [voz-zappy.ts](../../packages/admin/src/server/voz-zappy.ts). | Reaproveitar identidade vocal; não criar outro personagem ou presumir necessidade de nova voz. |
| A geração atual usa `eleven_multilingual_v2` e grava MP3 no R2. | [voz-zappy.ts](../../packages/admin/src/server/voz-zappy.ts). | Há adapter de fornecedor a aproveitar, mas o fluxo é de autoria antecipada. |
| A rota exige sessão de Admin e recebe frases editoriais. | [route.ts](../../packages/admin/src/app/api/media/voz-zappy/route.ts). | O Pensa precisa de entrada de backend autorizada para mensagens do projeto; não abrir a rota administrativa às crianças. |
| Cache inclui voz, modelo, versão de pronúncia e roteiro; áudios editoriais têm URL pública. | [voz-zappy-roteiro.ts](../../packages/admin/src/lib/voz-zappy-roteiro.ts), [voz-zappy.ts](../../packages/admin/src/server/voz-zappy.ts). | Reutilizar deduplicação, acrescentando escopo privado e parâmetros relevantes para falas personalizadas. |
| Botão existente oferece ouvir/parar e participa do foco de mídia; certos contextos aceitam voz do navegador. | [zappy-ouvir-button.tsx](../../packages/member-shell/src/components/zappy-ouvir-button.tsx), [dialogue-block.tsx](../../packages/member-shell/src/components/dialogue-block.tsx). | Adaptar estados de geração e política de fallback; não presumir que o componente atual já resolva síntese dinâmica. |
| Texto visível e roteiro de pronúncia têm contratos separados. | [voz.ts](../../packages/core/src/learning/scene/voz.ts). | Preservar conteúdo e sentido, permitindo tratamento de pronúncia sem alterar a mensagem da criança. |

Não houve geração de áudio, inspeção de credenciais, consulta ao saldo, teste de qualidade ou confirmação de disponibilidade em produção. O achado é sobre capacidade implementada no repositório. Síntese da resposta do Zappy e transcrição da fala infantil são serviços distintos: na proposta consolidada, ElevenLabs e OpenRouter, respectivamente.

### O que permanece do método

O [contrato documentado do Pensa](../../packages/pensa/CLAUDE.md) usa Zerar a Bagunça, Enxergar o Jogo, Roteirizar a Criação e Organizar a Criação. A proposta preserva a referência ZERO e amplia R para **Realizar por partes** e O para **Observar e melhorar**. O mapa continua na interface e orienta cada versão. A complexidade removida é a exigência de entrevista e documentos sucessivos, não a identidade do método.

Essa adaptação é uma decisão de produto solicitada pelo responsável, não uma conclusão derivada das skills de terceiros. De modo semelhante, “Ouvir o Zappy” com ElevenLabs decorre do pedido e da integração local. As skills contribuem com recorte jogável, dependências, reutilização de assets, ajuda contextual, teste e propagação de mudanças; a seção 7 da proposta agora registra os comportamentos concretos e sua relação com Z, E, R e O.

## 9. Complemento: posto e recursos realmente liberados

O responsável reforçou que o Pensa não pode propor um jogo que a criança não consiga construir naquele momento. A revisão tornou essa condição explícita antes da apresentação do primeiro recorte, incluindo os incrementos e a ajuda durante as missões.

Achados adicionais de código:

- [getPensaCapabilities](../../packages/member-shell/src/server/pensa-capabilities.ts) consulta desbloqueios e acesso às ferramentas; combina posto, papel e paleta conquistada. Sem leitura válida, retorna indisponibilidade. Estúdio exige acesso e paleta utilizável.
- [earnedStudioTier](../../packages/member-shell/src/server/studio-unlocks.ts) deriva extensões dos blocos conquistados e reconhecidos pelo catálogo. A intenção declarada no módulo é manter a mesma régua para paleta, Zappy e Pensa.
- [resolveStudioTier](../../packages/member-shell/src/lib/studio-tier.ts) separa modos associados à jornada de blocos conquistados. Recursos disponíveis não nascem necessariamente instalados no projeto.
- [availablePlannerCatalog](../../packages/member-shell/src/server/pensa-agents/planner-contract.ts) prioriza a lista conquistada da criança; um bloco não é excluído só por estar classificado acima do posto. Portanto, usar apenas o nome do posto seria uma regressão.
- [moldaToolAccessFor](../../packages/community-kids/src/lib/molda-tool-access.ts) resolve famílias de ferramentas por faixas da jornada. O snapshot atual do Pensa informa disponibilidade global do Molda, mas não inclui essa lista granular.

Implicação proposta: ampliar o contrato de capacidades para representar o que cada editor realmente oferece ao perfil, sem duplicar sua política dentro de prompts. Validar também o caminho que liga uma mecânica aos recursos necessários. Ideias futuras permanecem registradas, mas não viram dependências obrigatórias de uma versão anunciada como construível agora. Esses achados são de inspeção estática; não houve teste de perfis em produção.

## 10. Complemento: base oficial compartilhada e métodos das aulas

O responsável sugeriu que o Zappy do Pensa acesse o conhecimento da plataforma e das aulas, como já ocorre no Estúdio, para ajudar a construir com uma metodologia coerente com o ensino. A inspeção confirmou infraestrutura reaproveitável e uma diferença entre os fluxos atuais.

| Achado | Evidência | Implicação para a proposta |
| --- | --- | --- |
| O tutor do Estúdio chama `members.zappyKnowledgeSearch`, normalmente com limite de cinco resultados de aulas. | [studio-zappy.ts](../../packages/member-shell/src/routes/studio-zappy.ts), [clients.ts](../../packages/member-shell/src/server/clients.ts). | Reutilizar esse cliente/serviço; não criar outro acervo nem chamar o chat do Estúdio como planejador. |
| A busca resolve cursos acessíveis e aulas liberadas pelos casos de uso autoritativos, e acrescenta até três resultados de ajuda publicada. | [zappy-knowledge.service.ts](../../packages/members/src/application/zappy/zappy-knowledge.service.ts). | Preservar o filtro por perfil. Ajuda pública e acesso a aulas têm políticas distintas; nenhum deles substitui permissões de ferramentas. |
| Fontes incluem vídeo com VTT, texto/diálogo e Caderno do Aluno; existem estados pendente, pronto, vazio e erro. | [contratos de conhecimento](../../packages/members/src/domain/ports/zappy-knowledge-repository.port.ts), [operação do Zappy](../operacao-zappy.md). | Não afirmar que toda aula está disponível ou integralmente compreendida pelo índice. A cobertura precisa ser verificada no piloto. |
| A pesquisa atual usa busca textual PostgreSQL e filtros de publicação, estado e revisão. | [zappy-knowledge.repository.ts](../../packages/members/src/infrastructure/persistence/drizzle/zappy-knowledge.repository.ts), método `search`. | Não há necessidade demonstrada de criar um banco vetorial novo para começar a integração. Avaliar relevância antes de mudar a infraestrutura. |
| O tutor combina aulas, ajuda, manuais, catálogo permitido e contexto real do projeto; restringe referências aos resultados recuperados. | [zappy-ai.ts](../../packages/member-shell/src/server/zappy-ai.ts), `systemPrompt`, `projectData` e normalização da resposta. | Aproveitar contratos e validações; o prompt do tutor contém restrições próprias que não servem integralmente ao papel do Pensa. |
| A normalização da pergunta usa termos locais e não faz outra chamada de modelo. | [zappy-ai.ts](../../packages/member-shell/src/server/zappy-ai.ts), `normalizeZappySearchQuery`; [zappy-search.ts](../../packages/member-shell/src/server/zappy-search.ts). | A consulta contextual pode ser acrescentada sem pressupor uma nova chamada de agente em cada etapa. |
| No fluxo do Pensa examinado, há importação de manuais do Estúdio, mas não foi localizada busca curricular ou referências equivalentes de aulas/tutoriais. | [planner-contract.ts](../../packages/member-shell/src/server/pensa-agents/planner-contract.ts), [pensa-ai.ts](../../packages/member-shell/src/routes/pensa-ai.ts), busca por `zappyKnowledgeSearch`, `lessonReferences` e `helpReferences` nos módulos do planejador. | Integrar conhecimento didático é uma evolução real em relação ao uso atual do catálogo técnico. |

Há três distinções necessárias: aula liberada não significa concluída; aula concluída não demonstra domínio; conhecer uma técnica não libera seus recursos no editor. Os resultados da busca não carregam por si só progresso individual nem todos os metadados de procedência. O conversor atual de VTT remove timestamps. Esses dados precisam de contratos explícitos se forem usados para personalização ou links precisos.

A proposta recomenda seleção de poucos trechos por intenção/missão, referências opcionais e verificadas, compartilhamento de contexto mínimo com o tutor do Estúdio e revisão pedagógica do resultado. Aproveitar uma técnica ensinada não significa reproduzir o jogo da aula. Se padrões didáticos importantes não estiverem recuperáveis, fichas editoriais vinculadas às fontes podem complementar a base após validação.

Não houve consulta ao conteúdo privado das aulas, ao relatório de cobertura em produção ou ao histórico de uma criança. A inspeção confirma o desenho e as capacidades do código; a eficácia da recuperação e a fidelidade aos métodos ensinados permanecem critérios do piloto.

## 11. Evidências adicionais da revisão completa

A revisão percorreu a proposta inteira e confrontou os fluxos com os contratos do workspace. O [relatório de revisão](2026-10-14-pensa-revisao.md) registra achados, correções e cobertura. As evidências abaixo fundamentam requisitos futuros; não são resultados de execução do novo fluxo.

| Evidência local | Constatação | Consequência incorporada |
| --- | --- | --- |
| [Progresso de tarefa](../../packages/members/src/application/pensa/update-task-progress.service.ts) | Transições de conclusão são monotônicas, com controle de concorrência e dependências. | Correção cria reparo/revisão preservando evidência; não reabre silenciosamente tarefa concluída. |
| [Contrato de tarefas](../../packages/members/src/domain/pensa/task-plan.ts) e [planejador](../../packages/member-shell/src/server/pensa-agents/planner-contract.ts) | Saída salva e uso no Estúdio participam dos critérios atuais; tarefas do Pinta podem exigir integração. | Contrato v2 separa produzir, integrar e testar, prevenindo dependência circular no fluxo que começa pela arte. É um risco de desenho identificado, não um deadlock reproduzido. |
| [Rotas de criações](../../packages/member-shell/src/routes/creations.ts) e [serviço de criações](../../packages/members/src/application/creations/creations.service.ts) | O salvamento pode descartar arquivos das revisões anteriores. | Referência de revisão não basta como backup; incremento precisa de checkpoint materializado com assets retidos. |
| [Quota de IA](../../packages/member-shell/src/server/ai-quota.ts) | Há contabilização por conta e caminho permissivo em falha utilizado pelo Pensa. | Operações novas precisam de reserva confirmada, ledger e política de expiração/reconexão; custo externo e débito interno são distintos. |
| [Domínio do Pensa](../../packages/members/src/domain/pensa/pensa.ts) | Limites de projetos/ciclos/conversa e mensagens sem identidade/revisão próprias. | Verificar limites antes de geração; criar referência narrável estável e versionada para áudio dinâmico. |
| [Criação de ciclo](../../packages/members/src/application/pensa/create-cycle.service.ts) | O fluxo atual depende do encerramento do planejamento e do ciclo mais recente, inclusive em planos de equipe. | Separar planejamento de execução, manter um ciclo ativo explícito e preservar equipes no legado durante o piloto individual. |
| [Cliente de modelos](../../packages/member-shell/src/server/pensa-llm.ts) | OpenRouter já é usado no servidor para chat e JSON validado; mensagens transportam texto. | Evoluir o cliente existente e acrescentar adapter de áudio; não presumir suporte de transcrição no contrato textual atual. |

O OpenRouter foi reforçado pelo responsável como requisito obrigatório durante a revisão. A proposta passou a especificar esse gateway para todas as funções de modelos e para transcrição, com ElevenLabs responsável pela voz de saída. Não é uma troca de stack nem uma recomendação de contratar outro canal. A fonte E16 confirma o caminho documental de STT; o benchmark continua pendente.

## 12. Evidências da identidade visual Kids

O responsável confirmou que a reformulação deve seguir o mesmo estilo da Comunidade Kids. A inspeção encontrou uma base compartilhada já consumida pelo Pensa:

- [Registro de paletas](../../packages/ui/src/tokens/palettes.ts), [aliases da comunidade](../../packages/ui/src/styles/community-kids-theme.css) e [aliases Kids](../../packages/ui/src/styles/theme-kids.css): cores canônicas e compatibilidade entre host e ferramentas. A fonte dos valores é o registro de tokens, não uma cópia de hexadecimais no Pensa.
- [Estilo compartilhado das ferramentas](../../packages/ui/src/styles/tool-chrome.css): receitas de tipografia, geometria, cartões, botões e assinatura do Pensa; ação acompanha o host e não se confunde com identidade da ferramenta.
- [Host do Pensa](../../packages/community-kids/src/components/kids/pensa-client.tsx): integração com modo de foco, navegação, imagens do Zappy e tema claro usado atualmente no Kids.
- [Estilos do Pensa](../../packages/pensa/src/styles/pensa.css) e [contrato de chrome](../../packages/pensa/src/components/hostChrome.tsx): consumo dos tokens, fontes do host e controles compartilhados. A existência de fallbacks standalone não redefine a experiência Kids.
- [Botão de escuta](../../packages/member-shell/src/components/zappy-ouvir-button.tsx): padrão visual e foco de mídia reaproveitáveis, com os estados novos de geração e autorização a acrescentar.

A seção 3.8 da proposta transforma o requisito em regras e critérios de aceite. O protótipo deverá ser comparado com Criar, Estúdio e Pinta nas paletas e dispositivos suportados. Esta constatação vem de código e estilos; não houve renderização da nova interface nem alegação de aprovação visual.

## 13. Segunda revisão: facilidade, continuidade e ajuda real

A nova solicitação enfatizou que a proposta deve ser fácil, intuitiva e realmente ajudar a criança. O exame distinguiu três níveis: conseguir entender a proposta, conseguir agir no editor e conseguir continuar quando algo dá errado. Clareza na tela de entrada não garante os outros dois.

| Evidência ou lacuna examinada | Consequência incorporada |
| --- | --- |
| O [TaskGuidePanel do Estúdio](../../packages/studio/src/studio/TaskGuidePanel.tsx) mostra passos, blocos úteis e critérios e condiciona conclusão às marcações obrigatórias e à saída. O [domínio](../../packages/members/src/domain/pensa/task-plan.ts) verifica a mesma regra. | O guia v2 precisa mudar o contrato, separando instrução de evidência. Ocultar checkboxes na interface seria insuficiente. Não foi medida a dificuldade real das crianças nesse painel; o achado é o mecanismo atual e seu conflito com a simplificação proposta. |
| O [handoff Kids](../../packages/community-kids/src/components/kids/use-pensa-task-handoff.ts) transporta guia, progresso e referências por sessão de tarefa. | Continuação na mesma criação exige troca autorizada da sessão pelo host, preservando arquivo e salvamento. A proposta não presume que isso já esteja implementado. |
| A formulação anterior detalhava voz para a ideia inicial, mas não fechava a mesma facilidade para correções, ajuda e relato de teste. | Reutilizar o campo de ditado revisável ao longo da conversa, sem executar comandos do jogo pela fala. Separar retenção temporária no servidor do buffer local de revisão. |
| O planejamento já filtrava recursos permitidos, mas não tornava operacional a diferença entre implementação válida e começo compreensível. | Receitas de mecânicas verificadas e análise da carga de conceitos/operações; ajuda ajustável e primeiro efeito perceptível, preservando autoria. |
| O [serviço de exclusão](../../packages/members/src/application/pensa/delete-project.service.ts) apaga o plano; [atualização](../../packages/members/src/application/pensa/update-project.service.ts) trata arquivamento separadamente. | Fechar ciclo de vida de jobs, voz e checkpoints: pausa não apaga, arquivamento cancela preparação, exclusão impede saídas tardias e não apaga criações independentes por inferência. |
| A captura da base apenas antes do incremento deixava uma janela entre encerramento e edição livre posterior. O fluxo de criações pode remover arquivos antigos. | Proteger a revisão no encerramento, antes de anunciá-la recuperável; confirmar a base e o estado atual ao incrementar. Validar corrida com autosave e limpeza. |

As fontes E17–E19 apoiam princípios de clareza, orientação contextual e exploração. As decisões de quantos controles mostrar, de como ajustar ajuda e de quando considerar o fluxo compreensível são propostas locais, sujeitas a observação. Não foi encontrada, nem se alega, evidência de que adicionar voz ou agentes garanta autonomia infantil.

A seção 3.9 agora define critérios de experiência; a seção 13 inclui protocolo com próximo passo, discordância, impasse, continuação, pausa e pequena escolha própria. Métricas distinguem ajuda do produto de intervenção adicional do facilitador e resultado observável de mero clique. As rodadas pequenas são formativas; comparações entre versões não devem fragmentá-las em grupos insuficientes nem sustentar alegação causal.

Foram relidas integralmente três skills já contabilizadas na cobertura original: `onboarding-tutorial-design`, `accessibility-design` e `playtest-analysis`, da coleção Everything Game Dev Code. A primeira contribui com ensino pela ação e avaliação de entendimento; a segunda, com alternativas de entrada/saída e preferências explícitas; a terceira, com separação entre observação, interpretação e hipótese. A revisão traduziu esses métodos em guia utilizável, voz ao longo da conversa e avaliação da tentativa seguinte. Essa releitura não aumenta o número de arquivos distintos estudados nem constitui validação infantil das skills.

## 14. Terceira revisão: passagem entre ferramentas e retomada compreensível

A terceira rodada confrontou promessas transversais com seus pontos de execução: voltar ao projeto certo, continuar falando/ouvindo no editor, ter acesso real ao tutor, restaurar o jogo junto da orientação e distinguir ajuda de nova geração de plano. Acrescentou seis achados ao relatório, sem aumentar a cobertura declarada do inventário de skills.

| Evidência local / lacuna da proposta | Consequência incorporada |
| --- | --- |
| A [listagem de projetos](../../packages/members/src/application/pensa/list-projects.service.ts) usa `listActiveProjects`, exclui arquivados e ordena pela atualização do registro. A proposta já sugeria arquivar para liberar espaço, mas não fechava o caminho de reencontro. | Primeira visita e retomada têm entradas distintas; continuar identifica o jogo. Listagem/consulta autorizada de arquivados e reativação com limite fazem parte do v2. Não selecionar o projeto somente porque um job acabou de escrever nele. |
| [creative-apps-access.ts](../../packages/member-shell/src/server/creative-apps-access.ts) compartilha o portão de nível para Pensa/Zappy; [zappy-access.ts](../../packages/member-shell/src/server/zappy-access.ts) exige também a flag do tutor para alunos. O [snapshot do Pensa](../../packages/member-shell/src/server/pensa-capabilities.ts) não inclui essa disponibilidade. | Não afirmar diferença de posto entre os dois produtos: a distinção confirmada é a política adicional do tutor. Resolver autorização/habilitação e estado operacional separadamente; indisponibilidade mantém guias e não vira bypass por outra rota. |
| O [painel do tutor](../../packages/studio/src/components/tutor/ZappyPanel.tsx) inspecionado mostra entrada textual e respostas identificadas. A [rota](../../packages/member-shell/src/routes/studio-zappy.ts) exige pergunta com até 1.000 caracteres. | Voz ao longo da jornada exige extensão do tutor, não apenas do Pensa. Reaproveitar IDs de mensagem, resolver a origem do conteúdo narrável e reconciliar limites sem truncamento ou envios pagos automáticos. Não se afirma ausência de toda funcionalidade de voz na plataforma. |
| [Quota de IA](../../packages/member-shell/src/server/ai-quota.ts) é por conta; as categorias atuais incluem Pensa e tutor, e mensagens podem atribuir o limite ao usuário. A proposta anterior tratava “alteração após entrega” de modo amplo. | Definir planejar, ajudar, reparar saída inválida e voz separadamente. Uma dúvida encaminhada tem um débito lógico; explicação não equivale a novo plano. Copy informa indisponibilidade sem atribuir o consumo à criança nem desencorajar pensar. |
| O [serviço de progresso](../../packages/members/src/application/pensa/update-task-progress.service.ts) verifica dependências por tarefas concluídas; checkpoint futuro introduz a possibilidade de voltar o arquivo sem voltar sua orientação. | Restauração precisa reconciliar arquivo, plano/ciclo e evidências vigentes. Conclusão histórica é preservada, mas não comprova uma condição ausente na criação restaurada. Falha entre serviços exige operação recuperável. É requisito do v2, não falha de uma restauração já implementada. |
| A proposta distribuía ações por várias seções e dizia manter trabalho “aberto” após falha na proteção, sem distinguir sessão aberta de estado recuperável. | Contrato compacto de tela/ação/retorno, rótulo de ajuda consistente, prioridade visual sem esconder saídas, salvamento com alcance preciso e possibilidade de pausar mesmo com checkpoint pendente. |

A fonte E20 apoia o princípio geral de linguagem simples e precisa. As escolhas de rótulo, posição e densidade continuam hipóteses locais; não se afirma conformidade de uma tela ainda não construída. A validação inclui retorno com mais de um jogo, acesso a arquivados, ajuda no editor com e sem voz e recuperação de uma versão antiga. Não houve chamadas aos provedores, acesso a dados infantis ou testes de uso nesta rodada.
