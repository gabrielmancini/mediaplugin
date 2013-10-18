var Process = require('requireindex')( __dirname + '/process');

var ProcessFactory = function () {
  this.types = {};
}

ProcessFactory.prototype.register = function (type, klass) {

  var proto = klass.prototype;
  if ( proto instanceof Process.ProcessDocument ) {
      this.types[type] = klass;
  }
  return this;
}

ProcessFactory.prototype.get = function (type , media, options) {
  var Processor = this.types[type];
  return (Processor ? new Processor(media, options) : null);
}

ProcessFactory.prototype.list = function () {
  return Object.keys(this.types);
}

ProcessFactory.prototype.reset = function () {
  this.types.length = 0;
}

var factory = new ProcessFactory;

factory.register('image', Process.ProcessImage);
factory.register('video', Process.ProcessVideo);

module.exports = factory;
