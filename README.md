# Node-Exit

[![npm version](https://badge.fury.io/js/node-exit.svg)](http://badge.fury.io/js/node-exit) 

A simple process exit hook to make sure you can run your clean up code before node process exits. 

## Code Example

The application uses `pm2` to manage processes. When user presses <kbd>CTRL</kbd>+<kbd>C</kbd> to
kill application, the signal will be sent to child processes as well. `pm2` will try to recover
these processes. With this module, we can tell `pm2` no longer monit terminated processes.

In `app.js`
```javascript
const ne = require('node-exit')

ne.registerExitHandler((isExpectedExit, error) => {
  if (!isExpectedExit) {
    console.error('This is not an expected exit', error)
  }
})
```

In `pm2.js`
```javascript
const ne = require('node-exit')
const pm2 = require('pm2')

pm2.connect(false)
ne.on('exit', (isExpectedExit) => {
  pm2.killDaemon()
})
```