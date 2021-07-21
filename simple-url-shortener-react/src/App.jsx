import { useState, useEffect, createContext, useContext } from 'react';

const pages = {
  home: "/",
  urls: "/urls",
}

const RoutingContext = createContext({ page: pages.home, setPage: null})

const Router = (props) => {
  const urlPath = window.location.pathname
  const [page, setPage] = useState(urlPath || pages.home)
  const ctx = {page: page, setPage: setPage}

  return (
    <RoutingContext.Provider value={ctx}>
      {props.children}
    </RoutingContext.Provider>
  )
}

const HomePage = () => {

  const [numUrlsKnown, setNumUrlsKnown] = useState(0)
  const [formState, setFormState] = useState({longUrl: ""})
  const [apiResponse, setApiResponse] = useState(null)
  const ctx = useContext(RoutingContext)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formPostData = new URLSearchParams(formState)
    console.log(`Submitting form...`)
    const response = await fetch('/api/add-url', {
        method: 'post',
        body: formPostData
    })
    const responseBody = await response.json()
    console.log(`Received Response: ${response.status}, body: ${JSON.stringify(responseBody)}`)
    setFormState({longUrl: ""})
    setApiResponse(responseBody)
  }

  const handleInputChanged = (e) => {
    const name = e.target.name
    const value = e.target.value.trim()
    setFormState({[name]: value})
  }

  useEffect(() => {
    (async () => {
      console.log("Fetching /home.json")
      const response = await fetch("/home.json")
      const data = await response.json()
      console.log(data)
      setNumUrlsKnown(data.numUrlsKnown)
    })()
  }, [])

  const mainContent = () => {
    return <>
      <p>
        Enter a URL that you would like to shorten
      </p>

      <form onSubmit={handleSubmit} action="/add-url" method="POST">
        <input onChange={handleInputChanged} type="text" name="longUrl" placeholder="https://example.com/"/>
        {"\n"}
        <button type="submit">Shorten!</button>
      </form>

      <p>Currently {numUrlsKnown} URLs saved.</p>
      <a href="/urls" onClick={e => {
        e.preventDefault()
        window.history.pushState({ page: "All URLs"}, null, "/urls")
        ctx.setPage(pages.urls)
      }}>View URLs</a>
    </>
  }

  const newUrlContent = (shortId, shortUrlPath) => {
    return (<>
      <p>Thank you for the link! It has been saved with ID</p>
      <pre>{shortId}</pre>
      You can navigate to it here:{"\n"}
      <a href={shortUrlPath} target="_blank" rel="noreferrer">Click Me</a>
      <p></p>
      <a href="/" onClick={(e) => {
        e.preventDefault()
        setApiResponse(null)
      }}>Back</a>
    </>)
  }

  const errorMessageContent = (msg) => {
    return (
      <>
        <strong style={{color: "red"}}>{apiResponse.data.message}</strong>
        {"\n"}
        <a href="/" onClick={(e) => {
          e.preventDefault()
          setApiResponse(null)
        }}>Back</a>
      </>
    )
  }

  if (apiResponse === null) {
    return mainContent()
  } else if (apiResponse.success) {
    return newUrlContent(apiResponse.data.shortId, apiResponse.data.relativePath)
  } else if (!apiResponse.success) {
    return errorMessageContent(apiResponse.data.message)
  }
}

const UrlListPage = () => {

  const [allUrls, setAllUrls] = useState([])
  const ctx = useContext(RoutingContext)

  useEffect(() => {
    (async () => {
      console.log("Fetching /api/urls.json")
      const response = await fetch("/api/urls.json")
      const data = await response.json()
      console.log(data)
      setAllUrls(data)
    })()
  }, [])

  return (
    <>
      <p>Displaying all {allUrls.length} URLs</p>
      <table>
        <tbody>
          <tr>
            <th>Short ID</th>
            <th>URL</th>
            <th># Visits</th>
          </tr>
          {
            allUrls.map(url => {
              return (
              <tr key={url.shortId}>
                <td>
                  <a href={`/url/${url.shortId}`} target="_blank" rel="noreferrer">{url.shortId}</a>
                </td>
                <td>{url.link}</td>
                <td>{url.visitCount}</td>
              </tr>)
            })
          }
        </tbody>
      </table>
      <a href="/" onClick={e => {
        e.preventDefault()
        window.history.pushState({ page: "Home"}, null, "/")
        ctx.setPage(pages.home)
      }}>Home</a>
    </>
  )
}

const App = () => {
  const ctx = useContext(RoutingContext)

  const getCurrentComponent = () => {
    switch(ctx.page) {
      case pages.home:
        return <HomePage />
      case pages.urls:
        return <UrlListPage/>
      default:
        return <HomePage />
    }
  }

  return (
    <>
      <h1>URL Shortener Service (React)</h1>
      {getCurrentComponent()}
    </>
  );
}

const Root = () => {
  return (
    <Router>
      <App />
    </Router>
  )
}

export default Root;
