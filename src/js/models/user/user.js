TimeTracker.Models.User = Backbone.Model.extend({
	urlRoot: '/api/users',

	defaults: {
		username: '',
		email_address: '',
		first_name: '',
		last_name: '',
		country: '',
		confirmed: 0,
		is_admin: 0,
		is_superuser: 0
	}
});

TimeTracker.Collections.Users = Backbone.Collection.extend({
	model: TimeTracker.Models.User,
	url: '/api/users'
});
