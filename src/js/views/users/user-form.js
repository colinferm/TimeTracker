TimeTracker.Views.Users = TimeTracker.Views.Users || {};

TimeTracker.Views.Users.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'user-form-view',
	templateName: 'user-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template({ user: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			username: this.$('[name=username]').val().trim(),
			email_address: this.$('[name=email_address]').val().trim(),
			first_name: this.$('[name=first_name]').val().trim(),
			last_name: this.$('[name=last_name]').val().trim(),
			country: this.$('[name=country]').val().trim(),
			confirmed: this.$('[name=confirmed]').is(':checked') ? 1 : 0,
			is_admin: this.$('[name=is_admin]').is(':checked') ? 1 : 0
		};

		var password = this.$('[name=password]').val();
		if (password) data.password = password;

		this.$('.form-error').hide();

		this.model.save(data, {
			success: function() { callback(true, self.model); },
			error: function() {
				self.$('.form-error').show();
				callback(false);
			}
		});
	}
});
