'use strict';
'require view';
'require form';
'require uci';

const TRANSPARENCY = [ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1 ];

return view.extend({
	load() {
		return uci.load('brutal');
	},

	render() {
		const m = new form.Map('brutal', _('Brutal Theme'),
			_('The theme keeps the neo-brutalist frame: ink borders, hard shadows and square corners. These options change the layout, the colour mode and the login panel material.'));

		const s = m.section(form.TypedSection, 'global', _('Theme settings'));
		s.anonymous = true;
		s.addremove = false;

		let o = s.option(form.ListValue, 'login_style', _('Login page style'),
			_('Classic puts a full-height panel on the left edge; centered floats the card in the middle.'));
		o.value('classic', _('Classic sidebar'));
		o.value('centered', _('Centered card'));
		o.default = 'classic';
		o.rmempty = false;

		o = s.option(form.ListValue, 'mode', _('Theme mode'),
			_('Follow the operating system, or pin light/dark for this router.'));
		o.value('normal', _('Follow system'));
		o.value('light', _('Light mode'));
		o.value('dark', _('Dark mode'));
		o.default = 'normal';
		o.rmempty = false;

		o = s.option(form.ListValue, 'accent', _('Accent colour'),
			_('Used for the current submenu entry. All four accents come from the design brief.'));
		o.value('cyan', _('Electric cyan'));
		o.value('pink', _('Hot pink'));
		o.value('lime', _('Acid lime'));
		o.value('orange', _('Tangerine'));
		o.default = 'cyan';
		o.rmempty = false;

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

		const login = m.section(form.TypedSection, 'global', _('Login page'));
		login.anonymous = true;
		login.addremove = false;

		o = login.option(form.Flag, 'background', _('Wallpaper'),
			_('Show the wallpaper behind the login form.'));
		o.default = '1';
		o.rmempty = false;

		o = login.option(form.Value, 'wallpaper', _('Wallpaper path or URL'),
			_('A path under /www, for example /luci-static/brutal/img/bg1.webp, or an https:// URL.'));
		o.default = '/luci-static/brutal/img/bg1.webp';
		o.depends('background', '1');
		o.placeholder = '/luci-static/brutal/img/bg1.webp';

		o = login.option(form.Value, 'title', _('Login title'),
			_('Large wordmark on the login card.'));
		o.default = 'LuCI';
		o.placeholder = 'LuCI';
		o.rmempty = false;

		return m.render();
	}
});
