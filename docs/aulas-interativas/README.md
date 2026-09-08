# Aulas com descoberta, explicação e criação

Este pacote adapta os 27 roteiros fornecidos: introdução e cinco dias do Desafio do Primeiro Jogo, 13 aulas de Corre, Dino! e oito de O Jogo do Meu Jeito. Cada roteiro original continua sendo uma aula. O [catálogo](catalogo.json) registra o arquivo de origem, sua assinatura SHA-256, o destino e a quantidade de seções.

Em cada pasta há um `roteiro.md` completo para produção e um `manifesto.json` importável na autoria. Os originais em Documents foram preservados. As cinco experiências HTML em [interacoes](interacoes) também estão incorporadas aos manifestos, sem dependências de rede. As demais usam os modelos nativos da plataforma.

## Como a aula funciona

O aluno conhece a intenção, experimenta uma relação, encontra uma explicação curta e aplica no próprio projeto. As demonstrações mostram os encaixes e ações; o texto da explicação continua disponível para consulta. O índice permite voltar a qualquer seção da aula desbloqueada. Pistas não descontam pontos. Uma hipótese inicial diferente não é tratada como erro que impede continuar.

As atividades essenciais usam uma conferência no servidor. As previsões são opcionais; sequências, associações e experiências essenciais pedem uma conclusão coerente com o que foi observado. Elas não concedem XP nem desbloqueiam ferramentas por conta própria. O botão de concluir respeita essas atividades e as entregas existentes. A porcentagem assistida de um vídeo não conclui a aula.

Desafio e Corre Dino reaproveitam o primeiro bloco de Estúdio da aula como um único espaço de trabalho. Sua identidade, configuração, cadeia de projetos e submissões são preservadas. A introdução não pede um Estúdio. O Jogo do Meu Jeito usa atalhos para Pinta e Estúdio externos, ensinando a trabalhar com a galeria e os projetos livres. Não importar um projeto do curso dentro de outro só para preencher a aula.

## Produção e publicação

O pacote contém texto, roteiros e interações funcionais. Os novos vídeos ainda precisam ser produzidos: são **118 trechos de demonstração**, que podem ser gravados em uma sessão contínua e separados nos pontos indicados. Isso não significa 118 aulas. Não foram inventadas URLs, gravações ou minutagens. O número de trechos acompanha os passos técnicos de cada roteiro, sem impor a mesma duração às aulas.

1. Abra a aula original no admin e coloque-a em rascunho. Selecione o manifesto correspondente, vincule ao destino real e confira a prévia antes de aplicar. Os slugs do pacote são referências de autoria, sem presumir os slugs cadastrados no ambiente.
2. A prévia lista os blocos criados, atualizados e preservados. Referências `existing.kind` / `existing.index` usam índice começando em zero dentro dos blocos daquele tipo. Confira o primeiro Estúdio antes de aplicar. Se não existir, configure a atividade original apropriada; não criar um projeto inicial vazio para substituir a continuidade.
3. Blocos não mapeados permanecem na seção “Materiais existentes da aula”, inclusive quizzes, vídeos, anexos e certificados. Reposicione o material que faz parte da nova sequência. Vídeos anteriores podem ficar como consulta enquanto forem úteis; não transformar um roteiro antigo inteiro na demonstração curta indicada.
4. Grave conforme as instruções de tela e narração de cada seção. Use o uploader Vimeo/TUS já existente no admin, acrescente legendas e mova o bloco para a seção correspondente. Confira a edição, o áudio, os controles e a legibilidade da gravação no tamanho do player.
5. Cada seção de demonstração tem `pendingMedia`. Retire a pendência depois de inserir e conferir a mídia. A prévia funciona em rascunho; a publicação é impedida enquanto houver pendências. Isso é uma verificação de conteúdo, sem feature flag.
6. Percorra a aula e a transição para a seguinte com um perfil de teste autorizado. Confira também a retomada, os quizzes e a entrega. Publique após a validação em staging.

Reimportar o mesmo manifesto preserva os IDs dos blocos criados pelo importador e não muda a revisão de conteúdo idêntico. Alterar a atividade muda sua revisão; respostas anteriores ficam no histórico, sem liberar uma atividade nova por um acerto antigo. A prévia usa a versão da aula para impedir que uma alteração concorrente seja sobrescrita.

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
