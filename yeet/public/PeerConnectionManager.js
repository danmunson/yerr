/*
The PeerConnectionManager is intended only to receive and transmit data reliably.
A PeerConnectionManager instance is not indicative of the abstract network(s) it helps facilitate.
*/ 

var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}

export class PeerConnectionManager {
    constructor(userID, peerInfo, socket, channel, onNewUserStream=null){
        /*
        peerInfo:
            ID = peer equivalent of this.ID
        */
        this.userID = userID;
        this.ID = Math.random().toString();
        this.rtcpc = new RTCPeerConnection(iceServers);
        this.socket = socket;
        this.channel = channel;
        this.peerInfo = peerInfo;

        this.onNewUserStream = onNewUserStream;
        this.iceCandidateQueue = [];
        this.channels = {
            in : {},
            out : {}
        };
        
        function generateOnConnStateChange(self){
            return function(event) {
                console.log("PC State:", self.rtcpc.connectionState);
            }
        }

        function generateOnIceConnStateChange(self){
            return function(event) {
                console.log("ICE State:", self.rtcpc.iceConnectionState);
            }
        }

        this.rtcpc.oniceconnectionstatechange = generateOnIceConnStateChange(this);

        this.rtcpc.onconnectionstatechange = generateOnConnStateChange(this);

        this.rtcpc.onicecandidate = this.generateSetOnIceCandidate(this);

        this.rtcpc.ontrack = this.generateAddUserStream(this);
        
    }

    /* REMEBER
        - icecandidates will be requested once local description is set
        - setRemoteDescription must be called after icecandidates are added
    */

    setOutTrack(trackType, track, stream){
        this.channels.out[trackType] = stream;
        this.rtcpc.addTrack(track, stream);
    }

    sendPeerConnection(){
        this.rtcpc.createOffer().then(sessionDescription => {
            this.rtcpc.setLocalDescription(sessionDescription);
            this.socket.emit(
                'make offer', 
                this.Comm({
                    type: 'offer',
                    sdp: sessionDescription,
                    recipient: this.peerInfo.ID
                })
            );
        }).catch(error => {
            console.log(error);
        });
    }

    reciprocatePeerConnection(comm){
        this.checkIceCandidates();
        this.rtcpc.setRemoteDescription(new RTCSessionDescription(comm.sdp));
        this.rtcpc.createAnswer().then(sessionDescription => {
            this.rtcpc.setLocalDescription(sessionDescription);
            this.socket.emit(
                'make answer', 
                this.Comm({
                    type: 'answer',
                    sdp: sessionDescription,
                    recipient: this.peerInfo.ID
                })
            );
        }).catch(error => {
            console.log(error)
        });
    }

    receivePeerConnection(comm){
        this.checkIceCandidates();
        this.rtcpc.setRemoteDescription(new RTCSessionDescription(comm.sdp));
    }

    // utils
    addIceCandidate(candidate){
        this.rtcpc.addIceCandidate(candidate);
    }

    queueIceCandidate(candidate){
        this.iceCandidateQueue.push(candidate);
    }

    checkIceCandidates(){
        while (this.iceCandidateQueue.length > 0) {
            this.rtcpc.addIceCandidate(
                this.iceCandidateQueue.pop()
            );
        }
    }

    generateSetOnIceCandidate(self){
        return function (event){
            if (event.candidate) {
                console.log('sending ice candidate');
                self.socket.emit('candidate', {
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    channel : self.channel,
                    sender: self.userID,
                    recipient: self.peerInfo.ID
                });
            }
        }
    }

    generateAddUserStream(self){
        return function (event){
            self.channels.in[event.track.kind] = event.streams[0];
            if (self.onNewUserStream){
                self.onNewUserStream(event, event.streams[0]);
            }
        }
    }

    hasRemoteDesc(){
        return (!(this.rtcpc.currentRemoteDescription == null));
    }

    Comm(data=null){
        var obj = {
            sender : this.userID,
            channel : this.channel
        };
        if(data){
            for (var key in data){
                obj[key] = data[key];
            }
        }
        return obj;
    }
    
}