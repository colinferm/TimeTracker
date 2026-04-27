TimeTracker.Routers.Main = Backbone.Router.extend({
	routes: {
		'': 'calendar',
		'calendar': 'calendar',
		'day/:date': 'day',
		'clients': 'clients',
		'projects': 'projects',
		'reports': 'reports',
		'invoices': 'invoices',
		'organizations': 'organizations',
		'users': 'users'
	},

	requireAdmin: function() {
		if (!app.session || parseInt(app.session.user.is_admin) !== 1) {
			this.navigate('calendar', { trigger: true });
			return;
		}
	},

	requireSuperUser: function() {
		if (!app.session || parseInt(app.session.user.is_superuser) !== 1) {
			this.navigate('calendar', { trigger: true });
			return;
		}
	},

	calendar: function() {
		app.showView(new TimeTracker.Views.Calendar());
	},

	day: function(date) {
		app.showView(new TimeTracker.Views.Day({ date: date }));
	},

	clients: function() {
		this.requireAdmin();
		app.showView(new TimeTracker.Views.Clients.List());
	},

	projects: function() {
		this.requireAdmin();
		app.showView(new TimeTracker.Views.Projects.List());
	},

	reports: function() {
		app.showView(new TimeTracker.Views.Reports());
	},

	invoices: function() {
		this.requireAdmin();
		app.showView(new TimeTracker.Views.Invoices.List());
	},

	organizations: function() {
		this.requireSuperUser();
		app.showView(new TimeTracker.Views.Organizations.List());
	},

	users: function() {
		this.requireAdmin();
		app.showView(new TimeTracker.Views.Users.List());
	}
});

// ─── Application object ───────────────────────────────────────────────────────

var app = {
	session: null,
	router: null,
	currentView: null,

	init: function() {
		TimeTracker.Utils.UI.TPL.loadAllTemplates(_.bind(function() {
			var token = localStorage.getItem('tt_token');
			var userData = localStorage.getItem('tt_user');

			var user = null;
			try { user = userData ? JSON.parse(userData) : null; } catch (e) {}
			if (token && user) {
				this.session = { token: token, user: user };
				this.showMainLayout();
			} else {
				localStorage.removeItem('tt_token');
				localStorage.removeItem('tt_user');
				this.showLogin();
			}
		}, this));
	},

	showLogin: function() {
		var loginView = new TimeTracker.Views.Login();
		$('#app').html(loginView.render().$el);
	},

	showMainLayout: function() {
		var html = TimeTracker.Utils.UI.TPL.get('main-layout');
		var template = Handlebars.compile(html);
		$('#app').html(template({ user: this.session.user }));

		this.router = new TimeTracker.Routers.Main();
		Backbone.history.start();
	},

	showView: function(view) {
		if (this.currentView) {
			this.currentView.remove();
		}
		this.currentView = view;
		$('#main-content').html(view.render().$el);
	},

	login: function(token, user) {
		localStorage.setItem('tt_token', token);
		localStorage.setItem('tt_user', JSON.stringify(user));
		this.session = { token: token, user: user };
		this.showMainLayout();
	},

	logout: function() {
		localStorage.removeItem('tt_token');
		localStorage.removeItem('tt_user');
		this.session = null;
		if (this.router) {
			Backbone.history.stop();
			this.router = null;
		}
		this.showLogin();
	}
};
