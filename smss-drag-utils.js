(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dashboardSmssDragUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  async function sendWebviewMouseDrag(points, sendInputEvent, delayFn) {
    if (!points || typeof sendInputEvent !== 'function' || typeof delayFn !== 'function') {
      return false;
    }

    const steps = Math.min(32, Math.max(4, Math.ceil(points.durationMs / 80)));
    const stepDelay = Math.max(20, Math.round(points.durationMs / steps));
    let mouseDownSent = false;
    let lastX = points.startX;
    let lastY = points.startY;

    try {
      sendInputEvent({ type: 'mouseMove', x: points.startX, y: points.startY, movementX: 0, movementY: 0 });
      await delayFn(60);
      sendInputEvent({ type: 'mouseDown', x: points.startX, y: points.startY, button: 'left', clickCount: 1 });
      mouseDownSent = true;

      for (let step = 1; step <= steps; step += 1) {
        const ratio = step / steps;
        const x = Math.round(points.startX + ((points.endX - points.startX) * ratio));
        const y = Math.round(points.startY + ((points.endY - points.startY) * ratio));
        await delayFn(stepDelay);
        sendInputEvent({
          type: 'mouseMove',
          x,
          y,
          button: 'left',
          movementX: x - lastX,
          movementY: y - lastY
        });
        lastX = x;
        lastY = y;
      }
      await delayFn(50);
      return true;
    } finally {
      if (mouseDownSent) {
        try {
          sendInputEvent({ type: 'mouseUp', x: lastX, y: lastY, button: 'left', clickCount: 1 });
          sendInputEvent({ type: 'mouseMove', x: lastX, y: lastY, movementX: 0, movementY: 0 });
        } catch (_) {
          // The caller still performs DOM selection cleanup if the webview was destroyed.
        }
      }
    }
  }

  return { sendWebviewMouseDrag };
});
