/* TimeTracker – Compiled: 2026-04-24, 15:41:24.4 */
var TimeTracker = {
	Apps: {
		Data: {}
	},
	Utils: {
		UI: {},
		Functions: {}
	},
	Routers: {},
	Collections: {
		Client: {},
		Project: {}
	},
	Models: {},
	Views: {
		Modal: {}
	},
	Events: {}
};

_.extend(TimeTracker.Events, Backbone.Events);

TimeTracker.Utils.UI.TPL = {
	templates: {},

	loadAllTemplates: function(callback) {
		var that = this;
		var templateCount = 0;
		if (Object.keys(that.templates).length === 0) {
			$('script').each(function() {
				var tmpid = $(this).attr('id');
				if (tmpid) {
					that.templates[tmpid] = $(this).html();
				}
				templateCount++;
			});
		}
		callback(templateCount);
	},

	get: function(name) {
		return this.templates[name];
	}
};

TimeTracker.Utils.UI.Helpers = {
	TemplateSelectBox: function(options) {
		var model = options.data.root.model;
		var fieldName = options.hash['field-name'];
		var itemId = options.hash['item-id'];
		var itemName = options.hash['item-name'];
		var collectionName = options.hash['collection-property'];
		var modelProperty = options.hash['model-property'];
		var withBlank = !!options.hash['with-blank'];
		var tabIndex = options.hash['tab-index'] || 1;
		var formId = options.hash['id-name'];

		var html = formId
			? '<select name="' + fieldName + '" id="' + formId + '" tabindex="' + tabIndex + '" class="form-control">'
			: '<select name="' + fieldName + '" tabindex="' + tabIndex + '" class="form-control">';

		if (withBlank) html += '<option value="0">--</option>';

		var collection = this[collectionName];
		for (var i = 0; i < collection.length; i++) {
			var elem = collection[i];
			var selected = (elem[itemId] == model[modelProperty]) ? 'selected' : '';
			html += '<option value="' + elem[itemId] + '" ' + selected + '>' + elem[itemName] + '</option>';
		}
		html += '</select>';
		return html;
	},

	TemplateOptions: function(options) {
		var model = options.data.root.model;
		var selectKey = options.hash['selected-id'];
		var nameParam = options.hash['name-param'];
		var selected = (this.id == model[selectKey]) ? 'selected' : '';
		return '<option value="' + this.id + '" ' + selected + '>' + this[nameParam] + '</option>';
	},

	TemplateCheckbox: function(options) {
		var className = options.hash['class-name'];
		var nameParam = options.hash['name-param'];
		var idParam = options.hash['id-param'] || '';
		var text = options.hash['text'] || '';
		var objName = options.hash['obj-name'] || 'model';
		var tabIndex = options.hash['tab-index'] || 1;
		var model = options.data.root[objName] || options.data.root;
		var checked = (model[nameParam] == 1) ? 'checked' : '';
		var formId = idParam ? 'id="' + idParam + '"' : '';
		return '<input type="checkbox" class="' + className + ' form-check-input" tabindex="' + tabIndex + '" ' + formId + ' ' + checked + '>' + text;
	},

	TemplateDateFormat: function(options) {
		var modelProperty = options.hash['model-property'];
		var formatString = options.hash['format'] || 'MM/DD/YYYY';
		var dateProp = this[modelProperty];
		if (dateProp) {
			return moment(dateProp).format(formatString);
		}
		return '';
	}
};

Handlebars.registerHelper('select-box', TimeTracker.Utils.UI.Helpers.TemplateSelectBox);
Handlebars.registerHelper('form-option', TimeTracker.Utils.UI.Helpers.TemplateOptions);
Handlebars.registerHelper('checkbox', TimeTracker.Utils.UI.Helpers.TemplateCheckbox);
Handlebars.registerHelper('date-format', TimeTracker.Utils.UI.Helpers.TemplateDateFormat);

TimeTracker.Utils.Formatters = {
	money: function(val) {
		if (Number.isNaN(val)) return "$0.00";
		return Number(val.toFixed(2)).toLocaleString('en');
	}
}

