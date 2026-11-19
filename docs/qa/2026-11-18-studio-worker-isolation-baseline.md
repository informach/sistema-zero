# Isolamento: controles Worker e qualificação Python

## Medição local

O medidor existente agora compara os mesmos três arranjos de iframe com dois
controles adicionais: Worker ocupado só em CPU e Worker com Canvas 2D transferido.
Os controles recebem o mesmo trabalho nativo de ordenação, de duração prevista de
cinco segundos. Um clique real durante o trabalho chama Worker.terminate(). O
medidor registra o retorno da chamada, não o instante interno de encerramento do
thread. Não afirmar latência nativa de término a partir de stopCallMs.

A entrada de mouse é a mesma nos controles de iframe e Worker: boundingBox,
mouse.click e observação do handler. A primeira tentativa usava locator.click
no Worker, acrescentando auto-waits diferentes; seus números foram descartados.
Os dados qualificados são o JSON adjacente, preservado sem alterar valores.

Windows local, navegadores headless, 30 casos (um por combinação), com e sem
COOP same-origin/COEP credentialless. Carga externa da máquina não controlada;
não é aparelho físico de entrada nem ensaio prolongado. Chromium é o navegador
completo 148.0.7778.96, Firefox 150.0.2 e WebKit 26.4.

- Chromium: Worker Canvas e CPU mantiveram resposta de clique de 21–23 ms.
- Firefox: Worker Canvas e CPU responderam em 55–69 ms; outro site só isolou com
  os cabeçalhos do host. srcdoc bloqueou a página por cerca de cinco segundos.
- WebKit Windows: Worker CPU respondeu em 40–59 ms; os três arranjos de iframe
  bloquearam a página por cerca de cinco segundos. transferControlToOffscreen e
  Canvas 2D no Worker não estavam disponíveis. O controle Canvas é indisponível,
  não aprovado. Com esses cabeçalhos, crossOriginIsolated também permaneceu false.

As combinações sem isolamento são observações, não gates verdes. O JSON declara
explicitamente o escopo sintético. Esses dados não provam segurança de mensagens,
memória limitada, renderização de um jogo, áudio, persistência ou funcionamento dos
motores oficiais em Worker. Não foram medidos FPS, p95 de digitação ou memória.

## Dependências reais do Jogo 2D

A inspeção confirmou DOM no palco responsivo, ARIA/HUD, botões clássicos de toque,
ponteiro/captura/foco e visibilidade. Há também Image, document.fonts, Audio e
AudioContext com desbloqueio por gesto. Física/sprites/callbacks compartilham o
mesmo ciclo. Trocar apenas window por self ou omitir esses recursos quebraria os
cursos. É necessário separar esses serviços de host e conservar o mesmo motor,
comparando os cursos e o desenho com o caminho DOM. A alternativa sem Canvas no
Worker exige fallback explícito; não declarar suporte a partir de um booleano.

## Python de produto no navegador

Foi acrescentada qualificação Linux com Chromium completo para os 75 testes já
existentes em python-supervisor, python-provider, python-host-isolation,
python-classic e python-games. Usam CPython/Worker, distribuição verificada,
CSP/portas reais, morte do target e isolamento de cookies. Não simulam Parar ou
interpretador. A distribuição é montada pelos comandos canônicos, sem publicação
nem ativação de catálogo. A coleta inclui relatórios, traces e manifesto da prova.

O servidor de provas recusa Bun 1.3 no Windows por handles de sockets herdados,
como registrado em experiments/studio-python-runtime/README.md. A missão mantém
seu Bun 1.3.11 e executa essa qualificação no Linux. O config novo foi conferido
por descoberta (75 testes em cinco arquivos) e typecheck; --list NÃO é aprovação
desses testes. A execução remota e a revisão das falhas continuam obrigatórias.
R1 continua aberto; não foi adicionado botão ou perfil Worker sem implementação.
