var mongoose = require('mongoose'),
  async = require('async'),
  _ = require('lodash'),
  Schema = mongoose.Schema,
  fs = require('fs'),
  Q = require('q'),
  url = require('url'),
  path = require('path');

  _.str = require('underscore.string');

var mediaTypes = {
  video: {},
  audio: {},
  image: {
    suported_mimes: ['image/jpeg', 'image/gif', 'image/png'],
    available_types: ['backup', 'original', 'normal', 'thumbnail'],
    options: {
      original: {
        nameSuffix: '_o'
      },
      thumbnail: {
        nameSuffix: '_t',
        width: 128 //pixels
      },
      normal: {
        nameSuffix: '_n',
        width: 600 //pixels
      }
    }
  }
};

var hosts = {
  batman: 'http://cdn1.asdasd.asdasd.com'
};

// @TODO validate mime according to `type` property
var MediaSchema = new Schema({
  type: { type: String, 'enum': Object.keys(mediaTypes) },
  mime: { type: String, 'default': ''  },
  available: [{ type: String }],
  url: {
    host: { type: String, 'enum': Object.keys(hosts) },
    path: { type: String, 'default': '' },
    name: { type: String },
    ext: { type: String }
  },
  description: { type: String },
  mediaInfo: {
    size: [{ type: Number }],
    duration: { type: Number }
  },
  position: [{ type: Number }],
  stat: { type: Number, required: true, 'default': 0 },
  tmp: {
    name: String,
    path: String
  },
  original: {
    name: String,
    host: { type: String },
    path: { type: String },
    type: { type: String, 'enum': ['web', 'file'] }
  },
  created: { type: Date, required: true, 'default': Date.now }
});

//Disabled mongraph
MediaSchema.set('graphability', false);


// Virtual fields
MediaSchema.virtual('url.fullpath').get(function () {
  var path = [this.url.path, this.url.name].join('/');
  var serverUrl = hosts[this.url.host];
  if (typeof serverUrl == 'undefined') {
    return ['', path].join('/');
  }
  return [serverUrl, path].join('/');
});


MediaSchema.statics.mediaTypes = mediaTypes;

MediaSchema.methods.getMediaTypeOptions = function() {
  var Media = mongoose.model('Media');
  return Media.mediaTypes[this.type].options;
}

MediaSchema.methods.getSuffixName = function(suffixType) {
  var suffix = this.getMediaTypeOptions()[suffixType].nameSuffix || '';
  return [this.url.name+suffix, this.url.ext].join('.');
}

MediaSchema.methods.getQueue = function() {
  return this._queue;
}

MediaSchema.methods.setQueue = function(queue, jobId) {
  this._queue = queue;
  this._jobId = jobId;
}

MediaSchema.methods.getOriginalUrl = function() {
  return [this.original.host, this.original.path, this.original.name].join('/');
}

MediaSchema.methods.setOriginalUrl = function(_url) {

  var parsedUrl = url.parse(_url);
  this.original.host = [parsedUrl.protocol+'//', parsedUrl.host].join('');
  this.original.name = path.basename(parsedUrl.path);
  this.original.path = path.dirname(parsedUrl.path);

}

MediaSchema.methods.setOptions = function(options) {

  if (!this.parent().pathMedia) {
    throw new Error('object.pathMedia has not been set');
  }

  options = options || {};
  options.pathMedia = options.pathMedia || this.parent().pathMedia;
  options.idMedia = options.idMedia || this._id;
  options.parent = options.parent || {
    modelName: this.parent().constructor.modelName,
    value: {
      _id: this.parent()._id
    }
  };
  return options;
}

MediaSchema.methods.process = function(options, done) {
  var MessageQueue = this.parent().getMediaQueue();
  var queue = new MessageQueue();

  options = this.setOptions(options);

  queue.addOn('media-process', options, function(err, jobId) {
    if (done) {
      done(err, jobId);
    }
  });
  return queue;
}

MediaSchema.methods.download = function(url, options, done) {
  var MessageQueue = this.parent().getMediaQueue();
  var queue = new MessageQueue();

  options = this.setOptions(options);
  options.url = url || this.getOriginalUrl();

  queue.addOn('media-download', options, function(err, jobId) {
    if (done) {
      done(err, jobId);
    }
  });

  return queue;
}

MediaSchema.methods.upload = function(options, done) {
  var MessageQueue = this.parent().getMediaQueue();
  var queue = new MessageQueue();

  options = this.setOptions(options);

  queue.addOn('media-upload', options, function(err, jobId) {
    if (done) {
      done(err, jobId);
    }
  });
  return queue;
}

MediaSchema.statics.responseHandler = function (type, options) {

  var returnMedia = function(job, mediaId, cb) {

    var model = mongoose.model(job.data.parent.modelName);
    model.findById(job.data.parent.value._id, function(err, doc) {
      var media = doc.get(job.data.pathMedia).id(mediaId);
      cb(err, media);
    });

  }

  var sucessHandler = function (value) {

  };

  var failHandler = function (error) {

  };

  var progressHandler = function (value) {

  };

  return {
    sucessHandler: sucessHandler,
    failHandler: failHandler,
    progressHandler: progressHandler
  }

}

MediaSchema.statics.factoryHandler = function(type, options) {

  var types = ['http', 'socket'];
  var Media = mongoose.model('Media');

  var returnMedia = function(job, mediaId, cb) {

    var model = mongoose.model(job.data.parent.modelName);
    model.findById(job.data.parent.value._id, function(err, doc) {
      var media = doc.get(job.data.pathMedia).id(mediaId);
      cb(err, media);
    });

  }

  var completeHandler = function(job, mediaId) {
    return function() {
        returnMedia(job, mediaId, function (err, media) {
        if (type === 'socket') {
  //            socket.send(job.name + '-complete', media);
        } else {
          options.res.send(201, media);
        }
      })
    }
  };

  return function (media) {

    Media.getJobHandler({ media: media }, function (err, job) {

      if (['complete', 'failed'].indexOf(job._state) !== -1) {
        completeHandler(job, media._id);
      } else {
        job.subscribe()
          .on('complete', completeHandler(job, media._id))
          .on('failed', function () {
            if (type === 'socket') {
    //            socket.send(job.name + '-failed', job.error());
            } else {
              options.res.send(500, job.error())
            }
          })
          .on('progress', function (value) {
            console.log('process', value)
            if (type === 'socket') {
    //            socket.send(job.name + '-progress', value);
            }
          });
      }

    });
  }
}

MediaSchema.statics.getJobHandler = function(options, next) {
  var media = options.media;
  var mediaId = media._id;
  media.getQueue().getByJobId(media._jobId, function (err, job) {
    next(err, job);
  });
}

module.exports = mongoose.model('Media', MediaSchema);
