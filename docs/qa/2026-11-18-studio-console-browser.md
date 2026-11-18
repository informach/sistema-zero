# Console e homologação em Chromium completo

Worktree `sistema-zero-estudio-missao`, Windows local, Bun 1.3.11 e Chromium
148.0.7778.96 do Playwright. Testes headless de laboratório; não representam
homologação em aparelho físico de entrada.

## Controle do tráfego do console

O primeiro workflow (`44280842226`) reprovou a inundação do console no Windows.
O receptor já limitava mensagens, mas cada chamada ainda atravessava o transporte
e chegava ao console nativo antes desse limite. O interceptor agora admite chamadas
antes da serialização, do `postMessage` e do console nativo. Reutiliza o orçamento
existente de 180 mensagens por segundo, reservando uma para informar quantas foram
omitidas. A próxima janela volta a admitir mensagens. Erros de execução, localização
da instrução e heartbeats seguem seu canal próprio, sem consumir esse orçamento.

Não há aumento de timeout ou quota. O código do interceptor usa o compactador
existente para remover comentários/indentação: 9.006 para 6.991 bytes UTF-8, sem
retirar diagnóstico ou funcionalidade. O teste de 10.000 chamadas falhou antes da
correção; depois verifica limites tanto do transporte quanto do console nativo,
contagem omitida, erro real posterior e retomada na janela seguinte com relógio
determinístico. Interceptor, bootstrap, orçamento de cenas e logs: 54 testes,
199 asserts. O caso de inundação passou em três repetições no navegador com trace
retido em falha. Esses resultados não provam isolamento de toda execução DOM.

## Fixtures de navegador

- DPR: a emulação do contexto alterava a escala do pai, mas o renderer separado do
  iframe opaco mantinha DPR nativo. Reprodução mínima com DPR 3 mostrou pai 3/filho 1;
  com a escala nativa do Chromium, ambos 3. Os nove casos usam agora essa escala e
  conservam todas as verificações de geometria, controles e backing buffer, somando
  a verificação do DPR do pai. Nove casos aprovados, 43,2 segundos.
- Segurança do player: a fixture anexava um iframe abaixo de todo o Estúdio. O
  documento criativo existia e sua CSP permitia a imagem, mas o iframe fora da
  viewport não concluía o carregamento observado. A fixture passa a ocupar a viewport
  e remove sua instância anterior. As asserções continuam exigindo zero acessos no
  perfil estrito e um no criativo; a CSP de produto não mudou. Caso aprovado localmente.
- Publicação e Pensa: foi observado um clique sem nenhum evento de ponteiro entregue
  ao documento do host. Confirmar explicitamente rolagem/posição visível antes do
  clique reproduz a ação com entrega de eventos. Não se substituiu por clique via
  JavaScript, repetição silenciosa ou alteração do player/Monaco. Cada caso passou
  em três repetições. Publicação verifica os controles de partida ativa em vez de uma
  frase transitória, além de áudio, persistência entre revisões e isolamento do editor.

Todos os listeners, atributos e logs temporários de investigação foram removidos.
Os navegadores adicionais do teste DPR são fechados em `finally`. A instrumentação
do console vive no documento da prévia e é descartada com ele. Não há alteração
visual do produto nem dos blocos ou percursos ensinados.

## Limites da evidência

O typecheck completo local deste lote foi interrompido após consumo elevado de
memória; não é um resultado aprovado. O workflow executa a verificação completa
em Linux e Windows. A nova rodada deve confirmar o lote inteiro, inclusive os
casos anteriormente reprovados, sem contar o disparo como aprovação.

A missão global, os aparelhos físicos, o isolamento no WebKit, a renderização
incremental de 10.000 blocos e os demais itens do plano continuam pendentes.

Na rodada combinada posterior, os cinco programas hostis, a publicação Pro e as
duas aulas de Cadê passaram. A rodada foi interrompida ao restarem cerca de 238 MB
no disco durante os traces. Seus outros seis casos não receberam resultado e a
rodada não é contabilizada como aprovação dos 14 testes. As 15 verificações de
integridade/geração dos projetos protegidos no Blockly real passaram separadamente
(43 asserts). As montagens restantes devem ser confirmadas pelo runner hospedado.
