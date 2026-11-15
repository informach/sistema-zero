# Arquipélago Vagalume V2 — Parecer de Level Design e Direção de Arte

**Base examinada:** `informach/sistema-zero`, branch `staging`; relatório `docs/qa/2026-11-15-faisca-blockout-artistico.md`, atualizado no commit `87b9669a8` (15/11/2026). Capturas versionadas: `praca-dia.png`, `mapa.png`, `farol.png` e `ponte-campos.png`. Código consultado na mesma branch: `src/sistemas/faisca.ts`, `src/sistemas/composicao-faisca.ts`, `src/sistemas/ritmo-da-aventura.ts` e `playground/faisca-mapa.tsx` (todos sob `packages/arquipelago`).

**Natureza do documento:** parecer de avaliação e proposta do próximo marco. **Não constitui aceite final da direção de arte**, alteração de código ou nova aprovação narrativa.

## 1. Síntese

**Parecer: blockout técnico validado nos ensaios; aceite artístico pendente.** A Faísca já tem geografia ampliada, seis distritos e percursos declarados, coração habitado mais próximo, 23 modelos de arte em região piloto, avatar nativo, estudo de coelha, transposição funcional de ponte curta, controle de setores e ensaios de desempenho. As imagens mostram, porém, que a composição ainda não transmite a densidade, o cuidado ambiental e a vida social de uma vila fantástica. Preservar a fundação e avançar com uma **passada de composição**, não com expansão indiscriminada de conteúdo.

As capturas são recortes: permitem criticar a implantação e composição que aparece nelas; não comprovam ausência de conteúdo fora de quadro. O mapa mostra trajetos e círculos de estudo, não seis distritos finalizados. O relatório atesta testes locais; não atesta FPS em dispositivos físicos, aceite da animação ou campanha integrada.

| Questão | Já implementado/testado | Ainda a propor ou validar |
|---|---|---|
| Macrogeografia | Sete territórios e ponte Faísca–Bosque no `/macro` | Terreno, costa, materiais e direção de arte definitivos |
| Faísca | Percursos em dados, seis distritos, coração compacto; piloto de 23 GLBs | Composição com identidade visual, interesse e implantação coerente |
| Personagens | Modelo e clipes de coelha, pequeno percurso e conversa | Íris com figurino, gestos, rotina e papel narrativo |
| Ponte dos Campos | GLB real atravessado; altura de piso ajustada | Encontros físicos *e visuais* das duas margens e caminhos |
| Ritmo | Perfis `referencia`, `explorar` e `agil`; IK e cadência no ensaio | Avaliação visual em movimento; acessibilidade e saltos no percurso |
| Integração | Playground `/macro`; estado local `arquipelago:faisca:ensaio` | Morada na geografia nova, progresso e Missão do Núcleo |

## 2. Praça — Vila dos Criadores

**Preservar:** os três rumos de saída visíveis; o coração com porta–praça ~13 m, praça–horta ~20 m e praça–Pátio ~25 m; o moinho e o Farol como marcos; o avatar na escala nativa. Não afastar essas funções para preencher território.

**Ajustar (P0):** a praça vista de dia ainda é uma bifurcação de caminhos largos e chapados, ladeada por blocos arquitetônicos muito similares. O terreno tem grandes campos de verde homogêneo e junções rígidas entre grama e estrada, com pouca leitura de borda, solo pisado, sombra acolhedora e uso comunitário. O olhar vai ao Farol, mas quase não há um motivo visual para parar **na** praça. O código confirma reuso de `casa_01_pacote` para vizinhos, correio e oficina (com escalas/orientações diferentes); manter reuso como técnica, mas criar diferença percebida por função, acessórios, proporções de implantação e paisagismo. Evitar resolver com mais casas iguais.

**Intervenção proposta (sem sistema novo):** organizar um núcleo de convivência em torno do poço do Reino; reservar área legível para o Quadro das Conexões; evidenciar o correio por balcão, caixas e circulação do Nico; inserir sinais simples de ocupação como vasos, bancos, varal, carrinho e objetos de ofício nas frentes, conforme os modelos disponíveis. Criar transições curtas de grama, caminho e terra batida e pequenos agrupamentos de vegetação para emoldurar, não bloquear, a câmera. Distinguir o acesso ao Pátio pela linguagem de ferramentas/peças; aos Campos por cultivo/árvores; e à Costa por suave descida/vegetação litorânea e vista do mar.

