# Conquistas de blocos ao concluir oficinas

## Regra aprovada

Concluir uma oficina equivale a concluir o curso ao vivo para conceder os IDs
configurados em `metadata.studioUnlockBlocks`. A conquista é do aluno e público;
não concede o produto Estúdio Completo nem substitui os direitos atuais de
produto/jornada/modos. Funciona com IDs JavaScript e Python, sem equivalências
automáticas entre linguagens. Admin mantém seu acesso integral homologado.

## Arquitetura

O evento existente `live_course_complete` comprova conclusão. Entrar na sala,
receber uma vaga ou ganhar acesso gratuito não cria esse evento. A consulta
compartilhada de elegibilidade associa `recorded` a `course_complete` e `live`
a `live_course_complete`, sempre no perfil/público correto e curso publicado.
Oficinas não exigem publicação no Mural para conceder seus blocos.

O award congela as concessões na mesma transação do evento, com idempotência.
Isso preserva ferramentas após editar, despublicar ou remover o curso, mesmo
quando o aluno ainda não possui o Estúdio Completo. A leitura continua conciliando
a união atual e congelada, incluindo conclusões anteriores registradas. Nenhum
bloco histórico é inventado onde não havia recompensa configurada.

Conquistas de oficina ficam separadas dos marcos da Jornada do Criador. Não
alterar rank, posições de curso, XP, moedas, troféus ou a exigência de Mural dos
cursos gravados. O mesmo evento não deve virar `course_complete` artificial.

O Admin passa a oferecer o seletor de recompensas também para cursos ao vivo.
As dependências Python continuam explícitas e validadas. Clonar um curso para
ao vivo preserva suas recompensas. A UI explica que ferramentas conquistadas e
licenças do produto são direitos diferentes.

## Limites

Sem nova tabela ou migração. Sem nova regra de presença ou conclusão. Sem
alterar limites de vagas, concessão gratuita de inscrições, fontes dos jogos,
classes, runtimes, roteiros ou manifestos pedagógicos. O usuário pediu manter
os exemplos atuais sem classes para encerrar a entrega.

## Provas

Cobrir ausência de conclusão, evento/modalidade incorretos, conclusão real,
repetição, perfil/público, recompensas mistas, congelamento na transação,
preservação após edição/despublicação e conquista antes de possuir o produto.
Provar que a compra/permissão do Estúdio continua necessária e que os critérios
dos cursos gravados e da Jornada permanecem iguais. UI real do formulário deve
mostrar, salvar e validar recompensas ao vivo sem perder a outra linguagem.
