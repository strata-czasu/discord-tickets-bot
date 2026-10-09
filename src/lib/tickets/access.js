const { PermissionsBitField } = require('discord.js');

/** Ticket access using the member supplied with the current interaction. */
module.exports = (interaction, ticket) => {
	if (ticket.createdById === interaction.user.id) return true;
	if (interaction.guildId !== ticket.guildId || !interaction.member) return false;
	if (interaction.client.supers.includes(interaction.user.id)) return true;
	if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
	return ticket.category.staffRoles.some(id => interaction.member.roles.cache.has(id));
};
