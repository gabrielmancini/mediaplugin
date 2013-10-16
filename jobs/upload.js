  var mongoose = require('mongoose'),
      url = require('url'),
      fs = require('fs'),
      path = require('path'),
      mime = require('mime'),
      AWS = require('aws-sdk'),
      async = require('async'),
      Media = require('../').model,
      _ = require('lodash'),
      s3 = new AWS.S3();

//  temp.track();

  function sendFile(job, progress, obj, media, suffixName, done) {

    async.waterfall([
      function setAttributes (cb) {
        try {
          job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
          var fileName = path.join(media.tmp.path, media.getSuffixName(suffixName));
          var stream = fs.createReadStream(fileName);
          var buf = new Buffer('');
          job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
          return cb(null, stream, buf);
        } catch (err) {
          return cb(err);
        }
      },

      function readFile (stream, buf, cb) {
        job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
        stream.on('data', function (data) {
           buf = Buffer.concat([buf, data]);
        });
        stream.on('end', function () {
          job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
          return cb(null, buf);
        });
        stream.on('error', function (err) {
          return cb(err);
        });
      },

      function sendToS3 (buf, cb) {
        job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
        var data = {
          //TODO: criar um methodo para recuperar o bucket menos usado
          ACL: 'public-read',
          Bucket: 'develop.media.batman.bilgow.com' || config.aws.services.s3.buckets[0],
          Key: [obj.constructor.modelName.toLowerCase(), media.url.path, media.getSuffixName(suffixName)].join('/'),
          Body: buf,
          ContentType: mime.lookup(media.mime)
        };

        s3.client.putObject(data, function (err, res) {
          job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
          return done(err);
        });
      }
    ]
    , function(err, results) {
      job.progress(progress.totalSteps - progress.pending--, progress.totalSteps);
      done(err);
    });
  }

  /**
   * Process recover password
   */
  function uploadMedia(job, done) {

    var options = job.data || {};
    options = _.extend({
      obj: null,
      media: null,
      fileName: null,
      stream: null,
      buf: new Buffer(''),
      totalSteps: 3,
      pending: null
    }, options);


    async.series({
      findById: function (cb) {

        mongoose.model(options.parent.modelName).findById(
          options.parent.value._id,
          function (err, _obj) {
            options.obj = _obj;
            options.media = _obj.get(options.pathMedia).id(options.idMedia);
            options.totalSteps += (6 * options.media.available.length);
            options.pending = options.totalSteps -1;
            job.progress(options.totalSteps - options.pending--, options.totalSteps);
            return cb(err);
          }
        );

      },

      iterateFiles: function (cb) {

        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        async.map(
          options.media.available,
          function (item, fn) {
            sendFile(job, options, options.obj, options.media, item, fn);
          },
          function(err, results){
            cb(err);
          }
        )

      }

    }, function(err, results) {
      job.progress(options.totalSteps - options.pending--, options.totalSteps);
      done(err);
    })
  }

  // Register recover-password processor
module.exports.args = ['media-upload', 10, uploadMedia];
