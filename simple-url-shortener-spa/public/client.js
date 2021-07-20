// Initial page load - If someone visits a URL directly instead of clicking our links/buttons
const startingLocation = window.location.pathname

window.onload = () => {
    console.log(`Initializing UI: ${startingLocation}`);
    if (startingLocation === "/") {
        renderHomePage()
    } else if (startingLocation === "/urls") {
        renderUrlsPage()
    } else {
        // Just show home page for other urls as well
        renderHomePage()
    }
}

const addLink = (parent, href, text, onclick) => {
    const ele = document.createElement('a')
    ele.appendChild(document.createTextNode(text))
    ele.href = href
    ele.onclick = onclick
    parent.appendChild(ele)
}

const renderHomePage = async () => {
    console.log("Rendering home page")
    const response = await window.fetch("/home.json")
    const data = await response.json()
    console.log(`Page Data: ${JSON.stringify(data)}`)
    const contentDiv = document.querySelector("#content")
    contentDiv.innerHTML = `
    <p>Enter a URL that you would like to shorten</p>
    <form id="addUrlForm" action="/add-url" method="POST">
        <input type="text" name="longUrl" placeholder="https://example.com/"/>
        <button type="submit">Shorten!</button>
    </form>
    <p>
        Currently ${data.numUrlsKnown} URLs saved.
    </p>
    `
    addLink(contentDiv, "/urls", "View URLs", (e) => {
        e.preventDefault()
        history.pushState({ page: "All URLs"}, null, "/urls")
        renderUrlsPage()
    })
    const addUrlForm = document.querySelector("#addUrlForm")
    addUrlForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const formPostData = new URLSearchParams(new FormData(addUrlForm))
        console.log(`Submitting form...`)
        const response = await fetch('/api/add-url', {
            method: 'post',
            body: formPostData
        })
        const responseBody = await response.json()
        console.log(`Received Response: ${response.status}, body: ${JSON.stringify(responseBody)}`)
        const shortId = responseBody.success ? responseBody.data.shortId : null
        const shortUrlPath = responseBody.success ? responseBody.data.shortUrlPath : null
        const errorMsg = responseBody.success ? null : responseBody.data.message
        renderResultPage(responseBody.success, shortId, errorMsg, shortUrlPath)
    })
}

const renderResultPage = (success, shortId, errorMsg, shortUrlPath) => {
    console.log(`Rendering result page, success = ${success}, shortId = ${shortId}`)
    const contentDiv = document.querySelector("#content")
    if (success) {
        contentDiv.innerHTML = `
        <p>
            Thank you for the link! It has been saved with ID <pre>${shortId}</pre>
            You can navigate to it here: <a href="${shortUrlPath}">Click Me</a>
        </p>
        `
    } else {
        contentDiv.innerHTML = `
        <strong style="color: red">${errorMsg}</strong>
        `
    }
    const homeLinkText = success ? "Home" : "Back"
    addLink(contentDiv, "/", homeLinkText, (e) => {
        e.preventDefault()
        history.pushState({ page: "Home"}, null, "/")
        renderHomePage()
    })
}

const renderUrlsPage = async () => {
    console.log("Rendering URLs page")
    const response = await window.fetch("/api/urls.json")
    const allUrls = await response.json()
    console.log(`URLS Data: ${JSON.stringify(allUrls)}`)
    document.querySelector("#content").innerHTML = `
    <p>Displaying all ${allUrls.length} URLs</p>
    <table id="urlTable">
        <tr>
            <th>Short ID</th>
            <th>URL</th>
            <th># Visits</th>
        </tr>
    </table>
    `
    const urlTable = document.querySelector("#urlTable")
    allUrls.forEach(url => {
        const row = document.createElement('tr')

        const shortIdTd = document.createElement('td')
        const shortIdLink = document.createElement('a')
        shortIdLink.appendChild(document.createTextNode(url.shortId))
        shortIdLink.href = `/url/${url.shortId}`
        shortIdLink.target = "_blank"
        shortIdTd.appendChild(shortIdLink)
        row.appendChild(shortIdTd)

        const urlTd = document.createElement('td')
        urlTd.appendChild(document.createTextNode(url.link))
        row.appendChild(urlTd)

        const visitCountTd = document.createElement('td')
        visitCountTd.appendChild(document.createTextNode(url.visitCount))
        row.appendChild(visitCountTd)
        urlTable.appendChild(row)
    })
    const contentDiv = document.querySelector("#content")
    addLink(contentDiv, "/", "Home", (e) => {
        e.preventDefault()
        history.pushState({ page: "Home"}, null, "/")
        renderHomePage()
    })
}
