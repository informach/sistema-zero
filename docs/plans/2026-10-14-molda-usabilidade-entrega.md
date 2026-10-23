# Molda: implementação da proposta de usabilidade

14/10/2026 · Implementação da revisão 4 · Crianças de 9–12 anos no computador

A oficina foi reorganizada para criar, pintar e animar na mesma estrutura: ferramentas à esquerda, modelo no centro e peças, cores e ajustes à direita. Animar mantém uma única linha do tempo abaixo do palco. Os recursos avançados continuam disponíveis conforme as permissões existentes.

Referências: [proposta aprovada](2026-10-14-molda-usabilidade-proposta.md), [45 telas e 50 percursos](2026-10-14-molda-usabilidade-fluxos.md), [33 achados da revisão](2026-10-14-molda-usabilidade-revisao.md) e [plano de implementação](../superpowers/plans/2026-10-14-molda-usabilidade-implementacao.md).

**Revisão posterior à implementação:** os ajustes finais e a verificação que acompanha o commit estão na [revisão completa](2026-10-14-molda-usabilidade-full-review.md). A oficina é o editor padrão de todos os modelos, sem variável de ambiente, opção de adapter ou parâmetro de URL para ativar V2. As versões dos arquivos continuam preservadas para leitura e conversão.

## Comportamento entregue

### Criar e modelar

- Criar modelo abre uma criação com nome válido, uma caixa selecionada e Mover ativo. Projetos existentes começam em Escolher.
- Há uma ferramenta ativa. O primeiro gesto sobre outra peça apenas a escolhe; o gesto seguinte pode movê-la ou pintá-la.
- Adicionar e duplicar colocam a peça próxima, sem sobreposição inicial, mantendo o grupo indicado. Uma parte acrescentada ao conjunto animado herda seu movimento.
- Mover, Girar e Tamanho oferecem ações por clique. Coordenadas absolutas e operações específicas ficam em expansões identificadas, conforme acesso.
- Colocar no chão e Colocar em cima permitem montar sem preencher coordenadas. Apoio plano tem prévia; suporte incompatível é recusado sem alterar a peça.
- Olhar, Vista, Enquadrar e zoom são visíveis. Escolher uma ferramenta ou concluir a troca de atividade encerra Olhar, preservando a câmera.
- Lista de peças, visibilidade, trava e saída de isolamento permanecem acessíveis. Edição de componentes tem Voltar às peças explícito.
- Pivô oferece Centro, Embaixo e cantos reais, com demonstração rosa antes de aplicar. Alvos animados ou vinculados incompatíveis são bloqueados com explicação.
- Criar divisão usa uma vista definida e dois pontos, com corrigir, cancelar e aplicar. Mantém os dois lados da malha e não promete fechar o corte.
- Ao abandonar uma prévia de pivô, divisão ou movimento pronto, uma decisão permite aplicar, descartar ou continuar. Uma prévia inválida não pode ser aplicada; a intenção original só é retomada após resolver a decisão.

### Pintar

- Pincel, Balde, Borracha e Pegar cor ficam no trilho. O pincel começa Médio; espelho começa desligado.
- Cor atual, paleta, favoritas e recentes ficam à direita. Escolher uma cor não cria uma alteração no projeto.
- A tinta visual é mantida ao trocar entre imagens indexadas e RGBA. Pegar cor lê o resultado composto, inclusive a base, conserva o alvo de pintura e retorna ao Pincel.
- Balde distingue Área de Cor de fundo. Alterar o fundo preserva desenhos e outras peças que antes compartilhavam o material.
- Borracha atua somente na camada ativa, revelando o que está abaixo. A preparação de uma superfície só vira alteração junto da ação confirmada.
- Camadas, pintura de perto, folha, formas, UV, materiais e quadros continuam nos contextos correspondentes.

### Animar

- Esta peça e Modelo inteiro tornam o alvo explícito. Preparar um conjunto e guardar o movimento é uma única alteração; cancelar a prévia não deixa um grupo vazio.
- Movimento manual começa com 2 segundos, repetição, marcação automática e pose anterior desligadas. Pular, Balançar e Girar têm prévia; velocidade e intensidade aplicáveis têm ajustes simples.
- Próxima pose navega. Mais tempo acrescenta 2 segundos e vai ao novo final, sem criar chaves nem alterar os tempos existentes. Reproduzir no final reinicia em zero.
- Uma pose pendente reúne gestos em várias peças no mesmo instante. Desfazer/Refazer atua primeiro nesse rascunho. Marcar pose grava os canais alterados em uma única ação, preservando a âncora inicial e as chaves não editadas.
- Mover um grupo e depois seu filho não aplica o movimento herdado duas vezes.
- Trocar tempo, movimento, atividade, reproduzir, abrir arquivos ou sair resolve a pose com Marcar, Descartar ou Continuar. Escolher outra peça e mover a câmera não interrompem o ajuste.
- Há recuperação local separada da pose pendente, vinculada à revisão do projeto. A interface não a apresenta como pose já marcada. Falha de armazenamento conserva o ajuste em memória e informa o problema.
- Ao sair de Animar, Modelar/Pintar mostram a forma inicial. Ao voltar, o movimento e o instante são retomados com a reprodução pausada.
- A timeline começa com uma linha por peça e permite expandir canais. Operações avançadas usam a mesma timeline.

