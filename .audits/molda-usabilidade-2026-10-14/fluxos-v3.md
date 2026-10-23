# Molda: catálogo de telas, fluxos e transições

14/10/2026 · Revisão 3 · Complemento normativo da [proposta revisada](2026-10-14-molda-usabilidade-proposta.md).

Este catálogo descreve o comportamento proposto. “Tela” inclui estados de uma mesma oficina e painéis contextuais; não são 45 páginas novas. A cobertura reúne o percurso básico, as 23 famílias atuais, os 45 comandos do registro de cena e fluxos complementares identificados no código. Não é prova de execução nem enumeração de todas as combinações possíveis de dados.

## 1. Contratos comuns

**Regiões:** cabeçalho e histórico; trilho esquerdo; palco; painel direito; contexto inferior; timeline apenas em Animar ou, separadamente, dentro de quadros da pintura. Um contexto especial substitui conteúdo na região designada. Não empilha vários painéis sobre a criação.

**Seleção:** uma fonte para palco, árvore, propriedades e timeline. Um gesto sobre peça não selecionada apenas a escolhe; não move nem pinta nesse gesto. Um traço iniciado continua no alvo inicial mesmo cruzando outra peça. Peças ocultas e travadas permanecem recuperáveis pela lista. Seleção múltipla mostra quantidade e valores diferentes; não apresenta valores da primeira peça como se fossem de todas.

Pegar cor é uma ação de leitura: pode amostrar uma peça visível sem trocar o alvo que receberá a pintura. Olhar também conserva a seleção. Colocar em cima usa um segundo alvo de apoio destacado, sem substituir a peça movida.

**Formulários:** valores válidos recebem prévia ou aplicação claramente definida; não aplicar texto incompleto. Enter confirma o formulário ativo, Escape cancela sua edição e foco retorna ao controle de origem. Em campos simples de valor atual, sair do campo confirma apenas um valor válido; valor inválido pede corrigir ou restaurar, sem alterar o modelo. Formulários de operação com botão Aplicar conservam o rascunho até aplicação/cancelamento e resolvem-no antes de abandonar o contexto. Mudança externa de revisão invalida formulários cujo alvo ficou desatualizado. Atalhos do editor não capturam digitação em campos.

**Operações:** ações simples confirmam no clique/soltura e permitem Desfazer. Importação, conversão, corte, vínculo e presets usam prévia/revisão quando necessária. Não acrescentar confirmação a toda cor, peça ou rotação.

**Assíncrono:** mostrar progresso real ou espera indeterminada identificada, Cancelar quando suportado, e erro com recuperação. Resultados só pertencem à combinação documento/revisão/sessão/requisição que os originou. Não aplicar resposta tardia a outra criação.

**Retorno:** fechar detalhes preserva atividade, ferramenta compatível, seleção, câmera e posição do painel. O foco volta ao acionador; se ele desapareceu, volta ao título do contexto pai. Não guardar referências a peças ou movimentos removidos.

## 2. Telas e estados

### Entrada e galeria

| ID | Entrada e conteúdo | Ação principal / conclusão | Retorno, vazio e falha |
|---|---|---|---|
| T01 | Galeria: projetos, tipos e busca, status de carregamento/sincronização | Abrir → editor do tipo; Criar modelo → T08 | Vazia: Criar modelo; busca vazia: limpar filtro; falha parcial distingue itens carregados dos indisponíveis |
| T02 | Outras criações: Modelo, Textura, Céu; opções necessárias de tamanho/base | Modelo → T08; textura → T41; céu → T42 | Cancelar → T01; nome provisório válido evita etapa obrigatória de nome para modelo |
| T03 | Modelos de partida: prévias, nome e escolha | Criar cópia → T08, com seleção inicial útil | Voltar → T01; falha ao carregar mantém escolha e permite repetir; original intacto |
| T04 | Renomear, duplicar ou excluir projeto a partir da galeria/cabeçalho | Nome normalizado e único; duplicação cria outro ID; exclusão identifica o projeto | Cancelar volta à origem; referências no Estúdio precisam de tratamento; falha não remove cartão falsamente |
| T05 | Restaurar projeto Molda/ZIP: escolha, leitura, resumo, restauração | Abrir recuperado ou voltar à galeria | Arquivo inválido/futuro: preservar original; ZIP parcial lista sucessos e falhas; cancelar não cria conteúdo a meio silenciosamente |
| T06 | Baixar todas as criações: inventário e preparação | Baixar backup completo ou parcial explicitamente identificado | Inventário de cenas indisponível impede promessa de backup completo; progresso/cancelamento e falha de download visíveis |

### Modelar e navegação

