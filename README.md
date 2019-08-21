# node-app-hive

Cluster based NodeJS process manager.

This application built upon a unix sockets, so you can use it only on unix based (Linux) platforms.

---

## Usage:

1.  Create a folder for an application sockets, for example `/home/my-app/run`.

1.  Create an executable application script, for example (`/home/my-app/app.js`):

    ```js
    #!/bin/sh
    ':' //; exec /usr/bin/env node "$0" "$@"

    const path = require('path');
    const hive = require('node-app-hive');

    hive.bind('example-node-app', {
        run_folder: path.normalize(`${__dirname}/run`),
        command_socket: '%namehive.command.sock',
        worker_script: require.resolve('./worker'),
        worker_socket: '%namehive.worker%numworker.sock',
        numworkers: 1,
        watch_glob: [`/home/my-app/src/**/*.{js,json}`]
    }).runtime();

    ```

1.  Make the script executable:

    `$ chmod +x /home/my-app/app.js`

1.  To start an application run a command:

    `$ /home/my-app/app.js`

    If you want to watch for the code changes,
    then you can run the script with a `watch` argument:

    `$ /home/my-app/app.js watch`

    You can learn more about watcher glob format [here](https://github.com/shama/gaze)

---

## Commands:

You can emit a command for the running application.
To do so execute:

`$ /home/my-app/app.js <command>`

*   `status` -- get the application status.
*   `restart` -- restart all workers.
*   `reload` -- graceful (zero downtime) workers reloading.

---

## Persist Master

While master is running, it watches for the workers being alive.
If some worker would be terminated, then master will re-spawn that worker immediately.
You should persist the master script by yourself.
For example, you can use [supervisord](http://supervisord.org) service:

_/etc/supervisord.d/node_proxy_app.ini_
```ini
[program:node_proxy_app]
command=sh /home/my-app/app.js
numprocs=1
user=www-data
directory=/home/my-app/
autostart=true
autorestart=true
startretries=3
stopsignal=TERM
stdout_logfile=/var/log/node_proxy_app/out.log
stdout_logfile_maxbytes=1MB
stdout_logfile_backups=10
stderr_logfile=/var/log/node_proxy_app/err.log
stderr_logfile_maxbytes=1MB
stderr_logfile_backups=10
```
