# Manifesto como fonte do projeto inicial do Estúdio

## Decisão

Ao importar um manifesto de aula, o `initialProject` de cada bloco Estúdio vem sempre do manifesto, tanto em **Atualizar e preservar** quanto em **Substituir o rascunho**. Não há opção por curso. A regra anterior, que mantinha o projeto inicial já configurado no rascunho, impedia que uma reimportação aplicasse correções no projeto preparado.

## Limites

- O bloco Estúdio conserva seu ID; o importador continua protegendo contra a escolha ambígua entre vários blocos existentes.
- Só o projeto **inicial do rascunho** muda. A versão publicada não muda até uma publicação posterior. Entregas no servidor, rascunhos locais e progresso dos alunos não são alterados pela importação.
- O desenho inicial do Pinta, anexos de materiais, arte do certificado e vídeos vinculados seguem as regras atuais de preservação.
- A prévia deve indicar que o projeto inicial será atualizado quando for diferente; a interface e a especificação não podem continuar prometendo sua preservação.

## Verificação

Teste de integração pela API de autoria nos dois modos, com um Estúdio já configurado: o ID permanece e o `initialProject` após a importação é exatamente o do manifesto. Conferir que a aula publicada permanece igual e que uma segunda importação idêntica é estável. Executar os testes do importador, o validador dos manifestos do Cadê Todo Mundo? e as verificações de formatação dos arquivos alterados.
