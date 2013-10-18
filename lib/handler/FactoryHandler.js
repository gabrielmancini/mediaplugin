var mongoose = require('mongoose');

var FactoryHandler = function(type, options) {

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

  return function (response) {
    var media = response.media;
    var promise = response.promise;
    FactoryHandler.getJobHandler({ media: media }, function (err, job) {

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

FactoryHandler.getJobHandler = function(options, next) {
  var media = options.media;
  var mediaId = media._id;
  media.getQueue().getByJobId(media._jobId, function (err, job) {
    next(err, job);
  });
}

module.exports = FactoryHandler;
