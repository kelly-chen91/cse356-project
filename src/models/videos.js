var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var VideoSchema = new Schema({
  videoId: {
    type: String,
    default: function () {
      return `${this._id}`;
    },
  },
  author: { type: String, default: "Anonymous" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  likes: { type: Number, default: 0 },
  manifest: {
    type: String,
    default: function () {
      return `${this._id}/${this._id}_output.mpd`;
    },
  },
});

VideoSchema.virtual("url").get(function () {
  return "play/" + this._id;
});

module.exports = mongoose.model("Video", VideoSchema);
