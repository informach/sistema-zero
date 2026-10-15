# P54 · Fontes e produção

Produzido em 14/10/2026. Sete PNGs, 1080 × 1350, conforme a [ficha vigente](../../../../postagens/11-p51-a-p60.md#p54). Primeiro post da semana 11, desejo W24, série Teste em casa. Copy e legenda preservadas integralmente.

## Ideia e cenas

Combinar o uso do computador antes de começar, avisar quando estiver perto de parar, conferir o salvamento, anotar o próximo passo e seguir para outras atividades. Não foi prometida mudança de comportamento, fim das discussões ou duração ideal de tela. Os horários da agenda são um exemplo de organização familiar.

Seis fotografias geradas com a ferramenta nativa `image_gen.imagegen`. [Prompts integrais](prompts.json) e [origens dos arquivos](imagens-geradas.json). A capa definiu a aparência da família fictícia e da casa para as demais cenas.

- Slide 1: mãe e filho conversam com o notebook ainda fechado.
- Slide 2: detalhe da agenda compartilhada, com terça e quinta às 17h.
- Slide 3: a mãe avisa com calma, e a criança reconhece o aviso com o projeto ainda aberto.
- Slide 5: a criança escreve o próximo passo, com o personagem que já anda como referência na tela.
- Slide 6: computador fechado e menino com a bola, indo para outra atividade.
- Slide 7: mãe e filho observam o projeto e conversam sobre ele.

As pessoas não são alunos reais ou depoentes. As cenas não comprovam resultados. As telas das fotografias 3, 5 e 7 foram geradas com uma captura real do Estúdio como referência; são composições editoriais, não registros de uso por aquela família.

## Aviso de salvamento: componente original, estado de demonstração

A ficha pediu o cabeçalho da atividade, pois **Salvo** dentro do editor não substitui **Guardado na sua conta**. Não havia uma conta de demonstração conectada disponível nesta produção. Por isso, a imagem foi feita renderizando o componente original `LessonDraftStatus`, de `packages/member-shell/src/components/lesson-draft-status.tsx`, dentro de `LessonCopyProvider` com `KIDS_LESSON_COPY`, usando o CSS atual do Kids. O título e as classes do contêiner correspondem à parte esquerda do cabeçalho de `StudioBlockView`.

Os estados `saving` e `saved` foram fornecidos como dados controlados. O resultado visual e os rótulos foram conferidos; **não foi executado ou alegado um salvamento de conta na nuvem**. A captura não veio de uma sessão autenticada. Esta adaptação troca a captura de conta prevista na ficha por uma demonstração do componente real, mantendo a orientação e o aviso vigentes. Não foram reescritos o texto ou o ícone da interface. A fonte local é Nunito; o título usa a fonte de reserva disponível no ensaio.

No slide 4, o cabeçalho é mostrado acima e o mesmo aviso ampliado abaixo, com destaque amarelo e seta editoriais. Não foi usado o Salvo do editor como prova de sincronização. [Origem e limite da demonstração](interface-origem.json), [captura do cabeçalho](04-cabecalho-saved.png), [aviso ampliado](04-aviso-saved.png) e [registros de leitura](capturas-verificadas.json).

## Projeto que aparece nas fotos

Exemplo **Herói que anda**, exportação `animatedHeroExample` de `packages/studio/src/official-extensions/game-2d/examples/foundations.ts`. Projeto local isolado, sem dados de alunos, com o IR completo e os dois assets originais. O editor e o jogo foram abertos no Estúdio real. O comando `sz_g2d_top_down` move o herói em quatro direções com as setas, velocidade 3. A seta para a direita foi acionada antes da captura.

O enquadramento e o zoom dos blocos foram ajustados, sem alteração dos comandos ou parâmetros. O personagem amarelo aparece sobre fundo escuro. O pulo não está implementado neste exemplo; é a ideia de continuação escrita no bilhete. Não foi mostrado ou prometido um curso com esse projeto. [Tela de referência](03-estudio.png), [jogo](03-jogo.png) e [código original gerado](heroi-original.js).

## Arquivos e conferência

[Copy usada](copy.json), [verificação da montagem](verificacao.json) e [verificação final](entrega-verificada.json). Paleta azul, creme e amarelo, fonte Nunito 600/800, textos aplicados em HTML. Dimensões, carregamento de imagens e fontes, conteúdo dos sete slides, legenda, links e limites de layout conferidos. Inspeção visual das sete artes e da prévia móvel. Essa conferência não mede desempenho de publicação nem funcionamento da gravação em uma conta conectada.

Scripts em `output/instagram/p54-2026-10-14/`. A pasta de entrega contém os PNGs numerados, legenda, textos alternativos, prévia, montagem editável e instruções. Nenhuma publicação, agendamento, commit ou deploy foi realizado. Próximo carrossel: P55, terceira publicação da semana 11.
