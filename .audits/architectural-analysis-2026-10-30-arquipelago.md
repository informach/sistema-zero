# Arquipélago Vagalume: proposta, implementação e coerência

Data: 30/10/2026. Base registrada examinada: `f7bee3d3a`, do staging local.

## Parecer

O Arquipélago já tem um mundo amplo e uma base técnica sólida. Exploração, construção, criação, cuidado, moradores, desafios e narrativa estão efetivamente ligados ao jogo em muitos pontos. Não é apenas uma coleção de modelos ou protótipos isolados.

A proposta integral, porém, ainda não está entregue. As maiores diferenças estão na aplicação do currículo dos postos avançados, no conteúdo efetivamente disponibilizado, na criação livre da Lenda, na exploração ampliada e na validação da experiência integrada. Existem também ajustes concretos de acessibilidade e de coerência entre a narrativa e o comportamento do sistema. A auditoria encontrou ainda retenção crescente de texturas ao repetir a entrada e saída do Farol, não detectada pelo critério do verificador atual.

Minha recomendação é consolidar os ciclos completos antes de ampliar o catálogo de novidades. A prioridade é garantir que aprender, aplicar, ganhar cor, criar algo próprio, guardar e voltar constituam uma experiência contínua.

Não atribuo um percentual global de conclusão. Um modelo pronto, uma regra testada, uma integração funcional e um recurso publicado têm pesos e estados diferentes. Somar arquivos produziria uma precisão enganosa.

## Referências, escopo e limites

Foram usados os dois documentos fornecidos pela dona:

| Referência | Identificação |
| --- | --- |
| `C:\Users\tocha\Downloads\Arquipélago Vagalume.html` | 248.168 bytes; SHA-256 `1922980444673ee2ff59df18b518f47e4d56d8949f9cef2c27cf03dfdcd17e7b` |
| `C:\Users\tocha\Downloads\Proposta Jornada do Criador - revisao aprofundada.html` | Revisão de 25/10/2026; SHA-256 `1ae99c86e1aa7311663f1642fded5a895cc289dd88b2304d4555a503608ab88e` |

O segundo documento define a referência pedagógica. Seus cursos ainda propostos não são tratados como cursos já publicados. Mudanças posteriores já registradas, como a produção da Ilha do Farol, foram preservadas na comparação.

Também foram examinados o plano de entrega integral, as regras do jogo, os contratos, os manifestos, implementações do jogo e das integrações, testes e registros de QA. O inventário anexo registra 448 arquivos de código-fonte: 342 do jogo, 38 dos contratos e 68 da API, com hashes e importações. Houve leitura dirigida adicional de Members, member-shell, avatar-quarto, conteúdo e verificadores. Isso não equivale a uma revisão manual de todas as linhas de todos os pacotes.

Para não misturar mudanças simultâneas com defeitos consolidados, os testes desta auditoria usam um worktree destacado em `C:\Users\tocha\projects\sistema-zero-auditoria-20261030`, no commit acima. A outra sessão está ampliando a rede de barcos no diretório original. Esse trabalho é identificado como em andamento e não foi alterado.

Não foram consultados nem modificados bancos de staging ou produção. Esta auditoria não confirma o que está implantado. A presença de código e testes locais não prova disponibilidade para a conta real de uma criança.

## 1. Levantamento por ilha