TimeTracker.Utils.Resolver = {
	getValue: function(object, prop) {
		if (!object || !prop) return null;
		var arr = prop.split('.');
		var fn = object;
		for (var i = 0, len = arr.length; i < len; i++) {
			if (fn == null) return fn;
			else if (Backbone.Model.prototype.isPrototypeOf(fn) && fn.has(arr[i])) fn = fn.get(arr[i]);
			else if (_.isFunction(fn[arr[i]])) fn = fn[arr[i]]();
			else fn = fn[arr[i]];
		}
		return fn;
	},

	stringToObject: function(str, type) {
		type = type || 'object';
		var arr = str.split('.');
		var fn = window || this;
		for (var i = 0, len = arr.length; i < len; i++) fn = fn[arr[i]];
		if (typeof fn !== type) throw new Error(type + ' not found: ' + str);
		return fn;
	},

	getNewInstance: function(classNameWithNamespace, params) {
		params = params || {};
		var MyClass = TimeTracker.Utils.Resolver.stringToObject(classNameWithNamespace, 'function');
		return new MyClass(params);
	}
};

// Attaches the JWT Bearer token to every Backbone sync request
TimeTracker.Apps.handleAjaxAuth = function(xhr) {
	var token = localStorage.getItem('tt_token');
	if (token) {
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
	}
};

Backbone.ajax = function(request) {
	request.beforeSend = TimeTracker.Apps.handleAjaxAuth;
	return Backbone.$.ajax.apply(Backbone.$, [request]);
};

Date.prototype.dateToYMD = function() {
	var d = this.getDate();
	var m = this.getMonth() + 1;
	var y = this.getFullYear();
	return '' + (m <= 9 ? '0' + m : m) + '/' + (d <= 9 ? '0' + d : d) + '/' + y;
};

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

TimeTracker.Views.BaseView = Backbone.View.extend({
	initialize: function(options) {
		this.opts = options;
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	}
});

TimeTracker.Views.Modal = Backbone.View.extend({
	tagName: 'div',
	className: 'modal fade',
	templateName: 'modal-wrapper',
	modalSize: null,

	events: {
		'click .action_save': 'saveData',
		'keypress': 'keyAction'
	},

	initialize: function(options) {
		this.opts = options;
		this.modalSize = options.modalSize || null;
		this.buttonText = options.buttonText || 'Save changes';

		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
		this.render();
	},

	render: function() {
		this.$el.html(this.template({ modal_title: this.opts.title }));
		if (this.modalSize) $('.modal-dialog', this.$el).addClass(this.modalSize);

		this.content = TimeTracker.Utils.Resolver.getNewInstance(this.opts.class, this.opts);
		$('.modal-body', this.$el).html(this.content.render().$el);
		$('.action_save', this.$el).html(this.buttonText);
		$('body').append(this.$el);

		this.modal = new bootstrap.Modal(this.el);
		this.$el.on('hidden.bs.modal', _.bind(this.removeSelf, this));
		this.modal.show();

		return this.$el;
	},

	keyAction: function(e) {
		if (e.keyCode === 27) this.removeSelf();
	},

	saveData: function() {
		this.content.doSave(_.bind(function(success, model) {
			if (success) {
				this.close();
				if (this.opts.callback) this.opts.callback(model);
			}
		}, this));
	},

	close: function() {
		if (document.activeElement) document.activeElement.blur();
		this.removeSelf();
	},

	removeSelf: function() {
		this.modal.hide();
		this.$el.remove();
	}
});

TimeTracker.Routers.Main = Backbone.Router.extend({
	routes: {
		'': 'calendar',
		'calendar': 'calendar',
		'day/:date': 'day',
		'clients': 'clients',
		'projects': 'projects',
		'reports': 'reports',
		'users': 'users'
	},

	calendar: function() {
		app.showView(new TimeTracker.Views.Calendar());
	},

	day: function(date) {
		app.showView(new TimeTracker.Views.Day({ date: date }));
	},

	clients: function() {
		app.showView(new TimeTracker.Views.Clients.List());
	},

	projects: function() {
		app.showView(new TimeTracker.Views.Projects.List());
	},

	reports: function() {
		app.showView(new TimeTracker.Views.Reports());
	},

	users: function() {
		if (!app.session || parseInt(app.session.user.is_admin) !== 1) {
			this.navigate('calendar', { trigger: true });
			return;
		}
		app.showView(new TimeTracker.Views.Users.List());
	}
});

// ─── Application object ───────────────────────────────────────────────────────

