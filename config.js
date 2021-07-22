var config = {
  backend: 'http://localhost:9080/api/v3/agent/subscribe',
  token: 'TOKEN',
  service: {
	"uuid": Math.random().toString(36).substring(7),
	"host":"localhost",
	"port": 18000,
	"protocol": "http",
	"path": "/get",
	"type": "cdr",
	"ttl": 300,
	"node": "graylog",
	"gid": 10
  },
  debug: true,
  graylog: {
    	"host": "10.10.10.1",
	"port": "9000",
  	"path": "/api",
	"username": "test",
    	"password": "testpass",
  	"protocol": "http",
 	"search_field": "xcid", //Name of Graylog field name to search with HEPSUB input request parameters
        "limit": "55",
 	"fields": "message,facility,timestamp" //Graylog fields to display in response
  }
};

module.exports = config;
