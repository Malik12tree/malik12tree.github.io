class Form {
	constructor(data) {
		this.form = data.form;
		this.formFirst = data.formFirst ?? true;
		this.lines = data.lines || '';

		if (data.onChange) this.onChange = data.onChange;

		this.formdata = {};
	}
	onChange(formdata) {}
	updateConditions() {
		for (const id in this.form) {
			const barData = this.form[id];
			
			if (Condition(barData.condition, this.formdata)) barData.bar.classList.remove('hidden');
			else barData.bar.classList.add('hidden');
		}
	}
	triggerOnChange() {
		this.updateConditions();

		this.onChange(this.formdata);
	}

	get(key) {
		return this.formdata[key];
	}
	set(key, value) {
		this.form[key].value = value;
		this.formdata[key] = value;
	}
	setMessage(key, value, isWarning) {
		const errorSpan = this.node.querySelector(`div#${key}`).nextSibling;
		
		if (isWarning) errorSpan.style.color = 'var(--color-warning)';
		else errorSpan.style.color = 'var(--color-error)';

		errorSpan.innerText = value;
	}
	build() {
		const element = document.createElement('div');
		element.classList.add('form');


		for (const id in this.form) {
			const barData = this.form[id];
			const label = tl(barData.label) + ':' || '';
			const type = barData.type;
			const value = barData.value;

			const bar = document.createElement('div');
			bar.setAttribute('id', id);

			const labelElement = document.createElement('label');
			labelElement.innerText = label;
			
			bar.append(labelElement);
			const error = document.createElement('span');
			error.classList.add('errorLabel');
			element.append(bar, error);

			switch (type) {
				case 'text':
					const textInput = document.createElement('input');
					textInput.type = type;
					textInput.value = value ?? "";
					textInput.spellcheck = !!barData.spellcheck;

					this.set(id, textInput.value);

					textInput.addEventListener('input', () => {
						this.set(id, textInput.value);
						this.triggerOnChange();
					});

					bar.append(textInput);
					break;
				case 'range': 
					const rangeInput = document.createElement('input');
					const rangeValueLabel = document.createElement('span');
					rangeInput.type = type;
					rangeInput.min = barData.min ?? '';
					rangeInput.max = barData.max ?? '';
					rangeInput.value = value ?? '';

					this.set(id, parseFloat(rangeInput.value));

					rangeValueLabel.innerText = rangeInput.value;
					rangeInput.addEventListener('input', () => {	
						rangeValueLabel.innerText = rangeInput.value;
						this.set(id, parseFloat(rangeInput.value));
						
						this.triggerOnChange();
					});

					bar.append(rangeInput, rangeValueLabel);
					break;
				case 'number': break;
				case 'node':
					const trigger = (value) => {
						this.set(id, value);
						this.triggerOnChange();
					}
					const customNode = barData.builder({trigger});

					$(bar).append($(customNode));
					break;
				default: throw new Error(`"${type}" is not a supported type.`);
			}

			if (barData.info) {
				const info = document.createElement('info');
				info.innerHTML = tl(barData.info);
				bar.append(info);
			}

			barData.bar = bar;

			if (!Condition(barData.condition, this.formdata)) barData.bar.classList.add('hidden');
		}

		if (this.formFirst) element.append(...$(`<span>${this.lines}<span>`));
		else element.prepend(...$(`<span>${this.lines}<span>`));

		this.node = element;
		return this;
	}
}
class Dialog extends Form {
	constructor(data) {
		super(data);

		this.title = data.title;
		if (data.onConfirm) this.onConfirm = data.onConfirm;
	}
	build() {
		const element = document.createElement('dialog');
		const body = document.createElement('div');
		const handle = document.createElement('div');
		const title = document.createElement('span');
		
		super.build();
		const formElement = this.node;

		title.innerText = this.title;
		handle.classList.add('handle');
		
		body.classList.add('body');
		
		handle.append(
			title,

			buildToolBar([{
				icon: '/assets/close.svg',
				click: () => this.hide()
			}])
		);
		body.append(
			formElement
		);
		element.append(
			handle,
			body
		);

		element.addEventListener('click', event => {
			if (event.target.nodeName === 'DIALOG') {
				this.hide();
			}
		});

		this.node = element;
		  
		return this;
	}
	show() {
		document.body.append(this.node);

		this.node.showModal();
		return this;
	}
	hide() {
		this.node.remove();
		this.node.close();
		return this;
	}
	onConfirm() {}
}
function Condition(condition, ...args) {
	if (typeof condition == 'function') return condition(...args);

	return condition == undefined || !!condition;
}
/** @type {{[key: string]: any}} */
const ID = new Proxy({}, {
	/** @param {String} key */
	get(target, key) {
		let value = '';
		for (let i = 0; i < key.length; i++) {
			
			const charPrev = key[i - 1];
			let char = key[i];
			
			if (char == '_') continue;
			else if (charPrev == '_') char = char.toUpperCase();
			else char = char.toLowerCase();
			
			value += char;
		}
		return value;
	}
});
function buildToolBar(actions) {
	const toolbar = document.createElement('div');
	toolbar.classList.add('toolbar');
	
	actions.forEach(action => {
		if (action == '_') {
			const divider = document.createElement('div');
			divider.classList.add('toolSeperator');
			toolbar.append(divider);
			return;
		}
		const tool = document.createElement('img');
		tool.classList.add('tool');
		tool.src = action.icon;

		if (action.click) tool.addEventListener('click', action.click);
		
		if (action.description) tooltip($(tool), tl(action.description));

		toolbar.append(tool);
	});

	return toolbar;
}