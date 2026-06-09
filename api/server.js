require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { nanoid } = require ? (() => { try { return require('nanoid'); } catch { return { nanoid: () => Math.random().toString(36).slice(2, 10) }; } })() : { nanoid: () => Math.random().toString(36).slice(2, 10) };

const app      = express();
const DATA     = path.join(__dirname, 'board.json');
const PORT     = process.env.PORT || 3001;
const WEBHOOK  = process.env.DISCORD_WEBHOOK_URL;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── helpers ─────────────────────────────────────────────────────────────────

function loadBoard() {
  if (!fs.existsSync(DATA)) return null;
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { return null; }
}

function saveBoard(board) {
  fs.writeFileSync(DATA, JSON.stringify(board, null, 2));
}

async function discordNotify(embeds) {
  if (!WEBHOOK) return;
  try {
    await fetch(WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds }),
    });
  } catch (e) {
    console.error('[webhook]', e.message);
  }
}

const PRIORITY_COLOR = { critical: 0xef4444, high: 0xf97316, medium: 0xeab308, low: 0x4ade80 };
const PRIORITY_ICON  = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

function cardEmbed(card, board, title, color) {
  const col      = board.columns.find(c => c.cardIds.includes(card.id));
  const assignees = (card.assigneeIds || []).map(id => board.members.find(m => m.id === id)?.name).filter(Boolean);
  const labels    = (card.labelIds  || []).map(id => board.labels.find(l => l.id === id)?.name).filter(Boolean);
  const done      = card.subtasks.filter(s => s.done).length;
  const fields    = [
    { name: '📂 Column',   value: col?.title    || '—',          inline: true },
    { name: '⚡ Priority', value: `${PRIORITY_ICON[card.priority]} ${card.priority}`, inline: true },
    { name: '👤 Assigned', value: assignees.join(', ') || 'Unassigned', inline: true },
  ];
  if (card.dueDate)          fields.push({ name: '📅 Due',      value: card.dueDate, inline: true });
  if (card.storyPoints)      fields.push({ name: '⭐ Points',   value: String(card.storyPoints), inline: true });
  if (card.subtasks.length)  fields.push({ name: '✅ Subtasks', value: `${done}/${card.subtasks.length}`, inline: true });
  if (labels.length)         fields.push({ name: '🏷️ Labels',  value: labels.join(', '), inline: false });
  if (card.description)      fields.push({ name: '📝 Notes',   value: card.description.slice(0, 200), inline: false });
  return { title, description: `**${card.title}**`, color: color ?? PRIORITY_COLOR[card.priority] ?? 0x6366f1, fields, timestamp: new Date().toISOString(), footer: { text: 'FlowBoard' } };
}

// ── routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, version: '1.0.0' }));

// Full board
app.get('/api/board', (_, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'Board not synced yet. Open FlowBoard in your browser first.' });
  res.json(board);
});

// Sync full board state from the frontend (fire-and-forget POST)
app.post('/api/sync', (req, res) => {
  if (!req.body || !req.body.columns) return res.status(400).json({ error: 'Invalid board payload' });
  saveBoard(req.body);
  res.json({ ok: true });
});

// ── columns ──────────────────────────────────────────────────────────────────

app.get('/api/columns', (_, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  res.json(board.columns.map(col => ({
    ...col,
    cardCount: col.cardIds.filter(id => board.cards[id] && !board.cards[id].isArchived).length,
  })));
});

// ── cards ─────────────────────────────────────────────────────────────────────

app.get('/api/cards', (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  let cards = Object.values(board.cards).filter(c => !c.isArchived);
  if (req.query.column) {
    const col = board.columns.find(c => c.title.toLowerCase().includes(req.query.column.toLowerCase()));
    if (col) cards = cards.filter(c => col.cardIds.includes(c.id));
  }
  if (req.query.priority) cards = cards.filter(c => c.priority === req.query.priority);
  if (req.query.overdue === 'true') {
    const now = new Date(); now.setHours(0,0,0,0);
    cards = cards.filter(c => c.dueDate && new Date(c.dueDate) < now);
  }
  res.json(cards);
});

app.get('/api/cards/:id', (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  const card = board.cards[req.params.id];
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
});

