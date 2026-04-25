TimeTracker.Models.Organization = Backbone.Model.extend({
	urlRoot: '/api/organizations',

	defaults: {
		name: '',
		address_1: '',
		address_2: '',
		city: '',
		state_province: '',
		postal_code: '',
		country: ''
	}
});

TimeTracker.Collections.Organizations = Backbone.Collection.extend({
	model: TimeTracker.Models.Organization,
	url: '/api/organizations'
});
