
import {NetworkAmbassador} from './NetworkAmbassador.js'

var outStreamConstraints = { audio: true, video: true };
var selfStreamConstraints = { audio: false, video: true };

export class UXManager {

    constructor(socket){
        this.NetworkAmbassador = new NetworkAmbassador(socket);
        this.domain = document.getElementById("DOMAIN");
        this.localVideo = document.getElementById("localVideo");
        this.localStream = 0;
        this.renderNodes = {};
        this.setupInput();
    }
    
    setupInput(){
        var btnGoRoom = document.getElementById("goRoom");
        var goRoomNumber = document.getElementById("roomId");
        var divSelectRoom = document.getElementById("selectRoom");
        var divHomeChannel = document.getElementById("homeChannel");

        function onClickGenerator(self) {
            return function (){
                if (goRoomNumber.value === '') {
                    alert("Please type a room number")
                    return;
                }

                console.log(self);
                
                divSelectRoom.style = "display: none;";
                divHomeChannel.style = "display: block;";
                var goNumber = goRoomNumber.value;
                
                // set local video
                navigator.mediaDevices.getUserMedia(selfStreamConstraints).then(function(stream) {
                    console.log('setting local srcObject');
                    self.localVideo.srcObject = stream;
                }).catch(function (err) {
                    console.log('An error ocurred when accessing media devices', err);
                });

                // set outgoing stream
                navigator.mediaDevices.getUserMedia(outStreamConstraints).then(function (stream) {
                    self.localStream = stream;
                    console.log(self.localStream);
                    self.NetworkAmbassador.joinChannel(
                        goNumber,
                        self.localStream,
                        self.generateOnNewUserStream(self)
                    );
                }).catch(function (err) {
                    console.log('An error ocurred when accessing media devices', err);
                });
            
            };
        }

        btnGoRoom.onclick = onClickGenerator(this);
    }

    generateOnNewUserStream(self){
        // currently only returning homeroom option
        return function(event, stream) {
            console.log("adding remote stream", stream);
            var vid = Object.keys(self.renderNodes).length + 1;

            var renderNode = self.newRemoteVideo(
                vid,
                document.getElementById("homeChannel"),
                stream,
                event
            );
            self.renderNodes[vid] = renderNode;
        }
    }

    newRemoteVideo(videoID, parentNode, stream, event){
        console.log('track type', event.track.kind);
        if ('audio' == event.track.kind) return;

        var videoNode = document.createElement("video");
        videoNode.autoplay = true;
        videoNode.id = videoID.toString();

        parentNode.appendChild(videoNode);
        videoNode.srcObject = stream;
        return videoNode;
    }
}