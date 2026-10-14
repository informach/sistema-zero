# Gravador das oficinas ao vivo

Receptor técnico próprio: Chromium recebe somente microfone, câmera e demonstração autorizados da professora pelo Cloudflare Realtime SFU. Um canvas isolado compõe a demonstração com câmera sobreposta. MediaRecorder produz segmentos WebM; FFmpeg gera MP4 H.264/AAC e grava progressivamente no R2 privado. O replay passa por conferência e publicação no Members. Não usa Daily nem exige gravador instalado pela família.

SFU, TURN, supervisor, R2, bases das VMs e tokens restritos foram configurados e verificados em staging e produção. O serviço comum Railway bloqueou os namespaces exigidos pelo Chromium; a execução usa uma VM Railway Sandbox privada e temporária. Uma sondagem no serviço staging, como UID 1001 com Bun 1.4.3 e o código do gravador, recebeu mídia sintética, confirmou pausa, destruiu as VMs e gerou no R2 um MP4 H.264/AAC de 130.010 bytes e 12,14 segundos. Os objetos sintéticos foram removidos. A publicação e o acesso ao replay pelo fluxo completo do Members ainda precisam da validação do deploy. Manter `LIVE_MEDIA_READY=false` até essa validação.

## Preparação

Na raiz do monorepo, instalar com `bun install`. Testes do receptor exigem Node, FFmpeg no PATH e o Chromium correspondente ao Playwright 1.62.1 (`bunx playwright install chromium`, neste pacote). Executar `bun run typecheck`, `bun run check` e `bun test` neste diretório.

O serviço usa Bun **1.4.3** no Linux; o processo guardião da VM usa Node 24 e Chromium sem privilégios. Bun 1.3.11 bloqueou o handshake Playwright tanto no Windows quanto na rede privada Railway, embora DNS e TCP funcionassem. A mesma conexão passou com Node 24 e Bun 1.4.3, incluindo criação e destruição confirmada da VM. `bun run test:transport` testa o cliente Bun contra o BrowserServer real; `LIVE_RECORDER_BUN` permite selecionar o executável fixado, sem alterar o runtime do restante do monorepo. O CI executa essa prova com 1.4.3. Não desativar o sandbox do Chromium para contornar falhas.

Para conferir efeitos de câmera no bundle real, executar primeiro `bun run build` em `packages/admin`, depois `bun run test:csp` neste pacote. Esse ensaio adicional carrega em Chromium o worker e os assets produzidos pelo build Admin, aplicando separadamente os headers reais de produção de Kids e Admin. Verifica processamento de frame, ausência de requisições externas e dois controles: retirar `wasm-unsafe-eval` da resposta do worker deve impedir a compilação WASM; retirá-lo apenas do documento não deve impedir o worker HTTP. Não substitui um ensaio do deploy Kids, CDN ou navegador infantil real.

As políticas atuais já permitem WASM para Rive; nenhuma permissão global foi adicionada para a câmera. O teste encontrou e corrigiu outro problema: Turbopack emite um worker clássico, embora o código solicite módulo. O worker agora detecta seu formato real antes de escolher o loader do MediaPipe. O teste básico cobre o formato módulo; `test:csp` cobre o artefato clássico de produção. A política aplicável ao worker HTTP vem da resposta dele, conforme a [documentação de CSP em workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy).

Configuração exclusiva do serviço, nunca `NEXT_PUBLIC_*`:

