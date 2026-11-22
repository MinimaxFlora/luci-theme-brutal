'use strict';
'require baseclass';
'require ui';

const MENU_ICONS = {
	quickstart: 'home',
	network_guide: 'guide',
	status: 'status',
	system: 'system',
	store: 'store',
	services: 'services',
	nas: 'nas',
	network: 'network',
	vpn: 'vpn',
	logout: 'logout'
};

return baseclass.extend({
	__init__() {
		this.bindChrome();
		ui.menu.load().then((tree) => this.render(tree));
	},

	bindChrome() {
		const btn = document.getElementById('navtoggle');
		const scrim = document.getElementById('navscrim');

		if (btn) {
			btn.addEventListener('click', (ev) => {
				ev.preventDefault();
				this.setNavOpen(!document.body.classList.contains('nav-open'));
			});
		}

		if (scrim) {
			scrim.addEventListener('click', () => this.setNavOpen(false));
		}

		document.addEventListener('keydown', (ev) => {
			if (ev.key === 'Escape')
				this.setNavOpen(false);
		});
	},

	setNavOpen(open) {
		const btn = document.getElementById('navtoggle');

		document.body.classList.toggle('nav-open', open);

		if (btn)
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (let i = 0; i < 3 && node; i++) {
				node = node.children ? node.children[L.env.dispatchpath[i]] : null;
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	isActivePath(path) {
		const parts = path.split('/');
		const current = L.env.dispatchpath;

		if (parts.length > current.length)
			return false;

		for (let i = 0; i < parts.length; i++) {
			if (parts[i] !== current[i])
				return false;
		}

		return true;
	},

	renderIcon(name) {
		const icon = MENU_ICONS[name] || 'default';
		const url = '%s/icons/%s.svg'.format(L.env.media, icon);

		return E('span', {
			'class': 'sidebar-icon',
			'aria-hidden': 'true',
			'style': '--br-icon: url("%s")'.format(url)
		});
	},

	renderSidebar(mode, url) {
		const container = document.querySelector('#mainmenu');

		if (!container)
			return;

		while (container.firstChild)
			container.removeChild(container.firstChild);

		const ul = E('ul', { 'class': 'sidebar-nav' });
		const children = ui.menu.getChildren(mode);

		children.forEach((child) => {
			const path = url + '/' + child.name;
			const subs = ui.menu.getChildren(child);
			const active = this.isActivePath(path);
			const open = active && subs.length > 0;
			const classes = ['sidebar-item'];

			if (active)
				classes.push('active');

			if (open)
				classes.push('open');

			const li = E('li', { 'class': classes.join(' ') });

			if (subs.length === 0) {
				const link = E('a', {
					'href': L.url(url, child.name),
					'class': 'sidebar-link'
				}, [ this.renderIcon(child.name), _(child.title) ]);

				link.addEventListener('click', () => this.setNavOpen(false));
				li.appendChild(link);
			}
			else {
				const link = E('a', {
					'href': '#',
					'class': 'sidebar-link',
					'aria-expanded': open ? 'true' : 'false'
				}, [
					this.renderIcon(child.name),
					_(child.title),
					E('span', { 'class': 'sidebar-caret', 'aria-hidden': 'true' })
				]);

				const sub = E('ul', { 'class': 'sidebar-sub' }, subs.map((subchild) => {
					const subactive = this.isActivePath(path + '/' + subchild.name);
					const sublink = E('a', {
						'href': L.url(url, child.name, subchild.name),
						'aria-current': subactive ? 'page' : null
					}, [ _(subchild.title) ]);

					sublink.addEventListener('click', () => this.setNavOpen(false));

					return E('li', { 'class': subactive ? 'active' : '' }, sublink);
				}));

				link.addEventListener('click', (ev) => {
					ev.preventDefault();
					this.toggleGroup(ul, li, link);
				});

				li.appendChild(link);
				li.appendChild(sub);
			}

			ul.appendChild(li);
		});

		container.appendChild(E('div', { 'class': 'sidebar-title' }, _('Navigation')));
		container.appendChild(ul);
		container.style.display = '';
	},

	toggleGroup(ul, li, link) {
		const wasOpen = li.classList.contains('open');

		ul.querySelectorAll('li.open').forEach((other) => {
			other.classList.remove('open');

			const otherLink = other.querySelector(':scope > .sidebar-link');
			if (otherLink)
				otherLink.setAttribute('aria-expanded', 'false');
		});

		if (!wasOpen) {
			li.classList.add('open');
			link.setAttribute('aria-expanded', 'true');
		}
	},

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		if (!container)
			return E([]);

		children.forEach((child) => {
			const isActive = (L.env.dispatchpath[3 + (level || 0)] === child.name);
			const className = 'tabmenu-item-%s %s'.format(child.name, isActive ? 'active' : '');

			ul.appendChild(E('li', { 'class': className }, [
				E('a', {
					'href': L.url(url, child.name),
					'aria-current': isActive ? 'page' : null
				}, [ _(child.title) ])
			]));

			if (isActive)
				activeNode = child;
		});

		if (ul.children.length === 0)
			return E([]);

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

		return ul;
	},

	renderModeMenu(tree) {
		const ul = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			if (ul)
				ul.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
					E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
				]));

			if (isActive)
				this.renderSidebar(child, child.name);
		});

		if (ul && ul.children.length > 1)
			ul.style.display = '';
	}
});
