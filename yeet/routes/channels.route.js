const express = require('express');
const router = express.Router();

// Require the controllers WHICH WE DID NOT CREATE YET!!/Users/sadat/development/yerr/yeet/controllers/channels.controller.js
const channels_controller = require('../controllers/channels.controller');


// a simple test url to check that all of our files are communicating correctly.
router.get('/test', channels_controller.test);

router.post('/createChannel', channels_controller.channel_create);

router.get('/home/:id', channels_controller.channel_find_all_for_user);

module.exports = router;