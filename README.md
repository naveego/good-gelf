# good-gelf
GELF adapter for the Hapi.js Good logging library.

## Development

* Build: `tsc`
* Publish: Increment the version number in package.json, then `npm publish --access public`

## Usage

Intended to be used with the Good logging plugin.

```
{
        register: (server: Hapi.Server, options: IPluginOptions): Promise<void> => {

            let serverConfigs = options.serverConfigs;

            const opts = <any>{
                ops: {
                    interval: 1000
                },
                reporters: <any>{}
            };

            if (serverConfigs.graylogURL) {
                const verbose = serverConfigs.verbose;
                const logLevel = verbose ? 7 : 6;

                const url = URL.parse(serverConfigs.graylogURL);

                if (url.protocol !== 'udp:') {
                    throw Error("Only GELF UDP is supported, can't use graylog_url " + serverConfigs.graylogURL);
                }

                opts.reporters.graylog = [
                    {
                        module: 'good-squeeze',
                        name: 'Squeeze',
                        args: [{ error: '*', log: '*', response: '*' }]
                    }, {
                        module: '@naveego/good-gelf',
                        name: 'Graylog',
                        args: [<log.IGelfProConfig>{
                            fields: { facility: 'api/navget', version: version },
                            filter: [
                                function (message: any) {
                                    return message.level <= logLevel;
                                }
                            ],
                            transform: [],
                            broadcast: [
                                function (message: any) {
                                    if (!message.event) {
                                        // "event" messages will be console logged by good-console.
                                        if (verbose || message.level < 4) {
                                            console[message.level > 3 ? 'log' : 'error'](JSON.stringify(message));
                                        }
                                    }
                                }
                            ],
                            adapterName: 'udp',
                            adapterOptions: {
                                host: url.hostname,
                                port: Number(url.port),
                                protocol: 'udp4',
                            }
                        }]
                    }
                ];
            }

            if (options.serverConfigs.verbose) {
                opts.reporters.consoleReporter = [{
                    module: 'good-squeeze',
                    name: 'Squeeze',
                    args: [{ error: '*', log: '*', response: '*', request: '*' }]
                }, {
                    module: 'good-console'
                }, 'stdout'];
            }

            return new Promise<void>((resolve) => {
                server.register({
                    register: require('good'),
                    options: opts
                }, (error) => {
                    if (error) {
                        log.critical('Error registering logger plugin', <any>error);
                    }

                    resolve();
                });
            });
        },
        info: () => {
            return {
                name: "Good Logger",
                version: "1.0.0"
            };
        }
    };

```