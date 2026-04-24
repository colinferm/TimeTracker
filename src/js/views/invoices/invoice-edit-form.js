TimeTracker.Views.Invoices = TimeTracker.Views.Invoices || {};

TimeTracker.Views.Invoices.EditForm = Backbone.View.extend({
	tagName: 'div',
	className: 'invoice-edit-form-view',
	templateName: 'invoice-edit-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template({ invoice: this.model.toJSON() }));
		return this;
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			is_billed: this.$('[name=is_billed]').is(':checked') ? 1 : 0,
			paid_date: this.$('[name=paid_date]').val() || null
		};
		this.$('.form-error').hide();
		this.model.save(data, {
			success: function() { callback(true, self.model); },
			error: function() { self.$('.form-error').show(); callback(false); }
		});
	}
});
