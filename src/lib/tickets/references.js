const ms = require('ms');

const key = (interaction, messageId) => `reference/${interaction.guildId}/${interaction.user.id}/${messageId}`;

/** Keep the context-command payload through menus/modals, without archiving it. */
module.exports.captureReference = async interaction => {
	const message = interaction.targetMessage;
	if (message.system) return;
	await interaction.client.keyv.set(key(interaction, message.id), {
		author: message.author.toString(),
		avatar: message.member?.displayAvatarURL() || message.author.displayAvatarURL(),
		content: message.content,
		createdTimestamp: message.createdTimestamp,
		displayName: message.member?.displayName || message.author.username,
		url: message.url,
	}, ms('15m'));
};

module.exports.getReference = (interaction, messageId) => interaction.client.keyv.get(key(interaction, messageId));
