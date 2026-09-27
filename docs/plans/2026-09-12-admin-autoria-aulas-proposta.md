# Proposta: facilitar a autoria de aulas e seções no admin

Status: proposta para revisão do professor. Data: 12/09/2026.

Recomendação: organizar a autoria em um percurso de seções recolhíveis, com resumos úteis e um editor contextual para o item selecionado. Priorizar a criação do zero, unificar a edição de vídeo com capa e tornar os critérios de avanço legíveis antes de abrir suas regras detalhadas. Modelos e duplicação ficam como atalhos opcionais.

Preferência confirmada pelo professor: as aulas são criadas principalmente do zero. O fluxo principal deve facilitar a montagem gradual de cada seção, sem depender de encontrar um modelo ou uma aula parecida.

## 1. Diagnóstico do estado atual

A análise considera o código atual, incluindo a distinção entre demonstração e experimentação e as verificações por encaixe acrescentadas após a v5. Base Git: `5ef348f8`, com ajustes locais presentes durante a leitura. Os manifestos atuais do Corre Dino têm de 8 a 12 seções por aula. A aula 3 tem 9 seções; a aula 7 tem 27 objetivos estruturais distribuídos pelo percurso. Esses números são dos arquivos de autoria, não uma consulta às aulas publicadas.

| Achado | Consequência para o professor |
| --- | --- |
| Todas as seções renderizam o conteúdo e o formulário de conclusão abertos. Só algumas configurações ficam recolhidas. | É difícil distinguir a seção em edição das que já estão configuradas. |
| O formulário de conclusão vem antes da lista de conteúdos e a ferramenta vem depois. | É preciso pensar na regra antes de enxergar claramente a atividade e o projeto a que ela se refere. |
| Cada bloco repete setas, edição, exclusão e seletor de destino. | Ações de organização competem visualmente com o conteúdo. |
| O atalho de vídeo dentro da seção oferece produção e upload; a capa aparece apenas no editor completo. | O mesmo bloco parece ter recursos diferentes dependendo de onde foi aberto. |
| A capa do Vimeo é enviada, mas o componente não mostra a imagem atual nem a imagem escolhida. | A mensagem de sucesso não permite conferir visualmente o resultado. |
| O contrato conserva `posterUrl` para vídeos legados, mas o formulário de vídeo não o carrega nem o devolve ao salvar. | Há um risco concreto de perder uma capa legada ao editar outro dado do vídeo. |
| “Tipo da próxima seção” preenche intenção/título e, em criação, uma ferramenta existente. O conteúdo e a conclusão continuam vazios. | A escolha parece um modelo pronto, mas deixa a maior parte do trabalho manual. |
| Nomes como “Modelo”, “Motor da experiência”, tipos internos de ações e JSON convivem com escolhas pedagógicas. | Decisões técnicas aparecem cedo demais na preparação da aula. |
| Já existem autosave, recuperação de conflito, importação e duas modalidades de prévia. | Há uma base boa a preservar e tornar mais fácil de localizar. |

A instância local do admin na porta 3005 não estava disponível. Esta avaliação combina leitura do código, dos manifestos e de referências de interface; não representa um teste de usabilidade observado no admin autenticado.

## 2. Referências e decisão de desenho

A divulgação progressiva de opções permite apresentar as escolhas frequentes primeiro e deixar as especializadas acessíveis em outro nível. A separação precisa seguir tarefas reais; opções essenciais não devem desaparecer. Esse é o princípio aproveitado da [análise da Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/).

