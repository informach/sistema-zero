# L6C — composição híbrida e adaptação (aberto)

## Comportamento implementado

- Pedido `video-adapt` transforma somente o item selecionado da sequência. Cria vídeo com identidade própria e origem versionada, arquiva o componente original e substitui seu ID na mesma posição da representação, em uma transação CAS. Os outros itens não mudam. Uma adaptação integral de formato continua usando o fluxo de representação derivada de L5. A mudança pontual não cria nem copia os outros stories.
- A arte com camadas permanece editável dentro da timeline; arquivo raster continua explicitamente raster. Não há extração fictícia de camadas. A conversão preserva copy/layout/CTA e permite somente duração, fades e movimento. O resultado ainda precisa de exportação.
- O histórico do pedido acompanha o novo vídeo pela aplicação registrada. Desfazer restaura componente e representação e arquiva o novo vídeo, sem apagar revisões. Seleção da interface acompanha a posição substituída, inclusive fora do primeiro item.
- Montagem híbrida compartilha Remotion entre Player e exportador. Cenas de arte, gravação, imagem animada, identificação, destaque, CTA, lista progressiva com IDs estáveis e contador validado. Fontes são aguardadas antes da conferência; textos excedentes/sobrepostos impedem exportação. Texto da arte é conferido contra a copy da revisão, incluindo mudanças de props e quadro.
- Pedido pode limitar a edição à cena, ao texto ou ao efeito. Servidor rejeita alterações no restante da montagem. Camadas protegidas preservam também o conteúdo vinculado e a geometria/fonte da composição.
- Identidade de render liga revisão/timeline/mídias/fontes ao bundle e worker efetivos, plataforma e arquivo final; a implementação e primeira prova constam no L6B.

## Evidências

- PostgreSQL real: 27 testes/147 asserções (`execution.postgres.test.ts` + `video-proposal.test.ts`). Conversão de arte editável e raster, sequência de dois itens, preservação do outro item, histórico no novo vídeo, desfazer, concorrência e rejeição de copy adulterada. Também escopo de texto/efeito e proteção de copy vinculada/canvas da arte. Arquivos confirmados são fixtures de persistência; não prova armazenamento remoto.
- Clientes oficiais com assinaturas: `.cache/video-adaptation-proof/{codex,claude}-evidence.json`, ambos produziram 90 frames a 30 fps, arte editável, mesmo layout/copy, e passaram pelo validador do servidor. Há uma resposta malsucedida anterior do Claude por limite de turnos, preservada no log; não foi contada como sucesso.
- O protocolo de saída estruturada do Claude pode finalizar via ferramenta interna de saída. O limite passou a dois turnos para resposta estruturada, uma única invocação, ferramentas externas desabilitadas, sem retry automático. A prova concluída declarou `num_turns: 2` e uma iteração de inferência. Referências oficiais: [saída estruturada](https://code.claude.com/docs/en/agent-sdk/structured-outputs), [CLI](https://code.claude.com/docs/en/cli-reference). Não confundir turnos internos com uma segunda geração solicitada ao app.
- `.cache/hybrid-video-proof/evidence.json`: primeiro render por utilityProcess Electron passou: 1080×1920, 6016 ms, H264/AAC, arte preservada com erro médio RGB 2,036/255 contra PNG, original preservado; gravação sintética de cores com áudio, lista/contador/CTA e legenda com acentos. Preflight recusou texto excessivo sem registrar final. Frames de arte e lista foram inspecionados. O render foi repetido após IDs estáveis e revisão de fontes/preflight, com o mesmo resultado: `packages/marketing-desktop/.cache/hybrid-render-reviewed.log`.
- Desktop: 30 testes/1359 asserções passaram. Contratos: 6 testes/21 asserções. Build passou após revisão de contratos. TypeScript desktop passou após corrigir a tipagem do MIME no script de prova (`packages/marketing-desktop/.cache/typecheck-l6c-corrected.log`). Render atualizado passou; as pendências abaixo ainda impedem encerrar o lote.

## Pendências

- Prova integrada pela interface, com sincronização R2 e segundo computador. O ambiente de revisão não tem R2 configurado; não substituir isso por prova de cache local.
- Autoria de código de composição pela IA em escopo isolado e validação antes de integrar, prevista no plano, ainda não implementada. Composições atuais são receitas parametrizadas e validadas.
- Reuso de trechos/dependências no render, validação específica de formato de destino e integração da aprovação exata em L7.
- Matriz completa web → desktop e seleção/histórico no fluxo visível, cancelamento/recuperação e nova prova de fontes/overflow após alterações finais.
- L6A (captura atual P07/crop de blocos/identidade do motor), integração de L6B e débitos anteriores continuam abertos. Depois: L7, importação integral L8A/B, piloto L9, L10, full review, commit e merge em staging local.

Sem commit, merge, push, publicação ou liberação nesta revisão.

## Atualização integrada em 16/10

A stack nativa passou a usar o bucket R2 de staging e confirmou os originais do acervo em L8. A ausência de configuração R2 registrada acima é histórica. Aprovação da edição exata e vínculo da entrega foram implementados em L7. Essas entregas não demonstram, por si, o fluxo completo de vídeo pela UI em dois computadores. Autoria isolada de código e reutilização parcial do render continuam pendências funcionais de L6C, além dos ensaios de vídeo e do piloto.

Atualização posterior: o reaproveitamento parcial de vídeo e da faixa contínua de áudio foi implementado e comprovado em Electron real, incluindo comparação com render integral, alteração visual/volume e cancelamento/retomada. Ver [revisão do cache](marketing-l6-render-cache-review-2026-10-16.md). Essa pendência funcional está resolvida; autoria isolada de código e os demais critérios operacionais continuam abertos.

Atualização da autoria: a geração/edição de fonte Remotion em worker isolado foi integrada aos pedidos, histórico, validação do servidor e prévia sincronizada. Provas com Codex, Claude, recuperação de checkpoint, PostgreSQL nativo e formulário Electron → R2 → web constam em [revisão da composição](marketing-l6-composition-review-2026-10-16.md). Essa pendência funcional também está resolvida. O lote inteiro continua aberto pelos ensaios operacionais listados no plano.