| Área da proposta | O que está implementado na base | O que falta ou precisa de qualificação |
| --- | --- | --- |
| Ilha central / Faísca | Casa e quarto da plataforma, entrada narrativa ilustrada, primeiro pedido com plantio e colheita, construção, objetos funcionais, praia, Nico, Lumis, píer, luneta, Farol e conexões com o anel | Não localizei um ciclo jogável de pesca, coleção de peixes/conchas da praia ou pacote de desafios do Pega-conchas. A vara e elementos decorativos não equivalem à atividade. A chegada da tempestade é contada por ilustrações, não uma sequência jogável completa |
| Bosque / Construtor | Ilha completa, Capi, amizade e diário, bichos e adoção, cuidados, pegadas, escalada/cipós/copas, cabana, lago e física viva, Lumis, Corrida dos bichos e quadros adicionais | Publicação e acesso real ao conteúdo precisam de homologação. Distinguir o bicho adotado no Bosque do pet que vem do quarto: não são hoje o mesmo acompanhante universal |
| Vila Doce / Inventor | Ilha completa, Bento, receitas e forno, amizade/página, atividades de entrega, profissões, feira, patins, Lumis e pacote da Corrida do entregador | Validar a entrada com repertório do Construtor e os quadros posteriores com as competências do Inventor. Publicação e economia integrada precisam de prova autenticada |
| Recife Coral / Explorador | Ilha completa, Maré, lagoa/nado, mergulho e exploração submersa, achados, corais/aquário, mapa, barco central–Recife, amizade/página e Mira de bolhas | A rede entre ilhas ainda não está no commit auditado e está sendo implementada por outra sessão. O desafio em blocos JavaScript não demonstra a aprendizagem de pequenos trechos em Python prevista para o posto |
| Pico Gelado / Mestre | Ilha completa, Floco, exploração/plataformas, trenó, cristais, planador, atividades e festa de inverno, amizade/página e minijogo de plataforma | Falta a ampliação de segundo andar da casa prevista na proposta. O minijogo atual não comprova funções, listas e fases como dados em Python. Um iglu existente na cena não comprova uma ferramenta para construir iglus |
| Vale dos Dinos / Arquiteto | Ilha completa, Jade, rastros, escavação, ninhos, filhote, museu, montaria, amizade/página e Proteja os ninhos | O pacote retoma ondas/listas em blocos, mas não cobre por si a transição para JavaScript com Canvas/three.js. Precisa ficar explícito o que a pessoa programa e o que já vem preparado |
| Ilha das Nuvens / Gênio | Ilha completa, Iriê, percursos/plataformas, balão e corrida, constelações, jardim/clima, amizade/página e simulação com recursos | Terraformação ainda falta. A simulação atual não é evidência suficiente de grade, ocupação, custo, módulos e persistência do currículo Pro. Há continuidade de progresso implementada, não apenas estado da sessão |
| Farol / Lenda | Porta condicionada à Lenda, sala do alto, última página, revelação do Zappy, seis fachos, retorno da Íris, conversa e conclusão persistida | A subida usa transição para a sala, não o percurso final que combina habilidades. Faltam criação livre avançada, exposição/galeria no Farol e projeto autoral correspondente. O final narrativo está muito mais completo que o ciclo de continuidade após ele |

Arquivos centrais: `src/mundo/ilha-completa.tsx`, `anel.tsx`, os componentes `*-vivo.tsx`, `src/sistemas/diario.ts`, `src/mundo/final-do-farol.tsx`, `src/sistemas/final-do-farol.ts` e os pacotes de `docs/desafios-do-jogo/`.

As simplificações aprovadas durante a construção do produto não são automaticamente defeitos. Por exemplo, a transição para o alto do Farol funciona como final narrativo; ela apenas não entrega literalmente a aventura de subida descrita no HTML.

## 2. Sistemas transversais

| Sistema | Situação e avaliação |
| --- | --- |
| Exploração e movimento | Implementação forte: passo fixo, modos de movimento, colisores, câmera, água e situações próprias das ilhas. As regras e os testes usam a geometria real em vários percursos |
| Física viva | Já há materiais, empuxo, objetos flutuantes, pontes/cordas, mecanismos, vento, vegetação que reage e estados de materiais. A qualidade de resposta e o custo no celular ainda precisam de ensaio físico, além de teste de regra |
| Casa e construção | Há paredes, aberturas, piso, telhado, cômodos, objetos e regras compartilhadas entre lotes. Não há o segundo andar nem terraformação completa da proposta |
| Pinta e Molda | A criação da pessoa já pode substituir a aparência do objeto. Há limites, encaixe, direção, reserva visual, aborto e descarte. A colisão continua simples e independente da malha criada |
| Galeria e inventário | A identidade canônica e a posse no Members foram implementadas. A adoção operacional de compras antigas ainda não foi executada remotamente. Só os objetos compatíveis com o quarto são compartilhados como móveis; não há equivalência visual automática de todo o catálogo |
| Aconchego | Variedade, luz, plantas, capricho e autoria têm regra pura. Comprar não subtrai pontos. Visitas e festas de moradores já usam os resultados, com lugares acessíveis e limites de participantes |
| Necessidades e descanso | Fome, energia, diversão, comida, descanso e cochilo existem. A ausência não é tratada como abandono que apaga conquistas. Há uma tensão no movimento mais lento quando o humor está baixo, detalhada adiante |
| Horta e receitas | Plantio, cuidado, colheita, receitas, ingredientes, primeira colheita orientada, bônus e receitas sazonais estão ligados. Isso já forma um ciclo de atividade e recompensa, não apenas decoração |
| Moradores | Capi, Bento e moradores do anel têm apresentação e vida cotidiana. Gostos, amizade, pedidos e páginas foram ampliados. A Íris retorna no final. Os dados próprios reaproveitam regras comuns |
| Lumis | Espécies, captura, diferenças funcionais e rotinas existem. O mesmo intérprete sustenta experimentação e execução no mundo. Horta/mochila/capacidade são consideradas nas ações |
| Minijogos como brinquedos | Cópia aprovada, listagem, fliperama, player e acesso dos pais estão implementados. Há também integração de jogos próprios do Mural. Falta qualificar o caminho completo autenticado e a situação publicada |
| Economia | Carteira única, prêmios de desafios, turnos, pedidos remunerados e compra de insumos têm implementações de servidor. Há idempotência e teto semanal. O teto atual de prêmios do jogo é 100, sem retroceder créditos antigos |
| Festas e retorno | Há tema semanal, feira, receitas e sugestões sazonais de vestuário. As datas da Noite das Lanternas e do fim de ano continuam sem definição e desativadas. Não devem ser contadas como festas plenamente entregues |
| Mapa e barcos | O mapa registra ilhas visitadas. Não é um mapa detalhado de áreas descobertas. O barco central–Recife existe; a rede ampliada está em implementação simultânea |
| Família | Visitas a casas da própria família, permissões e minijogos para os pais existem. O fantasma de corrida tem contrato e gravador/reprodutor puros, mas não o fluxo completo de autorização, armazenamento e uso |
| Público adulto | Há voz própria, tratamento de jornada e ausência das restrições parentais infantis. A visita consentida entre adultos ainda falta. A experiência adulta de desafios precisa de conteúdo publicado e teste autenticado próprios |
| Medição | Há agregados, retorno infantil, desafios, minijogos e proteção para grupos pequenos. Persistem lacunas de compras, conclusões de curso, retorno adulto e satisfação/retenção familiar. Não se deve inferir satisfação de tempo jogado |

