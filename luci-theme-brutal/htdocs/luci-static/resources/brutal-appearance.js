'use strict';
'require baseclass';
'require rpc';
'require ui';

const callGet = rpc.declare({
	object: 'luci.brutal_appearance',
	method: 'get',
	expect: { '': {} },
	raise: true
});

const callSet = rpc.declare({
	object: 'luci.brutal_appearance',
	method: 'set',
	params: [ 'mode' ],
	expect: { '': {} },
	raise: true
});

const callAccess = rpc.declare({
	object: 'session',
	method: 'access',
	params: [ 'scope', 'object', 'function' ],
	expect: { access: false },
	raise: true
});

const LABELS = {
	light: _('Light mode'),
	dark: _('Dark mode'),
	normal: _('Follow system')
};

return baseclass.extend({
	__init__() {
		this.root = document.getElementById('brutal-appearance');

		if (!this.root)
			return;

		this.mode = document.documentElement.dataset.brutalMode || 'normal';
		this.busy = false;
		this.preference = window.matchMedia('(prefers-color-scheme: dark)');

		Promise.all([
			callGet(),
			callAccess('ubus', 'luci.brutal_appearance', 'set')
		]).then((results) => {
			if (results[0].result !== 0 || !this.validMode(results[0].mode))
				return;

			this.writable = results[1] === true;
			this.render();
			this.applyMode(results[0].mode);
			this.root.hidden = false;

			const onSystemChange = () => {
				if (this.mode === 'normal')
					this.applyMode('normal');
			};

			if (this.preference.addEventListener)
				this.preference.addEventListener('change', onSystemChange);
			else
				this.preference.addListener(onSystemChange);
		}).catch(() => {});
	},

	validMode(mode) {
		return [ 'normal', 'light', 'dark' ].includes(mode);
	},

	icon(mode) {
		return E('span', { 'class': 'brutal-appearance-icon', 'data-mode': mode, 'aria-hidden': 'true' });
	},

	render() {
		this.trigger = E('button', {
			'type': 'button',
			'class': 'brutal-appearance-trigger',
			'aria-label': _('Appearance'),
			'aria-expanded': 'false',
			'aria-controls': 'brutal-appearance-options',
			'click': () => this.open(this.panel.hidden)
		}, this.icon('normal'));

		this.radios = Object.keys(LABELS).map((mode) => E('input', {
			'type': 'radio',
			'name': 'brutal-appearance-mode',
			'value': mode,
			'class': 'brutal-appearance-radio',
			'disabled': !this.writable || null,
			'change': (ev) => {
				if (ev.target.checked)
					this.saveMode(mode);
			}
		}));

		this.panel = E('fieldset', {
			'id': 'brutal-appearance-options',
			'class': 'brutal-appearance-panel',
			'hidden': true
		}, [
			...Object.keys(LABELS).map((mode, index) => E('label', {
				'class': 'brutal-appearance-option',
				'data-mode': mode,
				'aria-disabled': !this.writable ? 'true' : null
			}, [
				this.radios[index],
				this.icon(mode),
				E('span', {}, LABELS[mode]),
				E('span', { 'class': 'brutal-appearance-check', 'aria-hidden': 'true' })
			])),
			!this.writable ? E('p', { 'class': 'brutal-appearance-readonly' }, _('Read-only')) : ''
		]);

		this.root.appendChild(this.trigger);
		this.root.appendChild(this.panel);

		this.root.addEventListener('keydown', (ev) => {
			if (ev.key === 'Escape' && !this.panel.hidden) {
				ev.preventDefault();
				this.open(false, true);
			}
		});

		document.addEventListener('click', (ev) => {
			if (!this.root.contains(ev.target))
				this.open(false);
		});

		this.root.addEventListener('focusout', (ev) => {
			if (ev.relatedTarget && !this.root.contains(ev.relatedTarget))
				this.open(false);
		});
	},

	open(show, restoreFocus) {
		this.panel.hidden = !show;
		this.trigger.setAttribute('aria-expanded', String(show));

		if (show) {
			const checked = this.radios.find((radio) => radio.checked && !radio.disabled);

			if (checked)
				checked.focus();
		}
		else if (restoreFocus) {
			this.trigger.focus();
		}
	},

	applyMode(mode) {
		const html = document.documentElement;

		html.dataset.brutalMode = mode;
		this.mode = mode;
		this.root.dataset.mode = mode;
		this.radios.forEach((radio) => { radio.checked = (radio.value === mode); });

		this.trigger.replaceChildren(this.icon(mode));
		this.trigger.setAttribute('aria-label', _('Appearance') + ': ' + LABELS[mode]);
	},

	saveMode(mode) {
		if (!this.writable || this.busy || !this.validMode(mode) || mode === this.mode)
			return Promise.resolve();

		const previous = this.mode;

		this.busy = true;
		this.radios.forEach((radio) => { radio.disabled = true; });
		this.panel.setAttribute('aria-busy', 'true');
		this.applyMode(mode);
		this.open(false, true);

		return callSet(mode).then((result) => {
			if (result.result !== 0 || result.mode !== mode)
				throw new Error('save failed');

			window.dispatchEvent(new CustomEvent('brutal-appearance-saved', { detail: { mode: mode } }));
		}).catch(() => {
			return callGet().catch(() => ({})).then((state) => {
				this.applyMode((state.result === 0 && this.validMode(state.mode)) ? state.mode : previous);
				ui.addNotification(null, E('p', { 'role': 'alert' }, _('Unable to save the theme mode.')), 'error');
			});
		}).finally(() => {
			this.busy = false;
			this.panel.removeAttribute('aria-busy');
			this.radios.forEach((radio) => { radio.disabled = !this.writable; });
		});
	}
});
