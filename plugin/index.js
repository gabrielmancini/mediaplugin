var Q = require('q'),
    url = require('url'),
    path = require('path'),
    _ = require('lodash');

module.exports = exports = function (mongoose) {

  var mediaPlugin = function (schema, optionsPlugin) {

    optionsPlugin = _.merge({
      field : '',
      genMethod: true,
      single: false,
      output: 'all',
      aws: {
        s3: {
          buckets: []
        }
      }
    }, optionsPlugin || {});

    var Media = require('../').get('model'),
        MediaSchema = Media.schema;


    var customGetMethod = _.str.camelize('get ' + optionsPlugin.field.split('.').join(' '));
    var customSetMethod = _.str.camelize('set ' + optionsPlugin.field.split('.').join(' '));
    var fieldPathArr = optionsPlugin.field.split('.');
    var propertyName = fieldPathArr.pop();
    var prefix;
    var definition = {};


    if (fieldPathArr.length) {
      prefix = [fieldPathArr.join('.'), '.'].join('');
    }

    definition[propertyName] = {};
    if (optionsPlugin.index) {
      definition[propertyName].index = optionsPlugin.index;
    }
    definition[propertyName].type = [MediaSchema];

    if (optionsPlugin.df) {
      definition[propertyName]['default'] = optionsPlugin.df;
    }

    schema.add(definition, prefix);

    schema.methods.getMediaQueue = function () {
      return optionsPlugin.queue;
    };

    // schema.methods.setConfig = function (config) {

    //   // config= {
    //   //   aws: {
    //   //     services: {
    //   //       s3: {
    //   //         buckets: []
    //   //       }
    //   //     }
    //   //   }
    //   // };

    // }

    schema.methods[customGetMethod] = function (id) {
      this.pathMedia = optionsPlugin.field; // set a virtual param to be used in others methods
      if (optionsPlugin.single) {
        return this.get(optionsPlugin.field)[0];
      }
      if (id) {
        return this.get(optionsPlugin.field).id(id);
      } else {
        return this.get(optionsPlugin.field);
      }
    };

    schema.methods.customGetMethod = schema.methods.customGetMethod || {};
    schema.methods.customGetMethod[optionsPlugin.field] = schema.methods[customGetMethod];

    schema.methods[customSetMethod] = function (data, id) {
      var obj = this;
      var defered = Q.defer();

      var media;
      if (data instanceof Media) {
        media = data;
      } else {
        media = new Media();
        var parsedUrl = url.parse(data.name);

        if (data.origin) {
          media.original.origin = data.origin;
        } else {
          media.original.origin = (parsedUrl.protocol) ? 'web' : 'file';
        }

        if (media.original.origin === 'web') {
          media.setOriginalUrl(data.name);
        } else {
          media.original.name = path.basename(data.name);
          media.original.path = path.dirname(data.name);
        }
      }

      media.mediaType = optionsPlugin.mediaType;

      if (optionsPlugin.single) {
        obj.get(optionsPlugin.field).shift();
        obj.get(optionsPlugin.field).push(media);
      } else if (id) {
        obj.get(optionsPlugin.field).id(id).set(media);
      } else {
        obj.get(optionsPlugin.field).push(media);
      }
      var mediaId = media._id;

      obj.save(function(err) {
        if (err) {
          defered.reject(err);
        } else {
          var media = obj[customGetMethod](mediaId);

          var psOptions = _.merge(
            _.cloneDeep(media.getMediaTypeOptions()),
            optionsPlugin.processOptions
          );

          var processOptions = {
            processOptions: psOptions,
            output: optionsPlugin.output,
            aws: optionsPlugin.aws
          };

          var queue = media.process(processOptions, function (err, jobId) {
            if (err) {
              defered.reject(err);
            } else {
              queue.getByJobId(jobId, function (err, job) {

                if (['complete', 'failed'].indexOf(job._state) !== -1) {
                  //obj.customGetMethod
                  defered.resolve(mediaId);
                  //completeHandler(job, media._id);
                } else {

                  job.subscribe()
                    .on('complete', function() {
                      defered.resolve({ obj: obj, getMethod: customGetMethod, mediaId: mediaId });
                    })
                    .on('failed', function() {
                      defered.reject(job.error());
                    })
                    .on('progress', function(value) {
                      defered.notify(value);
                    });
                }

              });
              //defered.resolve({ media: media, promise: defered });
            }
          });
        }
      });

      return defered.promise;
    };
  };

  return mediaPlugin;
}
