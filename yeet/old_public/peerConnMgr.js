/*
The PeerConnectionManager is intended only to receive and transmit data reliably.
A PeerConnectionManager instance is not indicative of the abstract network(s) it helps facilitate.
*/ 

class PeerConnectionManager {
    constructor(iceServers){
        this.rtcpc = new RTCPeerConnection(iceServers);
        this.iceConnectionsQueue = new Set();
    }

    requestPeerConnection(recipientID){
        
    }

    reciprocatePeerConnection(recipientID){

    }
}