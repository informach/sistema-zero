# Fechamento integrado: exemplos 3D, Raylib e regularização

Autorização: a responsável pediu explicitamente o fechamento das três frentes, incluindo revisão, integração e implantação em staging e produção. Este plano complementa os planos já aprovados; não autoriza usar clientes reais como dados de teste nem alterar arquivos em edição de outra sessão.

## Ordem e critérios comuns

- [ ] Resolver a falha hospedada da compilação Python. Evidência atual: transferência verificada termina, mas o processo protegido falha. Preservar as tentativas negativas, obter diagnóstico sem código/credenciais, corrigir a causa e provar resultado correto/incorreto, cancelamento e limpeza.
- [ ] Integrar os commits concluídos da pasta principal em checkout próprio, após salvar e revisar o lote atual. Não incorporar alterações não commitadas da outra sessão. Conferir remoto antes de publicar.
- [ ] Após cada lote: testes causais, tipos, revisão do diff e atualização dos limites da evidência. No final: CI do mesmo SHA, deploys e leitura das versões ativas.

## Lote 1 — exemplos Jogo 3D

Arquivos principais: `packages/studio/src/official-extensions/game-3d/examples.ts`, fontes `__gen_*.ts`, `exampleCatalog.ts`, testes em `__tests__`, gerador canônico dos exemplos.

- [ ] Inventariar os 21 exemplos, fontes canônicas e dependências DOM de cada jogo. Guardar a referência de jogabilidade antes da mudança.
- [ ] Criar teste transversal que recuse HTML/CSS e blocos DOM nos exemplos do Jogo 3D, inclusive referências indiretas; confirmar falha na base atual.
- [ ] Trocar cenas dependentes de canvas HTML por cenas próprias do motor; usar placar, vida, HUD, telas de início/fim e comandos de reinício do Jogo 3D. Preservar regras, controles, pontuação e dificuldade. Alterar a fonte canônica e regenerar a IR; não aplicar filtro de apresentação ou apagar somente os campos publicados.
- [ ] Quando faltar uma operação necessária, implementá-la no motor e no contrato de blocos/Ponte/parser/gerador, com lifecycle e testes. Não embutir JavaScript bruto, HTML ou CSS em blocos substitutos.
- [ ] Provar schema, paleta, IR → fonte → IR, abertura em blocos/Ponte/código, início/fim/recomeço e recursos por jogo. Conferir regressão dos três cursos dependentes (Ilha 3D, Patrulha Espacial, Corrida Infinita 3D).

## Lote 2 — Raylib completo

Plano complementar: `2026-10-24-raylib-project-objectives.md`.

- [ ] Revisar e integrar a base 2D e suas receitas já commitadas. O `renderer3d.ts` inspecionado ainda lança erros de implementação ausente: não considerá-lo pronto.
- [ ] Completar o renderer 3D contra os opcodes e contratos reais de `_szraylib`: câmera, projeção, desenho, modelos/meshes, materiais e descarte; limitar recursos e reutilizar infraestrutura de assets/Molda existente, sem uma segunda API concorrente.
- [ ] Conectar checkpoints confiáveis após a troca gráfica; observar valores/vetores reais no executor. Preservar entrada, Stop, epoch e cancelamento, sem execução de sondas fornecidas pelo aluno.
- [ ] Provar 2D e 3D no navegador e no executor protegido: desenho real, direção correta/errada, função em outro arquivo, erro, loop não cooperativo, rede negada e limpeza. Exportar e executar casos no Python nativo, com assets do Pinta/Molda e dependências declaradas.
- [ ] Gerar distribuição/manifesto imutáveis e qualificar o gate real de CI. Ativar somente a distribuição integrada e validada.

## Lote 3 — financeiro Kids/Adultos

Plano e especificação existentes: `2026-10-23-subscription-recovery.md`; relatórios em `docs/qa/2026-10-24-subscription-*.md`.

- [ ] Reconciliar os relatórios com código, migrations e configurações realmente ativas. Revisar avisos D0/D3/D6, prazo de sete dias, cancelamento auditado e proteção contra duplicação/cobrança incerta.
- [ ] Conferir fluxos autenticados Admin, responsável Kids e adulto: troca de cartão, pagamento explícito do ciclo original, falhas, operação pendente, acesso e cancelamento. Sandbox e dados QA próprios; não cobrar, cancelar ou avisar clientes reais para validar.
- [ ] Verificar seed dos oito modelos, remetente verificado e retirada confirmada da fila legada. Preservar histórico; não tratar desativação de template como retirada de mensagem renderizada.
- [ ] Implantar consumidores antes dos produtores, conferir migrations/versões e só então ativar a política. O prazo de casos históricos começa com aviso novo aceito, sem vencimento retroativo.
- [ ] Revisar a composição final, publicar em staging e produção e verificar política, health, leitura das telas e versões. Registrar separadamente qualquer limitação do sandbox do provedor, sem convertê-la em aprovação de pagamento real.

## Aceite final

Nenhum item fica concluído somente por existir código ou por passar em teste unitário. O relatório final deve distinguir implementação, prova local, prova hospedada, interface e ativação em cada ambiente. Falhas de CI e implantações parciais precisam de correção ou reversão explícita; não declarar produção concluída com serviços em versões diferentes.
