var mongoose = require("mongoose");

var Schema = mongoose.Schema;

/**
 * Everytime there is a new user, add a row entry to ratings
 * Everytime there is a new video uploaded, add a new column entry to ratings
 * Everytime user likes a video, find video and change entry to 1
 * If user dislikes a video, find video and change entry to 0 
 */
var RatingSchema = new Schema({
  ratings: [[{type: Number, default: 0}]]
});

// RatingSchema.virtual("url").get(function () {
//   return "rating/" + this._id;
// });

module.exports = mongoose.model("Rating", RatingSchema);
