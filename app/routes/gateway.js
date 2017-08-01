var router = require('express').Router(); // eslint-disable-line new-cap

var usersCtrl = require('../controllers/users');

router.post('/new', usersCtrl.newGateway);

module.exports = {
  router: router
};
