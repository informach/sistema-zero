# Aulas com descoberta, explicação e criação

Este pacote adapta os 27 roteiros fornecidos: introdução e cinco dias do Desafio do Primeiro Jogo, 13 aulas de Corre, Dino! e oito de O Jogo do Meu Jeito. Cada roteiro original continua sendo uma aula. O [catálogo](catalogo.json) registra o arquivo de origem, sua assinatura SHA-256, o destino e a quantidade de seções.

Em cada pasta há um `roteiro.md` completo para produção e um `manifesto.json` importável na autoria. Os originais em Documents foram preservados. As cinco experiências HTML em [interacoes](interacoes) também estão incorporadas aos manifestos, sem dependências de rede. As demais usam os modelos nativos da plataforma.

## Como a aula funciona

O aluno vê o título da seção e seu conteúdo, experimenta uma relação, encontra uma explicação curta e aplica no próprio projeto. As demonstrações mostram os encaixes e ações; o texto da explicação continua disponível para consulta. O índice permite voltar a qualquer seção da aula desbloqueada. Pistas não descontam pontos. Uma hipótese inicial diferente não é tratada como erro que impede continuar.

As atividades essenciais usam uma conferência no servidor. As previsões são opcionais; sequências, associações e experiências essenciais pedem uma conclusão coerente com o que foi observado. Elas não concedem XP nem desbloqueiam ferramentas por conta própria. O botão de concluir respeita essas atividades e as entregas existentes. A porcentagem assistida de um vídeo não conclui a aula.

Desafio e Corre Dino reaproveitam o primeiro bloco de Estúdio da aula como um único espaço de trabalho. Sua identidade, configuração, cadeia de projetos e submissões são preservadas. A introdução não pede um Estúdio. O Jogo do Meu Jeito usa atalhos para Pinta e Estúdio externos, ensinando a trabalhar com a galeria e os projetos livres. Não importar um projeto do curso dentro de outro só para preencher a aula.

## Produção e publicação

O pacote contém texto, roteiros e interações funcionais. Os novos vídeos ainda precisam ser produzidos: são **118 trechos de demonstração**, que podem ser gravados em uma sessão contínua e separados nos pontos indicados. Isso não significa 118 aulas. Não foram inventadas URLs, gravações ou minutagens. O número de trechos acompanha os passos técnicos de cada roteiro, sem impor a mesma duração às aulas.

1. Abra a aula original no admin. A versão publicada continua disponível enquanto você edita o **rascunho compartilhado**. Não é preciso despublicá-la.
2. Em **Importar roteiro com seções**, selecione o manifesto, use **Vincular ao destino aberto**, confira a prévia e aplique. Os slugs dos arquivos são referências de autoria. As referências `existing.kind` / `existing.index` usam índice começando em zero dentro dos blocos daquele tipo; confira o primeiro Estúdio antes de importar.
3. A sequência aparece em **Percurso da aula**. Em cada seção, use **Adicionar conteúdo aqui**, edite os blocos existentes e escolha sua posição. Título, blocos, anexos e organização são salvos automaticamente no mesmo rascunho. Não há salvamentos separados para blocos e estrutura.
4. Atividades obrigatórias existentes que não foram mapeadas ficam no fechamento. Materiais opcionais, incluindo o vídeo longo original, ficam em **Materiais de apoio**, recolhidos fora da sequência. Entregas e histórico são preservados.
5. Cada trecho a gravar aparece como um **cartão de vídeo planejado**, já na seção correta e com sua orientação de produção. Envie o arquivo no uploader Vimeo desse cartão. A vinculação é salva depois do upload, e o processamento é conferido ao reabrir. O servidor confirma que o Vimeo terminou antes de publicar; não há pendência textual para retirar manualmente.
6. Use **Prévia do rascunho** para percorrer a aula sem criar progresso de aluno. Confira títulos, descobertas, vídeo e continuidade do projeto. A intenção didática e o objetivo ficam na autoria. No aluno, **O que falta para concluir** mostra as atividades obrigatórias e leva diretamente até elas.
7. Clique em **Publicar aula**. A plataforma captura os últimos traços/projeto, termina o salvamento e valida o conjunto. Se houver problema, a versão publicada permanece intacta. Uma publicação válida substitui a aula inteira e agenda a atualização do Zappy. **Ver como aluno** abre a versão publicada.
8. Em staging, percorra também a transição para a aula seguinte com um perfil de teste autorizado. Confira a retomada, os quizzes e a entrega. A promoção do ambiente para produção continua sendo uma decisão sua.

Reimportar o mesmo manifesto preserva IDs, projetos existentes e vídeos vinculados. Alterar apenas títulos de seção, posição ou referência do projeto não reinicia respostas. Mudar o conteúdo de uma descoberta muda sua revisão: o histórico fica guardado, mas uma resposta antiga não aprova o conteúdo novo. Aulas já concluídas continuam concluídas.

Os 27 manifestos usam a versão 2: `{ "key": "video-demonstracao", "plannedVideo": "O que mostrar e narrar" }` define o cartão, e a chave entra em `section.blockKeys`. A versão 1 continua aceita; seus textos `pendingMedia` são convertidos em cartões durante a importação. Nenhum arquivo contém uma URL de vídeo inventada.

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
