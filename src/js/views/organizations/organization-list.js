TimeTracker.Views.Organizations = TimeTracker.Views.Organizations || {};

TimeTracker.Views.Organizations.List = Backbone.View.extend({
	tagName: 'div',
	className: 'organization-list-view',
	templateName: 'organization-list',

	events: {
		'click .org-name-link': 'editOrg',
		'click .btn-add-organization': 'addOrg'
	},

	initialize: function() {
		this.collection = new TimeTracker.Collections.Organizations();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
		this.collection.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ organizations: this.collection.toJSON() }));
		return this;
	},

	editOrg: function(e) {
		e.preventDefault();
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (model) this.openModal(model);
	},

	addOrg: function() {
		this.openModal(new TimeTracker.Models.Organization());
	},

	openModal: function(model) {
		var self = this;
		new TimeTracker.Views.Modal({
			title: model.isNew() ? 'Add Organization' : 'Edit Organization',
			class: 'TimeTracker.Views.Organizations.Form',
			model: model,
			buttonText: model.isNew() ? 'Create Organization' : 'Save Changes',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	}
});
