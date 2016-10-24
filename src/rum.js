(function(w) {
  // global things we need
  const http = w.XMLHttpRequest
  const storage = w.localStorage
  const performance = w.performance
  const crypto = w.crypto
  const location = w.location
  const fetch = w.fetch
  const navigator = w.navigator
  const requestIdleCallback = w.requestIdleCallback

  // keys for storage
  const STORAGE_OPEN_TABS = "rum-open-tabs"
  const STORAGE_SESSION_ID = "rum-session-id"
  // keys for dom attributes
  const DOM_ENDPOINT = "data-rum-endpoint"

  // state
  let AJAX_QUEUE = []
  const config = getConfig()

  // returns a random string of <size> bytes
  function getRandomString(size = 32) {
    return btoa(crypto.getRandomValues(new Uint8Array(size)))
  }

  // interface around settimeout and request idle callback
  function delay(fn, ms = 0) {
    if (ms === 0) {
      return requestIdleCallback(fn)
    } else {
      return setTimeout(fn, ms)
    }
  }

  // interface around setinterval
  function repeat(fn, every = 5000) {
    return setInterval(fn, every)
  }

  // bisects an array according to a condition
  // result[0] contains elements where condition = true
  // result[1] contains elements where condition = false
  function bisect(array, condition) {
    return [
      array.filter((x, y, z) => condition(x, y, z)),
      array.filter((x, y, z) => !condition(x, y, z))
    ]
  }

  // returns a new object with only the provided keys of obj
  function selectKeys(obj, keys = []) {
    const agg = {}
    for (key in obj) {
      if (keys.indexOf(key) !== -1) {
        agg[key] = obj[key]
      }
    }
    return agg
  }

  // checks in localStorage if there is a session running
  // if so, returns id of that
  // if not, creates id and sets it in storage
  function getOrCreateSessionId() {
    let id = storage.getItem(STORAGE_SESSION_ID)
    if (id === null) {
      id = getRandomString()
      storage.setItem(STORAGE_SESSION_ID, id)
    }
    return id
  }

  // collects timing information for finished ajax requests and sends them
  // enqueues itself afterwards for repeated later execution
  function processAjaxQueue() {
    if (AJAX_QUEUE.length > 0) {
      const bisectedQueue = bisect(AJAX_QUEUE, req => performance.getEntriesByName(req.id, "measure").length === 1)
      const finished = bisectedQueue[0]
      const inFlight = bisectedQueue[1]
      if (finished.length > 0) {
        // send finished requests stats
        const toSend = finished.map(req => {
          const perf = performance.getEntriesByName(req.id, "measure")
          return {
            method: req.method,
            url: req.url,
            duration: perf[0].duration
          }
        })
        send(config, 'ajax_durations', toSend)
        // reset queue
        AJAX_QUEUE = inFlight
      }
      return bisectedQueue
    }
    return [[], []]
  }

  function selfReschedulingProcessAjaxQueue() {
    const queue = processAjaxQueue()
    const inFlight = queue[0]
    // reschedule
    if (inFlight.length > 0) {
      // there are requests in flight, we are eager to collect information
      delay(processAjaxQueue)
      return
    }
    // there are no requests in flight, we might as well wait a long time
    // until we check again
    delay(processAjaxQueue, 15 * 1000)
  }

  // sending non-standard memory information
  function processMemory() {
    send(config, 'js_memory', {
      heapLimit: performance.memory.jsHeapSizeLimit,
      heapSize: performance.memory.totalJSHeapSize,
      heapUsed: performance.memory.usedJSHeapSize
    })
  }

  // starts off rum.js
  function init() {
    delay(() => {
      // increase open tabs counter so we know when session ends
      let openTabs = parseInt(storage.getItem(STORAGE_OPEN_TABS) || 0, 10)
      storage.setItem(STORAGE_OPEN_TABS, openTabs + 1)

      send(config, 'initial', {
        window: selectKeys(w, [
          'devicePixelRatio',
          'innerWidth',
          'innerHeight'
        ]),
        navigator: selectKeys(navigator, [
          'vendor',
          'platform',
          'userAgent',
          'language'
        ]),
        timing: performance.timing
      })
    })

    // queue first run of ajax processing
    delay(selfReschedulingProcessAjaxQueue, 5000)

    // non-standard and only in chrome
    if (performance.memory) {
      repeat(processMemory, 30 * 1000)
    }
  }

  function getConfig() {
    const script = document.querySelector(`[${DOM_ENDPOINT}]`)
    return {
      endpoint: script.getAttribute(DOM_ENDPOINT),
      session: getOrCreateSessionId()
    }
  }

  // send data to backend
  function send(config, type, data, as = 'json') {
    const body = JSON.stringify({
      type,
      meta: {
        path: location.pathname,
        host: location.host
      },
      data
    })

    // TODO only for development or people who know what they are doing
    // huge disadvantage of fetch() is that - according to mdn - it is ignored
    // by user agents during unload event
    if (as === 'json') {
      const headers = {
        'X-RUM-Session-Id': config.session,
        'Content-Type': 'application/json'
      }
      return fetch(config.endpoint, {
        method: 'POST', //TODO configurable
        headers,
        body,
        mode: 'cors'
      })
    } else if (as === 'beacon' && navigator.sendBeacon) {
      //TODO should be default anyways
      navigator.sendBeacon(url, body)
    } else {
      // AAAHHHH
    }
  }

  // window unload callback
  function onUnload() {
    // what if we get unloaded and have local data?
    // => we send with navigator.sendBeacon
    processAjaxQueue()
    // update open tabs counter
    const openTabs = parseInt(storage.getItem(STORAGE_OPEN_TABS) || 0, 10)
    if (openTabs - 1 <= 0) {
      // last tab in this session is closed
      storage.removeItem(STORAGE_OPEN_TABS)
      storage.removeItem(STORAGE_SESSION_ID)
    } else {
      storage.setItem(STORAGE_OPEN_TABS, openTabs - 1)
    }
  }

  // window.fetch, but with updates to window.performance and the ajax queue
  function wrappedFetch(url, opts = {}) {
    return new Promise((resolve, reject) => {
      const id = getRandomString()
      AJAX_QUEUE.push({
        id,
        method: opts.method || 'GET',
        url
      })
      const begin = performance.mark(id)
      fetch(url, opts)
        .catch(err => {
          performance.measure(id, begin, performance.mark(id))
          reject(err)
        })
        .then(resp => {
          performance.measure(id, begin, performance.mark(id))
          resolve(resp)
        })
    })
  }

  w.fetch = wrappedFetch

  delay(init)
})(window)
