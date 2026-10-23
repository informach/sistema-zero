# Áudio portátil Python — Implementation Plan

> **For agentic workers:** executar neste worktree com `executing-plans`, em lotes e com revisão entre eles. Não iniciar agentes adicionais nem disputar a janela pesada de QA em uso.

**Goal:** preservar sons reais de Pac-Man e Space Arena no Estúdio, player público e exportação desktop, sem chamadas de shell e sem alterar a API Turtle.

**Architecture:** um módulo Python portátil `sz_audio` oferece reprodução não bloqueante e encerramento explícito. No navegador, pedidos limitados atravessam os canais privados existentes até um serviço de mídia pertencente à sessão; somente assets do snapshot capturado podem ser reproduzidos. No desktop, o mesmo módulo usa um backend nativo declarado e instalado pelo aluno. Encerrar a sessão revoga a autoridade antes de parar mídia e liberar URLs.

**Tech Stack:** CPython 3.14.2/Pyodide já pinados; TypeScript; HTMLMediaElement para streaming no navegador; backend desktop miniaudio 1.71, sujeito à prova nativa antes de distribuição. Não adicionar Pygame, Pygame Zero ou Raylib neste lote.

**Spec:** [R21/P01–P16](../../plans/2026-10-16-pacman-aceite.md), [R22/S01–S10](../../plans/2026-10-16-space-arena-aceite.md) e [metas de desempenho](../../plans/2026-10-16-estudio-python-desempenho.md).

## Restrições e escolha

- JavaScript mantém sua implementação e suas cotas atuais.
- Turtle permanece opcional e usa a API oficial; áudio não é `turtle.play_sound`.
- Nada de interceptar `os.system`, analisar shell, excluir chamadas ou aceitar execução silenciosa como aprovação.
- Fontes e assets de terceiros permanecem em cache de QA; variantes recebem diff, hashes, versão e licença, sem virar templates do produto.
- O usuário autorizou modernizar os jogos antigos em 19/10, preservando resultado igual ou muito parecido: regras, controles, carga e aparência continuam sujeitos à comparação. Podemos reorganizar o laço e corrigir defeitos autorais; isso não autoriza alterar a API Turtle para esconder esses defeitos. Cada revisão recebe nova identidade e testes de comportamento.
- Limites existentes Python: 32 MiB por áudio e 32 MiB no total de materiais. A música de 23.472.658 bytes deve ser reproduzida sem cópias PCM integrais adicionais no aplicativo.
- Oito WAVs reais foram inspecionados com `wave` do CPython: três no Pac-Man, cinco no Space Arena; todos PCM16 mono/estéreo, taxas 44.100/48.000/96.000 Hz. Preservar os cinco sons reais do Space Arena; não inventar o sexto anteriormente contado por engano.
- A implementação não promete formatos além do contrato qualificado: inicialmente WAV PCM16 mono/estéreo, 8.000–96.000 Hz, duração máxima de 600 s. Outros materiais continuam preservados, com diagnóstico se usados por este módulo.
- Cada sessão aceita até 16 vozes simultâneas e 64 comandos de áudio por segundo, sem reduzir a carga autoral dos jogos para passar. Saturação gera erro explícito; medir os jogos para confirmar suficiência antes do aceite.
- Não sobrescrever release/distribuição996. Qualificar e promover um novo artefato imutável depois das alterações no runtime.

Foram considerados três caminhos. Comandos nativos do sistema não são portáveis e estão excluídos. Antecipar Pygame para resolver somente som criaria uma dependência e anteciparia outra extensão. O módulo de mídia separado preserva o código Python e declara a dependência nativa sem fingir que o módulo Turtle oferece som.

O serviço de áudio deve pertencer à janela que contém o botão Jogar, não ao worker nem ao iframe opaco: essa janela tem o gesto do usuário e já possui os bytes do snapshot. Não enviar WAVs repetidamente pelo canal a cada coleta. O frame continua sem acesso ao DOM da plataforma; o serviço recebe somente caminhos e números validados. A política CSP do player exportado deve admitir apenas `blob:` para essa mídia adicional, sem abrir rede arbitrária.

## Lote A — contrato e inspeção limitada de WAV

