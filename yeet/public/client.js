// getting dom elements

var mySession = {
    myID : Math.random().toString(),
    rooms : {}
};

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
        sender : mySession.myID,
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

socket.on('joined', function (room) {
    /* THIS USER is the only sender
    */
    console.log('You joined the room');
    mySession.rooms[room] = {}
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', Comm(room));
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

//breaking up joined and ready is a simple way to handle the case where you are the creator
socket.on('ready', function (comm) {
    /* THIS USER is the only sender
    */
    // do not send "new joiner alert" if no one else is in the room
    console.log('Ready! Room size is: ', comm);
    if (comm.roomSize > 1){
        socket.emit('alert new joiner', comm);
    }
});

socket.on('new joiner', function (comm) {
    /* Other users are the only senders
    */
    console.log("New Joiner: ", comm.sender);

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    mySession.rooms[comm.room][comm.sender] = {
        rtcPC : rtcPeerConnection
    }

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addUserStream(comm.sender, comm.room);
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.createOffer()
        .then(sessionDescription => {
            rtcPeerConnection.setLocalDescription(sessionDescription);
            console.log('sdp : ',sessionDescription);
            socket.emit('make offer', Comm(comm.room, {
                type: 'offer',
                sdp: sessionDescription
            }));
        })
        .catch(error => {
            console.log(error);
        })
});

socket.on('offer', function (comm) {
    /* Other users are the only senders
    */
    console.log("Offer from ", comm.sender);

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    mySession.rooms[comm.room][comm.sender] = {
        rtcPC : rtcPeerConnection
    }

    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = addUserStream(comm.sender, comm.room);
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(comm.sdp));
    rtcPeerConnection.createAnswer()
        .then(sessionDescription => {
            rtcPeerConnection.setLocalDescription(sessionDescription);
            socket.emit('make answer', Comm(comm.room, {
                type: 'answer',
                sdp: sessionDescription
            }));
        })
        .catch(error => {
            console.log(error)
        })
    
});

socket.on('answer', function (comm) {
    /* Other users are the only senders
    */
    console.log("Answer from", comm.sender);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(comm.sdp));
})

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

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

function addUserStream(userID, room){
    return function (event){
        if ('video' in mySession.rooms[room][userID]) return;
        if ('audio' == event.track.kind) return;
        
        remoteVideo = newRemoteVideo();
        console.log('adding video ', event);
        remoteVideo.srcObject = event.streams[0];

        mySession.rooms[room][userID]['video'] = remoteVideo;
        console.log(mySession);
    }
}

function onAddStream(event) {
    remoteVideo = newRemoteVideo();
    console.log('adding video ', event);
    remoteVideo.srcObject = event.streams[0];
}

function newRemoteVideo(){
    var videoNode = document.createElement("video");
    videoNode.autoplay = true;
    document.getElementById("consultingRoom").appendChild(videoNode);
    return videoNode;
}