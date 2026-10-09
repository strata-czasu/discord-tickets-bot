const {
	Collection, PermissionsBitField,
} = require('discord.js');

/** Fetch current membership; only Unknown Member means the user has left. */
const fetchMember = async (guild, userId) => {
	try {
		return await guild.members.fetch({
			force: true,
			user: userId,
		});
	} catch (error) {
		if (error.code !== 10007) throw error;
		guild.members.cache.delete(userId);
		return null;
	}
};

module.exports.fetchMember = fetchMember;

/**
 *
 * @param {import("discord.js").Client} client
 * @param {string} userId
 * @returns {Promise<Collection<import("discord.js").Guild>}
 */
module.exports.getCommonGuilds = async (client, userId) => {
	const common = new Collection();
	const guilds = [...client.guilds.cache.values()].filter(guild => guild.available);
	for (let i = 0; i < guilds.length; i += 5) {
		await Promise.all(guilds.slice(i, i + 5).map(async guild => {
			if (await fetchMember(guild, userId)) common.set(guild.id, guild);
		}));
	}
	return common;
};

/**
 * @param {import("discord.js").Guild} guild
 * @returns {Promise<string[]>}
 */
const updateStaffRoles = async guild => {
	const { categories } = await guild.client.prisma.guild.findUnique({
		select: { categories: { select: { staffRoles: true } } },
		where: { id: guild.id },
	});
	const staffRoles = [
		...new Set(
			categories.reduce((acc, c) => {
				acc.push(...c.staffRoles);
				return acc;
			}, []),
		),
	];
	await guild.client.keyv.set(`cache/guild-staff:${guild.id}`, staffRoles);
	return staffRoles;
};

module.exports.updateStaffRoles = updateStaffRoles;

/**
 *
 * @param {import("discord.js").Guild} guild
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const isStaff = async (guild, userId, member) => {
	/** @type {import("client")} */
	const client = guild.client;
	if (client.supers.includes(userId)) return true;
	try {
		const guildMember = member || await fetchMember(guild, userId);
		if (!guildMember) return false;
		if (guildMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
		const staffRoles = await client.keyv.get(`cache/guild-staff:${guild.id}`) || await updateStaffRoles(guild);
		return staffRoles.some(r => guildMember.roles.cache.has(r));
	} catch {
		return false;
	}
};

module.exports.isStaff = isStaff;

/**
 *
 * @param {import("discord.js")} member
 * @returns {Promise<number>}
 * 	- `4` = OPERATOR (SUPER)
 *  - `3` = GUILD_OWNER
 *  - `2` = GUILD_ADMIN
 *  - `1` = GUILD_STAFF
 *  - `0` = GUILD_MEMBER
 *  - `-1` = NONE (NOT A MEMBER)
 */
module.exports.getPrivilegeLevel = async member => {
	if (!member) return -1;
	else if (member.guild.client.supers.includes(member.id)) return 4;
	else if (member.guild.ownerId === member.id) return 3;
	else if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return 2;
	else if (await isStaff(member.guild, member.id, member)) return 1;
	else return 0;
};
