var ProcessImage = require('./ProcessImage');

var ProcessFactory = function (media, options) {
  this.media = media;
  this.options = options;
}

ProcessFactory.prototype.factory = function () {
  var processor = null;
  switch (this.media.type) {
    case 'image':
      processor = new ProcessImage(this.media, this.options);
      break;
    case 'video':
      processor = new ProcessVideo(this.media, this.options);
      break;
    default:
      break;
  }
  if (!processor) {
    throw new Error('Media not supported');
  }
  return processor;
}

module.exports = ProcessFactory;
