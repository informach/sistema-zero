# Revisão da proposta Flute × novo app de marketing

Data: 15/10/2026. Documento revisado: [proposta de aproveitamento, revisão 2](2026-10-15-flute-aproveitamento-marketing.md).

## Parecer

A direção inicial era adequada: aproveitar receitas, demonstrações reais e instruções para a IA, preservando Remotion. A primeira versão, porém, não estava completa como especificação de integração. Havia decisões abertas sobre responsabilidade por contratos, circulação de código entre computadores, compatibilidade, tratamento de falhas e enquadramento nos lotes. A revisão 2 resolve essas ambiguidades no desenho e explicita as provas que pertencem à implementação.

A recomendação fica mais definida: **entregar as demonstrações com Remotion e considerar as primitivas do Flute apenas após comparação limitada em L6C**. Flute não é requisito de liberação, motor alternativo acionado por erro, editor externo ou fonte de contratos do produto. Sua rejeição não elimina a captura real, os efeitos, o vídeo e a edição de composições por IA já exigidos pela reforma.

Este parecer trata de coerência documental e adequação ao código observado. Não certifica uma integração operacional ainda inexistente.

## Referências e precedência

1. [Proposta consolidada do novo marketing](2026-10-15-marketing-app-fluxo-editorial-proposta.md): comportamento do produto e invariantes.
2. [Plano de implementação em lotes](../superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md): responsabilidades, dependências e critérios de saída.
3. [Evidências de L0](2026-10-15-marketing-desktop-l0-evidencias.md): capacidades demonstradas e pendências reais.
4. [Auditoria do Flute](../../.audits/flute-marketing-2026-10-15/README.md): snapshot analisado, testes e limitações.

Também foram confrontados os contratos e a composição da bancada `marketing-production`, a ponte/executor desktop, publicação e as fontes editoriais de P07/P08. O código de L0 não é tratado como implementação antecipada dos contratos de L1.

## Achados e correções

Prioridade alta indica uma lacuna que poderia causar implementação incompatível, perda de rastreabilidade ou deslocamento de requisito obrigatório. Prioridade média indica ambiguidade de escopo, verificação ou decisão. A coluna “Correção” descreve o desenho revisado; não afirma que o recurso foi implementado.

| Prioridade | Lacuna da primeira versão | Correção na proposta revisada | Rastreabilidade |
| --- | --- | --- | --- |
| Alta | A decisão entre integrar primitivas e só se inspirar permanecia aberta demais | Base Remotion definida; Flute por versão de receita após comparação; falha não troca o motor automaticamente | §§ 5 e 9; L6B/L6C |
| Alta | Não havia dono suficientemente claro para schemas compartilhados | Schemas puros em `marketing-contracts`; produção associa implementação; backend valida sem importar renderer; guia deriva dos mesmos contratos | §§ 4A e 6.1; L1/L4 |
| Alta | Receita versionada não explicava como código alterado pela IA chegaria a outro computador | Diferenciar parâmetros e código; persistir fontes, dependências e build; transferir por assets; validar compatibilidade e reconstrução isolada | §§ 6.2 e 6.4; L3/L6C |
| Alta | Isolamento e reutilização de componentes vivos estavam subespecificados | Código gerado não ganha Node/IPC/credenciais; build e preview precisam de fronteira comprovada; usar captura real quando o componente não tiver fronteira adequada | §§ 6.4 e 6.6; L2/L6A/L6C |
| Alta | A edição de cenas não cobria suficientemente as operações editoriais e concorrência | Mesma base, operação idempotente, ajuste com Desfazer, alternativas escolhidas, adaptação derivada e conflito sem sobrescrita tardia | § 6.3; L1/L3/L5 |
| Alta | Identidade da demonstração e dos arquivos permitia interpretações frágeis | Snapshot efetivamente executado, hashes, fonte/ações/intervalos, receita/bundle imutáveis e autorização independente da deduplicação | §§ 6.2 e 6.6; L1/L3/L6A/L8A |
| Alta | “Mesma composição” não resolvia relógios, velocidade e prontidão | Frame relativo explícito, fps do contrato, uma escala de velocidade, recursos e medidas prontos, busca fora de ordem e nenhum atraso fixo | § 6.5; L6B/L6C |
| Alta | Aprovação e reaproveitamento não fechavam toda a cadeia até publicação | Final confirmado exato, dependências recuperáveis, nova revisão sem substituição silenciosa, bloqueio por invalidação factual e validação no worker | § 6.8; L7 |
| Alta | A tabela podia sugerir que a análise de resultados começaria em L10 | Instrumentação em L3, métricas existentes confiáveis em L7 e primeira hipótese em L9; L10 só amplia o ciclo | §§ 8–10; L3/L7/L9/L10 |
| Média | Cliente sem receita/bundle compatível não tinha comportamento definido | Matriz de disponibilidade: mídia da revisão identificada, capacidade ausente e atualização; preview antigo nunca representa ajuste novo | § 6.7; L2/L3 |
| Média | As três receitas e a prova opcional podiam ampliar indevidamente a liberação | Receitas como exemplos dos efeitos existentes; sem três campanhas adicionais; L9 e demais amostras mantêm as dependências originais | §§ 1, 8 e 9 |
| Média | O teste de renderer misturava viabilidade visual com colaboração completa | Separar comparação técnica opcional de cenários integrados obrigatórios; definir encerramento, evidências e decisão de adoção | §§ 9.1 e 9.2 |
| Média | P07 sugeria duração arbitrária; evidências de execução podiam ser confundidas com vídeo existente | Selecionar trecho legível, conferir estado atual em L8A e exigir gravação real para movimento; preservar fatos e objetivo de P08 | § 3; L4/L6A/L8A |
| Média | O fundo preto e a reversibilidade admitiam interpretações de contorno | Direção visual não se adapta a uma limitação por conveniência; API pública ou composição nativa; troca de renderer gera nova versão | §§ 4C, 5 e 6.7 |
| Média | Status de L0 e resultados de testes podiam parecer mais conclusivos | L0 continua em validação; provas parciais não encerram caixas; testes históricos separados da revisão documental; suíte completa não declarada aprovada | §§ 1 e 11 |

