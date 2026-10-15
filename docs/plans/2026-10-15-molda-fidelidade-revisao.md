**Molda — registro da revisão da proposta**

15/10/2026 · Acompanha a [proposta revisada](2026-10-15-molda-fidelidade-tres-niveis-proposta.md), revisão 2.

**A direção da proposta foi mantida; as regras de domínio, transição e preservação foram ampliadas.** A versão anterior descrevia bem a composição desejada, mas deixava decisões importantes para a implementação e algumas garantias estavam amplas demais. Esta revisão torna essas decisões explícitas e separa requisitos fornecidos, preservação do existente e ampliações propostas. A identidade visual do Sistema Zero continua sendo uma condição do trabalho.

O resultado é uma proposta mais verificável, não uma declaração de implementação concluída. Persistem provas técnicas necessárias para o pivô, corte com UV e pintura entre peças; elas agora estão antes da implementação completa no plano de entregas.

**Evidências utilizadas.** Foram inspecionadas novamente as cinco imagens originais de `C:\Users\tocha\Downloads\molda`, relidos integralmente os três documentos de Downloads e revista a proposta anterior. O código foi conferido nos componentes da oficina, controles de acesso, transformações, guias, corte, pintura, animação, câmera, importação e exportação. O último commit que afetou o Molda é `7981caf7a` — `feat(molda): direção de arte da oficina e correções do full review`.

Não houve navegação nova no aplicativo nem comparação visual automatizada nesta revisão. As capturas do aplicativo ligadas na proposta são da análise anterior. Os arquivos do pacote Molda não foram alterados neste trabalho.

| Fonte fornecida | Referência conservada no projeto | Checklist explícito |
|---|---|---|
| Print Mover | [01-modelar-mover.jpeg](references/2026-10-15-molda-fidelidade/01-modelar-mover.jpeg) | Composição e controles |
| Print Pivô | [02-modelar-pivo.jpeg](references/2026-10-15-molda-fidelidade/02-modelar-pivo.jpeg) | Complementado pelo documento |
| Print Cortar | [03-modelar-cortar.jpeg](references/2026-10-15-molda-fidelidade/03-modelar-cortar.jpeg) | Complementado pelo documento |
| Print Pintar | [04-pintar.jpeg](references/2026-10-15-molda-fidelidade/04-pintar.jpeg) | Composição e controles |
| Print Animar | [05-animar.jpeg](references/2026-10-15-molda-fidelidade/05-animar.jpeg) | Complementado pelo documento |
| Documento Pivô | [Especificação](references/2026-10-15-molda-fidelidade/molda-ferramenta-pivo-spec.md) | 11 itens na seção 7 |
| Documento Cortar | [Especificação](references/2026-10-15-molda-fidelidade/molda-ferramenta-cortar-spec.md) | 14 itens na seção 8 |
| Documento Animar | [Especificação](references/2026-10-15-molda-fidelidade/molda-animar-spec.md) | 25 itens nas seções 7.6 e 9 |

São 50 itens explícitos de checklist, além das regras no corpo dos documentos e dos controles visíveis nos prints. Esses itens são requisitos para a futura implementação, não 50 testes já aprovados. As cópias locais permitem consultar as fontes mesmo se a pasta Downloads mudar. A comparação SHA-256 confirmou que as oito cópias são idênticas aos originais; o [registro dos hashes](../../.audits/molda-proposta-revisao-2026-10-15/hashes-fontes.json) preserva essa conferência.

**Correções relevantes aplicadas à proposta.** “Crítico” abaixo significa que a lacuna poderia produzir dados incorretos, regressão ou uma falsa declaração de fidelidade; não significa que foi identificado um defeito novo em produção.

