// @ts-ignore
import { Nuxt, Builder } from 'nuxt';
import fs from 'fs'
import os from 'os'
import https from 'https'
import http from 'http'
import express from 'express'
const expressApp = express()
import { createWebMeetingRouter } from './api/web-meeting'
const port = process.env.PORT || 3000
import config from './nuxt.config'
const isSSL = process.env.PORT == '443'
const serverMod = isSSL ? https : http

const serverOption: https.ServerOptions = isSSL ? {
    key: fs.readFileSync(os.homedir() + '/cert/private.key'),
    cert: fs.readFileSync(os.homedir() + '/cert/certificate.crt'),
    ca: [fs.readFileSync(os.homedir() + '/cert/ca_bundle.crt')],
} : {}
const appServer = serverMod.createServer(serverOption, expressApp)

// API
expressApp.use(createWebMeetingRouter(appServer))

// Nuxt
const nuxt = new Nuxt(config)
expressApp.use(nuxt.render)
if (config.dev) {
    new Builder(nuxt).build()
}

appServer.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})
