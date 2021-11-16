import Vue from 'vue'
const RTCPeerConnection = require('wrtc').RTCPeerConnection;
import * as uuid from 'uuid'
import { w3cwebsocket } from 'websocket'
const W3CWebSocket = w3cwebsocket
import { WS_SERVER_ENDPOINT, WS_CLIENT_ENDPOINT } from '@/share/constant'


export class WebRTCConnectionManagerClass {
    public wsClient = null as unknown as w3cwebsocket
    public localClientID = uuid.v4()
    public rtcConnectionMap: { [key: string]: WebRTCConnectionClass } = {}
    private sendByWS = null as any

    constructor(public localStream: MediaStream) {
        console.debug('WebRTCConnectionManagerClass constructor')
        this.connectWS()
    }
    public createRTCConnection(remoteClientID: string) {
        const webRTCConnection = new WebRTCConnectionClass(this.localClientID, remoteClientID, this.localStream, this.sendByWS)
        Vue.set(this.rtcConnectionMap, remoteClientID, webRTCConnection)
        return webRTCConnection
    }
    public getRTCConnection(remoteClientID: string) {
        return this.rtcConnectionMap[remoteClientID]

    }
    public removeRTCConnection(remoteClientID: string) {
        Vue.delete(this.rtcConnectionMap, remoteClientID)
    }
    public destroy() {
        this.sendByWS({
            fromClientID: this.localClientID,
            toClientID: 'All',
            program: WS_SERVER_ENDPOINT.DESTROY_WS
        })
    }
    private async connectWS() {
        console.debug('call ws-controller start')
        const self = this

        const endpointFunctionMap: { [key: string]: Function } = {
            [WS_CLIENT_ENDPOINT.OFFER_CREATE_SDP]: (data: any, endpoint: string) => {
                // Offer側
                // Video要素作成、SDP作成して送信
                for (const remoteClientID of data.remoteClientIDList) {
                    const rtcConnection = self.createRTCConnection(remoteClientID)
                    rtcConnection.createLocalOfferDescription()
                }
            },
            [WS_CLIENT_ENDPOINT.ANSWER_CREATE_SDP]: (data: any) => {
                // Aswer側
                // Offer側のSDPの設定、SDP作成して送信
                const rtcConnection = self.createRTCConnection(data.fromClientID)
                rtcConnection.createLocalAnswerDescription(data.offerSDP)
            },
            [WS_CLIENT_ENDPOINT.SET_REMOTE_CANDIDATE]: (data: any) => {
                // Offfer＆Aswer
                // リモートのCandidateを設定
                const targetRemoteRTC = self.getRTCConnection(data.fromClientID)
                targetRemoteRTC.setRemoteCandidate(data.candidate)
            },
            [WS_CLIENT_ENDPOINT.OFFER_SET_SDP]: (data: any) => {
                // Offer側
                // Answer側のSDPを設定
                const targetRemoteRTC = self.getRTCConnection(data.fromClientID)
                targetRemoteRTC.setRemoteSDP(data.answerSDP)
            },
            [WS_CLIENT_ENDPOINT.KILL_CONNECTION]: (data: any) => {
                // Offfer＆Aswer
                // RTCConnectionの削除
                self.removeRTCConnection(data.fromClientID)
            },

        }
        const host = window.location.host;
        const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:'
        const path = '/api/web-meeting'

        self.wsClient = new W3CWebSocket(`${protocol}//${host}${path}`);
        self.wsClient.onmessage = (message) => {
            console.debug('onmessage:', message)
            const data: any = JSON.parse(message.data as string)

            const targetEndpontFunction = endpointFunctionMap[data.program]
            if (!targetEndpontFunction) {
                console.error('not found targetEndpontFunction')
                throw Error('WebSocket経由で呼ばれた関数が存在しません。')
            }
            try {
                console.debug(data.program)
                targetEndpontFunction(data)
            } catch (e) {
                console.error('targetEndpontFunction error:', e)
                throw Error('WebSocket経由で呼ばれた関数実行中にエラーが発生しました')
            }
        }
        self.wsClient.onopen = async () => {
            console.debug('open')
            self.sendByWS({
                fromClientID: self.localClientID,
                toClientID: self.localClientID,
                program: WS_SERVER_ENDPOINT.OFFER_GET_REMOTE_ID_LIST
            })
        }
        self.wsClient.close = () => {
            console.debug('close')
        }

        this.sendByWS = (obj: any) => {
            const message = {
                clientID: this.localClientID,
                ...obj
            }
            this.wsClient.send(JSON.stringify(message))
        }
    }
}
export class WebRTCConnectionClass {