**Comprovar:** capturas sem HUD de testes, sempre do mesmo ponto: da porta do lote da Morada; da praça olhando para cada uma das três saídas; e visão superior próxima da praça. Validar que a praça cabe no enquadramento usual do personagem, que três rumos são legíveis sem minimapa e que objetos não invadem espaço para a Morada crescer. A casa do aluno não deve ser substituída por casas do pacote.

## 3. Mapa e ritmo de exploração

**Preservar:** a estrela geográfica de seis cabeceiras, a centralidade da Faísca, os seis distritos aprovados, a rede de anel/atalhos e a concentração do cotidiano no sul da ilha. Os círculos A–F da captura são marcações de estudo, não limites rígidos de biomas. O Bosque das Lanternas a nordeste pode continuar como destino opcional mais distante.

**Ajustar (P0/P1):** o mapa revela enorme contraste entre o pequeno núcleo habitado e ramais muito longos até a costa; hoje há pontos e linhas, mas poucos indícios de atividade/descoberta fora do centro. Não aumentar a densidade por igual. No código `ROTAS_DA_FAISCA`, a rota `farol-bosque` contém um segmento aproximadamente de 202 m entre os pontos `(-30, 35)` e `(40, -155)` sem ponto de controle intermediário: é um convite a desenhar variações de contorno, vistas, microdestinos e retorno, não a preencher esse trecho com tarefas artificiais. O anel existe nos dados, mas não é facilmente identificado como circuito contínuo na apresentação cartográfica; conferir orientação dos ramais e visibilidade dos retornos.

**Intervenção proposta:** um percurso principal legível por distrito, com duas opções conectadas sempre que fizer sentido, e marcos de transição que se reconhecem visualmente. Na Vila: convívio e criação; Campos: cultivo, lago e experimentar; Costa: píer e maré; Pátio: oficina lacrada e mecanismos; Colina: Farol e mirantes; Bosque: lanternas, clareiras e descoberta noturna. É identidade de paisagem e leitura, não produção das atividades completas neste marco.

**Comprovar:** caminhada filmada pelo anel, demonstrando pontos de curiosidade e reencontro, não apenas linhas do mapa; mínimo de uma perspectiva diferenciável por distrito no blockout; mapa de densidade com trechos que têm interesse visual, áreas de contemplação e áreas reservadas. A orientação deve funcionar primeiro no mundo 3D e ser confirmada pelo mapa, não depender dele. Em 1,5 m/s, 40 m equivalem a ~27 s, e não aos 20 s do estudo baseado em deslocamento anterior.

## 4. Farol das Conexões

**Preservar:** o Farol como referência principal e receptáculo narrativo dos seis Núcleos; implantação no alto da colina suave; o modelo de teste `farol_01_pacote` com escala nativa (cerca de 24 m de altura), sem reduzir arbitrariamente por causa de um close. A presença dominante combina com a importância do Farol, desde que não reduza a Vila a antecâmara dele.

**Ajustar (P0):** a captura frontal próxima mostra a base muito escura, compartimentos como wireframes e extensão ampla de chão sem definição de chegada, patamar ou mirante. A leitura das seis posições não existe ainda como acabamento de mundo. A colina, vista de perto, não tem transição visual forte entre praça/caminho/edificação. Não decidir nova altura nem novo modelo antes de observar a silhueta completa.

**Vistas adicionais obrigatórias:** (A) Farol inteiro, câmera em três-quartos com avatar ao pé e margem superior livre; (B) aproximação a partir da praça, com Farol e moinho no mesmo campo; (C) vista lateral do caminho de subida mostrando inclinação, patamares e acesso; (D) uma vista à distância a partir do Bosque e outra da Costa, para medir leitura do marco; (E) vista superior da colina mostrando disposição e acesso aos seis compartimentos; preferível repetir A e B à noite.

**Comprovar:** não há recorte de topo por câmera no percurso normal, compartimentos com aproximação funcional ao alcance do avatar e espaço para animação do Núcleo, ao menos duas cabeceiras reconhecíveis de um mirante e marcos legíveis sem revelar o mapa inteiro.

## 5. Ponte curta dos Campos

**Preservar:** a peça real do Adventure Land, o ensaio de atravessar de sul a norte sem queda, a correção de altura do piso do GLB e a travessia integrada à circulação dos Campos. Não confundir esta passagem com a ponte oceânica Faísca–Bosque.

