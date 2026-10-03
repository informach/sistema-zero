# A Chave do Farol · Introdução · A aventura começa aqui

## Resultado e diagnóstico

A criança conhece o jogo que vai programar e experimenta a versão pronta antes de construir as regras. A versão anterior concentrava três vídeos em apresentação e navegação da plataforma. A revisão aplica o formato do Cadê Todo Mundo: contexto pertinente, convite à ação, ajuda de interface consultada quando necessária e caderno opcional.

Não eliminar a apresentação do jogo junto com o tour. O vídeo anuncia **A Chave do Farol**, situa o barco e o farol apagado, e só então convida a jogar.

## Seções finais

| Seção | Vídeo | Atividade e conclusão |
| --- | --- | --- |
| A Chave do Farol | `video-intro-farol` | Jogo pronto `jogo-pronto`; vídeo e participação, sem exigir vitória. |
| Seu Caderno do Aluno | `video-intro-caderno` | Leitor do caderno opcional; somente o vídeo é obrigatório. |

## Experiência e conceitos

O `project-play` usa `montarProjetoFarol('concluido')`, com quatro direções por toque ou teclado. É uma demonstração jogável isolada: não é o Estúdio de entrega e não alimenta a cadeia do projeto da criança. A conclusão por `participation` evita transformar a introdução em uma prova de habilidade no jogo.

Não ensinar variável, evento ou condição antes de a criança precisar deles. Não resolver o trajeto no vídeo. Explicar como mover e como seguir, inclusive que terminar a partida não é obrigatório.

## Materiais e ajuda

Preservar a chave `materiais-farol` e ativar `bookPreview: true`. Anexar ali **somente** o PDF `output/pdf/desafio-farol-caderno.pdf`. O arquivo é um caderno único de consulta, com montagem, testes, entrega e publicação, não uma ficha obrigatória.

O caderno acompanha o conteúdo das aulas. Pode incluir visão geral, navegação, publicação e certificado, mas não introduz um mapa como material ou atividade adicional. Não anexar o antigo mapa dos responsáveis a esta aula; se ainda estiver entre os anexos antigos, retirar apenas sua referência após conferir o caderno, sem apagar o arquivo armazenado.

A ajuda opcional `ajuda-como-fazer-intro` reúne abrir aula, ampliar atividade, mostrar menu, voltar e pedir ajuda. Os links abrem na mesma aba com retorno à aula. Não gravar um tour nem condicionar avanço à consulta dos tutoriais.

## Continuidade e produção

Preservar `courseSlug: desafio-primeiro-jogo`, `lessonSlug: boas-vindas` e as seções `apresentacao` e `caderno`. Retirar a seção `voltar` e aposentar `video-intro-voltar` e `ajuda-como-fazer-voltar`, além das aposentadorias históricas já declaradas no manifesto.

Regravar os dois vídeos; revisar os anexos antes de gravar. Ao atualizar uma aula existente, reconciliar mídia e progresso, sem substituir vídeos publicados por `plannedVideo`. Encerrar a última fala em **Concluir aula**.
