# A Ilha do Farol: números simples

> Execução nesta sessão, seguindo `executing-plans`, com conferência antes da conclusão.

**Objetivo:** usar inteiros ou no máximo uma casa decimal em todos os números dos blocos dos projetos da Ilha do Farol.

**Decisão aprovada:** simplificar a configuração do jogo e alinhar projetos progressivos, manifestos e material do curso; conservar a sequência pedagógica. A precisão interna das malhas 3D e dos cálculos do motor não é conteúdo dos blocos e permanece intacta.

**Arquitetura:** definir tamanhos e posições didáticos diretamente na autoria do projeto, em vez de expor os centros calculados pelo Blender. Gerar novamente os derivados pela fonte canônica. Conferir os modelos reais nas colisões e executar os objetivos pelo teclado no navegador.

**Tecnologias:** TypeScript, Bun, Blockly/IR, GLB, Chromium e os geradores existentes do curso.

## Etapas

- [x] Conferir os números das onze etapas e das variações, os materiais e os quatro cursos que reutilizam `ilhaSource`.
- [x] Adicionar a verificação dos números visíveis nos blocos, no código executável e nos arquivos entregues. Confirmar a falha antes do ajuste.
- [x] Alterar `docs/aulas-interativas-tecnico/qa/ilha-do-farol-projeto.ts`: tamanhos e posições explícitos com no máximo uma casa decimal, inclusive destino do barco. Avatar de tamanho 1,6 em altura 0,8; pedra de tamanho 4,5 em (-2; 1,2; -0,5).
- [x] Conferir `ilha-obstaculos.test.ts` contra a posição e escala efetivas do projeto; manter o planejamento do verificador coerente com os sólidos.
- [x] Registrar a regra nas orientações do curso e nas notas de gravação; regenerar manifestos, roteiros e projeto portátil. Regenerar também os exemplos que herdam a base da Ilha.
- [x] Conferir o passo a passo e o PDF; regenerar o PDF se houver mudança no seu conteúdo.
- [x] Executar testes da Ilha e dos quatro cursos dependentes; validar os manifestos e a integridade dos derivados.
- [x] Executar no navegador jogo correto, personalizado, chave em outra posição, chave inalcançável e vitória sem repetição; inspecionar a cena e os encaixes.
- [x] Revisar o diff, registrar evidências e informar o resultado e o estado de publicação.

## Comandos principais

```powershell
bun test docs/aulas-interativas-tecnico/qa/ilha-do-farol.test.ts docs/aulas-interativas-tecnico/qa/ilha-obstaculos.test.ts docs/aulas-interativas-tecnico/qa/farois-basicos.test.ts
bun docs/aulas-interativas-tecnico/qa/gerar-ilha-do-farol.ts
bun docs/aulas-interativas-tecnico/qa/gerar-moedas.ts
bun docs/aulas-interativas-tecnico/qa/gerar-cabana.ts
bun docs/aulas-interativas-tecnico/qa/gerar-ponte.ts
bun docs/aulas-interativas-tecnico/qa/gerar-simbolos.ts
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts correto
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts personalizado
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts outra-posicao
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts chave-alta
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts uma-vez
```

Os cenários de navegador da Ilha escrevem na mesma pasta de execução: executar sequencialmente. Não alterar projetos salvos por alunos. Os geradores são locais e não importam no Admin nem publicam aulas.

## Resultado

64 testes aprovados; 51 manifestos válidos; 292 clipes conferidos, sem erros. Cinco cenários reais no Chromium conferidos: jogo correto, personalizado, outro esconderijo, chave alta rejeitada e farol que só acende uma vez. PDF de 30 páginas regenerado, sem números com mais de uma casa decimal; página de personalização e cena do jogo inspecionadas visualmente. Evidências locais em `.cache/ilha-numeros-simples-20261108/`.

Ajustes concluídos nos arquivos locais. Não foi feita importação nem publicação remota nesta entrega.