var app = {
	session: null,
	router: null,
	currentView: null,

	init: function() {
		TimeTracker.Utils.UI.TPL.loadAllTemplates(_.bind(function() {
			var token = localStorage.getItem('tt_token');
			var userData = localStorage.getItem('tt_user');

			var user = null;
			try { user = userData ? JSON.parse(userData) : null; } catch (e) {}
			if (token && user) {
				this.session = { token: token, user: user };
				this.showMainLayout();
			} else {
				localStorage.removeItem('tt_token');
				localStorage.removeItem('tt_user');
				this.showLogin();
			}
		}, this));
	},

	showLogin: function() {
		var loginView = new TimeTracker.Views.Login();
		$('#app').html(loginView.render().$el);
	},

	showMainLayout: function() {
		var html = TimeTracker.Utils.UI.TPL.get('main-layout');
		var template = Handlebars.compile(html);
		$('#app').html(template({ user: this.session.user }));

		this.router = new TimeTracker.Routers.Main();
		Backbone.history.start();
	},

	showView: function(view) {
		if (this.currentView) {
			this.currentView.remove();
		}
		this.currentView = view;
		$('#main-content').html(view.render().$el);
	},

	login: function(token, user) {
		localStorage.setItem('tt_token', token);
		localStorage.setItem('tt_user', JSON.stringify(user));
		this.session = { token: token, user: user };
		this.showMainLayout();
	},

	logout: function() {
		localStorage.removeItem('tt_token');
		localStorage.removeItem('tt_user');
		this.session = null;
		if (this.router) {
			Backbone.history.stop();
			this.router = null;
		}
		this.showLogin();
	}
};

TimeTracker.Models.User = Backbone.Model.extend({
	urlRoot: '/api/users',

	defaults: {
		username: '',
		email_address: '',
		first_name: '',
		last_name: '',
		country: '',
		confirmed: 0,
		is_admin: 0
	}
});

TimeTracker.Collections.Users = Backbone.Collection.extend({
	model: TimeTracker.Models.User,
	url: '/api/users'
});

TimeTracker.Models.ClientProject = Backbone.Model.extend({
	urlRoot: '/api/projects',

	defaults: {
		client_id: null,
		name: '',
		bill_rate: 0.00,
		start_date: null,
		end_date: null
	}
});

TimeTracker.Collections.Projects = Backbone.Collection.extend({
	model: TimeTracker.Models.ClientProject,
	url: '/api/projects'
});

TimeTracker.Collections.ClientProjects = Backbone.Collection.extend({
	model: TimeTracker.Models.ClientProject,

	initialize: function (models, options) {
		this.clientId = options && options.clientId;
	},

	url: function () {
		return '/api/clients/' + this.clientId + '/projects';
	}
});

TimeTracker.Models.Client = Backbone.Model.extend({
	urlRoot: '/api/clients',

	defaults: function () {
		return {
			name: '',
			primary_contact: '',
			address_1: '',
			address_2: '',
			city: '',
			state_province: '',
			postal_code: '',
			country: '',
			bill_rate: 135.00,
			start_date: null,
			end_date: null
		};
	}
});

TimeTracker.Collections.Clients = Backbone.Collection.extend({
	model: TimeTracker.Models.Client,
	url: '/api/clients'
});

TimeTracker.Models.Client.TimeRecord = Backbone.Model.extend({
	urlRoot: '/api/hours',

	defaults: {
		client_id: null,
		project_id: null,
		work_desc: '',
		work_date: null,
		num_hours: 1.0
	}
});

TimeTracker.Collections.Client.TimeRecords = Backbone.Collection.extend({
	model: TimeTracker.Models.Client.TimeRecord,
	url: '/api/hours'
});

