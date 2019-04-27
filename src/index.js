/**
 * Software distributed under the Apache License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 */

const assert = require('assert').ok
const { EventEmitter } = require('events')

let logger = console
logger.fatal = console.error

/**
 * Gracefully shutdown a nodejs process
 */
class ProcessExitHandler extends EventEmitter {
  constructor() {
    super()

    this.errorExitCode = 1
    this.processEvents = ['SIGINT', 'SIGTERM', 'unhandledRejection', 'uncaughtException']

    this._isExiting = false
    this._handler = null

    process.once('exit', (code) => {
      if (code > 0) {
        logger.fatal(
          `Process (${process.pid}) was terminated unexpectedly (code=${code})...`,
        )
      }
    })
  }

  setLogger(customLogger) {
    assert(!!customLogger)
    logger = customLogger
  }

  setErrorExitCode(exitCode) {
    assert(exitCode > 0)
    this.errorExitCode = exitCode
  }

  registerExitHandler(handler) {
    logger.warn('DEPRECATED: Please use `setExitHandler` instead.')
    this.setExitHandler(handler)
  }

  /**
   * Make sure the process will be terminated gracefully
   */
  setExitHandler(handler) {
    assert(
      typeof handler === typeof Function,
      'Invalid exit handler, example: `handleExit(isExpected, error) => {}`',
    )
    if (!!this._handler) {
      logger.warn(
        'Multiple exit handler is not allowed. ' +
          "Consider use `shutdown.on('will-exit', (isExpected) => {})` to observe.",
      )
    }

    this._handler = handler

    this.processEvents.forEach((event) => {
      this._monitorProcessEvent(event)
    })
  }

  _monitorProcessEvent(event) {
    process.on(event, (arg0, arg1) => {
      let error
      if (event === 'SIGINT') {
        error = null
      } else if (arg1 && typeof arg1 === 'object') {
        error = arg1
      } else {
        error = arg0
      }
      return this._handleProcessExit(event, error)
    })
  }

  async _handleProcessExit(event, error) {
    if (this._isExiting) {
      logger.fatal(
        `${event} received twice. Exit handler seems not responding, force exit.`,
        error,
      )
      process.exit(this.errorExitCode)
    }
    this._isExiting = true

    if (error) {
      logger.fatal(`${event} received (unexpected), going to shutdown`)
    } else {
      logger.warn(`${event} received, going to shutdown`)
    }

    const isExpectedExit = Boolean(!error)
    this.emit('will-exit', isExpectedExit)

    try {
      await this._handler(isExpectedExit, error)
    } catch (ex) {
      logger.fatal(ex)
    }

    const exitCode = isExpectedExit ? 0 : this.errorExitCode
    process.exit(exitCode)
  }
}

const singleton = new ProcessExitHandler()
module.exports = singleton
