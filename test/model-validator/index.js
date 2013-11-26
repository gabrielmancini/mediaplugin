var mongoose = require('mongoose'),
    Validator = require('validator').Validator;

Validator.prototype.error = function(msg) {
  return false;
};

var validator = new Validator(),
    check = validator.check,
    sanitize = validator.sanitize;

module.exports.isNumeric = function (val) {
  return validator.check(val).isNumeric();
};

module.exports.isEmail = function (val) {
  return validator.check(val).isEmail();
};

// Old email validation maintained
module.exports.isEmailBilgow = function (val) {
  return this.email && (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(val);
};

module.exports.notEmpty = function (val) {
  return validator.check(val).notEmpty();
};

module.exports.minMax = function (min, max) {
  return function minMax(val) {
    return validator.check(val).len(min, max);
  };
};

module.exports.bypassFieldWhenNew = function (field) {
  return function byPass(val) {
    if (!this.isModified(field) || this.isNew) {
      return true;
    }
    return false;
  }
}

module.exports.uniqueFieldInsensitive = function (modelName, field) {
  return function (val, cb) {
    if (val && val.length) {
      var query = mongoose.model(modelName).where(field, new RegExp('^' + val + '$', 'i'));

      if (!this.isNew) {
        query = query.where('_id').ne(this._id);
      }

      query.count(function (err, n) {
        cb(n < 1);
      });
    } else {
      cb(false);
    }
  };
};