## 3. O que está especialmente bem implementado

### 3.1 Separação entre jogo, plataforma e ferramentas

O jogo mantém a plataforma como autoridade para identidade, jornada, carteira e quarto. Pinta, Molda e Estúdio são abertos pela integração existente, sem cópias internas improvisadas. Os testes de fronteira protegem essa divisão. Isso reduz o risco de a mesma conta, compra ou criação passar a ter duas verdades.

### 3.2 Regras puras e provas de comportamento

Há uma separação útil entre regra, estado, apresentação e modelo. Colisores e percursos recebem testes específicos; os desafios possuem inicial, gabarito e casos negativos. Essa estratégia é muito melhor fundamentada que uma aprovação baseada em existência de arquivos ou igualdade literal com a solução.

O cuidado pedagógico também aparece em permitir cenário pronto e avaliar a regra que a pessoa deve completar. A ressalva é não transformar uma estrutura já pronta em prova de que ela aprendeu a construí-la.

### 3.3 Criação própria entrando no mundo

O caminho do Molda/Pinta é um dos pontos mais alinhados à proposta. A aparência criada se torna parte do ambiente, sem trocar o colisor por uma malha arbitrária. Carregamento, falha, tamanho, encaixe e liberação de recursos foram considerados. É uma integração substancial, não apenas um botão que abre o editor.

### 3.4 Continuidade e autoridade da economia

A implementação atual preserva conquistas do Farol e das Nuvens, mantém histórico de migrações e trata conflitos. Carteira e concessões sensíveis têm autoridade no servidor e proteção contra repetição. Os testes ajudam a proteger a experiência de “fiz, voltei e continua aqui”.

### 3.5 Construção com efeito na vida cotidiana

Aconchego deixou de ser somente uma pontuação decorativa: já chama visitas e permite festas. A autoria ganha um bônus, enquanto comprar continua sendo uma escolha válida. O cálculo de posições acessíveis evita que o prêmio seja um morador preso num móvel.

### 3.6 Preparação para desempenho

Uma ilha completa por vez, colisores preparados antes da troca, descarte de recursos e qualidade adaptável são boas decisões. A física não depende da taxa de desenho. Isso sustenta uma avaliação positiva de arquitetura, mas ainda não comprova as metas de 60 FPS no computador e 30 FPS em aparelhos modestos.

“Excelente”, aqui, descreve decisões e implementações com evidência técnica. Não é uma nota de diversão, aprendizado ou usabilidade atribuída sem observar crianças e adultos usando o produto.

## 4. Coerência com a Jornada do Criador

### A referência correta

