  var url = require('url'),
      http = require('http'),
      https = require('https'),
      fs = require('fs'),
      path = require('path'),
      crypto = require('crypto'),
      Media = require('../').model,
      _ = require('lodash'),
      async = require('async'),
      mongoose = require('mongoose'),
      temp = require('temp');

  //temp.track();

  /**
   * Process recover password
   */
  function downloadMedia(job, done) {
    var options = job.data || {};
    options = _.extend({
      url: '',
      dirPath: null,
      obj: null,
      time: null,
      fileName: null,
      file: null,
      media: null,
      totalSteps: 14,
      pending: null
    }, options);
    options.pending = options.totalSteps -1

    var parsedUrl = url.parse(options.url);
    var protocol = (parsedUrl.protocol === 'http') ? http : https;

    async.series({
      createTmpDir: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        temp.mkdir('tmp', function(err, _dirPath) {
            options.dirPath = options.dirPath || _dirPath;
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
            return cb(err);
        })
      },

      setAttributes: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        try {
          options.time = options.time || new Date().getTime();
          options.fileName = options.fileName || crypto.createHash('md5').update([options.url, options.time].join('')).digest('hex')
          temp.dir = options.dirPath;
          options.file = options.file || temp.createWriteStream();
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(null);
        } catch (err) {
          return cb(err);
        }
      },

      fillFile: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        options.file.on('finish', function () {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(null);
        })

        options.file.on('error', function (err) {
          return cb(err);
        })

        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        if (options.skip) {
          var wr = fs.createReadStream('.'+options.url);

          wr.pipe(options.file)
            .on('error', function (err) {
              return cb(err);
            });


        } else {

          protocol.get(options.url, function (response) {
            response.pipe(options.file);
          }).on('error', function (err) {
            return cb(err);
          });
        }

      },

      findById: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);

        mongoose.model(options.parent.modelName).findById(
          options.parent.value._id,
          function (err, _obj) {
            options.obj = options.obj || _obj;
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
            return cb(err);
          }
        );
      },

      setMidiaAttributes: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        try {

          options.media = options.media || options.obj.get(options.pathMedia)[0]; // @TODO [].lenght

          options.media.tmp.path = path.dirname(options.file.path);
          options.media.tmp.name = path.basename(options.file.path);
          options.media.setOriginalUrl(options.url);

          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(null);
        } catch (err) {
          return cb(err);
        }

      },

      saveObject: function (cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        options.obj.save(function (err) {
          options.file.close();
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(err);
        });
      },

    }, function(err, results) {
      job.progress(options.totalSteps - options.pending--, options.totalSteps);
      done(err);
    });
    //}
  }


  // Register recover-password processor
module.exports.args = ['media-download', 10, downloadMedia];
