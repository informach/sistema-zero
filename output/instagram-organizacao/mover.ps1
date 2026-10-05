$ErrorActionPreference = 'Stop'
$igRoot = (Resolve-Path -LiteralPath 'docs/marketing/kids/comunidade-dos-criadores/instagram').Path
$igMoves = [ordered]@{
  'README.md' = 'historico/README-antes-da-consolidacao-2026-10-04.md'
  'copy-perfil-e-fixados-2026-10-03.md' = 'historico/copy-perfil-e-fixados-2026-10-03.md'
  'proposta-destaques-e-fixados-2026-10-04.md' = 'historico/proposta-destaques-e-fixados-2026-10-04.md'
  'calendario-2026-10-03.md' = 'historico/calendario-2026-10-03.md'
  'copy-home-2026-10-03.md' = 'historico/copy-home-2026-10-03.md'
  'implementacao-home-2026-10-03.md' = 'historico/implementacao-home-2026-10-03.md'
  'posicionamento-entrada-2026-10-03.md' = 'historico/posicionamento-entrada-2026-10-03.md'
  'operacao-e-links-2026-10-04.md' = 'apoio/links-e-publicacao.md'
  'valor-e-demonstracao-2026-10-03.md' = 'apoio/valor-e-demonstracao-2026-10-03.md'
  'capacidades-redes-sociais-2026-10-04.md' = 'apoio/capacidades-redes-sociais-2026-10-04.md'
  'analise-bio-kodland-2026-10-04.md' = 'pesquisas/analise-bio-kodland-2026-10-04.md'
  'analise-postagens-kodland-2026-10-04.md' = 'pesquisas/analise-postagens-kodland-2026-10-04.md'
  'auditoria-e-decisoes-2026-10-04.md' = 'pesquisas/auditoria-e-decisoes-2026-10-04.md'
  'pesquisa-2026-10-03.md' = 'pesquisas/pesquisa-2026-10-03.md'
  'pesquisa-aprofundada-2026-10-03.md' = 'pesquisas/pesquisa-aprofundada-2026-10-03.md'
}
foreach ($igMove in $igMoves.GetEnumerator()) {
  $igSource = (Resolve-Path -LiteralPath (Join-Path $igRoot $igMove.Key)).Path
  $igDestination = [IO.Path]::GetFullPath((Join-Path $igRoot $igMove.Value))
  if (-not $igSource.StartsWith($igRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or -not $igDestination.StartsWith($igRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Caminho fora da pasta autorizada.' }
  if (Test-Path -LiteralPath $igDestination) { throw "Destino já existe: $igDestination" }
}
foreach ($igFolder in @('apoio', 'pesquisas', 'historico')) {
  New-Item -ItemType Directory -Path (Join-Path $igRoot $igFolder) -Force | Out-Null
}
foreach ($igMove in $igMoves.GetEnumerator()) {
  Move-Item -LiteralPath (Join-Path $igRoot $igMove.Key) -Destination (Join-Path $igRoot $igMove.Value)
}
$igMoves | ConvertTo-Json | Set-Content -LiteralPath 'output/instagram-organizacao/movimentos.json' -Encoding utf8
Write-Output '15 documentos organizados; evidências preservadas no mesmo local.'
