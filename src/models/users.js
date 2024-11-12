import mongoose from "mongoose";

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  pwhash: { type: String, required: true },
  verificationKey: { type: String, default: "" },
  verified: { type: Boolean, default: false },
  videos: [{ type: String }],
  liked: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
  disliked: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
  watched: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
});

UserSchema.virtual("url").get(function () {
  return "user/" + this._id;
});

const User = mongoose.model("User", UserSchema);
export default User;
