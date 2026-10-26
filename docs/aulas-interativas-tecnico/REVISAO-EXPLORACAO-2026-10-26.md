# Revisão da exploração livre — Cadê Todo Mundo e A Chave do Farol

Data: 26/10/2026. Escopo: implementação das propostas aprovadas nos componentes reais, conteúdo dos cursos e orientação de autoria. Trabalho em `feat/courses-free-exploration`, com a `staging` local `b2cf04e94` integrada antes da validação final.

## Resultado por experiência

| Experiência | Comportamento implementado |
| --- | --- |
| Cadê: toque e reação | Os dois esconderijos podem ser testados desde o começo, com ou sem reação. Esconder de novo permite repetir e trocar a ordem das comparações. |
| Cadê: achados | Procurar, tocar no vazio, repetir um toque e reiniciar a busca estão livres. Valor anterior, soma, valor atual e placar tornam a contagem observável. |
| Farol: quadros | Adicionar/retirar o bloco, apertar/soltar a tecla de teste e avançar o tempo são controles distintos. É possível avançar 1 ou 10 quadros repetidamente ou ligar a passagem automática. Início, lugar anterior, lugar atual e próximo quadro têm referências visuais; x/y ainda não são introduzidos. |
| Farol: limite | Comparação com/sem o bloco de limite, retorno ao início e teste das duas ordens dos comandos. Sem antecipar coordenadas. |
| Farol: memória | Coletar com/sem guardar, afastar e reiniciar. Alterar a regra depois da coleta vale para a próxima coleta; não reescreve o passado. |
| Farol: porta | Alternar livremente entre ter/não ter chave e repetir os testes da mesma regra. O resultado evidencia qual caminho foi executado. |
| Farol: posição | Os dois eixos ficam disponíveis desde o início, com botões, controles deslizantes e valores editáveis. As quatro direções contam como descobertas; o alvo é opcional. |

O destaque usa a cor principal do tema para sugerir ações. As demais opções continuam utilizáveis. Concluir as comparações não bloqueia a experiência. Reiniciar uma tentativa conserva descobertas; recomeçar a experiência limpa o ensaio; desfazer restaura a cena e as evidências daquele retrato. A orientação e as falas de Zappy acompanham o estado atual.

O quiz mantém previsão, demonstração, correção e nova tentativa. O Farol ganhou cenas de ordem, memória, porta e novo teste. O avanço aguarda a demonstração terminar. As respostas corretas e explicações continuam privadas no contrato público; a correção de aluno continua no servidor.

## Achados corrigidos durante a revisão

| Achado | Correção e verificação |
| --- | --- |
| Uma sequência rígida impedia experimentar outra hipótese primeiro. | Metas por evidência, controles livres e testes de percursos em outra ordem. |
| Desfazer/recomeçar podiam manter descobertas incompatíveis com o ensaio exibido. | Restauração específica para exploração livre, com replay equivalente no servidor. As cenas antigas preservam sua semântica. |
| O relógio podia interromper a exploração ao sair da tela ou carregar fração de tempo para um avanço manual. | Continuação do relógio na experiência de quadros e limpeza da fração no avanço manual. Testes do motor e navegador com 150 quadros. |
| Mudar a regra depois de recolher a chave podia comunicar uma memória retroativa. | Regra e memória separadas; instrução explica que a mudança vale para a próxima partida. |
| A avaliação do Farol precisava observar a execução sem depender de coordenadas fixas. | Aproximação por teclas reais, geometria de contato da extensão e desvio da chave no teste sem chave. Checkpoints verificam memória e os dois caminhos da porta. |
| O tempo inicial de aproximação reprovava um jogo válido mais lento. | Limite por deslocamento de 7,5 s, mantendo os limites globais de 15 s por objetivo e 40 s por seção. Verificação com velocidades 1, 3 e 8. |
| O novo observador exigia proteger a leitura de sprites e liberar recursos mesmo com interrupção. | Identidade privada, leitura sem executar getters autorais, verificação de pausa/reinício/erros e liberação de teclas e handles. Testes de inspeção, contratos, rota e interrupção. |
| O novo passo de execução precisava atravessar todos os contratos. | Validação no Core, Admin, Members e runtime; rejeição explícita no Pro/Python, onde esse passo não é suportado. |
| Demonstração do quiz podia perder a sequência ao trocar de pergunta. | Estado vinculado à pergunta e avanço bloqueado durante a animação; exercício de erro, nova tentativa e conclusão no navegador. |
| Roteiros, inventários de fala, contagens de objetivos e cadernos tinham referências à sequência anterior. | Fontes e derivados sincronizados; passos de construção no Estúdio preservados. PDFs reexportados e conferidos. |
| O “antes” dos protótipos poderia mudar junto com os manifestos atuais. | Retrato dos blocos anteriores fixado nos protótipos; a prévia de verificação usa os componentes e manifestos atuais. |

