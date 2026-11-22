/** Private pygame-ce facade. Assemble with the admitted world, common scene and affine backend. */
export const pythonPygameRegional = `class CenarioRegionalPygame(_PintaSceneBackend):
    """Um cenário editável do Pinta, com recursos compartilhados entre seus lugares.

    Os objetos são snapshots de dicionários; esta API não substitui Mapa/Objeto
    dos projetos anteriores. O programa decide quando atravessar uma porta.
    """

    @staticmethod
    def _criar_renderizador(imagens):
        # Emscripten already has a bounded in-memory PNG loader in pinta.py.
        return _PintaPygameAffine(imagens, carregar_png=globals().get('_imagem_em_memoria'))

    def desenhar(self, superficie, deslocamento=(0, 0), frente=False, tempo=None):
        """Desenha uma passagem no palco, sem criar uma Surface do mundo inteiro."""
        draw_affine = self._renderizador.desenhar(superficie)
        camera = (-deslocamento[0], -deslocamento[1])
        self.cena.desenhar(draw_affine, superficie.get_size(), camera, frente,
                           self.tempo_decorrido if tempo is None else tempo)

    def bloqueado(self, corpo):
        self._recursos()
        return self.cena.bloqueado(tuple(_pinta_pygame.FRect(corpo)))

    def pouso(self, anterior, atual, gravidade=1):
        """Entrega um novo FRect; não move os corpos fornecidos pelo programa."""
        self._recursos()
        before, after = _pinta_pygame.FRect(anterior), _pinta_pygame.FRect(atual)
        # Same float32-relative allowance as the published pygame-ce adapter.
        epsilon = max(1e-6,max(abs(value) for value in (*before,*after))*2**-23)
        result = self.cena.pouso(tuple(before),tuple(after),gravidade,_body_epsilon=epsilon)
        return _pinta_pygame.FRect(result) if result is not None else None

    def recurso_imagem(self, referencia):
        renderer = self._renderizador
        return renderer.imagem(self.cena.recurso_imagem(referencia))
`
