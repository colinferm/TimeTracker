TimeTracker.Views.Users = TimeTracker.Views.Users || {};

TimeTracker.Views.Users.List = Backbone.View.extend({
	tagName: 'div',
	className: 'users-view p-4',
	templateName: 'user-list',

	events: {
		'click .btn-add-user': 'addUser',
		'click .user-row-link': 'editUser'
	},

	initialize: function() {
		this.collection = new TimeTracker.Collections.Users();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
		this.collection.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({ users: this.collection.toJSON() }));
		return this;
	},

	addUser: function() {
		this.openModal(new TimeTracker.Models.User());
	},

	editUser: function(e) {
		e.preventDefault();
		var id = $(e.currentTarget).data('id');
		var model = this.collection.get(id);
		if (model) this.openModal(model);
	},

	openModal: function(model) {
		var self = this;
		new TimeTracker.Views.Modal({
			title: model.isNew() ? 'Add User' : 'Edit User',
			class: 'TimeTracker.Views.Users.Form',
			model: model,
			buttonText: model.isNew() ? 'Create User' : 'Save Changes',
			callback: function() {
				self.collection.fetch({ reset: true });
			}
		});
	}
});
