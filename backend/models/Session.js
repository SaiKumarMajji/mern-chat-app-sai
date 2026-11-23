const { Schema, model } = require('mongoose');

module.exports = model('Session', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}));
