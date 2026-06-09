// Run this ONCE after setting up your .env to register slash commands with Discord
// Usage: node register-commands.js

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('board')
    .setDescription('Show a full overview of the Kanban board'),

  new SlashCommandBuilder()
    .setName('cards')
    .setDescription('List cards — optionally filtered by column')
    .addStringOption(o => o.setName('column').setDescription('Column name (e.g. Backlog, In Progress)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('card')
    .setDescription('Show details of a specific card')
    .addStringOption(o => o.setName('title').setDescription('Card title (partial match)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Create a new card')
    .addStringOption(o => o.setName('title').setDescription('Card title').setRequired(true))
    .addStringOption(o => o.setName('column').setDescription('Target column (default: Backlog)').setRequired(false))
    .addStringOption(o => o.setName('priority').setDescription('Priority level').setRequired(false)
      .addChoices(
        { name: '🔴 Critical', value: 'critical' },
        { name: '🟠 High',     value: 'high'     },
        { name: '🟡 Medium',   value: 'medium'   },
        { name: '🟢 Low',      value: 'low'      },
      ))
    .addStringOption(o => o.setName('due').setDescription('Due date (YYYY-MM-DD)').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('Card description').setRequired(false)),

  new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a card to a different column')
    .addStringOption(o => o.setName('card').setDescription('Card title (partial match)').setRequired(true))
    .addStringOption(o => o.setName('column').setDescription('Target column name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('done')
    .setDescription('Mark a card as done (moves it to the Done column)')
    .addStringOption(o => o.setName('card').setDescription('Card title (partial match)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('overdue')
    .setDescription('List all overdue cards'),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show board analytics and stats'),

  new SlashCommandBuilder()
    .setName('assign')
    .setDescription('Assign a team member to a card')
    .addStringOption(o => o.setName('card').setDescription('Card title (partial match)').setRequired(true))
    .addStringOption(o => o.setName('member').setDescription('Member name (partial match)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Change the priority of a card')
    .addStringOption(o => o.setName('card').setDescription('Card title (partial match)').setRequired(true))
    .addStringOption(o => o.setName('level').setDescription('New priority').setRequired(true)
      .addChoices(
        { name: '🔴 Critical', value: 'critical' },
        { name: '🟠 High',     value: 'high'     },
        { name: '🟡 Medium',   value: 'medium'   },
        { name: '🟢 Low',      value: 'low'      },
      )),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log('Registering slash commands…');
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log(`✅ Registered ${commands.length} commands to guild ${process.env.DISCORD_GUILD_ID}`);
})().catch(console.error);
