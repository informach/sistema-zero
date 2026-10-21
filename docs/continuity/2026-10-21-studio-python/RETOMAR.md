# Retomar na outra máquina

O código, o relatório principal e os 382 snapshots estão em **staging remoto**.
O checkpoint integrado da transferência é `b46a7503ece32f704927c54a73d37e241873b452`;
os commits posteriores deste documento apenas completam as instruções de acesso.

## Mensagem para colar na nova sessão

> Continue o trabalho do Estúdio JavaScript/Python já iniciado. Atualize staging e leia primeiro docs/continuity/2026-10-21-studio-python/RETOMAR.md, depois docs/superpowers/plans/2026-10-21-transferencia-estudio-python.md e os três anexos indicados. O checkpoint de origem é b46a7503ece32f704927c54a73d37e241873b452. Os planos, scripts preparados, fixtures, observadores e recibos estão versionados em docs/continuity/2026-10-21-studio-python; confira inventory.json e execute verify.ps1 antes de restaurar o recorte necessário. Baixe e confira o ZIP complementar do GitHub conforme RETOMAR.md. Faça o inventário do ambiente novo, confira o remoto atual e recrie dependências, autenticação, paths, pins e ownership. Priorize concluir a homologação JavaScript para gravação, mantendo Python disponível na interface de criação somente para admin/superadmin; depois feche a matriz Python. Preserve falas, roteiros e valores ensinados: a flexibilidade é da verificação dos objetivos. Não reaplique branches antigas inteiras, não repita testes já aprovados sem motivo e não transforme negativos em positivos. As outras sessões ficaram suspensas para a transferência: os ACKs antigos não são novas tarefas. Continue em lotes com revisão; faça full review, corrija achados, valide e integre em staging. Produção e homologação completa ainda não estão aprovadas.

## Obter o código

Se ainda não existir checkout:

```powershell
git clone --branch staging https://github.com/informach/sistema-zero.git C:/trabalho/sistema-zero-python
Set-Location C:/trabalho/sistema-zero-python
```

Se já existir, conferir alterações locais antes de atualizar; não resetar trabalho
existente para seguir estas instruções. Conferir que o checkpoint de origem faz
parte do histórico do checkout atual.

## ZIP complementar no GitHub

O arquivo está em um [rascunho de release de transferência](https://github.com/informach/sistema-zero/releases/tag/untagged-bfeaa5a58dc774a45fc5),
tag `studio-python-handoff-20261021`. É necessário autenticar no GitHub com uma
conta que tenha acesso ao rascunho do repositório. Não publicar esse rascunho como
uma versão do produto.

O download pela CLI foi executado nesta preparação e seu SHA-256 conferiu com o
arquivo enviado e com o digest informado pelo GitHub. O arquivo não depende de
continuar com o computador antigo ligado.

| Arquivo | Bytes | SHA-256 |
| --- | ---: | --- |
| `transfer-estudio-python-20261021.zip` | 42.862.805 | `97a27e131e263caa2464dc00a7f955e2b2996506e46eb069d2a01669d0b85f78` |

No checkout restaurado, com a GitHub CLI autenticada:

```powershell
gh release download studio-python-handoff-20261021 --repo informach/sistema-zero --pattern transfer-estudio-python-20261021.zip --dir .cache/studio-python-transfer-20261021
$archive = '.cache/studio-python-transfer-20261021/transfer-estudio-python-20261021.zip'
$expected = '97a27e131e263caa2464dc00a7f955e2b2996506e46eb069d2a01669d0b85f78'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'SHA-256 do pacote divergente' }
Expand-Archive -LiteralPath $archive -DestinationPath .cache/studio-python-transfer-20261021/pacote
& ./.cache/studio-python-transfer-20261021/pacote/verificar-pacote.ps1
& ./docs/continuity/2026-10-21-studio-python/verify.ps1
```

Usar diretório novo; os comandos não autorizam sobrescrever uma extração anterior.
Caso a CLI ainda não esteja autenticada, usar o login normal do GitHub; não copiar
tokens, cookies ou configurações de autenticação do computador anterior.

O pacote contém 433 arquivos conferidos, mais o manifesto final: relatório,
anexos, bundle incremental, distribuição gerada, exportações com mídias e
evidências. Os paths curtos permitem sua extração no Windows. A pasta de
evidências não deve ser copiada sobre o código atual: os manifestos mantêm o
mapeamento de origem, e os planos históricos precisam de preparação nova.

Os helpers de execução com Windows Job foram preparados para Windows. Conferir
o sistema operacional da máquina nova antes de escolher como executar os testes.
O pacote e os snapshots não contêm uma instalação pronta de ferramentas,
`node_modules`, venv ou credenciais de provedores.

O CI e os deployments devem ser conferidos pelo SHA atual de staging. O envio dos
arquivos e o download verificado não constituem aceite funcional ou liberação de
produção.