O documento da Jornada separa quatro coisas: acesso comercial, promoção, repertório de blocos e ferramentas. Concluir um curso concede seu repertório; chegar a um posto não significa ter aprendido os cursos desse posto. O par 2D/3D abre missão, Poderes e extras. Um Poder específico não pode virar pré-requisito oculto de quem escolheu outro.

O Arquipélago deve reaplicar esse aprendizado, sem criar uma segunda promoção independente nem exigir domínio de um curso futuro só porque a ponte abriu. Na entrada da ilha, cabe um desafio com conhecimentos anteriores. Depois dos cursos, cabem desafios que usem as novas competências.

### Comparação por posto

| Posto / ilha | O que o documento prevê ensinar | Diagnóstico dos desafios do Arquipélago | Ajuste recomendado |
| --- | --- | --- | --- |
| Faísca / central | Evento e ação, informação booleana, se/senão, posição, teste com e sem objeto | Falta pacote próprio da ilha central. Brincar de plantar no mundo não substitui uma aplicação programada desses conceitos | Atividade curta de coleta, memória e decisão, depois do conteúdo correspondente. Não exigir contador, prazo ou grupo como conhecimento universal |
| Construtor / Bosque | Grupos, criação por relógio, contato/retirada, pontos, vidas, estados e reinício | Corrida dos bichos e quadros têm utilidade como prática. Não cobrem automaticamente toda a competência de construir uma partida | Separar entrada com repertório Faísca de desafios posteriores de grupo, estado e reset. Não exigir Poder opcional |
| Inventor / Vila | Gravidade, pulo com apoio, colisão justa, sorteio limitado, ritmo e dificuldade com teto | Entrega e obstáculos combinam com o tema, mas a coerência depende das regras que ficaram a cargo da pessoa | Conferir casos de pulo no chão/no ar, colisão, limites do sorteio e reinício. Não avaliar só chegar a um destino |
| Explorador / Recife | Python, leitura de código, nomes/valores/indentação, evento de clique, estado, tempo e erro pequeno | Mira de bolhas em blocos JavaScript pode retomar lógica conhecida. Não prova ler, escrever ou depurar Python | Manter a retomada e criar aplicação em Python depois do curso, com distinção alvo/vazio, tempo e alteração de trecho curto |
| Mestre / Pico | Python, funções/parâmetros, listas, fase como dados, colisão por eixo e depuração | Plataforma em blocos pode ser brincadeira útil. Não demonstra funções/listas e reconstrução de fase a partir de dados em Python | Pedir alteração pequena de dados/função e testar chão/parede, coleta/saída e troca de fase |
| Arquiteto / Vale | JavaScript, Canvas/three.js, objetos/funções, atualização/desenho, ondas, caminhos e alcance | Proteja os ninhos aproveita ondas e listas, mas permanece em blocos e traz parte da estrutura pronta | Explicitar o objetivo de cada quadro e acrescentar aplicação na linguagem/ambiente do curso. Não dar por aprendido o laço fornecido pelo inicial |
| Gênio / Nuvens | Pro, grade, ocupação, custo, produção, módulos, salvar/reabrir e revisão | A simulação de água/sol/crescimento retoma recursos e estados, mas não cobre a competência central inteira | Acrescentar desafios de célula ocupada, saldo, produção e persistência. O teste precisa reabrir o estado salvo, não apenas olhar um contador |
| Lenda / Farol | Autoria, combinação, testes, revisão e Maestrias escolhidas | O final da história existe; falta uma continuidade autoral correspondente | Exposição opcional e projeto pequeno com escolhas próprias, teste e revisão. Não criar uma nova fila obrigatória para conservar a Lenda |

### Limite técnico concreto

O schema de objetivos em `packages/arquipelago-contracts/src/desafios.ts:86` aceita `programmingLanguage: 'javascript'`. Os pacotes atuais usam projetos JavaScript em blocos. Portanto, não basta trocar o texto do enunciado para dizer que uma atividade é de Python: contrato, execução, validação e conteúdo precisam suportar essa evidência.

Também há estruturas de percorrer grupo já preparadas nos quadros do Vale e das Nuvens. Os testes de `quadros-iniciais.test.ts` explicitam a exceção para `sz_g2d_for_each_in_group` fornecido no inicial. Isso pode ser um apoio legítimo. Não comprova que a pessoa aprendeu ou reconstruiu a estrutura, e exige cuidado se a proposta do quadro for justamente ensinar listas e repetição.

### Conteúdo escrito versus conteúdo disponível

Há 12 manifestos: seis ilhas, cada uma com versão Kids e adulta. Cada arquivo tem nove entradas: seis quadros e três desafios do dia. São 108 entradas, correspondentes a 54 atividades por público, com reaproveitamento entre públicos, não 108 ideias pedagógicas independentes.