| Impacto | Lacuna da proposta anterior / evidência no código | Correção incorporada |
|---|---|---|
| Crítico | A discussão de pivô não fixava uma representação compatível com animações; [commands.ts](../../packages/molda/src/scene/commands.ts) rebate origem/geometria e recusa casos animados | Recomendar referência de autoria independente, provar persistência e gestos, conservar animações existentes e tratar vínculos explicitamente |
| Alto | [modelGuides.ts](../../packages/molda/src/scene/modelGuides.ts) calcula presets por limites mundiais | Exigir presets sobre base/eixos locais; peça girada não troca a definição de Embaixo |
| Crítico | O critério de teste falava em igualdade de matrizes após mudar o pivô | Verificar posições mundiais dos pontos e descendentes; matrizes internas podem mudar sem mover a geometria |
| Alto | Campos misturavam dimensão, escala, origem e posição; [SceneTransformCoordinates.tsx](../../packages/molda/src/components/editor/scene/SceneTransformCoordinates.tsx) apresenta transformação mundial | Definir o referencial de cada campo, adaptação da base, ida e volta do arquivo, multisseleção e limites para cisalhamento |
| Alto | “Vista livre” do [motor de câmera](../../packages/molda/src/viewport/viewportCamera.ts) usa perspectiva | Separar orientação da projeção para a isometria ortográfica continuar orbitável |
| Crítico | [meshPlaneCut.ts](../../packages/molda/src/scene/meshPlaneCut.ts) divide faces, mantendo o objeto e os dois lados, sem tampas | Novo resultado de domínio com duas peças fechadas; não renomear Criar divisão e considerar o requisito atendido |
| Alto | Corte não explicitava plano provisório, terceiro ponto, mudança de revisão e trajetos inválidos | Terceiro ponto pode inclinar o plano; quarto em diante respeita o plano; validar face comum, tolerâncias, revisão e cancelamento |
| Crítico | Preservar materiais/UV e hierarquias após corte estava genérico | Fechamento e volume, UV das tampas, isolamento de recursos, animação rígida e limites explícitos para vínculos/filhos |
| Crítico | [scenePaintGesture.ts](../../packages/molda/src/state/scenePaintGesture.ts) trabalha com um alvo; trocar alvo não cria automaticamente um traço entre peças | Transação com vários alvos, preparação reversível e um único histórico; interromper segmentos no vazio e entre regiões UV |
| Médio | Favoritas/recentes em [useScenePaint.ts](../../packages/molda/src/components/editor/scene/useScenePaint.ts) são estado de sessão | Persistência de Minhas cores é trabalho adicional; Usadas agora deriva de uso confirmado, não de arrastar o seletor |
| Alto | “Todas as peças” ainda permitia interpretações de preenchimento global ou pintura através de objetos | Fixar superfície visível, oclusão por peças travadas, seleção estável, espelho por peça e ausência de alvo |
| Crítico | [animationDraft.ts](../../packages/molda/src/scene/animationDraft.ts) elimina valores iguais e adiciona início quando falta chave em zero | Marcar explicitamente deve admitir poses iguais; primeira edição de canal vazio após zero inclui início; editar canais importados conserva sua estrutura inicial |
| Alto | [useSceneWorkshop.ts](../../packages/molda/src/components/editor/scene/useSceneWorkshop.ts) usa decisão de saída para navegação temporal | Descartar prévia na navegação conforme o documento; distinguir seek interno, Tocar, mudança de ferramenta, pivô e saída |
| Crítico | O [amostrador](../../packages/molda/src/scene/sampleAnimation.ts) lê interpolação de saída, enquanto o cartão fala de chegada | Adaptador único por intervalo e política para inserir/copiar/mover/apagar; comparar reprodução entre chaves |
| Alto | [SceneAnimationKeyStrip.tsx](../../packages/molda/src/components/editor/scene/SceneAnimationKeyStrip.tsx) navega pelo tempo próximo, sem representar toda a interação pedida | Seleção específica de chave, atualização após arrasto/desfazer, resumo sem escolha arbitrária de canal e controle de colisões |
| Alto | Primeira abertura, movimento vazio, copiar pose e duração importada ainda tinham lacunas | Definir criação sem agrupamento implícito, cópia por posicionamento, tempo exato, duração fora dos atalhos e exclusão da última chave |
| Alto | Altura ajustável estava descrita, mas faltavam regras que evitam limiar inalcançável e preferência perdida | Usar altura bruta ao soltar; separar preferência e limite da janela; testar 119/120/161/162 px e cancelamento |
| Alto | Recursos existentes, especialmente `paint.flipbook`, não tinham destino completo | Inventário das 23 famílias; manter pintura animada, ações contextuais, malha, materiais, UV, vínculos e arquivos |
| Crítico | Garantia genérica de exportar “sem perda” excedia o contrato de [studioLibrary.ts](../../packages/molda/src/export/studioLibrary.ts) | Separar preservação por nível de conversão por formato; manter relatório e confirmação de perdas |
| Alto | Importação simples não definia formato nem diferença entre substituir e acrescentar | GLB/glTF no caminho básico; preservar prévia/revisão/substituição reversível existentes; anexar à cena é ampliação distinta |
| Alto | Identidade poderia ser usada como justificativa ampla para afastar a composição dos prints | Limitar adaptações aos tokens e necessidades registradas; conservar controles, hierarquia, gestos e medidas de referência |
| Médio | Pintar e Animar estavam juntos numa entrega extensa; melhorias novas se misturavam à adaptação | Oito entregas com provas antecipadas; distinguir obrigatório, reorganização e ampliação |

