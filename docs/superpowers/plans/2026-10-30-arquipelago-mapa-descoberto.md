# L10: mapa das ilhas visitadas

Base conferida: `6461f19c0`, staging local e remoto iguais. Este recorte não encerra L10.

## Decisões

- A jornada continua decidindo acesso. Visitar não concede posto, bloco, moeda ou passagem.
- Separar no mapa três estados: fechada, aberta para explorar e visitada. O texto acessível
  explica o mesmo que o desenho; a cor não é o único sinal.
- V18 acrescenta `ilhasVisitadas`, inteiro de 0 a 255. A ordem dos oito bits fica explícita
  e imutável no contrato. V17 e anteriores continuam estritas e migram com zero visitas:
  posição salva, ponte vista e posto não provam que alguém chegou a uma ilha.
- Registrar presença apoiada no chão, com a ilha completa montada, dentro de 12 m do centro
  do anel e acima do nível da terra. Na ilha central, usar o gramado de 24 m; no Farol,
  4 m da torre, apenas depois de abrir na jornada. Esses limites ficam afastados do meio
  das pontes e não contam uma passagem de barco, balão ou nado. O mapa antigo usava apenas
  a ilha mais próxima, o que não basta como prova de visita.
- Pausa, visita à casa alheia, suporte somente leitura, chão carregando e conflito não
  registram descoberta. Não alocar nem gravar por quadro depois de marcar uma ilha.
- Conflitos juntam os bits das duas sessões, sem somar mochila ou inventar progresso.
- API usa o contrato central para migrar JSON. Não precisa de coluna nem migração SQL.
  Testar gravação, reabertura, CAS e recusa de documento acima de 64 KB.

## Etapas

- [x] V18 e migração preservando V1 a V17; limite com cenário cheio e todas as visitas.
- [x] Regra pura de descoberta, integração ao ciclo das ilhas e conciliação.
- [x] Mapa responsivo distinguindo acesso e visita; navegador com persistência e negativos.
- [x] Testes de contrato, jogo e API, tipagem e lint; revisão do diff e documentação.

Provas locais em `docs/qa/2026-10-30-mapa-descoberto/README.md`. Sem implantação ou escrita
remota. O caso cheio com 30 itens a 999 e todas as visitas mede 63.076 bytes, margem de 2.460.

## Restante de L10 e pedidos de arte

A rede ampliada do barco e o fantasma familiar continuam separados. A leitura dos GLBs atuais
encontrou `cais` e `barco` no Recife, mas não encontrou essas âncoras no Bosque, Vila Doce ou
Nuvens, Pico e Vale. Antes de adicionar portos, medir a rota e pedir pontos de embarque na linha d'água,
com saída a pé e colisores do deque, fora das pontes e boias. Não criar cais invisível nem
regenerar arte nesta sessão. Todos os seis GLBs foram lidos, sem alterá-los.

Pedido para Blender, antes da ampliação das rotas: em cada uma dessas cinco ilhas, adicionar
`barco` na linha d'água, `cais` no tampo onde o corpo desembarca e colisores `col-cais-*` com
conexão caminhável ao terreno. Posição candidata no referencial do modelo: lado de fora,
em torno de `x=-20, z=0`, oposto à chegada da ponte em `x=11,5..11,6`. Essa posição é proposta,
não uma medição de deque existente: precisa evitar árvore/caverna/escavação e a roda de nado.
Nas Nuvens, o cais aquático em `y=0` precisa de uma ligação segura ao terreno em `y=8`,
ou uma decisão de transporte diferente. Não tratar a chegada da ponte como cais.
