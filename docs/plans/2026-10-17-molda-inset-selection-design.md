# Inset da seleção no Molda

## Resultado solicitado

Em Editar malha > Faces > Criar borda, uma seleção conectada no mesmo plano ganha uma única borda externa. Na tampa triangulada de uma roda, os triângulos internos continuam unidos e selecionados, prontos para Puxar. A porcentagem, a prévia, Cancelar e Aplicar continuam no fluxo existente. O usuário autorizou a implementação com o print da roda.

## Decisões

Usar o contorno de cada região plana selecionada, mantendo suas faces internas, em vez de executar um inset em cada triângulo ou juntar as faces permanentemente. Faces em planos distintos e regiões desconectadas são processadas separadamente. Uma transformação proporcional ao centro do contorno mantém o significado da porcentagem e o resultado atual para uma face isolada.

Os pontos do contorno recebem cópias compartilhadas por todas as faces internas. Pontos internos exclusivos da região mantêm sua identidade. As faixas externas herdam o material e as coordenadas UV da superfície. A geometria original permanece imutável. Contornos ramificados, buracos, concavidade e pintura incompatível são recusados com uma explicação, sem conversão silenciosa ou perda de dados.

O Puxar também reutiliza os pontos internos exclusivos, evitando deixar o centro antigo da tampa como um ponto solto. A operação de espessura mantém explicitamente os pontos da base, porque cria faces inferiores que ainda dependem deles.

## Verificação

Cobrir uma tampa de oito triângulos com exatamente oito novas faces de borda, conexões internas compartilhadas, topologia fechada, UV contínuo, múltiplas regiões, seleção parcial e entradas inválidas. Verificar a prévia, cancelamento, aplicação, seleção mantida, Puxar subsequente e desfazer pelo navegador. Executar a mesma operação no worker real, typecheck, Biome e build do playground.
