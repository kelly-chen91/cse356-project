import mongoose from "mongoose";

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  pwhash: { type: String, required: true },
  verificationKey: { type: String, default: "" },
  verified: { type: Boolean, default: false },
  videos: [{ type: String }],
  liked: [{ type: String, default: [] }],  
  disliked: [{ type: String, default: [] }],
  watched: [{ type: String, default: [] }],
});

UserSchema.virtual("url").get(function () {
  return "user/" + this._id;
});

// Add a compound index (e.g., for queries combining username and verified)
UserSchema.index({ username: 1, verified: 1 });

// Add a text index for searching usernames or emails
UserSchema.index({ username: "text", email: "text" });

const User = mongoose.model("User", UserSchema);
export default User;
