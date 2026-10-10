# Arquivos de produção do Instagram

Esta pasta reúne as referências, capturas, transcrições, scripts de montagem e
versões de trabalho dos destaques e carrosséis. As imagens prontas para publicar
ficam em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/`.

Os arquivos HTML são exportações dos jogos, capturas da plataforma e montagens
geradas para renderização. Eles podem conter código empacotado e imagens em base64;
por isso, o Biome não os formata nem os analisa. Os scripts e arquivos JSON continuam
incluídos na validação. Para alterar uma montagem, edite o script que a produz.

As pastas `historico` preservam versões anteriores para referência. Para conferir
os arquivos finais e sua correspondência com a produção, execute:

```powershell
node output/instagram/verificar-entrega-2026-10-09.mjs
```
