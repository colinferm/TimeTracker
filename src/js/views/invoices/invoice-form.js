TimeTracker.Views.Invoices = TimeTracker.Views.Invoices || {};

TimeTracker.Views.Invoices.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'invoice-form-view',
	templateName: 'invoice-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);

		this.clients = new TimeTracker.Collections.Clients();
		this.listenTo(this.clients, 'reset sync', this.renderClientSelect);
		this.clients.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({}));
		this.$('[name=client_id]').on('change', _.bind(this.onClientChange, this));
		return this;
	},

	renderClientSelect: function() {
		var $select = this.$('[name=client_id]');
		$select.empty();
		$select.append('<option value="">-- Select Client --</option>');
		this.clients.each(function(c) {
			$select.append('<option value="' + c.get('id') + '">' + c.get('name') + '</option>');
		});
	},

	onClientChange: function() {
		var clientId = this.$('[name=client_id]').val();
		var $projectSelect = this.$('[name=project_id]');
		$projectSelect.empty();
		$projectSelect.append('<option value="">-- No Project --</option>');
		if (!clientId) return;
		var projects = new TimeTracker.Collections.ClientProjects([], { clientId: clientId });
		projects.fetch({
			success: function() {
				projects.each(function(p) {
					$projectSelect.append('<option value="' + p.get('id') + '">' + p.get('name') + '</option>');
				});
			}
		});
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			client_id: this.$('[name=client_id]').val(),
			project_id: this.$('[name=project_id]').val() || null,
			start_date: this.$('[name=start_date]').val(),
			end_date: this.$('[name=end_date]').val()
		};
		this.$('.form-error').hide();
		$.ajax({
			url: '/api/exports/invoice',
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(data),
			beforeSend: TimeTracker.Apps.handleAjaxAuth,
			success: function() { callback(true); },
			error: function() { self.$('.form-error').show(); callback(false); }
		});
	}
});
