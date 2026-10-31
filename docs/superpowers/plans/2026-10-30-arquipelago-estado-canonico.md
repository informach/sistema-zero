# A05: situação atual separada do histórico

Base de leitura inicial: `8c89b2565`, atualizada para `16345a590` após integrar A04.
Atende aos achados A8 e A9 da auditoria aprovada.
Este lote é documental. Não altera arte, geradores, formato de salvamento ou CI.

## Decisões

- Criar `docs/arquipelago-estado-atual.md` como índice de situação, com data, base e links
  para as provas. Distinguir código, conteúdo, testes locais, implantação e decisão pendente.
- Fonte dos números continua sendo o código do contrato. Registrar V18 e 65.536 bytes UTF-8
  como vigentes nesta base, sem chamar V11 de formato atual ou editar schemas históricos.
- O teto semanal vigente é 100. Números históricos ficam identificados como históricos;
  não reescrever evidências antigas nem afirmar implantação por haver código local.
- O plano de entrega integral mantém seus checkpoints, mas aponta a leitura atual no topo.
  Atualizar frases do presente que ainda tratem arte de portos, voz adulta ou fantasma familiar
  implementado como indisponível, preservando as pendências reais de publicação e qualificação.
- A9 foi tratado por outra sessão no commit `f72f3cce7`, integrado em `8c89b2565`.
  Os geradores agora escrevem relatórios no formato esperado pelo Biome. Conferir os relatórios
  existentes sem reformatar ou regerar arte. Dar crédito a essa integração, sem duplicá-la.

## Etapas

- [x] Conferir os números e portas vigentes no contrato e os resultados dos lotes integrados.
- [x] Escrever a matriz por funcionalidade, com as lacunas do currículo e as dependências
  operacionais separadas. Nenhuma linha fica pronta só porque existe um arquivo.
- [x] Corrigir resumos atuais dos CLAUDE e das regras e rotular os checkpoints antigos.
- [x] Conferir links, consistência com fontes e Biome dos relatórios recebidos. Revisar o diff.
- [x] Commit `6db264de9`, merge `9b5fcdd01` no staging local, sem push.

## Pedidos de arte

Nenhum. Os relatórios e geradores recebidos são somente conferidos neste lote.

## Verificação

- `bun test tests/salvamento-v10.test.ts tests/salvamento-v18.test.ts` no contrato: 11 testes,
  2.406 asserções, zero falhas; migração e cenário cheio dentro dos 65.536 bytes UTF-8.
- Os 31 links locais do índice foram resolvidos no filesystem. Fontes de versão, teto do
  documento, teto semanal e ritmo conferidas diretamente nas constantes citadas.
- `bunx biome check` nos nove relatórios de arte recebidos: aprovado, sem escrita.
- `git diff --check` e revisão documental: aprovados. O lote muda somente Markdown.
  A suite do jogo, tipagem e navegador recém-executados no A04 continuam na mesma base de
  código; não foram apresentados como novas execuções deste lote documental.
