Promise = require 'promiz'

# Promise polyfill
window.Promise = window.Promise or require 'promiz'

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN or 'clay.io')
IS_FRAMED = window.self isnt window.top

class SDK
  constructor: ->
    # Public
    @version = 'v0.0.7'
    @config = new Promise (@resolve, @reject) -> null

    # Private
    @initHasBeenCalled = false
    @pendingMessages = {}
    @nextMessageId = 1

    window.addEventListener 'message', @onMessage

  # Public
  init: ({gameId, debug} = {}) =>
    unless typeof gameId is 'string' and /^[0-9]+$/.test gameId
      return Promise.reject new Error 'Missing or invalid gameId'

    @initHasBeenCalled = true

    if IS_FRAMED
      @validateParent()
      .then =>
        @postMessage
          config:
            gameId: gameId
          method: 'auth.getStatus'
      .then (status) =>
        # TODO: Token may be invalid
        @config.resolve
          debug: Boolean debug
          gameId: gameId
          accessToken: status?.accessToken

        return @config
    else
      @config.resolve
        debug: Boolean debug
        gameId: gameId
        accessToken: null

      return @config

  login: ({scope}) ->
    # TODO: OAuth magic. Gets token
    return Promise.reject new Error 'Not Implemented'

  api: ->
    # TODO: implement
    return Promise.reject new Error 'Not Implemented'

  client: ({method, params} = {}) =>
    unless @initHasBeenCalled
      return Promise.reject new Error 'Must call Clay.init() first'

    unless typeof method is 'string'
      return Promise.reject new Error 'Missing or invalid method'

    if params? and Object::toString.call(params) isnt '[object Array]'
      return Promise.reject new Error 'Params must be an array'

    localMethod = ({method, params}) =>
      return @methodToFn(method).apply null, params

    return @config.then (config) =>
      if IS_FRAMED
        frameError = null
        return @validateParent()
        .then =>
          @postMessage {config: {gameId: config.gameId}, method, params}
        .then null, (err) ->
          frameError = err
          localMethod({method, params})
        .then null, (err) ->
          if err.message is 'Method not found' and frameError isnt null
            throw frameError
          else
            throw err
      else
        return Promise.resolve localMethod({method, params})

  # Private

  # This is used to verify that the parent is clay.io
  # If it's not, the postMessage promise will fail because of onMessage check
  validateParent: =>
    @postMessage
      method: 'ping'
      config: {gameId: 1}

  methodToFn: (method) =>
    switch method
      when 'share.any' then @shareAny
      else -> throw new Error 'Method not found'

  shareAny: ({text}) ->
    tweet = (text) ->
      text = encodeURIComponent text.substr 0, 140
      window.open "https://twitter.com/intent/tweet?text=#{text}"

    return tweet(text)

  isValidOrigin: (origin) ->
    regex = new RegExp '^https?://(\\w+\\.)?(\\w+\\.)?' +
                       "#{TRUSTED_DOMAIN.replace(/\./g, '\\.')}/?$"
    return regex.test origin

  onMessage: (e) =>
    if not @config.debug and not @isValidOrigin e.origin
      throw new Error "Invalid origin #{e.origin}"

    message = JSON.parse e.data

    unless message.id
      return

    if message.error
      @pendingMessages[message.id].reject new Error message.error.message
    else
      @pendingMessages[message.id].resolve message.result

  postMessage: ({config, method, params}) =>
    deferred = new Promise (@resolve, @reject) -> null
    message = {method, params}

    try
      message.id = @nextMessageId
      message.gameId = config.gameId
      message.accessToken = config.accessToken
      message._clay = true
      message.jsonrpc = '2.0'

      @pendingMessages[message.id] = deferred

      @nextMessageId += 1

      # It's not possible to tell who the parent is here
      # The client has to ping the parent and get a response to verify
      window.parent.postMessage JSON.stringify(message), '*'

    catch err
      deferred.reject err

    return deferred

sdk = new SDK()
module.exports = {
  version: sdk.version
  init: sdk.init
  client: sdk.client
  config: sdk.config
}