| ID | Entrada e conteúdo | Ação principal / conclusão | Retorno, vazio e falha |
|---|---|---|---|
| T07 | Modelar sem seleção; formas à esquerda, árvore direita, palco | Selecionar → T08 ou adicionar peça → T08 | Cena realmente vazia mostra convite no centro; não abre propriedades sem alvo |
| T08 | Modelar com uma peça: ferramenta única, árvore, cartão contextual e aparência | Mover/girar/tamanho/cor; Colocar em cima; duplicar; apagar | Peça de apoio não vira a seleção; Cancelar desfaz preparação; apagar última peça → T07; trava/apoio incompatível explica motivo |
| T09 | Seleção múltipla: quantidade, contorno de conjunto e valores mistos | Transformar conjunto, agrupar, desagrupar, remover; preparar conjunto a partir de T28/T31 | Voltar à origem; dependências animadas revisadas; preparação de conjunto só persiste junto da confirmação do movimento |
| T10 | Medidas e ajustes precisos dentro do cartão, conforme acesso | Aplicar valor absoluto na referência indicada | Fechar → T08; entrada inválida mantém valor anterior; matrizes incompatíveis não são decompostas silenciosamente |
| T11 | Olhar visível ao lado de Vista/Enquadrar; grade/apoios/isolar | Navegar mesmo com palco ocupado e voltar à ferramenta lembrada | Enquadrar sem visíveis oferece mostrar peças pela lista; isolamento tem saída; não gera histórico autoral |
| T12 | Imagem de apoio: escolher imagem, posicionar e ajustar transparência | Usar imagem no palco | Remover apoio não apaga peça; Cancelar restaura apoio anterior; falha de imagem mantém cena |
| T13 | Pivô no trilho: ponto, posições prontas, fantasma e contexto inferior | Aplicar ponto de giro → origem T08 ou T29 | Cancelar retorna intacto; canto precisa ser escolhido; em Animar pausa e resolve pose; movimentos preexistentes exigem compensação fiel ou bloqueio explicado |
| T14 | Editar a forma: peça, Face/Linha/Ponto e ferramentas aplicáveis | Selecionar componentes, puxar face, inset e editar | Voltar às peças → T08; conversão de primitiva tem revisão; componente removido não fica selecionado |
| T15 | Cortar/Criar divisão: plano, pontos ou eixo/posição, prévia | Criar divisão em uma ação → T14 | Corrigir ponto, Cancelar; degeneração/UV/skin/limites impedem aplicar e explicam motivo; não remove um lado |
| T16 | Malha avançada e verificação: operações dependentes da seleção e relatório | Prévia, aplicar operação ou correção específica | Voltar → T14; nenhuma correção automática global ao abrir; manter acesso às operações atuais aplicáveis |
| T17 | Articulação, vínculo e pesos: peça/ossos, influência e revisão | Confirmar vínculo ou gesto de peso | Cancelar → T08; reatribuir/remover mostra efeitos; prévia visual nova não é presumida existente |

### Pintar

| ID | Entrada e conteúdo | Ação principal / conclusão | Retorno, vazio e falha |
|---|---|---|---|
| T18 | Pintar sem alvo válido: ferramentas, paleta e árvore; instrução curta | Escolher peça → T19 | Clique de escolha não pinta; múltipla seleção pede alvo; nenhuma peça sugere Modelar |
| T19 | Pintura 3D pronta: alvo explícito, pincel/tamanho/cor; lista direita | Traço, Balde Área/Cor de fundo, Borracha, Pegar cor; clicar outra peça prepara novo alvo | Um gesto/um Desfazer; não pintar no gesto de escolha; fundo preserva desenhos; cursor mostra tinta e tamanho; incompatibilidade explica preparação |
| T20 | Mais cores no painel: cor atual, seletor, favoritas e recentes quando existirem | Escolher tinta e voltar a pintar | Não altera modelo só por selecionar amostra; cor visual preservada ao trocar codificação do alvo; Escape cancela edição não aplicada |
| T21 | Pintar de perto: face identificada, espaço 2D e ferramentas | Pintar face; Voltar ao modelo → T19 | Preserva cor/zoom 3D; troca de face encerra traço; espelho sem suporte fica explicitamente indisponível |
| T22 | Camadas: lista, visibilidade, ordem e alvo ativo | Editar camada e continuar pintura | Voltar → T19; ocultar é reversível; remover/fundir informa alcance; camada travada não recebe tinta |
| T23 | Formas, degradê, carimbo, vestir e girar pintura, conforme famílias | Prévia e aplicar no alvo identificado | Cancelar volta à ferramenta anterior; carregar imagem pode falhar; conversão indexada/RGBA é explícita |
| T24 | Folha de pintura inteira no palco, com peça identificada | Editar superfície, voltar ao modelo | Explicar quando altera mais de uma face; preservar mapeamento; nenhuma conversão ao abrir |
| T25 | UV/Encaixar pintura: ilhas, projeção, cortes e prévia do resultado | Aplicar ajuste de UV | Cancelar → T19 ou T14, conforme origem; nenhuma projeção aplicada só por visitar; imagem e geometria preservadas |
| T26 | Materiais, mapas e imagens: material atual e canais | Ajustar aparência, carregar/substituir imagem | Retorno à origem; conversões/perdas revisadas; erro de arquivo mantém material anterior |
| T27 | Quadros da pintura: quadros, duração, reprodução e imagem | Confirmar quadros/tempos; Voltar → T19 | Distinguir da animação espacial; arquivo ou dimensão inválida não altera sequência existente |

