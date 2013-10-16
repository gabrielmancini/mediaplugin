var kue   = require('kue'),
    redis = require('./redis-custom'),
    util  = require('util'),
    EventEmitter = require('events').EventEmitter;

kue.redis.createClient = function () {
  var client = redis.createClient('redis://localhost/2');
  return client;
};

// Must Create Queue After Create Client!!!

/**
 * MessageQueue
 */
function MessageQueue() {
  this.jobs = kue.createQueue();
  return this;
}
util.inherits(MessageQueue, EventEmitter);
module.exports = MessageQueue;

/**
 * Get job by id
 * MessageQueue.getByJobId
 *
 * @param integer  id
 * @param function callback
 */
MessageQueue.prototype.getByJobId = function (id, callback) {
  kue.Job.get(id, callback);
  return this;
};

/**
 * Get job logs by job id
 * MessageQueue.getLogByJobId
 *
 * @param integer  id
 * @param function callback
 */
MessageQueue.prototype.getLogByJobId = function (id, callback) {
  kue.Job.log(id, callback);
  return this;
};

/**
 * Create a new job
 * MessageQueue.addOn
 *
 * @param string name   Job name Ex.: request-friend
 * @param object config Job configuration
 *   Ex.: {
 *     actor: { objectId: 123, objectType: 'person', displayName: 'Foo Name' },
 *     verb: 'request-friend',
 *     object: { objectId: 321, objectType: 'person', displayName: 'Bar Name' }
 *   }
 */
MessageQueue.prototype.addOn = function addOn(name, config, callback) {
  var self = this;

  if (!config) {
    throw new Error('Job configuration is not present.');
  }

  var job = this.jobs.create(name, config);

  job.on('complete', function () {
    self.emit('complete', name);
  }).on('failed', function () {
    self.emit('failed', name);
  }).on('progress', function (progress) {
    self.emit('progress', progress);
  });

  job.save(function (err) {
    if (callback) {
      callback(err, job.id);
    }
  });
  return job;
};

/**
 * Process job
 * MessageQueue.processJob
 *
 * @param string          name   Job name Ex.: request-friend
 * @param integer         amount Job amount of active jobs, default is 1
 * @param processFunction function amount Job amount of active jobs, default is 1
 *   Ex.:
 *     function processFunction(job, done) {
 *       var actorID = job.data.actor.objectId;
 *       var objectID = job.data.actor.objectId;
 *       friendRequestMessage(actorID, objectID, done);
 *     }
 */
MessageQueue.prototype.processJob = function processJob(name, amount, processFunction) {
  var _amount = 1;

  if ('function' === typeof amount) {
    processFunction = amount;
  } else {
    _amount = amount || 1;
  }

  this.jobs.process(name, _amount, processFunction);
};
