# Lote 8.4 — Commit atômico da importação JavaScript

19/11/2026, continuação de `4b6f5e63d`. **Recorte do store; a galeria, Python e a importação completa no produto continuam pendentes.**

O store existente oferece `importScene3DBundle`. Ele captura o plano antes dos awaits, confere o hash da base e o lifetime de perfil/projeto/acesso, reconstitui o pacote pelos assets e refaz o preparo. O orçamento serializado não autoriza a gravação: bytes, vínculos, IDs e orçamento são conferidos novamente. O resultado inteiro entra por uma única atualização do store. Arquivos da pessoa e demais campos do projeto permanecem no mesmo projeto.

Um projeto editado, plano adulterado, cancelamento ou perfil trocado recusa o commit sem gravação parcial. A troca A → B → A também invalida a operação. O hash recalculado detecta mudança de conteúdo mesmo quando a referência do objeto não muda. Reimportação idêntica não cria revisão, não emite atualização e não marca o projeto como sujo.

## Fronteira e custo de carregamento

O primeiro build com a ação revelou uma regressão real: o modo Blocos passou de **4.721.614 para 4.846.519 bytes**, acima do teto de 4.750.000. O comparativo foi feito em memória, carregando a fonte commitada do store como controle; nenhum arquivo de trabalho foi revertido para medir. O índice completo do compilador trazia código de autoria e mais exports do Three para chunks comuns.

O motor agora expõe `@sistemazero/molda-cenarios-motor/conteudo`, limitado ao preflight/inspetor CPU existentes. Validação e preparo no Estúdio usam essa entrada, com exports específicos. A junção continua sendo uma opção real do compilador na fonte Molda: a biblioteca entrega o pacote agrupado ao preparo. O Estúdio não importa o compilador de geometria para oferecer essa opção, nem mantém uma segunda implementação.

Após a correção, Blocos ficou em **4.723.054 bytes, gzip 1.264.389, 17 arquivos**. A diferença para o controle é 1.440 bytes. A lista inicial ficou em **361.235 bytes, gzip 117.136, dois arquivos**. Ponte e Código também passaram. Nenhum orçamento/configuração foi ampliado. Esse gate mede o carregamento de código; não é medição de FPS ou aprovação em dispositivos físicos.

## Provas e revisão

- Oito testes novos do commit, usando PNG real e envelope com dependência: atualização única, código conservado, idempotência sem gravação, base antiga, edição durante a operação, mudança sem trocar a referência, perfil A/B/A, cancelamento/acesso e plano adulterado/captura dos dados.
- Casos novos reproduzidos vermelhos antes da ação; o caso de conteúdo com a mesma referência também falhou antes da guarda adicional e passou depois.
- Suíte pertinente: **54 testes, zero falhas, 255 verificações**, sete arquivos.
- Núcleo e motor: **604 testes, zero falhas, 15.826 verificações**, 122 arquivos.
- Build/orçamento: **um teste, zero falhas, 29 verificações**, com os limites anteriores.
- Tipagem integral do Estúdio: aprovada localmente. Runtime Three reproduzível: mesmo SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`, sem regeneração.

Revisados captura antes de awaits, cerca por lifetime, revalidação independente do plano, preservação de fontes/identidade, uma atualização de estado, recusa sem efeitos, idempotência e separação de dependências. A divergência Canvas2D da outra sessão continua registrada para a qualificação integrada antes do fechamento de 8.4; estes gates locais não alteram o recibo daquela sessão.

## Continuação

O preparo ainda recusa Python enquanto faltam caminhos/fontes e distribuição compatível. O adapter e a interface ainda não chamam esta ação. A captura de lifetime do chamador deverá começar antes do preparo e acompanhar todo o fluxo. O próximo recorte é concluir Python/Raylib e então conectar a biblioteca autorizada e a galeria, com provas de produto. Depois vêm os quatro motores e o fechamento integral de 8.4. Nenhuma implantação/validação remota ou mudança no mundo/campanha foi feita aqui.
