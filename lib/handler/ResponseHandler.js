var mongoose = require('mongoose');

var ResponseHandler = function (type, options) {
  this.type = type;
  this.options = options;
  this.types = ['http', 'socket'];
}

ResponseHandler.prototype.sucessHandler = function (param) {
  var self = this;
  var obj = param.obj;
  var getMethod = param.getMethod;
  var mediaId = param.mediaId;
  var model = mongoose.model(obj.constructor.modelName);

  model.findById(obj._id, function(err, doc) {
    var media = doc[getMethod](mediaId);
    if (self.type === 'socket') {
    //            socket.send(job.name + '-complete', media);
    } else {
      self.options.res.send(201, media);
    }
  });

};

ResponseHandler.prototype.failHandler = function (error) {

  if (this.type === 'socket') {
  // socket.send(job.name + '-complete', media);
  } else {
    this.options.res.send(500, error);
  }

};

ResponseHandler.prototype.progressHandler = function (value) {
  if (this.type === 'socket') {
    //console.log('progress', value)
    // socket.send(job.name + '-complete', media);
  }
};


module.exports = ResponseHandler;
