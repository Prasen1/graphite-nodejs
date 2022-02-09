# Graphite-Nodejs
Catchpoint Integration with Graphite
---
Graphite is a scalable graphing tool for Time Series data. In Graphite, data is composed of a metric name, metric value, timestamp, and optional tags.

This integration makes use of a Node.js script that runs at 15 minutes intervals to pull raw performance chart data from the Catchpoint GET: LastRaw API. It can be used to retrieve and store data for a list of tests in the same division.

## Prerequisites
1. NodeJS v16.x
2. [Graphite 1.1x](https://graphite.readthedocs.io/en/latest/install.html)
3. Catchpoint account with a REST API consumer

## Installation and Configuration
1. Copy the graphite-nodejs folder to your machine
2. Run npm install in the directory /graphite-nodejs

### Configuration
1. In the "config_catchpoint.js" file under config sub-directory, enter your [Catchpoint API consumer key and secret](https://portal.catchpoint.com/ui/Content/Administration/ApiDetail.aspx)
2. In the tests object of the "config_catchpoint.js" file, enter the Test IDs you want to pull the data for in an array format. Please ensure to enter only the Test ID in the array belonging to the respective Test Type.

*Example:*

---
    tests: 
    {
        web: [142613,142614,142615,142616],
        transaction: [142602,142603],
        api: [142683,142689,155444],
        ping: [142600],
        traceroute: [142607,142608,142609],
        dns: [942639,142640,142641],
        websocket: [842700],
        smtp: [142604]
    }

---
3. In the "config_graphite.js" file, enter your Graphite server address and port. The default Graphite URL for a local installation is http://127.0.0.1:2003

4. The carbon configuration file `/etc/carbon/carbon.conf` must be modified to allow creating thousands of datapoints. Change the value `MAX_CREATES_PER_MINUTE = 50` to `MAX_CREATES_PER_MINUTE = inf` and restart carbon-cache using `sudo systemctl restart carbon-cache`

**Note: Ensure that carbon-cache is enabled `CARBON_CACHE_ENABLED=true`**

## How to run

- Create a cronjob to run the "insert_db.js" script every 15 minutes.

*Example crontab entry, if the “insert_db.js” file resides in /usr/local/bin/*

`*/15 * * * * cd /usr/local/bin/ && node /usr/local/bin/insert_db.js > /usr/local/bin/logs/cronlog.log 2>&1`


## File Structure

    graphite-nodejs/
    ├── auth_handler.js       ## Contains APIs related to authentication       
    ├── config
    | ├── config_catchpoint.js   ## Configuration file for Catchpoint 
    | ├── config_graphite.js     ## Configuration file for Graphite
    ├── logs
    | ├── info
    | |  ├── info.log         ## Contains informational logs. File name will be based on date of execution
    | ├── error
    | |  ├── error.log        ## Contains error logs. File name will be based on date of execution          
    ├── utils
    | ├── logger.js           ## logger utility
    ├──package.json           ## project dependencies
    └── insert_db.js          ## main file


Time Series Data in can be viewed via Graphite's Web UI. Alternatively, we can connect Graphite to an analytics tool such as Grafana and [explore the data](https://grafana.com/docs/grafana/latest/datasources/graphite/).

**Note: Each distinct metric sent to Graphite is stored in its own database file. This means that high volume data requires a good RAID array and/or SSDs to keep up with the I/O operations, or there may be missing data. For more on Graphite scalability please refer to the [FAQ](https://graphite.readthedocs.io/en/latest/faq.html)**
