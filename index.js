
var mongoose, queue, aws;

var init = function (options) {
  if (!options.mongoose) {
    throw new Error('Mongoose option not found');
  }
  mongoose = options.mongoose;

  if (options.queue) {
    queue = options.queue;
  }

  if (options.aws) {
    aws = options.aws;
  }

  module.exports.plugin = require('./plugin')(mongoose);

  module.exports.model = require('./model/media')(mongoose);

  module.exports.jobs = require('./jobs');

  module.exports.factory = require('./lib/ProcessFactory');

  module.exports.handler = require('./lib/handler');

};

module.exports = {
  init: init,
  get: function (idx) {
    if (!idx) {
      throw new Error('get must be specified [ plugin | model | jobs | factory | hundler ] ');
    }
    return module.exports[idx];
  },
  getMongoose: function () {
    return mongoose;
  },
  getAws: function () {
    return aws;
  },
  getQueue: function () {
    return queue;
  },
};

