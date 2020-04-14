// getting dom elements

var myID = Math.random().toString();
var mySession = {};

var divSelectRoom = document.getElementById("selectRoom");
var divConsultingRoom = document.getElementById("consultingRoom");

var btnMakeRoom = document.getElementById("makeRoom");
var makeRoomNumber = document.getElementById("makeNumber");

var btnGoRoom = document.getElementById("goRoom");
var goRoomNumber = document.getElementById("goNumber");

var localVideo = document.getElementById("localVideo");
//var remoteVideo = document.getElementById("remoteVideo");

// variables
var roomNumber; // current room number
var localStream;
var remoteStream;
var rtcPeerConnection;
var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
var streamConstraints = { audio: true, video: true };

function Comm(room, data=null){
    obj = {
        sender : myID,
        room : room
    };
    if(data){
        for (var key in data){
            obj[key] = data[key];
        }
    }
    console.log(obj);
    return obj;
}

// Let's do this
var socket = io();


btnMakeRoom.onclick = function () {
    if (makeRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        var makeNumber = makeRoomNumber.value;
        socket.emit('create', makeNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
        roomNumber = makeNumber;
    }
};


btnGoRoom.onclick = function () {
    if (goRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        var goNumber = goRoomNumber.value;
        socket.emit('join', goNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
        roomNumber = goNumber;
    }
};


// message handlers
socket.on('created', function (room) {
    console.log('created');
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

socket.on('joined', function (room) {
    console.log('user joined room');
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', Comm(room));
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('ready', function (comm) {
    console.log("Ready from", comm.sender);
    if (myID == comm.sender) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                console.log('sdp : ',sessionDescription);
                socket.emit('offer', Comm(comm.room, {
                    type: 'offer',
                    sdp: sessionDescription
                }));
            })
            .catch(error => {
                console.log(error);
            })
    }
});

socket.on('offer', function (comm) {
    console.log("Offer from", comm.sender);
    if (myID != comm.sender) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(comm.sdp));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('answer', Comm(comm.room, {
                    type: 'answer',
                    sdp: sessionDescription
                }));
            })
            .catch(error => {
                console.log(error)
            })
    }
});

socket.on('answer', function (comm) {
    console.log("Answer from", comm.sender);
    if (myID != comm.sender){
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(comm.sdp));
    }  
})

// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}

function onAddStream(event) {
    remoteVideo = newRemoteVideo();
    console.log('adding video ', event);
    remoteVideo.srcObject = event.streams[0];
    //remoteStream = event.stream;
}

function newRemoteVideo(){
    var videoNode = document.createElement("video");
    document.getElementById("consultingRoom").appendChild(videoNode);
    return videoNode;
}