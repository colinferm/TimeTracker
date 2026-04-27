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
			byDate[row.date].push({ 
				client_name: row.client_name, 
				color: row.color, 
				total_hours: parseFloat(row.total_hours) 
			});
		});
		this.$('.calendar-day[data-date]').each(function() {
			var date = $(this).data('date');
			var entries = byDate[date];
			if (!entries) return;
			var html = '<div class="mt-1">';
			entries.forEach(function(e) {
				let fontColor = TimeTracker.Utils.getContrastYIQ(e.color);
				html += '<div class="small text-start lh-sm p-1" style="color: '+fontColor+'; background-color: '+e.color+';">' + e.client_name + ': <span style="color: '+fontColor+';">' + e.total_hours + 'hrs</span></div>';
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
