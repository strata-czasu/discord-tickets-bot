const assert = require('node:assert/strict');
const { test } = require('node:test');
const Keyv = require('keyv');
const { captureReference, getReference } = require('../src/lib/tickets/references');
const { checkGuildSettings, checkTagSettings } = require('../src/lib/content-settings');

test('context message previews survive category and modal interactions without a REST refetch', async () => {
	const client = { keyv: new Keyv() };
	const context = { client, guildId: 'guild', user: { id: 'user' }, targetMessage: {
		id: 'message', system: false, content: 'A request for help', createdTimestamp: 123,
		author: { toString: () => '<@author>', displayAvatarURL: () => 'avatar', username: 'Author' },
		url: 'https://discord.com/channels/guild/channel/message',
	} };
	await captureReference(context);
	const modal = { client, guildId: 'guild', user: { id: 'user' } };
	assert.equal((await getReference(modal, 'message')).content, 'A request for help');
	assert.equal(await getReference({ ...modal, user: { id: 'other' } }, 'message'), undefined);
	assert.equal(await getReference({ ...modal, guildId: 'other' }, 'message'), undefined);
});

test('retired content controls are rejected while ordinary settings and manual tags remain editable', () => {
	assert.throws(() => checkGuildSettings({ archive: true }), { statusCode: 400 });
	assert.throws(() => checkGuildSettings({ autoTag: 'all' }), { statusCode: 400 });
	assert.doesNotThrow(() => checkGuildSettings({ staleAfter: 600000 }));
	assert.throws(() => checkTagSettings({ regex: 'help' }), { statusCode: 400 });
	const manual = { name: 'help', content: 'Helpful text', regex: null };
	checkTagSettings(manual);
	assert.deepEqual(manual, { name: 'help', content: 'Helpful text' });
});
