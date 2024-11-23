import mongoose from "mongoose";

var Schema = mongoose.Schema;

var VideoSchema = new Schema({
  videoId: {
    type: String,
    default: function () {
      return `${this._id}`;
    },
    index: true
  },
  uuid: { type: String },
  author: { type: String, default: "Anonymous" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  likes: { type: Number, default: 0 },
  manifest: {
    type: String,
    default: function () {
      return `${this._id}_output.mpd`;
    },
  },
  thumbnail: {
    type: String,
    default: function () {
      return `${this._id}_thumbnail.jpg`;
    },
  },
  status: { type: String, enum: ["processing", "complete"], required: true },
  likedBy: [{ type: String, default: [] }],
  dislikedBy: [{ type: String, default: [] }],
});

VideoSchema.virtual("url").get(function () {
  return "play/" + this._id;
});

const Video = mongoose.model("Video", VideoSchema);

export default Video;
