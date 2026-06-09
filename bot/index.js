require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const TOKEN   = process.env.DISCORD_TOKEN;
const API_URL = process.env.API_URL || 'http://localhost:3001';

// ── helpers ──────────────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function findCard(cards, query) {
  const q = query.toLowerCase();
  return cards.find(c => c.title.toLowerCase().includes(q));
}

function findColumn(columns, query) {
  const q = query.toLowerCase();
  return columns.find(c => c.title.toLowerCase().includes(q));
}

const PRIORITY_COLOR = { critical: 0xef4444, high: 0xf97316, medium: 0xeab308, low: 0x4ade80 };
const PRIORITY_ICON  = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
const PRIORITY_BAR   = { critical: '█████', high: '████░', medium: '███░░', low: '██░░░' };

function fmt(date) {
  if (!date) return '—';
  const d = new Date(date); const now = new Date();
  const diff = Math.ceil((d - now) / 86400000);
  if (diff < 0) return `⚠️ ${date} (${Math.abs(diff)}d overdue)`;
  if (diff === 0) return `🔔 ${date} (today)`;
  if (diff === 1) return `${date} (tomorrow)`;
  return `${date} (in ${diff}d)`;
}

// ── embed builders ────────────────────────────────────────────────────────────

async function buildCardEmbed(card, board, title) {
  const col      = board.columns.find(c => c.cardIds.includes(card.id));
  const assignees = (card.assigneeIds || []).map(id => board.members.find(m => m.id === id)?.name).filter(Boolean);
  const labels    = (card.labelIds   || []).map(id => board.labels.find(l => l.id === id)?.name).filter(Boolean);
  const doneSubs  = card.subtasks.filter(s => s.done).length;

  const embed = new EmbedBuilder()
    .setTitle(title || card.title)
    .setColor(PRIORITY_COLOR[card.priority] || 0x6366f1)
    .setTimestamp()
    .setFooter({ text: 'FlowBoard' });

  embed.addFields(
    { name: '📂 Column',   value: col?.title || '—',                                      inline: true },
    { name: '⚡ Priority', value: `${PRIORITY_ICON[card.priority]} ${card.priority} ${PRIORITY_BAR[card.priority]}`, inline: true },
    { name: '👤 Assigned', value: assignees.join(', ') || '*Unassigned*',                 inline: true },
  );

  if (card.dueDate)         embed.addFields({ name: '📅 Due',      value: fmt(card.dueDate),            inline: true });
  if (card.storyPoints > 0) embed.addFields({ name: '⭐ Points',   value: String(card.storyPoints),     inline: true });
  if (card.timeSpent > 0)   embed.addFields({ name: '⏱️ Time',     value: `${card.timeSpent}m`,         inline: true });
  if (card.subtasks.length) embed.addFields({ name: '✅ Subtasks', value: `${doneSubs}/${card.subtasks.length} done`, inline: true });
  if (labels.length)        embed.addFields({ name: '🏷️ Labels',  value: labels.join(', '),            inline: true });
  if (card.description)     embed.setDescription(`> ${card.description.slice(0, 300)}`);

  return embed;
}

// ── client setup ─────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`\n✅ FlowBoard Bot online as ${client.user.tag}`);
  console.log(`   API: ${API_URL}\n`);
  client.user.setActivity('the Kanban board 📋', { type: 3 }); // WATCHING
});

