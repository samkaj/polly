const logs = [];


function smile(x) {
	//alert("SMILE!! ", x);
	//console.log("MSILE: ", x);
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
			const filePath = match[1];
			const lineNumber = match[2];
			const columnNumber = match[3];
			// Clean up file path if it's a browser URL (e.g., 'http://localhost:8080/script.js')
			const fileName = filePath.substring(filePath.lastIndexOf('/') + 1) || filePath;
			return `${fileName}:${lineNumber}:${columnNumber}`;
		}
	}
	return 'Unknown location';
};

(() => {
	const targetProperty = 'PLACEHOLDER';
	let privateValue;
	let privateProtoValue;
	// Todo array, etc? 

	const originalDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, targetProperty);

	const originalGet = originalDescriptor ? originalDescriptor.get : undefined;
	const originalSet = originalDescriptor ? originalDescriptor.set : undefined;
	const originalValue = originalDescriptor ? originalDescriptor.value : undefined;

	console.log("CHECK: ")
	console.log(originalGet);
	console.log(originalSet);
	console.log(originalValue);

	if (originalDescriptor && 'value' in originalDescriptor) {
		console.log("HERE?!");
		privateValue = originalValue;
	}


	Object.defineProperty(Object.prototype, targetProperty, {

		get: function() {
			const err = new Error();
			const loc = getLocationFromStack(err.stack);
			
			let msg = `[GET] ${!this.hasOwnProperty(targetProperty) ? "__proto__" : "obj"}['${targetProperty}'] = ${privateValue} at ${loc} (privproto: ${privateProtoValue})`;
			console.log(msg);
			logs.push({
				"location": loc,
				"payload": `${!this.hasOwnProperty(targetProperty) ? "__proto__" : "obj"}['${targetProperty}']`,
				"method": "get",
			});
			if( !this.hasOwnProperty(targetProperty) ) {
				return privateProtoValue;
			} 
			return privateValue;
		},
		set: function(value) {
			const err = new Error();
			const loc = getLocationFromStack(err.stack);
			const msg = `[SET] ${this.__proto__ == null ? "__proto__" : "obj"}['${targetProperty}'] = ${value} at ${loc} (privproto: ${privateProtoValue})`;
			logs.push({
				"location": loc,
				"payload": `${this.__proto__ == null ? "__proto__" : "obj"}['${targetProperty}']`,
				"method": "set",
			});
			console.log(msg);
			if( this.__proto__ == null ) {
				privateProtoValue = value;
			} else {
				privateValue = value;
		    }
		},
		configurable: true,
		enumerable: false,
	});
})();


