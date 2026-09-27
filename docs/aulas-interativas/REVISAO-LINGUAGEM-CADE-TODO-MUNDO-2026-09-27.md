# Revisão de linguagem: Cadê Todo Mundo?

## Motivo e escopo

Após assistir à abertura, uma das duas crianças que testaram o curso entendeu apenas que o
professor apertou botões. A tarefa de jogar o exemplo para conhecer o jogo que seria construído
ficou escondida entre explicações da plataforma.

A revisão cobre as nove seções do curso e as diretrizes que levaram a essa fala. Mantém
seções, experiências, projetos, alvos e critérios de conclusão. A mudança é editorial:
tarefa imediata, instrução completa, explicação curta e saída clara.

## Conferência das nove seções

| Seção | Comando principal | Como termina |
| --- | --- | --- |
| Aula 1: Bem-vindo ao jardim | Jogue a versão pronta e encontre os três personagens | Próxima seção, após vídeo e três achados |
| Aula 1: Seu Caderno do Aluno | Consulte o caderno se precisar; leitura opcional | Próxima seção, após vídeo |
| Aula 1: O que um toque faz? | Toque com a reação desligada, ligue e toque de novo | Próxima seção, após vídeo e dois testes |
| Aula 1: Faça alguém aparecer | Encaixe a visibilidade no evento, escolha escolhido e use 0 | Teste, envio com confirmação e Concluir aula |
| Aula 2: Volte ao seu jardim | Veja o que falta na contagem | Próxima seção; não pedir uma ferramenta ausente |
| Aula 2: Um número que acompanha a busca | Teste dois achados, espaço vazio e recomeço | Próxima seção, após vídeo e quatro metas |
| Aula 2: Cada personagem vale um achado | Encaixe Somar 1 em variável achados abaixo da visibilidade | Teste 1, 2, 3, toque repetido e envio com confirmação |
| Aula 2: Sua busca está completa | Confira o jogo pronto; compartilhar é opcional | Concluir aula e abrir Seu certificado |
| Certificado: Comemore sua criação | Pegue o certificado | Download e Concluir aula |

O Zappy dá um lembrete curto da tarefa. As experiências conservam seu funcionamento. Nas práticas,
os caminhos da paleta, encaixes, campos, valores e testes continuam na fala. Não há listas de
conceitos para decorar, agenda da aula seguinte ou tours da interface.

## Destino dos tutoriais

| Conteúdo retirado do roteiro | Tutorial no Como Fazer | Situação editorial |
| --- | --- | --- |
| Pausar e rever o vídeo | plataforma-pausar-e-rever-video | Novo |
| Jogo pronto, ampliar e jogar de novo | plataforma-jogar-exemplo-da-aula | Novo |
| Seções, Anterior, Próxima seção e conclusão | plataforma-abrir-uma-aula | Existente; ligações para novas ajudas |
| Divisória, ampliação e retorno | plataforma-ampliar-a-atividade | Existente |
| Abas, olhinho e atualização do jogo | estudio-pre-visualizacao | Existente |
| Folhear, trocar modo de leitura, baixar e imprimir | plataforma-baixar-materiais | Complementado |
| Enviar e confirmar a entrega | plataforma-enviar-atividade | Existente; comandos mínimos mantidos na prática |
| Compartilhar, capa, publicação e link jogável | plataforma-publicar-no-mural | Complementado para o Estúdio da aula |
| Pegar, encontrar e baixar novamente o certificado | plataforma-pegar-certificado | Novo |

O lote passa de 39 para 42 tutoriais. Os três novos pertencem à coleção Plataforma. O tutorial
de compartilhamento atende também o Estúdio incorporado da aula, sem exigir acesso ao Estúdio
completo. Ler ajuda não libera ferramenta ou matrícula.

## Fontes conferidas no código

- Navegação: packages/member-shell/src/components/lesson-sections.tsx, botão Próxima seção.
- Conclusão: packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx.
- Envio: packages/member-shell/src/components/studio/studio-block.tsx, janela e confirmação.
- Experiência de toque: scene-lesson-controls.tsx e scene-touch-response.tsx, em member-shell.
- Experiência de contagem: scene-found-counter.tsx e metas em packages/core/src/learning/scene/catalog.ts.
- Caderno: pdf-book-view.tsx, ebook-reader.tsx e ebook-book.impl.tsx, em member-shell/components/ebook.
- Compartilhamento: packages/studio/src/components/layout/ShareDialog.tsx.
- Certificado: packages/member-shell/src/components/certificate-block.tsx.
- Paleta: referência de blocos, bloco de soma, toolbox e testes existentes do curso.

## Diretrizes corrigidas

BRIEFING.md, ESPEC-ROTEIRO.md e docs/orientacao-cursos-jogos.md passam a exigir tarefa direta.
A skill de roteiro também foi revisada, com cópia versionada em autoria-aula-roteiro/SKILL.md.
Os moldes antigos não são referência de voz para esta revisão.

Os trios do curso e seu gerador foram atualizados juntos. Os materiais dos outros cursos
ainda não foram reescritos segundo esta direção.

## Gravação e publicação

Validação desta revisão:

- Três manifestos válidos, sem avisos de convenção.
- Nove seções de roteiro correspondentes aos nove vídeos dos manifestos.
- Onze pares de nota de tela e narração, sem travessões nos roteiros.
- Dezoito testes existentes do curso aprovados.
- Quarenta e dois tutoriais válidos, com referências internas conferidas.
- Comparação estrutural dos manifestos confirmou projetos, experiências, alvos, permissões
  e critérios de conclusão idênticos aos anteriores; só textos editoriais mudaram.
- Gerador e arquivos JSON passaram na formatação; diff sem erros de espaço.

Estas são as novas fontes editoriais para regravação. Os vídeos e blocos do curso no banco
continuam preservados. Os manifestos locais com plannedVideo e anexos vazios não devem
substituir os blocos publicados.

Os tutoriais complementares foram publicados em staging e produção em 27/09/2026,
às 19:48 UTC: três novos, três atualizados, 42 publicados no total. As mídias de cada
ambiente e os 36 documentos sem alteração foram preservados. Foram conferidas 44 respostas
HTTP 200 por ambiente, além dos documentos, identidades e índices de busca.

Para finalizar a nova versão: regravar as falas, ensaiar as nove seções com crianças e
reconciliar os vínculos de mídia no Admin, preservando projetos, progresso, PDF e certificado.

No ensaio, o adulto não completa a instrução por fora. A criança deve entender a tarefa,
começar a executá-la e saber como terminar. Essa verificação depende de um novo teste com
crianças; validação estrutural e revisão de texto não substituem esse teste.
