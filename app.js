//var baseURL = "https://bsidessf2023.sched.com";
var baseURL = "/bs/sched";
var limit = 200;

var venueList = "global";

var venueFilter = ["AMC Theatre 11", "AMC Theatre 12", "AMC Theatre 13", "AMC Theatre 14", "AMC Theatre 15", "AMC Theatre 9"];
//var startDate = moment("2023-04-23");
var maxDisplayLength = moment.duration(3.5, 'hours');

console.debug = console.log;

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
            _.bindAll(this, "render"); // make sure 'this' refers to this View in the success callback below
        },

        render: function(){
            console.debug("rendering sessions");
            var startDate = moment();
            //startDate = moment("2023-04-23");
            console.debug("using startdate:", startDate.format());
            this.$el.html(this.template({
                sessions: this.collection.endsAfter(startDate).shorterThan(maxDisplayLength).inVenues(venueFilter).toJSON()
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
    fetchSessions();
    window.setInterval(function() {
        fetchSessions();
    }, 60000) // every 1 minute;

})(jQuery);
