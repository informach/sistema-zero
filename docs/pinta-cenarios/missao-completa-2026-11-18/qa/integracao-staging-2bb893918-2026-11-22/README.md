# Integração da staging 2bb893918 — 22/11/2026

Integração da staging na branch da missão, sobre `7f30bf123`. A referência
observada inicialmente era `299f28772`; outra sessão atualizou o tracking remoto
antes do merge. O commit efetivamente recebido ficou fixado em
`2bb89391871b90cd200ed44334397bbf1d822639`. Os 39 conteúdos recebidos foram
comparados com esse commit no índice Git: 38 preservados integralmente e uma
correção restrita à fixture de QA descrita abaixo. Não há fonte Pinta,
Core ou Molda no lote recebido.

Revisados os pontos relacionados à preservação dos jogos/desenhos:

- Limpeza da persistência ocorre antes de descarregar o projeto do Estúdio.
  Uma gravação recusada após sair conserva snapshot em recuperação local.
- Esconder a aba captura imediatamente e repete a captura se uma operação do
  terminal do Pro entrar no projeto depois. Saída definitiva continua usando
  as guardas existentes, sem prometer aguardar trabalho assíncrono da página.
- O flush do Blockly confere mudanças ainda não despachadas, conservando a
  comparação com o estado aplicado para não sobrescrever código novo da Ponte.
- Recomeçar/trocar a versão de uma atividade reaplica as artes carregadas da
  aula. A detecção do projeto inicial desconta IDs/posições gerados pelo editor
  e arte colocada pelo host, com fallback quando a comparação não é segura.

Validação: 34 testes do Estúdio, mais 25 casos no processo isolado incluído
nessa suíte; 23 do host e dois do histórico de evidências no Admin. Tipos
completos do Estúdio aprovados. Dois ensaios Chromium de esconder/desfazer e
12 Pinta–Estúdio repetidos sobre a integração, sem retries. Lint dos 18 arquivos
de código sem erros; dois avisos de `any` e uma sugestão de template literal
pertencem ao gerador de aulas recebido e foram conservados.

A primeira checagem de tipos reproduziu TS2322/TS7053 na nova inspeção de cópias
em `projectStorageBrowser.ts`: `assembleProjectRecord` transporta campos
desconhecidos, não devolve um `Project` validado. A inspeção agora confere os
tipos de `name`/`tree`, sem cast e sem normalizar o registro bruto que a prova
precisa observar. Tipos completos e lint foram repetidos. O driver Chromium
real de armazenamento também foi executado: 12 recargas imediatas, conflito de
duas abas independentes e recuperação após falha de quota, com browser fechado.
Não é teste em outro aparelho físico.

Os testes SQL recebidos não foram executados neste lote. O conteúdo editorial
e os testes de histórico recebidos não são implementação de cenários Pinta.
A suíte completa de 2.738 do Pinta/3.215 Core pertence ao pai, cujas fontes não
mudaram; não é uma nova execução. Sem promoção de contratos, implantação,
alteração funcional 3D ou merge da feature em staging. Seguir composição/PNG 5
e consumidores regionais, mantendo a missão aberta.
