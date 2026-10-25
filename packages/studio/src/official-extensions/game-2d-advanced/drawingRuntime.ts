/** Native visual vocabulary shared by appearances, maps, world drawing and HUD. */
export const gameKitDrawingRuntime = `
  /** @param {number} x @param {number} y @param {number} width @param {number} height @param {string} color */
  function drawRectangle(x, y, width, height, color) {
    if (!ctx2d) return;
    ctx2d.save();
    try {
      ctx2d.fillStyle = text(color, '#ffd166');
      ctx2d.fillRect(num(x, 0), num(y, 0), num(width, 0), num(height, 0));
    } finally { ctx2d.restore(); }
  }
  /** @param {number} x @param {number} y @param {number} radius @param {string} color */
  function drawCircle(x, y, radius, color) {
    if (!ctx2d) return;
    ctx2d.save();
    try {
      ctx2d.fillStyle = text(color, '#ffd166');
      ctx2d.beginPath();
      ctx2d.arc(num(x, 0), num(y, 0), Math.max(0, num(radius, 0)), 0, Math.PI * 2);
      ctx2d.fill();
    } finally { ctx2d.restore(); }
  }
  /** @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 @param {number} x3 @param {number} y3 @param {string} color */
  function drawTriangle(x1, y1, x2, y2, x3, y3, color) {
    if (!ctx2d) return;
    ctx2d.save();
    try {
      ctx2d.fillStyle = text(color, '#ffd166');
      ctx2d.beginPath();
      ctx2d.moveTo(num(x1, 0), num(y1, 0));
      ctx2d.lineTo(num(x2, 0), num(y2, 0));
      ctx2d.lineTo(num(x3, 0), num(y3, 0));
      ctx2d.closePath();
      ctx2d.fill();
    } finally { ctx2d.restore(); }
  }
  /** @param {unknown} value @param {number} x @param {number} y @param {number} size @param {string} color */
  function drawText(value, x, y, size, color) {
    if (!ctx2d) return;
    ctx2d.save();
    try {
      ctx2d.fillStyle = text(color, '#ffffff');
      ctx2d.font = Math.max(1, num(size, 24)) + 'px ' + _szGameUIFont;
      ctx2d.textAlign = 'left';
      ctx2d.textBaseline = 'alphabetic';
      ctx2d.fillText(value == null ? '' : String(value), num(x, 0), num(y, 0));
    } finally { ctx2d.restore(); }
  }
`
