const assert = require('node:assert/strict');
const { sendWebviewMouseDrag } = require('../smss-drag-utils');

const points = {
  startX: 860,
  startY: 43,
  endX: 194,
  endY: 863,
  durationMs: 120
};

async function run() {
  const normalEvents = [];
  const completed = await sendWebviewMouseDrag(
    points,
    (event) => normalEvents.push(event),
    async () => {}
  );
  assert.equal(completed, true);
  assert.equal(normalEvents.filter((event) => event.type === 'mouseDown').length, 1);
  assert.equal(normalEvents.filter((event) => event.type === 'mouseUp').length, 1);
  assert.ok(normalEvents.findIndex((event) => event.type === 'mouseUp') > normalEvents.findIndex((event) => event.type === 'mouseDown'));

  const interruptedEvents = [];
  let delayCount = 0;
  await assert.rejects(
    sendWebviewMouseDrag(
      points,
      (event) => interruptedEvents.push(event),
      async () => {
        delayCount += 1;
        if (delayCount === 2) {
          throw new Error('simulated interruption after mouseDown');
        }
      }
    ),
    /simulated interruption/
  );
  assert.equal(interruptedEvents.filter((event) => event.type === 'mouseDown').length, 1);
  assert.equal(interruptedEvents.filter((event) => event.type === 'mouseUp').length, 1);
  assert.ok(interruptedEvents.findIndex((event) => event.type === 'mouseUp') > interruptedEvents.findIndex((event) => event.type === 'mouseDown'));
}

run()
  .then(() => console.log('smss drag verification passed'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
