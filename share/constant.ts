

export const WS_SERVER_ENDPOINT = {
    OFFER_GET_REMOTE_ID_LIST: 'OFFER_GET_REMOTE_ID_LIST',
    OFFER_PUT_SDP: 'OFFER_PUT_SDP',
    ANSWER_PUT_SDP: 'ANSWER_PUT_SDP',
    OFFER_PUT_CANDIDATE: 'OFFER_PUT_CANDIDATE',
    ANSWER_PUT_CANDIDATE: 'ANSWER_PUT_CANDIDATE',
    DESTROY_WS: 'DESTROY_WS',
} as const
export type TWSServerEndpont = typeof WS_SERVER_ENDPOINT[keyof typeof WS_SERVER_ENDPOINT];

export const WS_CLIENT_ENDPOINT = {
    OFFER_CREATE_SDP: 'OFFER_CREATE_SDP',
    ANSWER_CREATE_SDP: 'ANSWER_CREATE_SDP',
    SET_REMOTE_CANDIDATE: 'SET_REMOTE_CANDIDATE',
    OFFER_SET_SDP: 'OFFER_SET_SDP',
    KILL_CONNECTION: 'KILL_CONNECTION',
} as const
export type TWSClientEndpont = typeof WS_CLIENT_ENDPOINT[keyof typeof WS_CLIENT_ENDPOINT];

