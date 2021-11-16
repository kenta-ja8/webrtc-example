<template>
    <div>
        <h2 class="title is-2">Web会議</h2>

        <div class="web-meeting-area">
            <div class="web-meeting-area-header">
                <div class="menu-left">
                    <button class="button is-info" @click="useLocalVideo" :disabled="localStream">
                        <span class="material-icons">videocam</span>
                        カメラ有効化
                    </button>
                    <button
                        class="button is-info"
                        v-if="!webRTCConnectionManager"
                        :disabled="!localStream"
                        @click="startMeeting"
                    >
                        <span class="material-icons">play_arrow</span>
                        会議開始
                    </button>
                    <button
                        class="button is-info"
                        v-if="webRTCConnectionManager"
                        @click="stopMeeting"
                    >
                        <span class="material-icons">stop</span>
                        会議終了
                    </button>
                </div>
                <div class="menu-right">
                    <video class="local-video" ref="localVideo" autoplay muted playsinline />
                </div>
            </div>
            <div class="web-meeting-area-body">
                <div class="remote-video-box" v-if="webRTCConnectionManager">
                    <div
                        class="remote-video"
                        :style="remoteVideoStyle"
                        v-for="(rtcConnection, remoteClientID, index) in webRTCConnectionManager.rtcConnectionMap"
                        v-bind:key="remoteClientID"
                    >
                        <!-- <h3>remoteClientID: {{ remoteClientID }}</h3> -->
                        <video autoplay playsinline :srcObject.prop="rtcConnection.remoteStream" />
                    </div>
                    <div v-if="Object.keys(webRTCConnectionManager.rtcConnectionMap).length == 0">
                        <p class="has-text-white">会議参加者がいません</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang='ts'>
import Vue from 'vue'
import { WebRTCConnectionManagerClass } from '@/plugins/webrtc-manager'

export default Vue.extend({
    data: function () {
        return {
            localStream: null as unknown as MediaStream,
            webRTCConnectionManager: null as WebRTCConnectionManagerClass | null
        }
    },
    computed: {
        columnCount: function (): number {
            if (!this.webRTCConnectionManager) {
                return 1
            }
            const remoteConnectionCount = Object.keys(this.webRTCConnectionManager.rtcConnectionMap).length
            return Math.ceil(Math.sqrt(remoteConnectionCount))
        },
        remoteVideoStyle: function (): Object {
            const margin = 0
            const maxRate = (100 / this.columnCount) - margin

            return {
                'max-width': maxRate + '%',
                'max-height': maxRate + '%'
            }
        },
    },
    created: function () {
        console.debug('created')
    },
    destroyed: function () {
        console.debug('destroyed')
        this.stopMeeting()
    },
    methods: {
        getRemoteStream: function (rtcConnection: any) {
            console.debug('getRemoteStream')
            const remoteStream = new MediaStream(rtcConnection.localPeerConnection.getReceivers().map((receiver: any) => receiver.track))
            return remoteStream
        },
        useLocalVideo: async function () {
            this.localStream = await window.navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            }).catch((e) => {
                console.error(e)
                throw Error('カメラアクセスに失敗しました。')
            });

            const localVideo = this.$refs.localVideo as HTMLVideoElement
            localVideo.srcObject = this.localStream;
        },
        startMeeting: async function () {
            this.webRTCConnectionManager = this.$newWebRTCConnectionManager(this.localStream)
        },
        stopMeeting: async function () {
            console.debug('stopMeeting')
            this.webRTCConnectionManager?.destroy()
            this.webRTCConnectionManager = null

            this.localStream?.getTracks().forEach(function (track) {
                track.stop();
            });
        }
    }
})
</script>

<style lang='scss' scoped>
.web-meeting-area {
    background-color: #2a2a2a;
    display: block;
    border-radius: 6px;
    box-shadow: 0 0.5em 1em -0.125em rgb(10 10 10 / 10%),
        0 0px 0 1px rgb(10 10 10 / 2%);
}
.web-meeting-area-header {
    background-color: #adadad;
    padding: 0.5rem;
    display: flex;
    justify-content: space-between;
}
.web-meeting-area-body {
    padding: 0.5rem;
    height: 70vh;
}
.remote-video-box {
    display: flex;
    flex-wrap: wrap;
    height: 100%;
}
.remote-video {
    padding: 0.3rem;
    background-color: black;
    text-align: center;
    border: transparent 0.1rem solid;
    background-clip: padding-box;
}
.local-video {
    height: 10vh;
    background-color: black;
}
video {
    max-height: 100%;
    max-width: 100%;
}
</style>