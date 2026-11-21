# MISSÃO: Evolução completa do Sistema Zero Estúdio — Clássico e Pro

> Texto original da missão, passado em 17/11/2026 numa sessão do Claude Code na nuvem e colado pela
> dona na conversa de 21/11/2026, quando passou a ser a régua principal da evolução. Está aqui como
> veio, sem edição. Decisões posteriores dela que mudam pontos do texto (21/11/2026):
> - **Seção 18:** o trabalho segue direto na branch `staging`, com commits pequenos e push, em vez de
>   branch, worktree e Pull Request. Nada vai para a `main` nem para produção.
> - **Seção 16:** os aparelhos de referência são só emulados, no CI, com o registro "emulado".
> - **Seção 12:** campo ou versão desconhecida nos cenários do Pinta e do Molda é recusado sem perder
>   nada, em vez de preservado; os contratos estritos das outras frentes não mudam.
> - **Python:** sem compatibilidade com projetos antigos (ninguém usa ainda): ajustar os exemplos da
>   plataforma e eliminar os projetos antigos de teste e de QA.
>
> O estado de cada seção mora em `README.md`, `plano-execucao.md` e `revisao-2026-11-20.md`.

## Papel do agente

Você é um engenheiro de software principal, arquiteto de IDEs, especialistas em compiladores, motores de jogos, sistemas de execução isolada, desempenho de aplicações web, UX educacional e qualidade de software.

Sua missão é **evoluir integralmente o Sistema Zero Estúdio para torná-lo uma plataforma profissional de programação e desenvolvimento de jogos 2D e 3D, adequada a crianças e adolescentes, com excelente desempenho, estabilidade e capacidade de construir projetos grandes e robustos**.

O resultado deve permitir que uma criança comece programando com blocos, evolua para código e consiga desenvolver projetos cada vez mais complexos sem precisar abandonar o Sistema Zero por limitações artificiais da ferramenta.

**Não quero apenas uma análise, um plano ou uma prova de conceito. Quero a implementação funcional, testada, revisada e documentada dessa evolução.**

A implementação será organizada em etapas verificáveis, com proteção rigorosa da compatibilidade dos cursos e projetos existentes.

---

# 1. Contexto e arquitetura atual

Repositório: `informach/sistema-zero`

Branch de referência: `staging`.

Principais pacotes:

- `packages/studio/`
- `packages/studio-runtime/`
- `packages/core/`
- `packages/member-shell/`
- `packages/community-kids/`
- `packages/members/`
- `packages/pinta/`
- `packages/molda/`
- `packages/molda-cenarios/`

Comece inspecionando a implementação real, seus contratos, testes e documentação.

Fontes iniciais relevantes:

- `packages/studio/CLAUDE.md`
- `packages/studio/docs/architecture.md`
- `packages/studio/docs/embedding.md`
- `docs/plans/2026-10-16-polaris-studio-pro-proxima-evolucao.md`
- `docs/qa/2026-11-08-python-classic-performance.md`
- `experiments/studio-pro-webcontainer-memory/README.md`
- `packages/studio/src/components/preview/PreviewIframe.tsx`
- `packages/studio/src/components/preview/previewBudget.ts`
- `packages/studio/src/state/projectStore.ts`
- `packages/studio/src/state/projectValidation.ts`
- `packages/studio/src/state/projectStorageCoordinator.ts`
- `packages/studio/src/core/projectDocumentGuards.ts`
- `packages/studio/src/modes/`
- `packages/studio/src/monaco/pro/`
- `packages/studio/src/official-extensions/`
- `packages/studio/src/runtime/python/`
- `packages/core/src/studio/pro-limits.ts`
- `packages/studio/src/official-extensions/threeRenderBudgetRuntime.ts`

Os caminhos acima são referências para investigação. Confirme quais arquivos e contratos estão vigentes antes de modificá-los.

A arquitetura atual já possui recursos importantes: Blockly, Ponte, Monaco, serviços de linguagem, WebContainer, execução Python isolada, compilação remota, motores de jogos, pools, índices espaciais, salvamento, recuperação e integração com bibliotecas.

**Reaproveite e aperfeiçoe o que já existe. Não reconstrua recursos maduros sem necessidade demonstrada.**

---

# 2. Regra obrigatória: preservar os cursos ensinados

Esta é uma condição de aceite de prioridade máxima.

## 2.1 Estúdio Clássico

O Clássico **pode ser modernizado visual e funcionalmente**.

É permitido adicionar ferramentas, painéis, opções, recursos profissionais e melhorar a organização da interface.

Entretanto, devem ser preservados integralmente os fluxos e recursos ensinados nos seguintes cursos:

1. **Cadê Todo Mundo?**
2. **Desafio do Primeiro Jogo — A Chave do Farol**

Esses cursos utilizaram o Estúdio Clássico com blocos da extensão **Jogo 2D**, além dos blocos gerais de programação.

A criança que acompanha as aulas precisa continuar encontrando os mesmos recursos nos caminhos demonstrados.

### Inventário obrigatório dos cursos

Antes de alterar qualquer interface ou bloco, examine:

