// getting dom elements

globalThis.mySession = {
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

// variables
var localStream;
var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
var outStreamConstraints = { audio: true, video: true };
var selfStreamConstraints = { audio: false, video: true };

function Comm(room, data=null){
    obj = {
        sender : globalThis.mySession.myID,
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
    }
};

socket.on('joined', function (room) {
    /*  THIS USER is the only sender
        Pass audio=false to the stream constraints in order to prevent feedback
    */
    console.log('You joined the room');

    // set local video
    globalThis.mySession.rooms[room] = {}
    navigator.mediaDevices.getUserMedia(selfStreamConstraints).then(function (stream) {
        localVideo.srcObject = stream;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });

    // set outgoing stream
    navigator.mediaDevices.getUserMedia(outStreamConstraints).then(function (stream) {
        localStream = stream;
        console.log("local stream ", stream);
        socket.emit('ready', Comm(room));
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices', err);
    });
});

//breaking up joined and ready is a simple way to handle the case where you are the creator
socket.on('ready', function (comm) {
    /*  THIS USER is the only sender
    */
    // do not send "new joiner alert" if no one else is in the room
    console.log('Ready! Room size is: ', comm.roomSize);
    if (comm.roomSize > 1){
        socket.emit('alert new joiner', comm);
    }
});

socket.on('new joiner', function (comm) {
    /*  Other users are the only senders
    */
    console.log("New Joiner: ", comm.sender);

    globalThis.mySession.rooms[comm.room][comm.sender] = {
        connected : false,
        hasCandidate : false,
        rtcPC : new RTCPeerConnection(iceServers)
    }

    console.log('making offer to ', comm.sender);

    var rtcPeerConnection = globalThis.mySession.rooms[comm.room][comm.sender].rtcPC;
    rtcPeerConnection.onicecandidate = setOnIceCandidate(globalThis.mySession.myID, comm.room);
    rtcPeerConnection.ontrack = addUserStream(comm.sender, comm.room);
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.createOffer()
        .then(sessionDescription => {
            socket.emit('make offer', Comm(comm.room, {
                type: 'offer',
                sdp: sessionDescription
            }));
            rtcPeerConnection.setLocalDescription(sessionDescription);
        })
        .catch(error => {
            console.log(error);
        });
    
    globalThis.mySession.rooms[comm.room][comm.sender].rtcPC = rtcPeerConnection;
});

socket.on('offer', function (comm) {
    /*  Other users are the only senders
    */
    console.log("Offer from ", comm.sender);
    console.log(mySession);

    if (comm.sender in globalThis.mySession.rooms[comm.room]
        && globalThis.mySession.rooms[comm.room][comm.sender].connected
    ) return;

    globalThis.mySession.rooms[comm.room][comm.sender] = {
        connected : true,
        hasCandidate : false,
        rtcPC : new RTCPeerConnection(iceServers)
    }

    console.log('Making answer for ', comm.sender);

    var rtcPeerConnection = globalThis.mySession.rooms[comm.room][comm.sender].rtcPC;
    rtcPeerConnection.onicecandidate = setOnIceCandidate(globalThis.mySession.myID, comm.room);
    rtcPeerConnection.ontrack = addUserStream(comm.sender, comm.room);
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(comm.sdp));
    rtcPeerConnection.createAnswer()
        .then(sessionDescription => {
            socket.emit('make answer', Comm(comm.room, {
                type: 'answer',
                sdp: sessionDescription
            }));
            rtcPeerConnection.setLocalDescription(sessionDescription);
        })
        .catch(error => {
            console.log(error)
        });
    globalThis.mySession.rooms[comm.room][comm.sender].rtcPC = rtcPeerConnection;
});

socket.on('answer', function (comm) {
    /*  Other users are the only senders
        Make sure to not accept answers from users who have already been answered
    */
    console.log("Answer from", comm.sender);
    if (globalThis.mySession.rooms[comm.room][comm.sender].connected) return;

    console.log("Accepting answer from ", comm.sender);
    globalThis.mySession.rooms[comm.room][comm.sender].rtcPC.setRemoteDescription(new RTCSessionDescription(comm.sdp));
    globalThis.mySession.rooms[comm.room][comm.sender].connected = true;
})

socket.on('candidate', function (event) {
    console.log("Candidate from", event.sender);
    if (!(event.sender in globalThis.mySession.rooms[event.room])) return;
    console.log("Accepting candidate from", event.sender);

    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    console.log("mySession ", Object.keys(globalThis.mySession.rooms[Object.keys(globalThis.mySession.rooms)[0]]));
    //if (event.sender in globalThis.mySession.rooms[event.room]) {
    console.log("adding ice candidate");
    globalThis.mySession.rooms[event.room][event.sender].rtcPC.addIceCandidate(candidate);
    //}
});

// handler functions
function setOnIceCandidate(sender, room){
    return function (event){
        if (event.candidate) {
            console.log('sending ice candidate');
            socket.emit('candidate', {
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate,
                room: room,
                sender: sender
            })
        }
    }
}

function addUserStream(userID, room){
    return function (event){
        if ('video' in globalThis.mySession.rooms[room][userID]) return;
        if ('audio' == event.track.kind) return;

        console.log('adding user stream');
        remoteVideo = newRemoteVideo();
        globalThis.mySession.rooms[room][userID]['video'] = remoteVideo;
        remoteVideo.srcObject = event.streams[0];
        console.log("remote stream", event.streams[0]);
    }
}

function newRemoteVideo(){
    var videoNode = document.createElement("video");
    videoNode.autoplay = true;
    document.getElementById("consultingRoom").appendChild(videoNode);
    return videoNode;
}