**Files:** criar `packages/studio/src/runtime/python/audio/contract.ts`, `wav.ts` e respectivos testes.

**Interfaces:** `readPythonAudioRequest(raw: unknown): PythonAudioRequest`; requisições versionadas `{version:1,op:'play',id,path,loop,volume}` ou `{version:1,op:'stop',id:number|null}`. `readPythonAudioWav(bytes: Uint8Array): {channels,sampleRate,frames,durationSeconds}` inspeciona sem decodificar/copiar o payload.

- [ ] Escrever negativos para travessia de caminho, URL, source no lugar de asset, número não finito, versão desconhecida e mensagem acima de 2 KiB; o serviço verifica a associação ao asset, além do parser.
- [ ] Cobrir RIFF truncado, tamanho externo divergente, chunks ímpares/padding, `fmt`/`data` duplicados, compressão não suportada, alinhamento inconsistente e duração excessiva. Chunks de metadados desconhecidos são percorridos por tamanho, nunca copiados.
- [ ] Conferir os oito WAVs originais contra hashes do corpus e metadados de `wave`; essa é inspeção de bytes, não prova de reprodução.
- [ ] Rodar testes focados e revisar limites antes de integrar o serviço.

Exemplo positivo do protocolo:

```ts
expect(readPythonAudioRequest(JSON.stringify({
  version: 1, op: 'play', id: 1,
  path: 'assets/start.wav', loop: false, volume: 0.8,
}))).toEqual({
  version: 1, op: 'play', id: 1,
  path: 'assets/start.wav', loop: false, volume: 0.8,
})
```

## Lote B — serviço de mídia e autoridade da sessão

**Files:** criar `audio/service.ts` e `audio/service.test.ts`; modificar `protocol.ts`, `workerEvents.ts`, `worker.ts`, `workerSupervisor.ts`, `frameProtocol.ts`, `frameMessages.ts`, `frame.ts`, `session.ts` e seus testes existentes; adicionar `media-src blob:` em `export/pythonWebTemplates.ts`.

**Interfaces:** `createPythonAudioService({snapshot,signal})` oferece `exchange(request:string):Promise<string>` e `dispose():void`. Resposta JSON: `{version:1,ok:true}` ou `{version:1,ok:false,error:string}` com erro limitado. O comando de mídia leva `requestId` pelo worker/frame e recebe uma única resposta correlacionada. Só um pedido suspenso por worker; não reentrar CPython.

- [ ] Associar mídia somente a `snapshot.files` de `kind:'asset'`, caminho exato, hash SHA-256 confirmado e WAV válido. O pedido não fornece bytes, URL, MIME ou JavaScript.
- [ ] Criar Blob/URL uma vez por asset por sessão. Usar elementos de mídia para streaming, com volume/loop definidos; vozes distintas podem se sobrepor. Registrar `ended`/`error`, liberar voz e propagar erro observável.
- [ ] Validar fase, sequência, geração e limites em ambas as fronteiras. Resposta tardia após Stop não cria voz. Falha de mídia não deve virar sucesso silencioso nem encerrar outra execução.
- [ ] No bloqueio de autoplay, devolver diagnóstico acionável. Comprovar Chrome/Edge novos, botão Jogar, teclado e player público; não usar `--autoplay-policy=no-user-gesture-required` para o aceite.
- [ ] Encerrar vozes, remover listeners e src, chamar `load()` para interromper leitura e revogar URLs em Stop, reinício, abort, troca de projeto e navegação. Provar cancelamento durante hash e `play()` pendentes.
- [ ] Verificar CSP real de cada host e exportação; nenhuma permissão `https:` nova no serviço. Projetos JS e projetos Python sem uso de áudio não criam elementos/contextos de áudio.

## Lote C — módulo portátil e exportação

**Files:** criar o pacote `audio/sz_audio/` (`__init__.py`, `_desktop.py`, `_mixer.py`, `_wav.py`, `_module.json` gerado), `audio/nativeExport.ts`, dependências pinadas e testes; modificar `interpreter.py`, `interpreter.ts`, `export/pythonSourceMetadata.ts`, `scripts/build-python-runtime.ts` e seus testes. A definição Core produz documentação, stub e versão/política/dependências do módulo, sem JSON paralelo editável.

