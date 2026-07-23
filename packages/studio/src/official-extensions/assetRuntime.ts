/**
 * Fragmento compartilhado pelos runtimes 3D para abrir assets locais. O preview
 * bloqueia rede, portanto GLB/HDR chegam sempre como data URL base64.
 */
export const dataUrlToBufferRuntimeSource = `  /** data: URL base64 -> ArrayBuffer, sem tocar na rede. */
  function dataUrlToBuffer(url) {
    var comma = url.indexOf(',');
    if (comma < 0) return null;
    try {
      var bin = atob(url.slice(comma + 1));
      var len = bin.length;
      var u8 = new Uint8Array(len);
      for (var i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
      return u8.buffer;
    } catch (e) {
      return null;
    }
  }
`
