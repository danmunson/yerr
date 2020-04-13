// getting dom elements

var myID = (Math.random() * 1000000).toString();

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
var isCaller;

var Comm = class {
    constructor(room, data=null){
        this.sender = myID;
        this.room = room;
        if(data){
            for (var key in data){
                this[key] = data[key];
            }
        }
    }
};

// Let's do this
var socket = io();


btnMakeRoom.onclick = function () {
    if (makeRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        roomNumber = makeRoomNumber.value;
        socket.emit('create', makeNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
    }
};


btnGoRoom.onclick = function () {
    if (goRoomNumber.value === '') {
        alert("Please type a room number")
    } else {
        roomNumber = goRoomNumber.value;
        socket.emit('join', goNumber);
        divSelectRoom.style = "display: none;";
        divConsultingRoom.style = "display: block;";
    }
};


// message handlers
socket.on('created', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', new Comm(room));
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
    if (myID == commsender) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
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
    if (myID != comm.sender) {
        var event = comm.event;
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
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

socket.on('answer', function (event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
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
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.stream;
}