**Interfaces públicas:** `sz_audio.play(path: str, *, loop: bool = False, volume: float = 1.0) -> int`; `sz_audio.stop(handle: int | None = None) -> None`. O retorno de `play` identifica a voz; não bloqueia até o fim do som. Importar o módulo sem usar áudio não abre dispositivo nem importa dependência nativa.

- [ ] No navegador, configurar o callback privado antes do código autoral e usar `run_sync` para obter a confirmação de início, sem manter a reprodução no worker. Preservar precedência de módulos autorais conforme o mecanismo Turtle existente.
- [ ] No desktop, qualificar um único dispositivo de saída com mistura limitada de streams. Resampling deve aceitar os 96 kHz reais de `powerup.wav`; não pré-decodificar a música inteira. Validar volume, pausa/encerramento e exceções do dispositivo em teste nativo.
- [ ] Declarar miniaudio 1.71 e dependências nativas verificadas no pacote exportado, com instrução de instalação separada do lock Pyodide. Não alterar `requirements.txt` autoral nem declarar instalação já realizada.
- [ ] Exportar o módulo e backend com versão/hashes e nomes determinísticos. Colisão com arquivo/pasta autoral não pode sobrescrever nada; emitir diagnóstico explícito e preservar os arquivos.
- [ ] Executar ZIP novo fora do monorepo com CPython/Tk e áudio reais. Comparar oito WAVs por hash e comprovar reprodução/overlap/Stop; testes de um backend simulado não substituem essa prova.

## Lote D — variantes e jogos completos

**Files:** modificar `experiments/studio-python-runtime/gameFixtures.ts`, `packages/studio/e2e-runtime/python-games.spec.ts` e manifestos de variantes; fontes/assets de terceiros só em cache.

- [ ] Pac-Man: substituir explicitamente um import e as quatro chamadas de shell por `sz_audio`; conferir que nenhuma outra linha da lógica foi alterada.
- [ ] Space Arena: substituir a função de áudio de OS, preservar a repetição agendada, converter somente os quatro limites float integrais e explicitar a troca do clear de terminal. Reproduzir primeiro o possível defeito de pausa no original desktop.
- [ ] Mapear cada P01–P16/S01–S10 a cenários determinísticos do código real e partidas completas, sem trocar algoritmos por mocks nem reduzir inimigos, partículas ou mísseis.
- [ ] Qualificar Pro, persistência, Mural/player anônimo e exportação. Medir frames/input, dez minutos e trinta reinícios nas versões de artefato finais, sem herdar medidas da distribuição996.
- [ ] Fazer review do diff e das provas, corrigir achados, concluir gates afetados e só então commit/merge em staging. Ativar o catálogo no Members por último, após qualificação.

## Fontes consultadas em 19/10/2026

