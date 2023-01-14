class Form {
	constructor(data) {
		this.form = data.form;
		this.style = data.style ?? '';

		if (data.onChange) this.onChange = data.onChange;

		this.formdata = {};
		this.build();
	}
	onChange(formdata) {}

	get(key) {
		return this.formdata[key];
	}
	set(key, value) {
		this.formdata[key] = value;
	}
	setError(key, value) {
		this.node.querySelector(`div#${key}`).nextSibling.innerText = value;
	}
	build() {
		const element = document.createElement('div');
		element.classList.add('form');
		element.style = this.style;

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
					textInput.value = barData.value ?? "";
					textInput.spellcheck = !!barData.spellcheck;

					this.set(id, textInput.value);

					textInput.addEventListener('input', () => {
						this.set(id, textInput.value);
						this.onChange(this.formdata);
					});

					bar.append(textInput);
					break;
				case 'range': 
					const rangeInput = document.createElement('input');
					const rangeValueLabel = document.createElement('span');
					rangeInput.type = type;
					rangeInput.min = barData.min ?? '';
					rangeInput.max = barData.max ?? '';
					rangeInput.value = barData.value ?? '';

					this.set(id, parseFloat(rangeInput.value));

					rangeValueLabel.innerText = rangeInput.value;
					rangeInput.addEventListener('input', () => {	
						rangeValueLabel.innerText = rangeInput.value;
						this.set(id, parseFloat(rangeInput.value));
						
						this.onChange(this.formdata);
					});

					bar.append(rangeInput, rangeValueLabel);
					break;
				case 'number': break;
				case 'node':
					const trigger = (value) => {
						this.set(id, value);
						this.onChange(this.formdata);
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
		}
		return this.node = element;
	}
}

function buildToolBar(actions) {
	const toolbar = document.createElement('div');
	toolbar.classList.add('toolbar');
	
	actions.forEach(action => {
		const tool = document.createElement('img');
		tool.classList.add('tool');
		tool.src = action.icon;

		if (action.click) tool.addEventListener('click', action.click);
		
		if (action.description) tooltip($(tool), tl(action.description));

		toolbar.append(tool);
	});

	return toolbar;
}