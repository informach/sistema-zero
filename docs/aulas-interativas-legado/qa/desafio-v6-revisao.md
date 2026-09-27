# Revisão do Desafio do Primeiro Jogo — 12/09/2026

O pacote está pronto como autoria local: seis roteiros revisados, manifestos v4, mapas de montagem, configurações do Estúdio e seis comparações HTML. Os originais e as aulas publicadas não foram alterados. A correção de espaçamento foi feita no CSS da página infantil.

## Escopo conferido

Foram lidos integralmente os seis roteiros Markdown da sequência atual: introdução e Dias 1–5. A estrutura antiga de três dias foi identificada como arquivo histórico. O YAML e as capturas da introdução foram consultados como referência complementar, sem confundir a interface antiga com a página por seções.

O validador compara SHA-256 das fontes, texto de cada recorte, todas as seções de origem, reprodução exata dos roteiros/manifestos/mapas e as configurações sugeridas. Não há minutagem inventada: `inSeconds` e `outSeconds` ficam nulos até a edição dos vídeos.

Resultado: **78 seções, 61 clipes planejados, 17 demonstrações, 6 experimentações, 32 aplicações, 5 entregas e 12 perguntas finais**. A demonstração é um vídeo isolado; a experimentação tem objetivo próprio e não modifica o Estúdio. Não foram acrescentadas tarefas de exploração livre para concluir.

## Correções pedagógicas e técnicas

- Coordenadas da nave identificam o canto superior esquerdo da caixa. x 400 com largura 54 produz centro x 427. A posição gravada foi conservada e a explicação corrigida.
- Ler o centro x e o topo y em cada evento posiciona o tiro novo; não move tiros antigos junto da nave.
- Nascimento por intervalo foi separado de velocidade de queda. O sorteio de x pode repetir, e o tamanho do kit varia em torno da base configurada.
- A nave perde vidas 3 → 2 → 1. Como o asteroide que bate foi removido, a proteção temporária atende novos contatos próximos.
- O evento Espaço agora recebe `Se a tela é jogando`, além das proteções do motor e do relógio de asteroides.
- Reiniciar volta ao estado `inicio` configurado em Ao iniciar; outro Enter começa a partida. As dicas dos finais foram corrigidas.
- A ordem original das condições resolve meta e zero vidas no mesmo quadro em `fim`. A ordem é verificada e existe um teste que rejeita sua inversão.
- A introdução usa a interface atual e distingue rascunho local de entrega. O tour de avatar, quarto e recompensas foi reservado para ambientação opcional; não é requisito para começar o jogo.

## Evidência de execução

**44 testes passaram**, sem falhas na execução final:

| Verificação | Resultado |
| --- | --- |
| `packages/studio`: `bun test src/blockly/__tests__/desafioEditorial.test.ts` | 15 testes |
| `packages/members`: `bun test tests/integration/desafio-import.test.ts tests/integration/learning-import.test.ts` | 8 testes |
| `packages/community-kids`: `bun test tests/lesson-sections.test.tsx` | 21 testes |

Os projetos de QA foram escritos independentemente dos objetos de critérios, carregados e salvos pelo Blockly e executados no runtime real do Jogo 2D. Cobrem setas e limites, origem/subida/limpeza de tiros, permanência de asteroide que ainda está entrando, remoção do que já saiu, colisão, pontuação, dano, proteção, menu sem disparo, derrota, reinício e pontuação real até 26. O teste de coincidência verifica a precedência do fim.

Os testes de erro rejeitam x fixo no tiro, vy confundido com posição, placar literal, vítima errada do dano, tiro ou asteroide fora da condição, falsa implementação de reinício e ordem invertida dos finais. Os critérios não são uma prova de equivalência de qualquer programa possível: qualidade visual, som, jogabilidade e outros comandos acrescentados pela criança continuam na revisão do professor.

O ensaio HTTP usa o importador real com repositórios em memória: exige preparar o Estúdio quando necessário, preserva identidade, configuração, cadeia, vitrine e projeto inicial, importa critérios e clipes e permite reimportar sem duplicar. O conteúdo publicado permanece igual. Não houve importação em banco de produção.

Passaram também:

- `bun docs/aulas-interativas/qa/validar-desafio-v6.ts '<pasta original>'`.
- `bun run typecheck` em `packages/community-kids`.
- `bun run typecheck --project ../../docs/aulas-interativas/qa/tsconfig.desafio.json` em `packages/studio`, incluindo os arquivos de autoria e validação.
- Biome nos 14 arquivos novos de TypeScript/TSX/configuração e `git diff --check`.

## Navegador e espaçamento

O tema ainda tinha `margin-block-end: 0` no cabeçalho, de quando título e primeiro bloco formavam um só cartão. O cabeçalho passou a ficar fora dos painéis, mas essa regra anulava o `space-y-5`. Ela e os seletores antigos de união foram removidos; o cabeçalho agora é um cartão completo e o contêiner mantém o intervalo.

O componente real `LessonSections` com o CSS real foi medido em larguras 390 e 1200: **20 px** entre cabeçalho e próximo conteúdo. Foram conferidos observação, Estúdio e modo compacto Criar, sem rolagem horizontal. O conteúdo interno do vídeo/Estúdio é substituído por uma área de exemplo nessa prévia de layout; não é um teste de vídeo autenticado.

As seis experiências foram executadas no `LearningHtml` real em 320, 390 e 1200 px: **18 percursos por teclado**, com restauração parcial e completa, duas situações registradas e três botões encerrados ao final. Os testes por mouse passaram nas seis. Após a revisão visual, pedras e corações receberam enquadramento maior, e o texto repetido dos resultados foi reduzido. Alturas finais medidas entre 706 e 902 px, abaixo do limite do iframe, sem conteúdo cortado nem rolagem horizontal. Não houve erros de página.

O navegador integrado estava indisponível; a verificação usou Chrome isolado via Playwright, sem perfil pessoal nem cookies. [Dados medidos](desafio-v6-evidencias/navegador.json), [comparação de intervalos](desafio-v6-evidencias/intervalo-desktop.png), [vidas no celular](desafio-v6-evidencias/protecao-mobile.png), [espaçamento desktop](desafio-v6-evidencias/espacamento-desktop.png) e [espaçamento compacto](desafio-v6-evidencias/espacamento-mobile.png).

## O que depende de produção

Editar e vincular os 61 clipes, confirmar os gestos da interface nas novas capturas, configurar a cadeia e os blocos no admin e revisar a publicação do Dia 5. Os arquivos `configuracao-estudio.json` são campos para conferir no bloco existente; não substituem o projeto inicial. Se já há uma cadeia, deve-se conservar seu nome nos cinco dias.

Não houve piloto com crianças nem medição de tempo de aprendizagem. As durações propostas incluem construção e são estimativas. O harness do runtime verifica comportamento e chamadas com canvas simulado; não prova composição de pixels, contraste ou qualidade de áudio do jogo final.
