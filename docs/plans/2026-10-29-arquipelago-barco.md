# Barco entre a ilha central e o Recife, fase3-04

Objetivo: embarcar no cais, atravessar o mar no barco e desembarcar em pé no outro cais, sem
nado e sem gravar a viagem no salvamento. Executar neste ramo, pela skill `executing-plans`.

## Decisões propostas e implementadas

- **Viagem guiada.** E ou Usar inicia a travessia. Pilotagem livre exigiria controles e regras
  adicionais de navegação; nesta fase o barco segue a rota e a criança observa a paisagem.
  Andar e pular não lançam a criança na água durante a viagem.
- **Somente ilhas abertas.** O barco só fica disponível quando `ilhaAberta('recife', posicao)`
  permitir. Nenhuma viagem libera posto ou ilha. A ida e a volta usam a mesma rota invertida.
- **Rota por fora das pontes.** Sai do píer pelo setor entre Nuvens e Vale dos Dinos, contorna o
  anel pelo leste e chega ao Recife pelo lado do cais. O arco externo fica além das ilhas e
  de suas boias, com folga para o casco. Testes amostram toda a rota contra pontes e rodas.
  Como as linhas de boias são fechadas, haverá uma abertura de navegação em cada porto,
  retirando somente os trechos de corda e as boias que ocupam o corredor. A correnteza dos
  nadadores permanece igual, inclusive nessas aberturas.
- **Passo fixo e pausa.** Novo modo `barco`, pelo contrato existente. Embarque, viagem e saída
  avançam apenas nos passos da física; pausa congela progresso e balanço. O corpo e o modelo
  seguem o mesmo estado, sem alocar no laço. O passageiro fica de pé no lugar marcado na arte.
- **Carregamento.** A viagem usa o ciclo existente das ilhas completas. Antes da aproximação
  final ao Recife, espera a ilha e seus colisores estarem ativos. Nunca desembarca sobre a
  versão leve. Falha de carga mantém a criança no barco e devolve ao cais de origem após 20 s de espera.
- **Câmera.** Acompanha o corpo, com perfil de barco e transição suave. Movimento reduzido evita
  giro automático e acompanhamento do balanço, preservando o enquadramento da travessia.
- **Disponibilidade nos dois portos.** Em repouso há um barco em cada cais. Durante a viagem,
  o barco em movimento substitui os modelos atracados; ao desembarcar, a travessia volta a
  estar disponível nos dois lados. Não há localização persistente nem espera por horários.

## Contrato de arte solicitado, antes de usar coordenadas

Atendido pela sessão de Blender no commit f3f99157d, puxado antes da integração. Esta tarefa não altera geradores nem GLBs.

1. `mundo/pier.glb`: âncora `barco` na linha d'água, giro da proa em +x; âncora `embarque` no
   tampo livre de luneta, estacas e lampião, também usada no desembarque. Separar barquinho e
   corda decorativos no nó `barquinho-decorativo`, mantendo `col-barco-1` separado, para poder
   substituí-los pelo barco da viagem sem sobreposição.
2. `ilhas/barco.glb`: âncora `passageiro` no piso interno livre da cabine e dos bancos, com giro
   de orientação, filha do nó animado `barco`. Assim a criança acompanha o balanço sem derivar
   o lugar pela caixa da malha.
3. `ilhas/recife.glb`: reutilizar `barco` e `cais`; verificar o desembarque contra os colisores.

## Etapas

- [x] Regras em `sistemas/barco.ts`: construção e amostragem da rota, condições de embarque,
  fases, pausa e chegada. Testes em `tests/barco.test.ts` cobrem ida e volta, ilha fechada,
  progressão em passos fixos, pausa, espera da ilha e saída em ponto seguro.
- [x] Modo `sistemas/modos/barco.ts`, integrado ao contrato, à criação do estado e às trocas.
  Colisão continua sendo conferida pelo controlador. Testes de modo e de obstrução.
- [x] Leitura das âncoras e montagem em `mundo/barcos.tsx`, animação pelo helper existente,
  colisores simples, interativos, aberturas nas boias e integração ao ciclo do Recife.
- [x] Perfil de câmera, medidas de viagem em `__arquipelagoDesenho` e parâmetro do playground.
- [x] `playground/verificar-barco-browser.ts`: ida e volta, pausa, desembarque, ilha fechada,
  espera de carga e movimento reduzido, computador e celular emulado, SwiftShader e prints.
- [x] Atualizar regras e CLAUDE, revisar o diff completo, executar testes, typecheck e lint,
  commitar somente esta tarefa e enviar com pull --rebase e push em staging.

Sem banco remoto, `.env`, CI, alteração do salvamento ou geração de arte.

## Resultado da revisão

Corrigidos o atraso da âncora animada, o enquadramento no celular, a posição salva no mar,
a obstrução do embarque e pedidos antigos após teleporte. Evidências e limites em
`docs/qa/2026-10-29-barco/README.md`. Arte atendida, nenhum GLB pendente nesta tarefa.
