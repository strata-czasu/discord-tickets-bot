const { Button } = require('@eartharoid/dbf');
const { MessageFlags } = require('discord.js');

module.exports = class ClaimButton extends Button {
	constructor(client, options) {
		super(client, {
			...options,
			id: 'transcript',
		});
	}

	/**
	 * @param {*} id
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async run(id, interaction) {
		return interaction.reply({
			content: 'Transcripts are currently disabled. Previously archived data is retained and can be exported by a server administrator.',
			flags: MessageFlags.Ephemeral,
		});
	}
};
