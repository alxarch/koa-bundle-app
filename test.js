'use strict';
const assert = require('assert');
const Container = require('koa-container');
const ApplicationPlugin = require('.');
const http = require('http');

const container = new Container();
container.register(new ApplicationPlugin(), {
	'app.listen': 9000,
	'app:GET:/test': c => function *(next) {
		this.body = 'OK';
		yield next;
	}
});
container.run().then(() => {
	http.get('http://localhost:9000/test', res => {
		assert.equal(res.statusCode, 200);
		res.pipe(process.stdout);
		process.exit(0);
	});
}).catch( err => {
	console.error(err);
	console.error(err.stack);
	process.exit(1);
});
