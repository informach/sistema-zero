# Execução isolada do gravador no Railway

## Evidência e decisão

O serviço comum do Railway recusou o namespace exigido por `chromiumSandbox:true`, mesmo como UID 1001. O healthcheck HTTP não detecta essa incompatibilidade. Browser Run abriu o Chromium, mas não recebeu WebRTC: ICE expirou com UDP e TURN TLS retornou erro 701. Não adotar esse caminho nem desligar o sandbox.

Uma VM Railway Sandbox com Playwright 1.62.1, Ubuntu 26.04 e UID 1001 executou Chromium com sandbox. O ensaio com SFU/TURN reais recebeu demonstração e áudio sintéticos, produziu um segmento de 88.844 bytes e confirmou o encerramento. Não foi um ensaio com crianças nem de uma oficina completa.

A adaptação permanece dentro da infraestrutura Railway/Cloudflare autorizada. O serviço `live-recorder` continua responsável por comandos, SQLite, FFmpeg, volume e R2. Somente o Chromium roda numa VM privada temporária, criada de uma base previamente preparada. A VM não recebe credenciais R2, SFU nem da aplicação; recebe ICE temporário pelo receptor e uma autorização de captura curta. Não publica domínio.

## Contrato

- `RecordingBrowser` oferece `browser`, `renew(leaseEndsAt)` e `close()`; implementação local preservada para desenvolvimento/testes, sandbox Railway exigido nos ambientes implantados.
- Um processo sem privilégios na VM dirige `BrowserServer`, com Playwright da mesma versão do cliente. A conexão usa a rede privada e caminho WebSocket aleatório. Entrada/saída do SDK leva somente comandos de controle, jamais segmentos de mídia.
- Watchdog da VM encerra o navegador quando a autorização curta vence, stdin fecha ou o prazo máximo termina. A autorização nunca pode ultrapassar 30 segundos nem o fim da ocorrência.
- Fechar a conexão Playwright não prova a parada. `close()` só confirma após ACK do processo que aguardou `BrowserServer.close()`, ou após o Railway confirmar que a VM foi destruída. Falha conserva `captureStopped:false` e impede assistência.
- Criar recursos com credencial de projeto restrita ao ambiente. Não persistir token pessoal da CLI. Guardar identificação da VM para diagnóstico e destruir após a captura. Timeout de ociosidade limita recursos órfãos.
- Falhas não ligam um fallback sem sandbox. Produção mantém `LIVE_MEDIA_READY=false` até a validação de staging; staging pode ser habilitado para o ensaio controlado após a prova técnica de mídia.

## Limites e custo

Railway ainda identifica Sandboxes como experimental na CLI. A API pode mudar; a versão do SDK fica fixada e a integração deve falhar de forma explícita. O piloto precisa medir partida, interrupção, consumo e recuperação. Não declarar prontidão de produção apenas porque o teste técnico passou.

Sandboxes consomem a franquia do Railway e cobram CPU/memória utilizadas por segundo. Pelos valores publicados, uma hora com 1 GB e um vCPU efetivamente utilizados custa aproximadamente US$ 0,14, além de tráfego. Isso se soma ao serviço de processamento, R2 e tráfego SFU/TURN. Não é custo zero.

