# Reproduzir a autoria visual dos jogos

Os dois arquivos `*.edits.json` contêm os inputs usados na qualificação R4.
A única diferença de bytes é um LF final exigido pelo formatter; o JSON é igual
e os originais R4 foram preservados. Cada um altera uma coordenada, uma velocidade e uma cor por
caminho estrutural de bloco, com valor anterior obrigatório. Se a fonte mudar,
uma recusa por caminho ou valor divergente exige investigar e requalificar;
não ajuste os inputs somente para obter um resultado positivo.

| Input | SHA-256 original R4 | SHA-256 versionado com LF |
| --- | --- | --- |
| `pacman-visual.edits.json` | `54077e87491c0193970b10aee8568a9ebfec681bbcc2b9ab3abe73776a165498` | `b0c816eb24f3fa3102ff6ee6c7522ec4ebac000071607395402374757a5d3749` |
| `space-arena-visual.edits.json` | `f7ad89a41f1ed3ca9ade2ed2890ee54ebf47a6b7de9a408cdceb804a911577e3` | `7c0730b8526e9e91e99c624904705b9bde6d53bff9830c093856ad1736d7b8fb` |

Use Bun **1.3.11**, Node **24.22.0**, as dependências do lockfile e a distribuição
atual `e3188c84b1b63baee730656ea1399e6ee4d03946e6cbe6cbee57ef92bc43f8e9`.
Para obtê-la em outro computador, siga a [reprodução canônica](../../../../../../docs/superpowers/plans/2026-10-22-python-current-candidate/README.md).
Não use o caminho absoluto de distribuição gravado no plano por outra máquina.

Na raiz do checkout, execute em PowerShell 7. O diretório de saída deve ser novo.
Os comandos extraem a release e a lista de blocos do plano **offline** versionado:
isso configura a paleta deste teste local, sem consultar nem atestar autorização
de um host remoto. A paleta de 255 IDs do plano corresponde à usada na R4.

```powershell
$ErrorActionPreference = 'Stop'
$node = (Get-Command node -CommandType Application).Source
if ((& $node --version) -ne 'v24.22.0') { throw 'Use Node 24.22.0' }
$plan = Get-Content -Raw docs/superpowers/plans/2026-10-22-python-current-candidate/canonical-plan.json | ConvertFrom-Json
$sha = 'e3188c84b1b63baee730656ea1399e6ee4d03946e6cbe6cbee57ef92bc43f8e9'
if ($plan.input.distribution.sha256 -ne $sha) { throw 'O candidato atual mudou: confira o plano e a evidência' }
$distribution = (Resolve-Path ".cache/python-current-build/distributions/$sha").Path
$output = Join-Path (Get-Location) '.cache/visual-reference-local'
if (Test-Path -LiteralPath $output) { throw 'Escolha uma saída nova' }
New-Item -ItemType Directory -Path $output | Out-Null
$release = @($plan.configuration.members.catalog.releases | Where-Object { $_.manifest.programmingLanguage -eq 'python' })
if ($release.Count -ne 1) { throw 'Release Python ambígua' }
$approval = @($plan.configuration.members.releases | Where-Object {
  $_.runtime.profileId -eq $release[0].profileId -and
  $_.runtime.releaseId -eq $release[0].releaseId -and
  $_.runtime.manifestSha256 -eq $release[0].manifestSha256
})
if ($approval.Count -ne 1) { throw 'Paleta local ambígua' }
$utf8 = [Text.UTF8Encoding]::new($false)
$releasePath = Join-Path $output 'release.json'
$blocksPath = Join-Path $output 'candidate-block-ids.json'
[IO.File]::WriteAllText($releasePath, (ConvertTo-Json -InputObject $release[0] -Depth 100), $utf8)
[IO.File]::WriteAllText($blocksPath, (ConvertTo-Json -InputObject @($approval[0].blockIds) -Depth 10), $utf8)
foreach ($game in @('pacman-visual', 'space-arena-visual')) {
  $result = & bun --no-env-file packages/studio/scripts/python/visual-example-qualification.ts `
    --node $node --distribution $distribution --distribution-sha256 $sha `
    --runtime-release $releasePath --approved-block-ids $blocksPath `
    --source "packages/studio/src/examples/python/$game/main.py" `
    --edits "packages/studio/scripts/python/fixtures/visual-reference-games/$game.edits.json"
  if ($LASTEXITCODE -ne 0) { throw "Qualificação recusada: $game" }
  [IO.File]::WriteAllText((Join-Path $output "$game.json"), ($result -join "`n"), $utf8)
}
```

Os resultados exigem zero blocos opacos, AST preservada após salvar/carregar o
workspace completo, renderização Python reanalisada e as três edições refletidas
na fonte e no workspace reaberto. O analisador usa um subprocesso Node serial,
heap de 1024 MiB e CPython 3.14.2/Pyodide 314.0.7 da distribuição conferida.
Python 3.12 não substitui esse analisador.

Para executar também os dez testes configurados, sem ignorar os casos WASM:

```powershell
$env:PYTHON_VISUAL_QA_NODE = $node
$env:PYTHON_VISUAL_QA_DISTRIBUTION = $distribution
$env:PYTHON_VISUAL_QA_DISTRIBUTION_SHA256 = $sha
bun --no-env-file test packages/studio/scripts/python/visual-example-qualification.test.ts --preload ./packages/studio/test-setup.ts
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes do qualificador' }
```

Os [recibos públicos R4](../../../../../../docs/continuity/2026-10-22-python-reference-games-visual-evidence/)
registram os resultados originais. Esta qualificação é de AST e Blockly sem
interface gráfica: não executa os jogos, não certifica desempenho, não mede o
efeito visual da constante alterada e não concede capacidades ao runtime. Os
testes de interface, execução e controles em pixels são evidências separadas.
