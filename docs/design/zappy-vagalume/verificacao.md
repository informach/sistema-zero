# Verificação local — 12/09/2026

## Arquivos e imagens

- `node docs/design/zappy-vagalume/validar-assets.cjs`: 19 artes, 30 arquivos públicos e 4 uploads; PNGs mestres e cópias dos originais conferidos. Dimensões, hashes, transparência, cópias compartilhadas e limite de 5 MB para upload validados.
- Revisão visual das três capas e da base do certificado, preservando títulos e cenários. O certificado foi ajustado para A4 paisagem e recebeu o Zap pequeno na borda inferior.
- Revisão dos recortes sobre fundos claro e escuro. Corrigido o resíduo de opacidade do fundo verde das ilustrações; preservados o verde da tela do jogo e dos confetes.
- Comparação dos pixels das duas capturas: nenhuma alteração fora das regiões do mascote. Exportação WebP sem perdas para preservar os textos da interface.
- Galeria aberta em Chromium, com todas as 28 imagens carregadas (incluindo os quatro originais dentro das comparações), sem erros de JavaScript. Alternância de fundo conferida; viewport de 390 px sem rolagem horizontal. Para atualizar a galeria após editar o inventário: `node docs/design/zappy-vagalume/gerar-galeria.cjs`.

## Certificado

A [amostra local](qa/certificado-amostra-sem-validade.pdf) usa `renderCertificatePdf` do projeto com o PNG pronto para upload, um nome longo, texto em duas linhas, duas assinaturas de exemplo e QR. A entrada das imagens foi simulada localmente; três imagens foram carregadas (base e duas assinaturas), além do QR gerado pelo renderizador. O PDF tem uma página de 841,89 × 595,30 pt, praticamente A4 paisagem. A renderização em PNG foi inspecionada: a decoração e o Zap deixam livres os campos dinâmicos.

O nome, assinaturas e endereço do QR da amostra são fictícios. Não houve emissão no banco de dados, upload ou alteração de certificado existente. A emissão real com o cadastro do curso deve ser conferida em staging.

## Testes do projeto

| Comando / diretório | Resultado |
| --- | --- |
| `bun test` em `packages/funnel` | 250 passaram, 0 falhas |
| `bun run typecheck` em `packages/funnel` | 0 erros, 0 warnings, 4 hints em arquivos fora desta alteração |
| `bun run check` em `packages/funnel` | 158 arquivos conferidos, sem alterações automáticas |
| `bun test tests/mascot-assets.test.ts` em `packages/community-kids` | 2 passaram, 0 falhas |
| `bun test tests/ai-quota.test.ts tests/studio-zappy.test.ts tests/pensa-ai.test.ts tests/pensa-llm.test.ts` em `packages/member-shell` | 78 passaram, 0 falhas |
| `bun test src/components/tutor/ZappyPanel.test.tsx` em `packages/studio` | 22 passaram, 0 falhas |
| `bun test tests/certificate-pdf.test.ts` em `packages/member-shell` | 7 passaram, 0 falhas |

Total: **359 testes passaram**. A verificação cobre os arquivos e os componentes relacionados; não equivale a uma navegação autenticada em staging nem a um build completo de todos os serviços.

O Biome também conferiu os oito arquivos TypeScript/TSX alterados para a identidade do Zap, sem apontamentos. `git diff --check` não apontou erros de whitespace.

## Antes da promoção

Revisar em staging os diálogos, a moeda, ilustrações e funis em desktop e celular. Cadastrar as quatro imagens nos campos indicados no guia e emitir um certificado de teste com os textos e assinaturas reais. Os arquivos desta entrega são locais; nenhum deploy ou upload remoto foi executado.
