const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = (app) => {
    const proxy = createProxyMiddleware({
        target: 'http://localhost:8080/',
        changeOrigin: true,
    })
    app.use('/api/*', proxy)
    app.use('/home.json', proxy)
    app.use('/url/*', proxy)
    app.post('/add-url', proxy)
}
