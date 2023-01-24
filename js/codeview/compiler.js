class Token {
	constructor({ content, type, message = "", flag = "", index=-1 }) {
		/** @type {string} */
		this.content = content;

		/** @type {string} */
		this.type = type;
		
		/** @type {string} */
		this.message = message;
		
		/** @type {string} */
		this.flag = flag;
		
		/** @type {number} */
		this.index = index;
	}
	toElement(){
		const element = document.createElement('span');
		element.classList.add('cv-token');
		element.classList.add('cv-' + this.type);

		if (this.flag) element.classList.add('flag-' + this.flag);
		
		element.innerText = this.content;
		return element;
	}
}

export class CommandLanguageCompiler {
	/**
	 * @param {Map<String, RegExp|Map>} helpers 
	 * @param {Map<String, RegExp|Map>} tree 
	 */
	constructor(helpers, tree) {
		this.tree = tree;
		this.helpers = helpers;
	}
	sampledNode(node, rootCommandNode) {
		switch (typeof node) {
			case 'string':
				// Case: Return to roots of the current command
				if (node == '<...>') return this.sampledNode(rootCommandNode.next);
				// Case: Any command
				if (node == '<?>')   return this.sampledNode(this.tree);

				if (this.helpers[node]) return this.helpers[node];

				throw TypeError(`CodeError: Helper '${node}' is not found.`);
		
			case 'object': return node;
		}
	}
	/**
	 * @param {String} token 
	 * @param {Object} targetNode 
	 * @returns Object
	 */
	getNext(token, targetNode, rootCommandNode) {
		if (/<.+\?>/.test(token)) throw SyntaxError(`Unexpected token '${token}'. Tokens cannot match /<.+\?>/`);

		targetNode = this.sampledNode(targetNode.next || targetNode, rootCommandNode);
		
		for (const targetKey in targetNode) {
			const targetElement = this.sampledNode(targetNode[targetKey]);
			
			const tokenArgs = targetKey.split('|');
			const tokenLength = tokenArgs.length
			for (let i = 0; i < tokenLength; i++) {
				const arg = tokenArgs[i];
				
				 switch (arg) {
					 // Case: Any thing
					 case '<??>': return targetElement;
					 // Case: Raw
					 case token : return targetElement;
				 }

				// Case: Helpers
				if (!arg.endsWith('?>')) continue;

				const helper = this.helpers[arg] ?? targetElement;
				
				if (helper instanceof RegExp && helper.test(token)) return targetElement;
				if (helper instanceof Function && helper(token)) return targetElement;
				if (helper instanceof Object) try {
					return this.getNext(token, helper)
				} catch (error) {}
			}
		}
		
		throw SyntaxError(`Unexpected token '${token}'`);
	}
	parse(code) {
		const lines = [];
		
		let lineTokens = [];
		
		const codeLength = code.length;
		
		let rootCommandNode = this.tree;
		let currentNode = this.tree;
		let currentToken = "";

		let inComment = false;
		let winding = 0;

		for (let i = 0; i < codeLength; i++) {
			const char = code[i];
			
			if (i == codeLength - 1 && char != '\n') currentToken += char;

			if (code[i - 1] != '\\') {
				if (char == '"' || char == "'") {
					if ((winding % 2) == 1) winding--;
					else if ((winding % 2) == 0) winding++;
				} else if (char == '[' || char == '{') {
					winding++;
				} else if (char == ']' || char == '}') {
					winding--;
				}
			}

			if (char == '\n') winding = 0;

			if (
				winding === 0 &&
				(char == ' ' || char == '\n' || i == codeLength - 1)
				&& currentToken[0]
			) {
				if (inComment) {
					lineTokens.push(new Token({
						content: currentToken,
						type: 'comment',
						index: i - currentToken.length
					}));
				} else try {
					currentNode = this.getNext(currentToken, currentNode, rootCommandNode);
					
					if (lineTokens.length == 0) rootCommandNode = currentNode;
					
					lineTokens.push(new Token({
						content: currentToken,
						type: currentNode.type,
						flag: currentNode.flag,
						index: i - currentToken.length
					}));

					inComment = currentNode.type == 'comment';
				} catch (error) {
					lineTokens.push(new Token({
						content: currentToken,
						flag: 'error',
						message: error.toString(),
						index: i - currentToken.length
					}));
				}
				
				currentToken = "";
			}
			if (char == '\n') {
				lineTokens.index = i + 1;
				
				lines.push(lineTokens);
				lineTokens = [];
				
				currentNode = this.tree;
				inComment = false;
				continue;
			}
			if (char == ' ') {
				const lastToken = lineTokens.at(-1);
				if (lastToken.type == 'space') {
					lastToken.content += ' ';
					lastToken.flag = 'error';
					lastToken.message = 'Unexpected white space';
					
					continue;
				}
				
				lineTokens.push(new Token({
					content: ' ',
					type: 'space',
					index: i
				}));
				
				continue;
			}
			
			currentToken += char
		}
		
		lines.push(lineTokens);		
		return lines;
	}
}