Nos manifestos Kids, quatro entradas por ilha estão marcadas para publicação e cinco não. Nas versões adultas, nenhuma está marcada. Essa marca é configuração do artefato, não prova de publicação remota. O checkpoint de 30/10 registra que os manifestos ainda não foram importados em staging ou produção.

Falta, portanto, fechar currículo, acesso, publicação e experiência de “Aprenda isso em” com uma conta real. O teste que compara os blocos com a união das listas locais é útil, mas não prova que cada aluno concluiu os cursos ou Poderes que concedem aqueles blocos.

## 5. Ajustes e inconsistências encontrados

### A1. A cor pode contar uma história diferente da aprendizagem

**Prioridade alta. Evidência direta no código.** `src/sistemas/cor-da-ilha.ts:24` define que catálogo nulo, indisponível ou sem desafio deixa os pedaços coloridos. `andarPedacos`, no mesmo arquivo, também retira cor imediatamente quando surge um desafio novo ainda não feito. `anel.tsx` e o estado de desafios fazem essa ligação com a cena.

A intenção de não deixar uma ilha inutilmente cinza é compreensível. Mas há duas consequências: uma primeira leitura sem catálogo pode mostrar restauração completa sem a ação da pessoa; uma publicação posterior pode tornar cinza algo que já parecia restaurado. Isso enfraquece “minha criação traz a cor de volta”. Não significa que o servidor conceda moedas ou conclusão indevidamente.

**Recomendação:** preservar a última situação confirmada; em catálogo desconhecido, usar a cor-base da ponte aberta e um estado neutro de disponibilidade; definir como novos quadros entram sem retirar visualmente uma conquista anterior. O teste deve cobrir primeira abertura offline, recuperação da API e publicação posterior.

### A2. Os desafios avançados não comprovam todo o repertório anunciado

**Prioridade alta. Evidência de contrato, projetos e proposta pedagógica.** A diferença entre JavaScript em blocos e Python/JavaScript textual é concreta. Os desafios podem ser válidos como retomada sem serem suficientes como aplicação do posto.

**Recomendação:** classificar cada quadro como retomada ou aplicação, declarar curso/pré-requisito real e definir evidência observável. Acrescentar suporte de execução antes de publicar desafios que prometam competências não avaliáveis pelo contrato atual. Usar a matriz da seção 4, sem transformar toda atividade do jogo em uma prova extensa.

### A3. Movimento reduzido e pausa não chegam a todas as animações do quarto

**Prioridade média. Evidência estática direta, sem reprodução específica no navegador nesta auditoria.** `src/mundo/casa.tsx:69` habilita `RoomMotionContext` incondicionalmente e, na linha 96, passa `reducedMotion={false}` ao pet. O `Pet3D` do pacote avatar-quarto usa essa propriedade para interromper sua animação em `useFrame`. A cena continua desenhando com painéis comuns abertos, embora a física seja pausada.

Assim, a política global de menos movimento/pausa não está propagada a esses elementos. A pausa da física não basta para interromper uma animação que anda pelo relógio de desenho.

**Recomendação:** ligar os dois pontos ao estado efetivo de pausa e menos movimento. Conferir pet e móveis animados com menu, ferramenta e preferência do sistema, tanto em casa própria quanto na visita.

### A4. A abertura exige acompanhar o relógio da leitura

**Prioridade média. Avaliação pedagógica baseada no comportamento implementado.** As oito cenas somam 73 segundos. Há avanço e opção de pular; a aba escondida suspende o tempo. Com a tela visível, falas/cenas avançam automaticamente. Não há controle de voltar uma fala ou segurar a leitura.

Isso pode desfavorecer quem lê devagar e reduzir a compreensão do conflito da Íris. Menos movimento reduz efeitos visuais, mas não resolve o tempo de leitura.

**Recomendação:** avanço por confirmação, ou controles claros de pausar/voltar. Manter uma opção automática para quem preferir. Testar compreensão, não somente o tempo até fechar a introdução.

### A5. A orientação do HUD precisa respeitar o momento da história

**Prioridade média. Observação no playground.** No cenário novo da Lenda usado pelo verificador, a sala do alto do Farol ainda exibe a tarefa de plantar uma semente e a chamada do desafio diário. É um estado de teste que combina Lenda com primeiro pedido incompleto, não prova de que todo jogador chegará assim ao final. Ainda assim, mostra que a prioridade do guia não considera suficientemente o contexto narrativo.

