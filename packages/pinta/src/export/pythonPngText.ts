/** Private encoded-PNG boundary shared by the forthcoming Python 2D adapters.
 * Validates static-file structure/CRC and bounded iTXt text, not IDAT pixels.
 */
import { PINTA_REGION_IMAGE_MAX_JSON_BYTES } from '@sistemazero/core/studio/pinta-region-image'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from './regionImageLimits'

const limits = PINTA_REGION_IMAGE_PNG_LIMITS
export const pythonPngText = `import base64
import binascii
import codecs
import math
import re
import struct
import zlib

_PINTA_PNG_SIGNATURE = bytes((137,80,78,71,13,10,26,10))
_PINTA_PNG_MAX_BYTES = ${limits.imageBytes}
_PINTA_PNG_MAX_SIDE = ${limits.dimension}
_PINTA_PNG_MAX_PIXELS = ${limits.imagePixels}
_PINTA_PNG_MAX_URL = ${limits.dataUrlChars}
_PINTA_PNG_MAX_TEXT = ${PINTA_REGION_IMAGE_MAX_JSON_BYTES}
_PINTA_PNG_BLOCK = 16384

def _png_invalid(cause=None):
    raise ValueError('Os dados desta imagem do Pinta estão estragados. O desenho foi mantido.') from cause

def _png_limit():
    raise ValueError('Os dados desta imagem ultrapassam o limite deste ambiente. O desenho foi mantido.')

def _png_integer(value):
    return type(value) is int or type(value) is float and math.isfinite(value) and value.is_integer()

def capturar_png(source):
    """Own immutable encoded bytes; same static PNG profile as the existing JS reader."""
    if type(source) not in (bytes,bytearray,memoryview):
        _png_invalid()
    if type(source) is memoryview:
        if source.itemsize!=1 or source.ndim!=1:
            _png_invalid()
        size=source.nbytes
    else:
        size=len(source)
    if size<45 or size>_PINTA_PNG_MAX_BYTES:
        _png_invalid()
    png=bytes(source)
    if png[:8]!=_PINTA_PNG_SIGNATURE or struct.unpack_from('>I4s',png,8)!=(13,b'IHDR'):
        _png_invalid()
    width,height=struct.unpack_from('>II',png,16)
    if width<1 or height<1 or width>_PINTA_PNG_MAX_SIDE or height>_PINTA_PNG_MAX_SIDE or width*height>_PINTA_PNG_MAX_PIXELS:
        _png_limit()
    view=memoryview(png)
    cursor,image_data,ended=8,False,False
    while cursor+12<=len(png):
        length,kind=struct.unpack_from('>I4s',png,cursor)
        if length>len(png)-cursor-12:
            _png_invalid()
        if any(not (65<=c<=90 or 97<=c<=122) for c in kind) or kind in (b'acTL',b'fcTL',b'fdAT') or cursor!=8 and kind==b'IHDR' or 65<=kind[0]<=90 and kind not in (b'IHDR',b'PLTE',b'IDAT',b'IEND'):
            _png_invalid()
        checksum=struct.unpack_from('>I',png,cursor+8+length)[0]
        if zlib.crc32(view[cursor+4:cursor+8+length])!=checksum:
            _png_invalid()
        if kind==b'IDAT':
            image_data=True
        cursor+=length+12
        if kind==b'IEND':
            if length!=0 or not image_data or cursor!=len(png):
                _png_invalid()
            ended=True
            break
    if not ended:
        _png_invalid()
    return {'png':png,'width':width,'height':height}

def png_da_url(url):
    """Canonical inline PNG only; no network, filenames or permissive base64 fallback."""
    prefix='data:image/png;base64,'
    if type(url) is not str or not url.startswith(prefix) or len(url)>_PINTA_PNG_MAX_URL:
        _png_invalid()
    encoded=url[len(prefix):]
    if len(encoded)%4 or re.fullmatch(r'[A-Za-z0-9+/]*={0,2}',encoded,re.ASCII) is None:
        _png_invalid()
    padding=len(encoded)-len(encoded.rstrip('='))
    if len(encoded)//4*3-padding>_PINTA_PNG_MAX_BYTES:
        _png_limit()
    try:
        png=base64.b64decode(encoded,validate=True)
    except (ValueError,binascii.Error) as error:
        _png_invalid(error)
    if base64.b64encode(png).decode('ascii')!=encoded:
        _png_invalid()
    return capturar_png(png)

def _png_inflate_text(payload,maximum):
    # Bound input too: unconsumed_tail must not copy a multi-megabyte remainder
    # for each tiny output window. Both windows remain at most 16 KiB.
    inflater=zlib.decompressobj(15)
    decoder=codecs.getincrementaldecoder('utf-8')('strict')
    parts=[]
    position,total,started=0,0,False
    pending=b''
    try:
        while True:
            if not pending and position<len(payload):
                end=min(position+_PINTA_PNG_BLOCK,len(payload))
                pending=payload[position:end]
                position=end
            before=len(pending)
            output=inflater.decompress(pending,min(_PINTA_PNG_BLOCK,maximum-total+1))
            total+=len(output)
            if total>maximum:
                _png_limit()
            text=decoder.decode(output,final=False)
            if not started and text:
                text=text.removeprefix('\\ufeff')
                started=True
            parts.append(text)
            pending=inflater.unconsumed_tail
            if inflater.eof:
                if inflater.unused_data or pending or position!=len(payload):
                    _png_invalid()
                text=decoder.decode(b'',final=True)
                if not started:
                    text=text.removeprefix('\\ufeff')
                parts.append(text)
                return ''.join(parts)
            if not output and len(pending)==before:
                _png_invalid()
    except (zlib.error,UnicodeError) as error:
        _png_invalid(error)

def ler_texto_png(source,max_metadata_bytes=_PINTA_PNG_MAX_TEXT):
    """CRC/static guards and duplicate/header scan precede bounded decompression."""
    if not _png_integer(max_metadata_bytes) or max_metadata_bytes<0 or max_metadata_bytes>_PINTA_PNG_MAX_TEXT:
        _png_limit()
    maximum=int(max_metadata_bytes)
    captured=capturar_png(source)
    png=captured['png']
    view=memoryview(png)
    cursor,payload,compressed=8,None,False
    while cursor+12<=len(png):
        length,kind=struct.unpack_from('>I4s',png,cursor)
        start=cursor+8
        if kind==b'iTXt' and length>=6 and png[start:start+6]==b'pinta'+bytes((0,)):
            if payload is not None or length<10 or png[start+6] not in (0,1) or png[start+7]!=0 or png[start+8]!=0 or png[start+9]!=0:
                _png_invalid()
            payload=view[start+10:start+length]
            compressed=png[start+6]==1
        cursor+=length+12
    if payload is None:
        _png_invalid()
    if compressed:
        text=_png_inflate_text(payload,maximum)
    else:
        if len(payload)>maximum:
            _png_limit()
        try:
            text=bytes(payload).decode('utf-8').removeprefix('\\ufeff')
        except UnicodeError as error:
            _png_invalid(error)
    return dict(captured,text=text)
`
