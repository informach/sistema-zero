# Implementação do piloto Corre, Dino!

Proposta aprovada em 12/09/2026: [desenho](2026-09-12-evolucao-experiencia-aulas-kids-proposta.md).

Requisitos adicionais aprovados e refinados durante a implementação: aulas legadas sem seções autoradas terão vídeo à esquerda e Estúdio à direita em uma seção, e quiz em outra. Sem Estúdio, a primeira seção contém apenas vídeo e exige 90% de trechos assistidos. Sem quiz, não inventar uma segunda seção. Aulas legadas de texto e caderno ficam em uma seção; abrir o livro ou acessar seu PDF conclui a etapa. A migração será gradual por aula. Não reiniciar progresso, duplicar projetos, publicar ou migrar conteúdo remotamente durante a implementação local.

Extensão aprovada: novas aulas também podem apresentar o caderno do curso inteiro. Intenção própria “Material do curso”: vídeo breve de orientação, fala do Zappy, livro 3D e download juntos. Critério explícito: abrir o caderno ou baixar o PDF; sem quiz nem 90% do vídeo. É uma aula de acesso ao material, não uma prova de leitura ou aprendizagem. Nas legadas essa adaptação é automática; nas novas é configurada pela professora.

Extensão posterior aprovada: seção “Assistir” também nas aulas novas para tour, boas-vindas e orientação de ferramenta externa. Pode conter apenas vídeo, com seleção explícita de 90% dos trechos assistidos. Em criações feitas fora da aula (Meu Jeito/Pinta/Estúdio completo), isso conclui a orientação, sem substituir uma entrega da criação. Seções de conceitos continuam priorizando manipulação e criação; material e orientação são usos próprios.

Extensão aprovada para criação externa: selecionar trabalhos em uma modal da galeria e confirmar o envio é critério da SEÇÃO de entrega. Pinta admite múltiplos desenhos; Estúdio, um projeto. Envio confirmado libera a próxima seção (ex.: quiz); a aula depende das demais seções. Guardar cópias imutáveis para o professor, mantendo as criações editáveis na galeria.

Decisão técnica implementada para a galeria: variante de apresentação `gallery` dos blocos Estúdio/Pinta, preservando o modelo de entrega e a fila do professor. Não transportar desenhos/jogos grandes pelo corpo HTTP de 2 MB: o BFF copia os blobs gzip e suas partes do R2 já autenticados para `creations/<perfil>/lesson-submissions/<bloco>/<requestId>/...`. O members autoriza seção, propriedade e revisão antes da cópia e confirma a entrega depois. Metadados pequenos registram snapshots e revisão; Studio pode ser corrigido com o programa sem assets. Repetir um envio confirmado deve devolver o mesmo resultado sem copiar novamente. A galeria continua editável; cópias ficam sob o prefixo já coberto pelo expurgo de conta. Professor vê a entrega na fila existente e abre os snapshots autenticados. Falha de cópia nunca conclui a seção. Este acréscimo substitui a decisão anterior de adiar toda a entrega externa.

Extensão aprovada: seções de tour por ação da plataforma. Professora escolhe ação suportada (personalizar avatar, personalizar quarto, mudar tema, mudar cor do tema). Aluno assiste à orientação, abre a tela correspondente e clica “Verificar minha ação”. Verificação consulta o estado salvo e compara com o padrão; quando válida, conclui a SEÇÃO e mostra evidência visual (prévia do avatar, por exemplo). Uma ação já realizada antes da aula também vale. Investigar persistência de tema/cor (não presumir servidor se forem só localStorage); não registrar um clique como se fosse mudança. Não exigir 90% junto com uma ação prática.

## Trabalho

- [x] Compatibilidade: reconhecer também a seção automática do backfill, projetar duas etapas sem migrar dados, preservar critérios de entrega/quiz e aplicar 90% apenas ao vídeo isolado; acesso ao caderno nas aulas de material.
- [x] Contratos: entrega antes de fechamento, modelos nativos manipuláveis com evidência delimitada, novas representações do quiz e formatos de autoria/importação compatíveis.
- [x] Experiências: seis famílias de cenas para as 13 descobertas do Dino, pausa, retorno, comparação e conclusão pertinente ao objetivo.
- [x] Autoria: ícones e tipos, modelos de etapa, critérios claros e prévia sem progresso real.
- [x] Player: Zappy contextual, exploração com feedback e persistência, acesso à orientação perto da ferramenta, entrega antes do quiz.
- [x] Conteúdo: 13 manifestos e roteiros do Dino; vídeos planejados com instruções concretas, quiz final e continuidade do projeto preservada.
- [x] Verificação: domínio, integração HTTP/persistência, componentes, typechecks, lint dos arquivos alterados e inspeção no navegador.

## Decisões de implementação

- As novas aulas são ativadas por publicação da estrutura autorada. Só a estrutura automática legada recebe os critérios de compatibilidade aprovados; seções autoradas não recebem critérios implícitos.
- O legado mantém os critérios existentes, inclusive quizzes com nota mínima e outras atividades existentes. Não inventar quiz/Estúdio para aulas que não os possuem.
- Uma cena nativa registra exploração/solução, separadamente da aprovação do projeto. HTML genérico não pode declarar domínio do conceito.
- Entrega ganha intenção própria e pode anteceder o fechamento; os fechamentos antigos na última seção continuam aceitos.
- Vídeos novos ficam como mídia planejada, com roteiro; gravação da professora e publicação dos cursos dependem da produção editorial posterior.
- Entrega externa de desenhos independentes do Pinta e projetos do Estúdio está implementada. Mapas do Pinta com dependências, o modelo de quadros e migração editorial dos demais cursos ficam para expansão.

## Evidências e andamento

Implementados: compatibilidade legada, vídeo por trechos, material do curso, 13 simulações, autoria e player, piloto v4, ações de plataforma e entrega por galeria com cópias privadas e inspeção pelo professor.

O catálogo de ações oferece avatar, quarto e tema. O Kids atualmente só tem Padrão/Pink; a preferência agora é persistida por perfil. Nenhuma cor independente foi inventada. Salvar o avatar padrão (incluindo cor de uma peça invisível) não deve cumprir a personalização.

Validação: 24 testes com migrações reais em banco descartável; importação dos 27 manifestos e idempotência de entregas concorrentes; testes de domínio, HTTP, BFF e componentes. Navegador: 13 modelos em 390 px, sem transbordamento; movimento reduzido, passos, pausa, teclado, arraste e conclusão da comparação de existir/desenhar. A inspeção visual usou um harness local dos componentes reais; não foi uma publicação nem uma sessão autenticada em staging. Evidências detalhadas em [validação v4](../aulas-interativas/qa/piloto-v4-2026-09-12.md).

Antes de ativar: aplicar a migração 0086 pelo processo normal de release, gravar/vincular os clipes planejados, conferir permissões e cadeia do Estúdio reaproveitado, configurar o Mural na entrega final e publicar cada aula revisada. Não houve migração de banco de produção nem publicação remota nesta implementação.
