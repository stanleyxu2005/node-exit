'use strict'

const assert = require('assert').ok
const {EventEmitter} = require('events')
let logger = null
try {
  logger = require('log4js').getLogger()
} catch (ex) {
  logger = console
  logger.fatal = console.error
}

/**
 * Gracefully shutdown a nodejs process
 */
class NodeExit extends EventEmitter {
  constructor() {
    super()
    this.signals = ['SIGINT', 'SIGTERM', 'unhandledRejection', 'uncaughtException']
    this._handler = null
    this._exiting = false
    process.once('exit', (code) => {
      if (code > 0) {
        logger.fatal(`Something went wrong, unexpected termination (code=${code})...`)
      }
    })
  }

  /**
   * Make sure the process will be terminated gracefully
   */
  registerExitHandler(handler) {
    assert(!this._handler, `Allow only one exit handler, you can subscribe 'exit' event.`)
    this._handler = handler
    this.signals.forEach((signal) => {
      process.on(signal, (err) => {
        err = signal.startsWith('SIG') ? undefined : err
        return this._initiateNodeExit(signal, err)
      })
    })
  }

  async _initiateNodeExit(signal, err) {
    if (this._exiting) {
      logger.fatal(`${signal} received twice. Signal handler seems not responding.`, err)
      return process.exit(1)
    }

    if (err) {
      logger.fatal(`Unexpected shutting down...`, err)
    } else {
      logger.warn(`${signal} received, shutting down...`)
    }

    let exitCode = err ? 1 : 0
    const isExpectedExit = exitCode === 0
    this.emit('exit', isExpectedExit)

    this._exiting = true
    try {
      exitCode = (await this._handler(isExpectedExit, err)) || exitCode
    } catch (ex) {
      logger.fatal(ex)
      exitCode = exitCode || 1
    }

    process.exit(exitCode)
  }

}

const singleton = new NodeExit()
module.exports = singleton