Referências: [Railway Sandboxes](https://docs.railway.com/sandboxes), [Playwright](https://playwright.dev/docs/release-notes), [restrições de namespace](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md).

## Plano de implementação

- [x] Implementar processo guardião e testes de expiração, renovação e parada confirmada.
- [x] Implementar adaptação do navegador e integrar seu ciclo ao `RecordingJob`; testar falhas de encerramento.
- [x] Preparar base reproduzível e credenciais próprias em staging e produção, sem implantar a aplicação de produção.
- [x] Executar teste real desde o serviço Railway: criação privada, recepção, segmento, pausa e remoção da VM.
- [x] Atualizar documentação, commit/push staging, CI e deploy de todos os serviços afetados pelo conjunto de commits.
- [x] Conferir migrações, healthchecks, isolamento dos ambientes e registrar o que continua dependente do ensaio humano.

## Verificação em 14/10

- Dez testes do gravador passaram, incluindo Chromium real, FFmpeg, expiração da autorização, perda de stdin e recusa de ACK quando a remoção falha.
- Build da imagem atualizado passou; sondagem dentro dela confirmou UID 1001, volume gravável e Chromium 151.0.7922.34 com sandbox ativo.
- Repetição numa VM privada criada do checkpoint: alocação em 2.976 ms, navegador pronto em 11.437 ms medidos desde a máquina local, nenhum domínio público, ACK de parada e destruição confirmada. Esses valores não são promessa de latência da oficina.
- Bases e tokens de projeto validados nos dois ambientes. O usuário criou os tokens, pois a API bloqueia sua criação por OAuth. As três variáveis do navegador foram conferidas após a escrita. Planos IaC dos dois ambientes retornaram zero alterações; produção conservou os 20 deployments comparados à referência inicial.
- A sondagem no serviço staging usou código do gravador e Bun 1.4.3 em diretório temporário, como UID 1001, com credencial restrita e rede privada. Gerou dois segmentos e um MP4 H.264/AAC de 130.010 bytes, duração 12,14 s; pausa sem erro, captura encerrada e VMs removidas. Objetos sintéticos foram apagados. Isso ainda não testa a publicação pelo Members nem oito crianças.
- O ensaio encontrou três falhas de integração: colisão de parâmetros no roteador do Members, handshake Playwright bloqueado no Bun 1.3.11 e espera indevida pela coleta completa de ICE. Foram reproduzidas antes dos consertos. O runtime do gravador foi fixado em 1.4.3; o CI testa a conexão real Bun → BrowserServer. A negociação segue o [exemplo oficial da Cloudflare](https://github.com/cloudflare/calls-examples/blob/main/echo/index.html), sem bloquear a resposta enquanto outros candidatos são coletados; o receptor exige mídia recebida antes de gravar.
- Pausa agora descarrega os segmentos e fecha as trilhas SFU antes de destruir a conexão. O supervisor reconhece uma sessão encerrada pelo retorno específico GET 410/`session_error`, conserva o histórico e deixa de repetir limpeza indefinidamente após o prazo de inspeção. Outros erros continuam pendentes. [Semântica dos erros SFU](https://developers.cloudflare.com/realtime/sfu/observability/error-codes/).
- A execução anterior passou nos testes de mídia, mas falhou no limite de tempo de um teste do Pinta (542 ms para um teto de 500 ms); esse limite não foi relaxado. A rodada seguinte passou.
- O [CI `38616509787`](https://github.com/informach/sistema-zero/actions/runs/38616509787) concluiu com sucesso: suíte geral, bancos, checagem de tipos, Chromium, Firefox, WebKit, Community Kids e deploy. Members, live-recorder, Admin, Community Kids e Community implantados no commit `24a682820` passaram nos healthchecks. A turma técnica executou o transporte real do cliente no Chromium, com chamadas HTTP autenticadas ao Members: abertura da sala, entrada, gravação, callbacks, pausa, finalização, publicação e leitura de um MP4 de 105.811 bytes no R2. As turmas sintéticas foram arquivadas e as VMs removidas. Ainda falta o ensaio humano da interface e de oito dispositivos.
- Dezesseis verificações HTTP passaram: saúde dos três frontends, recusa de acesso sem autenticação às APIs e páginas de oficinas e disponibilidade do modelo, JavaScript e WebAssembly da câmera no Admin e no Kids. Os headers globais implantados usam CORP `same-site`. Produção preservou seus 20 deployments e `main` permaneceu em `6f93dcbfe8f176017b7b1ace5114d480ad5853b1`.
