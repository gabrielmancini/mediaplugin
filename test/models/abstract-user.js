var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    mediaplugin = require('../../'),
    queue = require('../message-queue'),
    validator = require('../model-validator');

var GroupSchema = { type: String },
    MarkerSchema = { type: String };

var AbstractUserSchema = new Schema({
    name: { first: String, middle: String, last: String },
    shortName: { type: String, validate: [validator.notEmpty, 'Short name can\'t be null'], trim: true },
    userName: {
      type: String,
      index: { unique: true, sparse: true },
      validate: [
        { validator: validator.bypassFieldWhenNew('userName'), msg: 'Invalid username' }
      ],
      trim: true
    },
    email: {
      type: String,
      index: { unique: true, sparse: true },
      validate: [
        { validator: validator.isEmailBilgow, msg: 'Invalid email' },
        { validator: validator.uniqueFieldInsensitive('User', 'email'), msg: 'Email in use' }
      ]
    },
    verification: {
      loginAttempts: { type: Number, required: true, 'default': 0 },
      verificationDate: Date,
      verificationToken: { type: String },
      resetPwdToken: String,
      resetPwdTokenExp: Date
    },
    password: { type: String },
    type: {type: String, 'enum': ['person', 'organization'], 'default': 'person'},
    description: String,
    role: {type: String, 'enum': ['member', 'moderator', 'admin'], 'default': 'member'},
    created: { type: Date, 'default': Date.now },
    secretQuestion: String,
    secretAnswer: String,
    address: String,
    country: String,
    city: String,
    facebookId: String,
    twitterId: String,
    habilities: [{ type: String, ref: 'Topic' }],
    interests:  [{ type:String, ref: 'Topic' }],
    private_markers:  [{ type:String, ref: 'User.private_markers_store' }],
    public_markers:  [{ type:String, ref: 'Marker' }],
    i18n:
    {
        main: {type: Number, required: true, "default": 0},
        locales: [{ type: String, ref: 'Locale' }]
    },
    profile:
    {
        birthday: Date,      //for persons only
        gender: {type: String, 'enum': ['f','m']},  //for persons only
        academics: String,  //for persons only
        institution: String, //for persons only
        title: String,      //for persons only
        company: String,    //for persons only
        cause: String,      //for persons only

        founding: Date, //for organization only
        officialDocument: String,  //for organization only
        type: {type: String, 'enum': [ 'business', 'education', 'goverment', 'ong' ]},  //for organization only
        field: String,      //for organization only
        category: String   //for organization only
    },
    background: String
}, { collection : 'users' });

AbstractUserSchema.set('graphability1',
  {
    middleware:
    {
      preSave: true,
      preRemove: false
    }
  }
);

// AbstractUserSchema.plugin(mongoosastic, config.mongoosastic);
// AbstractUserSchema.plugin(elasticfilter);
// Methods
AbstractUserSchema.plugin(mediaplugin.get('plugin'), {
  field: 'profile.picture',
  mediaType: 'image',
  single: true,
  output: ['original', 'thumbnail'],
  processOptions: {
    normal: { width: 800 }
  },
  queue: queue,
  aws: {
     "s3": {
        "buckets": ["develop.media.batman", "develop.media.superman"]
      }
    }
});

//AbstractUserSchema.plugin(mediaplugin.plugin, { field: 'profile.cover', type: 'image', single: true } );

module.exports =  mongoose.model('AbstractUser', AbstractUserSchema);

