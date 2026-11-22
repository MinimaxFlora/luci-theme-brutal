'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	__init() {
		this.bindChrome();
		ui.menu.load().then((tree) => this.render(tree));
	},

	bindChrome() {
		const btn = document.getElementById('navtoggle');

		if (btn) {
			btn.addEventListener('click', (ev) => {
				ev.preventDefault();
				this.setNavOpen(!document.body.classList.contains('nav-open'));
			});
		}

		document.addEventListener('keydown', (ev) => {
			if (ev.key === 'Escape')
				this.closeMenus();
		});

		document.addEventListener('click', (ev) => {
			if (!ev.target.closest || !ev.target.closest('.dropdown'))
				this.closeDropdowns();
		});
	},

	setNavOpen(open) {
		const btn = document.getElementById('navtoggle');

		document.body.classList.toggle('nav-open', open);

		if (btn)
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');

		if (!open)
			this.closeDropdowns();
	},

	closeMenus() {
		this.setNavOpen(false);
		this.closeDropdowns();
	},

	closeDropdowns(except) {
		document.querySelectorAll('header li.dropdown.open').forEach((li) => {
			if (except && li === except)
				return;

			li.classList.remove('open');

			const link = li.querySelector(':scope > a.menu');
			if (link)
				link.setAttribute('aria-expanded', 'false');
		});
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (let i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

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

	renderMainMenu(tree, url, level) {
		const ul = level ? E('ul', { 'class': 'dropdown-menu' }) : document.querySelector('#topmenu');
		const children = ui.menu.getChildren(tree);

		if (!ul || children.length === 0 || level > 1)
			return E([]);

		children.forEach((child) => {
			const submenu = this.renderMainMenu(child, url + '/' + child.name, (level || 0) + 1);
			const hasChildren = (submenu.firstElementChild != null);
			const classes = [];

			if (!level && hasChildren)
				classes.push('dropdown');

			if (this.isActivePath(url + '/' + child.name))
				classes.push('active');

			const li = E('li', { 'class': classes.join(' ') }, [
				E('a', {
					'class': (!level && hasChildren) ? 'menu' : '',
					'href': hasChildren ? '#' : L.url(url, child.name)
				}, [ _(child.title) ]),
				submenu
			]);

			ul.appendChild(li);
		});

		ul.style.display = '';

		if (!level) {
			this.closeDropdowns();
			this.bindNavLinks(ul);
			this.bindDropdowns(ul);
		}

		return ul;
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

	bindNavLinks(root) {
		root.querySelectorAll('a').forEach((link) => {
			if (link.classList.contains('menu'))
				return;

			link.addEventListener('click', () => this.setNavOpen(false));
		});
	},

	bindDropdowns(root) {
		root.querySelectorAll('li.dropdown > a.menu').forEach((link) => {
			const li = link.parentNode;

			link.setAttribute('aria-haspopup', 'true');
			link.setAttribute('aria-expanded', li.classList.contains('open') ? 'true' : 'false');

			link.addEventListener('click', (ev) => {
				ev.preventDefault();

				const open = !li.classList.contains('open');

				this.closeDropdowns(li);
				li.classList.toggle('open', open);
				link.setAttribute('aria-expanded', open ? 'true' : 'false');
			});
		});
	},

	renderModeMenu(tree) {
		const ul = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		if (!ul)
			return;

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			ul.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				this.renderMainMenu(child, child.name);
		});

		if (ul.children.length > 1)
			ul.style.display = '';
	}
});