**Recomendação:** durante o final, priorizar a última página e suspender tarefas periféricas. Depois, devolver as pendências. Evitar que a novidade mais recente do sistema dispute atenção com a ação que a cena pede.

### A6. “Sem castigo” merece uma revisão das consequências de cuidado

**Prioridade média de produto, não falha técnica.** `src/sistemas/necessidades.ts:39` usa multiplicadores de movimento 1,1 para ótimo, 1 para bem e 0,8 para cansado. A proposta enfatiza bônus de cuidado; a velocidade reduzida também pode ser sentida como perda, especialmente durante uma travessia.

**Recomendação:** avaliar velocidade-base preservada e bônus positivo, ou demonstrar por teste que todas as travessias continuam confortáveis no estado cansado. Não confundir esse ponto com punição por ausência: o sistema já evita degradar necessidades simplesmente porque a pessoa ficou dias fora.

### A7. A medição de autoria é uma fotografia, não um histórico de criação

**Prioridade média. Evidência direta de consulta.** `packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-medicao.ts:43` agrupa a origem atual da aparência e filtra pela data `ganhoEm` do projeto azul. Um projeto recebido em setembro e modelado em outubro não se torna uma criação de outubro nessa consulta. Trocar a origem da aparência também pode mudar a classificação histórica daquela fotografia.

**Recomendação:** conservar o indicador atual com nome preciso e acrescentar eventos de criação/uso/compra quando a pergunta for “o que aconteceu neste período”. Não usar esse número para comparar eficácia pedagógica ou produção semanal. As fontes ausentes devem continuar explicitadas, como já faz `semFonte`.

### A8. Documentos acumulam estados antigos e novos sem uma leitura única

**Prioridade média. Evidência documental.** Há referências antigas a versões de salvamento, teto semanal, pendências da voz adulta e portos que já receberam arte. O plano integral tem um checkpoint atual que corrige parte disso, seguido de registros antigos que podem parecer pendências atuais.

**Recomendação:** criar uma matriz canônica por funcionalidade com os estados “código”, “conteúdo”, “teste”, “implantação” e “decisão pendente”. Manter o histórico datado, sem apresentá-lo como situação atual. O teto vigente de 100 e o salvamento V18 devem ser facilmente identificáveis.

### A9. Formatação dos relatórios da arte

**Prioridade baixa. Verificação automática.** O Biome completo dos dois pacotes aponta formatação em `packages/arquipelago/arte/ilhas/relatorio.json` e `arte/ilhas-b/relatorio.json`. Não são erros de lógica do jogo. Convém alinhar a saída do gerador ao formato aceito ou delimitar explicitamente o tratamento desses artefatos gerados. Nenhum deles foi modificado nesta auditoria.

### A10. A cópia de personagem animado não libera sua textura de esqueleto

**Prioridade alta de confiabilidade. Evidência de navegador e reprodução isolada.** O verificador padrão do Farol passou, mas mede a estabilidade de geometrias e não reprova o aumento de texturas. Na reentrada, ambos os cenários mantiveram 399 geometrias, enquanto as texturas subiram de 53 para 74.

`src/mundo/arte-animada.ts`, em `copiarArteAnimada`, cria esqueletos próprios por `SkeletonUtils.clone`. Seu `soltar()` libera apenas os materiais de brilho copiados. `useCopiaAnimada` chama esse descarte ao desmontar; o personagem é um `primitive`, cuja propriedade de recursos exige cuidado explícito. O esqueleto possui sua própria `boneTexture`, produzida quando necessário pelo renderizador.

A reprodução pura criou uma cópia, alocou a textura do esqueleto, chamou `soltar()` e confirmou: esqueleto próprio, textura própria, nenhum evento de descarte e textura ainda presente. Isso identifica uma lacuna concreta de liberação. O aumento medido no navegador é compatível com essa lacuna, embora não atribua individualmente cada textura a um proprietário.

Uma execução adicional repetiu a entrada/saída mais três vezes depois da reentrada do roteiro original. A sequência foi **53, 74, 95, 116 e 137 texturas**, sempre com **399 geometrias**. Houve espera de estabilização após cada saída. Portanto, não foi apenas um carregamento inicial isolado. As medidas completas estão em `qa-2026-10-30-arquipelago/memoria/ciclos.json`.

**Recomendação:** liberar os esqueletos próprios, uma vez por instância, sem descartar geometria ou material compartilhado do modelo original. Acrescentar prova de remontagem repetida que observe texturas e geometrias após estabilização. Não considerar o teste atual do Farol uma prova de ausência de vazamento de memória.

