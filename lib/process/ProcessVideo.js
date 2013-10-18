var ProcessDocument = require('./ProcessDocument'),
  async = require('async'),
  path = require('path');

var ProcessVideo = function () {
  ProcessDocument.apply(this, arguments);
}

ProcessVideo.prototype = Object.create(ProcessDocument.prototype);

ProcessVideo.prototype.getTotalSteps = function () {
  //'makeNormal', 'original', 'setMediaInfo', 'makeThumbnail'
  return 4;
}

ProcessVideo.prototype._getMediaInfo = function (cb) {
  var tmpFileName = this.getTmpFile();
  easyimg.info(tmpFileName, function (err, stdout, stderr) {
    if (err) {
      return cb(err, stderr);
    }
    cb(null, stdout);
  });
}

ProcessVideo.prototype.setMediaInfo = function (cb) {
  var media = this.media;
  var self = this;

  this._getMediaInfo(function (err, info) {
    media.mediaInfo.size = [info.width, info.height];
    self.tick();
    cb(err);
  });
}


ProcessVideo.prototype.run = function (job, cb) {
  var processor = this;
    if (this.getTmpFile() === false) {
      throw new Error('Media temporary file not assigned');
    }
    this.setJobProcessor(job);

    async.parallel([
      async.apply(processor.setMediaInfo.bind(processor)),
    ], function (err, results) {
      cb(err, results);
    });
}

module.exports = ProcessVideo;
