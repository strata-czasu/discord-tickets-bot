const { pools } = require('./threads');

const { stats } = pools;

const getAverageRating = closedTickets => stats.queue(async w => await w.getAvgRating(closedTickets));

const getAverageTimes = closedTickets => stats.queue(async w => ({
	avgResolutionTime: await w.getAvgResolutionTime(closedTickets),
	avgResponseTime: await w.getAvgResponseTime(closedTickets),
}));

module.exports = {
	getAverageRating,
	getAverageTimes,
};
