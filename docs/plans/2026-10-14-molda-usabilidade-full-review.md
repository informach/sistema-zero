# Molda — revisão completa da refatoração

14/10/2026 · Público: crianças de 9–12 anos no computador · Criar, pintar e animar

Esta revisão cobre a implementação da [proposta aprovada](2026-10-14-molda-usabilidade-proposta.md), os [fluxos](2026-10-14-molda-usabilidade-fluxos.md), as alterações de domínio, a interface, a persistência, o playground, os testes e a integração com o Kids. A instrução adicional do responsável é uma oficina única, pois ainda não há crianças usando o Molda em produção.

## Correções encontradas na revisão

| Achado | Consequência | Correção e cobertura |
|---|---|---|
| O adapter ainda permitia escolher o editor antigo e o playground exigia parâmetro de ativação. | Um host sem a opção abria uma experiência diferente da proposta. | Removidos `sceneWorkshop`, o seletor de oficina e o playground separado. Todo modelo abre na oficina padrão. Testes de galeria, abertura, conversão de arquivo antigo e deep link sem configuração adicional. |
| Uma superfície preparada para pintar era um documento temporário que `flush` e miniaturas podiam persistir. | Apenas visitar Pintar podia alterar o arquivo, sem um passo correspondente em Desfazer. | Preparação explicitamente temporária no editor. Autosave, gravação imediata e backup usam o documento confirmado; o primeiro traço inclui a superfície em uma única alteração. Testes de persistência e integração de pintura. |
| Fechar a seção de movimentos prontos descartava a prévia, e editar parâmetros apagava o resultado anterior. | Um clique para recolher o painel perdia o movimento experimentado. | Fechar resolve Guardar, Descartar ou Continuar. Editar campos mantém a última prévia até preparar o resultado seguinte. Controle de expansão acessível por botão. |
| Os ajustes simples de intensidade desrespeitavam sinal e limite do domínio. | Um movimento negativo mudava de direção; Balançar podia gerar um ângulo recusado. | Direção preservada e amplitude limitada ao intervalo válido. Testes com distância negativa e repetições no limite de 90°. |
| Confirmar um movimento do modelo inteiro e ir a Pintar retomava uma seleção antiga. | A tela podia voltar à peça anterior, embora a confirmação tivesse escolhido o conjunto. | A retomada lê a seleção atual, inclusive quando confirmação e navegação ocorrem no mesmo evento. Teste integrado desse percurso. |
| Desfazer/Refazer não passava pela decisão das prévias contextuais. | Uma prévia podia desaparecer ao alterar o documento confirmado. | Os dois caminhos resolvem a prévia antes de executar a intenção. O histórico de pose pendente continua local ao rascunho. |
| A chave do rascunho recuperável continha apenas o id do modelo. | Dois perfis com o mesmo documento podiam consultar o mesmo rascunho local. | Chave vinculada ao namespace do perfil e ao id da criação; teste com dois perfis. |
| Fechar Criar novo durante uma gravação não invalidava a navegação pendente. | Uma resposta atrasada podia abrir uma oficina depois de a criança fechar a caixa. | Operações identificadas por tentativa, com descarte de callbacks antigos e bloqueio de envio duplicado. A criação já gravada permanece na galeria. Teste com gravação adiada. |
| A entrada de Criar novo anunciava três passos, embora Criar modelo fosse imediato. | A indicação de progresso contradizia o caminho simplificado. | A contagem aparece somente após escolher um caminho com configuração. |
| Cabeçalho sobrepunha ações em 768 px. | Refazer podia ficar coberto por outra ação. | Cabeçalho passa a três linhas abaixo de 900 px. Conferência de sobreposição por posição real dos controles. |
| Abrir a imagem de uma camada deixava pouco espaço para desenhar no painel direito. | Em 1280 × 720, a lista de peças ocupava a área necessária ao traço 2D. | A expansão das ferramentas de pintura redistribui a altura entre cores, peças e ajustes. O percurso de pintura confere que os pontos do traço estão visíveis e desobstruídos antes de desenhar. |
| Nomes acessíveis dos ajustes usavam códigos em inglês, e o título não recebia o foco solicitado pelo host. | Leitura por tecnologia assistiva e foco de entrada inconsistentes. | Mover/Girar/Tamanho em português e título programaticamente focável. |
| Os cenários de navegador ainda esperavam o editor antigo, menus e nomes anteriores. | A suíte oficial não verificava a experiência entregue. | Cenários da oficina atualizados; os percursos completos da implementação passaram a testes versionados. Typecheck inclui playground e E2E. |

## Decisões de integração

