# Morada: quarto, casa, construção e pets

Desenho aprovado na conversa de 14/11/2026. A implementação está autorizada.

- Todas as artes antigas do quarto, pets e construção saem, incluindo reservas em primitivas e objetos funcionais. Só os oito troféus específicos permanecem. A estante usa Morada.
- Funções, projetos, conquistas e conteúdo autoral permanecem independentes do modelo. Sem equivalente direto, compor peças da Morada; não manter arte antiga.
- O quarto é um cômodo identificado da casa. Há um documento canônico versionado, com revisão, instâncias estáveis, transformações locais e ancoragem em slots. Members é a autoridade de casa e inventário; jogo mantém seu progresso.
- Arte importada de `../artes-3d`, sem publicar GLBs no git. Catálogo puro em `core/morada`, renderização em `avatar-quarto/morada`, APIs e telas em seus pacotes.
- Metros, Y acima, frente +Z, grade 0,5 m. Preservar origens autorais, vãos, múltiplas caixas, malhas de colisão e partes móveis. Não confundir dims W/D/H com XYZ.
- Os 24 gatos/cachorros entram. Pássaro sai. Pets antigos viram equivalente da mesma espécie; sem equivalente, omitir. Arranjo antigo pode ser substituído/omitido sem reconstrução fiel.
- Reembolso pelo extrato histórico dos itens retirados, idempotente, com ensaio e preservação das conquistas; não devolver indiscriminadamente compras da Galeria.
- Ferramentas Kids/adulto compartilham lógica e peça. O quarto na plataforma é uma edição limitada ao cômodo, sem sobrescrever o restante da casa.
- Reforço explícito da dona durante a execução: preservar a aparência e a identidade visual ATUAIS da página Meu Quarto nas comunidades Kids e adulta. Manter as respectivas peles, layout, cores, tipografia, botões e organização. A migração muda arte 3D, pets e dados; não redesenha a página nem uniformiza as duas audiências.
- O mesmo vale para toda a interface do jogo: manter HUD, modos Viver/Construir, ferramentas, barra inferior, bandejas e os estilos existentes. A biblioteca nova altera as peças e o funcionamento interno da construção; não autoriza trocar a interface por um painel lateral ou outro desenho.
- Jogo não importa core ou plataforma diretamente; recebe catálogo/modelos pelo avatar-quarto e dados pela porta contratual. Física fica no jogo.
- Escala nativa nas cenas Morada. Não misturar personagem ampliado com portas nativas. A migração precisa conferir o ponto de ligação ao mundo atual.
- Limites técnicos e compatibilidade de gravação são explícitos, com recusa de referências inválidas e recuperação de conflitos. Cliente antigo não sobrescreve documento novo.

Critérios de aceite: catálogo completo validado, quarto/casa editáveis e persistidos, pets nos dois contextos, comportamento funcional preservado, ausência de imports de artes antigas exceto troféus, conferência visual e testes dos pacotes tocados. Publicação e migração de banco real são etapas registradas separadamente da implementação local.
