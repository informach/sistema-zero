# Puxar linhas e pontos no Molda

Pedido: disponibilizar Puxar para linhas e pontos, seguindo os controles e tokens existentes.

- Linhas: copiar os pontos escolhidos uma única vez e ligar cada linha à sua cópia com uma face. Preservar faces, pontos, UV e materiais existentes. Selecionar as novas linhas para permitir extrusões consecutivas.
- Pontos: criar cópias ligadas aos originais por linhas soltas. Selecionar os novos pontos. Não inventar faces a partir de pontos isolados.
- Movimento: usar as alças de Mover e campos Puxar X/Y/Z. Validar distâncias finitas e evitar faces degeneradas quando o movimento é paralelo à linha.
- Prévia: reutilizar a sessão de operações de malha, seus IDs estáveis, cancelamento e validação de revisão. Aplicar registra uma única etapa de histórico; Cancelar preserva o documento. Acesso segue model.mesh, como Puxar faces.
- Faces: manter a extrusão atual pela normal da superfície.

Atualização solicitada: Puxar faces também disponibiliza as alças de Mover. O arrasto desloca a tampa e cria as laterais na mesma prévia, sem mover a peça inteira. O campo Quanto puxar acompanha o deslocamento; sua edição numérica mantém a extrusão pela normal. Soltar a alça mantém o resultado em prévia, Aplicar confirma um passo de histórico e Cancelar restaura a malha. Deslocamentos das alças também passam pelo worker de superfícies nas malhas grandes, com o mesmo controle de revisão e descarte de respostas antigas.

Implementação: adicionar operação pura de extrusão de componentes; integrar à sessão de operações e seleção contextual; apresentar Puxar nos modos Linhas/Pontos; verificar topologia, continuidade, prévia/cancelamento, histórico e interação real no playground.
