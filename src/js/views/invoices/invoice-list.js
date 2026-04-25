TimeTracker.Views.Invoices = TimeTracker.Views.Invoices || {};

TimeTracker.Views.Invoices.List = Backbone.View.extend({
	tagName: 'div',
	className: 'invoice-list-view',
	templateName: 'invoice-list',

	events: {
		'click .btn-create-invoice': 'createInvoice',
		'click .invoice-date-link': 'editInvoice',
		'click .action_edit': 'editInvoice',
		'click .action_remove': 'deleteInvoice'
	},

	initialize: function() {
		this.collection = new TimeTracker.Collections.Invoices();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
		this.collection.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ invoices: this.collection.toJSON() }));
		return this;
	},

	createInvoice: function() {
		var self = this;
		new TimeTracker.Views.Modal({
			title: 'Create Invoice',
			class: 'TimeTracker.Views.Invoices.Form',
			model: new TimeTracker.Models.Invoice(),
			buttonText: 'Generate Report',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	},

	editInvoice: function(e) {
		e.preventDefault();
		var self = this;
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (!model) return;
		new TimeTracker.Views.Modal({
			title: 'Edit Invoice',
			class: 'TimeTracker.Views.Invoices.EditForm',
			model: model,
			buttonText: 'Save Changes',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	},

	deleteInvoice: function(e) {
		e.preventDefault();
		var self = this;
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (!model) return;
		model.destroy();
	}
});
