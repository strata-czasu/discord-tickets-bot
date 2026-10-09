const { expose } = require('threads/worker');
const reduce = (closedTickets, prop) => closedTickets.reduce((total, ticket) => total + (ticket[prop] - ticket.createdAt), 0) || 1;

const getAvgResolutionTime = closedTickets => reduce(closedTickets, 'closedAt') / Math.max(closedTickets.length, 1);

const getAvgResponseTime = closedTickets => reduce(closedTickets, 'firstResponseAt') / Math.max(closedTickets.length, 1);

const sum = numbers => numbers.reduce((t, n) => t + n, 0);

const getAvgRating = closedTickets => {
	const ratings = closedTickets
		.map(t => t.feedback?.rating)
		.filter(r => typeof r === 'number');
	return (sum(ratings) || 0) / Math.max(ratings.length, 1);
};

expose({
	getAvgRating,
	getAvgResolutionTime,
	getAvgResponseTime,
	sum,
});