### Animar

| ID | Entrada e conteúdo | Ação principal / conclusão | Retorno, vazio e falha |
|---|---|---|---|
| T28 | Animar sem movimento: trilho, movimentos/peças à direita, alvo Esta peça/Modelo inteiro e timeline vazia | Novo → T29, confirmando conjunto preparado quando necessário; movimento pronto → T31 | Sem peças: indicar Modelar; não exigir nome/eixos ou preset anterior para criar um movimento manual |
| T29 | Movimento manual parado: régua, linhas de peças, cursor e transporte | Próxima pose ou régua; transformar → T30; reproduzir → T32 | Novo movimento começa com 2 s, sem repetição; Próxima pose inicial leva ao final; início não simula chave inexistente |
| T30 | Pose pendente por instante: alterações de uma ou várias peças, Marcar pose com quantidade e Descartar ajuste | Trocar peça no mesmo instante mantém prévia; marcar todas → T29; descartar todas → T29 | Desfazer reverte último gesto; erro conserva rascunho; trocar tempo/clip/atividade resolve a pendência |
| T31 | Preset no painel: Esta peça/Modelo inteiro, Pular/Balançar/Girar e prévia | Preparar conjunto quando necessário; Usar movimento → T29 em uma transação | Cancelar também desfaz preparação do grupo; alvo incompatível mantém alternativa de peça/grupo existente; original não sobrescrito |
| T32 | Reprodução: cursor e tempo em andamento; Pausar evidente | Pausar mantém tempo → T29 | Autoria fica pausada até parar; trocar clip para reprodução; não gravar movimento da câmera |
| T33 | Pose/canal escolhido: copiar, mover, remover e referência temporal | Aplicar operação e manter timeline | Colisão mostra afetados; cancelar preserva dados; múltiplas chaves não viram um valor inventado |
| T34 | Detalhes de animação: curvas, tempos, conjuntos de poses, articulação/IK | Editar recurso permitido na mesma timeline | Retorno → T29; incompatibilidades local/local-delta/TRS são respeitadas; leitura permanece nos demais níveis |

### Arquivos, confiança e outros tipos

| ID | Entrada e conteúdo | Ação principal / conclusão | Retorno, vazio e falha |
|---|---|---|---|
| T35 | Trazer 3D: formato, arquivos associados, preparação, prévia e relatório | Aceitar adaptações e **substituir** conteúdo da criação | Cancelar → origem intacta; arquivos faltantes podem ser adicionados; troca de revisão/formato invalida aceitação |
| T36 | Exportar arquivo/Estúdio: destino, preparação, compatibilidade e revisão | Baixar ou entregar ao host conforme capacidade real | Cancelar → origem; edição invalida resultado; formato/perdas claros; falha permite tentar novamente |
| T37 | PNG/apresentação HTML: captura e prévia do que será baixado | Baixar imagem ou HTML giratório | Cancelar/voltar; interrupção e viewport indisponível explicados; não promete vídeo ou publicação |
| T38 | Saída: somente aparece como decisão quando há pendência real | Resolver pose/salvamento/revisão do host e voltar à origem | Continuar na criação; tentar salvar; cópia de recuperação; descarte explícito se necessário |
| T39 | Estado de salvamento/erro, acessível pelo status | Repetir salvamento, sincronização ou baixar cópia | Não bloquear criação por mero offline localmente seguro; erro persistente continua indicado |
| T40 | Ajuda e guia contextual: uma tarefa ou lista curta de ações | Executar orientação, pular ou fechar | Fecha sem mexer no documento; progresso real do Pensa não é substituído por cliques de tutorial |
| T41 | Textura independente: desenho 2D, cores, ferramentas e prévias | Pintar, conferir repetição, salvar/exportar e sair | Transparência, wrap e deslocar prévia distintos; inválido mantém última versão; retorno à galeria/tarefa |
| T42 | Céu: prévia, presets e ajustes por grupo | Escolher preset, personalizar, salvar e sair | Fallback de visualização; sliders com histórico; fechar preserva salvamento; retorno à galeria/tarefa |
| T43 | Abertura/carregamento/recuperação de documento | Abrir editor apropriado após validação | Versão futura, corrupção, falta de WebGL ou promoção falha oferecem retorno/cópia disponível; nunca regravar arquivo inválido |
| T44 | Revisão com Estúdio/host: diferenças, destino e versão da criação | Atualizar quando permitido; concluir retorno ao host | Conflito mantém versões identificadas; erro permite repetir; não sobrescrever jogo ou arquivo aberto silenciosamente |
| T45 | Recurso avançado em perfil sem autoria | Visualizar, reproduzir e exportar por caminhos permitidos | Resumo explica dado existente; não oferecer botão bloqueado em cada ferramenta; não converter para o básico |

