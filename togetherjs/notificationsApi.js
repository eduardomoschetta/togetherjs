
define(["util", "storage"], function (util, storage) {

	var notificationsApi = util.Module("notificationsApi");

	var lastNotification;

	var FADE_NOTIFICATION_TIMEOUT = 300;

	notificationsApi.isSupported = function() {
		if (! ('Notification' in window))
			return false;
		if (! TogetherJS.getConfig("allowDesktopNotifications"))
			return false;
		return true;
	}

	notificationsApi.isEnabled = function(callback) {
		return util.Deferred(function(def) {
			if (!notificationsApi.isSupported())
				return false;
			storage.get('enableNotifications', null).then(function(value) {
				// if notifications are disabled at the browser level,
				// it has higher precedence.
				// otherwise, we will take a look in user settings
				// at the app level.
				var browserEnabled = Notification.permission == 'granted';
				if (!browserEnabled) {
					if (value !== false)  // keeps consistency
						updateStorage(false);
					def.resolve(false);
				}
				else {
					if (value === null)  // initializes with a consistent value
						updateStorage(value = true);
					def.resolve(value);
				}
			});
		});
	}

	notificationsApi.enable = function() {
		return util.Deferred(function(def) {
			notificationsApi.isEnabled().then(function(enabled) {
				if (enabled) {
					def.resolve(true);
					return;
				}

				Notification.requestPermission(function(permission) {
					var userEnabled = permission == 'granted';
					updateStorage(userEnabled);
					def.resolve(userEnabled);
				});
			});
		});
	}

	notificationsApi.disable = function() {
		updateStorage(false);
	}

	notificationsApi.send = function(params) {
		var title = params.title || document.title;
		if ('title' in params)
			delete params.title;

		if (params.body && params.body.length > 140) {
			params.body = params.body.substr(0, 140);
		}

		var showTimeout = lastNotification ? FADE_NOTIFICATION_TIMEOUT : 0;
		var _lastNotification = lastNotification;

		// Leave a notification only and close the last one
		// Note the browser-specific behavior:
		// - Chrome allows for notification stacking
		// - Firefox does not, and sometimes it keeps the older notification
		// and closes the newer one
		setTimeout(function() {

			if (_lastNotification)
				_lastNotification.close();

			var notification = new Notification(title, params);
			notification.addEventListener('click', function() {
				lastNotification = null;
				window.focus();
			});

			lastNotification = notification;

		}, showTimeout);
	}

	function updateStorage(value) {
		storage.set('enableNotifications', value);
	}

	return notificationsApi;

});