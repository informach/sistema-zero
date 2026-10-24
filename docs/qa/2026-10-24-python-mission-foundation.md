# Base dos objetivos Python — qualificação parcial

Checkout isolado `feat/python-mission-server-execution`, base `7bb81487f`.
Este lote NÃO modifica o caminho de correção de aulas implantado e NÃO fecha a
pendência de execução autoritativa Python.

## Alterações revisadas

- Validação compartilhada admite identificadores/módulos Python somente quando a
  linguagem é explicitamente Python; JavaScript mantém a validação padrão.
- O plano privado captura critérios antes do primeiro await e congela seus dados.
  Sondas contêm ações, seletores e argumentos; não levam respostas nem comparações.
- O julgador usa a régua existente de execução, confere projeto/revisão/runtime/
  tentativa/impressão dos objetivos e recusa relatórios extras, ausentes, duplicados,
  reaproveitados ou com booleanos de aprovação inseridos no lugar de observações.
- O observador Python captura valores/retornos reais e erros, sem receber o
  gabarito. Seus dados não são evidência de pixels/posição do renderer.
- Review local encontrou dois casos incompletos e os fechou com regressão:
  `found: true` sem valor no início poderia contar como mudança; retorno marcado
  `ok: true` com erro poderia ser julgado apenas pelo valor. Ambos são recusados.

## Evidência local de 24/10/2026

- Bun 1.3.11: 32 testes, 171 asserções, zero falhas/skip nos três arquivos
  `python-project-execution`, `project-execution` e `section-progression` do Core.
- CPython 3.12.10: sete testes reais de fixtures conhecidas no observador, zero
  falhas. Funções com mesma estrutura retornaram valores distintos; ramo morto não
  alterou a variável; exceções, mutação dos argumentos, módulo/coroutine, JSON
  limitado e identificadores foram conferidos.
- TypeScript 5.9.3 focado no contrato/teste, heap 768 MiB: exit 0.
- Biome nos três arquivos TS e `git diff --check`: exit 0.

Os testes Core fornecem fixtures de observação: não são execução do programa.
Os testes CPython rodam fontes locais conhecidas, sem código de usuários: não
qualificam Pyodide, CSP, worker, sandbox, gráficos, desempenho ou isolamento.

## Pendências obrigatórias

Conectar observador ao worker/protocolo e relatório S2S; implementar observação
real Turtle/Pygame Zero e controles; migrar autorização, progressão e autoria;
publicação/ensaio pelo Admin; timeout/saída/CPU/stale/cleanup; provas reais com
Admin/aluno e regressão JavaScript integrada. Distribuição/fingerprint/CI/deploy
vêm depois dessas etapas. Não expor esta base incompleta em staging/produção.

Plano executável:
`docs/superpowers/plans/2026-10-24-python-mission-execution-implementation.md`.