## 3. Fluxos ponta a ponta

Cada fluxo deve ser validado com seu resultado observável, o retorno e a recuperação. A lista cobre percursos principais e exceções de maior risco; os contratos da seção 4 se aplicam a todos.

| ID | Percurso | Resultado que deve ser observado |
|---|---|---|
| F01 | T01 → Criar modelo → T08 | Uma caixa selecionada, Mover ativo, nome válido, primeira ação disponível sem formulário intermediário |
| F02 | T01 → T03 → T08 | Cópia editável de modelo pronto, original inalterado |
| F03 | T01 → T43 → T07/T08/T41/T42 | Tipo correto, documento válido, câmera/seleção coerentes; modelo existente começa em Escolher |
| F04 | T08 → adicionar → Colocar em cima → apontar apoio → clicar → T08 | Peça nova visível; prévia mostra contato; cabeça sobre corpo sem coordenadas; um Desfazer reverte o posicionamento |
| F05 | T08 → duplicar → mover → Desfazer | Cópia distinguível; desfazer movimento não apaga a original; próximo desfazer remove a cópia |
| F06 | T08 → Mover/Girar/Tamanho → T10 → fechar | Palco e painel continuam na mesma ferramenta; valores absolutos correspondem ao resultado |
| F07 | T08 → T09 → agrupar/desagrupar → T08/T09 | Transformação de conjunto previsível; hierarquia e animações preservadas ou operação impedida antes de alterar |
| F08 | T08 → ocultar/travar/isolar → T11 → restaurar | Peça recuperável pela árvore; Enquadrar não altera visibilidade |
| F09 | T08/T19/T29 → T11 → voltar | Câmera recuperada; nenhuma alteração autoral causada por navegação |
| F10 | T08 → T12 → usar/cancelar | Imagem de referência não se confunde com peça do modelo |
| F11 | T08/T29 → T13 → prévia → aplicar/cancelar | Ponto de giro compreensível; posição aparente e movimentos existentes preservados; retorno ao contexto de origem |
| F12 | T08 → T14 → T15 → aplicar → T14 | Divisões criadas conforme plano; ambos os lados permanecem; Desfazer restaura topologia e pintura |
| F13 | T14 → T16 → corrigir/aplicar → T14 | Apenas operação escolhida modifica a malha; relatório não altera sozinho |
| F14 | T08 → T17 → vincular/pintar peso → T29 | Vínculo revisto, influência coerente na reprodução; cancelamento não deixa alteração parcial |
| F15 | T08 → Pintar → T19 → traço → Desfazer | Alvo já escolhido recebe tinta; desfazer remove somente o traço |
| F16 | T07/T09 → Pintar → T18 → escolher → T19 | Clique de escolha não pinta; múltipla seleção não escolhe alvo escondido |
| F17 | T19 → clicar outra peça/lista → preparação do alvo → T19 | Primeiro gesto só escolhe; segundo pinta; pincel e cor visual preservados, sem um modo extra de seleção |
| F18 | T19 → olhar → pintar → T20 → T19 | Um gesto não muda de câmera para tinta; cor confirmada retorna ao alvo correto |
| F19 | T19 → T21 → pintar → Voltar ao modelo | Detalhe pintado, mesma câmera 3D e estado de espelho honesto |
| F20 | T19 → T22/T23/T24/T25/T26 → aplicar/cancelar | Camada, folha, UV ou material só muda pela ação confirmada; retorno à mesma peça |
| F21 | T19 → T27 → importar quadros → reproduzir → voltar | Animação da textura preservada e distinta da posição das peças |
| F22 | T08 → Animar → T28 → T31 → usar → T32 | Movimento pronto no alvo identificado, sem sobrescrever outro movimento |
| F23 | T28 → T29 → Próxima pose → T30 → marcar → T32 | Primeira animação sem digitar tempo; movimento entre base e nova pose; canais não editados preservados; sem volta brusca por repetição padrão |
| F24 | T30 → tentar mudar tempo/clip/atividade | Uma decisão única; Marcar/Descartar retoma a ação pretendida; Continuar permanece; mudar apenas peça no mesmo instante não pergunta |
| F25 | T29 → Marcar sozinho → gesto → Desfazer | Pose registrada ao soltar; um Desfazer restaura os canais daquele gesto |
| F26 | T29 → T33 → copiar/mover/apagar pose → T32 | Tempos e canais afetados explícitos; colisões resolvidas antes de substituição |
| F27 | T29 → T34 → ajustar curva/articulação → recolher | Mesma timeline e reprodução fiel; recolher não converte o movimento |
| F28 | T08 → T35 → arquivos faltantes → completar → prévia → aceitar | Conteúdo substituído somente após revisão atual; um Desfazer recupera a cena anterior |
| F29 | T35/T36/T37 → documento muda/perde sessão → confirmar | Resultado antigo não é adotado/baixado como atual; nova preparação é solicitada |
| F30 | T08/T19/T29 → T36 → revisar → baixar/host | Saída corresponde à revisão aceita, original permanece editável |
| F31 | T08 → T37 → preparar → baixar | Prévia corresponde ao PNG/HTML; falha de download mantém caminho de recuperação |
| F32 | T01 → T05 → restaurar → T43 → editor | Nomes/IDs não conflitam; versão inválida não entra; resultado parcial é informado |
| F33 | T01 → T06 → preparar/baixar | “Completo” somente com inventário completo; parcial é identificado antes de baixar |
| F34 | Editor → sair → T38/T39/T44 → T01/host | Pendências resolvidas e retorno correto; salvar falhou não vira mensagem de sucesso |
| F35 | T01/T08 → T04 → renomear/duplicar/excluir | Identidade e referências tratadas; cancelamento não altera recurso |
| F36 | T02 → T41 → pintar/wrap/prévia → sair/reabrir | Pixels persistidos; deslocar visualização não altera textura |
| F37 | T02 → T42 → preset → slider → Desfazer → sair/reabrir | Gesto do slider reversível; preset e personalização coerentes |
| F38 | T43 → T45 → reproduzir/exportar | Dado avançado intacto mesmo sem controles de autoria |
| F39 | T40 → tarefa → ações → recolher/retomar | Uma orientação de cada vez; guia não atrapalha ferramentas e não conclui criação indevidamente |
| F40 | Qualquer editor → perda de WebGL/rede/armazenamento → recuperação | Último documento válido mantido; motivo e próximo passo claros, sem sucesso falso |
| F41 | T01 → T08 corpo/cabeça empilhados → T19 fundo/olhos → T31 conjunto/Pular → T32 → sair/reabrir | Percurso completo criar–pintar–animar sem coordenadas, material, UV ou agrupamento manual prévio; criação e movimento reaparecem corretamente |
| F42 | T19 → Balde Cor de fundo → aplicar → Pincel → detalhe → fundo novamente | Uma peça nova recebe fundo inteiro; desenho existente não some; outra peça com material compartilhado não muda |
| F43 | T31 → Modelo inteiro → preparar conjunto → prévia → cancelar/usar | O conjunto mantém distâncias e referência comum; cancelar não deixa grupo; usar cria grupo necessário e movimento em uma ação; incompatibilidade não produz resultado parcial |
| F44 | T19 → Pegar cor na base → pintar → trocar alvo indexado/RGBA | Cor composta amostrada; volta ao Pincel, nunca Borracha por camada vazia; tinta não troca para cor padrão ao mudar alvo |
| F45 | T30 → ajustar peça A → escolher B no mesmo instante → ajustar B → Desfazer/Refazer → Marcar | Sem interrupção ao trocar peça; Desfazer afeta só B; Refazer recupera B; marcação conserva ambas numa ação e canais não alterados intactos |