## O que permanece obrigatório e o que é opcional

| Categoria | Conteúdo |
| --- | --- |
| Reforma já obrigatória | Contratos únicos, identidade/autorização, execução pessoal, sincronização, captura real, edição assistida, vídeo/áudio/legendas, código isolado, acervo completo, aprovação, publicação e métricas existentes |
| Aplicação proposta dentro dessa reforma | Receitas de demonstração, guia derivado de capacidades, fontes verificadas de P07/P08, revisão visual e medição do trabalho reutilizado |
| Experimento opcional | Uma cena comparada em Remotion nativo e com `Scene`/`Surface`, com duas proporções e limite de execução previamente registrado |
| Expansão condicionada à demanda | Controle por frame de aplicativos/runtime completos e efeitos avançados que ultrapassem as cenas híbridas de L6 |

O experimento só recomenda Flute se os critérios técnicos passarem e houver vantagem demonstrável de compreensão ou produção. Sem isso, a entrega segue com composição nativa. Não criar plugin, serviço de render separado, segundo catálogo editorial ou coletor de métricas.

## Provas que continuam pendentes

Estas são obrigações dos lotes existentes, não decisões adiadas para o usuário nem evidência de integração já feita:

- **L1/L3:** materializar os contratos, validação, autorização, operação/evento transacionais e confirmação de assets. Exercitar concorrência, repetição e perda de conexão.
- **L2/L6C:** demonstrar isolamento e provisionamento no app instalado. Compilar ou separar processos não basta para provar a fronteira.
- **L6:** confirmar fidelidade, prontidão, áudio/tempo e custos reais de composição. A prova Flute–Remotion permanece opcional; as capacidades básicas são obrigatórias.
- **L7/L8:** testar aprovação do arquivo correto, invalidação de fonte, retenção/restauração, reconciliação do acervo e métricas sem zeros artificiais.
- **L9:** validar continuidade com duas pessoas/computadores e o percurso completo do plano. Uma cena bonita ou um export local não encerra o piloto.

Limites numéricos de render, RAM e reparos seguem os contratos e as medições previstas. Esta revisão não inventa um prazo ou orçamento universal. As metas propostas de responsividade e propagação de revisão são preservadas, sem confundi-las com tempo de IA ou exportação.

## Escopo da alteração e verificação

A revisão altera somente a proposta de aproveitamento e cria este registro. A proposta consolidada, o plano de lotes e as evidências de L0 foram preservados: os três hashes SHA-256 conferidos são idênticos aos anteriores à edição. Não houve implementação, mudança de status de lote ou execução de campanha.

A verificação documental não encontrou links locais quebrados nas 12 referências dos dois documentos. Foram conferidos numeração/referências de seções, responsabilidades, precedência e correspondência das obrigações com os lotes. Os resultados de testes do Flute continuam os registrados na auditoria original; não foram repetidos para uma alteração de documentação. A conclusão verificável é uma proposta mais completa e alinhada ao plano vigente, com critérios concretos para comprovar a integração durante a implementação.
