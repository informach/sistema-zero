# Marketing desktop

Bancada Electron de marketing, integrada aos serviços centrais do Sistema Zero. Usa os clientes oficiais locais do Codex e do Claude Code com a assinatura individual conectada e incorpora Remotion para prévia e render local. A implementação está em revisão por lotes; o piloto colaborativo e a liberação cotidiana ainda têm critérios abertos.

## Desenvolvimento

Na raiz do monorepositório, instale as dependências com `bun install`. Depois, neste pacote:

```sh
bun run build
bun run start
```

No Windows x64, “Instalar cliente” baixa a versão oficial compatível do Codex ou Claude Code, verifica tamanho/SHA-256 e prepara uma instalação privada do app. As instalações existentes no terminal são preservadas. A reabertura confere os arquivos instalados; corrupção oferece reparo. O botão Conectar chama o fluxo oficial e a modalidade da conta é conferida antes de produzir. O primeiro login em uma máquina sem credenciais ainda precisa de validação assistida. Credenciais de API não são usadas como fallback.

A bancada reúne direção, fontes, calendário, peças e revisões compartilhadas. É possível pedir ajustes, alternativas e adaptação de formato, criar/editar imagens, importar gravações, pedir cortes/legendas/animações e exportar MP4. Para editar, descreva o que mudar e o que preservar. A comparação e o desfazer preservam revisões anteriores. Aprovação, entregas e métricas usam os mesmos serviços da web.

“Resultados do projeto”, “Novidades observadas” e “Processo produtivo” consultam publicações/edições, fontes acompanhadas e produção da equipe. Pesquisa com assinatura e produção pesada executam neste computador; feeds públicos e serviços compartilhados continuam no servidor. A web identifica ações que exigem o desktop.

## Verificação

```sh
bun test
bun run typecheck
bun run check
bun run build
bun run smoke
```

As provas reais de IA consomem a cota normal da assinatura e são opcionais:

```sh
bun run prove:providers --text
bun run prove:providers --image
bun run start -- --smoke-text
```

`--smoke-render` usa `.cache/proof/source.mp4`; `scripts/prove-transcription.ts` usa `.cache/proof/fala-pt.wav`. Essas fixtures e os binários/modelos de teste não são versionados. Provas conectadas exigem o ambiente isolado de revisão; não apontá-las para produção. `--smoke-native-import --smoke-intelligence` confere as três telas analíticas com renderer/IPC/sessão/SQLite reais, usando a fixture criada por `scripts/prove-intelligence.ts`.

`--smoke-native-import --smoke-recorded-video` usa a gravação de tela do P21 em um projeto técnico separado. Exercita upload web, preparação, corte/texto pelo Codex, render e reprodução do proxy compartilhado. Reaberturas conservam os pedidos concluídos, sem nova inferência. Exige a stack nativa conectada ao R2 de testes e seu CORS configurado; veja [a revisão e seus limites](../../.audits/marketing-l6-recorded-video-review-2026-10-16.md). A gravação não tem fala e não substitui o ensaio com celular.

`bun run scripts/prove-media-library.ts` exercita a biblioteca compartilhada em Chromium isolado, com transporte controlado: paginação, arquivo recém-enviado fora da primeira página, queda de rede e confirmação automática. Não usa credenciais, armazenamento remoto ou inferência. `--baseline` reproduz a falha na implementação `d8271493d`; a saída esperada dessa comparação é código 1. Os resultados ficam em `.cache/media-library-review` e `.cache/media-library-baseline`.

## Dados e limites

O servidor mantém revisões confirmadas e arquivos compartilhados. SQLite e arquivos locais preservam rascunhos, fila, transferências e resultados em andamento, separados por conta/origem. “Confirmado” só aparece após o servidor aceitar a operação. Conflitos exigem conciliação; reconectar não apaga rascunhos nem repete geração automaticamente.

“Retomar resultado local” reutiliza o resultado preservado no computador de origem; “Solicitar nova geração” inicia outra tentativa. Limpeza de cache protege pendências e tarefas ativas. Originais importados permanecem intactos. Edição aprovada fixa copy, ordem, mídia e hashes; alterar rascunho não substitui o que foi aprovado.

O desktop verifica atualizações, permite baixar/cancelar e reinicia somente após encerrar sincronização, IPC e bancos locais. O instalador precisa passar por SHA-512 e assinatura Authenticode do publicador configurado; falha do verificador interrompe a atualização. A edição de revisão mostra que não recebe atualizações. A implementação e as provas de assinatura estão na [revisão de instalação e atualização](../../.audits/marketing-l2-install-update-review-2026-10-16.md). A distribuição assinada ainda exige certificado/feed reais e ensaio completo de atualização. Também faltam o piloto físico em dois computadores e cenários operacionais de vídeo. As auditorias distinguem provas locais de implantação do acervo de produção.

## Distribuição Windows

`bun run package` exige `MARKETING_DESKTOP_UPDATE_URL` (pasta HTTPS pública terminada em `/`) e `MARKETING_DESKTOP_PUBLISHERS` (Subject completo de cada certificado autorizado, separado por `|`). Configure o certificado real pelos mecanismos do electron-builder (`CSC_LINK`/`WIN_CSC_LINK` e senha, ou `MARKETING_SIGNING_SUBJECT` para certificado instalado no Windows). Não versionar certificados, senhas ou chaves. Sem essa configuração, o comando recusa gerar uma distribuição final.

O comando gera NSIS x64 assinado, metadados `latest.yml` e blockmap, com publicação automática desabilitada (`--publish never`). O operador deve disponibilizar esses arquivos juntos na pasta configurada e provar a atualização de uma versão assinada anterior antes da liberação. A configuração pública de origem/publicadores fica dentro do ASAR assinado; os publishers são verificados novamente após o download e antes do reinício, independentemente do `app-update.yml` externo. `bun run package:review` continua produzindo somente um diretório sem assinatura para inspeção.

O tamanho e o SHA-512 do manifesto selecionado também são reconferidos após o download e antes da instalação, inclusive depois de drenar a sincronização. Um outro executável assinado pelo mesmo publicador não substitui a versão escolhida.

`bun run scripts/prove-client-installation.ts` demonstra instalação pelos botões em perfil isolado e reabertura; não inicia login nem inferência. `scripts/prove-update-signatures.ts` verifica um binário oficial assinado, publicador incorreto, arquivo alterado, arquivo sem assinatura e verificador ausente. Isso não substitui a prova do instalador assinado do Sistema Zero.

O renderer possui ponte restrita, isolamento de contexto e sandbox. Somente o processo principal inicia clientes; o render usa um utilitário separado. Não acrescente shell, caminho livre, segredo ou execução genérica à ponte.

A organização foi informada como tendo até três pessoas; o enquadramento gratuito do Remotion e as condições dos provedores estão registrados nas [evidências L0](../../docs/plans/2026-10-15-marketing-desktop-l0-evidencias.md). Reavaliar a licença se a organização crescer.

A execução completa permanece no [plano de lotes](../../docs/superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md).