## 4. Máquina de transições e interrupções

### Prioridade e estado pendente

Antes de executar uma intenção que abandona o contexto, resolver o estado de menor escopo para o de maior escopo: gesto em curso, edição de campo/contexto, prévia autoral, operação assíncrona, persistência e revisão do host. Não abrir três diálogos sobrepostos. Uma decisão resolvida não volta a perguntar a mesma coisa.

| Estado atual | Intenção | Regra proposta |
|---|---|---|
| Livre, sem prévia | Trocar peça, atividade ou painel | Executar imediatamente; preservar câmera e estado aplicável |
| Arrasto em curso | Soltar normalmente | Concluir uma ação; em animação manual, produzir prévia de pose |
| Arrasto em curso | Esc, pointercancel ou perda do alvo | Cancelar o gesto atual e restaurar início; não aplicar delta parcial |
| Campo sendo editado | Confirmar / cancelar | Validar e aplicar uma ação / restaurar valor; atalhos ficam no campo |
| Prévia de pose | Mudar peça no mesmo instante e clip | Conservar ajustes por peça/canal; não perguntar; próximo gesto atua apenas na nova seleção |
| Prévia de pose | Mudar tempo, clip, atividade, reproduzir, abrir arquivo/saída ou sair | Marcar pose / Descartar ajuste / Continuar ajustando; executar intenção original só após resolução |
| Prévia de pose | Desfazer/Refazer | Reverter/recuperar último gesto local; enquanto houver rascunho, não consumir o histórico confirmado; Descartar ajuste remove o rascunho inteiro |
| Prévia de pose | Alternar Marcar sozinho | Resolver a prévia primeiro; a alternância não a grava implicitamente |
| Prévia de pose | Erro ao marcar | Manter prévia, alvo e instante; explicar e oferecer repetir/descartar |
| Movimento manual | Próxima pose | Primeiro acesso vai de 0 s ao final em 2 s; depois navega à pose existente ou prepara um próximo instante; ampliação de duração só persiste com a pose confirmada |
| Modelo inteiro preparado | Novo movimento, Usar movimento ou Cancelar | Confirmar grupo necessário junto do movimento vazio ou preset / restaurar cena sem grupo residual; validar todos os participantes e vínculos |
| Prévia de corte, pivô, preset, UV ou vínculo | Abandonar contexto | Aplicar / Descartar prévia / Continuar; usar o verbo específico, sem confirmar uma geometria inválida |
| Reprodução | Transformar objeto | Pausar primeiro; ação de autoria explícita, sem gravar valores enquanto o relógio avança |
| Reprodução | Trocar clip/atividade | Parar a reprodução e trocar; entrando em Modelar/Pintar, voltar à forma de edição base |
| Preparação assíncrona | Cancelar, trocar documento, conta ou host | Invalidar requisição e não adotar retorno tardio; arquivo original e cena permanecem |
| Import/export pronto | Conteúdo ou opções alterados | Invalidar resultado e aceite; pedir nova preparação |
| Salvamento local pendente | Sair | Aguardar conclusão com estado visível; se falhar, permanecer e oferecer recuperação |
| Local salvo, sincronização pendente | Sair | Aplicar política real do host; não dizer salvo na conta antes de confirmar |
| Revisão do Estúdio pendente | Sair | Mostrar T44; concluir atualização/decisão válida antes de abandonar o host |
| Documento mudou enquanto uma decisão estava aberta | Confirmar decisão antiga | Revalidar origem; se incompatível, manter contexto e pedir revisão atualizada |