- Roteiros das aulas.
- Manifestos utilizados pelas atividades.
- Projetos iniciais e finais.
- Arquivos de blocos.
- Materiais de passo a passo.
- Testes e verificações das aulas.
- Registros de produção.
- Vídeos efetivamente utilizados, quando acessíveis.

Comece pelas pastas:

- `docs/aulas-interativas/faisca/cade-todo-mundo/`
- `docs/aulas-interativas/faisca/desafio-primeiro-jogo/`
- `docs/aulas-interativas-tecnico/`

Não confunda alterações planejadas nos roteiros com vídeos realmente gravados ou publicados. Se alguma gravação não estiver acessível, registre essa lacuna; não presuma seu conteúdo.

### Compatibilidade obrigatória

Preserve, para tudo o que foi ensinado:

- Identificadores técnicos e formato dos blocos.
- Textos e nomes reconhecíveis.
- Cores e estrutura dos blocos utilizados.
- Campos e opções dos menus suspensos.
- Encaixes e conexões.
- Valores padrão relevantes.
- Comportamento de execução.
- Categorias e caminhos demonstrados na paleta.
- Áreas de programação.
- Gestos de arrastar, encaixar, editar e excluir.
- Funcionamento da prévia.
- Ações de executar, reiniciar, verificar e enviar o projeto.
- Acesso às imagens e materiais utilizados.
- Compatibilidade com projetos salvos e entregas anteriores.

Exemplos de caminhos que precisam permanecer acessíveis, conforme os roteiros:

- `Jogo 2D → Sprites → Aparência`
- `Jogo 2D → Movimento → Movimentos prontos`
- `Jogo 2D → Controles → Teclado, ações e toque`
- `Jogo 2D → Colisões → Encostar e bloquear`
- `Áreas do projeto`
- `Programação → Lógica & Se`
- `Programação → Variáveis`
- `Programação → Valores`

Preserve também as áreas **Ao iniciar**, **Quando acontecer** e **Enquanto estiver rodando**, nas interações ensinadas.

Exemplos de funcionalidades protegidas:

**Cadê Todo Mundo?**

- Eventos de clique/toque em sprites e grupos.
- Controle de visibilidade.
- Criação e utilização de sprites e grupos.
- Variáveis e contagem dos achados.
- Seleção de imagens do jogo.
- Execução, verificação e envio.

**Desafio do Primeiro Jogo**

- Controles clássicos por teclado e toque.
- Movimentação em quatro direções.
- Desenho do cenário e sprites.
- Eventos de colisão.
- Destruição de sprites.
- Criação e alteração de variáveis.
- Condições `Se / então / senão`.
- Troca de imagem dos sprites.
- Textos, avisos e posições.
- Reinício da partida e verificação do projeto.

A referência visual exata deve ser confirmada com os materiais vigentes, inclusive a transição documentada entre **Atualizar** e **Rodar de novo**.

### Testes obrigatórios

Crie uma matriz de compatibilidade contendo:

- Aula e parte.
- Ação ensinada.
- Bloco ou controle envolvido.
- Caminho visual.
- Identificador técnico.
- Comportamento esperado.
- Teste automatizado correspondente.
- Evidência visual de antes e depois.

Automatize os fluxos representativos com Playwright, usando o navegador, Blockly real e os projetos das aulas.

Não basta procurar os nomes dos blocos no código: é necessário comprovar que a criança consegue reproduzir a montagem.

**Qualquer regressão nesses cursos bloqueia a entrega.**

## 2.2 Estúdio Pro

O Pro ainda não foi utilizado pelos alunos.

Por isso, você tem liberdade para:

- Redesenhar a interface.
- Reorganizar painéis e ferramentas.
- Melhorar fluxos de trabalho.
- Alterar a navegação interna.
- Introduzir recursos de IDE profissional.
- Eliminar complexidade visual desnecessária.
- Melhorar profundamente a experiência de programação.

O objetivo não é imitar visualmente o VS Code. É oferecer uma IDE profissional, com uma experiência clara e apropriada para crianças e adolescentes.

Preserve a integridade dos projetos, contratos, materiais, formatos e comportamentos existentes. Não descarte funcionalidades já implementadas sem substituto funcional equivalente e testes.

---

# 3. Objetivos técnicos inegociáveis

A evolução deve entregar:

1. Editor responsivo mesmo com projetos grandes.
2. Jogos que não congelem a interface de programação.
3. Execução isolada e interrompível.
4. Consumo de memória controlado.
5. Carregamento incremental de arquivos, cenas e recursos.
6. Motores 2D e 3D otimizados.
7. Suporte real a jogos com muitas entidades e cenários extensos.
8. Persistência confiável e recuperação de falhas.
9. Depuração profissional, com experiência pedagógica.
10. Ferramentas de profiling e identificação de gargalos.
11. Organização modular de projetos.
12. Testes automatizados criados pelo usuário.
13. Exportação e builds reproduzíveis.
14. Integração estruturada com Pinta e Molda.
15. Compatibilidade com projetos e aulas anteriores.
16. Segurança de execução e isolamento de dados.
17. Medições reproduzíveis de desempenho.