- A versão do **formato de arquivo** permanece: é usada para leitura, importação, recuperação e sincronização. Ela não ativa outra interface.
- As permissões de ferramentas por nível permanecem: o básico e os recursos avançados usam a mesma organização de Modelar, Pintar e Animar.
- Texturas e céus continuam em seus editores próprios. A falta de ponte com o Estúdio não apresenta a oficina como experimental.
- A documentação de rollout foi marcada como histórica. Não há etapa para habilitar V2, flag de adapter ou variável de ambiente de produto.
- O arquivo E2E do editor antigo foi substituído por percursos da oficina atual: criação rápida, montagem, pintura real, pose composta, recuperação, pivô, divisão e decisões de prévia. Os testes de domínio e de integridade dos arquivos continuam na suíte.
- Os testes internos de componentes do formato antigo montam esses componentes diretamente em um suporte de teste, sem passar pela rota pública. Nenhuma opção foi adicionada ao produto para manter esses testes.

## Coerência dos fluxos

A revisão manteve a estrutura dos prints: ferramentas à esquerda, palco central, peças e ajustes à direita e atividades no cabeçalho. Recursos avançados entram por contexto ou expansão. Em telas compactas, as abas do painel preservam Peças, Cores, Movimentos e Pose sem desmontar os formulários.

Foram conferidos os caminhos de criação e abertura, seleção e câmera, montagem e transformação, pintura e composição de cores, histórico, animação por peça e conjunto, poses pendentes, recuperação local, transições de atividade, importação, cópias exportadas, saída, textura, céu e integração com o host. A cobertura combina testes de domínio, integração e navegador; não equivale a testar manualmente toda combinação possível de documento e ferramenta.

## Verificação

- **3.097 testes do Molda passaram, sem falhas, em todos os 413 arquivos**: 1.079 na partição de importação/exportação/workers, 957 em cenas/componentes e 1.061 nos demais domínios. A execução foi dividida em processos curtos para limitar memória. O [manifesto final](../../.audits/molda-usabilidade-2026-10-14/review-final.json) confere que nenhum arquivo ficou de fora nem foi contado duas vezes.
- **72 testes da integração com o Kids passaram**, cobrindo persistência na nuvem, conformidade, acesso por nível, adapter e guia da tarefa. [Log](../../.audits/molda-usabilidade-2026-10-14/review-host.log).
- **TypeScript, lint/formatação de 106 arquivos e build passaram**. O typecheck agora inclui os testes E2E e o playground. [Tipos](../../.audits/molda-usabilidade-2026-10-14/review-typecheck.log), [lint](../../.audits/molda-usabilidade-2026-10-14/review-biome.log), [build](../../.audits/molda-usabilidade-2026-10-14/review-build.log).
- Após retirar a contagem de passos da criação imediata, os **32 testes de abertura/criação foram repetidos e passaram**. [Log](../../.audits/molda-usabilidade-2026-10-14/review-creation-final.log).

**39 cenários de navegador passaram**: 21 no Chromium, 9 no Firefox e 9 no WebKit. A pintura por arrasto 3D e a medição de heap são executadas somente no Chromium; os outros navegadores executam os nove cenários aplicáveis. Após o último ajuste visual em Criar novo, os dois percursos de criação do Chromium também foram repetidos e passaram.

| Rodada | Evidência |
|---|---|
| Chromium: 21 cenários, incluindo quatro percursos completos e quatro testes de layout | [Log](../../.audits/molda-usabilidade-2026-10-14/review-e2e.log) |
| Firefox: 9 cenários aplicáveis, processo concluído com código 0 | [Log](../../.audits/molda-usabilidade-2026-10-14/review-e2e-firefox-final.log) |
| WebKit: 9 cenários aplicáveis, processo concluído com código 0 | [Log](../../.audits/molda-usabilidade-2026-10-14/review-e2e-webkit-final.log) |
| Criação rápida e configurada após o último ajuste do diálogo | [Log](../../.audits/molda-usabilidade-2026-10-14/review-e2e-creation-final.log) |

Uma rodada conjunta de Firefox/WebKit passou nas asserções, mas o worker do WebKit não encerrou e o runner o finalizou após cinco minutos. A repetição de diagnóstico também encontrou uma espera de imagem superior a cinco segundos enquanto outros testes rodavam. As rodadas finais acima foram isoladas, com os dois casos exclusivos do Chromium excluídos antes da montagem das fixtures, e terminaram sem falhas. Esses incidentes estão preservados nos logs de diagnóstico; não foram tratados como sucesso da rodada original.

Para repetir: `bun run test`, `bun run typecheck` e `bun run e2e` em `packages/molda`. Para limitar memória, o [executor em lotes](../../.audits/molda-usabilidade-2026-10-14/review-tests.cjs) executa os mesmos 413 arquivos. Nesta estação, o build E2E foi servido localmente em 5198; as rodadas isoladas usaram `playwright test --project firefox` ou `--project webkit` com `--grep-invert 'vinte aberturas|pintar do jeito da criança'`. As opções de porta/reuso pertencem ao executor de testes e não ativam outra interface.

## Limites

Esta é uma revisão técnica e de interação. A confirmação de que crianças de 9–12 anos compreendem a interface sem ajuda depende de observação com esse público. A integração de conta é verificada por contratos e testes locais; esta tarefa não publica o aplicativo. O build mantém o aviso existente de chunks acima de 500 kB.
