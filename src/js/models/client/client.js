TimeTracker.Models.Client = Backbone.Model.extend({
	urlRoot: '/api/clients',

	defaults: function () {
		return {
			name: '',
			primary_contact: '',
			address_1: '',
			address_2: '',
			city: '',
			state_province: '',
			postal_code: '',
			country: '',
			bill_rate: 135.00,
			start_date: null,
			end_date: null
		};
	}
});

TimeTracker.Collections.Clients = Backbone.Collection.extend({
	model: TimeTracker.Models.Client,
	url: '/api/clients'
});
