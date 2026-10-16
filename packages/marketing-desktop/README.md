# Marketing desktop

Bancada Electron de marketing, integrada aos serviços centrais do Sistema Zero. Usa os clientes oficiais locais do Codex e do Claude Code com a assinatura individual conectada e incorpora Remotion para prévia e render local. A implementação está em revisão por lotes; o piloto colaborativo e a liberação cotidiana ainda têm critérios abertos.

## Desenvolvimento

Na raiz do monorepositório, instale as dependências com `bun install`. Depois, neste pacote:

```sh
bun run build
bun run start
```

O computador precisa dos clientes oficiais instalados. A interface verifica a modalidade de conta; o botão Conectar chama o fluxo nativo. O primeiro login via botão ainda precisa de validação assistida. Credenciais de API não são usadas como fallback.

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

## Dados e limites

O servidor mantém revisões confirmadas e arquivos compartilhados. SQLite e arquivos locais preservam rascunhos, fila, transferências e resultados em andamento, separados por conta/origem. “Confirmado” só aparece após o servidor aceitar a operação. Conflitos exigem conciliação; reconectar não apaga rascunhos nem repete geração automaticamente.

“Retomar resultado local” reutiliza o resultado preservado no computador de origem; “Solicitar nova geração” inicia outra tentativa. Limpeza de cache protege pendências e tarefas ativas. Originais importados permanecem intactos. Edição aprovada fixa copy, ordem, mídia e hashes; alterar rascunho não substitui o que foi aprovado.

Há empacotamento de revisão e política de distribuição, mas a prova de instalador/atualização assinados ainda está pendente. Também faltam o piloto físico em dois computadores e ensaios operacionais descritos no plano, incluindo arquivos grandes e cenários de vídeo. As auditorias registram o que foi testado; não confundir provas locais com implantação do acervo de produção.

O renderer possui ponte restrita, isolamento de contexto e sandbox. Somente o processo principal inicia clientes; o render usa um utilitário separado. Não acrescente shell, caminho livre, segredo ou execução genérica à ponte.

A organização foi informada como tendo até três pessoas; o enquadramento gratuito do Remotion e as condições dos provedores estão registrados nas [evidências L0](../../docs/plans/2026-10-15-marketing-desktop-l0-evidencias.md). Reavaliar a licença se a organização crescer.

A execução completa permanece no [plano de lotes](../../docs/superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md).

