# Marketing desktop — implementação e evidências de L0

Data: 15/10/2026. Referências: [proposta](2026-10-15-marketing-app-fluxo-editorial-proposta.md) e [lotes](../superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md).

## Estado real

A bancada local em Electron foi implementada em `packages/marketing-desktop`, com a composição interna em `packages/marketing-production`. Texto nas duas assinaturas, criação/edição nativa de imagem e render de vídeo tiveram execução real. Isto não é a liberação cotidiana L9.

L0 permanece em validação: o reconhecimento das contas já conectadas foi exercitado; o primeiro login de uma conta desconectada pela interface ainda precisa de validação assistida. O código chama o fluxo oficial, mas a prova não encerrou nem substituiu as sessões existentes para simular uma instalação limpa. Também não foi provocada uma falha real de geração de imagem no provedor: protocolo inválido, timeout, fechamento, cancelamento e imagem inválida foram exercitados de forma controlada.

Nenhum banco, dado de marketing em produção, publicação ou importação de acervo foi alterado. L1–L11 permanecem pendentes. As alterações preexistentes de Studio e outros pacotes foram preservadas.

## Enquadramento dos provedores

A implementação é uma ferramenta interna local: o usuário inicia o trabalho no próprio computador, com sua conta no binário oficial. A futura sincronização transporta materiais editoriais e resultados, sem credenciais de inferência, sessões privadas ou delegação da assinatura a colegas.

