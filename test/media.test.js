var
  async = require('async'),
  should = require('should'),
  fixture = require('mongoose-fixtures'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  sinon = require('sinon'),
  fs = require('fs-extra'),
  _ = require('lodash'),
  url = require('url'),
  path = require('path'),
  AWS = require('aws-sdk'),
  queue = require('./message-queue');

describe('Media <Unit Test>: ', function () {

  AWS.config.update(
    {
      accessKeyId: "AKIAJD2XYYTYWWGHMN3Q",
      secretAccessKey: "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"
    }
  );
  AWS.config.update({region: 'sa-east-1'});

  var MediaPlugin = require('../'),
    Media = MediaPlugin.model,
    Jobs = MediaPlugin.jobs,
    Handler = MediaPlugin.handler;

  var UserSchema = new Schema({
      name: { first: String, middle: String, last: String },
  });

  UserSchema.plugin(MediaPlugin.plugin, {
    field: 'profile.picture',
    type: 'image',
    single: true,
    output: ['original', 'thumbnail'],
    processOptions: {
      normal: { width: 800 }
    },
    queue: queue,
    aws: {
      s3: {
        buckets: ['develop.media.batman.bilgow.com', 'develop.media.superman.bilgow.com']
      }
    }
  });

  var User =  mongoose.model('User', UserSchema);
  var mockResponse = function(expectedStatus, done) {
    return {
      send: function(statusCode, response) {
        statusCode.should.equal(expectedStatus);
        done();
      }
    }
  }

  before(function (done) {
    // Start Workers Processors


    async.series({
      connect: function (cb) {
        mongoose.connect('mongodb://localhost/mediaplugin-test', cb);
      },
      executeJobs: function (cb) {
        var messageQueue = new queue;
        messageQueue.processJob.apply(messageQueue, Jobs.process.args);
        messageQueue.processJob.apply(messageQueue, Jobs.download.args);
        messageQueue.processJob.apply(messageQueue, Jobs.upload.args);
        cb(null);
      },
      createImgFolder: function (cb) {
        fs.stat('test/tmpImg', function (err, stat) {
          if (stat) {
            cb();
          } else {
            fs.mkdir('test/tmpImg', 0777, cb);
          }
        });
      },
    }, function (err) {
      done(err);
    })

  });

  after(function (done) {
    async.series({
      removeImgFolder: function (cb) {
        fs.remove('test/tmpImg', cb);
      },
    }, function (err) {
      done(err);
    });

  });

  describe('Media: ', function () {

    describe('Mock Schema Plugin', function () {
      var DummySchema = new Schema({
        text: String
      });

      DummySchema.plugin(MediaPlugin.plugin, {
        field: 'comments.picture',
        type: 'image',
        single: true,
        queue: queue,
      });

      it ('should create a custom method to get the media', function (done) {
        _.isFunction(DummySchema.methods.getCommentsPicture).should.be.equal.true;
        done();
      });

      it ('should create a custom method to to process the media', function (done) {
        _.isFunction(DummySchema.methods.setCommentsPicture).should.be.equal.true;
        done();
      });

      it ('should create a custom method to to process the media', function (done) {
        console.log(DummySchema);
        _.isFunction(DummySchema.methods.setCommentsPicture).should.be.equal.true;
        done();
      });

    });

    describe('test on mock model', function () {

      it('shoud send local file to s3', function(done) {
        var fileName = 'test/fixtures_images/113198687.jpg';
        var options = {
          name: fileName
        };

        var responseHandler = new Handler.ResponseHandler('http', { res: mockResponse(201, done) });
        var demoUser = new User
        demoUser.setProfilePicture(options)
          .then(responseHandler.sucessHandler.bind(responseHandler))
          .fail(responseHandler.failHandler.bind(responseHandler))
          .progress(responseHandler.progressHandler.bind(responseHandler));

      });

      it('shoud be able to response an error when not file exists', function(done) {
        var fileName = 'not/file/exists.jpg';
        var options = {
          name: fileName
        };

        var responseHandler = new Handler.ResponseHandler('http', { res: mockResponse(500, done) });

        var demoUser = new User
        demoUser.setProfilePicture(options)
          .then(responseHandler.sucessHandler.bind(responseHandler))
          .fail(responseHandler.failHandler.bind(responseHandler))
          .progress(responseHandler.progressHandler.bind(responseHandler));

      });

      it('shoud be able to download process and upload using https', function(done) {
        //var url = 'https://lorempixel.com/400/200/sports/Bilgow-Test';
        var url = 'https://fbcdn-sphotos-g-a.akamaihd.net/hphotos-ak-ash3/1393824_668658789820516_345410148_n.jpg'
//        var url = 'https://2.gravatar.com/avatar/f1c731016b3283cab87c206045a469f4?d=https%3A%2F%2Fidenticons.github.com%2Fe8bd38de4565c58a98de89cd91969dd4.png&amp;s=420';
        var options = {
          name: url
        };

        var responseHandler = new Handler.ResponseHandler('http', { res: mockResponse(201, done) });

        var demoUser = new User
        demoUser.setProfilePicture(options)
          .then(responseHandler.sucessHandler.bind(responseHandler))
          .fail(responseHandler.failHandler.bind(responseHandler))
          .progress(responseHandler.progressHandler.bind(responseHandler));

      });
    });


    describe('Media Download', function () {
      it('should be able to download photo', function (done) {

        var _url = 'https://lorempixel.com/400/200/sports/Bilgow-Test';

        var demoUser = new User
        var media = new Media;
        demoUser.profile.picture.push(media);
        demoUser.save(function () {
          var downloadPromise = demoUser.getProfilePicture(media._id).download(_url);

          var proxyComplete = sinon.spy();
          var proxyProgress = sinon.spy();
          var proxyFail = sinon.spy();

          downloadPromise.on('complete', proxyComplete);
          downloadPromise.on('failed', proxyFail);
          downloadPromise.on('progress', proxyProgress);

          setTimeout(function() {
            proxyProgress.callCount.should.equal(16);
            proxyProgress.lastCall.args.should.eql([100]);
            sinon.assert.called(proxyProgress);
            sinon.assert.notCalled(proxyFail);
            sinon.assert.called(proxyComplete);
            User.findById(demoUser._id, function (err, user) {
              user.getProfilePicture().original.should.have.property('name', path.basename(url.parse(_url).path));
              done();
            });
          }, 2000);
        });
      });
    });

    describe('Media Upload', function() {
      it('should be able to upload photo', function (done) {

        var demoUser = new User
        var media = new Media;
        demoUser.profile.picture.push(media);
        demoUser.save(function () {

          var uploadPromise = demoUser.getProfilePicture().upload();
          var proxyComplete = sinon.spy();
          var proxyProgress = sinon.spy();
          var proxyFail = sinon.spy();

          uploadPromise.on('complete', proxyComplete);
          uploadPromise.on('failed', proxyFail);
          uploadPromise.on('progress', proxyProgress);

          setTimeout(function() {
            proxyProgress.callCount.should.equal(2);
            proxyProgress.lastCall.args.should.eql([100]);
            sinon.assert.called(proxyProgress);
            sinon.assert.notCalled(proxyFail);
            sinon.assert.called(proxyComplete);
            done();

          }, 2000);

        });
      });
    });

  });

});
