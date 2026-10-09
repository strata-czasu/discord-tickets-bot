const { fetchMember } = require('./users');

const running = new WeakSet();

/** Check ticket creators on demand, independently of inactivity settings. */
module.exports = async client => {
	if (running.has(client)) return;
	running.add(client);
	try {
		const tickets = await client.prisma.ticket.findMany({
			select: {
				createdById: true,
				guildId: true,
				id: true,
			},
			where: { open: true },
		});
		const groups = new Map();
		for (const ticket of tickets) {
			const key = `${ticket.guildId}/${ticket.createdById}`;
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push(ticket);
		}
		for (const group of groups.values()) {
			const {
				createdById, guildId,
			} = group[0];
			const guild = client.guilds.cache.get(guildId);
			if (!guild?.available) continue;
			try {
				if (await fetchMember(guild, createdById)) continue;
				for (const ticket of group) {
					// A staff interaction may have closed it while membership was checked.
					const current = await client.prisma.ticket.findUnique({
						select: { open: true },
						where: { id: ticket.id },
					});
					if (current?.open) await client.tickets.finallyClose(ticket.id, { reason: 'user left server' });
				}
			} catch (error) {
				client.log.warn('Could not check or close tickets for member %s in guild %s; retrying next interval', createdById, guildId);
				client.log.error(error);
			}
		}
	} finally {
		running.delete(client);
	}
};
