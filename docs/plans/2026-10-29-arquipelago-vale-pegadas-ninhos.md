# Pegadas, escavação e ninhos do Vale (fase4-02)

## Decisões propostas

- Reaproveitar as elipses e a malha instanciada do Bosque, acrescentando a pegada de três dedos
  que já aparece na arte do Vale. Não identificar uma espécie: o modelo não a informa.
- O rastro liga `chegada` à área de `escavacao`. A busca de caminho existente contorna os
  colisores, inclusive a cerca, pela abertura. A posição de escavar é o ponto livre mais perto
  da âncora, dentro da área cercada, sem sobrepor o esqueleto. A grade dos testes confere isso.
- Escavar em três ações de E/Usar, sem prazo: tirar areia, limpar com o pincel e observar.
  Usar o nó `osso` de `vale-dos-dinos-props.glb`, já existente. Ele aparece parcialmente e
  depois inteiro, sem animação obrigatória nem ferramenta nova. O osso miúdo não colide,
  seguindo a regra das peças pequenas no chão. Os fósseis do cenário continuam intactos.
- Cuidar dos ninhos significa observar os ovos sem tocar e depois dar espaço, afastando-se.
  Não criar predadores, cercas novas, risco aos ovos ou perda de progresso. A conclusão dá
  uma fala curta do Zappy e fica no diário; Jade reconhece os três ninhos cuidados.
- O rastro tem três pontos de conferência em ordem. A escavação não exige seguir cada marca:
  a criança pode explorar livremente e voltar ao rastro. Não associar a pegada à espécie do osso.
- V12: `vale` guarda pegadas seguidas, etapa de escavação (0 a 3) e os ids dos ninhos cuidados.
  Migrar da V11 sem apagar nada, mantendo todas as versões antigas estritas. Não usar chaves
  artificiais de inventário, amizade ou moedas para guardar progresso.
- Medidas de interação propostas: alcance 2,2 m (como Jade), afastamento de 3 m para dar
  espaço ao ninho, tolerância de 1,3 m nos pontos do rastro. São parâmetros da brincadeira,
  não medidas biológicas. Sem avanço com pausa ou sessão somente leitura.
- Filhote, nascimento, museu, amizade, recompensas financeiras e página da Íris ficam fora.

## Etapas

- [x] Ler regras, integração do Vale, pegadas, diário, V11 e os nós reais dos GLBs.
- [x] Generalizar o rastro sem mudar os valores do Bosque e provar o caminho e os acessos.
- [x] Implementar V12, migrações, regras puras e testes de idempotência e pausa.
- [x] Integrar escavação, ninhos, reconhecimento da Jade e coleção no diário.
- [x] Ampliar o navegador para computador e celular, incluindo pausa e progresso reaberto.
- [x] Atualizar documentação, revisar tudo e validar os commits para envio no staging.

## Pedidos de arte

Nenhum pedido de arte necessário após a conferência geométrica e no navegador. O nó `osso` existe separado no GLB de props. Os ninhos e ovos podem
permanecer no cenário, pois o cuidado não precisa mover essas malhas. Não haverá alteração
de GLBs nem de geradores. Se a verificação geométrica impedir o reaproveitamento, registrar
aqui o pedido exato e suspender apenas a parte afetada.


## Conferência e revisão

- O caminho considera também o Quadro das Cores, cujo colisor não está no GLB da ilha.
  Suas medidas foram extraídas para um módulo compartilhado com o desenho do cavalete.
- Os colisores preparados já chegam girados. A busca volta ao referencial das âncoras antes
  de construir a grade. O teste compara o GLB local com a ilha girada usada no jogo.
- A passagem entre cerca e costelas pede grade de 12,5 cm e conferência dos segmentos,
  com 3 cm de folga além do raio do corpo. Não foi alterada a colisão nem a arte.
- A revisão visual corrigiu a coluna do ícone no diário. O roteiro de navegador confere
  a largura do texto para detectar essa regressão em computador e celular.
- A V12 passa pela rota HTTP e preserva o Recife. As fixtures antigas da API também foram
  atualizadas, sem alterar o serviço nem gravar em banco. Conquistas de duas sessões têm
  união explícita, sem somar inventário.
