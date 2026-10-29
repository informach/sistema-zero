# Mira de bolhas do Recife Coral, fase3-05

**Objetivo:** entregar um manifesto validado, um Quadro das Cores e três desafios do dia,
sem importar ou publicar conteúdo no Admin.
**Arquitetura:** seguir Vila Doce: IR JavaScript em blocos, arte SVG embutida, objetivos
comportamentais, gerador determinístico e provas no contrato, Blockly, HTTP em memória e
executor real. Nenhum código do jogo, salvamento ou serviço é alterado.
**Tecnologias:** TypeScript, Bun, Blockly, runtime Jogo 2D e Chromium.
**Especificação:** tarefa fase3-05 de 29/10/2026, README da Vila e regras §7.

O conector Artifact/action:read não está disponível. A referência é o escopo fornecido
pela dona e os documentos locais. A atualização da página de progresso será entregue
como nota para atualização manual, conforme orientação anterior.

## Decisões

- Recife abre em `explorer`, Explorador. Usar apenas a união das listas de cursos locais
  anteriores ou desse posto, sem blocos acrescentados manualmente.
- Principal: mirar horizontalmente, soltar uma bolha para cima, prendê-la no alvo e contar
  uma única vez. Cenário, imagens, botões e reinício por clique vêm prontos.
- Variações: bolha mais rápida, dois pontos por captura e contato com um segundo alvo.
  Cada inicial tem o jogo-base funcionando e somente a regra da variação incompleta.
- Extra: Enter recomeça a rodada, aplicando o evento de teclado já conhecido.
- Quadro 6, ordens 60 a 63, seguindo a convenção dos outros pacotes. Cadastro futuro
  deve conferir quadro livre. Moedas vêm de `MOEDAS_PADRAO_POR_TIPO`.
- Não tocar em `packages/arquipelago/src`, salvamento, Blender, .env, CI ou bancos remotos.
- Preservar o trabalho concorrente da rotina dos Lumis e do Recife no jogo.

## Execução

- [x] Criar `docs/desafios-do-jogo/recife/{projetos,objetivos,gerar-manifesto}.ts`, JSON e README.
- [x] Teste da pasta: regeneração determinística, IR, orçamento e nível dos blocos.
- [x] Contrato: quatro desafios, moedas, posto, cobertura dos blocos, arte e textos.
- [x] Blockly: oito projetos abrem e regeneram o mesmo JavaScript.
- [x] HTTP: importar, exportar e reimportar com repositório em memória, sem revisão extra.
- [x] Executor real: cada objetivo passa no gabarito e falha no inicial; mutações incorretas
  também reprovam, sem confundir falha de infraestrutura com reprovação pedagógica.
- [x] Conferência visual local, computador/celular emulado, prints e relatório em docs/qa.
- [x] Revisar o diff e validar tipos e lint.

Integração: commit somente dos arquivos desta entrega, sincronização com origin/staging e push.
O resultado do envio será informado na entrega final.
