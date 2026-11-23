const { Schema, model } = require('mongoose');

const schema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 4000 },
  clientId: { type: String, required: true },
  readAt: Date,
}, { timestamps: true });

schema.index({ conversation: 1, _id: -1 });
schema.index({ conversation: 1, sender: 1, clientId: 1 }, { unique: true });
module.exports = model('Message', schema);
