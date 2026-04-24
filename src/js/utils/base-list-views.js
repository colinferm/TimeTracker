TimeTracker.Views.BaseListView = Backbone.View.extend({
	tagName: 'div',
	className: 'list-container',

	initialize: function(options) {
		this.opts = options || {};
		this.collection = options.collection || new Backbone.Collection();
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.collection, 'reset sync', this.render);
	},

	render: function() {
		this.$el.html(this.template({ items: this.collection.toJSON() }));
		return this;
	},

	fetch: function() {
		this.collection.fetch({ reset: true });
		return this;
	}
});

TimeTracker.Views.BaseRowView = Backbone.View.extend({
	tagName: 'tr',

	initialize: function(options) {
		this.opts = options || {};
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.listenTo(this.model, 'change', this.render);
	},

	render: function() {
		this.$el.html(this.template({ model: this.model.toJSON() }));
		return this;
	}
});
