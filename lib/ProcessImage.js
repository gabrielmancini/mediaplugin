var ProcessDocument = require('./ProcessDocument'),
  async = require('async'),
  easyimg = require('easyimage'),
  path = require('path');

var ProcessImage = function () {
  ProcessDocument.apply(this, arguments);
}
console.log(ProcessDocument)
ProcessImage.prototype = Object.create(ProcessDocument.prototype);

ProcessImage.prototype.getTotalSteps = function () {
  //'makeNormal', 'original', 'setMediaInfo', 'makeThumbnail'
  return 4;
}

ProcessImage.prototype._getMediaInfo = function (cb) {
  var tmpFileName = this.getTmpFile();
  easyimg.info(tmpFileName, function (err, stdout, stderr) {
    if (err) {
      return cb(err, stderr);
    }
    cb(null, stdout);
  });
}

ProcessImage.prototype.setMediaInfo = function (cb) {
  var media = this.media;
  var self = this;

  this._getMediaInfo(function (err, info) {
    media.mediaInfo.size = [info.width, info.height];
    self.tick();
    cb(err);
  });
}

ProcessImage.prototype.makeNormal = function (cb) {
  var tmpFileName = this.getTmpFile();
  var media = this.media;
  var dstFile = path.join(this.media.tmp.path, this.media.getSuffixName('normal'));
  var self = this;

  easyimg.resize({
    src: tmpFileName,
    width: this.options.normal.width,
    dst: dstFile,
    quality: 15
  }, function(err, image) {
    if (err) {
      throw err;
    }
    media.available.push('normal');
    self.tick();
    cb(null);
  });
}

ProcessImage.prototype.makeThumbnail = function (cb) {
  var tmpFileName = this.getTmpFile();
  var media = this.media;
  var dstFile = path.join(this.media.tmp.path, this.media.getSuffixName('thumbnail'));
  var self = this;

  easyimg.thumbnail({
      src: tmpFileName,
      dst: dstFile,
      width: this.options.thumbnail.width,
      x: 0, y: 0
    },
    function(err, image) {
      if (err) {
        return cb(err);
      }
      media.available.push('thumbnail');
      self.tick();
      return cb(null);
    }
  );
}

ProcessImage.prototype.run = function (job, cb) {
  var processor = this;
    if (this.getTmpFile() === false) {
      throw new Error('Media temporary file not assigned');
    }
    this.setJobProcessor(job);

    async.parallel([
      async.apply(processor.setMediaInfo.bind(processor)),
      async.apply(processor.original.bind(processor)),
      async.apply(processor.makeNormal.bind(processor)),
      async.apply(processor.makeThumbnail.bind(processor)),
    ], function (err, results) {
      cb(err, results);
    });
}

module.exports = ProcessImage;