## Evidências de validação

As quantidades abaixo pertencem a suítes que podem se sobrepor; não representam uma soma de testes únicos.

| Verificação | Resultado |
| --- | --- |
| Core de aprendizagem e QA de autoria | 1.387 testes, zero falhas. |
| Extensão Jogo 2D e autoria de verificações | 2.051 testes, zero falhas. |
| Contratos e inspeção do runtime | 55 testes, zero falhas. |
| HTTP, quiz e replay após integrar a staging | 96 testes, zero falhas. |
| Componente anterior de toque após integrar a staging | 4 testes, zero falhas. |
| Farol executado no Chrome, após integrar a staging | 16 cenários: jogo correto, ausência de memória, porta sempre aberta, posições alteradas, chave na borda, pares invertidos, velocidades 1 e 8 e oito combinações de arte. Todos com resultado esperado. |
| Componentes reais no navegador | Sete experiências, quatro cenas de quiz, outra ordem, repetição, desfazer, reset, relógio automático e modo ampliado. Larguras 390, 768 e 1.440 px; nenhum erro JavaScript. |
| Manifestos | 37 válidos, zero reprovações e zero avisos de convenção. |
| Roteiros | 203 clipes em 37 aulas, zero erros; derivados ElevenLabs conferidos com `--check`. |
| Tipagem | Core, Members, Admin, member-shell e studio-runtime sem erros nos comandos de typecheck. |
| PDFs | Cadê: 7 páginas. Farol: 29 páginas. Fontes, imagens, limites e páginas alteradas conferidos. |

Comandos reproduzíveis, a partir da raiz, salvo indicação:

```powershell
bun test packages/core/src/learning docs/aulas-interativas-tecnico/qa --timeout 30000
# Executar dentro de packages/studio, para carregar seu preload de DOM:
bun test src/official-extensions/game-2d/__tests__ src/blockly/__tests__/projectCheckAuthoring.test.ts
# Novamente na raiz:
bun docs/aulas-interativas-tecnico/qa/exploracao/build.ts
node docs/aulas-interativas-tecnico/qa/exploracao/verify.mjs
$env:SZ_CHECK_CHROMIUM = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/farol-browser.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check
```

A prévia usa os componentes reais com contexto de autoria local; não simula uma publicação autenticada. Persistência e contratos foram verificados separadamente nos testes do servidor. Os registros locais das execuções ficam em `.cache/`, fora do versionamento.

## Diretrizes incorporadas e limites

As orientações foram incorporadas em [Descoberta guiada](DESCOBERTA-GUIADA.md), [Diretrizes pedagógicas](DIRETRIZES-PEDAGOGICAS.md), especificações de roteiro/manifesto e nas duas cópias da skill de autoria. Vídeo conceitual explica e convida; experiência permite investigar; Estúdio mantém a montagem completa. Linguagem distingue editar a regra, fornecer entrada e executar o jogo. Os projetos continuam usando os blocos das extensões.

A observação automática tem tempo e rota limitados. Não garante alcançar alvos impossíveis ou validar qualquer variante arbitrária de um jogo. As combinações de posição, arte e velocidade acima foram efetivamente executadas. A revisão técnica não substitui observar crianças usando as aulas.

Áudio e vídeo novos não foram produzidos. Textos, roteiros, inventários de falas, manifestos e PDFs estão preparados no repositório; gravação, escuta, edição, importação e publicação no curso de destino são etapas posteriores. Esta entrega prevê apenas commit e merge na staging local, sem deploy ou alteração de conteúdo remoto.