## 6. O que ainda falta implementar ou completar

### Conteúdo e aprendizagem

- Pacote da ilha central/Faísca e proposta de atividade autoral após o Farol.
- Cobertura das competências de Python e dos ambientes textuais/Pro, sem chamar simples repetição em blocos de comprovação dessas competências.
- Vínculos reais de curso, disponibilidade por pessoa e publicação dos quadros restantes, com versões adultas verificadas.
- Conferência completa do caminho: desafio disponível, ferramenta aberta, orientação apropriada, tentativa, feedback, aprovação, cor e atração.

### Exploração e mundo

- Pesca e coleção correspondente da praia, se mantidas na proposta.
- Rede de barco entre portos, em andamento na outra sessão. A arte dos cinco portos já existe; não é correto repetir o bloqueio antigo de ausência desses portos.
- Fantasma de percurso familiar integrado, além do gravador/reprodutor puro.
- Descoberta mais detalhada no mapa, caso se mantenha a ideia de revelar áreas exploradas e não apenas marcar ilhas.
- Definir e completar os segredos que reaproveitam habilidades de ilhas anteriores, com uma matriz de percurso e recompensa. A presença de habilidades isoladas não comprova essa rede inteira.

### Construção, expressão e final

- Segundo andar e ampliações previstas da casa.
- Terraformação delimitada, com proteção dos percursos e colisores.
- Modo criativo livre da Lenda e exposição no Farol.
- Decisão explícita sobre manter a transição atual ou construir a subida final como aventura.
- Completar a relação entre o pet do quarto e o acompanhante da ilha, se a intenção continuar sendo o mesmo companheiro.

### Social, calendário e medição

- Visitas consentidas entre adultos.
- Datas e produção das festas sazonais ainda desativadas.
- Fontes de compra/autoria por evento, retorno adulto, conclusões de curso e satisfação/retenção familiar.
- Implantação e adoção operacional das integrações de inventário, preservando compras antigas.

### Qualificação da entrega

- Jornada autenticada de Kids e adulto, com a conta e permissões reais de cada público.
- Testes com crianças e adultos para orientação, leitura, esforço, prazer de explorar e retorno ao curso.
- Dispositivos físicos modestos, carga, memória e descarte após sessões longas.
- Conferência de compatibilidade de versões, configuração e disponibilidade do conteúdo no ambiente servido.

## 7. Coerência visual e de interação

O conjunto tem uma identidade reconhecível: volumes arredondados, personagens expressivos, ilhas temáticas e interface própria. A construção e as ferramentas são parte desse mesmo mundo, um acerto importante da proposta.

A melhoria prioritária não é trocar a identidade visual. É orientar melhor a atenção: sinalizar claramente o que é decoração e o que pode ser usado, mostrar a próxima ação relevante para a situação e evitar painéis periféricos durante momentos narrativos. No celular, essa seleção de informação importa tanto quanto fazer todos os botões caberem.

Os materiais visuais de QA ajudam a verificar encaixe e legibilidade, mas não bastam para declarar toda a arte excelente. É necessário observar o movimento, a câmera, o caminho até os objetos e a leitura em tela física. A aprovação do final no navegador tampouco certifica todas as ilhas.

### Coerência narrativa

O tema central foi preservado: medo de criar, rascunhos guardados, retomada da criação e acolhimento do imperfeito. As páginas intermediárias e a revelação do Zappy dão continuidade a essa ideia. O final já tem consequência durável, com a Íris de volta.

Há uma diferença em relação à frase original de que a Íris só aparece nas páginas até o final: a abertura agora a mostra desenhando numa ilustração do passado. Isso não equivale a encontrar a personagem no mundo antes da hora, mas deve ser registrado como adaptação narrativa deliberada.

A descrição do Cinza como algo que chega onde ninguém cria precisa conviver com a regra de ausência sem punição. Recomendo deixar claro nas falas de retorno que o mundo guardou as conquistas, para a metáfora não soar como ameaça de perder as cores por ficar alguns dias sem jogar. A correção de A1 é especialmente importante para sustentar essa promessa.

## 8. Prioridades sugeridas e critérios de conclusão

