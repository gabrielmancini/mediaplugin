var _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

var ProcessDocument = function (media, options) {
  var defaultOptions = {};
  this.media = media;
  this.options = _.extend(options, defaultOptions);
  //this.tmpFileName = path.join(this.media.tmp.path, this.media.tmp.name);
}

ProcessDocument.prototype.getTotalSteps = function () {
  return 0;
}

ProcessDocument.prototype.setJobProcessor = function (job) {
  this.jobProcessor = job;
}

ProcessDocument.prototype.refreshMedia = function (media) {
  if (this.media._id.toString() !== media._id.toString()) {
    throw new Error('Media mismatch');
  }
  this.media = media;
}

ProcessDocument.prototype.tick = function () {
  if (!this.jobProcessor) {
    throw new Error('Processor not set');
  }
  if (this.totalSteps) {
    this.jobProcessor.progress(options.totalSteps - options.pending--, options.totalSteps);
  }
}

ProcessDocument.prototype.getTmpFile = function () {
  if (this.media.tmp.path) {
    return path.join(this.media.tmp.path, this.media.tmp.name);
  }
  return false;
}

ProcessDocument.prototype.run = function() {
  throw new Error('Not implemented');
}

ProcessDocument.prototype._getMediaInfo = function() {
  throw new Error('Not implemented');
}

ProcessDocument.prototype.setMediaInfo = function() {
  throw new Error('Not implemented');
}

ProcessDocument.prototype.original = function (cb) {
  var self = this;
  var media = this.media;
  var tmpFileName = this.getTmpFile();
  var dstFile = path.join(this.media.tmp.path, this.media.getSuffixName('original'));

  var wr = fs.createReadStream(tmpFileName);
  wr.pipe(fs.createWriteStream(dstFile));
  wr.on('error', function (err) {
    cb(err);
  }).on('close', function () {
    self.tick();
    media.available.push('original');
    cb(null);
  });
}

// Static

module.exports = ProcessDocument;
