var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    pwhash: { type: String, required: true },
    verificationKey: {type: String, default:""},
    verified: {type: Boolean, default: false}
});

UserSchema.virtual('url').get(function() {
    return 'user/' + this._id;
})

module.exports = mongoose.model('User', UserSchema)