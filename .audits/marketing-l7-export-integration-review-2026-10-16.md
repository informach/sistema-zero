# Revisão integrada de exportação e aprendizado — 16/10/2026

## Base e exportação

Worktree `sistema-zero-marketing`, branch `feat/marketing-desktop-operational-review`, após incorporar staging `71aac93c2` no merge `58f2f4c62`. A implementação anterior já havia sido integrada por outro fluxo. Sem Docker, push, deploy ou publicação social.

- `edition-export-proof.ts` usa projeto isolado, upload real ao R2 `testes-marketing`, confirmação de transferência e aprovação pela bancada Electron. Nenhuma peça do acervo do usuário foi aprovada pelo ensaio.
- Depois da aprovação, uma nova revisão altera copy/alt e remove o final do rascunho. A exportação continua usando a edição aprovada e seu alt original. O teste inicial tentou manter o final com texto divergente e foi corretamente recusado; o ensaio passou a criar um rascunho válido, sem enfraquecer a proteção.
- O núcleo nativo `exportEditionFile` salva os bytes remotos verificados. Cancelar mantém o destino existente; hash de edição incorreto é recusado e preserva o arquivo salvo. A caixa de destino do sistema operacional ainda não foi exercitada.
- A web usa login normal, sem preload. A prova seleciona o histórico, prepara o link e aciona o download real do Chromium. Arquivos web e nativo têm 66.397 bytes e o SHA-256 do manifesto R2: `82988f948a252ed2ca5a064c47b5f6e4d868993d38cda405d45c7194f2444348`.
- Edição `8d9318ce-c31e-4f76-a524-0e13adcd425e`, projeto `5283c5b7-e17c-5384-b37b-f3a213e2eabe`. Evidência: `packages/marketing-desktop/.cache/edition-export-proof/evidence.json`, screenshots e arquivos no mesmo diretório. `.cache/proof-edition-export-final.exit=0`. Imagem da interface inspecionada.

## Achados da integração

- O staging passou a devolver um envelope IPC que preserva erros estruturados. Provas antigas ainda tratavam a resposta como valor direto. `unwrapWorkspaceResponse` centraliza validação e preserva status/código/mensagem; bancada e provas compartilham o contrato. Testes conferem sucesso, erro 409 e resposta malformada, sem fallback para respostas inválidas.
- A regressão encontrou `demonstrationSources` sem importação no contexto de vídeo. Referência corrigida; cenários PostgreSQL de demonstração/composição passaram.
- A suíte de conversas limpa suas próprias filas. Agora aceita o banco nativo exclusivo `marketing_engagement_review_tests`, além das instâncias já previstas; recusa o banco conectado do acervo e o banco geral de testes. As checagens preexistentes da guarda geral foram preservadas e a guarda de conversas ganhou testes próprios.
- Um teste de snapshot excedeu cinco segundos durante build/provas concorrentes. Repetido isoladamente, passou em 328 ms; a regressão seguinte também passou. Nenhum timeout ou comportamento do produto foi alterado para ocultar o resultado.

## Correção do ciclo de aprendizado

A prova real de métricas identificou que uma análise recebia texto livre sem atualizar a revisão nem preencher a hipótese. O resultado exigia uma gravação separada e digitação para a próxima pauta. O executor agora pede proposta estruturada para análises. O servidor aplica apenas body/title/hypothesis/evaluationCriterion, preserva objetivo, evidências, revisões de origem e vínculo da pauta. Ajustar aplica nova revisão com Desfazer; alternativas conservam escolha explícita. Resultado livre de uma nova execução de análise é recusado, sem apagar resultados históricos.

`evaluationCriterion` é opcional para manter documentos antigos byte a byte no contrato. Não há migração destrutiva nem preenchimento retroativo. O formulário conserva esse campo e a próxima pauta já abre com hipótese e critério; a confirmação guarda o critério revisto. A adaptação de formato ocorre na nova pauta, não altera a identidade da análise. Protocolo/minimumDesktopProtocol **4** impede clientes antigos de interpretar novos campos como um resultado válido.

Testes de domínio falharam antes da correção (`tests-analysis-red`, três falhas). O teste PostgreSQL cobre aplicação, hipótese/critério, origem, conflito com revisão humana, recusa de texto livre, recusa de adaptação direta e desfazer. A regressão completa passou com **434 testes/2.418 asserções**, zero falhas, PostgreSQL nativo em bancos separados (`.cache/tests-backend-analysis.exit=0`).

## Evidência operacional e limites

TypeScript backend, desktop e web passaram após a correção (`types-analysis-backend-final`, `types-analysis-desktop`, `types-analysis-web`, todos exit 0). Contratos/workbench/desktop: **124 testes/2.040 asserções**, zero falhas (`tests-analysis-clients`). Build atualizado passou (`build-analysis.exit=0`).

O percurso real passou (`proof-metrics-learning-structured.exit=0`): métricas na bancada Electron → preparação da análise pela interface → Codex pela assinatura → nova revisão estruturada → sincronização → web sem preload → diálogo com hipótese/critério preenchidos → pauta em rascunho, story/vídeo. A origem mantém as revisões aprovadas, mesmo com rascunho posterior diferente. Zero observado e dado ausente permanecem distintos. Análise e screenshots foram inspecionados; os 3% foram calculados com visualizações como denominador, sem interpretar como pessoas nem inferir causalidade. Limiares de experimento ficaram identificados como proposta, sem tratá-los como evidência observada.

Evidência: `packages/marketing-desktop/.cache/metrics-learning-proof/evidence.json`. Execução `0f0d328e-63d3-4bf1-aa33-c9258de9e0b0`; revisão analisada `728b1d51-498c-45eb-af42-89bd02837ffb`; nova pauta `21af9030-1212-493b-9588-2e1e3f56ea8e`. A prova inicial em texto livre foi conservada como falha (`proof-metrics-learning.exit=1`), e sua execução histórica não foi apagada.

O ciclo usa publicação e métricas **sintéticas**, identificadas no projeto de revisão. A inferência usa a assinatura real do Codex. Não demonstra coleta na Meta nem publicação externa. Permanecem a caixa nativa de destino, backup remoto com agenda/retenção, primeiro login e piloto físico de duas máquinas, além dos critérios de outros lotes. Este registro não declara liberação cotidiana.
