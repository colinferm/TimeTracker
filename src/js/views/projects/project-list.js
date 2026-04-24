TimeTracker.Views.Projects = TimeTracker.Views.Projects || {};

TimeTracker.Views.Projects.List = Backbone.View.extend({
	tagName: 'div',
	className: 'project-list-view',
	templateName: 'project-list',

	events: {
		'click .project-name-link': 'editProject',
		'click .btn-add-project': 'addProject'
	},

	initialize: function() {
		this.collection = new TimeTracker.Collections.Projects();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
		this.collection.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ projects: this.collection.toJSON() }));
		return this;
	},

	editProject: function(e) {
		e.preventDefault();
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (model) this.openModal(model);
	},

	addProject: function() {
		this.openModal(new TimeTracker.Models.ClientProject());
	},

	openModal: function(model) {
		var self = this;
		new TimeTracker.Views.Modal({
			title: model.isNew() ? 'Add Project' : 'Edit Project',
			class: 'TimeTracker.Views.Projects.Form',
			model: model,
			buttonText: model.isNew() ? 'Create Project' : 'Save Changes',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	}
});
