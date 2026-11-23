const { Schema, model } = require('mongoose');

const schema = new Schema({
  kind: { type: String, enum: ['direct', 'group'], required: true },
  directKey: { type: String, unique: true, sparse: true, select: false },
  name: String,
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

schema.index({ members: 1, updatedAt: -1 });
module.exports = model('Conversation', schema);