Não aceite otimizações que produzam números melhores à custa de perda de funcionalidade, fidelidade, diagnóstico ou dados.

---

# 4. Etapa 0 — Auditoria técnica e baseline

Antes de implementar mudanças de grande impacto, estabeleça uma linha de base.

Investigue separadamente:

### Estúdio Clássico

- Criação e montagem de blocos.
- Custo de renderização do Blockly.
- Criação e remoção de SVGs.
- Seleção e arrasto de pilhas grandes.
- Busca de blocos.
- Conversão Blockly ↔ IR ↔ código.
- Sincronização da Ponte.
- Salvamento e recuperação.
- Abertura de projetos grandes.
- Execução e atualização da prévia.
- Custos de extensões.
- Recursos de áudio.
- Crescimento de memória após uso prolongado.

### Estúdio Pro

- Carregamento inicial.
- Monaco.
- Serviços de linguagem JS/TS e Python.
- Autocompletar e diagnósticos.
- Busca por arquivos e símbolos.
- Operações de renomeação e referências.
- Sincronização do filesystem.
- Inicialização do WebContainer.
- Instalação de dependências.
- Vite e HMR.
- Builds locais e remotos.
- Uso simultâneo de editor, jogo e Zappy.
- Consumo de memória dos processos e workers.
- Persistência de arquivos e materiais.
- Descarte após fechar ou trocar de projeto.

### Motores de jogos

- Jogo 2D.
- Jogo 2D Avançado.
- Jogo 3D.
- Mundo 3D.
- Jogo 3D Avançado.
- Python Clássico.
- Pygame-ce.
- Pygame Zero.
- Turtle.
- Raylib.

Para cada runtime, registre:

- Arquitetura atual.
- Custos predominantes.
- Limites existentes.
- Otimizações já implementadas.
- Recursos ainda não suportados.
- Problemas comprovados.
- Oportunidades de melhoria.
- Riscos de compatibilidade.

Consulte os ensaios anteriores, mas execute uma nova medição de referência nas condições disponíveis.

Não trate resultados históricos em máquinas diferentes como comparáveis sem reproduzir o ambiente.

### Entrega desta etapa

Produza um relatório com:

- Diagnóstico atual.
- Matriz de capacidades Clássico/Pro.
- Mapa das limitações.
- Gargalos classificados por impacto.
- Plano arquitetural.
- Critérios de aceite.
- Fixtures e testes.
- Metas de desempenho.
- Estratégia de migração.
- Plano de execução incremental.

**Depois do diagnóstico, continue a implementação. Não encerre a missão nessa etapa.**

---

# 5. Etapa 1 — Execução isolada e proteção contra travamentos

Esta é a prioridade técnica máxima.

O Estúdio precisa continuar responsivo mesmo quando o programa do aluno apresenta:

- Laços infinitos.
- Recursão sem fim.
- Processamento síncrono excessivo.
- Uso excessivo de memória.
- Operações de renderização pesadas.
- Erros de física.
- Erros de compilação.
- Quantidade excessiva de eventos.
- Inundação de mensagens no console.

O `PreviewIframe` clássico documenta que determinados previews `srcdoc` compartilham a thread do editor e que o watchdog não consegue interromper todo trabalho síncrono.

Implemente uma estratégia de isolamento efetivo.

### Requisitos

- Separar a execução do jogo da thread crítica da interface sempre que necessário.
- Usar Workers/OffscreenCanvas nos runtimes compatíveis, com fallback adequado.
- Para jogos que exigem DOM, avaliar e implementar execução em origem isolada e processo separado quando a arquitetura do navegador permitir.
- Reaproveitar os contratos existentes de preview remoto e origem isolada.
- Manter CSP, sandbox, autenticação de mensagens e permissões.
- Permitir encerrar um programa problemático.
- Evitar que a parada do jogo descarte código não salvo.
- Preservar entradas de teclado, mouse, toque e gamepad suportadas.
- Conservar captura de erros e localização da instrução.
- Liberar listeners, timers, áudio, workers e recursos gráficos.
- Diferenciar erro do jogo, erro do editor e falha do ambiente.
- Garantir ciclo confiável de Rodar, Parar e Rodar de novo.

O watchdog deve ser usado como mecanismo complementar, não como prova de isolamento.

Crie testes com programas intencionalmente problemáticos e confirme que o editor continua respondendo a comandos e pode salvar o projeto.

---

# 6. Etapa 2 — Escalabilidade do Estúdio Clássico

Queremos permitir programas extensos em blocos sem obrigar o navegador a montar milhares de elementos visuais simultaneamente.

Aproveite as otimizações já implementadas para projetos como o Pac-Man.

### Implementar ou aperfeiçoar

- Renderização incremental e sob demanda.
- Organização em áreas e definições.
- Navegação eficiente entre partes do programa.
- Pesquisa e localização em projetos grandes.
- Montagem visual apenas das partes necessárias.
- Preservação do modelo completo para geração e histórico.
- Operações eficientes em pilhas extensas.
- Processamento incremental de mudanças semânticas.
- Cache correto da representação intermediária.
- Atualização localizada de blocos e código.
- Salvamento sem serialização completa desnecessária a cada gesto.
- Desfazer/refazer de operações complexas.
- Descarte de recursos temporários.
- Evitar análise completa do programa quando muda apenas a organização visual.

