var mongoose = require('mongoose'),
    extend = require('mongoose-schema-extend'),
    AbstractUser = require('./abstract-user');

var UserSchema = AbstractUser.schema.extend({

});
module.exports =  mongoose.model('User', UserSchema);