**Esc tem um destino único por vez:** fecha o menu/diálogo não autoral de topo; sai de Olhar; cancela arrasto; resolve a prévia autoral; só então volta do contexto especial. Cancelar um arrasto de pose não remove os ajustes anteriores de outras peças. Não apaga a seleção ou a pose ao mesmo tempo que fecha um seletor de cor. A ordem específica considera o elemento que tem foco; nunca dispara vários cancelamentos com um único evento.

**Trocar de atividade:** guardar preferências de cada atividade e restaurar somente as ainda válidas. O movimento/tempo pode ser lembrado para retorno a Animar, mas o modelo base é o alvo de edição em Modelar/Pintar. Um aviso curto “Editando a forma inicial” explica essa mudança visual; não transportar a pose avaliada como alteração permanente da geometria.

**Recarga/fechamento da aba:** salvar continuamente o documento confirmado. A prévia de pose ainda não marcada não recebe selo Salvo. Para proteger essa prévia no fechamento não interceptável, a entrega precisa de um rascunho local separado, identificado por documento e revisão, com oferta “Recuperar ajuste de pose” ao reabrir; nunca marcar automaticamente no documento. Se essa recuperação não estiver implementada, declarar a limitação e usar o aviso de navegação suportado pelo navegador, sem prometer proteção total. O protótipo deve testar essa diferença antes de liberação ampla.

### Estados de persistência e recuperação

| Estado | Informação visível | Próximo passo |
|---|---|---|
| Alteração confirmada aguardando escrita | Salvando neste computador | Aguardar; saída faz flush |
| Escrita local concluída, conta não confirmada | Salvo neste computador; sincronização pendente quando aplicável | Continuar; status abre detalhes |
| Nuvem confirmou mesma revisão | Salvo na conta | Sair sem confirmação adicional, salvo revisão do host |
| Offline com cópia local válida | Salvo neste computador · Sem internet | Continuar e sincronizar quando possível |
| Armazenamento falhou/cheio | Não foi possível salvar esta alteração | Repetir, baixar cópia atual, permanecer; nenhuma marca verde de sucesso |
| Versão externa conflita | Há outra versão desta criação | Preservar ambas/cópia local e revisar; não sobrescrever a aberta |
| Conta ou host mudou | Sessão mudou; operação interrompida | Invalidar operações e reabrir no contexto correto, preservando o recuperável |
| Arquivo não suportado/corrompido | Não foi possível abrir este projeto | Voltar, escolher outro, manter original; não regravar |

## 5. Destino de todas as famílias atuais

As faixas abaixo reproduzem o contrato atual. Recolher uma opção não muda seu acesso. Os fluxos são os destinos propostos, não afirmações de implementação concluída.