O Clássico deve preservar a ligação entre blocos e código.

A conversão deve proteger:

- Identificadores.
- Variáveis.
- Funções.
- Eventos.
- Ordem de execução.
- Blocos de extensão.
- Código não representável visualmente.
- Referências e source maps.

**Não transforme blocos editáveis em código opaco somente para reduzir o custo de renderização.**

Não modifique o formato ou o comportamento dos blocos ensinados nos dois cursos protegidos.

### Critério de aceite

Projetos com milhares de blocos precisam ser abertos, navegados, editados, executados e salvos de maneira responsiva nos aparelhos de referência.

Um teste com 10.000 blocos deve ser utilizado para estresse e integridade, sem presumir que todos precisarão ficar visualmente expandidos.

---

# 7. Etapa 3 — Escalabilidade e modernização do Estúdio Pro

Modernize profundamente o Pro, com liberdade para redesenhar sua interface.

### 7.1 Interface profissional para crianças

Organize uma experiência clara, com:

- Explorador de arquivos.
- Editor de código.
- Prévia do jogo.
- Console.
- Problemas.
- Terminal quando aplicável.
- Busca.
- Materiais.
- Testes.
- Depuração.
- Desempenho.
- Assistência Zappy.

Os painéis devem ser ajustáveis, recolhíveis e responsivos.

A interface deve continuar compreensível em telas pequenas, sem sacrificar recursos técnicos importantes.

### 7.2 Editor de código

Aproveite o Monaco existente e aperfeiçoe:

- Digitação responsiva.
- Autocompletar.
- Diagnósticos.
- Navegação para definição.
- Busca de referências.
- Renomeação segura.
- Busca em arquivos.
- Formatação.
- Mapa do arquivo.
- Comparação de alterações.
- Organização de imports.
- Navegação entre erros.
- Operações com múltiplos arquivos.

Utilize versões por arquivo, patches e invalidação de dependências.

Evite recalcular toda a árvore e todas as análises a cada tecla.

Não desabilite diagnósticos ou tipos para atingir metas de desempenho.

### 7.3 Sincronização dos arquivos

Melhore a reconciliação entre editor, projeto persistido e filesystem de execução.

Requisitos:

- Alterações incrementais.
- Escritas ordenadas.
- Proteção contra conflitos.
- Recuperação de operações incompletas.
- Preservação dos buffers abertos.
- Persistência de alterações externas reconhecidas.
- Descarte de resultados obsoletos.
- Cancelamento de consultas sem cancelamento indevido de mutações.
- Segurança ao trocar projeto ou perfil.
- Nenhuma perda silenciosa de arquivos.

### 7.4 Perfis de execução

Evolua os caminhos existentes para oferecer três perfis quando tecnicamente adequados:

**Execução leve**

Para jogos JavaScript/Canvas e projetos que não exigem um servidor Node completo.

Não iniciar WebContainer desnecessariamente.

**Execução completa**

WebContainer para projetos que utilizam npm, Vite, React, TypeScript e dependências compatíveis.

Manter HMR, terminal e filesystem.

Otimizar inicialização, instalação, sincronização, descarte e reutilização segura.

**Compilação hospedada**

Para projetos que exigem builds maiores ou para dispositivos com recursos limitados.

Reaproveitar o executor remoto existente e aprimorar seus contratos de capacidade.

Não tratar execução remota como autorização para executar código não confiável sem isolamento, limites ou auditoria.

### 7.5 Limites de projeto

Avalie os limites de código local, compilação remota, artefatos e materiais.

Atualmente existem diferenças importantes entre os orçamentos do editor e dos compiladores.

Não aumente esses valores indiscriminadamente.

Primeiro:

- Elimine cópias desnecessárias.
- Separe fontes de binários.
- Utilize referências de conteúdo verificadas.
- Faça builds incrementais quando possível.
- Carregue dependências sob demanda.
- Limite trabalho simultâneo.
- Meça consumo de CPU e memória.
- Estabeleça estratégias para projetos maiores.

Qualquer ampliação de limite deve ter justificativa, teste e capacidade comprovada.

---

# 8. Etapa 4 — Motores preparados para jogos grandes

Esta etapa deve evoluir os motores existentes, não criar outro motor paralelo sem necessidade.

## 8.1 Jogos 2D

Aperfeiçoe:

- Pool de entidades.
- Índices espaciais.
- Detecção de colisão.
- Física de passo fixo quando adequada.
- Separação entre atualização e desenho.
- Batching de elementos.
- Spritesheets.
- Culling de objetos fora da tela.
- Carregamento por regiões.
- Tilemaps extensos.
- Camadas e profundidade.
- Animações.
- Áudio.
- Partículas.
- Cenas conectadas.
- Transições.
- Persistência de estado.

Permitir mapas maiores do que a tela sem carregar ou processar tudo desnecessariamente.

O runtime deve aproveitar as informações completas dos mapas produzidos pelo Pinta.

