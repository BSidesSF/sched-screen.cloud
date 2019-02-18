# BSides SF [sched](https://sched.com) <--> [screen.cloud](https://screen.cloud) Integration

This is a clone of the sched [Digital Signage](https://sched.com/support/guide/digital-signage/) front-end with some tweaks and the ability to change settings remotely.
## How to use

Serve these files from a NGINX web server with the following in the NGINX configuration

```
# this proxies API calls to sched
location ~/bsidessf/sched/(.*)$ {
	proxy_pass https://bsidessf2019.sched.com/$1;
	proxy_set_header Host bsidessf2019.sched.com;
	#add_header 'Access-Control-Allow-Origin' '*';
	#add_header 'X-Frame-Options' '';
}

# static file hosting
location /bsidessf {
	index index.html;
	#add_header 'Access-Control-Allow-Origin' '*';
	add_header 'X-Frame-Options' '';
	try_files $uri $uri/ =404;
}
```

## Why?

At the time of writing, screen.cloud only supports Outlook and [Google Calendar](https://screen.cloud/how-to/apps/event-calendar-app) events. Google Calendar can pull from an ical feed, which sched provides, but Google will only pull updates from sched once a day which wont update the displayed calendar in time.
Additionally there is a timezone bug in the way sched pull from Google Calendar calendars that source from an ical feed that put all events in the wrong timezone.

sched has support for [Digital Signage](https://sched.com/support/guide/digital-signage/), but unfortunately requires user interaction on the digital signage page to configure, which screen.cloud does not allow. Thus this hack of a repository was created.

