"""QA-only visual witness, never imported by product/runtime/game modules.

The observed actor's ORIGINAL render must follow an original state/pose change.
Only then may the next real screen update include this small RGB sequence token.
No extra Turtle, synthetic key, sleep, clock change, simulation or pool mutation.
"""

KEYS = {'Left': 1, 'Right': 2, 'Up': 3, 'click': 4}


class InputPresentation:
    def __init__(self, screen):
        self.screen = screen
        self.sequence = 0
        self.pending = None
        self.ready = None
        self.item = screen._createpoly()
        self.color = '#000000'
        self.last_painted = None
        original_update = screen._update

        def present():
            # TurtleScreen.update queues the original actors first, then calls
            # this backend boundary. The token joins THAT real presentation last.
            self.paint()
            return original_update()

        screen._update = present

    def begin(self, key, before, enabled=True):
        self.sequence += 1
        if key not in KEYS or self.sequence > 65535:
            raise AssertionError('QA input sequence/key invalid')
        if self.pending is not None or self.ready is not None:
            raise AssertionError('QA input effect still pending')
        self.pending = (self.sequence, key, dict(before), enabled)

    def rendered(self, after, *, visible=True, active=True, playing=True):
        if self.pending is None or not visible or not active or not playing:
            return
        identifier, key, before, enabled = self.pending
        if not enabled:
            return
        if key in ('Left', 'Right'):
            delta = (after['heading'] - before['heading'] + 180) % 360 - 180
            changed = delta > 0 if key == 'Left' else delta < 0
        elif key == 'Up':
            changed = ((after['x'], after['y']) != (before['x'], before['y']) and
                       (after['dx'], after['dy']) != (before['dx'], before['dy']))
        else:
            changed = ((after['x'], after['y']) == before['target'] and
                       (after['x'], after['y']) != (before['x'], before['y']))
        if changed:
            self.ready = (identifier, key)
            self.pending = None

    def paint(self):
        if self.ready is not None:
            identifier, key = self.ready
            self.color = '#%02x%02x%02x' % (identifier & 255, identifier >> 8, KEYS[key])
        self.ready = None
        size = (self.screen.window_width(), self.screen.window_height())
        signature = (self.color, size)
        if self.last_painted == signature:
            return
        # Pixel (10,10), safely inside a 6x6 screen-space primitive. RGB encodes
        # sequence low/high bytes and key. Outline is disabled, no antialias edge sampled.
        x, y = -size[0]/2 + 7, size[1]/2 - 7
        self.screen._drawpoly(self.item, ((x, y), (x+6, y), (x+6, y-6), (x, y-6)),
                              fill=self.color, outline='', width=0, top=True)
        self.last_painted = signature
