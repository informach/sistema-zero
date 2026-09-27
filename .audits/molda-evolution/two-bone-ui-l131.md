# Dobrar pela ponta na oficina, lote 131

Seção contextual no inspetor de animação para uma ponta com dois ancestrais
diretos. Mostra os nomes reais de começo, dobra e ponta, passos por eixo em mundo,
destino exato e indicação opcional de dobra. A pose usa a sessão existente e só é
gravada por confirmação explícita, mesmo com autokey ativado.

O desenho segue a skill interface-design: vocabulário de oficina, controles de
44 px, tokens mld e revelação progressiva no próprio inspetor. Não cria tema,
modal ou segundo canal de prévia. Campos de coordenadas compartilham um componente
controlado; valores incompletos permanecem strings, sem arredondar coordenadas.

## Revisão

- `reset` retira a pose pendente, restaura o desenho original e desabilita gravar,
  preservando a preparação. `isCurrent` permite reutilizar a entrada capturada.
  Campos não deixam gravar valores diferentes dos exibidos; erros não viram zero.
- O hook contém o ciclo de vida por documento, clipe, tempo e cadeia. Desconectar
  cancela só sua entrada. Métodos antigos não cancelam, reiniciam ou gravam outra
  prévia após troca de contexto. Reentrância durante reset é testada.
- Campo incompleto, passo abaixo da precisão, alcance excedido, indicação de
  dobra, cadeia degenerada e descendente travado têm cobertura. A trava considera
  toda a subárvore movida, não apenas os três apoios.
- Fechar, Escape dentro do campo (com retorno de foco), reselecionar, mudar tempo,
  blur, página oculta, perda de contexto, miniatura e desmontagem não gravam.
- O teste inicialmente usava Próximo em um clipe sem outra chave, portanto o botão
  estava desabilitado. Foi corrigido para mover o cursor real da timeline. Outra
  expectativa foi corrigida: alinhar apoios não obriga fallback de eixo quando a
  direção até o destino permite usar o lado da pose original.

Sete testes novos: quatro na oficina real com somente a porta GPU substituída,
dois na sessão e um no hook em StrictMode. Vinte invalidações/amostras passam com
um getter que recusa qualquer reindexação de geometria. Os passos não atualizam
documento nem histórico; confirmar dá um undo/redo e matrizes idênticas ao playback.

Integral: **1.604 testes, zero falhas, 236 arquivos, 89,31 s**. Tipos e Biome/705
passaram. Vite: 1,23 s; inspetor lazy 14,01 kB, Three 579,29 kB mantém aviso >500 kB.
Kids: compilação/5,9 s, tipos/10,9 s, 59 páginas/9,9 s, exit 0. Diff check passou.

Limitações: controles são passos/campos, sem alvo arrastável 3D. Alcance é medido
no referencial do pai do começo; escala afim pode mudar a métrica em mundo. Não há
limites persistidos de juntas nem bake nesta entrega. Backend autorizado de
browser indisponível: não homologado visualmente, em GPU, toque ou com crianças.
Formato público 1 e ativação pública permanecem inalterados.
