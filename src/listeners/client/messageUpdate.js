const { Listener } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');
const { logMessageEvent } = require('../../lib/logging');

module.exports = class extends Listener {
	constructor(client, options) {
		super(client, {
			...options,
			emitter: client,
			event: 'messageUpdate',
		});
	}


	/**
	 * @param {import("discord.js").Message} oldMessage
	 * @param {import("discord.js").Message} newMessage
	 */
	async run(oldMessage, newMessage) {
		/** @type {import("client")} */
		const client = this.client;

		if (newMessage.partial) {
			try {
				newMessage = await newMessage.fetch();
			} catch (error) {
				client.log.error(error);
				return;
			}
		}

		if (!newMessage.guild) return;
		if (newMessage.flags.has(MessageFlags.Ephemeral)) return;
		if (!newMessage.editedAt) return;

		const ticket = await client.prisma.ticket.findUnique({
			include: { guild: true },
			where: { id: newMessage.channel.id },
		});
		if (!ticket) return;

		if (newMessage.author.id === client.user.id) return;

		await logMessageEvent(this.client, {
			action: 'update',
			target: newMessage,
			ticket,
		});
	}
};
