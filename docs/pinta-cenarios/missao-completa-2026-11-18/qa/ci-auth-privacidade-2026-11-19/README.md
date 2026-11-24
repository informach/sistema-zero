# Contrato de identidade nas fixtures do Auth

O CI completo `44638651291` chegou aos testes PostgreSQL do Auth e encontrou
quatro expectativas antigas: ausência de `publicNickname` na busca
administrativa e uso do nome privado nos seletores/tokens de aluno.

O contrato de produção já distingue nome privado, apelido de exibição e
visibilidade pública. Foram alterados somente dois arquivos de teste:

- A busca administrativa continua exigindo igualdade completa, incluindo
  `publicNickname: null` na linha legada.
- As três fixtures familiares declaram apelidos distintos (`estrela`, `lua`,
  `cometa`), e as verificações de autorização continuam identificando quem
  tem acesso. O JWT exige o apelido e verifica que o nome privado não aparece.
- Ter apelido não ativa o perfil público: o campo `pub` continua `false`.
  Um caso adicional usa perfil legado sem apelido e exige `Criador(a)`, sem
  nome privado ou campo `nickname` no token.

Nenhum código de autenticação, migração, permissão ou contrato de produção
foi modificado. Não foram removidas asserções de acesso, revogação ou família.

## Verificação local real

PostgreSQL 16.16 Windows, em cluster próprio sob `.cache`, escutando somente
`127.0.0.1:55486`. Binários portáteis vieram da
[distribuição indicada pelo PostgreSQL](https://www.postgresql.org/download/windows/)
e da [página oficial da EDB](https://www.enterprisedb.com/download-postgresql-binaries).
Origem, tamanho e SHA-256 constam em `origem.json`. O cluster foi encerrado
após a execução; seus dados descartáveis foram preservados localmente.

As guardas dos testes exigem o nome `marketing_review_tests`; ele foi criado
somente nessa instância isolada. A prova de migração de admissão recebeu um
novo banco `kids_journey_auth_pinta_*_ci` em cada execução, conforme sua guarda.
Não houve conexão de teste a banco de staging ou produção.

```powershell
# DATABASE_URL, TEST_DATABASE_URL e MARKETING_TEST_DATABASE_URL apontam
# para postgres://pinta_ci@127.0.0.1:55486/marketing_review_tests.
# PROFILE_ADMISSION_TEST_DATABASE_URL aponta para um banco local NOVO
# kids_journey_auth_pinta_*_ci.
bun run --cwd packages/auth db:migrate
bun test --cwd packages/auth tests/db
bun run --cwd packages/auth typecheck
```

Antes: **71 aprovados, quatro falhas**, os mesmos casos do CI. Depois:
**76 aprovados, zero falhas/omissões, 375 asserções**, seis arquivos, 9,98 s.
Tipos do Auth e Biome dos dois testes passaram. Os resumos conservam o
resultado dos casos; SHA-256 dos logs locais completos está em `origem.json`.
Isso não substitui a nova execução completa no CI Linux.