## 8.2 Jogos 3D

Aproveite os runtimes Three.js e a infraestrutura de modelos existente.

Evolua:

- Gerenciamento de cenas.
- Culling e visibilidade.
- Instancing para modelos repetidos.
- Reutilização de geometrias e materiais.
- Níveis de detalhe, quando justificáveis.
- Qualidade adaptativa.
- Sombras.
- Iluminação.
- Texturas.
- Animações.
- Física.
- Índices espaciais.
- Objetos estáticos e dinâmicos.
- Carregamento progressivo de modelos.
- Descarte de GPU.
- Controle de draw calls.
- Gerenciamento de memória.

Os sistemas de orçamento gráfico existentes devem ser preservados e aprimorados.

Não substituir todo o runtime por outro motor ou adotar ECS automaticamente sem evidência técnica de necessidade.

## 8.3 Streaming de cenas

Implementar ou integrar um sistema genérico de carregamento por regiões para os tipos de jogo compatíveis.

Requisitos:

- Definição de regiões.
- Carregamento antecipado de áreas próximas.
- Ativação e desativação controladas.
- Descarte de recursos sem uso.
- Preservação de estado persistente.
- Transições sem reposicionar objetos incorretamente.
- Tratamento de falhas de carregamento.
- Estratégia para manter o jogador em uma região segura durante falhas.
- Controle de orçamento de memória.
- Compatibilidade com exportação e publicação.

O jogo deve poder ter um mundo grande sem manter todo ele ativo ao mesmo tempo.

Use o Arquipélago Vagalume apenas como caso de homologação 3D, respeitando os assets e contratos privados. Não modifique a composição artística do jogo como consequência desta etapa.

## 8.4 Segurança dos motores

Evite que projetos inválidos ou excessivos comprometam o navegador.

Preserve limites de segurança, mas torne-os explícitos, compreensíveis e fundamentados em medições.

Quando um limite for alcançado, o usuário deve receber uma mensagem clara e não um jogo silenciosamente incompleto.

---

# 9. Etapa 5 — Depuração profissional

O Estúdio precisa permitir investigar e corrigir programas, não apenas executá-los.

Evolua os mecanismos existentes para oferecer, conforme o runtime:

- Breakpoints.
- Pausar execução.
- Continuar.
- Executar passo a passo.
- Inspecionar variáveis.
- Inspecionar valores e objetos.
- Pilha de chamadas.
- Localização de erros.
- Mensagens de execução.
- Referência ao arquivo/linha.
- Referência ao bloco original.
- Inspeção de eventos e estados do jogo.

### Clássico

O depurador deve relacionar as informações aos blocos.

A criança pode encontrar ações como:

- Pausar aqui.
- Ver o valor.
- Próximo passo.
- Continuar.
- Mostrar o bloco que causou o problema.

Essas ferramentas devem ser adicionadas sem alterar os percursos protegidos das aulas.

### Pro

Oferecer uma experiência profissional de depuração de código.

Utilize os recursos adequados de cada executor. Não simule breakpoints por alterações inseguras de texto nem implemente um depurador universal que só funcione superficialmente.

### Python

Avalie a depuração possível no interpretador e no worker atual, mantendo a segurança do isolamento.

O suporte deve ser declarado por runtime e por recurso.

Não apresentar um botão funcionalmente incompleto como se oferecesse depuração total.

---

# 10. Etapa 6 — Profiler e painel de desempenho

Implemente uma experiência de inspeção de desempenho para ajudar quem está criando jogos.

O sistema deve conseguir indicar, quando tecnicamente disponível:

- FPS.
- Tempo por quadro.
- Tempo de atualização.
- Tempo de renderização.
- Uso de memória.
- Quantidade de entidades ativas.
- Quantidade de objetos visíveis.
- Draw calls.
- Triângulos.
- Texturas e geometrias.
- Custos de física.
- Recursos carregados.
- Picos de processamento.
- Carregamentos lentos.
- Crescimento indevido de recursos após reinícios.

Separe claramente dados reais, estimativas e informações indisponíveis.

### Apresentação infantil

Exemplos de explicações:

- "O jogo está desenhando muitos objetos ao mesmo tempo."
- "Há objetos fora da tela consumindo processamento."
- "Esta imagem está muito grande."
- "O jogo está carregando muitos recursos de uma vez."

As recomendações precisam derivar de medições reais.

### Apresentação avançada

Expor métricas técnicas, gráficos, identificação dos gargalos e recursos de comparação.

Não instalar instrumentação pesada continuamente no runtime de produção. O profiling deve ser ativado explicitamente e seu próprio custo medido.

---

# 11. Etapa 7 — Testes de programação e qualidade

Evolua as ferramentas de teste para permitir que os alunos verifiquem comportamentos de seus jogos.

## Clássico

Permitir definir testes simples com blocos ou uma interface compatível.

Exemplos:

- O jogador perde vida ao tocar no inimigo.
- A porta só abre com a chave.
- A pontuação aumenta quando um item é recolhido.
- O jogo termina quando as vidas chegam a zero.

Reutilize os verificadores de objetivos e a infraestrutura de execução existentes quando adequado.

