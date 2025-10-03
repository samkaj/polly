const logs = [];

const smile = (x) => {
	console.log("smile: ", x);
	const error = new Error();
	const loc = getLocationFromStack(error.stack);

	logs.push({
		"location": loc,
		"payload": x,
		"XSS": true,
	});
}

// Helper function to extract file, line, and column from stack trace
const getLocationFromStack = (stack) => {
	const lines = stack.split('\n');
	// The second line typically contains the caller's information
	if (lines.length > 1) {
		const callerLine = lines[2]; // Index 2 to get the line after the Error constructor and this proxy's getter/setter
		// Regex to match patterns like "at functionName (file:line:column)" or "at file:line:column"
		const match = callerLine.match(/(?:at\s+.*?\s+\()?(.*?):(\d+):(\d+)\)?$/);
		if (match && match.length >= 4) {
			const functionName = match[0].split("at")[1].split("(")[0].trim();
			const filePath = match[1];
			const lineNumber = match[2];
			const columnNumber = match[3];
			// Clean up file path if it's a browser URL (e.g., 'http://localhost:8080/script.js')
			const fileName = filePath.substring(filePath.lastIndexOf('/') + 1) || filePath;
			return `${fileName}:${lineNumber}:${columnNumber} in ${functionName}`;
		}
	}
	return 'Unknown location';
};

// This is not at all guaranteed to work for everything. It assumes we can
// access the function from the current context, which is not always the case.
const getFunctionBodyFromStack = (stack) => {
	try {
		const res = stack.split(" at ");
		return { body: eval(res[2].split(" ")[0]).toString(), err: null }
	} catch (err) {
		return { body: null, err: err };
	}
}

(() => {
	const targetProperty = 'PLACEHOLDER';
	let privateValue;
	let privateProtoValue;
	// Todo array, etc? 

	const originalDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, targetProperty);
	const originalValue = originalDescriptor ? originalDescriptor.value : undefined;

	if (originalDescriptor && 'value' in originalDescriptor) {
		privateValue = originalValue;
	}


	Object.defineProperty(Object.prototype, targetProperty, {
		get: function() {
			const err = new Error();
			const loc = getLocationFromStack(err.stack);
			const isProto = this.__proto__ == null;

			let msg = `[GET] ${isProto ? "__proto__" : "obj"}['${targetProperty}'] = ${privateValue} at ${loc}`;
			console.log(msg);
			logs.push({
				"location": loc,
				"payload": `${isProto ? "__proto__" : "obj"}['${targetProperty}']`,
				"method": "get",
			});

			return isProto ? privateProtoValue : privateValue;
		},
		set: function(value) {
			const err = new Error();
			const loc = getLocationFromStack(err.stack);
			const func = getFunctionBodyFromStack(err.stack);
			const isProto = this.__proto__ == null;
			const msg = `[SET] ${isProto ? "__proto__" : "obj"}['${targetProperty}'] = ${value} at ${loc})`;

			logs.push({
				"location": loc,
				"payload": `${this.__proto__ == null ? "__proto__" : "obj"}['${targetProperty}']`,
				"method": "set",
				"function": func.err ? "N/A" : func.body,
			});
			console.log(msg);
			if (isProto) {
				privateProtoValue = value;
			} else {
				privateValue = value;
			}
		},
		configurable: true,
		enumerable: false,
	});
})();