### Salvar e continuar

- Salvar e exportar ficam no cabeçalho. Salvamento neste computador e sincronização com a conta são estados distintos.
- O retorno à galeria salva e sai diretamente quando possível. Falhas, pose pendente e revisão do host mantêm caminhos de recuperação.
- Importação continua exigindo revisão antes da substituição. Restauração cria uma criação independente. Exportação, imagem PNG e apresentação HTML mantêm seus contratos existentes.
- Textura usa ferramentas nomeadas e pincel Médio. Céu conserva prévia, predefinições e ajustes progressivos, sem receber abas 3D sem utilidade para esse editor.

## Relação com os prints

As quatro regiões dos prints foram preservadas. As diferenças deliberadas da revisão 4 também foram mantidas: ajustes da ferramenta atual no lugar de todos os campos abertos; ferramentas por acesso; timeline agregada por peça; nenhuma promessa de andar automaticamente, fechar malha cortada ou exportar vídeo.

Em 1440 × 900 e 1366 × 768 o painel direito mantém suas regiões. Em 1024 × 600, alterna entre os conteúdos necessários: Peças/Ajustar, Peças/Cores ou Movimentos/Peças/Pose. As abas laterais também funcionam pelo teclado. Em larguras efetivas menores, palco e painel ficam em sequência com rolagem, mantendo os controles alcançáveis.

As capturas iniciais abaixo incluem um cabeçalho de desenvolvimento de 38 px, removido na revisão final. A conferência de 683 × 384 e 512 × 300 verifica reflow equivalente à redução da área disponível; não é teste de zoom nativo do navegador nem validação de celular como dispositivo principal.

Capturas de referência da implementação:

- [Modelar em 1366 × 768](../../.audits/molda-usabilidade-2026-10-14/implementation/modelar-1366.png).
- [Pintar com traço real](../../.audits/molda-usabilidade-2026-10-14/implementation/pintar-traco-real.png).
- [Animar em 1440 × 900](../../.audits/molda-usabilidade-2026-10-14/implementation/animar-1440.png) e [1024 × 600](../../.audits/molda-usabilidade-2026-10-14/implementation/animar-1024.png).
- [Prévia de pivô](../../.audits/molda-usabilidade-2026-10-14/implementation/pivo-previa.png), [divisão](../../.audits/molda-usabilidade-2026-10-14/implementation/divisao-previa.png) e [movimento pronto](../../.audits/molda-usabilidade-2026-10-14/implementation/animar-previa-pulo.png).
- [Textura](../../.audits/molda-usabilidade-2026-10-14/implementation/textura.png) e [céu](../../.audits/molda-usabilidade-2026-10-14/implementation/ceu.png).

## Cobertura funcional

O catálogo continua sendo a especificação de estados, não uma lista de 45 páginas. A tabela distingue cobertura automatizada de percursos exercitados no navegador; não afirma que todas as combinações de documentos foram testadas manualmente.

| Estados da proposta | Evidência principal |
|---|---|
| T01–T06: galeria, criação, modelos de partida, identidade, restauração e backup | `MoldaApp`, `SceneStart`, `SceneProjectRestore`, `SceneWorkshopHost`, galeria e persistência; criação/retorno no navegador |
| T07–T12: seleção, montagem, precisão, câmera e apoio | `placement`, `SceneBodyMove`, `SceneViewport`, `SceneWorkshop`, acesso e contratos; montagem, Olhar, roda e layouts no navegador |
| T13–T17: pivô, componentes, divisão, malha e articulação | `modelGuides`, comandos, malha/skin e integração da oficina; pivô/divisão/cancelar/aplicar/desfazer no navegador |
| T18–T27: pintura, cores, face, camadas, formas, folha, UV, materiais e quadros | `paintInk`, superfícies, gestos de pintura, `SceneWorkshop.paint`, face/UV/material/flipbook; fundo/traço/borracha/cor/desfazer no navegador |
| T28–T34: movimento, pose pendente, presets, reprodução, chaves e recursos avançados | `animationTarget`, poses/transforms, `SceneAnimationPoseGesture`, player, timeline, conjuntos de poses/IK e recuperação; movimento inteiro/manual, várias peças, marcar e recuperar no navegador |
| T35–T40: importação, exportação, imagem/apresentação, saída, salvamento e ajuda | Partição de importação/exportação/workers, painéis, `SceneExitControl`, host e primeiros passos; download estrutural e saída no navegador |
| T41–T42: textura e céu | Testes dos editores e respectivos domínios; pintura, slider por teclado, desfazer e retorno no navegador |
| T43–T45: abertura inválida, integração e perfil | `SceneWorkshopHost`, `MoldaApp`, conformidade do host, sincronização, ferramentas e testes de integridade de documentos avançados |