Não transformar o produto em um sistema de correção que dependa da solução específica de um curso.

## Pro

Permitir testes de código e execução com ferramentas adequadas ao projeto, por exemplo:

- Testes unitários.
- Testes de integração.
- Testes de comportamento.
- Execução de um teste selecionado.
- Diagnóstico de falhas.
- Comparação de resultados.
- Verificação antes de exportar ou publicar.

As ferramentas escolhidas devem respeitar linguagem, ambiente e dependências.

## Requisitos gerais

- Testes isolados.
- Tempo e memória limitados.
- Relatórios compreensíveis.
- Resultados reproduzíveis.
- Sem modificar arquivos do aluno silenciosamente.
- Sem execução irrestrita de código não confiável no servidor.

---

# 12. Etapa 8 — Integração com Pinta e Molda

Existem frentes de desenvolvimento paralelas para os cenários 2D e 3D.

**Não interfira na implementação ativa dessas ferramentas.**

Nesta etapa, estabeleça e implemente os contratos do lado do Estúdio necessários para consumir cenas completas.

## Pinta — Cenários 2D

O Estúdio deve conseguir receber:

- Mapas estruturados.
- Camadas.
- Tilesets.
- Objetos.
- Propriedades.
- Colisões.
- Animações.
- Marcadores.
- Regiões.
- Referências versionadas.

Não perder dados durante a importação nem reduzir silenciosamente o cenário a uma imagem.

## Molda — Cenários 3D

O Estúdio deve conseguir consumir:

- Objetos e modelos.
- Terreno.
- Água.
- Caminhos.
- Grupos e conjuntos.
- Colisões.
- Pontos de partida.
- Marcadores.
- Iluminação.
- Referências de materiais.
- Regiões e dados necessários ao streaming.

Os contratos devem ser genéricos.

Não crie regras específicas para a Ilha Faísca dentro do núcleo do Estúdio.

### Integração incremental

Se os novos formatos de cena ainda não estiverem concluídos pelas sessões responsáveis, implemente primeiro adaptadores e contratos versionados compatíveis com o que está disponível.

Utilize fixtures e testes de contrato, deixando explícito o que depende de uma entrega externa.

Não altere os formatos em desenvolvimento unilateralmente.

---

# 13. Etapa 9 — Persistência, projetos e recuperação

Fortaleça a integridade dos projetos.

Requisitos:

- Salvamento incremental quando vantajoso.
- Versionamento do formato.
- Migrações seguras.
- Recuperação após interrupção.
- Proteção contra sobrescrita entre abas e dispositivos.
- Detecção de conflitos.
- Tratamento explícito de arquivos ausentes.
- Proteção contra versões antigas do cliente.
- Integridade dos materiais.
- Referências por identidade e versão.
- Desfazer/refazer consistente.
- Limpeza de arquivos temporários sem apagar dependências em uso.
- Exportações reproduzíveis.
- Compatibilidade com projetos publicados.

Projetos Clássicos convertidos para Pro devem preservar o original e oferecer rastreabilidade.

Não prometa que qualquer edição arbitrária em código Pro pode ser convertida novamente para blocos. Onde não houver conversão segura, preservar o código e informar a limitação.

Nenhuma operação de recuperação pode sacrificar dados silenciosamente para fazer um teste passar.

---

# 14. Etapa 10 — Fluxo profissional de desenvolvimento

Complete ou aperfeiçoe os recursos de produção de software.

- Organização modular.
- Gerenciamento de dependências.
- Diagnósticos de compilação.
- Execução de testes.
- Histórico compreensível.
- Comparação de alterações.
- Builds reproduzíveis.
- Exportação portátil.
- Publicação versionada.
- Recuperação de versões.
- Tratamento de falhas de build.
- Documentação e ajuda contextual.

Avalie integração opcional com Git no Pro, sem torná-la requisito para criar ou salvar jogos.

O histórico interno do Estúdio não deve ser apresentado como Git completo.

Uma criança deve conseguir exportar um projeto Pro e continuar seu desenvolvimento em ferramentas externas, com arquivos, recursos, configurações e instruções adequadas.

---

# 15. Zappy e experiência pedagógica

Preserve o Zappy existente e torne sua assistência mais útil para programação profissional.

O Zappy deve poder ajudar a:

- Entender mensagens de erro.
- Localizar código problemático.
- Interpretar valores de variáveis.
- Explicar a execução.
- Identificar gargalos de desempenho.
- Sugerir testes.
- Explicar estruturas de projeto.
- Orientar refatorações.

As explicações devem estar fundamentadas no estado real do projeto, na revisão correta do código e nos diagnósticos disponíveis.

Não inventar arquivos, linhas, erros ou métricas.

Não modificar código automaticamente sem uma ação explícita e a revisão adequada das alterações.

Assistência não deve ser ativada a cada tecla nem competir desnecessariamente com a renderização e a execução do jogo.

A linguagem deve continuar acessível a crianças, mas progressivamente apresentar os termos técnicos reais.

---

# 16. Metas e critérios de desempenho

Defina as metas definitivas depois da medição inicial e antes das modificações funcionais.

