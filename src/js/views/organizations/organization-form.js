TimeTracker.Views.Organizations = TimeTracker.Views.Organizations || {};

TimeTracker.Views.Organizations.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'organization-form-view',
	templateName: 'organization-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);

		this.users = new TimeTracker.Collections.Users();
		this.listenTo(this.users, 'reset sync', this.renderUserSelect);
		this.users.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ organization: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	renderUserSelect: function() {
		var currentUserId = this.model.get('primary_user_id');
		var $select = this.$('[name=primary_user_id]');
		$select.empty();
		$select.append('<option value="">-- No Primary User --</option>');
		this.users.each(function(u) {
			var name = (u.get('first_name') + ' ' + u.get('last_name')).trim() || u.get('username');
			var selected = (u.get('id') == currentUserId) ? ' selected' : '';
			$select.append('<option value="' + u.get('id') + '"' + selected + '>' + name + '</option>');
		});
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			primary_user_id: parseInt(this.$('[name=primary_user_id]').val()) || null,
			name: this.$('[name=name]').val().trim(),
			phone_number: this.$('[name=phone_number]').val().trim(),
			address_1: this.$('[name=address_1]').val().trim(),
			address_2: this.$('[name=address_2]').val().trim(),
			city: this.$('[name=city]').val().trim(),
			state_province: this.$('[name=state_province]').val().trim(),
			postal_code: this.$('[name=postal_code]').val().trim(),
			country: this.$('[name=country]').val().trim()
		};

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