app.post('/api/cards', async (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data. Open FlowBoard first.' });

  const { title, columnId, priority = 'medium', description = '', dueDate = null, storyPoints = 0 } = req.body;
  if (!title || !columnId) return res.status(400).json({ error: 'title and columnId are required' });

  const col = board.columns.find(c => c.id === columnId || c.title.toLowerCase() === columnId.toLowerCase());
  if (!col) return res.status(404).json({ error: 'Column not found' });

  const id = 'c' + Math.random().toString(36).slice(2, 10);
  const card = {
    id, title, description, columnId: col.id, priority,
    assigneeIds: [], labelIds: [], subtasks: [], comments: [],
    voiceNotes: [], activities: [], storyPoints, dueDate,
    createdAt: Date.now(), timeSpent: 0, isArchived: false,
  };

  board.cards[id] = card;
  col.cardIds.push(id);
  saveBoard(board);

  await discordNotify([cardEmbed(card, board, '📋 New Card Created', 0x6366f1)]);
  res.status(201).json(card);
});

app.patch('/api/cards/:id', async (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  const card = board.cards[req.params.id];
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const prevColId = card.columnId;
  Object.assign(card, req.body);
  board.cards[req.params.id] = card;
  saveBoard(board);

  // Notify if column changed
  if (req.body.columnId && req.body.columnId !== prevColId) {
    const newCol  = board.columns.find(c => c.id === req.body.columnId);
    const oldCol  = board.columns.find(c => c.id === prevColId);
    const isDone  = newCol?.title?.toLowerCase() === 'done';
    await discordNotify([{
      title:       isDone ? '✅ Card Completed!' : '🔀 Card Moved',
      description: `**${card.title}**`,
      color:       isDone ? 0x22c55e : 0x818cf8,
      fields: [
        { name: 'From', value: oldCol?.title || '—', inline: true },
        { name: 'To',   value: newCol?.title || '—', inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'FlowBoard' },
    }]);
  }

  res.json(card);
});

app.delete('/api/cards/:id', (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  if (!board.cards[req.params.id]) return res.status(404).json({ error: 'Card not found' });
  delete board.cards[req.params.id];
  board.columns.forEach(col => { col.cardIds = col.cardIds.filter(id => id !== req.params.id); });
  saveBoard(board);
  res.json({ ok: true });
});

// Move a card to a different column
app.post('/api/cards/:id/move', async (req, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  const card = board.cards[req.params.id];
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const { columnId } = req.body;
  const newCol = board.columns.find(c => c.id === columnId || c.title.toLowerCase() === columnId.toLowerCase());
  if (!newCol) return res.status(404).json({ error: 'Target column not found' });

  const oldColId = card.columnId;
  const oldCol   = board.columns.find(c => c.id === oldColId);
  if (oldCol) oldCol.cardIds = oldCol.cardIds.filter(id => id !== req.params.id);
  if (!newCol.cardIds.includes(req.params.id)) newCol.cardIds.push(req.params.id);
  card.columnId = newCol.id;
  saveBoard(board);

  const isDone = newCol.title.toLowerCase() === 'done';
  await discordNotify([{
    title:       isDone ? '✅ Card Completed!' : '🔀 Card Moved',
    description: `**${card.title}**`,
    color:       isDone ? 0x22c55e : 0x818cf8,
    fields: [
      { name: 'From', value: oldCol?.title || '—', inline: true },
      { name: 'To',   value: newCol.title,          inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'FlowBoard' },
  }]);

  res.json(card);
});

// ── members ──────────────────────────────────────────────────────────────────

app.get('/api/members', (_, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  const members = board.members.map(m => {
    const assigned = Object.values(board.cards).filter(c => !c.isArchived && c.assigneeIds.includes(m.id));
    return { ...m, cardCount: assigned.length };
  });
  res.json(members);
});

// ── stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', (_, res) => {
  const board = loadBoard();
  if (!board) return res.status(404).json({ error: 'No board data' });
  const active = Object.values(board.cards).filter(c => !c.isArchived);
  const now = new Date(); now.setHours(0,0,0,0);
  const overdue = active.filter(c => c.dueDate && new Date(c.dueDate) < now);
  const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
  active.forEach(c => { if (byPriority[c.priority] !== undefined) byPriority[c.priority]++; });
  res.json({
    totalCards: active.length,
    overdueCards: overdue.length,
    byPriority,
    byColumn: board.columns.map(col => ({
      id: col.id, title: col.title,
      count: col.cardIds.filter(id => board.cards[id] && !board.cards[id].isArchived).length,
      wipLimit: col.wipLimit,
    })),
  });
});

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 FlowBoard API  →  http://localhost:${PORT}`);
  console.log(`   GET  /api/board          Full board state`);
  console.log(`   GET  /api/columns        All columns`);
  console.log(`   GET  /api/cards          All cards  (?column= ?priority= ?overdue=true)`);
  console.log(`   POST /api/cards          Create card`);
  console.log(`   PATCH /api/cards/:id     Update card`);
  console.log(`   POST /api/cards/:id/move Move card to column`);
  console.log(`   GET  /api/stats          Board analytics`);
  console.log(`   POST /api/sync           Sync full board from frontend\n`);
});
