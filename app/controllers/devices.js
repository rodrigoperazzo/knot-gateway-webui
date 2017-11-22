var users = require('../models/users');
var DevicesService = require('../services/devices').DevicesService;
var FogService = require('../services/fog').FogService;

var isNotAllowed = function isNotAllowed(device) {
  return !device.allowed;
};

var mapToDevice = function mapToDevice(fogDevice) {
  return {
    uuid: fogDevice.uuid,
    allowed: true,
    name: fogDevice.name,
    online: fogDevice.online,
    mac: fogDevice.mac
  };
};

var findFogDeviceMac = function findFogDeviceMac(fogDevice, radioDevices) {
  var sameDevice = radioDevices.find(function hasName(radioDevice) {
    return radioDevice.name === fogDevice.name;
  });
  if (sameDevice) {
    return sameDevice.mac;
  }
  return null;
};

var updateWithRadioDevices = function updateWithRadioDevices(fogDevices, radioDevices) {
  return fogDevices
    .map(function update(fogDevice) {
      var mac = findFogDeviceMac(fogDevice, radioDevices);
      fogDevice.mac = mac;
      return fogDevice;
    });
};

var buildDevices = function buildDevices(radioDevices, fogDevices) {
  var allowedDevices = updateWithRadioDevices(fogDevices, radioDevices).map(mapToDevice);
  var notAllowedDevices = radioDevices.filter(isNotAllowed);
  return allowedDevices.concat(notAllowedDevices);
};

var list = function list(req, res, next) {
  var devicesSvc = new DevicesService();
  var fogSvc = new FogService();
  users.getUserByUUID(req.user.uuid, function onUser(userErr, user) {
    if (userErr) {
      next(userErr);
    } else {
      devicesSvc.list(user, function onDevicesReturned(deviceErr, radioDevices) {
        if (deviceErr) {
          next(deviceErr);
        } else {
          fogSvc.getDevices(user, function onFogDevicesReturned(fogErr, fogDevices) {
            var devices;
            if (fogErr) {
              next(fogErr);
            } else {
              devices = buildDevices(radioDevices, fogDevices);
              res.json(devices);
            }
          });
        }
      });
    }
  });
};

var update = function update(req, res, next) {
  var device = {
    mac: req.params.id,
    name: req.body.name,
    allowed: req.body.allowed
  };
  var devicesSvc = new DevicesService();
  var fogSvc = new FogService();
  users.getUserByUUID(req.user.uuid, function onUser(userErr, user) {
    if (userErr) {
      next(userErr);
    } else {
      devicesSvc.update(device, function onDevicesUpdated(devicesErr, updated) {
        if (devicesErr) {
          next(devicesErr);
        } else if (!updated) {
          res.sendStatus(500); // TODO: verify in which case a device isn't updated
        } else if (!device.allowed) {
          fogSvc.removeDevice(user, req.body.uuid, function onDeviceRemoved(fogErr) {
            if (fogErr) {
              next(fogErr);
            } else {
              res.end();
            }
          });
        } else {
          res.end();
        }
      });
    }
  });
};

module.exports = {
  list: list,
  update: update
};
