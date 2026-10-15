# Guardiões da arena

Proteja a arena por 60 segundos **ou** supere dez adversários. Use as setas/WASD para mover e aperte e solte Espaço para emitir um pulso. O círculo alcança todos os adversários próximos; espere o indicador ficar pronto antes de apertar novamente. No toque, use os botões; no gamepad, a direção e o botão principal.

Se sua energia acabar, a partida termina em derrota, mesmo que uma meta seja alcançada naquele instante. Reiniciar repete a seed; voltar ao início e começar gera outra partida. Som começa desligado.

## Encontre o que deseja mudar

| Arquivo | O que controla |
|---|---|
| `src/config.ts` | Vida, tempo, velocidade, pulso e limites da arena |
| `src/model.ts` e `src/rules/` | Movimento, comportamento, contato, spawn e resultado |
| `src/characters.ts` | Qual material representa cada personagem e suas animações |
| `src/render/` | Desenho, animação e efeitos; não decide dano ou vitória |
| `src/assets.ts` | Carregamento e validação dos materiais do projeto |
| `src/ui.ts`, `input.ts`, `lifecycle.ts`, `progress.ts` | Menus, controles, descarte e progresso compartilhados |

Três desafios para começar: aumente `surviveSeconds`; mude apenas a velocidade do perseguidor; troque o personagem por um desenho seu. Faça uma mudança por vez e teste. O Pensa ajuda a organizar sua missão e o Zappy pode explicar os arquivos atuais.

## Usar um desenho do Pinta

1. Adicione a criação pelo painel **Materiais** do Studio.
2. Copie a referência do material e use seu **ID do projeto** em `characters.player.assetId`. O nome e o ID da biblioteca são referências diferentes.
3. PNG simples funciona como imagem parada. Se for spritesheet, associe os nomes reais das animações aos estados `idle`, `walk`, `hurt` e `death`. Um estado sem arte própria pode apontar explicitamente para `idle`.
4. Execute a nova revisão. Atualizar o mesmo desenho conserva o vínculo; escolher outra criação exige mudar o ID. Cada execução usa um conjunto completo de imagens e metadados.

Por padrão, `collision: 'fixed'` preserva o corpo definido em `config.ts` ao trocar arte. Para usar a área definida no sprite, escolha explicitamente `collision: 'sprite'`; ausência de hitbox significa imagem inteira. Esse modo pode mudar a dificuldade ao editar o tamanho/área de colisão. Acrescente `?hitboxes=1` à URL do jogo exportado para visualizar os corpos.

Os materiais ficam em `public/studio-assets/manifest.json`; URLs do manifesto são relativas à raiz pública do jogo. Arquivos binários são projetados pelo Studio a partir dos materiais, sem base64 nas fontes. O loader aceita PNG e informa recursos ausentes, inválidos ou grandes demais; não substitui personagens essenciais silenciosamente.

## Executar fora do Studio

Extraia o ZIP de fontes, abra um terminal nesta pasta e use uma versão de Node aceita pelo Vite incluído (Node 22.12 ou superior):

```sh
npm ci
npm run dev
```

Para conferir e gerar os arquivos do site:

```sh
npm run typecheck
npm run build
```

Publique o conteúdo de `dist/` em um servidor estático. Não abra TypeScript direto no navegador. O snapshot JSON é o backup reimportável no Studio; o ZIP é para trabalhar fora dele. `studio-kit.json` descreve a origem e não substitui a verificação do código editado.

## Progresso e preferências

Recorde é o maior número de adversários superados numa partida encerrada. Vitórias são contadas separadamente; uma vitória pelo tempo pode ter recorde menor que uma derrota. As duas medidas ficam neste aparelho, por projeto/perfil no Studio e por URL fora dele. Só são anunciadas como gravadas depois da confirmação. Fechar durante uma gravação pendente pode perder esse resultado. Não há checkpoint, ranking, merge entre abas ou sincronização entre dispositivos. Editar dificuldade não apaga o recorde.

Efeitos econômicos reduzem custo visual. A preferência do sistema por movimento reduzido diminui efeitos decorativos independentemente da qualidade. Ambas preservam as regras. Pausar/voltar ao início libera controles e interrompe som; para continuar, libere e pressione os comandos novamente.

## Verifique sua alteração

Teste começar, mover na diagonal, apertar/soltar pulso, pausar, continuar, vencer, perder, reiniciar, voltar ao menu, redimensionar e alternar de aba. Confira os materiais no preview e no ZIP. Não conclua que uma mudança está pronta só porque compilou.

Fontes e pack deste kit foram criados para o Studio; veja `CREDITS.md` e as permissões que acompanham os materiais. O projeto de curso P27 foi referência de mecânicas, sem redistribuição de seus arquivos.
