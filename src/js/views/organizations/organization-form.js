TimeTracker.Views.Organizations = TimeTracker.Views.Organizations || {};

TimeTracker.Views.Organizations.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'organization-form-view',
	templateName: 'organization-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template({ organization: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			name: this.$('[name=name]').val().trim(),
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
