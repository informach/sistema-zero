# Faísca V2: equipamentos de exploração e qualidade artística

Orientações incorporadas em 15/11/2026 durante a execução do Gate 2. Complementam o [desenho M3](./2026-11-15-faisca-m3-composicao-design.md) e o [plano de execução](../superpowers/plans/2026-11-15-faisca-m3-gate2.md). A prioridade é a qualidade da pequena região piloto, antes de expandir a decoração.

## Ordem de trabalho

1. Concluir a primeira passada ambiental da praça e três saídas, horta, ponte, Pátio e chegada ao Farol, com comparativos e testes.
2. Estudar e prototipar equipamentos em recorte de ensaio separado: descoberta opcional dos patins e mochila visual. Os equipamentos não concedem aceite ao cenário nem bloqueiam indefinidamente a composição.
3. Avaliar o conjunto em movimento. Só então estender a linguagem aos outros distritos ou integrar progresso de conta.

Conferir `staging` local, alterações pendentes e contratos antes de cada recorte. Preservar a macrogeografia, os seis distritos/cabeceiras, os 520 m, setores/LOD, Rapier, controlador, câmera, toque, salvamento e interfaces Kids/adulta. Manter porta–praça ~13 m, praça–horta ~20 m e praça–Pátio ~25 m. O mapa já usa o ritmo ativo.

## Patins: descoberta livre

Usar **`patins`**, o identificador existente de inventário, `temPatins`/`comPatins`, a ação `calcarPatins`, o modo/clip `patinar`, a peça `calcado_patins` e `RodasDosPatins`. Não criar outro inventário, controlador ou recompensa obrigatória.

Arquivos conferidos em `packages/arquipelago`:

- `src/sistemas/patins.ts`: guarda de posse e recebimento idempotente, multiplicador 1,3.
- `src/sistemas/movimento.ts`: `PERFIS.patins`, aceleração 8 m/s² e freio 5 m/s².
- `src/sistemas/modos/chao.ts`: aplica perfil de movimento e velocidade apenas quando apropriado; preserva embalo do salto e tratamento de água.
- `src/personagem/personagem.tsx` e `avatar-do-jogo.tsx`: equipamento calçado, elevação das rodas, animação e estado de movimento existentes.
- `src/interface/hud.tsx`: equipar/desequipar pelo item real da mochila.
- `src/sistemas/segredos.ts`: segredo de patins no Bosque. Não reutilizar nem reordenar seus bits.
- `tests/patins.test.ts`: comportamento de movimento e recompensa antiga da Vila Doce.

O esconderijo deve nascer do desenho dos Campos, perto da Ponte do Lago: pequeno desvio opcional, com acesso a pé e uma paisagem que recompense a curiosidade. Avaliar a borda de árvores/pedras próxima à ponte, sem ocupar cabeceiras nem exigir salto ou patins para alcançar os próprios patins. A posição final depende da passagem do avatar e do enquadramento normal; não fixar coordenadas apenas pela facilidade de programar.

Pistas podem ser marcas discretas de rodas e, quando o Nico for integrado à narrativa, um comentário dele. Sem missão obrigatória, posto mínimo ou cronômetro. Nenhum percurso principal pode depender de possuir patins.

No `/macro`, descoberta e posse ficam no estado local do ensaio, espelhadas no inventário existente da loja do jogo para experimentar os sistemas reais. Reabrir a descoberta não duplica o item. Não enviar prêmio, conquista, jornada ou moeda para a plataforma. A ação de calçar continua transitória, respeitando o contrato atual de abrir descalço.

### Velocidade e segurança do movimento

Com o perfil Exploração, 1,3× produz **1,95 m/s andando e 4,42 m/s correndo**, antes dos modificadores já existentes. Esse é o ponto de partida. Não alterar definitivamente `RAPIDEZ_DOS_PATINS` nem os números da plataforma.

