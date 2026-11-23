'use strict';
'require view';
'require form';
'require uci';

return view.extend({
	load() {
		return uci.load('brutal');
	},

	render() {
		const m = new form.Map('brutal', _('Brutal Theme'),
			_('Login page appearance. The theme ships with working defaults; these options only override them.'));

		const s = m.section(form.NamedSection, 'login', 'login', _('Login page'));

		let o = s.option(form.Flag, 'background', _('Wallpaper'),
			_('Show the wallpaper behind the login form.'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.Value, 'wallpaper', _('Wallpaper path or URL'),
			_('A path under /www, for example /luci-static/brutal/img/bg1.webp, or an https:// URL.'));
		o.default = '/luci-static/brutal/img/bg1.webp';
		o.depends('background', '1');
		o.placeholder = '/luci-static/brutal/img/bg1.webp';

		o = s.option(form.Value, 'title', _('Login title'),
			_('Large wordmark on the login card.'));
		o.default = 'LuCI';
		o.placeholder = 'LuCI';
		o.rmempty = false;

		return m.render();
	}
});