Utilize inicialmente as seguintes referências propostas:

| Métrica | Meta inicial |
|---|---|
| Digitação até atualização visual, p95 | Até 50 ms |
| Troca entre painéis já carregados, p95 | Até 100–150 ms |
| Busca, primeira resposta perceptível | Até 200 ms |
| Jogo 2D de referência | 60 FPS sustentados |
| Jogo 3D em qualidade leve | 30 FPS sustentados |
| Código problemático | Não congelar o editor |
| Abrir e fechar projetos repetidamente | Sem vazamento acumulativo indevido |
| Salvar durante execução do jogo | Preservar responsividade e integridade |
| Projeto grande | Sem travamentos prolongados por processamento global desnecessário |

Essas são metas para fixtures, aparelhos e perfis definidos, não promessas universais para qualquer jogo.

### Aparelhos de referência

No mínimo, incluir:

- Computador de entrada com 8 GB de RAM e GPU integrada.
- Computador intermediário.
- Ambiente desktop mais potente para diagnóstico.
- Navegadores suportados.
- Testes responsivos.
- Dispositivo físico de menor capacidade quando disponível.

Separar medições de:

- Primeira abertura.
- Abertura com cache.
- Editor utilizável.
- Serviço de linguagem pronto.
- Instalação de dependências.
- Jogo pronto para iniciar.
- Execução ativa.
- Edição com jogo ativo.
- Edição com jogo e Zappy ativos.
- Uso prolongado.

Registrar p50, p95, máximo, tarefas longas, memória e contadores relevantes.

Não comparar execução com profiler pesado com uma execução sem profiler como se fossem equivalentes.

Não declarar 60 FPS universais a partir de um jogo pequeno ou de um teste headless.

---

# 17. Jogos de homologação obrigatórios

A implementação só deve ser considerada completa depois de ser exercitada com projetos reais e cenários de estresse.

## A. Cadê Todo Mundo?

Reproduzir as montagens ensinadas.

Preservar:

- Blocos.
- Variáveis.
- Eventos.
- Visibilidade.
- Imagens.
- Execução.
- Verificação.
- Salvamento.
- Envio.

Conferir o resultado visual e funcional.

## B. Desafio do Primeiro Jogo — A Chave do Farol

Reproduzir as atividades ensinadas.

Preservar:

- Controles.
- Movimento.
- Colisões.
- Variáveis.
- Condições.
- Chave e porta do farol.
- Troca de imagens.
- Mensagens.
- Reinício da partida.
- Verificação e envio.

Conferir também as posições e os caminhos visuais demonstrados.

## C. Projeto Clássico com milhares de blocos

Usar projetos reais, como o Pac-Man, e criar uma fixture próxima dos limites do Clássico.

Testar:

- Abrir.
- Navegar.
- Procurar.
- Editar.
- Arrastar pilhas.
- Desfazer/refazer.
- Converter.
- Salvar.
- Reabrir.
- Executar.
- Trocar de modo.

## D. Jogo 2D de grande porte

Criar um jogo de homologação com:

- Vila.
- Floresta.
- Cavernas.
- Interiores.
- Várias camadas.
- Centenas de entidades.
- Efeitos.
- Áudio.
- Colisões.
- Regiões.
- Transições.
- Persistência.
- Carregamento progressivo.

Testar sessões prolongadas e retorno a regiões anteriores.

## E. Jogo 3D de exploração

Utilizar uma fixture genérica inspirada nas necessidades do Arquipélago:

- Terreno extenso.
- Várias regiões.
- Centenas de objetos estáticos.
- Personagens animados.
- Interações.
- Efeitos.
- Água.
- Luzes.
- Física.
- Streaming de cenas.

Medir recursos de GPU, memória, draw calls e tempo por quadro.

Não acessar, republicar ou incluir assets privados no Git sem autorização e licença adequadas.

## F. Projeto Pro grande

Criar um projeto modular real com:

- Muitos arquivos.
- JS/TS.
- Dependências.
- Materiais.
- Testes.
- Build.
- Histórico.
- Diagnósticos.
- Execução.
- Exportação.

Testar simultaneamente editor, linguagem, prévia, console e Zappy.

## G. Python

Reproduzir testes representativos nos runtimes Python oferecidos, incluindo Pygame-ce e Raylib quando aplicáveis.

Medir separadamente o custo do interpretador, transporte dos quadros, renderização e editor.

## H. Falhas intencionais

Criar fixtures com:

- Loop infinito.
- Recursão problemática.
- Excesso de mensagens.
- Material inválido.
- Dependência ausente.
- Falha de carregamento.
- Projeto acima do orçamento.
- Fechamento inesperado.
- Conflito de salvamento.
- Código com erro de compilação.

O editor deve continuar seguro e os dados preservados.

---

# 18. Estratégia de implementação e isolamento

Existem outras sessões trabalhando no Pinta e no Molda Cenários.

Não trabalhe diretamente numa árvore compartilhada que possa conter modificações dessas sessões.

### Procedimento