Uma alternativa de 5–5,5 m/s só entra como perfil experimental explícito do laboratório, mantendo caminhada e corrida distinguíveis e usando aceleração/freio reais. A referência atual de 4,42 m/s, com aceleração 8 e freio 5, implica aproximadamente 0,55 s para atingir a corrida e 0,88 s para parar em condições ideais, com cerca de 1,95 m de frenagem. A 5,5 m/s, mantendo esses valores, a parada levaria 1,1 s e cerca de 3,03 m. São estimativas de projeto, não testes observados.

Registrar partida, frenagem sem entrada, inversão de direção, curva fechada, subida/descida, passagem estreita, salto/aterrissagem, água e toque. Conferir a câmera, clipe, giro das rodas e alcance de salto. Considerar travessias longas e oceânicas, sem transformar os patins em solução obrigatória para distâncias mal desenhadas.

### Recompensa antiga e conta

O V1 continua dando patins pela entrega dos telhados da Vila Doce. Revisar esse ponto somente na integração aprovada da nova campanha. Não inventar automaticamente um prêmio substituto. Preservar posse, conquistas e o identificador; quem já tem o item não deve receber duplicata ou perder o que conquistou. Não confundir essa preservação com migrar coordenadas do mundo antigo, que continua fora do escopo.

## Mochila: acessório visual do inventário

Na exploração, a mochila deve aparecer por padrão, pequena, com aparência de explorador e coerente com Cute Characters. Não representa fisicamente cada item armazenado e não cria outra carteira, inventário ou posse comercial obrigatória.

### Achados concretos do catálogo

Existe a peça **`costas_bolsa_saco`**, “Bolsinha de saco”, com 1.930 triângulos, no catálogo atual. Origem registrada: commit de arte `7124870145d61244ac08b982532dbe0d9497983e`; arquivo preparado `pecas/costas_bolsa_saco.3b671829a8ed.glb`. É candidata a avaliação, não mochila aprovada. Nenhum modelo novo precisa ser solicitado antes de examinar essa candidata.

O esqueleto tem encaixe **`costas` no `Spine1`**. Contudo, a bolsinha é hoje uma peça do slot de roupa `costas`, assim como `costas_capa_cavaleiro`. Forçar esse slot por padrão substituiria a capa escolhida e violaria a personalização. O contrato `equipment` do rig já existe para objetos de jogo; sua capacidade de receber esta peça e coexistir com roupas deve ser aferida antes de uma extensão. Não mover silenciosamente a peça entre categorias nem alterar o catálogo global para fazer o teste passar.

**Atualização de contrato na mesma `staging`:** os commits paralelos `870bd98f3` e `63c96dcb6` acrescentaram situações de peças nas costas, `offIn`, `armLayers`, `situationFor` e `src/personagem/costas.ts` (`vestirAsCostas`). Já há tratamento do planador dobrado junto à mochila/capa, cabelo comprido, casaco, sono e assento. O próximo protótipo deve partir desse pipeline atual, incluindo o planador na matriz de combinações. Essa entrega não torna a mochila padrão nem resolve por si a coexistência universal entre mochila e capa; não criar regras paralelas para o que esse contrato já cobre.

### Protótipo e decisão de arte

- Inspecionar o GLB candidato: peso/rigidez, pivô, dimensões, pontos de fixação, folga das alças e silhueta.
- Testar sobre as roupas e movimentos reais, sem alterar o tamanho do corpo ou da roupa.
- Comparar camiseta/calça, vestido, casaco, fantasia volumosa, cabelo longo e capa. Observar frente, costas, três-quartos e perfil.
- Conferir caminhada, corrida, patins, salto, curvas, subida/descida, conversa e ações que dobram o tronco.
- Nado, sono e outras ações podem ocultar temporariamente o desenho quando houver interseção; ocultar não remove conteúdo do inventário. As regras devem ser previsíveis e documentadas.
- Se a candidata não funcionar como acessório universal, registrar a evidência e solicitar uma mochila pequena de explorador, compatível com `Spine1`/encaixe de costas e com a matriz de roupas. Essa é uma dependência de arte precisa; não substituir por uma mochila escolar ou um volume inferior apenas para concluir a tarefa.

