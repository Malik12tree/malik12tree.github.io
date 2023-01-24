import { MinecraftFunction } from "./language.js";

window.CodeView = class CodeView {
	constructor(data) {
		this.langs = data.langs;
		this.activeLang = data.activeLang || data.langs[0];
		this.node = $('<div class="codeview show minimized"><div class="mizer tool"></div><div class="lines"></div></div>');
		this.hidden = false;
		this.ondownload = data.ondownload || this.download;
		this.zoom = 11;

		this.node.children('.mizer').on('click', () => {
			if (this.node.hasClass('maximized')) {
				this.minimize()
			} else {
				this.maximize()
			}
		})

		
		const toolbar = buildToolBar([
			{ description: 'generic.toggle_visiblity', icon: '/assets/expand_more.svg', click: () => this.toggleVisibility()},
			{ description: 'generic.copy', icon: '/assets/content_copy.svg', click: () => this.copy()},
			{ description: 'generic.download', icon: '/assets/file_download.svg', click: () => this.ondownload()},
			'_',
			{ description: 'generic.zoom_in', icon: '/assets/zoom_in.svg', click: () => {
				this.zoom++;
				this.updateZoom();
			}},
			{ description: 'generic.zoom_out', icon: '/assets/zoom_out.svg', click: () => {
				this.zoom--;
				this.updateZoom();
			}},
		]);
		this.node.append(toolbar);		

		this.updateZoom();

		this.content = data.content || '';

		if (localStorage.codeview_state && localStorage.codeview_state == 'true') {
			this.toggleVisibility();
		}
	}
	toggleVisibility() {
		this.hidden = this.node.hasClass('show');
		localStorage.setItem('codeview_state', this.hidden);
		this.minimize();
		
		if (this.node.hasClass('show')) {
			this.node.removeClass('show');
			this.node.addClass('hide');
			return;
		}
		
		this.update();
		this.node.removeClass('hide');
		this.node.addClass('show');
	}
	updateZoom() {
		this.node.attr('style', `font-size: ${this.zoom}pt`);
	}
	maximize() {
		this.node.removeClass('minimized');
		this.node.addClass('maximized');
		$(':root')[0].style.setProperty('--prop-codeview_width', '100%');
		$(':root')[0].style.setProperty('--prop-codeview_height', '100%');
	}
	minimize() {
		this.node.removeClass('maximized');
		this.node.addClass('minimized');
		$(':root')[0].style.removeProperty('--prop-codeview_width');
		$(':root')[0].style.removeProperty('--prop-codeview_height');
	}
	get highlightingManger() {
		return Highlighers[this.activeLang];
	}
	update() {
		if (this.hidden) return;

		const lines = this.node.children('.lines');
		lines.empty();
		
		MinecraftFunction.parse(this.content).forEach(lineTokens => {
			const line = document.createElement('div');
			line.classList.add('line');
			lines.append(line);

			lineTokens.forEach(token => 
				line.append(token.toElement())
			);
			
			if (lineTokens.length) return;
			
			lines.append('<br>');
		});

	}
	init() {
		this.update();

		return this;
	}
	copy() {
		selectElement(this.node[0]);
		navigator.clipboard.writeText(this.content);
	}
	download() {
		downloadFile('equation.mcfunction', this.content);
	}
}