/**
 * This class provides the ability to:
 *      create channel
 *      open channel
 *      populate channels on login
 * 
 * Channel Model:
 *      -name
 *      -id
 *      -participant[k:v] k = participantId, v = participant type (admin,guest)
 * 
 * Flow:
 *      Client onClick "Create" && Fill formFields then:
 *         Server : channels.createChannel(formFields) && return new channel
 * 
 *      Client onLogin then:
 *          Server : getAllChannels.where(userId is participant) && return all channels form query
 * 
 *      Client onClick <<channelID>> then:
 *          Server : populate home with AV channel. {dependency on av module}
 * 
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let ChannelSchema = new Schema({
    name: {type: String, required: true, max: 100},
    channel_id: {type: String, required: true},
    participants: [{
        userId: String
      }]
});


// Export the model
module.exports = mongoose.model('Channel', ChannelSchema);