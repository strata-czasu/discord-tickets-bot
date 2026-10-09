const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Collection, PermissionsBitField } = require('discord.js');
const { fetchMember, getCommonGuilds, getPrivilegeLevel, isStaff } = require('../src/lib/users');
const canAccessTicket = require('../src/lib/tickets/access');

test('membership checks bypass stale members and only treat Unknown Member as departure', async () => {
	const cache = new Collection([['user', { id: 'user' }]]);
	const guild = { members: { cache, fetch: async options => {
		assert.deepEqual(options, { user: 'user', force: true });
		throw Object.assign(new Error('Unknown Member'), { code: 10007 });
	} } };
	assert.equal(await fetchMember(guild, 'user'), null);
	assert.equal(cache.has('user'), false);
	guild.members.fetch = async () => { throw Object.assign(new Error('Rate limited'), { code: 429 }); };
	await assert.rejects(fetchMember(guild, 'user'), { code: 429 });
});

test('DM guild discovery works with empty member caches', async () => {
	const guild = (id, present) => ({ id, available: true, members: {
		cache: new Collection(),
		fetch: async () => {
			if (!present) throw Object.assign(new Error('Unknown Member'), { code: 10007 });
			return { id: 'user' };
		},
	} });
	const client = { guilds: { cache: new Collection([['yes', guild('yes', true)], ['no', guild('no', false)]]) } };
	assert.deepEqual([...(await getCommonGuilds(client, 'user')).keys()], ['yes']);
});

test('revoked staff permissions override the old gateway member cache', async () => {
	const current = { id: 'user', permissions: new PermissionsBitField(), roles: { cache: new Collection() } };
	const guild = { id: 'guild', ownerId: 'owner', client: { supers: [], keyv: { get: async () => ['staff'] } }, members: {
		cache: new Collection([['user', { permissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild) }]]),
		fetch: async () => current,
	} };
	current.guild = guild;
	assert.equal(await isStaff(guild, 'user'), false);
	assert.equal(await getPrivilegeLevel(current), 0);
});

test('ticket access remains independent of transcript registration', () => {
	const interaction = { user: { id: 'staff' }, guildId: 'guild', client: { supers: [] }, member: {
		permissions: new PermissionsBitField(), roles: { cache: new Collection([['role', {}]]) },
	} };
	const ticket = { guildId: 'guild', createdById: 'creator', category: { staffRoles: ['role'] } };
	assert.equal(canAccessTicket(interaction, ticket), true);
	interaction.member.roles.cache.clear();
	assert.equal(canAccessTicket(interaction, ticket), false);
	assert.equal(canAccessTicket({ user: { id: 'creator' } }, ticket), true);
});