As 23 famílias de acesso e os 45 comandos do registro foram preservados e conferidos pelos testes de acesso/registro. Os percursos F41–F50 combinam evidências de domínio, integração e navegador: montagem, fundo e desenho, conjunto, cor composta, pose de várias peças, adição posterior ao grupo, extensão de tempo, borracha por camada, retorno de Olhar e ajuste de grupo/filho.

## Verificação técnica inicial

Na primeira entrega, **3.090 testes passaram, sem falhas, em 413 arquivos** das três partições configuradas do pacote: 1.079 na primeira, 952 na segunda e 1.059 na terceira. TypeScript, lint dos 86 arquivos alterados e build do playground passaram. Os quatro percursos de navegador também passaram sem erros de página. Os números atualizados e a suíte E2E versionada estão na [revisão completa](2026-10-14-molda-usabilidade-full-review.md#verificação).

| Verificação | Evidência |
|---|---|
| Suíte completa, em lotes sequenciais | [Manifesto com cada arquivo e resultado](../../.audits/molda-usabilidade-2026-10-14/verification-batched.json) e [log consolidado](../../.audits/molda-usabilidade-2026-10-14/batched-tests-final.log) |
| TypeScript | [Log](../../.audits/molda-usabilidade-2026-10-14/typecheck-final.log) |
| Lint e formatação dos arquivos alterados | [Log](../../.audits/molda-usabilidade-2026-10-14/biome-final.log) |
| Build do playground | [Log](../../.audits/molda-usabilidade-2026-10-14/build-final.log) |
| Percurso principal na versão compilada, servida localmente | [Log da conferência final](../../.audits/molda-usabilidade-2026-10-14/built-preview-smoke.log) |
| Criação, montagem, pose composta e layouts | [Resultado do percurso principal](../../.audits/molda-usabilidade-2026-10-14/implementation/smoke.json) |
| Pintura real, movimento, recarga e saída | [Resultado do percurso completo](../../.audits/molda-usabilidade-2026-10-14/implementation/deep.json) |
| Pivô, divisão, decisões de prévia, câmera e telas menores | [Resultado dos contextos avançados](../../.audits/molda-usabilidade-2026-10-14/implementation/advanced.json) |
| Textura e céu | [Resultado dos demais editores](../../.audits/molda-usabilidade-2026-10-14/implementation/other-editors.json) |

Uma rodada conjunta foi interrompida por falta de memória na estação compartilhada. A verificação foi retomada com os mesmos arquivos das três partições do pacote, em processos curtos e sequenciais. O [executor de verificação](../../.audits/molda-usabilidade-2026-10-14/verify-batched.cjs) registra arquivos, quantidades e código de saída de cada lote; não pula testes. As esperas de integração do Testing Library foram ajustadas de 1 para 5 segundos para inicialização de workers reais e operações de IndexedDB; o limite de cada teste continua em 20 segundos.

Para repetir a verificação com consumo limitado de memória, executar `node .audits/molda-usabilidade-2026-10-14/verify-batched.cjs` na raiz do repositório. O comando padrão do pacote continua disponível; a confirmação final desta entrega é a execução integral em lotes, não a rodada monolítica interrompida.

Os quatro scripts de navegador exercitam fluxos reais com Chromium/Playwright isolado do projeto, incluindo ponteiro, teclado, roda, downloads, recarga e IndexedDB. O navegador integrado da sessão estava indisponível. A alternativa não usa a sessão pessoal de navegação.

## Limites da validação

Os testes demonstram comportamento e preservação de dados nos casos cobertos. Não demonstram que crianças já compreenderam a interface sem ajuda. Ainda é necessário observar crianças de 9–12 anos criando, pintando, animando e acrescentando uma parte ao mesmo modelo, principalmente ao distinguir seleção/câmera e ao usar Marcar pose.

A navegação com roda e arrasto foi automatizada; não houve teste físico em diferentes touchpads. A integração com o Estúdio foi verificada por contratos e testes do host, sem uma sessão de conta de produção. Recuperação local continua dependente da disponibilidade do armazenamento e da gravação do rascunho; não equivale a uma cópia na conta.

O build do playground gera aviso de chunks acima de 500 kB. A divisão de bundles não faz parte desta mudança de usabilidade.
