import https from 'https'
import http from 'http'
import express from 'express'
const expressApp = express()
import expressWs from 'express-ws'
import * as ws from 'ws';
import { WS_SERVER_ENDPOINT, WS_CLIENT_ENDPOINT } from '../share/constant'


export const createWebMeetingRouter = (appServer: http.Server | https.Server) => {
    const webMeetingClientWSMap: { [key: string]: ws.WebSocket } = {}
    const { app } = expressWs(expressApp, appServer)


    app.ws('/api/web-meeting', function (ws, req) {

        // WebSocketメッセージ到達時、メッセージに応じた処理
        const endpointFunctionMap: { [key: string]: Function } = {
            [WS_SERVER_ENDPOINT.OFFER_GET_REMOTE_ID_LIST]: (data: any) => {
                console.debug('OFFER_GET_REMOTE_ID_LIST')
                ws.send(JSON.stringify({
                    fromClientID: data.fromClientID,
                    toClientID: data.toClientID,
                    remoteClientIDList: Object.keys(webMeetingClientWSMap),
                    program: WS_CLIENT_ENDPOINT.OFFER_CREATE_SDP
                }))
                webMeetingClientWSMap[data.fromClientID] = ws
            },
            [WS_SERVER_ENDPOINT.OFFER_PUT_SDP]: (data: any) => {
                console.debug('OFFER_PUT_SDP')
                const targetClientWS = webMeetingClientWSMap[data.toClientID]
                targetClientWS.send(JSON.stringify({
                    fromClientID: data.fromClientID,
                    toClientID: data.toClientID,
                    offerSDP: data.offerSDP,
                    program: WS_CLIENT_ENDPOINT.ANSWER_CREATE_SDP
                }))
            },
            [WS_SERVER_ENDPOINT.ANSWER_PUT_SDP]: (data: any) => {
                console.debug('ANSWER_PUT_SDP')
                const targetClientWS = webMeetingClientWSMap[data.toClientID]
                targetClientWS.send(JSON.stringify({
                    fromClientID: data.fromClientID,
                    toClientID: data.toClientID,
                    program: WS_CLIENT_ENDPOINT.OFFER_SET_SDP,
                    answerSDP: data.answerSDP
                }))
            },
            [WS_SERVER_ENDPOINT.OFFER_PUT_CANDIDATE]: (data: any) => {
                console.debug('OFFER_PUT_CANDIDATE')
                const targetClientWS = webMeetingClientWSMap[data.toClientID]
                targetClientWS.send(JSON.stringify({
                    fromClientID: data.fromClientID,
                    toClientID: data.toClientID,
                    program: WS_CLIENT_ENDPOINT.SET_REMOTE_CANDIDATE,
                    candidate: data.candidate
                }))
            },
            [WS_SERVER_ENDPOINT.ANSWER_PUT_CANDIDATE]: (data: any) => {
                console.debug('ANSWER_PUT_CANDIDATE')
                const targetClientWS = webMeetingClientWSMap[data.toClientID]
                targetClientWS.send(JSON.stringify({
                    fromClientID: data.fromClientID,
                    toClientID: data.toClientID,
                    program: WS_CLIENT_ENDPOINT.SET_REMOTE_CANDIDATE,
                    candidate: data.candidate
                }))
            },
            [WS_SERVER_ENDPOINT.DESTROY_WS]: (data: any) => {
                console.debug('DESTROY_WS')
                ws.close()
            },
        }
        // WebSocketメッセージ到達時の処理
        ws.on('message', (msg) => {
            const data = JSON.parse(msg as unknown as string)
            console.debug('on ws data:', data);
            // console.debug(Object.keys(webMeetingClientWSMap));

            const targetEndpontFunction = endpointFunctionMap[data.program]
            if (!targetEndpontFunction) {
                console.error('not found targetEndpontFunction: ', data.program)
            }
            try {
                targetEndpontFunction(data)
            } catch (e) {
                console.error('targetEndpontFunction error: ', e)
            }

        });
        ws.on('open', function () {
            console.debug('open');
        });
        ws.on('close', function () {
            console.debug('close');
            // client削除
            const closedClientID = Object.keys(webMeetingClientWSMap).find((webMeetingClientID => {
                return webMeetingClientWSMap[webMeetingClientID] == ws
            }))
            if (closedClientID) {
                delete webMeetingClientWSMap[closedClientID]
                for (const clientID of Object.keys(webMeetingClientWSMap)) {
                    const targetClientWS = webMeetingClientWSMap[clientID]
                    targetClientWS.send(JSON.stringify({
                        fromClientID: closedClientID,
                        toClientID: clientID,
                        program: WS_CLIENT_ENDPOINT.KILL_CONNECTION,
                    }))
                }
            }
        });
    });
    app.get('/getJSON', (req, res) => {
        res.json({ data: 'test' })
    })
    return app
}
