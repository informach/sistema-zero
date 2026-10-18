# Browser window implementation; original Screen/Turtle singleton semantics retained.
class _Screen(TurtleScreen):
    _title = _CFG['title']

    def __init__(self):
        TurtleScreen.__init__(self, None)
        self.setup()
        self.title(self._title)

    def setup(self, width=_CFG['width'], height=_CFG['height'],
              startx=_CFG['leftright'], starty=_CFG['topbottom']):
        # The embedded viewport is the browser equivalent of the desktop screen.
        # Native OS window positions have no effect on an embedded canvas.
        self._setup(width, height, startx, starty)
        self._update_screen()

    def title(self, titlestring):
        self._settitle(str(titlestring))
        _Screen._title = titlestring

    def bye(self):
        self._close()
        Turtle._pen = None
        Turtle._screen = None
        TurtleScreen._RUNNING = False

    def exitonclick(self):
        self.onclick(lambda x, y: self.bye())
        self.mainloop()

TurtleScreenBase._graphics_error = TurtleGraphicsError
TurtleScreenBase._terminator = Terminator
