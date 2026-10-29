# Qualidade automática do Arquipélago (geral-05)

Especificação: pedido da dona de 28/10/2026. Implementação no pacote do jogo, sem contratos,
salvamentos, serviços, modelos, workflows ou arquivos reservados às outras sessões.

## Arquitetura e números

Regra pura em `sistemas/qualidade.ts`; controlador React por cena; preferências na loja de
Conforto existente. Três perfis visuais, sem parâmetros de física. Desktop: meta 60; toque,
Chromebook ou até quatro núcleos: meta 30. Até dois núcleos começa leve; demais aparelhos
conservadores começam médios; desktop começa completo. Informação ausente não é zero núcleos.

Janelas de dois segundos de tempos de quadro. Duas janelas acima de 120% do orçamento reduzem
um nível, com pelo menos oito segundos entre trocas. Cinco janelas até 105% permitem subir,
apenas depois de vinte segundos. Pausas, aba oculta e intervalos acima de um segundo limpam
a amostra. Preferência manual e parâmetro de URL dispensam adaptação.

DPR máximo completo/médio/leve: 1,75/1,25/0,75, limitado também pela densidade física da tela.
Vento: 100%/50%/0%; ondinhas: ligadas/ligadas/desligadas. Névoa começa em 70 m, termina
em 210/190/170 m. Não limitar o laço do navegador: mantém os passos de física existentes e
permite superar a meta quando houver capacidade. O limite de desenho a 30 é opcional no pedido.

## Execução e conferência

1. Regra pura, detecção, histerese e testes; preferências compatíveis com armazenamento antigo.
2. Controlador da cena, DPR, vento por cena/material, ondinhas e névoa; medidor e playground.
3. Prova do controlador real de movimento em passos fixos agrupados em quadros de 30 e 60 Hz.
4. Navegador local, alternância leve/completa, vento/ondas efetivos e andar/pular. Usar o Chromium
   solicitado se disponível; registrar explicitamente o navegador substituto no Windows.
5. Revisão completa do diff; `bun test`, `bun run typecheck`, `bun run check` antes de commit.
6. Atualizar regras e CLAUDE, integrar staging, `git pull --rebase origin staging`, conferir
   composição e enviar. Registrar limitações de desempenho e celular real sem alegar medição física.
