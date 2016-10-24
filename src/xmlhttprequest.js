/**
 * Wrapped XMLHttpRequest that uses window.performance for measuring duration
 *
 * Not it was copy-pasted from rum.js, doesn't work as-is
 */
function WrappedXMLHttpRequest() {
  const request = new http()
  const id = getRandomString()
  const wrapped = Object.create({}, {
    open: {
      value: request.open.bind(request)
    },
    abort: {
      value: request.abort.bind(request)
    },
    send: {
      value: send
    },
    abort: {
      value: abort
    },
    setRequestHeader: {
      value: request.setRequestHeader.bind(request)
    },
    overrideMimeType: {
      value: request.overrideMimeType.bind(request)
    },
    getAllResponseHeaders: {
      value: request.getAllResponseHeaders.bind(request)
    },
    getResponseHeader: {
      value: request.getResponseHeader.bind(request)
    },
    // ALL the fields
    // read-only
    readyState: {
      get: () => request.readyState
    },
    response: {
      get: () => request.response
    },
    responseText: {
      get: () => request.responseText
    },
    responseURL: {
      get: () => request.responseURL
    },
    responseXML: {
      get: () => request.responseXML
    },
    status: {
      get: () => request.status
    },
    statusText: {
      get: () => request.statusText
    },
    // writable
    onreadystatechange: {
      writable: true
    },
    timeout: {
      set: t => {
        request.timeout = t
      },
      get: () => request.timeout
    },
    withCredentials: {
      set: x => {
        request.withCredentials = x
      },
      get: () => request.withCredentials
    }
  })

  let begin;

  function send() {
    begin = performance.mark(id)
    request.send()
  }

  request.onreadystatechange = function() {
    if (request.readyState === http.DONE) {
      performance.measure(id, begin, performance.mark(id))
    }

    // call callback function
    if (typeof wrapped.onreadystatechange === 'function') {
      wrapped.onreadystatechange()
    }
  }

  return wrapped
}