TimeTracker.Views.Calendar = Backbone.View.extend({
	tagName: 'div',
	className: 'calendar-view',
	templateName: 'calendar',

	events: {
		'click .btn-prev': 'prevMonth',
		'click .btn-next': 'nextMonth',
		'click .calendar-day[data-date]': 'selectDay'
	},

	initialize: function() {
		this.current = moment().startOf('month');
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		var data = this.buildCalendarData();
		this.$el.html(this.template(data));
		this.fetchSummary();
		this.fetchMonthlySummary();
		return this;
	},

	fetchSummary: function() {
		var self = this;
		var month = this.current.format('YYYY-MM');
		$.ajax({
			url: '/api/hours/summary?month=' + month,
			beforeSend: TimeTracker.Apps.handleAjaxAuth,
			success: function(summary) { self.applySummary(summary); }
		});
	},

	applySummary: function(summary) {
		var byDate = {};
		summary.forEach(function(row) {
			if (!byDate[row.date]) byDate[row.date] = [];
			byDate[row.date].push({ client_name: row.client_name, total_hours: parseFloat(row.total_hours) });
		});
		this.$('.calendar-day[data-date]').each(function() {
			var date = $(this).data('date');
			var entries = byDate[date];
			if (!entries) return;
			var html = '<div class="mt-1">';
			entries.forEach(function(e) {
				html += '<div class="small text-start lh-sm">' + e.client_name + ': <span class="text-muted">' + e.total_hours + 'hrs</span></div>';
			});
			html += '</div>';
			$(this).append(html);
		});
	},

	fetchMonthlySummary: function() {
		var self = this;
		var month = this.current.format('YYYY-MM');
		$.ajax({
			url: '/api/hours/monthly-summary?month=' + month,
			beforeSend: TimeTracker.Apps.handleAjaxAuth,
			success: function(rows) { self.renderMonthlySummary(rows); }
		});
	},

	renderMonthlySummary: function(rows) {
		var $container = this.$('.monthly-summary');
		if (!rows.length) {
			$container.empty();
			return;
		}
		var totalHours = 0, totalBillings = 0;
		var rowsHtml = '';
		rows.forEach(function(r) {
			var hours = parseFloat(r.total_hours);
			var billings = parseFloat(r.total_billings);
			totalHours += hours;
			totalBillings += billings;
			rowsHtml += '<tr><td>' + r.client_name + '</td><td>' + hours.toFixed(2) + '</td><td>$' + TimeTracker.Utils.Formatters.money(billings) + '</td></tr>';
		});
		$container.html(
			'<table class="table table-bordered table-sm mt-4">' +
			'<thead class="table-light"><tr><th>Client</th><th>Hours</th><th>Billings</th></tr></thead>' +
			'<tbody>' + rowsHtml + '</tbody>' +
			'<tfoot class="table-light fw-bold"><tr><td>Total</td><td>' + totalHours.toFixed(2) + '</td><td>$' + TimeTracker.Utils.Formatters.money(totalBillings) + '</td></tr></tfoot>' +
			'</table>'
		);
	},

	buildCalendarData: function() {
		var start = this.current.clone().startOf('month');
		var end = this.current.clone().endOf('month');
		var today = moment().format('YYYY-MM-DD');
		var weeks = [];
		var week = [];
		var cursor = start.clone().startOf('week');

		while (cursor.isBefore(end.clone().endOf('week'))) {
			if (cursor.day() === 0 && week.length) {
				weeks.push(week);
				week = [];
			}
			var dateStr = cursor.format('YYYY-MM-DD');
			week.push({
				date: dateStr,
				day: cursor.date(),
				isCurrentMonth: cursor.isSame(this.current, 'month'),
				isToday: dateStr === today
			});
			cursor.add(1, 'day');
		}
		if (week.length) weeks.push(week);

		return {
			monthLabel: this.current.format('MMMM YYYY'),
			weeks: weeks
		};
	},

	prevMonth: function() {
		this.current.subtract(1, 'month');
		this.render();
	},

	nextMonth: function() {
		this.current.add(1, 'month');
		this.render();
	},

	selectDay: function(e) {
		var date = $(e.currentTarget).data('date');
		app.router.navigate('day/' + date, { trigger: true });
	}
});

