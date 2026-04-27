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

// Found: https://stackoverflow.com/questions/11867545/change-text-color-based-on-brightness-of-the-covered-background-area
// Credit: cyang 8/8/2012
TimeTracker.Utils.getContrastYIQ = function(hexcolor) {
    var r = parseInt(hexcolor.substring(1,3),16);
    var g = parseInt(hexcolor.substring(3,5),16);
    var b = parseInt(hexcolor.substring(5,7),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000' : '#FFF';
}

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
