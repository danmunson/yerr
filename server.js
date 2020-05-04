//requires
const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const port = process.env.PORT || 3000;

// express routing
app.use(express.static('public'));


// signaling
io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('join', function(channelID){
        socket.join(channelID);
        socket.emit('successful join', channelID);
    });

    socket.on('alert new joiner', function (comm){
        /* THIS USER is the only recipient
        */
        socket.broadcast.to(comm.channel).emit('new joiner', comm);
        console.log('new joiner: ', comm.channel, comm.sender, io.sockets.adapter.rooms[comm.channel].length);
    });

    socket.on('make offer', function(comm){
        /* Other users are the only recipients
        */
        console.log('make offer ', comm.sender, comm.channel);
        socket.broadcast.to(comm.channel).emit('offer', comm);
    });

    socket.on('make answer', function(comm){
        /* Other users are the only recipients
        */
        console.log('make answer ', comm.sender, comm.channel);
        socket.broadcast.to(comm.channel).emit('answer', comm);
    });

    socket.on('candidate', function (event){
        /* Other users are the only recipients
        */
        console.log("forwarding candidate from", event.sender);
        socket.broadcast.to(event.channel).emit('candidate', event);
    });

});

// listener
http.listen(port || 3000, function () {
    console.log('listening on', port);
});