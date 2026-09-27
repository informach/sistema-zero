# Manifestos que criam os blocos da aula

Os manifestos atuais devem descrever o conteúdo dos blocos de Estúdio, Pinta, materiais e certificado. A importação em uma aula nova cria esses blocos com IDs estáveis derivados das chaves. Reimportar a aula atualiza a configuração declarada sem trocar o ID; quando o rascunho já tem um único bloco do mesmo tipo, a importação conserva seu ID para preservar evidências de alunos. Havendo dois candidatos, a prévia recusa a escolha ambígua. Em blocos existentes, o projeto inicial do Estúdio, o desenho do Pinta, os itens anexados a materiais e a arte/assinaturas/cor do certificado ficam sob autoria manual e não são apagados pelo manifesto.

Cada projeto inicial do Estúdio é um snapshot atual com nome, modo de blocos e extensão oficial `game-2d`. Os cursos contínuos usam `chain` e a mesma instância de projeto dentro da aula. A introdução do Desafio recebe um projeto de treino pronto; as demais aulas têm um projeto inicial adequado ao ponto de partida e aproveitam a entrega anterior pela cadeia. As entregas pela galeria declaram limites e tipo de ferramenta.

Os manifestos deixam de usar `existing`. O contrato valida os conteúdos novos antes da prévia; o importador aplica a mesma validação de autoria usada pelo editor. Vídeos continuam planejados para vinculação manual. Materiais privados exigem anexos reais da aula: como os dois PDFs da introdução não estão versionados, a importação cria o bloco vazio com o título correto e a publicação/roteiro deve assinalar que os PDFs ainda precisam ser enviados.

Verificação: importar cada manifesto em rascunho vazio, reimportar sem mudança, testar preservação de ID em rascunho existente e recusa de ambiguidade; rodar a suíte de manifestos e a validação do projeto inicial no Estúdio.
