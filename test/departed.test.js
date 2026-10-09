const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Collection } = require('discord.js');
const handleDeparted = require('../src/lib/departed');

const makeClient = fetch => {
	const closed = [];
	const guild = { available: true, members: { cache: new Collection(), fetch } };
	return {
		closed,
		guilds: { cache: new Collection([['guild', guild]]) },
		log: { warn: () => {}, error: () => {} },
		prisma: { ticket: {
			findMany: async query => {
				assert.deepEqual(query.where, { open: true });
				return ['one', 'two'].map(id => ({ id, guildId: 'guild', createdById: 'user' }));
			},
			findUnique: async () => ({ open: true }),
		} },
		tickets: { finallyClose: async (id, options) => closed.push({ id, ...options }) },
	};
};

test('one confirmed departure check closes all open tickets for the same creator', async () => {
	let calls = 0;
	const client = makeClient(async () => {
		calls++;
		throw Object.assign(new Error('Unknown Member'), { code: 10007 });
	});
	await handleDeparted(client);
	assert.equal(calls, 1);
	assert.deepEqual(client.closed, [
		{ id: 'one', reason: 'user left server' }, { id: 'two', reason: 'user left server' },
	]);
});

test('transient lookup errors leave tickets open and allow a subsequent check', async () => {
	const client = makeClient(async () => { throw new Error('Network failure'); });
	await handleDeparted(client);
	assert.deepEqual(client.closed, []);
	client.guilds.cache.get('guild').members.fetch = async () => { throw Object.assign(new Error('Unknown Member'), { code: 10007 }); };
	await handleDeparted(client);
	assert.equal(client.closed.length, 2);
});

test('overlapping polls and unavailable guilds do not close tickets', async () => {
	let release;
	let calls = 0;
	const client = makeClient(async () => {
		calls++;
		return new Promise(resolve => { release = resolve; });
	});
	const first = handleDeparted(client);
	await new Promise(resolve => setImmediate(resolve));
	await handleDeparted(client);
	assert.equal(calls, 1);
	release({ id: 'user' });
	await first;
	client.guilds.cache.get('guild').available = false;
	await handleDeparted(client);
	assert.equal(calls, 1);
	assert.deepEqual(client.closed, []);
});