// ── interaction handler ───────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();

  const { commandName } = interaction;

  try {
    // ── /board ──────────────────────────────────────────────────────────────
    if (commandName === 'board') {
      const board = await api('/api/board');
      const stats = await api('/api/stats');
      const now   = new Date(); now.setHours(0,0,0,0);

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${board.title}`)
        .setDescription(board.description || '')
        .setColor(0x6366f1)
        .setTimestamp()
        .setFooter({ text: 'FlowBoard' });

      for (const col of board.columns) {
        const activeCards = col.cardIds
          .map(id => board.cards[id])
          .filter(c => c && !c.isArchived);
        const wipWarn = col.wipLimit && activeCards.length > col.wipLimit ? ' ⚠️' : '';
        const lines   = activeCards.slice(0, 5).map(c => {
          const overdue = c.dueDate && new Date(c.dueDate) < now ? ' ⚠️' : '';
          return `${PRIORITY_ICON[c.priority]} ${c.title}${overdue}`;
        });
        if (activeCards.length > 5) lines.push(`_…and ${activeCards.length - 5} more_`);
        embed.addFields({
          name:   `${col.title} (${activeCards.length}${col.wipLimit ? `/${col.wipLimit}` : ''})${wipWarn}`,
          value:  lines.length ? lines.join('\n') : '*Empty*',
          inline: false,
        });
      }

      embed.addFields(
        { name: '🔴 Critical', value: String(stats.byPriority.critical), inline: true },
        { name: '🟠 High',     value: String(stats.byPriority.high),     inline: true },
        { name: '⚠️ Overdue',  value: String(stats.overdueCards),        inline: true },
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /cards ───────────────────────────────────────────────────────────────
    if (commandName === 'cards') {
      const colQuery = interaction.options.getString('column');
      const url      = colQuery ? `/api/cards?column=${encodeURIComponent(colQuery)}` : '/api/cards';
      const cards    = await api(url);
      const board    = await api('/api/board');

      if (!cards.length) {
        return interaction.editReply(`No cards found${colQuery ? ` in **${colQuery}**` : ''}.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(colQuery ? `📂 Cards in "${colQuery}"` : '📋 All Cards')
        .setColor(0x818cf8)
        .setTimestamp()
        .setFooter({ text: `${cards.length} card${cards.length !== 1 ? 's' : ''}  •  FlowBoard` });

      const now = new Date(); now.setHours(0,0,0,0);
      cards.slice(0, 20).forEach(c => {
        const col       = board.columns.find(col => col.cardIds.includes(c.id));
        const assignees = c.assigneeIds.map(id => board.members.find(m => m.id === id)?.name).filter(Boolean);
        const overdue   = c.dueDate && new Date(c.dueDate) < now;
        embed.addFields({
          name:  `${PRIORITY_ICON[c.priority]} ${c.title}${overdue ? ' ⚠️' : ''}`,
          value: [
            col ? `📂 ${col.title}` : '',
            assignees.length ? `👤 ${assignees.join(', ')}` : '',
            c.dueDate ? `📅 ${fmt(c.dueDate)}` : '',
          ].filter(Boolean).join('  ·  ') || '—',
          inline: false,
        });
      });

      if (cards.length > 20) embed.setDescription(`_Showing 20 of ${cards.length}_`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /card ────────────────────────────────────────────────────────────────
    if (commandName === 'card') {
      const query = interaction.options.getString('title');
      const cards = await api('/api/cards');
      const card  = findCard(cards, query);
      if (!card) return interaction.editReply(`❌ No card found matching **"${query}"**`);
      const board = await api('/api/board');
      const embed = await buildCardEmbed(card, board, `🃏 ${card.title}`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /add ─────────────────────────────────────────────────────────────────
    if (commandName === 'add') {
      const title       = interaction.options.getString('title');
      const colQuery    = interaction.options.getString('column') || 'Backlog';
      const priority    = interaction.options.getString('priority') || 'medium';
      const due         = interaction.options.getString('due') || null;
      const description = interaction.options.getString('description') || '';

      const board = await api('/api/board');
      const col   = findColumn(board.columns, colQuery);
      if (!col) return interaction.editReply(`❌ Column **"${colQuery}"** not found.`);

      const card = await api('/api/cards', {
        method: 'POST',
        body:   { title, columnId: col.id, priority, dueDate: due, description },
      });

      const embed = await buildCardEmbed(card, await api('/api/board'), `✅ Card Created`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── /move ────────────────────────────────────────────────────────────────
    if (commandName === 'move') {
      const cardQuery = interaction.options.getString('card');
      const colQuery  = interaction.options.getString('column');
      const cards     = await api('/api/cards');
      const card      = findCard(cards, cardQuery);
      if (!card) return interaction.editReply(`❌ No card found matching **"${cardQuery}"**`);

      const board = await api('/api/board');
      const col   = findColumn(board.columns, colQuery);
      if (!col) return interaction.editReply(`❌ Column **"${colQuery}"** not found.`);

      await api(`/api/cards/${card.id}/move`, { method: 'POST', body: { columnId: col.id } });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('🔀 Card Moved')
          .setDescription(`**${card.title}**`)
          .setColor(0x818cf8)
          .addFields({ name: 'To', value: col.title, inline: true })
          .setTimestamp()
          .setFooter({ text: 'FlowBoard' })],
      });
    }

    // ── /done ────────────────────────────────────────────────────────────────
    if (commandName === 'done') {
      const query = interaction.options.getString('card');
      const cards = await api('/api/cards');
      const card  = findCard(cards, query);
      if (!card) return interaction.editReply(`❌ No card found matching **"${query}"**`);

      const board  = await api('/api/board');
      const doneCol = board.columns.find(c => c.title.toLowerCase() === 'done');
      if (!doneCol) return interaction.editReply('❌ No **Done** column found on this board.');

      await api(`/api/cards/${card.id}/move`, { method: 'POST', body: { columnId: doneCol.id } });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Card Completed!')
          .setDescription(`**${card.title}**`)
          .setColor(0x22c55e)
          .setTimestamp()
          .setFooter({ text: 'FlowBoard' })],
      });
    }

    // ── /overdue ─────────────────────────────────────────────────────────────
    if (commandName === 'overdue') {
      const cards = await api('/api/cards?overdue=true');
      const board = await api('/api/board');

      if (!cards.length) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('✅ No Overdue Cards!')
            .setDescription('Everything is on track.')
            .setColor(0x22c55e)],
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${cards.length} Overdue Card${cards.length !== 1 ? 's' : ''}`)
        .setColor(0xef4444)
        .setTimestamp()
        .setFooter({ text: 'FlowBoard' });

      cards.slice(0, 15).forEach(c => {
        const col       = board.columns.find(col => col.cardIds.includes(c.id));
        const assignees = c.assigneeIds.map(id => board.members.find(m => m.id === id)?.name).filter(Boolean);
        embed.addFields({
          name:  `${PRIORITY_ICON[c.priority]} ${c.title}`,
          value: `📂 ${col?.title || '—'}  ·  📅 ${fmt(c.dueDate)}${assignees.length ? `  ·  👤 ${assignees.join(', ')}` : ''}`,
          inline: false,
        });
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /status ──────────────────────────────────────────────────────────────
    if (commandName === 'status') {
      const [stats, board] = await Promise.all([api('/api/stats'), api('/api/board')]);

      const embed = new EmbedBuilder()
        .setTitle(`📊 Board Status — ${board.title}`)
        .setColor(0x6366f1)
        .setTimestamp()
        .setFooter({ text: 'FlowBoard' });

      embed.addFields(
        { name: '📋 Total Cards', value: String(stats.totalCards),         inline: true },
        { name: '⚠️ Overdue',    value: String(stats.overdueCards),        inline: true },
        { name: '👥 Members',    value: String(board.members.length),       inline: true },
        { name: '🔴 Critical',   value: String(stats.byPriority.critical), inline: true },
        { name: '🟠 High',       value: String(stats.byPriority.high),     inline: true },
        { name: '🟡 Medium',     value: String(stats.byPriority.medium),   inline: true },
      );

      stats.byColumn.forEach(col => {
        const wip = col.wipLimit ? `/${col.wipLimit}` : '';
        const warn = col.wipLimit && col.count > col.wipLimit ? ' ⚠️' : '';
        embed.addFields({ name: `📂 ${col.title}`, value: `${col.count}${wip} cards${warn}`, inline: true });
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /assign ──────────────────────────────────────────────────────────────
    if (commandName === 'assign') {
      const cardQuery   = interaction.options.getString('card');
      const memberQuery = interaction.options.getString('member');
      const [cards, board] = await Promise.all([api('/api/cards'), api('/api/board')]);
      const card   = findCard(cards, cardQuery);
      if (!card) return interaction.editReply(`❌ No card found matching **"${cardQuery}"**`);
      const member = board.members.find(m => m.name.toLowerCase().includes(memberQuery.toLowerCase()));
      if (!member) return interaction.editReply(`❌ No member found matching **"${memberQuery}"**`);

      const newIds = card.assigneeIds.includes(member.id)
        ? card.assigneeIds
        : [...card.assigneeIds, member.id];

      await api(`/api/cards/${card.id}`, { method: 'PATCH', body: { assigneeIds: newIds } });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('👤 Member Assigned')
          .setDescription(`**${member.name}** → **${card.title}**`)
          .setColor(0x818cf8)
          .setTimestamp()
          .setFooter({ text: 'FlowBoard' })],
      });
    }

    // ── /priority ────────────────────────────────────────────────────────────
    if (commandName === 'priority') {
      const query    = interaction.options.getString('card');
      const newLevel = interaction.options.getString('level');
      const cards    = await api('/api/cards');
      const card     = findCard(cards, query);
      if (!card) return interaction.editReply(`❌ No card found matching **"${query}"**`);

      await api(`/api/cards/${card.id}`, { method: 'PATCH', body: { priority: newLevel } });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('⚡ Priority Updated')
          .setDescription(`**${card.title}**`)
          .setColor(PRIORITY_COLOR[newLevel])
          .addFields({ name: 'New Priority', value: `${PRIORITY_ICON[newLevel]} ${newLevel}`, inline: true })
          .setTimestamp()
          .setFooter({ text: 'FlowBoard' })],
      });
    }

  } catch (err) {
    console.error(`[${commandName}]`, err.message);
    interaction.editReply(`❌ ${err.message}`).catch(() => {});
  }
});

client.login(TOKEN);
