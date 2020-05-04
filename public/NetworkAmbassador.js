import {PeerConnectionManager} from './PeerConnectionManager.js'

export class NetworkAmbassador {

    constructor(socket){
        this.ID = Math.random().toString();
        this.socket = socket;
        this.channels = {
            __PERSONAL__ : {}
        };

        this.socket.on("successful join", this.generateSuccessfulJoin(this));
        this.socket.on("new joiner", this.generateMakeOffer(this));
        this.socket.on("offer", this.generateHandleOffer(this));
        this.socket.on("answer", this.generateHandleAnswer(this));
        this.socket.on("candidate", this.generateHandleCandidate(this));
    }

    joinChannel(channelID, localStream, onNewUserStream){
        this.channels[channelID] = {
            onNewUserStream : onNewUserStream,
            localStream : localStream,
            peers : {}
        };
        this.socket.emit("join", channelID);
    }

    generateSuccessfulJoin(self){
        return function(channelID){
            console.log("successful join");
            self.socket.emit("alert new joiner", self.Comm(channelID));
        }
    }

    generateMakeOffer(self){
        return function (comm){
            console.log("New Joiner: ", comm.sender);

            var connection = new PeerConnectionManager(
                self.ID,
                {ID : comm.sender},
                self.socket,
                comm.channel,
                self.channels[comm.channel].onNewUserStream
            );

            connection.setOutTrack(
                'video', 
                self.channels[comm.channel].localStream.getVideoTracks()[0], 
                self.channels[comm.channel].localStream
            );
            connection.setOutTrack(
                'audio',
                self.channels[comm.channel].localStream.getAudioTracks()[0],
                self.channels[comm.channel].localStream
            );
            connection.sendPeerConnection();

            self.channels[comm.channel].peers[comm.sender] = {
                PCM : connection
            };
        }
    }

    generateHandleOffer(self){
        return function(comm){
            
            console.log("Offer from ", comm.sender);
            if (comm.recipient != self.ID) return;

            var connection = new PeerConnectionManager(
                self.ID,
                {ID : comm.sender},
                self.socket,
                comm.channel,
                self.channels[comm.channel].onNewUserStream
            );

            connection.setOutTrack(
                'video', 
                self.channels[comm.channel].localStream.getVideoTracks()[0], 
                self.channels[comm.channel].localStream
            );
            connection.setOutTrack(
                'audio',
                self.channels[comm.channel].localStream.getAudioTracks()[0],
                self.channels[comm.channel].localStream
            );
            connection.reciprocatePeerConnection(comm);

            self.channels[comm.channel].peers[comm.sender] = {
                PCM : connection
            };
        }
    }

    generateHandleAnswer(self){
        return function(comm){
            console.log("answer from", comm.sender)
            if (comm.recipient != self.ID) return;
            var PCM = self.channels[comm.channel].peers[comm.sender].PCM;
            PCM.receivePeerConnection(comm);
        }
    }

    generateHandleCandidate(self){
        return function(event){
            if (event.recipient != self.ID) return;
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: event.label,
                candidate: event.candidate
            });
            var PCM = self.channels[event.channel].peers[event.sender].PCM;
            if (PCM.hasRemoteDesc()) {
                PCM.addIceCandidate(candidate);
            } else {
                PCM.queueIceCandidate(candidate);
            }
        }
    }

    //utils

    Comm(channel, data=null){
        var obj = {
            sender : this.ID,
            channel : channel
        };
        if(data){
            for (var key in data){
                obj[key] = data[key];
            }
        };
        return obj;
    }
    
}