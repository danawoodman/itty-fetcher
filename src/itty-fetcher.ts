interface FetcherOverrides {
  base?: string
  autoParse?: boolean
}

interface FetcherOptions {
  base: string
  autoParse: boolean
}

type FetchyFunction = <T>(
  url: string,
  payload?: string | number | object | undefined | FormData,
  options?: object | undefined
) => Promise<T>

type FetchTraps = Record<string, FetchyFunction>

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
  (
    url: string,
    payload?: string | number | object | undefined,
    fetchOptions?: RequestInit
  ) => {
    const { base, autoParse, method: rawMethod } = options

    const method = rawMethod.toUpperCase()

    const resolvedURL = new URL(base + url)

    if (method === 'GET' && payload && typeof payload === 'object') {
      resolvedURL.search = new URLSearchParams(
        payload as Record<string, string>
      ).toString()
      payload = undefined
    }

    return fetch(resolvedURL.toString(), {
      method,
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (response.ok) {
        if (!autoParse) return response

        const contentType = response.headers.get('content-type')

        return contentType.includes('json') ? response.json() : response.text()
      }

      throw new Error(response.statusText)
    })
  }

export function fetcher(fetcherOptions?: FetcherOverrides) {
  return <FetcherType>new Proxy(
    {
      base: '',
      autoParse: true,
      ...fetcherOptions,
    },
    {
      get: (obj, method: string) =>
        obj[method] !== undefined ? obj[method] : fetchy({ method, ...obj }),
    }
  )
}
