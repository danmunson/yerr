const Channel = require('../models/channels.model');

//Simple version, without validation or sanitation
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.channel_create = function (req, res, next) {
    let channel = new Channel(
        {
            name: req.body.name,
            channel_id: req.body.channel_id,
            participants: [{
                userId: req.body.participants
              }]
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