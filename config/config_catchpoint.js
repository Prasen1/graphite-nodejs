var config = 
{
    client_key: 'xxx',
    client_secret: 'xxx',
    base_url: 'https://io.catchpoint.com/ui/',
    token_path: 'api/token',
    last_raw_path: 'api/v1/performance/raw?tests=',
    tests: 
    {
        web: [], 
        transaction: [],
        api: [],
        ping: [],
        traceroute: [],
        dns: [],
        websocket: [],
        smtp: [],
        transport: [],
        ftp: [],
        custom: [],
        ntp: [],
        imap: [],
        ssl: [],
        html: [],
        streaming: []
    }
}
export default config;