# Recuperação limitada ao dono exato

## Reprodução

Uma chave nativa usa projeto e escritor como componentes. Um escritor contendo dois-pontos podia fazer a busca por prefixo de outro ID alcançar um journal válido de seu dono original. O replay criava uma cópia fora do projeto solicitado; o fallback devolvia um documento com ID diferente do pedido. Os dois comportamentos foram reproduzidos em testes vermelhos, sem alterar o contrato dos identificadores.

## Correção

Após validar a identidade da chave e o documento, o replay com projeto específico confere também `recovery.projectId === projectId`. O fallback aplica a mesma igualdade com o ID solicitado. A leitura global continua autorizada a recuperar todos os projetos. Nenhum journal de outro dono é consumido, removido ou normalizado pela leitura específica.

## Evidência local na branch da missão

- Reprodução vermelha: `recovery-owner-prefix-main-red.txt`.
- Recuperação: 23 testes / 90 asserções, zero falhas.
- Armazenamento/persistência/migrações: 458 testes / 2.441 asserções / 71 arquivos, 42,06 s, zero falhas.
- Typecheck completo incremental: saída 0.
- Lint/organização dos dois arquivos: saída 0.

Logs locais ignorados em `.cache/mission/recovery-owner-prefix-main-*`. O laboratório aplica a mesma proteção ao intake v3→v4, em sua branch separada. Não houve mudança visual nem alteração dos blocos das aulas.


Gates finais desta revisão: typecheck completo incremental com saída 0; lint dos cinco arquivos alterados com saída 0; bundle inicial 367.761 bytes brutos / 119.635 gzip, 1 teste / 35 asserções, limites originais. Logs `python-static-server-typecheck.txt`, `python-static-server-reviewed-lint.txt` e `recovery-owner-export-bundle.*`. A CI do novo HEAD ainda precisa qualificar os ambientes remotos.
