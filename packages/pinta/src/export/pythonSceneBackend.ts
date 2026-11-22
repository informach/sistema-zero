/** Private lifetime shared by graphical backends consuming the regional PNG world. */
export const pythonSceneBackend = `from time import monotonic_ns as _pinta_monotonic_ns
from weakref import WeakSet as _PintaWeakSet


class _PintaSceneOwner:
    def __init__(self, mundo, renderizador, primeiro):
        self.mundo = mundo
        self.renderizador = renderizador
        self.referencias = _PintaWeakSet((primeiro,))
        self.inicio = _pinta_monotonic_ns()

    def liberar(self, fachada):
        if len(self.referencias) == 1:
            self.renderizador.descartar()
        self.referencias.discard(fachada)


class _PintaSceneBackend:
    """Uma cena aberta mantém seus recursos até descartar a última referência."""

    _ler_mundo = staticmethod(ler_mundo_png)

    def __init__(self, source, mapa_id=None):
        self._owner = None
        self.cena = None
        self.substituir(source, mapa_id)

    def _recursos(self):
        if self._owner is None:
            raise RuntimeError('Este cenário do Pinta já foi descartado.')
        return self._owner

    @property
    def _mundo(self):
        return self._recursos().mundo

    @property
    def _renderizador(self):
        return self._recursos().renderizador

    @property
    def tempo_decorrido(self):
        """Milissegundos de animação compartilhados pelos lugares deste mundo."""
        return (_pinta_monotonic_ns() - self._recursos().inicio) // 1_000_000

    def _cena_aberta(self):
        self._recursos()
        return self.cena

    @property
    def limites(self):
        return self._cena_aberta().limites

    def objetos(self, tipo=None):
        # Sets can contain many repeated children. A first-match query must not
        # allocate every expanded object before yielding its first candidate.
        return self._cena_aberta().objetos(tipo)

    def objeto_por_id(self, referencia):
        return self._cena_aberta().objeto_por_id(referencia)

    def ponto_inicial(self):
        return self._cena_aberta().ponto_inicial()

    def bloqueado(self, corpo):
        return self._cena_aberta().bloqueado(corpo)

    def pouso(self, anterior, atual, gravidade=1):
        return self._cena_aberta().pouso(anterior, atual, gravidade)

    @staticmethod
    def propriedade(objeto, chave):
        return CenaRegional.propriedade(objeto, chave)

    def propriedade_camada(self, referencia, chave):
        return self._cena_aberta().propriedade_camada(referencia, chave)

    def propriedade_peca(self, referencia, peca, chave):
        return self._cena_aberta().propriedade_peca(referencia, peca, chave)

    def carregar(self, mapa_id):
        """Troca a cena pelo ID de outro mapa do mesmo mundo."""
        self.cena = CenaRegional(self._mundo, mapa_id)

    def abrir_lugar(self, mapa_id):
        return self._abrir(mapa_id)

    def _abrir(self, mapa_id):
        owner = self._recursos()
        cena = CenaRegional(owner.mundo, mapa_id)
        outra = object.__new__(type(self))
        outra._owner, outra.cena = owner, cena
        owner.referencias.add(outra)
        return outra

    def abrir_destino(self, porta):
        """Devolve o lugar de uma porta. O programa decide quando seguir para lá."""
        mapas = self._mundo['maps']
        if not isinstance(porta, dict):
            raise TypeError('Escolha um objeto porta deste cenário.')
        chave = 'destino' if self.propriedade(porta, 'destino') else 'destination'
        referencia = self.propriedade(porta, chave)
        if referencia is None or referencia == '':
            return None
        if not isinstance(referencia, str):
            raise ValueError('Esta porta não tem um destino válido.')
        destino = porta.get('properties', {}).get(chave)
        if isinstance(destino, dict) and destino.get('type') == 'asset':
            return self._abrir(referencia)
        ids = [mapa_id for mapa_id, mapa in mapas.items() if mapa['data']['name'] == referencia]
        if len(ids) > 1:
            raise ValueError('Há mais de um lugar com esse nome. Use o ID do lugar.')
        return self._abrir(ids[0] if ids else referencia)

    def substituir(self, source, mapa_id=None):
        """Admite um PNG e seus recursos gráficos antes de trocar o mundo aberto."""
        mundo = self._ler_mundo(source)
        cena = CenaRegional(mundo, mundo['rootId'] if mapa_id is None else mapa_id)
        renderizador = self._criar_renderizador(mundo['images'])
        anterior = self._owner
        try:
            owner = _PintaSceneOwner(mundo, renderizador, self)
            if anterior is not None:
                anterior.liberar(self)
        except BaseException:
            renderizador.descartar()
            raise
        self._owner, self.cena = owner, cena

    def descartar(self):
        anterior = self._owner
        if anterior is not None:
            anterior.liberar(self)
            self._owner, self.cena = None, None

    def __enter__(self):
        self._recursos()
        return self

    def __exit__(self, *_):
        self.descartar()
`