**Rastreabilidade dos comportamentos principais.** Esta tabela orienta os testes futuros; não substitui os 50 itens nem reproduz todos os valores visuais das especificações.

| Fonte | Regra consolidada na proposta | Evidência exigida na implementação |
|---|---|---|
| Cinco prints; Pivô §§3–6 | Regiões 104/1016/320, cabeçalho 60, controles e semântica visual com tokens da plataforma | Capturas no espaço interno 1440 × 900, medidas por região e registro das adaptações por tema |
| Mover; Pivô §2 e §5 | Quatro grupos de campos; dimensão real e referencial declarado | Caixa 6 × 2 × 8, pais transformados, edição/arrasto e salvar/reabrir com os mesmos valores |
| Pivô §2 e §7 | Alterar o centro sem mover a peça; rotação futura usa esse centro | Pontos mundiais invariantes ao escolher pivô; canto fixo durante giro; vários movimentos intactos |
| Pivô §4 | Marcador 40, alças X/Z, ghost roxo, etiquetas e presets imediatos | Capturas com zoom/câmera distintos; campo e viewport sincronizados; Esc e um desfazer |
| Cortar §§2–4 e §6.1 | Uma peça, arestas visíveis, encaixe 12 px, pontos locais e cancelar | Nenhum ponto no vazio/diagonal de triangulação; câmera conserva marcação; troca de alvo limpa |
| Cortar §6.2 | Dois pontos perpendiculares à face; terceiro define plano inclinado | Cortes válidos/colineares/ambíguos; quarto ponto fora do plano recusado; Backspace recalcula |
| Cortar §§6.3–8 | Duas peças fechadas, aparência e posição mantidas | Caso 6 × 2 × 8 → duas 6 × 2 × 4; casos inclinados; volumes/tampas/UV; desfazer e reabrir |
| Pintar | Ferramentas B/G/E/I, paletas, grade e escopo | Um traço entre peças, um desfazer, travas, transparência, grade fora da textura e favoritas persistidas |
| Animar §§1–2 e §6 | Movimento, três canais, chaves específicas e contagem | Exemplo de 8 chaves contra 5 instantes distintos; peças sem canais continuam visíveis |
| Animar §4.3 | Prévia manual; marcação ao soltar com automático; navegar descarta | Pose pendente não altera salvo; primeira edição após zero; pose igual; Esc; Tocar e seek interno |
| Animar §4.2 | Ghost da última chave anterior do canal escolhido | Caso com canais em tempos diferentes e pai animado; sem anterior, sem ghost |
| Animar §2 e §6.3 | Jeito de chegada Suave/Reto/De uma vez | Três chaves com jeitos distintos; inserir/copiar/apagar; reprodução antiga inalterada ao abrir |
| Animar §5 | Geometria temporal, chave arrastável, agulha inteira, 0,05 s e encaixe 6 px | Colisões/limites, clique sem arredondar, nomes/faixas alinhados, teclado e duração importada |
| Animar §7 | Altura 306/162/60, máximo centro − 240, recolher abaixo de 120 | Limiares exatos, ponteiro cancelado, duplo clique, persistência, janela e separador por teclado |
| Animar §7.3 | Canvas realmente redimensionado, painel direito independente e dicas ancoradas | Renderer/câmera sem deformação, viewport mínimo, dica oculta abaixo de 300 e sem reenquadramento |
| Catálogo e adapter do Kids | Autoria por nível; leitura preservada; novas capacidades básicas específicas | Perfis dos três níveis, comandos sem botão, atalhos, mudança de nível com projeto avançado |
| Contratos de importação/exportação | Substituição revisada; preservação nativa; perdas externas explícitas | Cancelar, revisão obsoleta, desfazer, salvar/reabrir e relatório do Estúdio |

