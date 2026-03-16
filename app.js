var baseURL = "/bs/sched";
var limit = 200;
var venueList = "global";
// Filter sessions by event type.
// null = Opening/Closing Remarks (no event_type set in sched.co)
// Add or remove types here to control what appears on the displays.
var eventTypeFilter = [
  null,             // Opening Remarks, Closing Remarks
  "Keynote",
  "Presentation",
  "Panel",
  "Birds of a Feather",
  // "Meetup",
  // "Workshop",    // Workshop sessions (Theatres 01-04) — uncomment to include
  // "Village",     // Village sessions — uncomment to include
  "Roast My Pitch",
  // "Community Organization",
  // "Food & Drink",
  // "General",
];
//var startDate = moment("2023-04-23");
var maxDisplayLength = moment.duration(3.5, 'hours');
console.debug = console.log;
// Track the current calendar date so we can detect day rollovers
var currentDay = moment().format("YYYY-MM-DD");
// Self-executing wrapper
(function($){
  // No caching
  $.ajaxSetup({ cache: false });
  // Models
  var Session = Backbone.Model.extend();
  // Collections
  var SessionsCollection = Backbone.Collection.extend({
    url: function(){
      return baseURL+'/monitors/api/sessions/' + venueList + '?limit=' + limit;
    },
    model: Session,
    // Filter to only sessions whose event_type is in the provided list.
    // Supports null as a valid filter value (matches sessions with no event_type
    // set — e.g. Opening/Closing Remarks come back from the API with the field absent).
    ofTypes: function(types) {
      var filtered = this.filter(function(session) {
        var t = session.get("event_type") ?? null; // normalize undefined (missing field) to null
        return types.includes(t);
      });
      return new SessionsCollection(filtered);
    },
    shorterThan: function(maxDuration) {
      var filtered = this.filter(function(session) {
        var start = moment(session.get("event_start"));
        var end = moment(session.get("event_end"));
        var duration = moment.duration(end.diff(start));
        return maxDuration >= duration;
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
    endsAfter: function(endMoment) {
      var filtered = this.filter(function(session) {
        //console.log("session:", session);
        var end = moment(session.get("event_end"));
        return endMoment <= end;
      });
      return new SessionsCollection(filtered);
    },
  });
  // Views
  var SessionsView = Backbone.View.extend({
    el: '#sessionsList',
    template: _.template( $('#sessionsTemplate').html()),
    initialize: function(){
      _.bindAll(this, "render");
      // make sure 'this' refers to this View in the success callback below
    },
    render: function(){
      console.debug("rendering sessions");
      var startDate = moment();
      //startDate = moment("2023-04-23");
      console.debug("using startdate:", startDate.format());
      // Fix session colors that are invisible against the dark background.
      // sched.co assigns #000000 to Presentations and "transparent" to Remarks,
      // both of which disappear on our black body. Replace with a visible dark color.
      this.collection.each(function(session) {
        var color = session.get("color");
        if (color === "#000000" || color === "transparent") {
          session.set("color", "#1a1a2e");
        }
      });
      this.$el.html(this.template({
        sessions: this.collection.endsAfter(startDate).shorterThan(maxDisplayLength).ofTypes(eventTypeFilter).toJSON()
      }));
      hideOverflow();
    }
  });
  // Render views
  var sessionsCollection = new SessionsCollection();
  var sessionsView = new SessionsView({ collection: sessionsCollection });
  // Sync
  function fetchSessions() {
    //$('.loading').show();
    return sessionsCollection.fetch({
      success: function(collection, response, options) {
        // Note: do not reassign sessionsCollection here — sessionsView already
        // holds a reference to the original collection object, so reassigning
        // the outer variable has no effect on the view. The collection is
        // updated in-place by Backbone's fetch(), so just re-render directly.
        sessionsView.render();
        $('.loading').hide();
        console.debug("sessions:", collection);
        // If the calendar date has changed since the page loaded (e.g. overnight
        // rollover from Saturday to Sunday), force a full page reload so the
        // date headings and session list reflect the new day cleanly.
        var today = moment().format("YYYY-MM-DD");
        if (today !== currentDay) {
          console.debug("Day has changed from", currentDay, "to", today, "— reloading page.");
          window.location.reload();
        }
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
  fetchSessions();
  window.setInterval(function() {
    fetchSessions();
  }, 60000) // every 1 minute;
})(jQuery);