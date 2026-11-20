const { app, BrowserWindow } = require('electron');

const mediaTypes = {
  mp4H264Aac: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  mp4H264: 'video/mp4; codecs="avc1.42E01E"',
  webmVp8Vorbis: 'video/webm; codecs="vp8, vorbis"',
  webmVp9Opus: 'video/webm; codecs="vp9, opus"',
  webmAv1Opus: 'video/webm; codecs="av01.0.05M.08, opus"',
  quickTime: 'video/quicktime'
};

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false });
  await window.loadURL('data:text/html,<video id="probe"></video>');
  const results = await window.webContents.executeJavaScript(`(() => {
    const video = document.getElementById('probe');
    return Object.fromEntries(
      Object.entries(${JSON.stringify(mediaTypes)}).map(([name, mime]) => [name, video.canPlayType(mime) || ''])
    );
  })()`);
  process.stdout.write(`${JSON.stringify({ electron: process.versions.electron, chrome: process.versions.chrome, results }, null, 2)}\n`);
  app.quit();
}).catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  app.exit(1);
});
