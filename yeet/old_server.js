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
    
    socket.on('join', function (room) {
        /* THIS USER is the only recipient
        */
        socket.join(room);
        console.log('New number of users: ', io.sockets.adapter.rooms[room].length);
        socket.emit('joined', room);
    });

    socket.on('ready', function (comm){
        /* THIS USER is the only recipient
        */
        comm['roomSize'] = io.sockets.adapter.rooms[comm.room].length;
        socket.emit('ready', comm);
    });

    socket.on('alert new joiner', function (comm){
        /* THIS USER is the only recipient
        */
        console.log('New Joiner: ', comm.sender);
        socket.broadcast.to(comm.room).emit('new joiner', comm);
    });

    socket.on('make offer', function(comm){
        /* Other users are the only recipients
        */
        console.log('make offer ', comm.sender);
        socket.broadcast.to(comm.room).emit('offer',comm);
    });

    socket.on('make answer', function(comm){
        /* Other users are the only recipients
        */
        console.log('make answer ', comm.sender);
        socket.broadcast.to(comm.room).emit('answer',comm);
    });

    socket.on('candidate', function (event){
        /* Other users are the only recipients
        */
        socket.broadcast.to(event.room).emit('candidate', event);
    });

});

// listener
http.listen(port || 3000, function () {
    console.log('listening on', port);
});