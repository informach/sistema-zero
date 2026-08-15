# Desbloqueio de ferramentas por cursos bônus

**Data:** 15/08/2026
**Status:** aprovado

## Contexto

A Carreira do Criador exige dois marcos para qualificar um curso com posição: o aluno conclui todas as aulas publicadas e publica o projeto do curso no Mural. Essa regra comprova a prática e determina a evolução de nível.

Cursos bônus não ocupam uma posição na carreira (`careerSlot = null`). Alguns deles ensinam o uso do Pinta, do Pensa ou do Estúdio por meio de aulas em vídeo e não possuem um projeto publicável. O sistema já registra a conclusão desses cursos com o marco `course_complete`, mas a consulta atual de ferramentas exige também `course_showcased`. Como resultado, um curso bônus sem vitrine termina sem entregar as ferramentas configuradas nele.

## Decisão

O papel do curso define o critério de desbloqueio:

| Tipo de curso | Critério para liberar ferramentas | Conta para a carreira |
| --- | --- | --- |
| Kids com posição na carreira | `course_complete` + `course_showcased` | Sim |
| Kids bônus (`careerSlot = null`) | `course_complete` | Não |
| Adult | Comportamento atual, sem alteração | Não se aplica |

O Admin não oferece uma configuração adicional para escolher o critério. A posição na carreira já expressa a intenção pedagógica e evita combinações inválidas.

Um curso obrigatório sem projeto publicável continua inválido para a jornada: ele pode registrar conclusão, mas não qualifica a posição, não libera as ferramentas e não avança a carreira. O aviso existente de curso-base sem vitrine continua protegendo esse caso.

## Comportamento do aluno

Cada aula continua sendo concluída pelo fluxo atual: ação manual ou conclusão automática perto do fim do vídeo, respeitando os portões de quiz, Estúdio, Pinta e certificado. Quando o aluno conclui todas as aulas publicadas, o members grava `course_complete` de forma idempotente.

Ao concluir um curso bônus, o aluno recebe as ferramentas inéditas declaradas em `metadata.studioUnlockBlocks`. O curso permanece fora da contagem de nível. Se o bônus também possuir uma vitrine, o aluno ainda pode publicar o projeto no Mural, ganhar a celebração correspondente e registrar `course_showcased`; a publicação não condiciona as ferramentas.

Ao concluir um curso com posição, nada muda: o aluno recebe as ferramentas somente depois da publicação no Mural. O mesmo par de marcos continua qualificando a posição e pode provocar a subida de nível.

## Fluxo de dados

1. O aluno conclui a última aula publicada.
2. O members grava `course_complete` para o perfil e o curso.
3. A leitura dos desbloqueios consulta os cursos concluídos pelo perfil.
4. Para cada curso Kids vivo, a consulta aplica o critério conforme `careerSlot`:
   - bônus: aceita `course_complete`;
   - carreira: exige a interseção com `course_showcased`.
5. O serviço une os blocos desses cursos aos grants já congelados.
6. O Estúdio e a seção “Minhas ferramentas” recebem a união sem duplicatas.

A consulta de posições qualificadas da carreira permanece inalterada e continua considerando somente cursos com posição que possuem os dois marcos.

## Entrega permanente e alterações posteriores

O sistema mantém a promessa de que uma ferramenta entregue não desaparece. Quando a leitura serve novos blocos, ela congela o grant por aluno e curso no mecanismo existente de `studio_block_grants`.

As alterações posteriores seguem estas regras:

- remover uma ferramenta do curso afeta apenas quem ainda não a recebeu;
- acrescentar uma ferramenta ao curso entrega o novo bloco aos alunos que já atendem ao critério atual;
- apagar ou despublicar o curso preserva os grants congelados;
- transformar um bônus concluído em curso da carreira preserva ferramentas já servidas, mas alunos que ainda não as receberam passam a precisar do Mural;
- transformar um curso da carreira em bônus permite que alunos que já o concluíram recebam as ferramentas na próxima leitura, mesmo sem publicação.

## Consistência e falhas

Os eventos de conclusão e publicação permanecem idempotentes. Repetir a conclusão de uma aula ou receber novamente o webhook do Mural não duplica ferramentas.

O congelamento continua best-effort: uma falha ao salvar o grant não nega a ferramenta na leitura atual. O serviço tenta congelá-la novamente na próxima leitura. Uma falha ou atraso do Mural afeta somente cursos com posição na carreira.

Cursos bônus sem `studioUnlockBlocks` registram a conclusão normalmente e não entregam ferramenta. Esse estado é válido para conteúdo apenas informativo, embora a operação possa optar por sinalizá-lo no Admin no futuro.

## Interface e comunicação

O formulário do curso deve explicar a regra ao lado da posição na carreira e do seletor de ferramentas:

- bônus: “As ferramentas serão liberadas quando o aluno concluir todas as aulas.”
- com posição: “As ferramentas serão liberadas quando o aluno concluir o curso e publicar no Mural.”

A comemoração de ferramentas novas deve ocorrer no evento que efetivamente as libera: conclusão do curso para bônus; publicação no Mural para curso da carreira. Se todos os blocos já pertencem ao aluno, o sistema omite a comemoração de ferramenta e mantém as demais celebrações.

## Testes

O conjunto de testes deve provar:

1. bônus concluído sem `course_showcased` libera seus blocos;
2. bônus apenas publicado, sem `course_complete`, não libera blocos;
3. curso com posição apenas concluído não libera blocos nem qualifica a carreira;
4. curso com posição concluído e publicado libera blocos e qualifica sua posição;
5. bônus com vitrine libera no término do curso e não duplica grants após a publicação;
6. cursos Adult preservam o comportamento atual mesmo com `careerSlot = null`;
7. mudança de bônus para carreira preserva grants congelados e aplica o critério novo aos grants ainda não servidos;
8. mudança de carreira para bônus reconhece conclusões anteriores;
9. blocos repetidos entre cursos aparecem uma vez;
10. falha ao congelar um grant não remove o bloco da resposta atual.

## Fora do escopo

Este desenho não altera o momento em que cursos bônus ficam acessíveis, o cálculo dos níveis, os modos Blocos/Ponte/Pro, os requisitos de acesso ao Pinta, Pensa ou Zappy, nem os portões internos das aulas. Ele também não cria um novo tipo de conclusão, certificado ou comprovação manual.