**Ajustar (P0):** a ponte rosa é um ponto visual forte, mas parece desconectada da borda do caminho e do lago. Margens muito geométricas, vegetação escassa e ausência de pontos de apoio/fundações tornam a peça um obstáculo solto em vez de parte de uma trilha. A cor magenta pode funcionar como acento lúdico, desde que haja uma razão de paleta na região; não a trocar automaticamente.

**Observação de implantação verificável:** a rota `ponte-lago` está marcada de `z=119` até `z=135` (16 m), enquanto `ponte_04_pacote` tem profundidade catalogada de cerca de **12,35 m** e está centrada em `z=127`. Isso equivale a aproximadamente 1,8 m em cada extremidade entre o nó da rota e a projeção do modelo, antes da consideração do terreno e colisores. Não demonstra buraco físico (o teste atravessou), mas merece inspeção visual e correção da conexão paisagística. Não reajustar o colisor da ponte por estética sem repetir os testes de travessia.

**Intervenção proposta:** definir pisadas claras da trilha até as tábuas, duas cabeceiras com solo e pedras de apoio, vegetação agrupada nas margens (gramíneas, juncos compatíveis, flores seletivas), variação de solo úmido e água rasa coerente com o lago. Assegurar que o trecho pareça acessível antes de o jogador pisar.

**Comprovar:** capturas das duas cabeceiras, visão lateral baixa que mostra o piso e a margem, travessia filmada a pé e correndo, colisões e câmera quando o avatar entra/sai do modelo, inclusive em toque.

## 6. Ritmo e animação do avatar

**Preservar como candidato de ensaio:** `explorar` = 1,5 m/s de caminhada e 3,4 m/s de corrida, escala 1, altura ~1,16 m; IK e cadência sincronizados à distância sem mudar ossos nem cápsula; `referencia` e `agil` como controles de comparação. O relatório mediu cerca de 7,8 s andando e 3,6 s correndo porta–praça, descontando posicionamento de teste e pausas. A estimativa de travessia oceânica (~68 s correndo em velocidade constante) merece outro desenho de experiência.

**Comprovar em vídeo:** trecho plano, subida e descida da colina, curva fechada, partida/parada bruscas, salto/aterrissagem, aproximação à ponte, relação movimento da câmera e passada, comparação com `?ritmo=referencia` e `?ritmo=agil`. Observar patinação de pé, contato com terreno inclinado, flutuação na transição para idle, cadência e aceleração visual. Testar alcance horizontal de salto na nova velocidade. A sensação de controle precisa de pessoas jogando; FPS e screenshots não aprovam IK.

**Ponto de consistência para conferir, não pressupor como bug:** o mapa do playground calcula tempos da tabela usando `CORPO.andar`, enquanto o ensaio permite alterar o perfil de ritmo. Conferir se o valor mostrado corresponde ao perfil ativo ou se é explicitamente rotulado como referência.

## 7. Próximo marco proposto — M3: Faísca habitável e legível

**Objetivo:** aprovar a linguagem visual e o prazer de circular por um percurso demonstrativo da Faísca, preservando a geografia e os sistemas testados. **Não** finalizar todos os distritos nem implementar a campanha.

### Escopo positivo

| Frente | Implementação limitada | Evidência e critério de aceite |
|---|---|---|
| P0 — Praça | Corrigir o encontro dos caminhos, compor o centro de convívio e distinguir visualmente 2–3 edifícios existentes por função, sem bloquear o lote da Morada | Comparativo antes/depois em câmeras idênticas; três saídas perceptíveis; centro reconhecido como vila |
| P0 — Colina/Farol | Base e caminho de aproximação com integração ao relevo; compartimentos ainda podem ser protótipos claramente identificados | Captura completa do Farol, vista da praça e da subida; proporção aprovada antes de acabamento caro |
| P0 — Campos/lago | Margens e entradas da ponte curtas, integração com trilha, organização de vegetação/solo | Travessia por ambos os lados sem salto inesperado e sem buracos visuais ou físicos |
| P1 — Gramática ambiental | Regras de borda de trilhas, agrupamento de vegetação, paleta de acentos, sombra e transição entre três ambientes-piloto | Um mini-guia visual replicável, não dezenas de modelos novos |
| P1 — Leitura dos caminhos | Marcos e microdestinos em dois percursos: praça–horta–ponte e praça–Pátio–Farol; identificar trechos exteriores ainda vazios | Vídeo contínuo com retorno e escolha, mapa anotado de interesses e lacunas |
| P1 — Íris | Evoluir a coelha já existente: figurino de jardineira, lanterninha, pequenas ações de cultivar/oficina e conversa com enquadramento existente | Modelo e animações em movimento e conversa curta; sem criar outro motor NPC |
| P1 — Ritmo/IK | Comparar perfil de exploração com os demais, sem fixar velocidade final até teste | Capturas de vídeo e avaliação de caminhada, corrida, curva, salto e colina |
| P1 — Robustez | Repetir as verificações já existentes após cada alteração no terreno/ponte, comparar contadores e executar teste físico inicial | Sem regressão de colisão, retomada, câmera e render; números físicos documentados |