TimeTracker.Views.Day = Backbone.View.extend({
	tagName: 'div',
	className: 'day-view',
	templateName: 'day',

	events: {
		'click .btn-add-record': 'addRecord',
		'click .time-record-item': 'selectRecord',
		'click .btn-back-to-calendar': 'backToCalendar'
	},

	initialize: function(options) {
		this.date = options.date;
		this.records = new TimeTracker.Collections.Client.TimeRecords();
		this.records.url = '/api/hours?date=' + this.date;
		this.clients = new TimeTracker.Collections.Clients();

		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);

		this.listenTo(this.records, 'reset sync', this.renderRecords);
		this.records.fetch({ reset: true });
		this.clients.fetch({ reset: true });
	},

	render: function() {
		this.$el.html(this.template({
			date: this.date,
			dateLabel: moment(this.date).format('dddd, MMMM D, YYYY')
		}));
		return this;
	},

	renderRecords: function() {
		var $list = this.$('.record-list');
		$list.empty();

		var html = TimeTracker.Utils.UI.TPL.get('time-record-item');
		var template = Handlebars.compile(html);
		this.records.each(function(record) {
			var json = record.toJSON();
			var start = moment(json.work_date);
			var end = start.clone().add(json.num_hours * 60, 'minutes');
			json.start_time = start.format('h:mm a');
			json.end_time = end.format('h:mm a');
			$list.append(template({ record: json }));
		});
	},

	selectRecord: function(e) {
		var id = $(e.currentTarget).data('id');
		var record = this.records.get(id);
		if (record) this.showEditForm(record);
	},

	showDetail: function(record) {
		var html = TimeTracker.Utils.UI.TPL.get('time-record-detail');
		var template = Handlebars.compile(html);
		this.$('.record-detail').html(template({ record: record.toJSON() }));

		this.$('.btn-edit-record').off('click').on('click', _.bind(function() {
			this.showEditForm(record);
		}, this));
	},

	showEditForm: function(record, isNew) {
		var self = this;
		var html = TimeTracker.Utils.UI.TPL.get('time-record-form');
		var template = Handlebars.compile(html);

		var data = record ? record.toJSON() : {
			work_date: roundToNearest15(new Date()).toISOString().slice(0, 16),
			num_hours: 1.0
		};

		this.$('.record-detail').html(template({ record: data }));

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

TimeTracker.Views.Login = Backbone.View.extend({
	tagName: 'div',
	className: 'login-wrapper',
	templateName: 'login',

	events: {
		'submit #login-form': 'doLogin'
	},

	initialize: function() {
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template());
		return this;
	},

	doLogin: function(e) {
		e.preventDefault();
		var self = this;
		var username = this.$('#username').val().trim();
		var password = this.$('#password').val();

		this.$('.login-error').hide();
		this.$('.btn-login').prop('disabled', true).text('Signing in…');

		$.ajax({
			url: '/api/auth/login',
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({ username: username, password: password }),
			success: function(data) {
				app.login(data.token, data.user);
			},
			error: function() {
				self.$('.login-error').show();
				self.$('.btn-login').prop('disabled', false).text('Sign In');
			}
		});
	}
});

TimeTracker.Views.Projects = TimeTracker.Views.Projects || {};

TimeTracker.Views.Reports = Backbone.View.extend({
	tagName: 'div',
	className: 'reports-view p-4',

	events: {
		'click .btn-export-excel': 'exportExcel',
		'click .btn-export-pdf': 'exportPdf'
	},

	render: function() {
		this.$el.html(
			'<h2>Reports</h2>' +
			'<div class="mb-3">' +
				'<label class="form-label">Client ID (optional)</label>' +
				'<input type="number" class="form-control" id="filter-client" style="max-width:200px">' +
			'</div>' +
			'<div class="mb-3">' +
				'<label class="form-label">Start Date</label>' +
				'<input type="date" class="form-control" id="filter-start" style="max-width:200px">' +
			'</div>' +
			'<div class="mb-3">' +
				'<label class="form-label">End Date</label>' +
				'<input type="date" class="form-control" id="filter-end" style="max-width:200px">' +
			'</div>' +
			'<button class="btn btn-success me-2 btn-export-excel">Export Excel</button>' +
			'<button class="btn btn-danger btn-export-pdf">Export PDF</button>'
		);
		return this;
	},

	getParams: function() {
		var params = [];
		var client = this.$('#filter-client').val();
		var start = this.$('#filter-start').val();
		var end = this.$('#filter-end').val();
		if (client) params.push('client_id=' + encodeURIComponent(client));
		if (start) params.push('start=' + encodeURIComponent(start));
		if (end) params.push('end=' + encodeURIComponent(end));
		return params.length ? '?' + params.join('&') : '';
	},

	exportExcel: function() {
		window.location.href = '/api/exports/excel' + this.getParams();
	},

	exportPdf: function() {
		window.location.href = '/api/exports/pdf' + this.getParams();
	}
});

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

TimeTracker.Views.Clients = TimeTracker.Views.Clients || {};

TimeTracker.Views.Clients.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'client-form-view',
	templateName: 'client-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		console.log(this.model.attributes.start_date);
		if (this.model.attributes.start_date == null) this.model.attributes.start_date = new Date().toISOString().split('T')[0];
		this.$el.html(this.template({ client: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
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
			end_date: this.$('[name=end_date]').val() || null
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

TimeTracker.Views.Users = TimeTracker.Views.Users || {};

TimeTracker.Views.Users.Form = Backbone.View.extend({
	tagName: 'div',
	className: 'user-form-view',
	templateName: 'user-form',

	initialize: function(options) {
		this.model = options.model;
		var html = TimeTracker.Utils.UI.TPL.get(this.templateName);
		this.template = Handlebars.compile(html);
	},

	render: function() {
		this.$el.html(this.template({ user: this.model.toJSON(), isNew: this.model.isNew() }));
		return this;
	},

	doSave: function(callback) {
		var self = this;
		var data = {
			username: this.$('[name=username]').val().trim(),
			email_address: this.$('[name=email_address]').val().trim(),
			first_name: this.$('[name=first_name]').val().trim(),
			last_name: this.$('[name=last_name]').val().trim(),
			country: this.$('[name=country]').val().trim(),
			confirmed: this.$('[name=confirmed]').is(':checked') ? 1 : 0,
			is_admin: this.$('[name=is_admin]').is(':checked') ? 1 : 0
		};

		var password = this.$('[name=password]').val();
		if (password) data.password = password;

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
