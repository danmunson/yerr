const Channel = require('../models/channels.model');

//Simple version, without validation or sanitation
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.channel_create = function (req, res, next) {
    let participantsArray = req.body.participants.split(',');
    let channel = new Channel(
        {
            name: req.body.name,
            channel_id: req.body.channel_id,
            participants: {
                userId: participantsArray
              }
        }
    );
    console.log(channel)
    channel.save(function (err) {
        if (err) {
            return next(err);
        }
        res.send('channel Created successfully')
    })
};

exports.channel_find_all_for_user = function (req, res, next) {

    Channel.find({ 'participants.userId' : { $in: req.params.id } }, 'channel_id' ,function(err, data){
        if (err) {
            return next(err);
        }
        console.log(data)
        //res.send(data)
        res.render('home', { channels: data })
    });
};