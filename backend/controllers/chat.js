const { isObjectIdOrHexString } = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const conversationFields = [{ path: 'members', select: 'name' }, { path: 'lastMessage', select: 'text sender createdAt' }];
const pageSize = 40;

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function validId(id) {
  if (!isObjectIdOrHexString(id)) fail(400, 'Invalid identifier.');
  return String(id).toLowerCase();
}

async function memberConversation(req) {
  const conversation = await Conversation.findOne({ _id: validId(req.params.id), members: req.auth.id });
  if (!conversation) fail(404, 'Conversation unavailable.');
  return conversation;
}

async function publish(req, conversation) {
  const ids = conversation.members.map(String);
  await conversation.populate(conversationFields);
  req.app.locals.realtime.emit(ids, 'conversation:updated', conversation.toJSON());
  return conversation;
}

async function users(req, res) {
  const search = String(req.query.search ?? '').trim().slice(0, 50);
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = { _id: { $ne: req.auth.id } };
  if (search) filter.name = { $regex: escaped, $options: 'i' };
  res.json(await User.find(filter).sort({ name: 1, _id: 1 }).limit(50).select('name').lean());
}

async function conversations(req, res) {
  res.json(await Conversation.find({ members: req.auth.id })
    .sort({ updatedAt: -1, _id: -1 }).populate(conversationFields).lean());
}

async function direct(req, res) {
  const peer = validId(req.body?.userId);
  if (peer === req.auth.id) fail(400, 'Choose another user.');
  if (!await User.exists({ _id: peer })) fail(404, 'User unavailable.');
  const members = [req.auth.id, peer].sort();
  const directKey = members.join(':');
  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate({ directKey },
      { $setOnInsert: { kind: 'direct', members, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true, new: true, timestamps: false });
  } catch (error) {
    if (error.code !== 11000) throw error;
    conversation = await Conversation.findOne({ directKey });
  }
  res.json(await publish(req, conversation));
}

async function group(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const ids = req.body?.memberIds;
  if (!name || name.length > 60) fail(400, 'Enter a group name of up to 60 characters.');
  if (!Array.isArray(ids) || ids.length > 49) fail(400, 'Choose up to 49 members.');
  const members = [...new Set([req.auth.id, ...ids.map(validId)])];
  if (members.length < 2) fail(400, 'Choose at least one other member.');
  if (await User.countDocuments({ _id: { $in: members } }) !== members.length) {
    fail(400, 'One or more users are unavailable.');
  }
  const conversation = await Conversation.create({ kind: 'group', name, members, owner: req.auth.id });
  res.status(201).json(await publish(req, conversation));
}

async function changeMember(req, res) {
  const conversation = await memberConversation(req);
  if (conversation.kind !== 'group' || String(conversation.owner) !== req.auth.id) {
    fail(403, 'Only the group owner can manage members.');
  }
  const id = validId(req.params.userId);
  if (id === req.auth.id) fail(400, 'The group owner must remain a member.');
  const add = req.method === 'PUT';
  if (add && !await User.exists({ _id: id })) fail(404, 'User unavailable.');
  const query = { _id: conversation._id };
  if (add) query.$or = [{ members: id }, { 'members.49': { $exists: false } }];
  const updated = await Conversation.findOneAndUpdate(query,
    add ? { $addToSet: { members: id } } : { $pull: { members: id } },
    { new: true, timestamps: false });
  if (!updated) fail(400, 'Groups can have up to 50 members.');
  if (!add) req.app.locals.realtime.emit([id], 'conversation:removed', String(conversation._id));
  res.json(await publish(req, updated));
}

async function history(req, res) {
  const conversation = await memberConversation(req);
  const query = { conversation: conversation._id };
  if (req.query.before) query._id = { $lt: validId(req.query.before) };
  const entries = await Message.find(query).sort({ _id: -1 }).limit(pageSize + 1)
    .populate('sender', 'name').lean();
  const more = entries.length > pageSize;
  if (more) entries.pop();
  res.json({ messages: entries.reverse(), more });
}

async function send(req, res) {
  const conversation = await memberConversation(req);
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const clientId = req.body?.clientId;
  if (!text || text.length > 4000) fail(400, 'Write a message of up to 4,000 characters.');
  if (typeof clientId !== 'string' || !/^[\w-]{16,64}$/.test(clientId)) fail(400, 'Invalid message identifier.');
  const key = { conversation: conversation._id, sender: req.auth.id, clientId };
  let message;
  try {
    message = await Message.create({ ...key, text });
  } catch (error) {
    if (error.code !== 11000) throw error;
    message = await Message.findOne(key);
  }

  const latest = await Conversation.findOneAndUpdate({
    _id: conversation._id,
    members: req.auth.id,
    $or: [{ lastMessage: { $exists: false } }, { lastMessage: { $lt: message._id } }],
  }, { $set: { lastMessage: message._id, updatedAt: message.createdAt } }, { new: true, timestamps: false });
  await message.populate('sender', 'name');
  const current = await memberConversation(req);
  req.app.locals.realtime.emit(current.members.map(String), 'message:new', message.toJSON());
  if (latest) await publish(req, current);
  res.status(201).json(message);
}

async function read(req, res) {
  const conversation = await memberConversation(req);
  if (conversation.kind === 'direct') {
    const through = validId(req.body?.through);
    if (!await Message.exists({ _id: through, conversation: conversation._id })) {
      fail(400, 'Invalid message cursor.');
    }
    const readAt = new Date();
    const result = await Message.updateMany({
      conversation: conversation._id, _id: { $lte: through }, sender: { $ne: req.auth.id },
      readAt: { $exists: false },
    }, { $set: { readAt } });
    if (result.modifiedCount) {
      req.app.locals.realtime.emit(conversation.members.map(String), 'message:read', {
        conversation: conversation.id, reader: req.auth.id, through, readAt,
      });
    }
  }
  res.sendStatus(204);
}

module.exports = { users, conversations, direct, group, changeMember, history, send, read };