- [PyPI miniaudio](https://pypi.org/project/miniaudio/): versão 1.71, Python >=3.8, cffi >=1.12; há wheels CPython 3.14 para Windows x64, Linux x64 e macOS x64/ARM64. Isso comprova disponibilidade do pacote, não reprodução nativa neste projeto.
- [Código oficial pyminiaudio](https://github.com/irmen/pyminiaudio/blob/master/miniaudio.py) e documentação indexada por Context7 `/irmen/pyminiaudio`: dispositivos/streams não bloqueantes e fechamento explícito; revisar a API da versão pinada antes de implementar o mixer.
- [MDN — autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): `play()` pode ser bloqueado; rejeição e interação precisam de tratamento e teste reais.

## Provas parciais locais — 19/10/2026

- Contrato, inspeção WAV, autoridade/cancelamento da mídia e exportação: 60 testes/516 asserções, zero falhas. O teste de integridade passou a usar SHA-256 binário independente (`node:crypto`); ele reproduziu e permitiu corrigir o uso indevido do helper de hash textual no serviço. Testes unitários de mídia substituem somente o transporte nativo e não certificam reprodução.
- Oito WAVs originais: tamanho/hash do corpus e metadados conferidos novamente após centralizar a política. Recibo ignorado `portable-audio-lot-a-20261019/corpus-receipt-r2.json`, SHA `cbcd8a72a0e7649b98b7c8c4a999b8b6ffabc0acbaa02e35f9187c3456e1da0b`.
- Backend Windows: seis testes Python locais com miniaudio instalado; oito WAVs no dispositivo WASAPI, mistura de duas vozes e cleanup. Instrumentação observou callbacks e amostras não nulas; não houve captura acústica.
- ZIP real novo, programa em `src/main.py`, ambiente virtual novo: instalação somente pelo `install.txt` exportado, build setuptools, dependências nativas pinadas, import vindo do ambiente e sem PYTHONPATH, sobreposição/Stop/WASAPI/cleanup e `pip check` aprovados. Fontes, material e sete arquivos do pacote conferidos por SHA. Recibo de preparação `portable-audio-export-r2/prepare-receipt.json`, SHA `fd6c58d807e57e03c0894227f5be74e1282c1ad589930466f4587cd34abd7773`; execução `exported/desktop-receipt.json`, SHA `70028435c32e5f7ae71e3770bd62d7ebd65f3d511b6e74781cce7884ece8194f`. Isso não aprova ainda os jogos nem a UI do VS Code.
- Serviço real em Chrome155/Edge155, contextos novos: BGM original de 23.472.658 bytes/122,251958 s, duas vozes com URL compartilhada, avanço de reprodução nativa, Stop libera `src`. Ausência de ativação antes do clique e presença após clique CDP real; nenhum flag de autoplay ou mute. Recibo `portable-audio-browser-r1/receipt-r4.json`, SHA `af874187c5b2908e53502e5bd7dc799911281cf485cf027f7ae420cccad80fc5`. Esta prova não executa CPython/frame/player público nem captura áudio acusticamente.
- A ferramenta de teste pode conceder ativação ao avaliar JavaScript, inclusive nas capturas do tracing. As novas provas usam CDP com `userGesture:false`, tracing desligado nesse recorte e clique de entrada real; a asserção de ausência de ativação permanece obrigatória. Falhas de instrumentação foram preservadas, sem relaxar a política de mídia.
- Caminho real Python→worker→supervisor→frame→sessão→áudio: Clássico e Pro/Chrome e Edge, duas vozes, Stop individual/geral e encerramento enquanto aguarda input, sem extensão Turtle. Autoplay sem gesto é recusado com diagnóstico acionável; módulo autoral `sz_audio` mantém precedência. Em `portable-audio-runtime-r1/e2e-r5`, 12 casos passaram e dois expuseram um layout incorreto do fixture de namespace Clássico (módulo deixado em `src/` com entrypoint na raiz). Após corrigir somente esse fixture, os dois casos passaram em `e2e-r6`. Não reclassificar o relatório r5 como 14/0 nem apagar as falhas de instrumentação anteriores.
- ZIP web real, Clássico e Pro, Chrome e Edge: quatro casos aprovados pelo próprio `serve.py` exportado, com ativação inicialmente falsa, clique Jogar, duas vozes, duas respostas de input, Stop individual/geral, reinício e encerramento sem iframe restante. Requisições HTTP somente ao pacote servido; blobs locais incluem o worker do frame de origem opaca (`blob:null`). Recibo `portable-audio-web-r2/execution-receipt-r3.json`, SHA `70205c97d0908f0137c3986b9c985243254441996b10d9411ed4d6c75815fb18`. Esse recorte não exercita autenticação/publicação/Mural do Members.
- O launcher hospedado da prévia Python precisava de `media-src blob:`; a ausência foi reproduzida no teste e corrigida sem liberar mídia de rede. Dez testes de armazenamento/serviço de preview passaram, preservando os negativos de autoridade, integridade, cancelamento e coleta.
- Nova distribuição **apenas local, com qualificação parcial**: `fd55a1d0d3e9046486a6a93a68eae5ed3447be025608afad7fae09757d606c7a` (39 arquivos), em `portable-audio-runtime-r2/distributions/`, inclui o botão inicial Jogar do launcher com áudio. A distribuição intermediária41 e a996 permanecem históricas. Os 39 arquivos e o manifesto da996 foram verificados antes/depois e preservados. Nenhuma promoção, catálogo ou infraestrutura foi alterado pelo lote.
- Superfícies React: projetos Python com materiais de áudio aguardam Executar no editor e Jogar no player público, em vez de tentar reproduzir automaticamente. Projetos sem áudio preservam o início existente. Quatorze testes de componente passaram com controller real e transporte inerte, incluindo espera pelo gesto/sem iframe, precedência, input e lifecycle; ainda é obrigatória a prova pelo fluxo publicado real.
- Variantes iniciais dos jogos, ainda sem execução integral: receitas em `gameVariants.ts` verificam SHA da fonte pinada e da saída. Pac-Man portátil `8bd915293088b0fa85a2313e046711d861f43c481aa691d88ba07402485819d8`; Space Arena portátil `191c837416ba35a3f737a082cc033f2b7225decef17d5a89a9b601023470940a`. Comparação independente de AST no CPython conferiu somente as substituições de import/som, quatro limites numéricos e limpeza de console previstas. Recibo `portable-games-r1/ast-receipt.json`, SHA `facd4c02c9e75a3b0a81ac609770671351708e3f2f975f4da055fc9bce6827b6`; verificação `verification-receipt.json`, SHA `e7ecff7b600ded111c07c0973138f1ddba6f89b94a7d3e32493e12e17907b4f5`. Esses hashes identificam a primeira adaptação, sem modernização do laço/pausa e sem aprovação de P01–P16/S01–S10.
- Checagem completa de tipos do Studio anterior à fundação Core/variantes: Node24.22.0/TS5.9.3, exit0 e nenhum diagnóstico, recibo `portable-audio-runtime-r2/studio-types-receipt-r4.json`. Alterações posteriores exigem os gates afetados; não herdam esse resultado.
- A definição de `sz_audio` passou a ser única no Core. Contrato/interpreter/exportação leem suas projeções; `_module.json` gerado alimenta versão, política e dependências na implementação Python, conferido no build e em teste. Os JSONs paralelos de política/dependências foram removidos. Após acrescentar stub PEP561 e referência, 26 testes de áudio/exportação e324asserções passaram. Importar a definição não constitui autorização nem comprova disponibilidade numa release antiga.
- Os contratos Core admitem `providedModules` opcional, sem defaults: 35 testes/261asserções aprovaram vínculos, adulterações e preservação das identidades históricas562/996/40ce/marker. O build emite descriptor/stub canônicos e vincula quatro artefatos compilados, sem ciclo de hashes; dois testes/10asserções passaram. O promotor preserva ausência nos registros legados e copia metadata declarada para a release. A nova distribuição local `19de08fbe232d293e833dc3097f880a129e651f14fd539380869031d06369b1c` tem41arquivos;996 foi novamente verificada antes/depois. Recibo `portable-audio-runtime-r3/build-receipt.json`, SHA `04c2a5e56ff975ee1e34a7cee5a37c1cefe2bfd74bf11d7eb91dfd258e23fbd6`. Ainda sem promoção.
- O pacote desktop atual passou em ZIP/venv novos:17arquivos exportados,10do pacote, sete arquivos instalados conferidos byte a byte, WASAPI/duas vozes/Stop/cleanup e pip check. Pyright1.1.414 pela entrada oficial aprovou o exemplo correto e recusou os três argumentos inválidos com reportArgumentType, sem diagnóstico de import ausente. Recibo `portable-audio-export-r3/verification-receipt.json`, SHA `d6b8458f93ad78bd39027398d466b1dbbd6482b19c4cd0901ee3f2b6ea653c73`. Não foi exercitada a UI do VS Code. A invocação QA inicial diretamente no bundle dist, sem bootstrap oficial, falhou e está preservada, com controles ortogonais que isolam a causa; não conta como falha do pacote exportado.
- Tutor: a rota extrai descriptors somente da release exata do catálogo retornado pelo Members; o cliente não fornece disponibilidade. Prompt inclui API/limites e separa módulos fornecidos de stdlib/extensões, omitindo a referência quando há módulo autoral. Dez testes/100asserções de Zappy passaram, incluindo positiva HTTP com release áudio, legado sem módulo, alegação do cliente ignorada e catálogo divergente recusado antes de reservar créditos/modelo. Três/18de contexto anteriores continuam identificados separadamente. Review independente somente leitura em `zappy-provided-modules-readonly-review-20261019-r1/`. Serviço de linguagem do editor passou tipos/RPC/testes locais; Builder e implantação coordenada continuam abertos.

O pacote desktop é instalável separadamente em um namespace de metadados sem colisão. Isso preserva os módulos, `requirements.txt` e `pyproject.toml` autorais e permite importar a biblioteca mesmo quando o entrypoint está em uma subpasta. A configuração inclui `_module.json`, `__init__.pyi` e `py.typed` como dados do pacote; o adaptador Turtle do navegador não acompanha a fonte desktop.

## Gate adicional — exportação histórica e desconhecida

O fluxo agora encaminha o catálogo do host e captura seus dados antes dos awaits/writers. A seleção valida o catálogo e resolve somente a identidade exata do projeto. Release conhecida sem o módulo não recebe pacote; release desconhecida/offline ou metadata adulterada preserva fonte/assets com aviso, sem inserir uma versão assumida. Descriptor sem implementação local correspondente produz aviso, sem substituição pela versão atual. O manifesto distingue release conhecida/desconhecida e pacote incluído/indisponível.

Contexto ligado por `Topbar` → `prepareSourceDownload` → `exportProjectSource/buildSourceFiles` → `buildPythonSourceFiles` → `buildPythonSourceMetadata`; montagem pura separada da seleção, sem autorização de execução. Gates focados:23testes/181asserções, incluindo ausência legada e lista vazia, identidade diferente, histórico indisponível, adulteração/getter, captura durante flush assíncrono e preservação de módulos/requisitos autorais. Review independente readonly em `source-export-historical-readonly-review/`, sem defeito confirmado.

ZIP/venv novos em `portable-audio-export-r4/`:17arquivos,10do pacote e sete instalados byte a byte; release exclusiva de QA `b50a2a1dd1dd6e110fa0b27bbe5e65ea09b71cf4f95be580b07da61b32b7b8f3` derivada dos41arquivos verificados da distribuição19de. A seleção exata foi observada no manifesto exportado. Instalação/pip check, duas vozes WASAPI/Stop/cleanup e Pyright oficial1.1.414 (correto:0erros; inválido:3reportArgumentType) passaram. Recibo `verification-receipt.json`, SHA `e808d8b95b7182980183e916a9b6bdb26923bf6b4825b2cc16166d820540ba8d`. Sem UI do VS Code, captura acústica, qualificação dos jogos completos ou promoção do catálogo.

Browser19de: a série `portable-audio-runtime-r3/e2e-r5` aprovou14cenários Clássico/Pro Chrome/Edge sem retries, mantendo negação de autoplay e prioridade dos módulos autorais. O gesto positivo agora exige clique físico confiável no botão via locator. Os negativos anteriores foram preservados: um deles registrou pointerup sem pointerdown/click; outro apresentou falha de preparação antes do áudio e não foi reproduzido nos3casos focados ou na série14. Essa observação intermitente ainda não possui causa demonstrada; a série verde não encerra sua investigação nem qualifica Mural/jogos/desempenho.

Review independente de fonte do lote em `portable-audio-independent-review-20261019.md`, SHA `5d9ba1264793ea1c65650f7f48f5940a8f93808e5439932a376347464c621164`: nenhum P1/P2 adicional confirmado em execução/exportação. Foi confirmada uma lacuna funcional aberta: descoberta, ajuda, Zappy/Builder e Pyright ainda não conhecem `sz_audio`. O próximo sublote deve publicar um descriptor de módulo fornecido pelo runtime, separado de stdlib e extensões, com disponibilidade derivada da release aprovada; a distribuição996 não deve anunciar um módulo que não possui. O descriptor deve alimentar documentação/stub/export sem fontes de verdade paralelas e preservar hashes dos releases antigos.

**Estado:** implementação local em andamento, sem commit/deploy deste lote. Permanecem abertos descoberta/tutor/análise estática do módulo, fluxo publicado do Mural com áudio, variantes e requisitos completos dos jogos, desempenho com a distribuição final, testes globais afetados e revisão final. A contagem de WAVs foi corrigida sem alterar hashes das fontes/recursos originais.