A mochila visual deve coexistir com a personalização. “Sem clipping” não pode ser declarado só porque a bolsa foi testada no avatar padrão ou porque a capa foi removida.

## Qualidade ambiental obrigatória

### Contato, pivô e apoio

Conferir bases reais dos GLBs, dimensões, rotação e área de contato. Usar a malha física como referência onde aplicável, e não apenas a altura do pivô. Construções em encostas precisam de fundação/acesso coerentes; troncos devem nascer do chão; cercas devem acompanhar o terreno e deixar passagens; a ponte precisa se apoiar nas margens. Montagens compostas, como moinho e pás, devem compartilhar referência de apoio.

Não deslocar objetos em Y para uma câmera específica. Conferir diferentes ângulos e enquadramento normal do personagem de ~1,16 m. Uma fundação calculada também precisa de revisão artística: um pedestal que elimina um vão, mas cria um acesso incoerente, ainda requer ajuste.

### Profundidade e acabamento do chão

Investigar superfícies duplicadas, interseções e precisão do depth buffer. Para os caminhos do Gate 2, a causa técnica encontrada foi usar faces sobre o terreno seguindo a função contínua, enquanto o chão físico/renderizado usa triângulos de uma grade de 4 m. O acabamento deve pertencer ao material do próprio terreno, eliminando essa segunda superfície. Sobreposições dos desenhos de caminhos podem ser compostas na textura; não devem virar disputa entre planos 3D.

Não declarar z-fighting resolvido por números isolados ou por uma imagem. Percorrer os trechos e mover a câmera, incluindo dia/noite, subida e cabeceiras.

### Linguagem dos lugares

- Praça: centro de convívio, poço, Quadro e descanso fora do eixo visual; três saídas legíveis.
- Campos: cultivo, calma, agrupamentos assimétricos e margem de lago integrada.
- Pátio: uso interrompido, ferramentas/projetos e lacre do Croakus; não parece restaurado.
- Farol: silhueta inteira, subida, patamar e relação com a colina; seis lugares ainda podem ser estudos.
- Costa: início da descida reconhecível agora; distrito completo e Bosque recebem acabamento nos marcos próprios.

Larguras de 2,4–2,8 m são referências, não obrigação cega. Curvas e bifurcações devem ser intencionais, com bordas orgânicas, leitura de destino e passagem dos moradores. Preservar respiros e paisagens abertas. Cada objeto deve servir a função, orientação, narrativa ou descoberta; quantidade não é critério de qualidade.

## Matriz de aceite dos próximos recortes

- [ ] Bases e apoios convincentes de vários ângulos, com colisão consistente.
- [ ] Sem z-fighting perceptível em caminhada e giro de câmera.
- [ ] Caminhos, encontros e cabeceiras visual e fisicamente contínuos.
- [ ] Construções com escala, função e acessos coerentes; vegetação com intenção.
- [ ] Praça habitada, três escolhas e Farol inteiro; lote da Morada livre, inclusive das copas.
- [ ] Avatar, câmera, toque, colisão, retomada e carregamento sem regressões.
- [ ] Mochila coexistindo com roupas representativas e sem clipping perceptível em movimento.
- [ ] Patins descobertos opcionalmente, sem duplicata, equipando/desequipando e animando no sistema existente.
- [ ] Comparativos diurnos/noturnos nas mesmas câmeras e vídeos de movimentos/patins.
- [ ] Recursos do renderer monitorados; desempenho físico e testes com crianças identificados como não testados até sua realização.

Cada entrega deve informar o que foi implementado, corrigido, provisório e dependente de arte ou aceite. O cenário só recebe aprovação artística por avaliação humana; os testes técnicos e os equipamentos não substituem esse aceite.
