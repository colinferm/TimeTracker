TimeTracker.Views.Clients = TimeTracker.Views.Clients || {};

TimeTracker.Views.Clients.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'client-form-view',
	templateName: 'client-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);

		this.organizations = new TimeTracker.Collections.Organizations();
		this.listenTo(this.organizations, 'reset sync', this.renderOrgSelect);
		this.organizations.fetch({ reset: true });
	},

	render: function() {
		console.log(this.model.attributes.start_date);
		if (this.model.attributes.start_date == null) this.model.attributes.start_date = new Date().toISOString().split('T')[0];
		this.$el.html(this.template({ client: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	renderOrgSelect: function() {
		var currentOrgId = this.model.get('organization_id');
		var $select = this.$('[name=organization_id]');
		$select.empty();
		$select.append('<option value="">-- No Organization --</option>');
		this.organizations.each(function(o) {
			var selected = (o.get('id') == currentOrgId) ? ' selected' : '';
			$select.append('<option value="' + o.get('id') + '"' + selected + '>' + o.get('name') + '</option>');
		});
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			name: this.$('[name=name]').val().trim(),
			primary_contact: this.$('[name=primary_contact]').val().trim(),
			address_1: this.$('[name=address_1]').val().trim(),
			address_2: this.$('[name=address_2]').val().trim(),
			city: this.$('[name=city]').val().trim(),
			state_province: this.$('[name=state_province]').val().trim(),
			postal_code: this.$('[name=postal_code]').val().trim(),
			country: this.$('[name=country]').val().trim(),
			bill_rate: parseFloat(this.$('[name=bill_rate]').val()) || 0,
			start_date: this.$('[name=start_date]').val(),
			end_date: this.$('[name=end_date]').val() || null,
			invoice_services: this.$('[name=invoice_services]').val().trim(),
			invoice_line_item: this.$('[name=invoice_line_item]').val().trim(),
			organization_id: parseInt(this.$('[name=organization_id]').val()) || null
		};

		this.$('.form-error').hide();

		this.model.save(data, {
			success: function() { callback(true, self.model); },
			error: function() {
				self.$('.form-error').show();
				callback(false);
			}
		});
	}
});
