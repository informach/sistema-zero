# Aulas com descoberta, explicação e criação

Este pacote adapta os 27 roteiros fornecidos: introdução e cinco dias do Desafio do Primeiro Jogo, 13 aulas de Corre, Dino! e oito de O Jogo do Meu Jeito. Cada roteiro original continua sendo uma aula. O [catálogo](catalogo.json) registra o arquivo de origem, sua assinatura SHA-256, o destino e a quantidade de seções.

A revisão v4 começa pelas 13 aulas de **Corre, Dino!**: 60 seções, 13 descobertas manipuláveis, criação no mesmo Estúdio, entrega antes do quiz e 26 perguntas finais. O piloto troca texto corrido e perguntas antecipadas por vídeo curto e Zappy. Prevê 77 clipes, ainda a produzir. Outros cursos mantêm v3. O catálogo completo soma **109 seções e 144 clipes planejados**. A [revisão anterior](qa/revisao-pedagogica-2026-09-12.md) registra a etapa histórica; o [guia atual](guia-de-autoria.md) descreve o fluxo vigente.

Em cada pasta há um `roteiro.md` completo para produção e um `manifesto.json` importável na autoria. Os originais em Documents foram preservados. As cinco experiências HTML em [interacoes](interacoes) também estão incorporadas aos manifestos, sem dependências de rede. As demais usam os modelos nativos da plataforma.

## Como a aula funciona

O aluno vê o título da seção e seu conteúdo, experimenta uma relação, encontra uma explicação curta e aplica no próprio projeto. As demonstrações mostram os encaixes e ações; o texto da explicação continua disponível para consulta. O índice permite revisar seções concluídas. As próximas exibem apenas título e cadeado até a seção atual ser concluída. A barra principal conta seções concluídas com pesos iguais; o progresso do curso permanece no índice do curso. Pistas não descontam pontos. Uma hipótese inicial diferente não é tratada como erro que impede continuar.

O servidor controla o avanço pelos critérios selecionados. Exploração nativa registra comparações feitas no navegador, sem afirmar domínio do conceito; criação verifica estrutura do projeto; entrega confirma recebimento; quiz verifica respostas. Assistir a 90% só é critério de uma seção que contém apenas vídeo. Acesso ao caderno e ações salvas da plataforma têm critérios próprios. A última seção também precisa cumprir seu critério.

Perguntas usam situações de criação e investigação, com pistas que orientam a comparação. Cores, detalhes de desenho e preferências não recebem gabarito. A introdução deixa a preferência inicial livre. Perguntas sobre o Pinta e o Estúdio externo verificam compreensão: não comprovam salvamento, qualidade visual ou publicação da criação.

Desafio e Corre Dino reaproveitam o primeiro bloco de Estúdio da aula como um único espaço de trabalho. Sua identidade, configuração, cadeia de projetos e submissões são preservadas. A introdução não pede um Estúdio. O Jogo do Meu Jeito usa atalhos para Pinta e Estúdio externos, ensinando a trabalhar com a galeria e os projetos livres. Não importar um projeto do curso dentro de outro só para preencher a aula.

## Produção e publicação

O pacote contém roteiros e interações funcionais. Os vídeos ainda precisam ser produzidos: **77 clipes no Dino, 144 no conjunto completo**. Durações sugeridas são metas de gravação, não minutagens de arquivos existentes. Não foram inventadas URLs nem enviados vídeos automaticamente.

1. Abra a aula original no admin. A versão publicada continua disponível enquanto você edita o **rascunho compartilhado**. Não é preciso despublicá-la.
2. Em **Importar roteiro com seções**, selecione o manifesto, use **Vincular ao destino aberto**, confira a prévia e aplique. Os slugs dos arquivos são referências de autoria. As referências `existing.kind` / `existing.index` usam índice começando em zero dentro dos blocos daquele tipo; confira o primeiro Estúdio antes de importar. Em uma aula vazia, os manifestos de Corre Dino e dos dias do Desafio exigem cadastrar e configurar esse Estúdio no rascunho primeiro: use **Adicionar conteúdo aqui → Estúdio**. O manifesto reutiliza o projeto e suas permissões; não os inclui no arquivo. Depois, confira novamente a importação.
3. A sequência aparece em **Percurso da aula**. Em cada seção, use **Adicionar conteúdo aqui**, edite os blocos existentes e escolha sua posição. Título, blocos, anexos e organização são salvos automaticamente no mesmo rascunho. Não há salvamentos separados para blocos e estrutura.
4. No Dino v4, confira as instruções aposentadas na prévia: cartões importados indicados explicitamente saem do rascunho. Projetos, mídias, quizzes originais e histórico são preservados. O material antigo mantido fica no apoio e não acrescenta critérios ocultos. Nos outros cursos, a limpeza v3 continua manual.
5. Cada trecho a gravar aparece como um **cartão de vídeo planejado**, já na seção correta e com sua orientação de produção. Envie o arquivo no uploader Vimeo desse cartão. A vinculação é salva depois do upload, e o processamento é conferido ao reabrir. O servidor confirma que o Vimeo terminou antes de publicar; não há pendência textual para retirar manualmente.
6. Use **Prévia do rascunho** para percorrer a aula sem criar progresso de aluno. Confira títulos, descobertas, vídeo e continuidade do projeto. A intenção didática e o objetivo ficam na autoria. No aluno, **O que falta para concluir** mostra as atividades obrigatórias e leva diretamente até elas.
7. Clique em **Publicar aula**. A plataforma captura os últimos traços/projeto, termina o salvamento e valida o conjunto. Se houver problema, a versão publicada permanece intacta. Uma publicação válida substitui a aula inteira e agenda a atualização do Zappy. **Ver como aluno** abre a versão publicada.
8. Em staging, percorra também a transição para a aula seguinte com um perfil de teste autorizado. Confira a retomada, os quizzes e a entrega. A promoção do ambiente para produção continua sendo uma decisão sua.

