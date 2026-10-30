# Corrida da Vila: repertório da trilha

Conferência local em 30/10/2026, Chrome instalado nesta máquina. Entrada por teclado em
1280 × 844 e toque real via CDP em contexto móvel de 390 × 844. Celular emulado, não aparelho
físico. Sem conta, banco ou serviço remoto. A página usa o projeto gerado e o runtime oficial.

## Resultado visual

Oito casos aprovados, registrados em `resultado.json` e nas capturas ao lado. Em cada jogo:
Enter/+ dá a largada, as setas conduzem pela rua, a entrega encerra a tentativa e Espaço/A
recoloca no começo, limpa o recado e zera a contagem. Duas entregas conta a primeira parada
uma vez; Caixa usa a rua de baixo; Oito segundos também encerra por prazo e aceita repetir.
Não houve erro de console, pedido de recurso externo ou rolagem horizontal.

O primeiro ensaio passou no computador e encontrou o controle de toque configurado só com
setas. A configuração foi corrigida para `auto`; a execução final repetiu os oito casos.
As capturas de computador e celular foram inspecionadas. A arte existente foi preservada,
e o botão decorativo foi substituído por instruções, sem deixar uma figura clicável inerte.

```powershell
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun docs/desafios-do-jogo/vila-doce/conferir-corrida-browser.ts
```

O executor comportamental, os negativos e os demais comandos ficam registrados no plano
`docs/superpowers/plans/2026-10-30-arquipelago-vila-repertorio.md`. Esta conferência não
comprova publicação no Members, execução autenticada no Estúdio ou desempenho físico.
