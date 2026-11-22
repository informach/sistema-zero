# Unidades causais do Pinta no Members

O candidato `fdb196192efaad0ed303c7c2ba2d0104232c9355` passou nos ensaios de publicação, retomada e recuperação do servidor. O ensaio HTTP iniciou a composição de produção quatro vezes em portas locais efêmeras e usou um banco PostgreSQL descartável. O protocolo de entrada do BFF foi exercitado com as credenciais de teste do consumer `member-shell`. A verificação de assinatura do Gateway e a selagem dos bytes no armazenamento de objetos pertencem ao ensaio integrado separado.

| Verificação | Resultado |
| --- | --- |
| Repositório causal no PostgreSQL 16.13 | 19 testes e 124 asserções |
| Servidor HTTP completo e PostgreSQL | 1 cenário e 30 asserções |
| Contratos Core | 3 testes e 31 asserções |
| TypeScript de Members | Saída 0 |
| Reserva, commit e limpeza legados em SQL | 25 testes e 219 asserções |
| Purga de dados pessoais | 4 testes e 42 asserções |
| HTTP legado e serviço de limpeza | 64 testes e 593 asserções |

O [índice](indice.json) registra o commit, o comando, o alvo, o código de saída e o SHA-256 de cada log. Os arquivos usam UTF-8 e LF. Caminhos absolutos do worktree foram substituídos por `<worktree>`. O índice inclui também o hash de cada log original. Os arquivos 08 a 10 registram os casos que falharam antes das correções. O arquivo 11 registra três timeouts sob carga simultânea. A repetição sequencial preservou o limite de cinco segundos de cada teste e passou nos 19 casos.

Execute os comandos de Members a partir de `packages/members`. Os testes de banco exigem URLs locais explicitamente descartáveis nas variáveis do índice. O harness causal aplica as migrações reais de forma aditiva e recusa um banco já ocupado. A purga trunca os dados de seu banco de teste, e o fixture legado prepara as próprias tabelas. Use bancos separados para cada variável. A execução documentada usou quatro bancos locais na porta 55553.

Para verificar os recibos, execute no PowerShell a partir desta pasta.

```powershell
$indice = Get-Content -Raw -Encoding utf8 ./indice.json | ConvertFrom-Json
foreach ($gate in $indice.gates) {
  $hash = (Get-FileHash -LiteralPath $gate.arquivo -Algorithm SHA256).Hash
  if ($hash -ne $gate.sha256) { throw "Hash divergente em $($gate.arquivo)" }
}
```
