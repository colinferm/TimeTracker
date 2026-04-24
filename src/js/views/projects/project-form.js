TimeTracker.Views.Projects = TimeTracker.Views.Projects || {};

TimeTracker.Views.Projects.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'project-form-view',
	templateName: 'project-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);

		this.clients = new TimeTracker.Collections.Clients();
		this.listenTo(this.clients, 'reset sync', this.renderClientSelect);
		this.clients.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ project: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	renderClientSelect: function() {
		var currentId = this.model.get('client_id');
		var $select = this.$('[name=client_id]');
		$select.empty();
		$select.append('<option value="">-- Select Client --</option>');
		this.clients.each(function(c) {
			var selected = (c.get('id') == currentId) ? ' selected' : '';
			$select.append('<option value="' + c.get('id') + '"' + selected + '>' + c.get('name') + '</option>');
		});
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			client_id: this.$('[name=client_id]').val(),
			name: this.$('[name=name]').val().trim(),
			bill_rate: parseFloat(this.$('[name=bill_rate]').val()) || 0,
			start_date: this.$('[name=start_date]').val(),
			end_date: this.$('[name=end_date]').val() || null
		};
		this.$('.form-error').hide();
		this.model.save(data, {
			success: function() { callback(true, self.model); },
			error: function() { self.$('.form-error').show(); callback(false); }
		});
	}
});
