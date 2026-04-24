TimeTracker.Views.Clients = TimeTracker.Views.Clients || {};

TimeTracker.Views.Clients.List = Backbone.View.extend({
	tagName: 'div',
	className: 'client-list-view',
	templateName: 'client-list',

	events: {
		'click .client-name-link': 'editClient',
		'click .btn-add-client': 'addClient'
	},

	initialize: function() {
		this.collection = new TimeTracker.Collections.Clients();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
		this.collection.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ clients: this.collection.toJSON() }));
		return this;
	},

	editClient: function(e) {
		e.preventDefault();
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (model) this.openModal(model);
	},

	addClient: function() {
		this.openModal(new TimeTracker.Models.Client());
	},

	openModal: function(model) {
		var self = this;
		new TimeTracker.Views.Modal({
			title: model.isNew() ? 'Add Client' : 'Edit Client',
			class: 'TimeTracker.Views.Clients.Form',
			model: model,
			buttonText: model.isNew() ? 'Create Client' : 'Save Changes',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	}
});
