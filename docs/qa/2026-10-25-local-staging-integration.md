# Base local integrada para as próximas sessões

Composição: `754e4411a` (catálogo empacotado, Pygame-ce e correções dos geradores) com
`baf7e20ae` (revisões Python, permissões, Raylib e melhorias das extensões JavaScript).

Conflitos conciliados:

- PythonBlocklyEditor conserva a resolução de módulos autorais e os rótulos dos parâmetros.
- A seleção de codecs mantém Pygame-ce e a ordenação específica de cada extensão; a seleção
  por recursos do runtime permanece centralizada na ordenação.
- Os nomes de funções e parâmetros usam o identificador Python compartilhado.
- A análise de escopo mantém classes Pygame e as guardas adicionais de Turtle: Screen não é
  tratado como objeto novo, atribuições encadeadas não têm dono único, e `__new__`/metaclasses
  impedem presumir que um objeto autoral não possa ser oficial.
- O protocolo gráfico unificado usa comandos distintos: ROUND_RECT 11, CIRCLE_PART 12,
  PIXELS 13. O produtor Python e o consumidor TypeScript concordam, com teste de unicidade.
- As evidências documentais dos dois históricos foram mantidas.

Validação desta conciliação: dez arquivos de testes executados em processos separados no
ambiente do Studio, todos verdes; análise estática dos 271 arquivos selecionados pelo merge
sem erros, perfil de validação do runtime e diff check conferidos. A primeira invocação do
teste de renderer na raiz não carregou o DOM do Studio; foi corrigida pelo cwd canônico.

## Estado operacional

Este merge entrega uma base local; não declara deploy ou aceite integral. A distribuição
Pygame `74b006e5…` foi preparada antes das mudanças novas de renderer/interpreter deste merge.
Seu upload para staging terminou com limpeza confirmada, sem ativação. Ela não qualifica esta
nova composição: gere outra distribuição/plano/catálogo e repita os gates afetados antes da
ativação final. Não reutilize os recibos antigos como prova do motor recém-conciliado.

Continuam pendentes CI integrado, implantação/ativação coordenada, provas hospedadas finais
e fechamento financeiro. As rotinas financeiras novas não foram habilitadas em produção.
Nenhuma conta real foi usada para cobrar ou cancelar durante estas provas.

## Complemento do catálogo integrado

A nova distribuição foi gerada depois do merge: `ecb8756beb4b6b0450aa3fdb5ffc9ec70a53d16f72a8ec4d264477e99de47735`,
125 arquivos. O catálogo empacotado correspondente é
`3cbc366dcb213c5f26d996aef7898e0a1d47bce340fe501539982fcd33f3231d`.

A aplicação do currículo real sobre esse catálogo detectou uma omissão: os codecs Pygame-ce
não participavam de `PYTHON_COURSE_BLOCKS`, embora o runtime os aprovasse. O teste causal
falhou antes e passou após incluir a extensão no catálogo de cursos. A prova do currículo
integrado confirmou os 696 blocos aprovados para admin, cinco extensões e zero dependências
ausentes; aluno sem conquistas continua com zero blocos/extensões. Isso verifica a seleção
de permissões em código, não substitui a abertura autenticada de um projeto na interface.
