# Quadros complementares da Vila Doce

Conferência local de 29/10/2026. Cinco atividades novas para os quadros 1 a 5; corrida e
variações anteriores preservadas integralmente na comparação semântica com o Git.

## Provas realizadas

- Repertório dos dois públicos, IR, determinismo e objetivos: 1 teste, 136 asserções.
- Blockly: 18 projetos abertos e JavaScript regenerado idêntico, 36 asserções.
- Fonte/JSON, contrato e HTTP em memória: 25 testes, 2.784 asserções. Inclui importação,
  exportação e reimportação das nove entradas por público, sem misturar os públicos.
- Executor oficial com Chrome: 20 cenários, 90 asserções, 87,26 s. Gabaritos positivos;
  iniciais, condições removidas e reinício ausente negativos. Falha de infraestrutura não
  conta como reprovação pedagógica. Log local `.cache/arquipelago-vila-quadros-executor-r1.log`.
- Navegador visual: `r1/resultado.json`, 10 casos com execução e reinício, cinco por teclado
  em 1280 × 844 e cinco por toque CDP em 390 × 844. Zero erros de página/console ou recursos
  externos, canvas dentro da tela. Capturas ao lado do recibo, navegador encerrado.
- Tipagem da autoria e dos testes da Vila passou com heap de 8 GB, sem diagnósticos.

O primeiro teste de repertório recusou `sz_g2d_every_seconds`, ausente dos cursos anteriores.
O resfriamento foi refeito com atualização e contagem já ensinadas, sem conceder bloco novo.
Os testes foram repetidos após a correção. O valor de calor não representa segundos.

## Reproduzir

Na raiz, `bun docs/desafios-do-jogo/vila-doce/gerar-manifesto.ts` gera os dois arquivos.
`bun test docs/desafios-do-jogo/vila-doce/quadros-iniciais.test.ts` confere a autoria.
Defina `SZ_CHECK_CHROMIUM` com o Chrome local; `SZ_VILA_QUADROS_NOVOS=1` seleciona o complemento
em `bun test packages/studio-runtime/tests/vila-doce-browser.test.ts`.
`bun docs/desafios-do-jogo/vila-doce/conferir-quadros-browser.ts` faz a conferência visual;
use `ARQUIPELAGO_PRINTS` para um diretório novo, preservando tentativas anteriores.

Não houve importação ou publicação em ambiente remoto. A abertura integrada do Quadro das
Cores como aluno, vínculos com currículo publicado e aparelho físico continuam pendentes.
