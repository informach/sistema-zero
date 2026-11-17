# Transformando o vilão em aliado

Minicurso gratuito **para pais e responsáveis**, com a Helena na câmera, em **Cursos para pais** na área dos pais do Kids. A revisão de 17/11/2026 implementa a proposta aprovada: uma conversa explicativa que pode ser acompanhada em uma sentada. São seis aulas; a duração resulta da explicação e da edição, sem meta fixa de minutos.

**O propósito:** ajudar a família a compreender que a tela pode ser usada para criar e colocar habilidades cognitivas para a vida em prática. A criação de jogos é apresentada depois da explicação das habilidades, como uma possibilidade concreta. O Cadê Todo Mundo por sete dias é a experiência prática, depois do minicurso.

O responsável assiste a explicações, exemplos e uma demonstração. Não há tarefa semanal, quiz, exercício para entregar nem dependência de participação do filho para continuar. A apostila é consulta opcional. As partes são concluídas pelos vídeos; na última, a emissão do certificado registra a conclusão conforme o contrato da plataforma. O presente está disponível independentemente dessa emissão.

| Material | Arquivo |
| --- | --- |
| Título, descrições e organização | [Módulos](modulos.md) |
| Fontes, argumentos recuperados e produção | [Fontes](fontes.md) |
| Consulta opcional | [Apostila](apostila.pdf) |
| Ajustes e conferências desta revisão | [Revisão final](revisao-final-2026-11-17.md) |

| Aula | Conteúdo | Roteiro | Importação no Admin |
| --- | --- | --- | --- |
| 1. A tela pode ter outros usos | [Conteúdo](transformando-o-vilao-em-aliado-aula-1.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-1.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-1.manifesto.json) |
| 2. O que uma criança exercita quando cria | [Conteúdo](transformando-o-vilao-em-aliado-aula-2.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-2.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-2.manifesto.json) |
| 3. Como criar jogos coloca isso em prática | [Conteúdo](transformando-o-vilao-em-aliado-aula-3.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-3.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-3.manifesto.json) |
| 4. Interesse, dificuldade e apoio para continuar | [Conteúdo](transformando-o-vilao-em-aliado-aula-4.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-4.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-4.manifesto.json) |
| 5. O que essa experiência pode levar para a vida | [Conteúdo](transformando-o-vilao-em-aliado-aula-5.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-5.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-5.manifesto.json) |
| 6. Uma oportunidade para experimentar com seu filho | [Conteúdo](transformando-o-vilao-em-aliado-aula-6.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-6.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-6.manifesto.json) |

## Gravação e edição

- São **13 clipes**, com fala integral para teleprompter. A Helena grava; este curso não usa ElevenLabs nem intervenções de personagens.
- O **Na tela** de cada parte cita trechos da fala atual e indica as imagens a inserir. A captura da demonstração é manual e tem preparação descrita na Aula 3. O responsável acompanha o vídeo; não recebe uma montagem para executar.
- Os depoimentos são opcionais e curtos. Escolher um relato que sustente o argumento da parte, em vez de reunir vários relatos equivalentes. O roteiro funciona sem os cortes. Identificar nome e vínculo, distinguindo Débora, mãe do Bernardo, da filha da Helena.
- A autorização da Isabela para uma apresentação não deve ser tomada como autorização para o curso. Até confirmar, não inserir imagem ou depoimento dela.
- Há seis aulas, mas os 13 identificadores de clipe foram preservados. Alguns nomes técnicos antigos já não descrevem o assunto novo: usar os títulos abaixo e gravar novamente o conteúdo antes de vincular mídia.

| Aula | Chave preservada | Título da parte nesta revisão |
| --- | --- | --- |
| 1 | `video-a1-pergunta` | O que acontece dentro da tela |
| 1 | `video-a1-tres-usos` | Assistir, jogar e criar |
| 2 | `video-a2-por-dentro` | Da ideia ao que precisa ser feito |
| 2 | `video-a2-autoria` | Ter uma intenção e participar das escolhas |
| 3 | `video-a3-rotina` | Uma ideia pode virar um jogo |
| 3 | `video-a3-caminho` | Uma regra, um teste e um resultado |
| 3 | `video-a3-erro` | O que a demonstração permite perceber |
| 4 | `video-a4-interesse` | Um motivo para querer tentar |
| 4 | `video-a4-escola` | O apoio acompanha a necessidade |
| 5 | `video-a5-foco` | Quando um conhecimento ganha uma função |
| 5 | `video-a5-suporte` | Criar também pode abrir uma conversa |
| 6 | `video-a6-conversa` | A criança cria, a família acompanha |
| 6 | `video-a6-primeiro-passo` | O presente para conhecer essa possibilidade |

## Publicação

1. No Admin, usar audiência Kids e **Para quem: Pais**, fora da Jornada, no formato gravado. Slug do curso e slugs das seis aulas foram mantidos.
2. Atualizar títulos e descrições conforme [Módulos](modulos.md) e importar os seis manifestos. Conferir a substituição da estrutura anterior: não podem restar partes de quiz ou tarefas antigas. As seções removidas tinham chaves `confira-a1`, `confira-a2`, `caminho-resposta`, `confira-a4`, `confira-a5` e `confira-a6`.
3. Os vídeos estão como `plannedVideo`. Vincular as novas gravações, sem reutilizar uma gravação anterior só porque a chave é a mesma.
4. Anexar a apostila revisada ao bloco `apostila` da Aula 1, com prévia em livro.
5. Na Aula 6, o bloco `presente` mantém o link `https://sistemazero.com.br/bolsa/vilao-em-aliado-cade`. Conferir no ambiente de destino a campanha `vilao-em-aliado-cade`, a oferta `cade-todo-mundo-7-dias` e as condições reais do resgate. O presente não depende de certificado.
6. O bloco `certificado` foi conservado como registro de conclusão da última parte, conforme a regra da plataforma. A família não precisa baixar materiais, fazer uma criação ou resgatar o presente para concluir. O resgate é independente do certificado.

## Estado desta entrega

Fonte editorial, manifestos e apostila revistos localmente. Os 13 vídeos ainda precisam ser gravados e editados. Importação no Admin, vinculação dos vídeos e publicação são etapas posteriores; esta revisão dos arquivos não comprova essas etapas.

A capa da apostila preserva a arte existente, com 1.300 px de largura, e a composição compartilhada dos materiais do Sistema Zero. Fontes Baloo 2 e Nunito, cards com ícones, cores dos blocos do Estúdio e rodapés seguem a receita visual. O cabeçalho simples é a variação prevista para o curso de pais.

## Conferência da revisão de 17/11/2026

Seis manifestos conferidos com o schema e os critérios reais de publicação do core; 13 chaves de vídeo preservadas; 11 blocos antigos de tarefa/quiz retirados. Roteiros: seis aulas, 13 clipes e zero erros. Testes de linguagem da apostila aprovados. PDF com 14 páginas, layout verificado e todas as páginas inspecionadas visualmente. Não há campos para preencher ou tarefas semanais. O presente é independente da emissão do certificado.

A revisão final também alinhou as cores do índice às páginas, acrescentou links clicáveis ao presente e às referências, refinou a relação com a escrita e detalhou a preparação da demonstração. A suíte completa da documentação passou com 724 testes e zero falhas. O [registro da revisão](revisao-final-2026-11-17.md) distingue essas verificações das etapas de produção e publicação ainda pendentes.
