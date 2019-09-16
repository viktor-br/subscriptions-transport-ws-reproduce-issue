# Subscription stays active after successful subscription stop call (GQL_STOP message) 
It happens, when a subscription start call (GQL_START message) is not completed before subscription stop call.
See schema below. 

Happy case:

```
subscription start:  |-----|
subscription stop:            |----|
send message:                               |-----|
receive message:                                      [no message is sent via subscription]
```

Issue case:

```
subscription start:  |------------------|
subscription stop:            |----|
send message:                               |-----|
receive message:                                      |-------| <- message was send via subscription
```

## Code explanation
server.js provides simple query, mutation (send message) and subscription (receive message, which sent via mutation).

client.js starts two subscriptions and after delay stop the first, then send mutation to trigger subscriptions to 
receive a message. 

## How to reproduce
Install dependencies
```bash
npm ci
```

Run server
```bash
node server.js
```

Run client
```bash
node client.js
```

and check server.js and client.js logs.

## Explanation
```
server                                                   client
9/16/2019, 7:46:35 PM subscription:subscribe #1 start    9/16/2019, 7:46:35 PM subscribe for #1
9/16/2019, 7:46:35 PM subscription:subscribe #2 start    9/16/2019, 7:46:35 PM subscribe for #2
                                                         9/16/2019, 7:46:35 PM unsubscribe for #1 start
                                                         9/16/2019, 7:46:36 PM unsubscribe for #1 completed
9/16/2019, 7:46:37 PM subscription:subscribe #1 end
9/16/2019, 7:46:37 PM subscription:subscribe #2 end
9/16/2019, 7:46:38 PM mutation called                    9/16/2019, 7:46:38 PM mutation called
9/16/2019, 7:46:38 PM subscription:resolve #1 called     9/16/2019, 7:46:38 PM subscription #2 results received
9/16/2019, 7:46:38 PM subscription:resolve #2 called
```

_subscription:resolve #1 called_ log line shows that resolver for the first subscription was triggered, even when unsubscribe was called before.

## Patch
Apply patch to test, that issue disappears:
```bash
node_modules/.bin/patch-package
```
and follow steps in Reproduce section again. You can find patch in [./patches/subscriptions-transport-ws+0.9.16.patch](./patches/subscriptions-transport-ws+0.9.16.patch) file.

Resolver for the first subscription should not be triggered any more -- no _subscription:resolve #1 called_ log line it the server.js output.

