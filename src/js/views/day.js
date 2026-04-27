TimeTracker.Views.Day = Backbone.View.extend({
	tagName: 'div',
	className: 'day-view',
	templateName: 'day',

	events: {
		'click .btn-add-record': 'addRecord',
		'click .time-record-item': 'selectRecord',
		'click .btn-back-to-calendar': 'backToCalendar',
		'click .btn-remove-all': 'confirmRemoveAll'
	},

	initialize: function(options) {
		this.date = options.date;
		this.records = new TimeTracker.Collections.Client.TimeRecords();
		this.records.url = '/api/hours?date=' + this.date;
		this.clients = new TimeTracker.Collections.Clients();
		this.template = Handlebars.compile(TimeTracker.Utils.UI.TPL.get(this.templateName));

		this.listenTo(this.records, 'reset sync', this.renderRecords);
		this.records.fetch({ reset: true });
		this.clients.fetch({ reset: true });
	},

	render: function() {
		let user = app.session.user
		this.$el.html(this.template({
			date: this.date,
			dateLabel: moment(this.date).format('dddd, MMMM D, YYYY'),
			user: user
		}));
		return this;
	},

	renderRecords: function() {
		var $list = this.$('.record-list');
		$list.empty();

		var template = Handlebars.compile(TimeTracker.Utils.UI.TPL.get('time-record-item'));
		this.records.each(function(record) {
			var json = record.toJSON();
			var start = moment(json.work_date);
			var end = start.clone().add(json.num_hours * 60, 'minutes');
			json.start_time = start.format('h:mm a');
			json.end_time = end.format('h:mm a');
			$list.append(template({ record: json }));
		});
	},

	showConfirmModal: function(message, onProceed) {
		this.$('.confirm-delete-message').text(message);
		var modal = new bootstrap.Modal(this.$('#confirm-delete-modal')[0]);
		this.$('.btn-confirm-proceed').off('click').on('click', function() {
			modal.hide();
			onProceed();
		});
		modal.show();
	},

	confirmRemoveAll: function() {
		var self = this;
		this.showConfirmModal(
			'Confirming will delete all hour records for this day.',
			function() {
				$.ajax({
					url: '/api/hours?date=' + self.date,
					method: 'DELETE',
					beforeSend: TimeTracker.Apps.handleAjaxAuth,
					success: function() {
						self.records.fetch({ reset: true });
						self.$('.record-detail').empty();
					}
				});
			}
		);
	},

	selectRecord: function(e) {
		var id = $(e.currentTarget).data('id');
		var record = this.records.get(id);
		if (record) this.showEditForm(record);
	},

	showDetail: function(record) {
		var template = Handlebars.compile(TimeTracker.Utils.UI.TPL.get('time-record-detail'));
		this.$('.record-detail').html(template({ record: record.toJSON() }));

		this.$('.btn-edit-record').off('click').on('click', _.bind(function() {
			this.showEditForm(record);
		}, this));
	},

	showEditForm: function(record, isNew) {
		var self = this;
		let user = app.session.user
		var template = Handlebars.compile(TimeTracker.Utils.UI.TPL.get('time-record-form'));

		var data = record ? record.toJSON() : {
			work_date: roundToNearest15(new Date()).toISOString().slice(0, 16),
			num_hours: 1.0
		};

		this.$('.record-detail').html(template({ record: data, user: user }));

		var $clientSelect = self.$('[name=client_id]');
		var $projectSelect = self.$('[name=project_id]');

		var populateProjects = function(clientId, selectedProjectId) {
			$projectSelect.empty();
			$projectSelect.append('<option value="">-- No project --</option>');
			if (!clientId) return;
			var projects = new TimeTracker.Collections.ClientProjects([], { clientId: clientId });
			projects.fetch({
				success: function() {
					projects.each(function(p) {
						var selected = (p.get('id') == selectedProjectId) ? ' selected' : '';
						$projectSelect.append('<option value="' + p.get('id') + '"' + selected + '>' + p.get('name') + '</option>');
					});
				}
			});
		};

		var renderClientSelect = function() {
			$clientSelect.empty();
			$clientSelect.append('<option value="">-- Select Client --</option>');
			self.clients.each(function(c) {
				var selected = (c.get('id') == data.client_id) ? ' selected' : '';
				$clientSelect.append('<option value="' + c.get('id') + '"' + selected + '>' + c.get('name') + '</option>');
			});
			populateProjects(data.client_id, data.project_id);
		};

		if (self.clients.length > 0) {
			renderClientSelect();
		} else {
			self.listenToOnce(self.clients, 'reset sync', renderClientSelect);
		}

		$clientSelect.on('change', function() {
			populateProjects($(this).val(), null);
		});

		this.$('.btn-save-record').off('click').on('click', function() {
			var formData = {
				client_id: self.$('[name=client_id]').val(),
				project_id: self.$('[name=project_id]').val() || null,
				work_desc: self.$('[name=work_desc]').val(),
				work_date: self.$('[name=work_date]').val(),
				num_hours: parseFloat(self.$('[name=num_hours]').val())
			};

			if (!record) record = new TimeTracker.Models.Client.TimeRecord();
			record.save(formData, {
				success: function() {
					self.records.fetch({ reset: true });
					if (record.isNew && isNew) {
						self.$('.record-detail').empty();
					} else {
						self.showDetail(record);
					}
				}
			});
		});

		this.$('.btn-cancel-record').off('click').on('click', _.bind(function() {
			if (record && !isNew) {
				this.showDetail(record);
			} else {
				this.$('.record-detail').empty();
			}
		}, this));

		this.$('.btn-delete-record').off('click').on('click', _.bind(function() {
			self.showConfirmModal(
				'Confirming will delete this hour record.',
				function() {
					record.destroy({
						success: function() {
							self.records.fetch({ reset: true });
							self.$('.record-detail').empty();
						}
					});
				}
			);
		}, this));
	},

	addRecord: function() {
		this.showEditForm(null, true);
	},

	backToCalendar: function() {
		app.router.navigate('calendar', { trigger: true });
	}
});

// Round a Date to the nearest 15-minute interval
function roundToNearest15(date) {
	var ms = 15 * 60 * 1000;
	var rounded = new Date(Math.round(date.getTime() / ms) * ms);
	return rounded;
}