1. Inspecione o estado da `staging`.
2. Crie branch e worktree isolados.
3. Registre a referência de origem.
4. Identifique os arquivos compartilhados com outras frentes.
5. Evite conflitos e alterações concorrentes.
6. Priorize contratos pequenos e versionados.
7. Execute uma etapa por vez.
8. Teste e revise cada entrega.
9. Faça commits coesos.
10. Prepare integração por Pull Request.

Não faça merge automático na `staging` ou `main`.

Não implante em produção.

Não modifique o banco de produção nem publique jogos ou materiais de alunos para executar testes.

Utilize dados e contas de homologação, respeitando as permissões disponíveis.

### Processo por etapa

Cada etapa deve incluir:

- Análise do código existente.
- Contrato técnico.
- Testes que reproduzam os problemas reais.
- Implementação.
- Testes unitários.
- Testes de integração.
- Testes no navegador.
- Testes de compatibilidade.
- Medições de desempenho.
- Revisão de segurança.
- Revisão de descarte e recursos.
- Correção de problemas encontrados.
- Relatório com evidências.
- Commit.

Não declarar uma etapa concluída apenas porque os testes unitários passaram.

---

# 19. Critérios de revisão de arquitetura

A implementação deve respeitar os seguintes princípios.

**Sem reescrita desnecessária.** Reutilizar Blockly, Monaco, workers, runtimes, motores, serviços e contratos existentes.

**Sem soluções superficiais.** Aumentar debounces, timeouts ou cotas não substitui corrigir gargalos reais.

**Sem perda de dados.** Nunca descartar código, blocos, arquivos, referências ou propriedades desconhecidas silenciosamente.

**Sem desempenho fictício.** Não otimizar removendo funcionalidades, reduzindo testes ou apresentando métricas incompletas.

**Sem sistemas paralelos desnecessários.** Evitar criar outro armazenamento, outra fila, outro motor ou outra estrutura de projeto quando os existentes podem ser evoluídos.

**Sem quebra pedagógica.** Os dois cursos protegidos devem continuar reproduzíveis.

**Sem dependência obrigatória do Pro.** O Clássico continua sendo um produto funcional.

**Sem exigir WebContainer desnecessariamente.** Selecionar o executor compatível com a necessidade real.

**Sem confundir edição com publicação.** Um projeto editável pode precisar de validação e otimização para ser publicado; os limites devem ser claros.

**Sem comprometer segurança.** Código dos alunos é não confiável, inclusive quando executado remotamente.

---

# 20. Entregáveis finais

Ao finalizar, apresente:

1. Diagnóstico técnico inicial.
2. Plano executado, com status de todas as etapas.
3. Implementação funcional.
4. Matriz de compatibilidade dos dois cursos protegidos.
5. Evidências de que os blocos e percursos ensinados continuam funcionando.
6. Relatórios de desempenho antes/depois.
7. Evidências de execução de jogos grandes.
8. Relatório de consumo de memória.
9. Revisão de segurança e isolamento.
10. Testes de salvamento, recuperação e compatibilidade.
11. Manual atualizado do Estúdio Clássico.
12. Manual atualizado do Estúdio Pro.
13. Documentação das capacidades dos runtimes.
14. Guia de profiling e depuração.
15. Documentação de exportação.
16. Lista explícita de funcionalidades concluídas e pendências.
17. Pull Request com os commits verificados.

Registre as limitações honestamente.

Se alguma capacidade depender de uma entrega futura do Pinta ou do Molda, não a declare concluída sem integração real.

Se não houver acesso a aparelhos físicos, registre o teste como local, emulado ou de laboratório.

Se a sessão terminar com etapas ainda não implementadas, deixe um registro reproduzível do estado real, dos contratos fechados, dos testes e da sequência restante. Não apresente trabalho parcial como conclusão global.

---

# 21. Resultado final esperado

Queremos que uma criança consiga:

- Começar programando visualmente.
- Aprender variáveis, condições, eventos, funções e lógica.
- Criar seus próprios jogos.
- Trabalhar com sprites, cenários, modelos e sons.
- Construir projetos cada vez maiores.
- Organizar o código de forma profissional.
- Identificar e corrigir erros.
- Medir e melhorar o desempenho.
- Executar testes.
- Exportar e publicar seus jogos.
- Evoluir naturalmente para programação em código.

O Clássico deve permanecer familiar às crianças que acompanharam **Cadê Todo Mundo?** e **Desafio do Primeiro Jogo**.

O Pro deve alcançar uma experiência de IDE profissional, mas com clareza, acessibilidade e identidade adequadas ao Sistema Zero.

Os motores precisam ser rápidos, confiáveis e escaláveis dentro de limites de hardware definidos.

**O objetivo não é apenas aumentar a quantidade de funcionalidades. É aumentar a capacidade real de criação sem perder simplicidade, estabilidade, segurança e desempenho.**

Comece agora pela inspeção do repositório e pela matriz de compatibilidade pedagógica. Depois execute a modernização em etapas, priorizando isolamento, desempenho e integridade dos projetos. Continue com os recursos profissionais, os motores, os testes e a homologação integral.

Não pare apenas no planejamento. Implemente, teste, revise e documente cada avanço até completar o escopo verificável.
