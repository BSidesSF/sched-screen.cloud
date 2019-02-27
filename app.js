//var baseURL = "https://bsidessf2019.sched.com";
var baseURL = "/bsidessf/sched";
var limit = 200;

var venueList = "global";

var venueFilter = ["City View", "IMAX", "Theater 13", "Theater 14"];
var startDate = moment("2019-03-03");
var maxDisplayLength = moment.duration(3.5, 'hours');

console.debug = console.log;

// Self-executing wrapper
(function($){
	// No caching
	$.ajaxSetup({ cache: false });

	// Models
	var Event = Backbone.Model.extend({ url: baseURL+'/monitors/api/event' });
	var Venue = Backbone.Model.extend();
	var Session = Backbone.Model.extend();

	// Collections
	var VenuesCollection = Backbone.Collection.extend({
		url: baseURL+'/monitors/api/venues',
		model: Venue
	});

	var SessionsCollection = Backbone.Collection.extend({
		url: function(){
			return baseURL+'/monitors/api/sessions/' + venueList + '?limit=' + limit;
		},
		model: Session,
		// allow for filtering sessions to display
		inVenues: function(venues) {
			var filtered = this.filter(function(session) {
				var v = session.get("venue");
				var keep = venues.includes(v);
				return keep;
			});
			return new SessionsCollection(filtered);
		},
		shorterThan: function(maxDuration) {
			var filtered = this.filter(function(session) {
				var start = moment(session.get("event_start"));
				var end = moment(session.get("event_end"));
				var duration = moment.duration(end.diff(start));
				return maxDuration  >= duration;
			});
			return new SessionsCollection(filtered);
		},
		startsAfter: function(startMoment) {
			var filtered = this.filter(function(session) {
				//console.log("session:", session);
				var start = moment(session.get("event_start"));
				return startMoment <= start;
			});
			return new SessionsCollection(filtered);
		},

	});

	// Views
	var SessionsView = Backbone.View.extend({
		el: '#sessionsList',

		template: _.template( $('#sessionsTemplate').html()),

		initialize: function(){
			_.bindAll(this, "render"); // make sure 'this' refers to this View in the success callback below
		},

		render: function(){
			console.debug("rendering sessions");
			this.$el.html(this.template({
				sessions: this.collection.startsAfter(startDate).shorterThan(maxDisplayLength).toJSON()
			}));
			hideOverflow();
		}
	});

	var EventView = Backbone.View.extend({
		el: 'body',

		initialize: function(){
			_.bindAll(this, "render"); // make sure 'this' refers to this View in the success callback below
			this.render;
		},

		render: function(){
			$('#event-name').html(this.model.get('name'));
		}
	});

	// Render views
	var event = new Event();
	var venuesCollection = new VenuesCollection();
	var sessionsCollection = new SessionsCollection();

	var eventView = new EventView({ model: event });
	var sessionsView = new SessionsView({ collection: sessionsCollection });

	// Sync
	function fetchEvent() {
		return event.fetch({
			success: function(model, response, options) {
				if (response['css'] && response['css']['monitors']) {
					$('head').append('<link rel="stylesheet" type="text/css" href="' + response['css']['monitors'] +'">');
				}
				event = model;
				eventView.render();
			},
			error: function(model, response, options) {
				console.debug("Event: Failed loading results from API");
			},
		});
	}

	function fetchVenues() {
		return venuesCollection.fetch({
			success: function(collection, response, options) {
				var selectedVenueIndex = $('#venuesList option:selected').val();
				venuesCollection = collection;
				console.debug("venues:", collection);
				if (selectedVenueIndex !== undefined) {
					$('#venuesList').val(selectedVenueIndex).prop('selected', true);
				}
				$('#room-name').html($('#venuesList option:selected').text());
			},
			error: function(collection, response, options) {
				console.debug("Venues: Failed loading results from API");
			},
		});
	}

	function fetchSessions() {
		$('.loading').show();
		return sessionsCollection.fetch({
			success: function(collection, response, options) {
				// filter sessions here!
				sessionsCollection = collection;
				sessionsView.render();
				$('.loading').hide();
				console.debug("sessions:", collection);
			},
			error: function(collection, response, options) {
				console.debug("Sessions: Failed loading results from API");
				$('.loading').hide();
			},
		});
	}

	// hide overflow
	jQuery.expr.filters.offscreen = function(el) {
		var rect = el.getBoundingClientRect();
		return (
			(rect.x + rect.width) < 0 
			|| (rect.y + rect.height) < 0
			|| (rect.x > window.innerWidth || rect.y + rect.height > window.innerHeight)
		);
	};

	function hideOverflow() {
		$(".date-title,.session").show();
		$(".date-title,.session").filter(":offscreen").hide();
	}

	$(window).resize(hideOverflow);

	// Determine the pervious, current, and next 3 events for the current venue
	// function filterSessionsForDisplay() {
	//   if ($('#venuesList').val() != 'global') {
	//     return new SessionsCollection(
	//         new SessionsCollection(sessionsCollection.where({ venue_id: $('#venuesList').val() })).first(5)
	//       ).toJSON();
	//   };

	//   return new SessionsCollection(sessionsCollection.first(5)).toJSON();
	// }

	// Inital load
	var lastModified = null;
	fetchEvent().done(function() {
		lastModified = moment.tz(event.get('modify_date'), event.get('timezone'));
		fetchVenues().done(
			function () {
				fetchSessions();
			}
		)
	}).fail(function() {
		console.debug("Oops! Something's not right!");
	});

	window.setInterval(function() {
		// console.debug(lastModified);
		fetchEvent().done(function() {
			// newLastModified = moment.tz(event.get('modify_date'), event.get('timezone'));
			// console.debug(newLastModified);
			// if (newLastModified > lastModified) {
			// lastModified = newLastModified;
			console.debug('Modified!')
			fetchVenues().done(
				function () {
					fetchSessions();
				}
			)
			// }
		})
			.fail(function() {
				console.debug("Oops! Something's not right!");
			});
	}, 60000) // every 1 minute;

})(jQuery);

