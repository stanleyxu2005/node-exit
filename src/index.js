/**
 * Software distributed under the Apache License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 */

const assert = require('assert').ok
const { EventEmitter } = require('events')

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

    this.defaultErrorExitCode = 1
    this.processEvents = ['SIGINT', 'SIGTERM', 'unhandledRejection', 'uncaughtException']

    this._isExiting = false
    this._handler = null

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

    this.processEvents.forEach((event) => {
      this._registerProcessEvent(event)
    })
  }

  _registerProcessEvent(event) {
    process.on(event, (arg0, arg1) => {
      let error
      if (event === 'SIGINT') {
        error = null
      } else if (arg1 && typeof arg1 === 'object') {
        error = arg1
      } else {
        error = arg0
      }
      return this._initiateNodeExit(event, error)
    })
  }

  async _initiateNodeExit(event, err) {
    if (this._isExiting) {
      logger.fatal(
        `${event} received twice. Exit handler seems not to respond, force exit.`,
        err,
      )
      process.exit(this.defaultErrorExitCode)
    }
    this._isExiting = true

    if (err) {
      logger.fatal(`Unexpected shutting down...`, err)
    } else {
      logger.warn(`${event} received, shutting down...`)
    }

    const isExpectedExit = Boolean(!err)
    this.emit('will-exit', isExpectedExit)
    this.emit('exit', isExpectedExit) // will deprecate soon

    let exitCode
    try {
      exitCode = await this._handler(isExpectedExit, err)
    } catch (ex) {
      logger.fatal(ex)
    }

    if (!isExpectedExit && !exitCode) {
      exitCode = this.defaultErrorExitCode
    }
    process.exit(exitCode)
  }
}

const singleton = new NodeExit()
module.exports = singleton
