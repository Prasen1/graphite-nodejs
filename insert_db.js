/* dependent packages and files required */
import fetch from 'node-fetch';
import log from './utils/logger.js';
import { get_token } from './auth_handler.js';
import config from './config/config_catchpoint.js';
import config_graphite from './config/config_graphite.js';
import net from 'net';
import utf8 from 'utf8';
/* 
functions:
        Function Name                   Description
    fetch_Data            :     function to fetch data from LastRaw API
    convert_data          :     function to transform JSON recieved from LastRaw API
    write_data            :     function to insert lines of data into Graphite
    get_token             :     function to get Access token 
*/

// Global Variable
const raw_data_url = `${config.base_url}${config.last_raw_path}`;
const client_key = config.client_key;
const client_secret = config.client_secret;
const test_types = config.tests;
const server = config_graphite.carbon_server;
const port = config_graphite.carbon_port;
const prefix = "catchpoint.testdata";

// main function to fetch and store data
async function run() {
    try {
        const token = await get_token(client_key, client_secret);
        let tests_list = [];
        // breakdown the tests list into chunks of 20 test ids for each test type
        Object.keys(test_types).forEach(function (key, index) {
            let temp = [], chunk = 20;
            for (let i = 0, j = test_types[key].length; i < j; i += chunk) {
                temp.push(test_types[key].slice(i, i + chunk));
            }
            tests_list.push(temp);
        });
        for (let tests of tests_list) {
            for (let arr of tests) {
                let url = `${raw_data_url}${arr}`;
                let raw_data = await fetch_Data(token, url);
                let data = convert_data(raw_data);
                if (data != "No Data") {
                    await write_data(data);
                }
                else {
                    log.info("No Data for the last 15 minutes");
                }
            }
        }
    }
    catch (err) {
        let error = new Error(err);
        log.error(error);
    }
}
// function to fetch Raw Data
async function fetch_Data(token, url) {
    let response = await fetch(url, {
        headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(json => {
            // if object has property Message, display Error, else Process Data
            if (json.hasOwnProperty('Message')) {
                log.error(`${json.Message}`);
            } else {
                log.info("<<Fetched Raw Test Data>>", url, `Raw Data Start Timestamp: ${json.start} End Timestamp: ${json.end}`)
                if (json.hasOwnProperty('error')) {
                    log.error(`${json.error}`, "<<Check Catchpoint configuration file>>")
                }
                return json;
            }
        }).catch(err => {
            log.error(err);
        }
        );
    return response;
}
// function to parse and transform JSON 
function convert_data(structure) {
    // Checks if there is test data for the last 15 mins
    if (structure['detail'] != null) {

        let items = []
        let test_params = []
        let test_metric_values = []
        let temp = {}
        let solution = {}
        for (let value of structure?.detail?.fields?.synthetic_metrics) {
            let metrics = value['name'].replace(/ /g, '') //Remove whitespace from metric names
            test_params.push(metrics)
        }
        for (let value of structure?.detail?.items) {
            let metric_values = value['synthetic_metrics']
            let flag = true
            let temp = {}
            temp.tags = {}
            temp.timestamp = {}
            for (let i in value) {
                if (i != 'synthetic_metrics') {
                    switch (i) {
                        case "dimension":
                            temp.timestamp = Math.round(new Date(value[i]['name']).getTime()/1000); //Epoch time in seconds precision
                            break;
                        case "breakdown_1":
                            temp.tags['testId'] = value[i]['id']
                            break;
                        case "breakdown_2":
                            temp.tags['nodeId'] = value[i]['id']
                            break;
                        case "hop_number":
                            temp.tags[i] = value[i]
                            break;
                        case "step":
                            temp.tags[i] = value[i]
                            break;
                    }
                }
            }
            if (flag) {
                metric_values.push(temp)
                test_metric_values.push(metric_values)
            }
        }
        for (let test_metric_value of test_metric_values) {
            temp = {}
            temp.metrics = {}
            for (let i = 0; i < test_metric_value.length; i++) {
                if (typeof (test_metric_value[i]) != "object")
                    temp.metrics[test_params[i]] = test_metric_value[i]
                else
                    for (let value in test_metric_value[i]) {
                        temp[value] = test_metric_value[i][value]
                    }
            }
            items.push(temp)
        }
        solution['items'] = items
        return solution['items'];
    }
    else {
        log.info(structure)
        return ("No Data");
    }
}
// function to send lines of data to Graphite carbon
async function write_data(items) {
    /*
      Transform JSON items to lines of metrics in the format- my.series;tag1=value1;tag2=value2 metric_value timestamp
      Then send the lines of metrics to Graphite's carbon listener for storage. Metric path: catchpoint.testdata.MetricName
    */
    try {
        log.info("<<#Items>>", items.length)
        let lines=[]
        for (let item of items) {
            for (let key in item['metrics'])
            {
                if ('step' in item['tags']) {
                    lines.push(`${prefix}.${key};testId=${item['tags']['testId']};nodeId=${item['tags']['nodeId']};stepNumber=${item['tags']['step']} ${item['metrics'][key]} ${item['timestamp']}`)
                }
                else if ('hop_number' in item['tags']) {
                    lines.push(`${prefix}.${key};testId=${item['tags']['testId']};nodeId=${item['tags']['nodeId']};hopNumber=${item['tags']['hop_number']} ${item['metrics'][key]} ${item['timestamp']}`)
                }
                else {
                    lines.push(`${prefix}.${key};testId=${item['tags']['testId']};nodeId=${item['tags']['nodeId']} ${item['metrics'][key]} ${item['timestamp']}`)
                }
            }
        }
        let message = lines.join('\n') //all lines must end in a newline
        log.info("<<#Series to update>>",message.length)
        // open a connection and send lines of data as socket message to carbon listener over TCP
        let socket = net.createConnection(port, server, function() {
            socket.write(utf8.encode(message));
            socket.end();
        });
        socket.on('close', function() {
            log.info("<<Finished sending data, closing connection>>");
        });
    }
    catch (err) {
        log.error(err);
    }
}

run();