O [GOV.UK Design System](https://design-system.service.gov.uk/components/accordion/) considera seções recolhíveis úteis para consultar e comparar grupos relacionados, mas alerta contra esconder informação obrigatória e empilhar accordions. Por isso, a proposta recolhe resumos de seções e abre os formulários extensos em uma área própria. Pendências e condição de avanço continuam visíveis no resumo.

Como referências de autoria, o [Rise 360](https://www.articulatesupport.com/article/Rise-Creating-Sharing-and-Reusing-Block-Templates) documenta o reaproveitamento de grupos de blocos; o [editor do Thinkific](https://support.thinkific.com/hc/en-us/articles/37783573725463-How-to-Add-Content-and-Configure-Your-Course-in-the-New-Course-Builder) combina conteúdos e permite reorganizá-los. Aproveitamos os padrões de composição e reaproveitamento. Não importamos os limites, as regras de progresso ou as restrições desses produtos.

| Alternativa | Ganho | Limite | Decisão |
| --- | --- | --- | --- |
| Seções recolhíveis + edição contextual + modelos editáveis | Mantém o percurso compreensível e dá espaço à tarefa atual. | Exige organizar o estado dos editores e uploads. | Recomendada. |
| Apenas recolher os formulários atuais | Reduz rapidamente a altura inicial. | Mantém a duplicidade do vídeo e a complexidade dentro de cada seção. | Pode ser uma parte inicial, não a solução completa. |
| Assistente com várias telas obrigatórias | Orienta bem um primeiro cadastro simples. | Cria idas e voltas para revisar conteúdo, ferramenta e critérios relacionados. | Não adotar como fluxo principal. |

O professor prepara uma experiência didática, alterna ideias e volta a trechos anteriores. A interface deve ter a calma de um roteiro organizado e permitir trabalhar diretamente na seção escolhida.

Vocabulário principal: aula, seção, conteúdo, demonstração, exploração, criação, projeto, entrega e avanço. A assinatura da tela será o resumo que reúne **o que o aluno vê, qual projeto continua e o que precisa cumprir**. A ordem desses elementos reflete o trabalho de preparação da aula.

A expressão visual conserva o sistema do admin: ciano de ação, superfícies claras ou escuras do tema, texto grafite, verde de confirmação e âmbar de pendência. Ícones Lucide já existentes identificam tipos, sempre acompanhados de nomes. Bordas discretas e espaço entre grupos dão hierarquia; o admin continua uma ferramenta de trabalho do professor.

## 3. Distribuição da tela

O cabeçalho reúne curso/aula, situação do rascunho, Prévia e Revisar para publicar. Logo abaixo ficam três destinos: **Seções**, **Materiais e anexos** e **Dados da aula**. São áreas de trabalho, sem ordem obrigatória. Importação permanece acessível em “Importar roteiro”; conflitos e falhas de salvamento continuam em destaque, fora das áreas recolhíveis.

Na área Seções, cada cabeçalho mostra:

- Número e título, com renomeação direta.
- Ícones e nomes dos conteúdos: por exemplo, Vídeo · Zappy · Estúdio.
- Uma frase de avanço: “Conferir 2 objetivos no Projeto Dino”.
- Pendência específica, se houver: “Vídeo aguardando envio” ou “Falta definir o avanço”.
- Acesso às ações da seção: mover, duplicar e remover.

“Rascunho salvo” significa sincronização. “Sem pendências detectadas” significa configuração verificada. Nenhum dos dois significa que a criança concluiu a seção ou que a qualidade didática está aprovada.

Com a seção aberta, a ordem será:

| Região | Conteúdo |
| --- | --- |
| Conteúdos da seção | Lista compacta, em ordem, com ícone, nome/resumo, miniatura quando útil e Editar. Adicionar conteúdo aparece nessa lista. |
| Onde a criança cria | Resumo do projeto/ferramenta associado e opção Alterar. Pode indicar ausência de ferramenta, mesmo projeto da aula ou ferramenta externa. |
| Para avançar | Frase com os requisitos efetivos e botão Configurar/Editar. Formulário completo aparece ao editar. |
| Orientações do professor | Objetivo didático, intenção e notas de produção, acessíveis sem ocupar permanentemente a área principal. |

Regras de abertura:

- Uma aula existente retoma a seção que o professor estava editando; as demais começam recolhidas quando não há preferência salva.
- Uma seção recém-criada já abre. Abrir outra não fecha uma que o professor deixou aberta para comparação.
- “Recolher todas” e “Abrir todas” ficam disponíveis.
- Recolher não altera conteúdos, critérios, publicação ou progresso.
- A preferência de abertura pertence ao professor e à aula, não ao rascunho pedagógico compartilhado.
- Uma pendência clicada abre a seção e o editor necessários, colocando o foco no campo pertinente.

## 4. Um editor contextual, com espaço para cada tarefa

Editar um vídeo, um objetivo ou uma exploração abre a mesma área de edição, identificada por “Aula → Seção → Conteúdo”. O professor não precisa descobrir caminhos diferentes para obter todos os recursos do bloco.

Em telas largas, o percurso compacto pode continuar ao lado. Em notebooks, a edição ocupa a área útil, com “Voltar ao percurso” preservando seção, rolagem e alterações. Estúdio, Pinta e formulários grandes de quiz devem poder ocupar a largura necessária. Não haverá três colunas estreitas competindo com o menu global do admin.

Conteúdo principal aparece primeiro. Recursos especializados recebem nomes que indicam o que contêm: “Ferramentas liberadas”, “Conexões e parâmetros”, “Roteiro da demonstração”, “Compatibilidade”. Se houver uma configuração própria, o resumo a indica — por exemplo, “8 blocos liberados” ou “3 conexões exigidas”. Ela continua acessível ao editar.

As linhas dos blocos priorizam identificação e edição. Mover para outra seção, duplicar e remover ficam em um menu de ações identificado. Ordenação por arraste tem alternativa por teclado e botões. Um bloco usado como ferramenta em várias seções mostra essa relação antes de ser movido, duplicado ou removido.

## 5. Vídeo com capa em todos os caminhos

O editor unificado deve reunir, nesta ordem:

1. Vídeo atual, envio/substituição e estado do processamento.
2. **Capa do vídeo**, com imagem atual, prévia da escolha e ações de enviar/trocar.
3. Legendas/transcrição e duração detectada.
4. Orientação de produção e detalhes técnicos quando necessários.

A área de capa aparece desde a criação. Se ainda depender do envio do vídeo ao Vimeo, explica essa dependência no próprio local. Depois do processamento, mostra a capa atual e permite trocá-la. Uma capa automática válida não exige um upload personalizado para publicar.

É preciso distinguir “imagem escolhida”, “enviando”, “capa aplicada” e falha. A imagem anterior permanece até a nova estar disponível. Reabrir a aula deve recuperar o estado real, em vez de apenas lembrar que um upload ocorreu nesta sessão.

A primeira entrega conserva o caminho atual de capa do Vimeo e o torna visível em toda edição do vídeo. O retorno à capa automática entra junto da leitura/seleção das capas do provedor, com confirmação do resultado real. Como essa capa pertence ao vídeo no Vimeo, seu efeito não deve ser apresentado como uma alteração ainda isolada no rascunho da aula: vídeos reutilizados compartilham a alteração. O texto da ação deve deixar esse alcance claro.

Para os vídeos legados, preservar `posterUrl`, provider, URL e demais campos ao abrir, editar, salvar, mover ou duplicar. O editor deve oferecer a capa pelo mecanismo suportado pelo player correspondente; manter a reprodução existente é obrigatório. A promessa de uma capa específica da aula para qualquer iframe exigiria também mudança no player, portanto não será simulada apenas preenchendo um campo que ele ignora.

Essa parte precisa de ajuste funcional, além da reorganização visual: o caminho rápido deve usar o mesmo editor de vídeo; a capa precisa de prévia e leitura; e a transformação dos dados do formulário deve preservar os campos legados.

## 6. Criação do zero com orientação e atalhos opcionais

**Adicionar seção** cria e abre uma seção em branco imediatamente, com título editável e a ação **Adicionar conteúdo** em destaque. Não exige escolher um modelo nem preencher critérios antes de começar. O professor pode salvar o rascunho incompleto e continuar depois; as pendências ficam identificadas no resumo.

A montagem recebe orientação no próprio lugar: dar um nome à seção, acrescentar os conteúdos, associar uma ferramenta de criação quando necessário e definir o avanço. Essa orientação não é um assistente com telas obrigatórias: o professor pode editar qualquer parte e reorganizar as seções livremente. A intenção didática pode ser preenchida nas orientações da seção, sem bloquear o primeiro conteúdo.

**Adicionar conteúdo** abre um catálogo com ícone, nome e uma frase sobre cada recurso. Todos os tipos permanecem acessíveis, com busca para localizar rapidamente um recurso. Na comunidade Kids, vídeo e fala do Zappy ganham destaque; Texto continua disponível e recebe destaque também na comunidade adulta.

Depois de montar o conteúdo, **Para avançar** apresenta uma sugestão compatível, explica o que será verificado e permite confirmar ou configurar outra opção válida. Enquanto não houver uma regra definida, o resumo informa “Falta definir o avanço”. A interface orienta a configuração sem decidir silenciosamente como o aluno concluirá a seção.

**Começar com uma estrutura** fica como atalho opcional junto de Adicionar seção. Ao escolhê-lo, o modelo insere blocos iniciais, relações e uma sugestão explícita de avanço; não apenas o título. O conteúdo pendente continua marcado como incompleto. As estruturas disponíveis são:

| Ponto de partida | Preparação inicial | Avanço sugerido |
| --- | --- | --- |
| Assistir a um vídeo | Um vídeo planejado. | Assistir a 90%, somente na seção de vídeo isolado. |
| Explorar um conceito | Missão escolhida e instrução editável; vídeo curto pode ser acrescentado. | Descobertas daquela missão. |
| Acompanhar uma demonstração | Cena em modo demonstração, roteiro e falas editáveis. | Acompanhar o roteiro conforme o critério do modo. |
| Criar no Estúdio/Pinta | Orientação e escolha explícita entre projeto novo, projeto existente ou ferramenta externa. | O objetivo aplicável; não inferir uma entrega nem um avaliador inexistente para a ferramenta. |
| Entregar uma criação | Escolha entre o trabalho da aula e seleção na galeria da ferramenta. | Confirmação do envio, com os limites existentes. |
| Material do curso | Livro/PDF e apresentação opcional por vídeo/Zappy. | Abrir o livro ou baixar o PDF. |
| Quiz | Editor de perguntas e configuração de nota. | Aprovação no quiz configurado. |
| Ação da plataforma | Instrução e ação a verificar. | Evidência salva da ação, com as regras atuais. |

Cada bloco continua adicionável, removível e configurável. Texto permanece disponível, especialmente para adultos. Demonstração e experimentação continuam escolhas independentes. Nenhum modelo obriga uma sequência de aula ou a inclusão de um quiz após cada exploração.

Ao adicionar conteúdo a uma seção já configurada, o sistema não muda silenciosamente sua conclusão. Quando a mudança invalidar a regra — por exemplo, inserir Estúdio em uma seção que exigia apenas 90% do vídeo — mostra a incompatibilidade e conduz ao ajuste.

O modelo de criação mostra o nome do projeto sugerido e de onde ele vem. Não escolhe silenciosamente o primeiro Estúdio da aula quando há mais de um projeto possível.

## 7. Critérios em linguagem do professor

O resumo principal descreve o resultado: “Explorar as diferenças entre os saltos”, “Abrir o caderno ou baixar o PDF”, “Enviar um projeto da galeria” ou “Conferir estes dois objetivos no Estúdio”.

Ao editar, aparecem somente as possibilidades compatíveis com aquela seção, mantendo opções indisponíveis explicadas quando isso ajudar a resolver uma pendência. Requisitos múltiplos mantêm a regra atual de cumprir todos. A ação de plataforma continua exclusiva, conforme o contrato existente; a interface não sugere combinações que a publicação recusará.

Objetivos do Estúdio aparecem como itens com nome, resumo da regra e Editar. O detalhe conserva área, tipo de bloco, valores, quantidade, ordem, encaixes, estruturas conectadas, variáveis, funções e simulação com projeto salvo. O professor visualiza “Conferir o comando de pulo dentro do evento” antes de abrir todos os parâmetros. Essa é conferência estrutural; não deve ser renomeada como prova de execução do jogo.

Na demonstração, escolher a cena vem antes de editar seu roteiro. Falas, pausas, destaques e ações podem ser ajustados em uma lista de etapas; um editor visual de ações válidas reduz a necessidade de JSON no cotidiano. O modo técnico e a importação permanecem disponíveis, com as mesmas validações e limites.

## 8. Reaproveitamento e revisão

Incluir duplicação de seção e de blocos na aula como ação secundária no menu do item. A cópia recebe identidades próprias para conteúdo e critérios. Projeto compartilhado exige uma escolha compreensível: continuar o mesmo ou criar outro independente. Copiar uma seção nunca copia progresso nem duplica uma entrega já realizada.

Uma biblioteca de modelos próprios entre aulas pode vir em uma segunda etapa, depois de validar a criação do zero, a duplicação local e a configuração de vínculos. Como o professor cria principalmente do zero, o reaproveitamento não ocupa a tela inicial nem se torna requisito para um cadastro simples.

“Revisar para publicar” reúne pendências por seção, com atalhos para os campos. Separa bloqueios reais de sugestões didáticas. A ausência de capa personalizada não é erro se a capa atual é válida. Os comandos atuais de publicação e despublicação permanecem.

Prévia livre, ensaio do percurso e abertura da aula publicada ficam agrupados, com seus nomes e diferenças. Voltar da prévia retoma o mesmo ponto da edição.

## 9. Matriz de preservação de recursos

| Recursos atuais | Local proposto |
| --- | --- |
| Título, slug, duração, audiência/contexto e publicação | Cabeçalho e Dados da aula. |
| Seções, intenção, objetivo, ordem e conteúdo de apoio | Percurso, orientações da seção e Materiais e anexos. |
| Texto rico, imagens no texto, HTML, redimensionamento e alinhamento | Editor do bloco Texto, com ferramentas atuais. |
| Fala do Zappy e poses | Editor da fala, com prévia. |
| Vídeo Vimeo, upload resumível, capa, processamento, duração e legendas | Um editor de Vídeo completo. Compatibilidade com vídeos legados preservada. |
| Imagem, texto alternativo, legenda e áudio | Editores próprios identificados pelo tipo. |
| Livro 3D/PDF, título, referência para o Zappy e anexo de download | Editor do material, mostrando a ligação com o anexo. Substituição de PDF preserva a atualização do anexo existente. |
| Todas as atividades interativas, demonstração/experimentação, missões, pistas, narração, parâmetros e versões anteriores | Catálogo de atividades, editor contextual e compatibilidade identificada. |
| Roteiro de demonstração, falas, destaques, ações, ordem e restauração | Editor do roteiro; JSON continua disponível. |
| Estúdio, projeto inicial, tipos/modos, níveis, categorias/blocos liberados, atividade, cadeia e Mural | Editor amplo do Estúdio, com grupos específicos e resumos das configurações próprias. |
| Pinta, desenho inicial, tamanho, tipo, ferramentas e cadeia | Editor amplo do Pinta. |
| Galeria de entrega, ferramenta, mínimos/máximos e confirmação | Configuração de entrega, sem confundir selecionar com enviar. |
| Quiz rico, alternativas, resposta esperada, feedback e regras de aprovação | Editor do quiz e resumo de avanço. |
| Critérios por atividade, objetivos estruturais detalhados, simulação e ações de perfil | Editor de avanço da seção. |
| HTML livre, certificado e suas configurações, Em breve | Catálogo completo de conteúdos, com editor próprio. |
| Anexos, materiais opcionais e importação de manifesto | Materiais e anexos; Importar roteiro com sua conferência atual. |
| Autosave, recuperação local, conflito, validação, prévias e publicação | Serviços atuais, com apresentação consolidada. |

Ao implementar, essa matriz deve virar um inventário de campos e operações com conferência de leitura → edição → gravação. Esconder uma configuração não autoriza removê-la do dado salvo.

## 10. Cuidados técnicos necessários

- A sessão de rascunho existente continua sendo a fonte dos dados. Seção aberta, editor ativo e posição de rolagem são estado de apresentação.
- Editores pesados abrem sob demanda. Antes de trocar de contexto, seu trabalho precisa estar capturado no rascunho. Recolher a seção não pode reiniciar o Estúdio/Pinta nem apagar conteúdo ainda não sincronizado.
- O upload atual de vídeo é abortado ao desmontar seu componente. Portanto, recolher a seção não pode simplesmente desmontá-lo durante o envio. A operação deve pertencer à sessão de edição da aula, independente da visibilidade do formulário, com progresso resumido no cabeçalho.
- Ações por tipo devem usar a mesma edição e validação em todos os pontos de entrada. Evitar outro caminho simplificado que volte a omitir a capa.
- Movimentação, duplicação e remoção precisam tratar juntas as referências de blocos, ferramenta, critérios e mídia planejada. Relações que não possam ser preservadas aparecem como pendências explícitas.
- A reorganização visual não reescreve automaticamente aulas existentes nem altera critérios publicados. A evolução da apresentação deve aceitar os documentos atuais.
- Recolher e expandir deve funcionar com teclado e leitor de tela, com foco preservado e estado acessível. A implementação seguirá o [padrão de accordion da W3C](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), sem colocar botões de edição dentro do botão de expansão.

## 11. Entrega proposta e critérios de aceite

Primeira entrega: criação do zero com orientação contextual e catálogo de conteúdos; seções recolhíveis e resumos; editor contextual; vídeo completo com capa; sugestões de avanço e regras detalhadas preservadas; revisão de pendências e continuidade de salvamento/uploads. Estruturas iniciais editáveis e duplicação local entram como atalhos secundários. Biblioteca de modelos próprios entre aulas é a evolução seguinte.

Antes de liberar, conferir estes percursos no admin:

1. Criar uma aula e sua primeira seção do zero, sem modelo ou cópia; salvar o rascunho incompleto, retomar, acrescentar conteúdos e definir o avanço. Em uma aula com 12 seções, localizar uma pendência, corrigi-la e voltar ao ponto anterior.
2. Recolher/abrir seções sem modificar o documento nem perder edições.
3. Enviar vídeo, recolher sua seção, continuar editando outra e ver o upload concluir no bloco certo.
4. Definir/trocar capa, conferir a imagem e reabrir a aula; editar um vídeo legado sem perder `posterUrl` ou provider.
5. Montar exploração → criação → outra exploração → continuação do mesmo projeto, com critérios independentes.
6. Montar vídeo isolado, material com PDF, demonstração, galeria e ação de avatar com seus avanços próprios.
7. Editar os critérios de encaixe e contagem de uma aula densa, preservando todos os parâmetros.
8. Duplicar seção sem misturar IDs, projeto independente, projetos compartilhados ou progresso.
9. Trocar PDF mantendo o anexo correto; conferir Texto, Zappy, imagem, áudio, quiz, HTML, certificado e Em breve.
10. Simular falha de salvamento, recarregar, resolver conflito e alternar prévia/edição sem apagar trabalho.
11. Operar os fluxos por teclado e conferir a largura útil do admin em 1280, 1366 e 768 px.

Medir com o professor o tempo e os erros em três tarefas antes/depois: criar uma seção do zero até definir seu avanço, alterar a capa de um vídeo e ajustar um objetivo do Estúdio. A meta é reduzir procura e retrabalho; os ganhos de tempo ainda precisam ser observados.

## 12. Arquivos que fundamentam a proposta

- [Estrutura e lista de seções](../../packages/admin/src/components/editor/lesson-structure-editor.tsx).
- [Formulário principal da aula e dos blocos](../../packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx).
- [Critérios da seção](../../packages/admin/src/components/editor/section-completion-editor.tsx), [regra do projeto](../../packages/admin/src/components/editor/project-rule-editor.tsx) e [estruturas conectadas](../../packages/admin/src/components/editor/project-pattern-editor.tsx).
- [Atividades](../../packages/admin/src/components/editor/learning-builder.tsx) e [demonstração/experimentação](../../packages/admin/src/components/editor/experience-authoring.tsx).
- [Vídeo](../../packages/admin/src/components/media/video-uploader.tsx), [capa](../../packages/admin/src/components/media/video-thumbnail-uploader.tsx) e [ciclo do upload](../../packages/admin/src/components/media/use-video-upload.ts).
- [Sessão de rascunho](../../packages/admin/src/lib/lesson-draft-session.ts) e [modelos atuais](../../packages/core/src/learning/section-templates.ts).
- [Critérios compartilhados](../../packages/core/src/learning/section-progression.ts) e [seleção de player de vídeo](../../packages/member-shell/src/components/lesson-video.tsx).

O esboço navegável apresentado na conversa representa apenas recolhimento, edição contextual, capa e resumo do avanço, com dados ilustrativos. Não é o admin implementado nem uma demonstração de publicação, upload ao Vimeo ou avaliação real de projetos.