| Variável | Valor/uso |
| --- | --- |
| `LIVE_BROWSER_MODE` | `railway-sandbox` nos ambientes implantados; `local` apenas em hosts que suportem o sandbox do Chromium. Não há fallback automático. |
| `LIVE_BROWSER_RAILWAY_TOKEN` | Project Token restrito ao ambiente. Só o serviço de processamento recebe essa credencial; ela não vai à VM nem ao navegador. |
| `LIVE_BROWSER_CHECKPOINT` | Base imutável previamente preparada; inicialmente `live-browser-1-62-1-20261014`. |
| `RAILWAY_ENVIRONMENT_ID` | Variável automática do Railway, usada para impedir criação fora do ambiente selecionado. |
| `LIVE_RECORDER_TOKEN` | Segredo aleatório com pelo menos 32 caracteres; mesmo valor no Members. Autentica comandos e callback. |
| `LIVE_RECORDER_CALLBACK_URL` | URL privada completa do Members terminando em `/members/internal/live/recording/events`. |
| `CF_SFU_APP_ID`, `CF_SFU_APP_SECRET` | Mesmo app SFU usado pelo Members e supervisor. |
| `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | Credencial para emitir ICE servers temporários. TTL cobre somente o restante da ocorrência mais 15 minutos, limitado a 18.000 s; renovado a cada receptor novo. Não concede acesso à sala. |
| `LIVE_SUPERVISOR_URL`, `LIVE_SUPERVISOR_TOKEN` | Worker independente e seu segredo; veja [supervisor](../live-supervisor/README.md). |
| `R2_ENDPOINT` | Endpoint S3 da conta R2, HTTPS. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Credencial com acesso ao bucket privado de gravações. Sem domínio público. |
| `LIVE_RECORDER_DATA_DIR` | Volume persistente; padrão `/data/live-recorder`. Contém SQLite/WAL e segmentos de trabalho. |
| `LIVE_RECORDER_MAX_JOBS` | Inteiro 1–4; padrão 1. Reservas incluem inicializações concorrentes. Aumentar só após medir CPU/RAM. |
| `PORT` | Padrão 3017. |

No Members, os nomes equivalentes são `LIVE_SFU_APP_ID`, `LIVE_SFU_APP_SECRET`, `LIVE_TURN_KEY_ID`, `LIVE_TURN_API_TOKEN`, `LIVE_SUPERVISOR_URL/TOKEN`, `LIVE_RECORDER_URL/TOKEN`. A URL do gravador é a origem privada, sem `/occurrences`. A ausência da configuração completa impede ligar `LIVE_MEDIA_READY=true`. Aplicar as migrações do módulo, incluindo `command_version` em `live_recording_jobs`; ele é separado da sequência dos eventos recebidos.

## Container e implantação

`Dockerfile` usa Playwright 1.62.1, Chromium correspondente, FFmpeg e usuário `pwuser`, com `chromiumSandbox:true`. Construir a partir da raiz: `docker build -f packages/live-recorder/Dockerfile -t sistema-zero-live-recorder .`. Em `railway-sandbox`, o Chromium da imagem não é iniciado: o navegador roda na VM temporária. A definição central `.railway/services/live-recorder.json` usa essa raiz de build; `.railway/railway.ts` mantém uma réplica e o volume por ambiente. O entrypoint prepara a permissão do volume montado e troca para `pwuser` antes de iniciar o processo. O HTTP escuta em `::`, incluindo a rede privada IPv6 do Railway.

No Docker local, o sandbox precisa do perfil seccomp recomendado pelo Playwright, que permite criar namespaces de usuário. Não usar `--no-sandbox` como correção. O teste local confirmou Bun, Chromium com sandbox e escrita no volume; o serviço comum Railway não oferece essa capacidade neste projeto. A VM isolada passou no ensaio com UID 1001 e sandbox ativo.

Preparar um serviço privado Railway com volume em `/data/live-recorder`, segredos acima, saída HTTPS e conectividade WebRTC/TURN. Configurar período de encerramento de pelo menos 60 segundos: SIGTERM/SIGINT recusam novos comandos, aguardam os aceitos e os uploads, pausam os receptores e fecham SQLite. Há prazo fatal de 45 segundos; um encerramento forçado preserva somente segmentos já confirmados. Uma instância ociosa ainda consome RAM; medir antes de escolher recursos e escala.

`GET /health` informa disponibilidade HTTP e número de jobs em memória; **não prova** conectividade SFU, saúde do R2, sandbox ou prontidão para crianças. Durante drenagem responde 503. Não publicar a API de comandos na internet. A infraestrutura dos ambientes foi provisionada; o gate continua desligado. Saúde HTTP não autoriza abrir uma turma.

## Base da VM e encerramento

A preparação reproduzível está em `.railway/live-browser-base.sh`. Em cada ambiente, definir `RAILWAY_ENVIRONMENT_ID` e um `RAILWAY_TOKEN` de projeto (ou `RAILWAY_API_TOKEN` somente para a preparação administrativa) e executar `bun scripts/prepare-browser-base.ts` neste pacote. O script cria a base, guarda o checkpoint e destrói a VM de preparação. Não incluir credenciais ou dados de aula no checkpoint. A infraestrutura é preparada antes de ativar o código em produção.

Cada captura cria uma VM privada de 1 vCPU e 2 GB, sem domínio público. O processo sem privilégios expõe apenas um endpoint Playwright de caminho aleatório na rede interna. Um canal separado renova a autorização curta; expiração, comando inválido ou perda desse canal encerram o navegador. O serviço só confirma parada depois que o Railway confirma a remoção da VM. Desconectar Playwright, isoladamente, não libera assistência. Falha de encerramento mantém a referência para nova tentativa e `captureStopped:false`.

A VM não recebe credenciais de SFU, armazenamento ou aplicação. Encerrar a captura destrói a VM; o timeout de ociosidade de dez minutos limita VMs órfãs depois que o processo termina. Esse timeout não substitui a autorização curta da captura. A CLI classifica Sandboxes como experimental; registrar mudanças de API e custos no piloto. Ver [decisão de runtime](../../docs/plans/2026-10-14-gravador-runtime-railway.md).

## Protocolo e limites

- `POST /occurrences/:uuid`, Bearer privado, corpo validado em `src/contracts.ts`. `jobId`, ocorrência e geração são imutáveis; `commandVersion` cresce no banco do Members. Versões antigas ou o mesmo número com outra identidade são rejeitados. O ACK devolve o número aplicado e `captureStopped`.
- `GET /occurrences/:uuid`, mesma autenticação, permite inspeção. Um job encontrado no SQLite após restart aparece `orphaned:true`; não é automaticamente retomado.
- Desejo `recording` inicia/renova; `paused` aguarda parada e flush; `stopped` finaliza MP4. HTTP 2xx sozinho não autoriza assistência: Members verifica geração, versão e `captureStopped:true`.
- Depois da finalização, ajuda continua possível somente após `GET` privado confirmar a geração exata, `state:review`, o mesmo replay e `captureStopped:true`. Essa confirmação preserva o replay e não muda seu estado para pausa nem permite recaptura.
- Só três fontes `role:teacher`, dos tipos `microphone`, `camera`, `demo`, todas da mesma conexão SFU. A professora responsável é a primeira em `cohort.teacherIds`; auxiliares não entram no replay e sua ausência não provoca substituição silenciosa. Fonte `screen`, criança e URL arbitrária não passam no contrato. A autorização real das publicações permanece no Members.
- Lease operacional de 20 segundos, renovação no Members a cada 5 segundos; supervisão independente de 15 segundos, renovada a cada 3. Perda de controle encerra captura. A lease não substitui o prazo de acesso pedagógico.
- Máximo de quatro horas, 1.440 segmentos ou 4 GiB de segmentos, mais no máximo um segmento em processamento; cada entrada é limitada a 8 MiB e 30 segundos. Vídeo composto: 1280×720, 15 fps, alvo 1,5 Mb/s mais áudio. São tetos de implementação, não garantia de custo ou qualidade.
- Buffer do navegador limitado a dois segmentos. Uploads têm timeout; FFmpeg tem limite de 120 segundos. Arquivo final pode ocupar espaço adicional no volume e R2. Reservar capacidade para segmentos **e** replay; acompanhar crescimento e aplicar retenção editorial, sem apagar conteúdo por expiração de grant automaticamente.
- Um `owner.json` criado no R2 com `If-None-Match:*` impede dois containers de capturar a mesma geração. Não remover esse objeto para forçar um retry.
- Segmentos possuem sequência e SHA-256. Manifestos são serializados e não aceitam sobrescrita por snapshot anterior. Só após segmento confirmado o estado pode passar a `recording`; `review` exige upload final confirmado. Publicação para alunos é operação editorial separada.

## Ensaio obrigatório antes da primeira turma

1. Construir e iniciar **o container Linux real** e sua VM privada; verificar sandbox, codecs, permissões do volume, criação/remoção da VM e saída TURN (incluindo rede sem UDP). Medir o tempo de partida dentro da autorização de 20 segundos. A saúde HTTP não basta.
2. Em ambiente de ensaio, usar professora e oito participantes de teste. Confirmar que o receptor recebe somente três fontes da professora e que o arquivo não contém áudio/câmera/tela/chat das crianças. Alternar câmera, microfone e demonstração e conferir sincronismo e lacunas.
3. Pausar durante gravação, aguardar ACK, entrar em assistência e verificar o arquivo. Entregar artificialmente uma renovação `recording` antiga após o ACK: ela deve ser recusada. Tentar retomar enquanto assistência está pendente/ativa: Members deve negar.
4. Encerrar encontro; esperar `review`, ouvir/assistir começo, meio e fim, publicar e testar acesso vigente/expirado. Ausência de segmentos deve gerar falha explícita, sem replay vazio apresentado como completo.
5. Interromper upload, R2 e callbacks; matar o container em diferentes etapas. Verificar segmentos já confirmados, estado de falha e bloqueio da geração anterior. Confirmar comportamento do supervisor quando Members também cai.
6. Medir CPU, memória, disco, bytes SFU/TURN, operações R2, duração de transcoding e tempo de pausa; ensaiar segunda partida simultânea contra a capacidade 1. Examinar desligamento SIGTERM com segmento/upload em andamento.
7. Validar frontend de produção: worker MediaPipe, WASM/modelo locais, CSP, Capture Handle e acesso apenas à aba correta. Testar máquina infantil comum e navegador incompatível; efeitos devem desligar câmera ao falhar.
8. Registrar resultados, falhas residuais e limites operacionais; só então ativar o gate para o ambiente aprovado. Reverter gate impede novas operações; para uma sala ativa também ordenar parada e confirmar fechamento no supervisor.

## Recuperação e limitações explícitas

Após restart, o serviço recusa recapturar um job já registrado (`RECORDING_RECOVERY_REQUIRED`). **Não há retomada automática nem comando administrativo de recuperação nesta versão.** Isso preserva exclusividade, mas exige operação para aproveitar os segmentos de uma gravação interrompida. Nunca apresentar esse caso como gravação completa.

Conservar volume, SQLite, `manifest.json`, `owner.json` e os objetos `segments/*.mp4`. Confirmar que o container anterior terminou e que o supervisor fechou suas trilhas. Em área temporária restrita, baixar somente as chaves listadas no manifesto, conferir SHA-256 e sequência e concatenar os MP4 com FFmpeg (mesma estratégia de `RecordingSegmentStore.finalize`). Revisar lacunas antes de qualquer publicação. A vinculação do artefato recuperado ao Members requer uma operação interna auditada; não existe endpoint público para inventar metadados. Não apagar jobs ou aumentar geração manualmente durante uma captura incerta.

Uma criação SFU com resposta definitivamente perdida não pode ser encontrada por `correlationId`; não se repete a criação às cegas. O supervisor inspeciona e fecha recursos de sessões conhecidas e conserva pendências. Isso não garante revogação instantânea se Cloudflare e supervisor estiverem indisponíveis. O piloto depende de medir esses casos.

A recuperação automática, o ensaio do fluxo completo pela interface, a validação com oito dispositivos e o benchmark de custo continuam pendentes. A sondagem técnica do processamento no Railway não substitui esses testes. A reconexão do navegador é explícita e não religa câmera/microfone automaticamente. Os efeitos são segmentação aproximada, não garantia de ocultação de tudo que aparece ao fundo.

Referências: [API SFU](https://developers.cloudflare.com/realtime/sfu/api/), [negociação](https://developers.cloudflare.com/realtime/sfu/concepts/negotiation/), [TURN](https://developers.cloudflare.com/realtime/turn/generate-credentials/), [proposta e custos](../../docs/plans/2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md).
