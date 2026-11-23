'use strict';
'require view';
'require form';
'require fs';
'require rpc';
'require uci';
'require ui';

const TRANSPARENCY = [ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1 ];
const VERSION = '1.3.1';
const RELEASES = 'https://github.com/MinimaxFlora/luci-theme-brutal/releases/latest';
function compareVersions(a, b) {
	const pa = String(a || '').split('.').map((part) => parseInt(part, 10) || 0);
	const pb = String(b || '').split('.').map((part) => parseInt(part, 10) || 0);
	const len = Math.max(pa.length, pb.length);

	for (let i = 0; i < len; i++) {
		const diff = (pa[i] || 0) - (pb[i] || 0);

		if (diff !== 0)
			return diff;
	}

	return 0;
}

const ACCENT_NAMES = {
	cyan: '#00d9ff',
	pink: '#ff006e',
	lime: '#ccff00',
	orange: '#ff9500'
};
const BG_DIR = '/www/luci-static/brutal/background/';
const BG_EXT = /\.(jpe?g|png|gif|webp|mp4|webm)$/i;

var callAvail = rpc.declare({
	object: 'luci.brutal',
	method: 'avail',
	expect: { '': { avail: 0 } },
	raise: true
});

var callRemove = rpc.declare({
	object: 'luci.brutal',
	method: 'remove',
	params: [ 'filename' ],
	expect: { '': {} },
	raise: true
});

var callRename = rpc.declare({
	object: 'luci.brutal',
	method: 'rename',
	params: [ 'newname' ],
	expect: { '': {} },
	raise: true
});

var callBrandingGet = rpc.declare({
	object: 'luci.brutal_branding',
	method: 'get',
	expect: { '': {} },
	raise: true
});

var callBrandingSet = rpc.declare({
	object: 'luci.brutal_branding',
	method: 'set',
	params: [ 'target', 'token' ],
	expect: { '': {} },
	raise: true
});

var callBrandingReset = rpc.declare({
	object: 'luci.brutal_branding',
	method: 'reset',
	params: [ 'target' ],
	expect: { '': {} },
	raise: true
});

