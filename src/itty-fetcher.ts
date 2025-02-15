type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

type RequestLike = WithRequired<RequestInit, 'method' | 'headers'> & {
  url: string
}

export type RequestPayload = string | number | object | any[] | FormData | undefined

export interface FetcherOptions {
  base?: string
  autoParse?: boolean
  transformRequest?: (request: RequestLike) => RequestLike
}

type FetchyFunction = <T>(
  url: string,
  payload?: RequestPayload,
  options?: object | undefined,
) => Promise<T>

type FetchTraps = {
  [key: string]: FetchyFunction
}

type FetcherType = FetcherOptions & {
  get: FetchyFunction
  post: FetchyFunction
  put: FetchyFunction
  delete: FetchyFunction
} & FetchTraps

type FetchyOptions = {
  method: string
} & FetcherOptions

const fetchy =
  (options: FetchyOptions): FetchyFunction =>
  (url_or_path: string, payload?: RequestPayload, fetchOptions?: RequestInit) => {
    const method = options.method.toUpperCase()

    /**
     * If the request is a `.get(...)` then we want to pass the payload
     * to the URL as query params as passing data in the body is not
     * allowed for GET requests.
     *
     * If the user passes in a URLSearchParams object, we'll use that,
     * otherwise we will create a new URLSearchParams object from the payload
     * and pass that in.
     *
     * We clear the payload after this so that it doesn't get passed to the body.
     */
    let search = ''
    if (method === 'GET' && payload && typeof payload === 'object') {
      search =
        '?' +
        (payload instanceof URLSearchParams
          ? payload
          : new URLSearchParams(payload as Record<string, string>)
        ).toString()
      payload = undefined
    }

    const full_url = (options.base || '') + url_or_path + search

    let req: RequestLike = {
      url: full_url,
      method,
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }

    /**
     * Transform the outgoing request if a transformRequest function is provided
     * in the options. This allows the user to modify the request before it is
     * sent.
     */
    if (options.transformRequest) req = options.transformRequest(req)

    const { url, ...init } = req

    return fetch(url, init).then((response) => {
      if (response.ok) {
        if (!options.autoParse) return response

        const contentType = response.headers.get('content-type')

        return contentType.includes('json') ? response.json() : response.text()
      }

      throw new Error(response.statusText)
    })
  }

export function fetcher(fetcherOptions?: FetcherOptions) {
  return <FetcherType>new Proxy(
    {
      base: '',
      autoParse: true,
      ...fetcherOptions,
    },
    {
      get: (obj, prop: string) =>
        obj[prop] !== undefined
          ? obj[prop]
          : fetchy({
              method: prop,
              ...obj,
            }),
    },
  )
}
