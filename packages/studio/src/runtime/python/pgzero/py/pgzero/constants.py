"""Names for constants returned by Pygame (values captured from pygame-ce 2.5.8).

Generated from pygame-ce, so key codes match a desktop Pygame Zero running on pygame-ce.
"""
from enum import IntEnum


# Event type indicating the end of a music track
MUSIC_END = 99


class mouse(IntEnum):
    LEFT = 1
    MIDDLE = 2
    RIGHT = 3
    WHEEL_UP = 4
    WHEEL_DOWN = 5


class keys(IntEnum):
    UNKNOWN = 0
    BACKSPACE = 8
    TAB = 9
    RETURN = 13
    ESCAPE = 27
    SPACE = 32
    EXCLAIM = 33
    QUOTEDBL = 34
    HASH = 35
    DOLLAR = 36
    PERCENT = 37
    AMPERSAND = 38
    QUOTE = 39
    LEFTPAREN = 40
    RIGHTPAREN = 41
    ASTERISK = 42
    PLUS = 43
    COMMA = 44
    MINUS = 45
    PERIOD = 46
    SLASH = 47
    K_0 = 48
    K_1 = 49
    K_2 = 50
    K_3 = 51
    K_4 = 52
    K_5 = 53
    K_6 = 54
    K_7 = 55
    K_8 = 56
    K_9 = 57
    COLON = 58
    SEMICOLON = 59
    LESS = 60
    EQUALS = 61
    GREATER = 62
    QUESTION = 63
    AT = 64
    LEFTBRACKET = 91
    BACKSLASH = 92
    RIGHTBRACKET = 93
    CARET = 94
    UNDERSCORE = 95
    BACKQUOTE = 96
    A = 97
    B = 98
    C = 99
    D = 100
    E = 101
    F = 102
    G = 103
    H = 104
    I = 105
    J = 106
    K = 107
    L = 108
    M = 109
    N = 110
    O = 111
    P = 112
    Q = 113
    R = 114
    S = 115
    T = 116
    U = 117
    V = 118
    W = 119
    X = 120
    Y = 121
    Z = 122
    DELETE = 127
    CAPSLOCK = 1073741881
    F1 = 1073741882
    F2 = 1073741883
    F3 = 1073741884
    F4 = 1073741885
    F5 = 1073741886
    F6 = 1073741887
    F7 = 1073741888
    F8 = 1073741889
    F9 = 1073741890
    F10 = 1073741891
    F11 = 1073741892
    F12 = 1073741893
    PRINTSCREEN = 1073741894
    SCROLLLOCK = 1073741895
    PAUSE = 1073741896
    INSERT = 1073741897
    HOME = 1073741898
    PAGEUP = 1073741899
    END = 1073741901
    PAGEDOWN = 1073741902
    RIGHT = 1073741903
    LEFT = 1073741904
    DOWN = 1073741905
    UP = 1073741906
    NUMLOCKCLEAR = 1073741907
    KP_DIVIDE = 1073741908
    KP_MULTIPLY = 1073741909
    KP_MINUS = 1073741910
    KP_PLUS = 1073741911
    KP_ENTER = 1073741912
    KP_1 = 1073741913
    KP_2 = 1073741914
    KP_3 = 1073741915
    KP_4 = 1073741916
    KP_5 = 1073741917
    KP_6 = 1073741918
    KP_7 = 1073741919
    KP_8 = 1073741920
    KP_9 = 1073741921
    KP_0 = 1073741922
    KP_PERIOD = 1073741923
    POWER = 1073741926
    KP_EQUALS = 1073741927
    F13 = 1073741928
    F14 = 1073741929
    F15 = 1073741930
    HELP = 1073741941
    MENU = 1073741942
    SYSREQ = 1073741978
    CLEAR = 1073741980
    CURRENCYUNIT = 1073742004
    CURRENCYSUBUNIT = 1073742005
    LCTRL = 1073742048
    LSHIFT = 1073742049
    LALT = 1073742050
    LGUI = 1073742051
    RCTRL = 1073742052
    RSHIFT = 1073742053
    RALT = 1073742054
    RGUI = 1073742055
    MODE = 1073742081
    AC_BACK = 1073742094


class keymods(IntEnum):
    NONE = 0
    LSHIFT = 1
    RSHIFT = 2
    SHIFT = 3
    LCTRL = 64
    RCTRL = 128
    CTRL = 192
    LALT = 256
    RALT = 512
    ALT = 768
    LGUI = 1024
    RGUI = 2048
    GUI = 3072
    NUM = 4096
    CAPS = 8192
    MODE = 16384