| Família | Faixa | Destino na proposta |
|---|---|---|
| `model.pieces` | basic | T07–T09: formas, transformações, empilhar, duplicação, organização; preparação de conjunto em T28/T31 |
| `model.finish` | basic | T08: Cor e acabamento; T19: mesmo comando de Cor de fundo, sem alterar outras peças |
| `model.mirror` | basic | T08/T09: Espelhar no meio, em ações da seleção, com eixo visível |
| `model.reference` | basic | T12: Imagem de apoio |
| `paint.brush` | basic | T19–T21; opções básicas de T23: ferramentas, espelho, vestir, girar pintura |
| `animate.create` | basic | T28–T33: criar, Próxima pose, rascunho por instante, presets, reproduzir e reutilizar pose; conjunto exige também model.pieces |
| `files.export` | basic | T36/T37: saídas compatíveis, PNG e apresentação |
| `model.precise` | intermediate | T10/T13: medidas e pivô |
| `model.mirror-axis` | intermediate | T10: referência/eixo de espelho, mesma ação da seleção |
| `model.locator` | intermediate | T08/T17: Apoio no grupo Adicionar; ajuste no contexto de articulação |
| `model.area-select` | intermediate | T09/T14: Área e Laço sob Escolher, no trilho |
| `model.mesh` | intermediate | T14: componentes, conversão, extrusão e inset |
| `paint.layers` | intermediate | T22: camadas |
| `paint.shapes` | intermediate | T23: formas, degradê e carimbo |
| `paint.sheet` | intermediate | T24: folha de pintura inteira |
| `paint.flipbook` | intermediate | T27: quadros da pintura |
| `model.mesh-pro` | professional | T15/T16: corte e operações avançadas aplicáveis |
| `model.skin` | professional | T17: ossos, vínculos e pesos |
| `paint.maps` | professional | T26: mapas de aparência |
| `paint.material` | professional | T26: materiais avançados |
| `paint.uv` | professional | T25: UV, com acesso também pelo contexto de malha |
| `animate.pro` | professional | T34: curvas, conjuntos de poses e articulação/IK |
| `files.interop` | professional | T35/T36: importação externa e exportação adicional |

Salvar, sair, desfazer/refazer, backup, seleção e navegação possuem comandos independentes dessas famílias. A permissão de `model.precise` refere-se à modelagem; não deve bloquear os parâmetros de tempo e poses já permitidos por `animate.create`.

Suave/Reto/De uma vez, vistos no print de animação, são edição de interpolação e pertencem hoje a `animate.pro`. O básico mostra/reproduz a interpolação existente e cria chaves conforme a política atual; não ganha esse seletor silenciosamente. Copiar/usar uma pose pode ser básico; operações sobre conjuntos e intervalos respeitam seus gates existentes.

## 6. Destino dos 45 comandos registrados

O identificador abaixo é do código. Rótulos para a criança seguem os prints e a proposta. Funções não registradas, como presets, camadas e vínculos, estão nas telas e famílias anteriores.

| IDs atuais | Destino / regra |
|---|---|
| `app.exit` | Cabeçalho → T38 quando necessário; retorno direto quando seguro |
| `app.undo`, `app.redo` | Cabeçalho persistente; contratos de prévia e histórico da seção 4 |
| `app.export`, `app.save`, `app.backup` | Salvar e exportar; salvar explicitamente continua acessível; backup de projeto preservado |
| `app.import` | Trazer 3D → T35, conforme acesso |
| `add.box`, `add.wedge`, `add.cylinder`, `add.sphere` | Trilho, Adicionar: Caixa/Rampa/Cilindro/Bola → T08 |
| `add.locator` | Mesmo grupo, Apoio, conforme acesso |
| `tool.select`, `tool.move`, `tool.rotate`, `tool.scale` | Trilho fixo, única ferramenta ativa; Modelar e Animar conforme contexto |
| `tool.box`, `tool.lasso`, `select.additive` | Opções de Escolher; seleção múltipla também por ação explícita na lista |
| `node.duplicate`, `node.remove` | Cabeçalho do cartão da peça e menu contextual da árvore; não operam a estrutura em Animar |
| `node.group`, `node.ungroup` | Ações da seleção → T09; agrupamento também serve à preparação explícita de T28/T31; preservar transformações e dependências |
| `node.convert-mesh`, `mode.mesh` | Editar a forma → T14, conversão distinta de entrar na edição |
| `view.isolate`, `view.frame`, `view.grid`, `view.supports` | Controles de vista → T11; isolar tem saída visível |
| `view.reference` | Imagem de apoio → T12 |
| `mesh.extrude`, `mesh.inset` | Trilho contextual em T14, seleção aplicável |
| `mesh.plane-cut` | Cortar → T15, significado de Criar divisão |
| `mesh.uv` | Encaixar pintura → T25; retorno à origem |
| `paint.pencil`, `paint.eraser`, `paint.fill`, `paint.picker` | Trilho de Pintar → T19 |
| `paint.rotate`, `paint.dress` | Mais jeitos de pintar → T23 |
| `paint.closeup` | Pintar de perto → T21, acesso visível |
| `paint.mirror` | Espelhar sob as ferramentas de Pintar → T19 |
| `paint.width-1`, `paint.width-2`, `paint.width-3` | Três tamanhos sob as ferramentas de Pintar → T19 |

## 7. Cobertura de revisão e aceite

### Subfluxos avançados que não podem sumir em “Mais opções”

