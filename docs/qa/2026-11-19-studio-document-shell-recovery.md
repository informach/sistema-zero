# Preservação do documento na carga leve

## Problema comprovado

O diagnóstico Windows `135989545215`, do run `44646270182`, registrou uma
tecla pendente no Vale Ensolarado (na mão). Editor e jogo responderam à
sondagem, enquanto uma nova navegação mudou CSS e o HTML salvo: o título
ganhou “(na mão)” e o viewport deixou de usar `initial-scale=1.0`.

`loadProjectShellById` não lê a partição da IR. O painel preservava
`current.ir.htmlShell`, mas essa IR podia estar nula. A primeira geração
então substituía a casca existente pelos padrões do gerador.

## Correção

`blockGenerationInput` recupera a casca dos arquivos salvos quando ela
não está na IR. Reutiliza o parser HTML existente, com uma leitura de
metadados que não reconstrói o corpo em IR e não analisa CSS ou JavaScript.
DOCTYPE, atributos de html, head, placements externos/inline e módulo inline
seguem o contrato existente. A casca já disponível na IR continua prioritária.

A comparação com o documento padrão evita introduzir apenas uma diferença
de serialização de tags vazias nos projetos que já usam os padrões. O
cabeçalho JavaScript da hidratação também considera o script inline real.
Uma edição de blocos continua gerando normalmente.

Se a recuperação falhar, a geração é interrompida e Problemas informa que
o código foi preservado. A falha não vira uma casca vazia sobre o projeto.
Não houve migração de formato, novo armazenamento ou mudança visual.

## Evidências locais

- Antes: dois testes de metadados/placement falharam com a política anterior.
- Depois: 49 testes/136 asserções de recuperação e parsers HTML/projeto passaram.
- Incluídos documento profundo, JS inválido que não precisa ser analisado,
  preservação dos dados após falha do parser, casca padrão e script inline.
- Cinco testes no Chromium completo passaram, incluindo o Vale preservando
  título/viewport e os casos de abertura e fonte nas larguras 390/1280.
- As primeiras montagens dos dois cursos protegidos passaram novamente,
  sem atualizar referências. Isso não qualifica Verificar/Enviar/Concluir
  na página real do Members.
- TypeScript da árvore local passou sem erros.
- A guarda do bundle inicial passou: 53 asserções, sem ampliar orçamentos.

A ordenação CSS identificada no mesmo diagnóstico é uma causa separada de
recarga e continua em investigação. A preservação da casca não é apresentada
como fechamento de toda a falha intermitente de entrada ou da missão global.