**Verificação executada sobre a base atual.** Os testes abaixo foram escolhidos para conferir os contratos existentes nas áreas de maior risco. Executados em `packages/molda` com Bun:

```powershell
bun test src/scene/modelGuides.test.ts src/scene/meshPlaneCut.test.ts src/scene/animationCommands.test.ts src/scene/animationKeyEdits.test.ts src/scene/animationPoseTransform.test.ts src/state/SceneAnimationPoseGesture.test.ts src/state/scenePaintGesture.test.ts src/scene/pieceAppearance.test.ts src/viewport/viewportCamera.test.ts
```

Resultado: **62 passaram, 0 falharam; 1.791 verificações; nove arquivos; 1.002 ms**. O [log integral](../../.audits/molda-proposta-revisao-2026-10-15/testes-base.txt) está preservado. Esses testes não verificam os novos overlays, o novo corte fechado, o novo pivô, a transação entre peças ou a altura arrastável, que ainda não foram implementados.

| Conjunto existente | O que ajuda a confirmar |
|---|---|
| `modelGuides`, `meshPlaneCut` | Contrato atual das guias e divisão de superfícies; necessidade de distinguir o novo corte |
| `animationCommands`, `animationKeyEdits`, `animationPoseTransform` | Edição temporal, validação, transformações e preservação dos contratos existentes |
| `SceneAnimationPoseGesture` | Separação entre prévia, gravação e histórico |
| `scenePaintGesture`, `pieceAppearance` | Cancelamento do gesto e isolamento de recursos de aparência |
| `viewportCamera` | Projeções e redimensionamento já disponíveis como base |

**Decisões que ainda exigem prova durante a execução.**

1. A representação do pivô deve conservar arquivos antigos e reprodução, além de sustentar os próximos gestos em peças giradas, com escala e sob pais transformados. Uma nova rotação também precisa manter o centro entre as poses, não só nos extremos; compensar translação apenas nas chaves não prova esse trajeto. É uma recomendação de arquitetura; a revisão não implementou nem comprovou essa representação nova.
2. Corte geral exige escolher e verificar o algoritmo de fechamento e mapeamento de tampas. A referência de uma caixa não comprova suporte a cilindros, bolas, concavidades e animação rígida.
3. Pintura entre peças exige uma transação de vários recursos. O isolamento atual é uma base útil, mas trocar o alvo do gesto atual não resolve o fluxo.
4. Um editor gráfico de curvas e alinhamento/distribuição são ampliações propostas, com critérios próprios. A reorganização dos recursos que já existem não depende de fingir que essas ampliações estão prontas.
5. A fidelidade visual final precisa de comparação no aplicativo, nos temas e no host Kids. A revisão documental não substitui essa etapa.

A [versão anterior](../../.audits/molda-proposta-revisao-2026-10-15/proposta-v1.md) foi preservada como histórico textual. A proposta revisada é a referência vigente; os documentos originais conservam sua função de fonte dos requisitos.