- **Codex:** app-server local, autenticação gerida pelo cliente, conta `chatgpt`. A documentação admite a continuidade de autenticação de aplicações locais ou abertas; serviços comerciais/hospedados exigem outro enquadramento. Aplicar essa distinção ao desenho interno é uma interpretação arquitetural, não uma autorização individual emitida pela OpenAI. A distribuição não deve transformar o servidor em intermediário de inferência. [Documentação oficial](https://learn.chatgpt.com/docs/app-server#auth-endpoints).
- **Claude Code:** executável oficial sem modificações, conta individual já conectada, modo headless oficial. O app não recolhe tokens nem implementa OAuth próprio. Os métodos nativos do binário permanecem intactos; esta bancada somente executa o caminho de assinatura autorizado pelo usuário e não inicia cobrança por API. As condições de integração incluem os termos comerciais aplicáveis ao produto e autenticação de cada usuário pelo próprio provedor; isso deve constar da distribuição. [Condições oficiais](https://code.claude.com/docs/en/legal-and-compliance).
- Limites e disponibilidade das assinaturas continuam valendo. Não foi medido um custo monetário por execução nem prometida capacidade ilimitada.
- Não há integração OpenRouter nestes pacotes. O fluxo antigo do app web ainda existe e não foi substituído nesta prova.

## Versões verificadas

| Componente | Versão / modalidade |
| --- | --- |
| Electron | 44.7.2 |
| Remotion, Player, Media, Renderer, Bundler, install-whisper-cpp | 4.0.535, versões alinhadas |
| React / React DOM | 19.2.4 |
| Vite | 8.3.4 |
| Bun da máquina | 1.3.11 |
| Node da máquina | 24.15.0 |
| Codex CLI | 0.162.1; ChatGPT pro |
| Claude Code | 2.1.299; Claude max |
| Whisper.cpp | 1.6.0, binário Windows pré-compilado; modelo base multilíngue |
| FFmpeg da máquina | N-123778-g3b55818764-20260331 |

Os tipos do protocolo instalado foram conferidos: `thread/start.sandbox` recebe `read-only`. Os eventos `item/completed` de `imageGeneration` fornecem o resultado; textos com nomes de arquivo não são tratados como artefatos.

## Provas com inferência real

A execução por `electron . --smoke-text --smoke-render` carregou o renderer, chamou sua ponte IPC e concluiu as duas tarefas textuais:

| Provedor | Modalidade retornada | Tempo observado |
| --- | --- | --- |
| Codex | ChatGPT pro | 15.555 ms |
| Claude Code | Claude max | 4.663 ms |

Esses tempos são observações de pedidos curtos, não metas de desempenho. Uma execução inicial do Claude terminou com código 1; a repetição isolada e depois o percurso pela ponte concluíram. Não foi determinada a causa daquela falha inicial, e o app não faz repetição automática de inferência.

Pelo mesmo adaptador de produção da bancada, o Codex criou uma estrela amarela sobre fundo azul e depois editou somente a cor da estrela para verde. As duas imagens foram inspecionadas visualmente; formato/composição/fundo permaneceram equivalentes.

| Artefato | Bytes | SHA-256 |
| --- | ---: | --- |
| native-original.png | 1.213.234 | c63a8623f97224e23219d66c7165c5128d58a58415b3935e51e667fd890f8357 |
| native-edited.png | 1.384.050 | 3feea95a3bff9127012092ba537b2cc3169e0acb8bcca5fd81c13307bd27996b |

Os arquivos estão em `packages/marketing-desktop/.cache/proof/`, ignorados pelo Git. Não foram enviados ao servidor. A prova de imagens usou o adaptador diretamente; não simula cliques de ponta a ponta na interface.

## Remotion incorporado e mídia

`StoryComposition` é importada pelo Player e pelo entrypoint do renderer. A pessoa fornece o pedido; o assistente devolve um patch validado de título, subtítulo, cor, duração ou corte inicial. Campos não pedidos são preservados, a revisão anterior permanece no histórico de sessão e há Desfazer. A bancada ainda não implementa a timeline completa de L6.

A prova de render pela ponte Electron usou um clipe sintético de seis segundos, cortado a partir do segundo 1, texto animado e áudio. O MP4 observado tinha H.264, 360 × 640, 30 fps, vídeo de 2 segundos e áudio AAC de 2,005 segundos. O frame extraído mostrou o relógio da fonte no segundo 2 ao observar o segundo 1 da saída, confirmando o corte inicial. Isso não substitui testes com gravações reais de celular.

Correções encontradas por execução real:

1. O utilitário de render permanecia ativo por causa da porta de mensagens do Electron; agora emite o resultado, esvazia stdout e encerra, permitindo que o supervisor finalize o arquivo.
2. A resolução de dependências do monorepositório produzia duas instâncias de Remotion. O teste de prévia falhou antes da correção. Versões/peers foram alinhados e o Vite deduplica React, React DOM e Remotion; o teste passou com frame 30 e largura 720 reais da composição.
3. Medidas de texto e decoração passaram a acompanhar a resolução. CSS de vídeo da interface foi limitado à área de resultados para não interferir na composição.

O render usa um processo utilitário separado e concorrência de dois frames. Há cancelamento e limite de dez minutos. Uma tarefa pesada por vez na bancada. Não foi feito benchmark de RAM, 4K, vídeo longo, precisão de cortes em todas as timebases ou todos os codecs.

Após a revisão visual final, o smoke foi repetido com sucesso. MP4 final: 300.423 bytes, SHA-256 `a3f95860d5711a5b6c81b396a00f6831c0fc63ebfb3a1b42e29f24125b3ebfc6`.

Artefato local: `%APPDATA%/@sistemazero/marketing-desktop/local-proof/assets/3b485d41-57df-401e-9790-65dc3645861a.mp4`. A captura da interface está em `local-proof/smoke.png`. Os metadados mantêm H.264/AAC, 360 × 640 e 30 fps.

## Transcrição e provisionamento

Um áudio de teste em português foi sintetizado localmente com a voz Microsoft Maria do Windows e convertido com FFmpeg para PCM mono de 16 kHz. O Whisper.cpp base transcreveu em 9.556 ms a frase “Uma ideia pode virar um jogo. Vamos criar uma cena e testar o que acontece.”, com offsets temporais. O JSON está no cache da prova. É uma fixture curta e limpa, não uma medição de qualidade em gravações reais.

- **Chromium:** o renderer Remotion provisionou o Chrome Headless Shell no cache local do pacote e o utilizou no render.
- **Whisper:** `@remotion/install-whisper-cpp` instalou a versão Windows pré-compilada e o modelo no cache. Versões mais novas exigem avaliar toolchain, em vez de pressupor CMake disponível. [Instalação oficial](https://www.remotion.dev/docs/install-whisper-cpp/install-whisper-cpp).
- **FFmpeg:** a prova utilizou o executável já instalado. Esse build habilita GPL/version3; ele não foi redistribuído nem incorporado a um instalador. L2/L6 devem fixar origem, hashes, avisos/licenças e instalação gráfica dos binários escolhidos.
- **Fontes:** a composição de prova usa Arial do sistema. A produção real deve usar os arquivos Nunito e licença já presentes no acervo, com versionamento e carregamento determinístico.
- **Studio:** a preparação P29 existente consome `gameThreeDRuntime`, exemplo oficial, `generateProjectFiles` e build com Bun/Three. Captura precisa ainda de navegador, assets/fontes resolvidos e estado reproduzível do jogo; os testes existentes usam Playwright. Esta etapa inventariou essas dependências, sem implementar ou validar o pipeline de captura do Studio.

## Licença Remotion

O usuário confirmou que a organização possui **até três pessoas**. Esse enquadramento permite a licença gratuita, incluindo automação, conforme a página oficial vigente. Não foi adquirida licença Company nem Editor Starter. Reavaliar quando a organização atingir quatro pessoas ou mudar o modo de uso/distribuição. [Licença e preços](https://www.remotion.dev/docs/license/pricing).

## Limites de segurança e persistência da prova

O renderer usa isolamento de contexto e sandbox, sem Node, navegação externa ou IPC genérico. A origem e o frame de cada chamada são verificados. Os clientes são iniciados sem shell e com ambiente permitido explicitamente, excluindo chaves de API e variáveis de injeção de runtime. O servidor de mídia escuta somente loopback, exige token aleatório de sessão e serve apenas IDs registrados, com suporte a byte ranges.

Isso não equivale ao isolamento de produção de L2/L6: o Codex usa sandbox somente leitura e rejeita pedidos de aprovação; as instruções limitam ferramentas, mas não são uma fronteira de segurança suficiente para código ou referências não confiáveis. A bancada não executa código arbitrário gerado.

Arquivos e metadados são gravados no diretório `userData/local-proof` do Electron. A biblioteca na interface e o histórico de composição são de sessão; a retomada durável e sincronização ainda não existem. Portanto, o aviso de bancada local permanece visível.

## Verificação reproduzível

Nos dois pacotes: `bun test`, `bun run typecheck`, `bun run check`. No desktop: `bun run build` e `bun run smoke`.

- 9 testes desktop: fronteiras de mídia/ambiente, protocolo fragmentado, aprovação recusada, falha do processo, timeout, redação de credenciais e cancelamento.
- 2 testes de composição: preservação de base/clip e rejeição de patch inválido.
- Smoke Electron verifica ponte funcional, ausência de Node no renderer e frame/dimensões reais do Player.
- Build concluiu, com avisos conhecidos do Vite sobre diretiva `use client` em um bundle puramente cliente e tamanho do chunk do Player. Não foram suprimidos nem apresentados como otimização concluída.
- Provas que consomem assinatura são opt-in: `bun run prove:providers --text`, `--image` e `bun run start -- --smoke-text`. Não pertencem ao CI automático.
- Login inicial de uma conta desconectada, instalador em duas máquinas, sincronização, acervo completo e piloto de equipe continuam explicitamente pendentes.

