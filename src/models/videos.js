var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var VideoSchema = new Schema({
  author: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  likes: { type: Number, default: 0 },
  manifest: {
    type: String,
    default: function () {
      `${title}/${title}_output.mpd`;
    },
  },
});

VideoSchema.virtual("url").get(function () {
  return "play/" + this._id;
});

module.exports = mongoose.model("Video", VideoSchema);