### Fora do escopo neste marco

- Substituir Rapier, controlador, setores/LOD, avatar, renderer, UI adulta/Kids ou contratos da plataforma.
- Gerar uma ilha totalmente nova, refazer sete ilhas ou promover o novo `/macro` à plataforma.
- Integrar Morada, Jornada, Missão do Núcleo, progressão das pontes ou salvamento de conta (permanecem futuros marcos próprios).
- Produzir agora toda a população, todos os minijogos, decoração final dos seis distritos, a ponte oceânica definitiva ou cinematics da campanha.
- Usar uma cena demonstrativa inteira dos packs como substituta da Faísca desenhada para este jogo.

### Ordem de execução e gates

**Gate 1 — Aprovação das intenções artísticas.** Produzir um mapa de composição em cima da geografia vigente e uma folha de referência com vistas da praça, da ponte e do Farol. Marcar funções visuais, volumes e vazios. Nada novo de grande porte entra antes de validar esse desenho.

**Gate 2 — Primeira passada jogável.** Implantar pequeno conjunto de mudanças nas três áreas-piloto com os modelos já disponíveis. Registrar as mesmas câmeras antes/depois, inclusive noite, evitando que melhoria de fotografia esconda problema de circulação.

**Gate 3 — Prova de movimento.** Entregar gravações do avatar, da ponte e de uma conversa com a Íris. Não declarar o IK aprovado por screenshot. Medir caminhos reais e comparar os perfis de ritmo.

**Gate 4 — Aceite de experiência.** Em teste acompanhado, observar se participantes da faixa 9–14 anos reconhecem o centro, enxergam três escolhas e exploram voluntariamente; observar inclusive quem não segue a missão. **Proposta de meta inicial, a calibrar:** ao menos 4 de 5 participantes conseguem identificar dois caminhos e um motivo de visitar cada um sem depender do mapa. Não confundir a meta com resultado já observado.

### Entregáveis para apresentação do M3

1. `/macro` revisado somente nos trechos-piloto, sem perder as verificações anteriores.
2. Comparativo de capturas padronizadas, com HUD técnico oculto, e uma vista inteira do Farol.
3. Vídeos curtos de 20–40 s para a circulação e animação com IK.
4. Mapa de composição que diferencia rotas principais, atalhos, pontos de curiosidade e áreas ainda provisórias.
5. Matriz de modelos reutilizados, acrescidos e ainda faltantes; orçamento de recursos no desktop e, quando disponível, em dispositivos físicos.
6. Relatório de aceite específico: aprovado, ajustar ou ainda não testado — sem declarar direção de arte final antes da avaliação humana.

## 8. Restrições de produção que continuam aprovadas

- **Narrativa:** *O Livro Dourado e as Seis Conexões*, sete ilhas com Faísca central e seis cabeceiras. O posto desbloqueia a Missão do Núcleo; **apenas o Núcleo instalado no Farol reconstrói a ponte**.
- **Personagens:** humano jogável do Cute Characters em escala nativa; moradores criaturas fantásticas e animais dos pacotes; Íris sobre o pipeline de coelha e NPC já existente.
- **Preservação:** não perder Morada, conta, avatar, projetos, inventário ou progresso no processo; nada disso foi migrado no ensaio.
- **Identidade visual:** preservar a interface Kids e adulta, usando painel técnico somente como ferramenta de QA.
- **Licenças:** os arquivos originais da arte privada não são publicados como assets soltos; o Repositório `artes-3d` diferencia Adventure Land comprado e Reino próprio sobre sua base.

## Referências verificadas

- [Relatório atualizado e capturas, staging](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico.md)
- [Praça](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico/praca-dia.png) · [Mapa](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico/mapa.png) · [Farol](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico/farol.png) · [Ponte dos Campos](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico/ponte-campos.png)
- [Layout e rotas](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/faisca.ts) · [Composição da arte](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/composicao-faisca.ts) · [Ritmos](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/ritmo-da-aventura.ts) · [Mapa do playground](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/playground/faisca-mapa.tsx)
