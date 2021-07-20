const express = require("express")
const path = require("path")

const app = express()

app.use(express.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, "public")))

const simpleAccessLog = (req, res, next) => {
    next()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    console.log(`>>> [${now}] ${req.method} ${req.url} - ${res.statusCode} ${req.headers['user-agent']}`)
}

app.use(simpleAccessLog)

const urlDatabase = {}

const generateId = (length=7) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

const addUrl = (url) => {
    const shortId = generateId()
    urlDatabase[shortId] = {link: url, visitCount: 0}
    console.log(`Adding ${url} to database with id ${shortId}`)
    return {id: shortId}
}

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

const updateVisitCount = (shortId) => {
    if (urlDatabase[shortId]) {
        urlDatabase[shortId].visitCount += 1
        console.log(`Updated visit count of ${shortId} to ${urlDatabase[shortId].visitCount}`)
    } else {
        console.log(`Attempted to update short id ${shortId}, but we don't know about it /shrug`)
    }
}


app.get('/home.json', (req, res) => {
    res.json({
        numUrlsKnown: getAllUrls().length,
    })
})

app.get('/api/urls.json', (req, res) => {
    const allUrls = getAllUrls()
    res.json(allUrls)
})

app.post('/api/add-url', (req, res) => {
    const url = req.body.longUrl.trim()
    if (!url.startsWith("http")) {
        res.status(400).json({
            success: false,
            data: {
                message: "That is an invalid link :("
            }
        })
    } else {
        const shortId = addUrl(url).id
        res.json({
            success: true,
            data: {
                shortId: shortId,
                relativePath: `/url/${shortId}`
            }
        })
    }
})

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

app.all('*', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
})

const seedUrls = ['https://google.com', 'https://reddit.com', 'https://youtu.be/dQw4w9WgXcQ']
seedUrls.forEach(url => {
    addUrl(url)
})
console.log(`Seeded database with ${seedUrls.length} URLs`)

const port = 8080;
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
