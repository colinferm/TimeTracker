TimeTracker.Models.Invoice = Backbone.Model.extend({
	urlRoot: '/api/exports/invoices',
	defaults: {
		client_id: null,
		project_id: null,
		invoice_number: '',
		invoice_total: 0.00,
		billed_date: null,
		paid_date: null,
		is_billed: 0
	}
});

TimeTracker.Collections.Invoices = Backbone.Collection.extend({
	model: TimeTracker.Models.Invoice,
	url: '/api/exports/invoices'
});