Reimportar o mesmo manifesto preserva IDs, projetos existentes e vídeos vinculados. Alterar apenas títulos de seção, posição ou referência do projeto não reinicia respostas. Mudar o conteúdo de uma descoberta muda sua revisão: o histórico fica guardado, mas uma resposta antiga não aprova o conteúdo novo. Aulas já concluídas continuam concluídas.

Os 27 manifestos usam a versão 3, com critérios explícitos em todas as 96 seções. `completion.blockIds` referencia as chaves portáveis dos blocos avaliados, e `completion.projectChecks` define verificações estruturais do projeto. Todos os critérios de uma seção são obrigatórios. O formato de vídeo planejado continua o mesmo: `{ "key": "video-demonstracao", "plannedVideo": "O que mostrar e narrar" }` define o cartão, e a chave entra em `section.blockKeys`. As versões 1 e 2 continuam aceitas sem ativar automaticamente as travas; seus textos `pendingMedia` são convertidos em cartões durante a importação. Nenhum arquivo contém uma URL de vídeo inventada.

A estrutura nova entra em vigor ao ser publicada. Enquanto a migração não acontece, o legado recebe apresentação compatível: vídeo/Estúdio e depois quiz; vídeo isolado com 90%; texto e caderno juntos com acesso ao material. Aulas concluídas permanecem concluídas. Verificações durante a construção não criam entregas; a entrega pode preceder o quiz final.

Veja o [guia de cadastro e funcionamento](guia-de-autoria.md) para criação manual, projeto compartilhado, recuperação local e conflitos.

## Conferência pedagógica entre aulas

| Curso | Continuidade que precisa ser preservada |
| --- | --- |
| Desafio | Uma nave no Dia 1; tiros no 2; asteroides no 3; pontos e vidas no 4; telas, reinício e publicação no 5. A aula do Dia 5 é identificada pelo nome, não por ser a última da lista. |
| Corre Dino | A criação ainda invisível ao fim da Aula 1 e a floresta sozinha ao fim da Aula 7 são resultados intencionais. O contador de diagnóstico é removido ao fim da Aula 6. Na Aula 13, −9 limita a velocidade-base; o sorteio ainda pode tornar o vx final mais negativo. |
| Meu Jeito | Projeto do Dia 5 importado para o Estúdio livre. Nave: Personagem, pixel art, 32 × 32, dois quadros, `voando`. Asteroide: Personagem, vetor, 64 × 64, dois quadros, `girando`. Tamanho da folha é diferente do tamanho do sprite no jogo. |

Os números necessários à integração são explícitos; formato, cores, detalhes e tema continuam escolhas da criança. As experiências simplificam um conceito e dizem quando sua representação difere do motor real, como os círculos da comparação de colisão.

## Acompanhamento

O pedido de ajuda chega aos recados com a aula e a seção. O professor abre o acompanhamento da aula para ver a retomada, as respostas, as pistas consultadas e o histórico da versão atual. Os pais veem temas de seções com interação registrada na semana e as criações do Mural no painel e no relatório existente. Esses registros não inferem capacidade nem diagnosticam dificuldade a partir de erros.

## Formato das experiências HTML

O iframe tem origem isolada e não acessa a sessão nem a rede. A interface injetada oferece `window.learning.state`, `save(estado)`, `participated()` e `resize(altura)`. O evento `learning:restore` recupera o estado. A atividade guarda dados simples e limitados; o HTML não escolhe a resposta correta nem libera uma atividade essencial. A conferência nativa fora do iframe faz essa validação no servidor.

Os arquivos em `interacoes` são fragmentos para esse ambiente. Uma abertura direta no navegador permite observar a simulação; a persistência e a conferência precisam do player da plataforma.
