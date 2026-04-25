TimeTracker.Models.Organization = Backbone.Model.extend({
	urlRoot: '/api/organizations',

	defaults: {
		primary_user_id: null,
		name: '',
		address_1: '',
		address_2: '',
		city: '',
		state_province: '',
		postal_code: '',
		country: '',
		phone_number: ''
	}
});

TimeTracker.Collections.Organizations = Backbone.Collection.extend({
	model: TimeTracker.Models.Organization,
	url: '/api/organizations'
});
