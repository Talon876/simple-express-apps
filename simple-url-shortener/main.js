const express = require("express")
const path = require("path")

const app = express()

app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, "public")))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

/*
 * A basic piece of middleware that simply logs some info about requests we receive from the browser.
 * It is standard practice for web servers to log some of this information so you can see what is being accessed
 * This will log out the request method (GET/POST/etc), the path requested, the response status code we are returning, and the user-agent sent in on the request
 */
const simpleAccessLog = (req, res, next) => {
    // We need to call next() first in this piece of middleware so that the final request handler (that serves our response) gets ran.
    // This is so that we can access the res.statusCode to log the response status that our request handler is returning
    next()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    console.log(`>>> [${now}] ${req.method} ${req.url} - ${res.statusCode} ${req.headers['user-agent']}`)
}

/*
 * A silly piece of middleware of that simply checks if the user-agent header has "curl" in it.
 * If it does, then it is pretty likely that the request is being made from curl
 * I have arbitrarily chosen that all requests from curl should be forbidden (status code 403)
 * You can see this by attempting to fetch any of the pages using curl,
 * e.g. with this command: curl -v http://localhost:8080/
 * 
 * Note: This is not super reliable, as a client such as curl can set their user-agent to whatever they want.
 * By default, they tell the truth and send over what they are (e.g., curl) but you can spoof any user-agent.
 * e.g. try running this command: curl -v http://localhost:8080/ --user-agent 'a totally legit browser'
 */
const antiCurlMiddleware = (req, res, next) => {
    const userAgent = req.headers['user-agent']
    if (userAgent) {
        if (userAgent.indexOf("curl") >= 0) {
            console.log("Sending away a curler")
            res.status(403).send("Begone, knave!\n")
        } else {
            next()
        }
    } else {
        next()
    }
}

/*
 * Another silly middleware that checks the user-agent for "elinks".
 * This time, we simply add the boolean property "isElinksUser" to the request object so that
 * we can access it later (e.g. in our request handler)
 *
 * If you visit the home page or all urls page in the ELinks browser, it will display a special message
 */
const elinksBrowserDetectorMiddleware = (req, res, next) => {
    const userAgent = req.headers['user-agent']
    req.isElinksUser = false
    if (userAgent) {
        if (userAgent.toLowerCase().indexOf("elinks") >= 0) {
            req.isElinksUser = true
        }
    }
    next()
}

/*
 * Hook up the middleware functions
 */
app.use(simpleAccessLog, antiCurlMiddleware, elinksBrowserDetectorMiddleware)


// ######################### DATABASE FUNCTIONS #############################

/*
 Everything in this section sets up a fake "database" that will contain all of our
 shortened link ids, the link they actually point to, and how many times the shortened link
 has been visited.

 Instead of setting up a real database, this just uses a basic javascript object.
 The downside of this, is we have no real persistence so all entries that get added will be
 lost when the server restarts.
 */
const urlDatabase = {}

/*
 * A function to generate random IDs to use for our shortened links
 */
const generateId = (length=7) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

/*
 Adds the URL to our database.
 It takes care of generating the random id to associate with the URL
 and then returns the shortened id
 */
const addUrl = (url) => {
    const shortId = generateId()
    urlDatabase[shortId] = {link: url, visitCount: 0}
    console.log(`Adding ${url} to database with id ${shortId}`)
    return {id: shortId}
}

/*
 * This returns an array of every url in our database. It iterates over the keys and values in our urlDatabase object
 and creates an object with the shortened id, the actual link, and how many times its been visited.
 */
const getAllUrls = () => {
    const urls = []
    Object.entries(urlDatabase).forEach(entry => {
        const [shortId, url] = entry
        urls.push({
            'shortId': shortId,
            'link': url.link,
            'visitCount': url.visitCount,
        })
    })
    return urls
}

/*
 * This increments the visitor count for a given shortened ID. If the short ID does not exist in our database, it just does nothing besides logging that something weird happened
 */
const updateVisitCount = (shortId) => {
    if (urlDatabase[shortId]) {
        urlDatabase[shortId].visitCount += 1
        console.log(`Updated visit count of ${shortId} to ${urlDatabase[shortId].visitCount}`)
    } else {
        console.log(`Attempted to update short id ${shortId}, but we don't know about it /shrug`)
    }
}

// ######################### EXPRESS ROUTES #############################

/*
 * Show the home page, but also send in the number of urls in the database
 * as well as whether or not the user is using elinks (this boolean is available on the req object due to the elinksBrowserDetectorMiddleware defined above)
 * 
 * This also displays the form to create a new shortened url
 */
app.get('/', (req, res) => {
    const numUrlsKnown = getAllUrls().length
    res.render('index', {numUrlsKnown: numUrlsKnown, isElinksUser: req.isElinksUser})
})

/*
 * A page that lists all of the urls in our database
 */
app.get('/urls', (req, res) => {
    const allUrls = getAllUrls()
    res.render('list_urls', {urls: allUrls, isElinksUser: req.isElinksUser})
})

/*
 * Our POST handler for the form on the home page
 * It takes care of adding the url (after some very basic checking that it looks like a link)
 */
app.post('/add-url', (req, res) => {
    const url = req.body.longUrl.trim()
    if (!url.startsWith("http")) {
        res.status(400).send('<strong style="color: red">That is an invalid link! :(</strong> <a href="/">Back<a>')
    } else {
        const shortId = addUrl(url).id
        res.render('added_url', {shortId: shortId})
    }
})

/*
 * This page is a bit special as it's using something new: res.redirect(url)
 * This is a special response that sends a new type of status code to the browser that instructs it to redirect to a new URL
 * 
 * The URL that it redirects to is found by looking up the shortId in the url database,
 * if one exists, we redirect the users browser to that page. If this happens, we also want
 * to update the visit count for this url, so it calls updateVisitCount before returning the res.redirect() response
 * 
 * Another special thing, is this is using a path parameter
 * (as seen by the :shortId in the url path, the : prefix tells express that it should assign that part of the path to a variable on the req.params object)
 */
app.get('/url/:shortId', (req, res) => {
    const shortId = req.params.shortId
    const urlInfo = urlDatabase[shortId]
    if (urlInfo) {
        const url = urlInfo.link
        console.log(`User visited ${shortId}, sent them to ${url}`)
        updateVisitCount(shortId)
        return res.redirect(url)
    } else {
        console.log(`User visited ${shortId}, but we don't know where that is!`)
        return res.status(404).send('Not Found! <a href="/">Home</a>')
    }
})

/*
Because our database is reset every time the server is started, let's add a few entries
on startup so that we always have a little bit of data in there already.
This is done by just hardcoding an array of urls we want to add and then calling addUrl for each of them
*/
const seedUrls = ['https://google.com', 'https://reddit.com', 'https://youtu.be/dQw4w9WgXcQ']
seedUrls.forEach(url => {
    addUrl(url)
})
console.log(`Seeded database with ${seedUrls.length} URLs`)

// Start the server
const port = 8080;
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})

