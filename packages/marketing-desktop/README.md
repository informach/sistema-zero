# Marketing desktop

Bancada Electron do lote L0. Usa os clientes oficiais locais do Codex e do Claude Code com a assinatura individual conectada. Incorpora Remotion para prévia e render local. Não é ainda o produto colaborativo liberado para uso diário.

## Desenvolvimento

Na raiz do monorepositório, instale as dependências com `bun install`. Depois, neste pacote:

```sh
bun run build
bun run start
```

O computador precisa dos clientes oficiais instalados. A interface verifica a modalidade de conta; o botão Conectar chama o fluxo nativo. O primeiro login via botão ainda precisa de validação assistida. Credenciais de API não são usadas como fallback.

A interface permite pedir copy, criar/editar imagem pelo Codex, adicionar uma gravação, pedir alterações da composição e exportar MP4. Para uma edição, diga o que mudar e o que preservar. Desfazer está disponível para os ajustes de composição da sessão.

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

`--smoke-render` usa `.cache/proof/source.mp4`; `scripts/prove-transcription.ts` usa `.cache/proof/fala-pt.wav`. Essas fixtures e os binários/modelos de teste não são versionados. A transcrição ainda é uma prova de engenharia; sua interface pertence a L6.

## Dados e limites

Resultados são copiados para o diretório `userData/local-proof` do Electron, sem alterar os originais. A lista da interface e o histórico são locais à sessão. Arquivos não são sincronizados com o servidor; feche o trabalho exportando o resultado desejado. Não há instalador, atualização assinada, biblioteca recuperável, aprovação/publicação ou migração do acervo neste lote.

O renderer possui ponte restrita, isolamento de contexto e sandbox. Somente o processo principal inicia clientes; o render usa um utilitário separado. Não acrescente shell, caminho livre, segredo ou execução genérica à ponte.

A organização foi informada como tendo até três pessoas; o enquadramento gratuito do Remotion e as condições dos provedores estão registrados nas [evidências L0](../../docs/plans/2026-10-15-marketing-desktop-l0-evidencias.md). Reavaliar a licença se a organização crescer.

A execução completa permanece no [plano de lotes](../../docs/superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md).

