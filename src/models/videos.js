var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var VideoSchema = new Schema({
  author: { type: String, default: "Test" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  likes: { type: Number, default: 0 },
  manifest: {
    type: String,
    default: function () {
      `${this.title}/${this.title}_output.mpd`;
    },
  },
  status: {type: String, enum: ["processing", "complete"], required: true}
});

VideoSchema.virtual("url").get(function () {
  return "play/" + this._id;
});

module.exports = mongoose.model("Video", VideoSchema);
