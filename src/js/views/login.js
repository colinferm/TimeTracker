TimeTracker.Views.Login = Backbone.View.extend({
	tagName: 'div',
	className: 'login-wrapper',
	templateName: 'login',

	events: {
		'submit #login-form': 'doLogin'
	},

	initialize: function() {
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template());
		return this;
	},

	doLogin: function(e) {
		e.preventDefault();
		var self = this;
		var username = this.$('#username').val().trim();
		var password = this.$('#password').val();

		this.$('.login-error').hide();
		this.$('.btn-login').prop('disabled', true).text('Signing in…');

		$.ajax({
			url: '/api/auth/login',
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({ username: username, password: password }),
			success: function(data) {
				app.login(data.token, data.user);
			},
			error: function() {
				self.$('.login-error').show();
				self.$('.btn-login').prop('disabled', false).text('Sign In');
			}
		});
	}
});
