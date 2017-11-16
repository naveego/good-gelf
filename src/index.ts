import { Stream } from "stream";
import * as log from 'gelf-pro';

export type LogLevel = 'debug'|'info'|'notice'|'warning'|'error'|'critical'|'emergency'

export interface Config extends log.IGelfProConfig{
    // Applied to incoming events to determine the level to log them at.
    // Default behavior is to log errors at 'error' and everything else at 'info'
    router?: (event:any) => LogLevel
}

export class Graylog extends Stream.Transform {
    constructor(private config: Config) {
        super({ objectMode: true });

        config.router = config.router || function(event:any): LogLevel{
            if (event.event === 'error' || event.data instanceof Error) {
                return 'error';
            } 
            return 'info';                
        }

        config.transform = config.transform || [];
        config.transform.push(data => {
            if (data.event === 'response'){
                data.api_http_method = data.method;
                data.api_http_path = data.path;
                data.api_http_status = data.statusCode;
                data.execution_ms = data.responseTime;

                delete data.path;
                delete data.method;
                delete data.responseTime;
                delete data.statusCode;

                if(data.query){
                    let queryString = [];
                    for(let k of Object.keys(data.query)){
                        queryString.push(k + '=' + data.query[k])
                    }
                    data.api_query = queryString.join('&');
                    delete data.query;
                }
            }
        })

        log.setConfig(config);

    }

    _transform(data, enc, next) {

        const eventName = data.event;
        
        // These fields are not allowed in GELF
        delete data['id'];
        delete data['timestamp'];


        let level = this.config.router(data);

        if (data.event === 'error') {
            log[level](data.error);
        } else if (data.data instanceof Error) {
            const error = data.data;
            log[level](error);
        } else {
            log[level](data.event, data);
        }

        return next(null, data);
    }
}