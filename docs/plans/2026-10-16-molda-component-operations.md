# Operações de componentes do Molda

Implementar o escopo já solicitado nos prints e na spec local, usando o painel compacto e os tokens da plataforma. A faca principal continua como definido pelo usuário; Separar peça preserva o corte de volumes.

- Espelhar: copiar ou refletir a seleção nos eixos locais, centro capturado ao abrir, orientação e UV por canto preservados. O modo contínuo persiste plano e pares fonte/resultado; edições passam pela fronteira `editSceneMesh` e regeneram o resultado na mesma transação. Parar mantém a geometria atual. Seleções do resultado resolvem para a fonte.
- Duplicar: copiar vértices compartilhados uma vez, preservar conexões internas e pintura, deslocar numericamente ou pelo manipulador Mover; aplicar cópia e movimento juntos. Sobreposição exata não pode ser confirmada.
- Fechar buraco: seleção temporária de linhas, um contorno simples e plano, orientação contrária às bordas vizinhas e UV planar. Materiais adjacentes diferentes exigem escolha.
- Em volta: percorrer uma faixa orientada de quadriláteros, 1–16 cortes, distribuição uniforme com deslocamento do conjunto e prévia. Bloquear trajetos incompatíveis.

Prévias derivadas ficam fora do documento salvo e do histórico. Aplicar cria uma entrada; cancelar restaura seleção. Operações validam referências, dimensões e orçamentos antes de publicar. Geometria compartilhada usa copy-on-write.

A relação de simetria é um campo opcional da malha nativa, com versão própria e parser estrito. Documentos sem relação mantêm o formato e a geometria atuais. A malha inclui o resultado avaliado, para que os exportadores existentes produzam ambos os lados. Leitores antigos recusam o campo desconhecido em vez de descartá-lo silenciosamente.

Verificar invariantes geométricas, serialização, histórico, cancelamento, edição de geometria compartilhada e fluxo real no Chromium. Conferir acessibilidade, tipos, lint e build.
