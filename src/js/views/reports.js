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
