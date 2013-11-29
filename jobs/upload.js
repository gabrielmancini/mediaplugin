  var url = require('url'),
      fs = require('fs'),
      path = require('path'),
      mime = require('mime'),
      AWS = (['test', 'ci'].indexOf(process.env.NODE_ENV) >=0)? require('mock-aws-s3') : require('aws-sdk'),
      async = require('async'),
      _ = require('lodash'),
      s3 = (['test', 'ci'].indexOf(process.env.NODE_ENV) >=0)? { client: new AWS.S3() } : new AWS.S3();

//  temp.track();

  function sendFile(job, options, suffixName, done) {

    var obj = options.obj;
    var media = options.media;

    async.waterfall([
      function setAttributes (cb) {
        try {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          var fileName = path.join(media.tmp.path, media.getSuffixName(suffixName));
          var stream = fs.createReadStream(fileName);
          var buf = new Buffer('');
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(null, stream, buf);
        } catch (err) {
          return cb(err);
        }
      },

      function readFile (stream, buf, cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        stream.on('data', function (data) {
           buf = Buffer.concat([buf, data]);
        });
        stream.on('end', function () {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(null, buf);
        });
        stream.on('error', function (err) {
          return cb(err);
        });
      },

      function sendToS3 (buf, cb) {
        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        var data = {
          ACL: 'public-read',
          //TODO: criar um methodo para recuperar o bucket menos usado
          Bucket: options.aws.s3.buckets[0],
          Key: [obj.constructor.modelName.toLowerCase(), media.url.path, media.getSuffixName(suffixName)].join('/'),
          Body: buf,
          ContentType: mime.lookup(media.mime)
        };
        s3.client.putObject(data, function (err, res) {
          job.progress(options.totalSteps - options.pending--, options.totalSteps);
          return cb(err);
        });
      }
    ]
    , function(err, results) {
      job.progress(options.totalSteps - options.pending--, options.totalSteps);
      done(err);
    });
  }

  /**
   * Process recover password
   */
  function uploadMedia(job, done) {
    var MediaPlugin = require('../');

    var mongoose = MediaPlugin.getMongoose(),
        Media = MediaPlugin.get('model');

    var options = job.data || {};
    options = _.merge({
      obj: null,
      media: null,
      fileName: null,
      stream: null,
      buf: new Buffer(''),
      aws: {
        s3: {
          buckets: []
        }
      },
      totalSteps: 0,
      pending: 0
    }, options);


    async.series({
      findById: function (cb) {
        mongoose.model(options.parent.modelName).findById(
          options.parent.value._id,
          function (err, _obj) {
            options.obj = _obj;
            options.media = _obj.get(options.pathMedia).id(options.idMedia);
            return cb(err);
          }
        );

      },

      setTotalSteps: function (done) {
        options.totalSteps = 2;
        options.totalSteps += (7 * options.media.available.length);
        options.pending = options.totalSteps -1;
        done(null);
      },

      iterateFiles: function (cb) {

        job.progress(options.totalSteps - options.pending--, options.totalSteps);
        async.map(
          options.media.available,
          function (item, fn) {
            sendFile(job, options, item, fn);
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
