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

    socket.on('create', function(room){
        console.log('create room ', room);
        socket.join(room);
        socket.emit('created', room);
    });
    
    socket.on('join', function (room) {
        var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        var numClients = myRoom.length;

        console.log('Number of users: ', numClients);
        socket.join(room);
        console.log('New number of users: ', io.sockets.adapter.rooms[room].length);
        socket.emit('joined', room);
    });

    socket.on('ready', function (comm){
        console.log('ready ', comm);
        //socket.broadcast.to(comm.room).emit('ready', comm);
        socket.emit('ready', comm);
    });

    socket.on('offer', function(comm){
        console.log('offer ', comm.room);
        //socket.broadcast.to(comm.room).emit('offer',comm.sdp);
        socket.broadcast.to(comm.room).emit('offer',comm);
    });

    socket.on('answer', function(comm){
        console.log('answer ', comm.room);
        //socket.broadcast.to(comm.room).emit('answer',comm.sdp);
        socket.broadcast.to(comm.room).emit('answer',comm);
    });

    socket.on('candidate', function (event){
        socket.broadcast.to(event.room).emit('candidate', event);
        //socket.emit('candidate', event);
    });

});

// listener
http.listen(port || 3000, function () {
    console.log('listening on', port);
});