TimeTracker.Views.BaseFormView = Backbone.View.extend({
	tagName: 'div',
	className: 'form-container',

	initialize: function(options) {
		this.opts = options || {};
		this.model = options.model;
		this.template = Handlebars.compile(TimeTracker.Utils.UI.TPL.get(this.templateName));
		this.listenTo(this.model, 'invalid', this.showErrors);
	},

	render: function() {
		this.$el.html(this.template({ model: this.model.toJSON() }));
		return this;
	},

	getFormData: function() {
		var data = {};
		this.$el.find('[name]').each(function() {
			var $el = $(this);
			if ($el.attr('type') === 'checkbox') {
				data[$el.attr('name')] = $el.is(':checked') ? 1 : 0;
			} else {
				data[$el.attr('name')] = $el.val();
			}
		});
		return data;
	},

	doSave: function(callback) {
		var data = this.getFormData();
		this.model.save(data, {
			success: function(model) {
				if (callback) callback(true, model);
			},
			error: function(model, response) {
				if (callback) callback(false, model);
			}
		});
	},

	showErrors: function(model, errors) {
		this.$el.find('.form-error').remove();
		this.$el.prepend('<div class="alert alert-danger form-error">' + errors + '</div>');
	}
});