| Ordem | Entrega | Critério verificável |
| --- | --- | --- |
| 1 | Consolidar a verdade do produto | Matriz única registra implementado, publicado, testado e pendente; documentos não contradizem regras atuais |
| 2 | Fechar conteúdo e currículo | Cada quadro diz o que a pessoa programa, quais conhecimentos usa e quando pode abrir; testes observam a competência correspondente |
| 3 | Corrigir continuidade visual, recursos e acessibilidade | Falha de catálogo não restaura nem retira conquista; cópias animadas liberam recursos; pet/móveis respeitam pausa e menos movimento; abertura permite acompanhar a leitura |
| 4 | Homologar os ciclos integrados | Conta real completa desafio, recebe recompensa uma vez, aplica criação, reabre e conserva o resultado; versões Kids/adulta verificadas |
| 5 | Completar as lacunas maiores da proposta | Pesca, exploração ampliada, construção avançada e continuidade da Lenda têm fluxos jogáveis, não somente modelos ou regras isoladas |
| 6 | Qualificar para uso prolongado | Evidência de dispositivos físicos e sessões longas; sem crescimento indevido de recursos; pessoas encontram o objetivo sem explicação constante |

Não é necessário esperar todas as novidades para corrigir os problemas de coerência. Também não recomendo publicar todos os manifestos de uma vez só para aumentar uma contagem de conteúdo disponível.

## 9. Verificações desta auditoria

Executadas na base isolada, sem alterar código:

| Comando / verificação | Resultado |
| --- | --- |
| `bun install --offline --ignore-scripts --frozen-lockfile` na cópia isolada | Dependências instaladas, sem mudança do lockfile |
| `bun test` em `packages/arquipelago` | 1.220 passaram, 1 ignorado, 0 falharam; 144.132 verificações; 143 arquivos. O teste ignorado exige integração com Postgres |
| `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit` no jogo | Passou |
| `bun test` em `packages/arquipelago-contracts` | 195 passaram, 0 falharam; 8.261 verificações |
| `bun test tests/unit` em `packages/arquipelago-api` | 92 passaram, 0 falharam; 224 verificações; sem banco |
| `bun test docs/desafios-do-jogo` na raiz | 18 passaram, 0 falharam; 12.316 verificações. Valida fontes/artefatos e regras declaradas; não substitui execução de todos os projetos no navegador |
| `bunx biome check packages/arquipelago packages/arquipelago-contracts` | 640 arquivos; dois erros de formatação nos relatórios JSON de arte citados em A9; nenhuma correção aplicada |
| Verificador do final do Farol, compilado com Bun e executado com Chrome/SwiftShader | Passou no computador e no celular emulado. Conferiu sala, caminhada até a mesa, página, pausa, seis fachos, Íris, diário, reentrada, saída e persistência ao recarregar. Também conferiu reserva na falha de carga e bloqueio antes da Lenda |
| Reprodução pura do descarte de cópia animada | Confirmou a lacuna descrita em A10: a textura própria do esqueleto permanece após `soltar()` |
| Repetição adicional de entrada/saída no Farol | Confirmou crescimento contínuo de texturas, com geometrias estáveis: 53 → 74 → 95 → 116 → 137 |

O resultado do navegador e seus arquivos de evidência são registrados no [complemento de QA](qa-2026-10-30-arquipelago/README.md). O verificador do Farol usa o playground e plataforma falsa, com computador e celular emulado. Isso não substitui integração autenticada nem celular físico. Seus registros revelaram A10 mesmo com o resultado geral aprovado.

Os resultados históricos de `docs/qa/2026-10-30-integracao-portos/README.md` sustentam a existência de provas adicionais de integração, mas não foram reapresentados como execuções novas. A tentativa inicial de typecheck na árvore compartilhada encontrou a rede de barco em edição; foi descartada como evidência de defeito desta base e substituída pelo teste isolado, que passou.

Não foram feitos commit, push, escrita em banco, mudança de configuração, correção de código ou alteração de arte. Foram produzidos o relatório, o inventário e evidências locais de QA.

## Referências locais para continuidade

- [Inventário da base](arquipelago-inventario-2026-10-30.json).
- [Plano integral e checkpoint atual](../docs/plans/2026-10-29-arquipelago-entrega-integral-design.md).
- [Regras do jogo](../docs/arquipelago-regras.md).
- [Contrato de trabalho do pacote](../packages/arquipelago/CLAUDE.md).
- [Conteúdo por posto](../docs/desafios-do-jogo/conteudo-por-posto.md).
- [QA integrado anterior](../docs/qa/2026-10-30-integracao-portos/README.md).

A conclusão é favorável à arquitetura e ao caminho de produto, com ressalvas importantes sobre completude. O próximo ganho de qualidade virá de fechar a ligação entre aprendizado, autoria e consequência no mundo, e de comprovar essa ligação no uso real.