function expandHex(value) {
	if (/^#[0-9a-f]{3}$/i.test(value))
		return value.replace(/[0-9a-f]/gi, (digit) => digit + digit).toLowerCase();

	return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

const ColorValue = form.Value.extend({
	validate(section_id, value) {
		return expandHex(value) !== null || _('Expecting a valid HEX colour');
	},

	renderWidget(section_id, option_index, cfgvalue) {
		const node = this.super('renderWidget', [ section_id, option_index, cfgvalue ]);
		const input = node.querySelector('input');
		const picker = E('input', {
			'type': 'color',
			'class': 'brutal-color-picker',
			'value': expandHex(input.value) || this.default,
			'disabled': input.disabled || null,
			'aria-label': this.title
		});

		node.classList.add('brutal-color-field');
		input.setAttribute('spellcheck', 'false');
		input.setAttribute('autocomplete', 'off');
		node.appendChild(picker);

		const syncText = () => {
			if (input.disabled || input.readOnly)
				return;
			input.value = picker.value;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};

		picker.addEventListener('input', syncText);
		picker.addEventListener('change', syncText);

		return node;
	}
});

function randomToken() {
	const bytes = new Uint8Array(16);

	if (window.crypto && window.crypto.getRandomValues)
		window.crypto.getRandomValues(bytes);
	else
		for (let i = 0; i < bytes.length; i++)
			bytes[i] = Math.floor(Math.random() * 256);

	return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

return view.extend({
	load() {
		return Promise.all([
			uci.load('brutal'),
			callAvail().catch(() => ({ avail: 0 })),
			fs.list(BG_DIR).then((files) => files.filter((file) =>
				file.type === 'file' && BG_EXT.test(file.name)
			)).catch(() => []),
			callBrandingGet().catch(() => ({}))
		]);
	},

	render(data) {
		const m = new form.Map('brutal', _('Brutal Theme'),
			_('The theme keeps the neo-brutalist frame: ink borders, hard shadows and square corners. These options change the layout and the colour mode.'));

		const upd = m.section(form.TypedSection);
		upd.render = () => {
			const status = E('span', { 'class': 'brutal-update-status' }, _('Not checked yet'));
			const check = E('button', {
				'class': 'cbi-button cbi-button-action',
				'click': () => {
					status.textContent = _('Checking…');
					fetch('https://api.github.com/repos/MinimaxFlora/luci-theme-brutal/releases/latest', {
						headers: { 'Accept': 'application/vnd.github+json' }
					}).then((res) => res.json()).then((release) => {
						const latest = (release.tag_name || '').replace(/^v/, '');
						if (!latest) {
							status.textContent = _('Check failed');
							return;
						}
						status.textContent = (compareVersions(latest, VERSION) <= 0)
							? _('Up to date (%s)').format(VERSION)
							: _('New version available: %s').format(latest);
					}).catch(() => { status.textContent = _('Check failed'); });
				}
			}, [ _('Check for updates') ]);

			return E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Theme update')),
				E('p', { 'class': 'cbi-section-descr' },
					_('The theme keeps the neo-brutalist frame: ink borders, hard shadows and square corners.')),
				E('div', { 'class': 'brutal-update-row' }, [
					E('strong', {}, [ _('Current version') + ': ' + VERSION ]),
					status
				]),
				E('div', { 'class': 'brutal-update-actions' }, [
					check,
					E('a', {
						'class': 'cbi-button',
						'href': RELEASES,
						'target': '_blank',
						'rel': 'noreferrer'
					}, [ _('View release page') ])
				])
			]);
		};

		const s = m.section(form.TypedSection, 'global', _('Theme settings'));
		s.anonymous = true;
		s.addremove = false;

		let o = s.option(form.ListValue, 'login_style', _('Login page style'),
			_('Classic puts a full-height panel on the left edge; centered floats the card in the middle.'));
		o.value('classic', _('Classic sidebar'));
		o.value('centered', _('Centered card'));
		o.default = 'classic';
		o.rmempty = false;
		o.renderWidget = function(section_id, option_index, cfgvalue) {
			const style = (cfgvalue === 'centered') ? 'centered' : 'classic';
			const node = form.ListValue.prototype.renderWidget.call(this, section_id, option_index, style);

			return E('div', {}, [
				node,
				E('img', {
					'id': this.cbid(section_id) + '-preview',
					'src': L.resource('brutal-config/login-' + style + '.svg'),
					'alt': (style === 'centered') ? _('Centered card') : _('Classic sidebar'),
					'width': 320,
					'height': 180,
					'class': 'brutal-login-preview'
				})
			]);
		};
		o.onchange = function(ev, section_id, value) {
			const preview = document.getElementById(this.cbid(section_id) + '-preview');
			const style = (value === 'centered') ? 'centered' : 'classic';

			if (!preview)
				return;

			preview.src = L.resource('brutal-config/login-' + style + '.svg');
			preview.alt = (style === 'centered') ? _('Centered card') : _('Classic sidebar');
		};

		o = s.option(form.ListValue, 'mode', _('Theme mode'),
			_('Follow the operating system, or pin light/dark for this router.'));
		o.value('normal', _('Follow system'));
		o.value('light', _('Light mode'));
		o.value('dark', _('Dark mode'));
		o.default = 'normal';
		o.rmempty = false;
		o.renderWidget = function(section_id, option_index, cfgvalue) {
			const option = this;
			const node = form.ListValue.prototype.renderWidget.call(this, section_id, option_index, cfgvalue);
			const sync = (event) => {
				if (!event.detail || ![ 'normal', 'light', 'dark' ].includes(event.detail.mode))
					return;
				option.cfgvalue(section_id, event.detail.mode);
				const select = node.matches('select') ? node : node.querySelector('select');

				if (select)
					select.value = event.detail.mode;
			};
			window.addEventListener('brutal-appearance-saved', sync);
			return node;
		};

		o = s.option(ColorValue, 'accent', _('Accent colour'),
			_('A HEX colour. The default #00d9ff is the electric cyan from the design brief; hot pink #ff006e, acid lime #ccff00 and tangerine #ff9500 also work.'));
		o.default = '#00d9ff';
		o.rmempty = false;
		o.cfgvalue = function(section_id) {
			const value = uci.get('brutal', section_id, 'accent');
			return expandHex(value) || ACCENT_NAMES[value] || expandHex(this.default);
		};

		o = s.option(form.ListValue, 'online_wallpaper', _('Wallpaper source'),
			_('Built-in rotates the files in the background directory. Bing, Unsplash and Wallhaven fetch an online image at login.'));
		o.value('none', _('Built-in'));
		o.value('bing', _('Bing'));
		o.value('unsplash', _('Unsplash'));
		o.value('wallhaven', _('Wallhaven'));
		o.default = 'none';
		o.rmempty = false;

		o = s.option(form.Value, 'use_api_key', _('Unsplash API access key'),
			_('Required when using Unsplash wallpapers.'));
		o.password = true;
		o.depends('online_wallpaper', 'unsplash');
		o.rmempty = true;

		o = s.option(form.Flag, 'glass', _('Frosted glass panel'),
			_('Blur the wallpaper behind the login card or panel. The hard border and shadow stay.'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.Value, 'blur', _('Blur radius (px)'),
			_('0 is sharp, 10 is the default frosted preset, 100 is very soft.'));
		o.datatype = 'and(ufloat,range(0,100))';
		o.default = '10';
		o.depends('glass', '1');
		o.rmempty = false;

		o = s.option(form.ListValue, 'transparency', _('Panel opacity'),
			_('0 is only blur, 1 hides the wallpaper completely behind the panel.'));
		TRANSPARENCY.forEach((value) => o.value(value));
		o.default = '0.5';
		o.depends('glass', '1');
		o.rmempty = false;

		o = s.option(form.ListValue, 'dark_glass_mode', _('Dark mode panel'),
			_('Reuse the light values, or give the dark panel its own blur and opacity.'));
		o.value('inherit', _('Follow light mode'));
		o.value('custom', _('Custom'));
		o.default = 'inherit';
		o.rmempty = false;

		o = s.option(form.Value, 'blur_dark', _('[Dark mode] Blur radius (px)'));
		o.datatype = 'and(ufloat,range(0,100))';
		o.default = '10';
		o.depends('dark_glass_mode', 'custom');
		o.retain = true;

		o = s.option(form.ListValue, 'transparency_dark', _('[Dark mode] Panel opacity'));
		TRANSPARENCY.forEach((value) => o.value(value));
		o.default = '0.5';
		o.depends('dark_glass_mode', 'custom');
		o.retain = true;

		o = s.option(form.Button, '_save', _('Save settings'));
		o.inputstyle = 'apply';
		o.inputtitle = _('Save current settings');
		o.onclick = function() {
			if (this.map.readonly)
				return Promise.resolve();

			return this.map.save(null, true).then(function() {
				return ui.changes.apply(true);
			}).catch(function(e) {
				ui.addNotification(null, E('p', e.message));
			});
		};

		const uploadBrand = (target, ev) => {
			if (m.readonly)
				return Promise.resolve();

			const token = randomToken();
			const tmp = '/tmp/brutal_branding_' + token + '.png';

			return ui.uploadFile(tmp, ev.target).then(() => {
				return callBrandingSet(target, token);
			}).then((ret) => {
				if (ret.result === 0)
					return location.reload();
				throw new Error(_('Failed to save the image.'));
			}).catch((e) => {
				ui.addNotification(null, E('p', e.message));
			});
		};

		const resetBrand = (target) => {
			if (m.readonly)
				return Promise.resolve();

			return callBrandingReset(target).then((ret) => {
				if (ret.result === 0)
					return location.reload();
				throw new Error(_('Failed to reset the image.'));
			}).catch((e) => ui.addNotification(null, E('p', e.message)));
		};

		const brand = m.section(form.TypedSection);
		brand.render = () => {
			const state = data[3] || {};
			const preview = (kind, label) => {
				const custom = !!state[kind];
				const fallback = (kind === 'favicon')
					? '/luci-static/brutal/logo_48.png'
					: '/luci-static/brutal/logo.svg';
				const src = custom
					? ('/luci-static/brutal/branding/' + kind + '.png?v=' + (state[kind + '_mtime'] || ''))
					: fallback;

				return E('figure', { 'class': 'brutal-branding-item' }, [
					E('img', { 'src': src, 'alt': label }),
					E('figcaption', {}, [ label + (custom ? '' : ' · ' + _('Default')) ])
				]);
			};
			const button = (style, label, handler, disabled) => E('button', {
				'class': 'cbi-button cbi-button-' + style,
				'disabled': (m.readonly || disabled) ? '' : null,
				'click': handler
			}, [ label ]);

			return E('div', { 'class': 'cbi-section' }, [
				E('h3', _('Branding')),
				E('p', { 'class': 'cbi-section-descr' },
					_('PNG only, 16–1024 px, at most 1 MiB. The favicon must be square; the login logo keeps its aspect ratio.')),
				E('div', { 'class': 'brutal-branding-preview' }, [
					preview('favicon', _('Favicon')),
					preview('logo', _('Login logo'))
				]),
				E('div', { 'class': 'brutal-branding-actions' }, [
					button('action', _('Upload favicon…'), (ev) => uploadBrand('favicon', ev)),
					button('action', _('Upload logo…'), (ev) => uploadBrand('logo', ev)),
					button('action', _('Use for both…'), (ev) => uploadBrand('both', ev)),
					button('remove', _('Reset favicon'), () => resetBrand('favicon'), !state.favicon),
					button('remove', _('Reset logo'), () => resetBrand('logo'), !state.logo)
				])
			]);
		};

		const uploadBackground = (ev) => {
			if (m.readonly)
				return Promise.resolve();

			const tmp = '/tmp/brutal_background.tmp';

			return ui.uploadFile(tmp, ev.target).then((res) => {
				return callRename(res.name);
			}).then((ret) => {
				if (ret.result === 0)
					return location.reload();
				throw new Error(_('Failed to upload the background.'));
			}).catch((e) => ui.addNotification(null, E('p', e.message)));
		};

		const bg = m.section(form.TypedSection);
		bg.render = () => {
			const tbl = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, [ _('Filename') ]),
					E('th', { 'class': 'th' }, [ _('Modified date') ]),
					E('th', { 'class': 'th' }, [ _('Size') ]),
					E('th', { 'class': 'th' }, [ _('Action') ])
				])
			]);

			cbi_update_table(tbl, (data[2] || []).map((file) => [
				file.name,
				new Date(file.mtime * 1000).toLocaleString(),
				String.format('%1024.2mB', file.size),
				E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'disabled': m.readonly ? '' : null,
					'click': () => {
						if (m.readonly)
							return Promise.resolve();
						return callRemove(file.name).then((ret) => {
							if (ret.result === 0)
								return location.reload();
							throw new Error(_('Failed to delete file: %s.').format(file.name));
						}).catch((e) => ui.addNotification(null, E('p', e.message)));
					}
				}, [ _('Delete') ])
			]), E('em', _('No files found.')));

			return E('div', { 'class': 'cbi-section', 'id': 'cbi-filelist' }, [
				E('h3', _('Background directory (available space: %1024.2mB)').format(data[1].avail)),
				E('p', { 'class': 'cbi-section-descr' },
					_('Upload jpg/png/gif/webp/mp4/webm files to %s. The login page picks one at random when the wallpaper setting is "random".').format(BG_DIR)),
				E('div', { 'class': 'brutal-bg-actions' }, [
					E('button', {
						'class': 'cbi-button cbi-button-action',
						'disabled': m.readonly ? '' : null,
						'click': uploadBackground
					}, [ _('Upload background…') ])
				]),
				tbl
			]);
		};

		return m.render();
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
