'use strict';
const Application = require('koa');
const Router = require('koa-router');
const METHODS = [ 'HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE' ];
function *noop (next) {
	yield next;
}
function isGenerator (fn) {
	return fn && fn.constructor && fn.constructor.name === 'GeneratorFunction';
}
const assign = Object.assign;
class ApplicationPlugin {
	initializeRoutes (c, router) {
		const pattern = `app::method(${router.methods.join('|')})::path(.*)`;
		c.matchKeys(pattern, true).forEach(match => {
			const path = match.params.path;
			const method = match.params.method.toLowerCase();
			let controller = noop;
			if (isGenerator(match.value)) {
				controller = match.value;
			}
			else if ('string' === typeof match.value) {
				let key = match.value;
				if (c.has(key)) {
					controller = c.get(key);
				}
				else if (c.has(key = `app.controllers.${key}`)) {
					controller = c.get(key);
				}
			}

			router[method](path, controller);
		});
	}
	register (c) {
		c.set('app.listen', null);
		c.set('app.router.options', c => {
			return { methods: c.get('app.methods') };
		});
		c.set('app.context', c => ({}));
		c.set('app.methods', c => METHODS);
		c.set('app.router.allowed_methods', {});
		c.set('app.middleware', c => {
			const middleware = [];
			const router = c.get('app.router');
			if (router) {
				middleware.push(router.routes());
				let options = c.get('app.router.allowed_methods');
				if (options) {
					options = assign({}, options);
					middleware.push(router.allowedMethods(options));
				}
			}
			return middleware;
		});
		let routes_initialized = false;
		c.set('app.router', c => {
			const options = c.get('app.router.options');
			const router = new Router(options);
			if (!routes_initialized) {
				routes_initialized = true;
				this.initializeRoutes(c, router);
			}
			return router;
		});

		c.set('app', c => {
			const app = new Application();
			const ctx = c.get('app.context');
			assign(app.context, ctx);
			const middleware = c.get('app.middleware');
			middleware.forEach(m => {
				app.use(m);
			});
			return app;
		});

	}
	run (c) {
		return function *(next) {
			yield next;
			const app = c.get('app');
			const listen = c.get('app.listen');
			if (listen) {
				app.listen.apply(app, [].concat(listen));
			}
		};
	}
}


module.exports = ApplicationPlugin;

