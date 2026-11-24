# Fábrica regional interna — 22/11/2026

Base `af9628306`. A fábrica existente de persistência agora recebe a política
de formato, mantendo a seleção pública nativa 0–7/físico 1–2. O opt-in privado
`localRegionPersistence.ts` escolhe autoridade 8, físico 3 e quota regional.
Não há outro editor, banco paralelo ou mecanismo duplicado de recuperação.

## Implementação e revisão

Namespace capturado, FIFO por banco, assinatura de origem em RAM, eventos,
paletas, CAS, cópias e lápides continuam no mecanismo existente. O tipo de
persistência e o erro com as cópias aceitam o documento regional; seus defaults
públicos continuam legados. O carimbo regional é validado sem substituir a
origem causal da edição. Uma listagem posterior não autoriza RAM antiga.

O cache incremental de sprites/RLE pertence somente à política legada. A
política regional mede a galeria autoritativa inteira na transação e nunca
semeia esse cache com mapas 8 ou com espelhos compactos. A gravação de uma
célula regional produz três puts: cabeçalho, chunk alterado e referência compacta.
Os buffers intactos não são regravados. A abertura ainda reconstrói o documento
completo; não é leitura sob demanda ou qualificação de latência global.

A revisão verificou conflito após outra aba salvar e depois de uma listagem,
falha no segundo put, ausência de eventos/avanço causal no abort, retry e edição
continuada da cópia. Inclui exclusão com a base exibida, lápide, recuperação de
save atrasado, troca de perfil durante o lote, arte legada misturada, consumidor
futuro opaco e recusa pelo leitor público atual. O original permanece intacto.

Quota real: cinco mapas no teto de chunks cabem; o sexto ultrapassa o orçamento
portátil. A fábrica recusa sem alterar o banco ou anunciar recuperação. Excluir
um mapa confirmado permite gravar o sexto, conservando os mesmos limites.

## Evidências

- Suíte completa: **2.721 aprovados, zero falhas/omissões**, 35.316 asserções,
  250 arquivos, 186,99 s; inclui três controles Pygame reais com vídeo `dummy`.
- Focados finais: **55 aprovados**, 217 asserções, cinco arquivos.
- Chromium: **47 aprovados sem retry**, desktop e CPU 4× emulada. Quatro casos
  novos usam a fábrica e IndexedDB reais, incluindo duas páginas, fechamento,
  reabertura e falha transacional. Os 43 controles anteriores foram mantidos.
  Os quatro novos passaram novamente após as guardas de tipo dos testes.
- Oito testes da fronteira do host (17 asserções, três arquivos), incluindo
  os realms isolados de autoridade local e Pinta–Estúdio, passaram. Tipos
  completos de Pinta/Estúdio, lint dos sete arquivos e whitespace aprovados.
- Os 12 percursos locais Pinta → Estúdio passaram novamente sem retry,
  incluindo criação/atualização JavaScript e Python, portas e rollback.
  Somados à matriz física, são 59 ensaios; os quatro repetidos são identificados
  separadamente. Isso verifica os formatos públicos atuais, não executa cena 4.

A primeira checagem de tipos após os testes novos identificou guards ausentes
nas fixtures: distinguir mapa denso/regional e exigir a cópia recuperada. Não
houve alteração no código funcional após a suíte completa; repetiram-se os
focados e os quatro ensaios afetados. Os logs de falha de tipos são conservados
separadamente, sem tratá-los como regressão de produto reproduzida.

Sem mudança visual, 3D, implantação, login ou teste em outro aparelho físico.
A fábrica não está no barril público nem selecionada pelo host. Inventário
parcial da nuvem, galeria/host 8, captura/transporte, adaptadores e rollout
continuam pendentes. Contratos públicos: nativo 7, físico 2, cena 3/PNG 4,
nuvem 6. Este lote não encerra a etapa macro 1 nem a missão completa.
