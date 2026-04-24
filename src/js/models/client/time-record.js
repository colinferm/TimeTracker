TimeTracker.Models.Client.TimeRecord = Backbone.Model.extend({
	urlRoot: '/api/hours',

	defaults: {
		client_id: null,
		project_id: null,
		work_desc: '',
		work_date: null,
		num_hours: 1.0
	}
});

TimeTracker.Collections.Client.TimeRecords = Backbone.Collection.extend({
	model: TimeTracker.Models.Client.TimeRecord,
	url: '/api/hours'
});
