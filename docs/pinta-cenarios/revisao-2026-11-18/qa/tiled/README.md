# Saídas do Tiled 1.12.2

`mapa-0.json` e `mapa-1.json` são os arquivos efetivamente gravados pelo executável
Windows do Tiled ao abrir os TMX da Vila/Cabana. Não são fixtures escritas à mão.
Os caminhos de imagens/TSX continuam relativos à estrutura do pacote original.
As cópias versionadas normalizam somente LF e espaços no fim da linha. O JSON é
integralmente igual ao da saída bruta; [origem.json](origem.json) conserva os hashes
brutos e normalizados e a comprovação dessa igualdade.

Para reproduzir a comparação na raiz do repositório:

```powershell
bun packages/pinta/scripts/homologacao/generate.ts .tmp/pinta-tiled-prova
Copy-Item docs/pinta-cenarios/revisao-2026-11-18/qa/tiled/mapa-0.json .tmp/pinta-tiled-prova/tiled/mapas/mapa-0/mapa.json
Copy-Item docs/pinta-cenarios/revisao-2026-11-18/qa/tiled/mapa-1.json .tmp/pinta-tiled-prova/tiled/mapas/mapa-1/mapa.json
bun packages/pinta/scripts/homologacao/verify-tiled.ts .tmp/pinta-tiled-prova/tiled
```

O último comando compara a cena inteira com `maps.json`, inclusive objetos, propriedades,
camadas e tilesets, e exige zero avisos. Ele não inicia o Tiled; as duas saídas versionadas
são a prova da etapa externa. Para repetir também essa etapa, execute
`tiled --export-map json <mapa.tmx> <mapa.json>` antes da comparação. No Windows, espere o
processo terminar com `Start-Process -WindowStyle Hidden -Wait -PassThru`.
