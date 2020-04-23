# node-app-hive

Cluster based NodeJS process manager.
TCP ports or IPC sockets can be used.

---

## Usage:

1.  Create a folder for an application sockets, for example `/home/my-app/run`.

1.  Create an executable application script, for example (`/home/my-app/app.js`):

    ```js
    #!/bin/sh
    ':' //; exec /usr/bin/env node "$0" "$@"

    const path = require('path');
    const hive = require('node-app-hive');

    // Using TCP ports:
    hive.bind('example-node-app', {
        command_conn: {
            port: 4000,
            host: 'localhost',
            // -OR- Using IPC:
            //path: path.normalize(`${__dirname}/run`) + '/%namehive.command.sock'
        },
        worker_conn: {
            port: '4001 + %numworker',
            host: 'localhost',
            // -OR- Using IPC:
            //path: path.normalize(`${__dirname}/run`) + '%namehive.worker%numworker.sock'
        },
        worker_script: require.resolve('./worker'),
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

For example, using systemd:

```ini
[Unit]
Description=Sample Clustered Node Application

[Service]
WorkingDirectory=/home/my-app
ExecStart=/usr/bin/sh /home/my-app/app.js
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=node-sample-app
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

---

## Exit policy

When you emitting `restart` or `reload` command, by default used simple `halt` policy,
which invoking `process.exit()` for each worker node.

Alternatively you can use `exit_policy: 'SIGTERM'`.
In this case, you should manually handle `SIGTERM` signal in your worker script.
For example:

```javascript
const http = require('http');

http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Hello World!');
    res.end();
}).listen(8080);

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        process.exit();
    });
});
```
