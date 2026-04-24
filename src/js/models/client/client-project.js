TimeTracker.Models.ClientProject = Backbone.Model.extend({
	urlRoot: '/api/projects',

	defaults: {
		client_id: null,
		name: '',
		bill_rate: 0.00,
		start_date: null,
		end_date: null
	}
});

TimeTracker.Collections.Projects = Backbone.Collection.extend({
	model: TimeTracker.Models.ClientProject,
	url: '/api/projects'
});

TimeTracker.Collections.ClientProjects = Backbone.Collection.extend({
	model: TimeTracker.Models.ClientProject,

	initialize: function (models, options) {
		this.clientId = options && options.clientId;
	},

	url: function () {
		return '/api/clients/' + this.clientId + '/projects';
	}
});
