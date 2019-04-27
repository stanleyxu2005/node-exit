# Node-Exit

[![npm version](https://badge.fury.io/js/node-exit.svg)](http://badge.fury.io/js/node-exit)

A simple process exit hook to make sure you can run your clean up code before node process exits.

## Code Example

The application uses `pm2` to manage processes. When user presses <kbd>CTRL</kbd>+<kbd>C</kbd> to
kill application, the signal will be sent to child processes as well. `pm2` will try to recover
these processes. With this module, we can tell `pm2` no longer monit terminated processes.

In `app.js`

```javascript
const shutdown = require('node-exit')

shutdown.registerExitHandler((isExpectedExit, error) => {
  if (!isExpectedExit) {
    console.fatal('Unexpected exit', error)
  }
  // Put your clean up code here
})
```

If you have more than one exit handling, here is an example:

```javascript
const shutdown = require('node-exit')
const pm2 = require('pm2')

// Start PM2
const detached = false
pm2.connect(detached)

// Hook for stop
shutdown.on('will-exit', (isExpectedExit) => {
  console.debug('Will exit soon...')
  pm2.killDaemon()
})
```