    public localPeerConnection: RTCPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.webrtc.ecl.ntt.com:3478' }],
        sdpSemantics: 'unified-plan'
    });
    public remoteStream: MediaStream = null as unknown as MediaStream


    constructor(public localClientID: string, public remoteClientID: string, public localStream: MediaStream, private sendByWS: Function) {
        const self = this
        this.localPeerConnection.close = function () {
            console.debug('close')
            window.$nuxt.$emit('rtc:closeConnection', self.remoteClientID)
        };
        this.localStream.getTracks().forEach(track => this.localPeerConnection.addTrack(track, this.localStream));
        this.remoteStream = new MediaStream(this.localPeerConnection.getReceivers().map((receiver: any) => receiver.track))
    }
    public async createLocalOfferDescription() {
        console.log('createLocalOfferDescription')
        const self = this

        let logCandidateList: Array<RTCIceCandidate | null> = []
        async function onIceCandidate(event: RTCPeerConnectionIceEvent) {
            // candiate
            console.debug('candiate: ', event.candidate)
            logCandidateList.push(event.candidate)
            if (!event.candidate) {
                console.debug('candiate ip:', logCandidateList.map(candidate => candidate))
                logCandidateList = []
                self.localPeerConnection.removeEventListener('icecandidate', onIceCandidate);
                return

            }
            self.sendByWS({
                fromClientID: self.localClientID,
                toClientID: self.remoteClientID,
                program: WS_SERVER_ENDPOINT.OFFER_PUT_CANDIDATE,
                candidate: event.candidate
            })
        }
        self.localPeerConnection.addEventListener('icecandidate', onIceCandidate);


        const audioTransceiver = self.localPeerConnection.addTransceiver('audio');
        const videoTransceiver = self.localPeerConnection.addTransceiver('video');

        const offerSDP = await self.localPeerConnection.createOffer(); // start explore candiate
        console.debug('offerSDP: ', offerSDP)
        await self.localPeerConnection.setLocalDescription(offerSDP);
        this.sendByWS({
            fromClientID: this.localClientID,
            toClientID: this.remoteClientID,
            offerSDP,
            program: WS_SERVER_ENDPOINT.OFFER_PUT_SDP
        })
    }
    public async createLocalAnswerDescription(remoteOfferSDP: any) {
        console.debug('createLocalAnswerDescription')
        const self = this

        let logCandidateList: Array<RTCIceCandidate | null> = []
        async function onIceCandidate(event: RTCPeerConnectionIceEvent) {
            // candiate
            console.log('candiate: ', event.candidate)
            logCandidateList.push(event.candidate)
            if (!event.candidate) {
                console.log('candiate ip:', logCandidateList.map(candidate => candidate?.address))
                logCandidateList = []
                self.localPeerConnection.removeEventListener('icecandidate', onIceCandidate);
                return

            }
            self.sendByWS({
                fromClientID: self.localClientID,
                toClientID: self.remoteClientID,
                program: WS_SERVER_ENDPOINT.ANSWER_PUT_CANDIDATE,
                candidate: event.candidate
            })
        }
        self.localPeerConnection.addEventListener('icecandidate', onIceCandidate);


        const audioTransceiver = self.localPeerConnection.addTransceiver('audio');
        const videoTransceiver = self.localPeerConnection.addTransceiver('video');

        this.setRemoteSDP(remoteOfferSDP)
        console.debug('createAnswer(remoteOfferSDP):', remoteOfferSDP)
        const answerSDP = await self.localPeerConnection.createAnswer();
        console.log('answer: ', answerSDP)
        await self.localPeerConnection.setLocalDescription(answerSDP);
        this.sendByWS({
            fromClientID: this.localClientID,
            toClientID: this.remoteClientID,
            answerSDP,
            program: WS_SERVER_ENDPOINT.ANSWER_PUT_SDP
        })
    }
    public async setRemoteSDP(SDP: any) {
        console.debug('setRemoteSDP:', SDP)
        this.localPeerConnection.setRemoteDescription(SDP)
    }
    public async setRemoteCandidate(candidate: any) {
        console.debug('setRemoteCandidate:', candidate)
        this.localPeerConnection.addIceCandidate(candidate)
    }
}


const newWebRTCConnectionManager = function (localStream: MediaStream) {
    return new WebRTCConnectionManagerClass(localStream)
}
Vue.prototype.$newWebRTCConnectionManager = newWebRTCConnectionManager


declare module 'vue/types/vue' {
    interface Vue {
        $newWebRTCConnectionManager: typeof newWebRTCConnectionManager
    }
}


