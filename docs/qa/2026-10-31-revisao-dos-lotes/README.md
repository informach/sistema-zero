# Conferência dos lotes recebidos, 31/10/2026

Relatório completo: [revisão dos lotes](../../../.audits/architectural-analysis-2026-10-31-arquipelago-revisao-dos-lotes.md).

Base inicial `0660b62fd`; base final `542249c2f`. Outra sessão integrou B7c e conciliou o remoto durante a conferência. Esta revisão não fez commit, merge ou push, nem alterou código de produto.

## Navegador

Playground com plataforma falsa e `persistir=0`, Chrome local, computador 1280 × 800 e celular emulado 390 × 844. Nenhum acesso autenticado ou banco remoto.

No pacote `packages/arquipelago`:

```powershell
bun build playground/verificar-andar-e-terreno-browser.ts --target=node --external playwright-core --outfile .cache/revisao-31-andar-final.mjs
$env:ARQUIPELAGO_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:ARQUIPELAGO_PRINTS='../../docs/qa/2026-10-31-revisao-dos-lotes/542249c2f'
$env:ARQUIPELAGO_TEST_PORT='4618'
node .cache/revisao-31-andar-final.mjs
```

Resultado: passou. Valores registrados:

| Conferência | Resultado |
| --- | --- |
| Chão plano | Pés em 1,06 m |
| Alto do morrinho, depois de andar até lá | Pés em 2,56 m, diferença de 1,50 m |
| Pé da escada | Pés em 1,06 m, piso esperado 1,02 m |
| Piso superior e guarda-corpo | Pés em 5,18 m, piso esperado 5,12 m; corpo sustentado e contido na borda |
| Cômodo superior e piso aberto | Pés em 5,18 m |
| Piso superior no celular emulado | Pés em 5,18 m |
| Ferramentas | Terreno/Escada no térreo; ferramentas da camada superior; sem rolagem horizontal no celular |
| Farol | Escada `farol:escada-1` registrada; corpo de pé na base |

O medidor retornou 1 quadro/s na amostra inicial. É uma amostra do ambiente automatizado, não um ensaio comparativo de desempenho. Não houve medição em celular físico.

Capturas da base final:

- [Andar superior](542249c2f/andar-de-cima.png)
- [Guarda-corpo](542249c2f/guarda-corpo.png)
- [Porta e piso aberto](542249c2f/porta-de-lambri-do-andar.png)
- [Casa no celular](542249c2f/casa-com-andar-celular.png)
- [Construir no celular](542249c2f/construir-celular.png)
- [Subida do Farol](542249c2f/subida-do-farol.png)

Os arquivos em `0660b62fd/` pertencem à tentativa anterior. Ela parou com `não subiu a escada`: o verificador colocava o centro do corpo dentro do piso. B7c corrigiu o posicionamento e a leitura do corpo, e a repetição passou. A captura do pé da escada na base final tem enquadramento muito próximo do avatar após o giro usado pelo ensaio; serve como registro da execução, não como aprovação do enquadramento visual de toda a experiência.

## Regras, integração e tipagem

- Jogo, suíte completa antes de B7c: 1.999 passaram, 1 ignorado por dependência de Postgres, 0 falhas.
- Contratos: 257 passaram, 0 falhas.
- Core/diálogo/Members, cinco arquivos dirigidos: 32 passaram, 0 falhas.
- Construção depois de B7c, quatro arquivos: 116 passaram, 0 falhas. Não somar como testes exclusivos aos 1.999 anteriores.
- Tipagem do jogo com 8 GB: passou antes e depois de B7c.
- Biome no diff TS/TSX/JSON selecionado: 531 arquivos, passou antes e depois de B7c, sem correção automática.
- Reprodução de resposta perdida da obra: confirmou descarte da edição posterior.
- Reprodução do Desfazer: confirmou `quebra-o-andar`, mantendo a escada guardada.
- Farol: os cinco critérios causais aprovam eventos atrás de variável sempre falsa; o executor real aprova o movimento preservado, 1 teste e 5 asserções.

Logs descartáveis em `.cache/revisao-31-*.log`, na raiz. Reproduções em `.cache/revisao-31-obra.ts`, `.cache/revisao-31-desfazer.ts`, `.cache/revisao-31-farol.ts` e `packages/studio-runtime/.cache/revisao-31-farol-browser.test.ts`. O relatório descreve os passos para repetir os achados sem depender desses arquivos temporários.

## Limites

Não foram conferidos aqui: percurso completo do Farol até o final, criação de iglu pela interface, retomada autenticada da obra, fluxos reais de compra/recompensa, dois aparelhos, toque e desempenho em celular físico. Os defeitos de continuidade foram reproduzidos na loja real com serviço falso controlado, permitindo simular precisamente a resposta perdida sem escrever em banco.
