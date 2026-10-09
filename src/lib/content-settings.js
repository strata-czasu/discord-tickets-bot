const unsupported = message => Object.assign(new Error(message), { statusCode: 400 });

module.exports.checkGuildSettings = data => {
	if ('archive' in data || 'autoTag' in data) {
		throw unsupported('Message archiving and automatic tags are disabled.');
	}
};

module.exports.checkTagSettings = data => {
	if (data.regex) throw unsupported('Automatic tag regular expressions are disabled. Use /tag instead.');
	delete data.regex;
};