Estes destinos complementam o registro de 45 comandos. São controles encontrados em painéis especializados; respeitam as condições de seleção, acesso e compatibilidade existentes.

| Contexto | Operações a preservar | Contrato de fluxo |
|---|---|---|
| T08/T10 | Detalhe de cilindros/esferas; propriedades de caminhos; espelho e referência do espelho; mover para grupo/raiz | Resumo no cartão, expansão por intenção; atualização mantém identidade e dependências; reparenting não altera pose visual silenciosamente |
| T14 | Transformar componentes; remover pontos/linhas/faces; extrusão e inset | Mostrar seleção e quantidade; efeitos da remoção explícitos; prévia aplicável e um Desfazer |
| T16, pontos | Movimento suave e alcance; soldar; ligar pontos por corte ou linha | Alcance visível; requisitos de quantidade; impacto da solda revisto; ponto inválido não produz malha parcial |
| T16, linhas | Dividir arestas; corte em anel; dissolver; bevel | Distinguir dividir, dissolver e remover; prévia ou efeito previsível; validação de topologia antes de adotar |
| T16, faces/caminhos | Espessura, subdivisão, criação de caminho e inspeção de malha | Preservar parâmetros e relatórios; não misturar caminho com peça sólida; erro mantém resultado anterior |
| T17 | Vincular, refazer vínculo, remover vínculo, adicionar/remover osso; pintar e editar pesos | Escolher alvos; preparar resumo; revisar efeitos; confirmar uma transação; cancelamento invalida preparo |
| T22/T23 | Seleção de área de pintura; mover/copiar conteúdo; camadas; formas preenchidas/contorno; degradê e carimbo | Área e camada explícitas; limites e transparência previsíveis; preparação RGBA revisada |
| T25 | Selecionar face/ilha/canto; mover/girar/escalar/inverter UV; projetar, cortar e reorganizar ilhas | Mostrar consequência na pintura; reorganização preparada antes de aplicar; Cancelar não deixa costuras ou projeção parcial |
| T26 | Nome e cor base do material; rugosidade/metal; duas faces; opacidade/máscara; mapas e imagens | Mostrar alcance compartilhado do material; alterar só esta peça exige material próprio ou confirmação do alcance |
| T27 | Adicionar/remover/reordenar quadros; dimensões e tempos; prévia | Duração positiva; alteração de imagem revisada; parar prévia antes de editar e preservar sequência ao cancelar |
| T33 | Capturar, colar e espelhar pose local; escolher eixo; mover/copiar/apagar chaves | Compatibilidade de espaço; documento e alvo atuais; canais e colisões explícitos |
| T34 | Mapear conjunto de poses para peças; espelho por alvo; intervalos; retemporizar/inverter; curva e dobrar pela ponta | Correspondências completas antes de aplicar; não duplicar destino indevidamente; movimento avaliado fiel após recolher painel |
| T35 | Opções distintas GLB/glTF, OBJ/MTL e bbmodel; movimentos, pintura e adaptações | Qualquer opção alterada pede prévia e aceitação novas; relatório resumido com detalhe completo acessível |
| T36/T44 | Compatibilidade de material/mesh/animação por destino; atualização do Estúdio | Resultado aceito pertence à versão atual; avisos preservados e origem editável |

### Matriz de aceite

| Preocupação | Telas/fluxos representativos | Evidência necessária na implementação |
|---|---|---|
| Semelhança com Modelar | T07–T10, F01/F04/F06 | Capturas comparativas, árvore e trilho nos lugares previstos |
| Filosofia de Pintar | T18–T27, F15–F21 | Mesmo alvo entre palco/lista; cor e câmera sem conflito |
| Filosofia de Animar | T28–T34, F22–F27 | Timeline única, regiões estáveis e nenhuma pose perdida |
| Pivô e corte dos prints | T13/T15, F11/F12 | Prévia corresponde à transformação real; resultado e cancelamento verificados |
| Demais tipos e estados | T01–T06, T35–T45, F28–F40 | Entrada, retorno, vazio, espera e recuperação para cada contexto |
| Acesso e integridade | T10/T14/T17/T25/T34/T45, F38 | Mesmos documentos abertos em cada perfil; dados avançados intactos |
| Hardware e área disponível | T08/T19/T29 e contexto mais denso | Mouse/touchpad, 1024 × 600 e 1366 × 768 no host, zoom e rolagem |
| Segurança percebida | T30/T38/T39/T43/T44 | Persistência verdadeira, conflito e saída sem sucesso falso |
| Percurso infantil completo | F41–F45 | Montagem, fundo/detalhes, conjunto animado, cor coerente e várias peças na mesma pose; observar compreensão sem indicar botões |

Para cada fluxo implementado, registrar versão, viewport, perfil, documento de teste, passos, resultado e evidência. Uma linha coberta neste catálogo significa **destino e comportamento definidos na proposta**, não teste aprovado.
