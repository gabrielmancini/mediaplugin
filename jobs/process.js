
  var temp = require("temp"),
    mimeMagic = require('mime-magic'),
    mime = require('mime'),
    easyimg = require('easyimage'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    async = require('async'),
    ProcessFactory = require('../lib/ProcessFactory'),
    crypto = require('crypto');
  //temp.track();

  function processMedia(job, next) {

    var MediaPlugin = require('../');

    var mongoose = MediaPlugin.getMongoose(),
        Media = MediaPlugin.get('model');

    var options = job.data || {};


    var processTotalSteps = 15;
    var downloadTotalSteps = 16;
    var uploadTotalSteps = 2;


    options = _.merge({
      pathMedia: null,
      idMedia: null,
      parent: {
        modelName: null,
        value: {
          _id: null
        }
      },
      media: null,
      mediaType: null,
      supportedMimeTypes: null,
      processor: null,
      processOptions: null,
      output: null,
      tmpFileName: null,
      aws: {
        s3: {
          buckets: []
        }
      },
      totalSteps: 0,
      pending: -1
    }, options);



    var findMediaByIdParent = function (cb) {
      mongoose.model(options.parent.modelName).findById(
        options.parent.value._id,
        function (err, _obj) {
          options.parent.value = _obj;
          options.media = _obj.get(options.pathMedia).id(options.idMedia);
          if (options.processor) {
            options.processor.refreshMedia(options.media);
          }
          return cb(err);
        }
      );

    }

    async.series({

      findMediaByIdParent: findMediaByIdParent,

      validateOutput: function (done) {

        var availableTypes = Media.mediaTypes[options.media.mediaType].available_types;
        if (options.output === 'all') {
          options.output = availableTypes;
        } else {
          var difference = _.difference(options.output, availableTypes);
          if (difference.length > 0) {
            throw new Error('type(s): ' + difference + ' unsuported');
          };
        }
        done(null);
      },

      setProcessor: function (done) {
        var processor = ProcessFactory.get(options.media.mediaType, options.media, options.processOptions);
        options.totalSteps += processTotalSteps;
        options.totalSteps += downloadTotalSteps;
        options.totalSteps += uploadTotalSteps + (7 * options.output.length);
        options.totalSteps += (processor.getTotalSteps() * options.output.length);

        options.pending = options.totalSteps -1;

        options.processor = processor;
        done(null);
      },

      download: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        var containerObj = options.parent.value;

        var customGetMethod = containerObj.customGetMethod[options.pathMedia];

        var fnDownload = customGetMethod
          .apply(containerObj, [options.idMedia])
          .download(options.media.getOriginalUrl(), { skip: (options.media.original.origin !== 'web') });

        fnDownload.on('complete', function () {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          done(null);
        }).on('failed', function (err) {
          done('error on: '+err);
        }).on('progress', function (value) {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
        });
      },

      findMediaByIdParentAgain: findMediaByIdParent,

      statFile: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        options.tmpFileName = path.join(options.media.tmp.path, options.media.tmp.name);
        fs.stat(options.tmpFileName, function (err, stat) {
          if (err) {
            return done(err);
          }
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return done(null);
        });
      },

      validateFile: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        mimeMagic(options.tmpFileName, function(err, type) {
          options.mediaType = Media.mediaTypes[options.media.mediaType],
          options.supportedMimeTypes = options.mediaType.suported_mimes;
          options.media.mime = type;

          if (options.supportedMimeTypes.indexOf(type) >= 0 ) {
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
            done(null);
          } else {
            err = new Error('file type not suported');
            done(err);
          }
        });
      },

      process: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        var time = new Date().getTime();
        var fileName = crypto.createHash('md5').update([options.tmpFileName, time].join('')).digest('hex')

        options.media.url.name = fileName;
        options.media.url.ext = mime.extension(options.media.mime);
        options.media.url.host = 'batman'; //@FIXME: Get Host based on Activity
        options.media.url.path = options.pathMedia.split('.').join('/');

        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        options.processor.run(job, function (err, results) {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          done(err);
        });
      },

      saveObject: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        var containerObj = options.parent.value;
        containerObj.save(function (err) {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return done(err);
        });
      },

      uploadFiles: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        var containerObj = options.parent.value;
        var customGetMethod = containerObj.customGetMethod[options.pathMedia];

        customGetMethod
          .apply(containerObj, [options.idMedia])
          .upload(options.aws)
          .on('complete', function () {
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
            done(null);
          }).on('failed', function () {
            done(new Error('error on upload'));
          }).on('progress', function (value) {
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
          });
      },

      updateStat: function (done) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        var containerObj = options.parent.value;
        options.media.stat = 100;
        containerObj.save(function (err) {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return done(err);
        });
      }

    }, function(err, results) {
      job.progress(options.totalSteps - options.pending--, options.totalSteps);
      next(err, results);
    });
  }

  // Register media upload processor
module.exports.args = ['media-process', 50, processMedia];
